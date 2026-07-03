import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

/**
 * Extract figure crops for a single lesson on-demand — STRATEGY A.
 *
 * Three-phase flow (orchestrated with the client):
 *   Phase 1 — probe: client sends only { lessonId }.
 *     - Cache hit on lesson_figures → return figures, done.
 *     - Otherwise return { needPages: { startPage, endPage } } so the client
 *       renders those pages via pdfjs-dist in the browser.
 *   Phase 2 — detection: client sends { lessonId, pages: [{pageNum, b64}] }
 *     where each b64 is a JPEG of the FULL page.
 *     - We run Gemini Vision (permissive prompt: photos, diagrams, tables,
 *       schemes, charts, formulas, framed graphics).
 *     - Return { detectedBoxes: [{pageNum, bbox, description}] } so the client
 *       can do the physical crop via Canvas.
 *   Phase 3 — upload: client sends { lessonId, crops: [{pageNum, figureIndex,
 *     bbox, description, b64Crop}] } where each b64Crop is the ALREADY
 *     CROPPED JPEG (just the figure, not the page).
 *     - We upload each crop to study-images/lesson-figures/<lessonId>/...
 *     - Insert rows with bbox stored as the original % rect for fullscreen
 *       highlight, but the URL points to the real cropped file.
 */

interface FigureBox {
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
}

interface IncomingPage {
  pageNum: number;
  b64: string; // raw base64 (no data: prefix)
  width?: number;
  height?: number;
}

interface IncomingCrop {
  pageNum: number;
  figureIndex: number;
  bbox: FigureBox;
  description?: string;
  b64Crop: string; // raw base64 of the ALREADY-cropped JPEG
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function normalizeBox(box: FigureBox, page?: IncomingPage): FigureBox | null {
  const pageWidth = page?.width || 0;
  const pageHeight = page?.height || 0;

  let x = box.x;
  let y = box.y;
  let width = box.width;
  let height = box.height;

  // Auto-detect coordinate scale used by the model.
  // Possible scales: 0-1 (normalized), 0-100 (percent), 0-1000 (Gemini default),
  // or absolute pixels matching pageWidth/pageHeight.
  const maxVal = Math.max(
    Math.abs(x), Math.abs(y),
    Math.abs(x + width), Math.abs(y + height),
  );

  let scale: "unit" | "percent" | "thousand" | "pixels";
  if (maxVal <= 1.5) scale = "unit";
  else if (maxVal <= 100.5) scale = "percent";
  else if (maxVal <= 1000.5) scale = "thousand";
  else scale = "pixels";

  const before = { x, y, width, height };

  if (scale === "unit") {
    x *= 100; y *= 100; width *= 100; height *= 100;
  } else if (scale === "thousand") {
    x = (x / 1000) * 100;
    y = (y / 1000) * 100;
    width = (width / 1000) * 100;
    height = (height / 1000) * 100;
  } else if (scale === "pixels") {
    if (pageWidth > 0 && pageHeight > 0) {
      x = (x / pageWidth) * 100;
      y = (y / pageHeight) * 100;
      width = (width / pageWidth) * 100;
      height = (height / pageHeight) * 100;
    } else {
      console.warn(`[normalizeBox] pixel coords but no page dims for page ${page?.pageNum}`);
      return null;
    }
  }

  console.log(
    `[normalizeBox] page=${page?.pageNum} dims=${pageWidth}x${pageHeight} scale=${scale} ` +
    `raw=${JSON.stringify(before)} → pct=${JSON.stringify({ x: +x.toFixed(2), y: +y.toFixed(2), width: +width.toFixed(2), height: +height.toFixed(2) })}`,
  );

  // Apply small padding so we never crop too tight.
  const padX = width * 0.04;
  const padY = height * 0.04;
  x = x - padX;
  y = y - padY;
  width = width + padX * 2;
  height = height + padY * 2;

  // Clamp to page (allow full 0-100 range now that we pad)
  if (x < 0) { width += x; x = 0; }
  if (y < 0) { height += y; y = 0; }
  if (x + width > 100) width = 100 - x;
  if (y + height > 100) height = 100 - y;
  width = Math.max(5, width);
  height = Math.max(5, height);

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  return { x, y, width, height, description: box.description || "Figura dal materiale" };
}

async function detectFigures(
  pageImages: IncomingPage[],
  apiKey: string,
): Promise<{ pageNum: number; figures: FigureBox[] }[]> {
  if (pageImages.length === 0) return [];

  const pageList = pageImages
    .map((p, i) => `Immagine ${i + 1} = pagina ${p.pageNum} (${p.width || "?"}x${p.height || "?"} px)`)
    .join(", ");

  console.log(`[detectFigures] sending ${pageImages.length} page(s) to Vision: ${pageList}`);

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Sei un sistema di rilevamento di FIGURE in pagine di libri di testo. Sii ESTREMAMENTE SELETTIVO: meglio zero figure che figure sbagliate.

${pageList}

ESTRARRE SOLO (whitelist tassativa):
1. FOTOGRAFIE (di opere d'arte, persone, luoghi, oggetti reali)
2. ILLUSTRAZIONI / DISEGNI / RITRATTI / DIPINTI completi
3. GRAFICI (a barre, a torta, istogrammi, line chart)
4. DIAGRAMMI e SCHEMI strutturati (flowchart, alberi, mappe concettuali)
5. MAPPE geografiche / cartine / piante architettoniche
6. TABELLE con righe e colonne ben definite

ESCLUDERE TASSATIVAMENTE (blacklist — se in dubbio, ESCLUDI):
❌ Titoli di capitolo o paragrafo (anche se grandi o decorati)
❌ Numeri di pagina, header, footer, intestazioni
❌ DIDASCALIE isolate (es. "Fig. 12 — Il David di Michelangelo") quando non c'è un'immagine sopra/sotto
❌ Note a margine, citazioni, virgolette decorative
❌ Spazi bianchi, margini vuoti, separatori grafici
❌ Box di SOLO testo (anche se incorniciati o colorati)
❌ Lettere capitali decorate (drop cap)
❌ Frammenti di paragrafo
❌ Loghi della casa editrice, marchi, watermark
❌ Linee, righe orizzontali, decorazioni tipografiche

TEST DI VALIDITÀ — una figura passa SOLO se:
a) Occupa almeno il 10% dell'area pagina (width*height >= 10)
b) È un elemento grafico VERO E PROPRIO (immagine raster o vettoriale, non testo)
c) Ha senso anche estratta da sola, fuori contesto
d) Se la togli, la pagina perde un'informazione visiva (non solo decorativa)

BOUNDING BOX (CRITICO — leggere con attenzione):
- Sistema di coordinate: PERCENTUALI da 0 a 100 della pagina visibile.
- Origine (0,0) = angolo IN ALTO A SINISTRA della pagina.
- Asse X cresce verso DESTRA, asse Y cresce verso il BASSO.
- x = distanza dal bordo SINISTRO (in % della larghezza pagina).
- y = distanza dal bordo SUPERIORE (in % dell'altezza pagina).
- width = larghezza del riquadro (in % della larghezza pagina).
- height = altezza del riquadro (in % dell'altezza pagina).
- Vincolo: 0 ≤ x, x+width ≤ 100  e  0 ≤ y, y+height ≤ 100.
- NON usare pixel. NON usare il formato [ymin, xmin, ymax, xmax]. NON normalizzare 0-1 o 0-1000.
- Includi SOLO la figura: NIENTE didascalie, titoli adiacenti, testo del paragrafo accanto.
- Sii preciso: il riquadro deve combaciare col bordo della figura, niente di più, niente di meno.

REGOLE FINALI:
- Se la pagina è SOLO testo (anche con titoli grandi), ritorna figures: []
- MASSIMO 2 figure per pagina (solo le più significative)
- Non inventare. Se non sei sicuro al 90%, ESCLUDI.
- description: max 8 parole in italiano, descrivi COSA si vede ("Statua del David", "Grafico vendite 2020", "Mappa dell'Impero Romano")

Rispondi SOLO con JSON valido, senza markdown:
[{"page_index": 0, "figures": [{"x": 12, "y": 30, "width": 70, "height": 40, "description": "Statua del David di Michelangelo"}]}]`,
          },
          ...pageImages.map(p => ({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${p.b64}` },
          })),
        ],
      }],
      max_tokens: 2500,
      temperature: 0.0,
    }),
  });

  if (!resp.ok) {
    console.error("Vision AI error:", resp.status, await resp.text());
    return [];
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "";
  console.log("Vision response (first 600):", content.substring(0, 600));

  try {
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]) as { page_index: number; figures: FigureBox[] }[];
    return parsed
      .map((p) => {
        const img = pageImages[p.page_index];
        if (!img) return null;
        const figs = (p.figures || [])
          .filter(f => f && typeof f.x === "number" && typeof f.y === "number" && f.width > 5 && f.height > 5)
          .slice(0, 3)
          .map(f => normalizeBox(f, img))
          .filter((f): f is FigureBox => !!f);
        return { pageNum: img.pageNum, figures: figs };
      })
      .filter((x): x is { pageNum: number; figures: FigureBox[] } => !!x);
  } catch (err) {
    console.error("Failed to parse vision JSON:", err);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { lessonId, pages, crops } = body as {
      lessonId?: string;
      pages?: IncomingPage[];
      crops?: IncomingCrop[];
    };
    if (!lessonId) return errorResponse("lessonId mancante", 400);

    const auth = await validateAuth(req, body);
    const { userId } = auth;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Load lesson (ownership check)
    const { data: lesson, error: lessonErr } = await supabase
      .from("mini_lessons")
      .select("id, user_id, context_id, page_start, page_end, title")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonErr || !lesson) return errorResponse("Lezione non trovata", 404);
    if (lesson.user_id !== userId) return errorResponse("Non autorizzato", 403);

    // ========================================================================
    // PHASE 3 — client sent the actually-cropped JPEGs. Upload + DB insert.
    // ========================================================================
    if (crops && Array.isArray(crops) && crops.length > 0) {
      const result: { id: string; page: number; bbox: FigureBox; url: string; description: string }[] = [];

      for (const crop of crops) {
        if (!crop || typeof crop.b64Crop !== "string" || !crop.bbox) continue;
        const storagePath = `lesson-figures/${lessonId}/p${crop.pageNum}_f${crop.figureIndex}.jpg`;
        const bytes = base64ToBytes(crop.b64Crop);
        const { error: upErr } = await supabase.storage
          .from("study-images")
          .upload(storagePath, bytes, { contentType: "image/jpeg", upsert: true });
        if (upErr) {
          console.error(`Upload crop failed for ${storagePath}:`, upErr);
          continue;
        }

        const { data: inserted, error: insErr } = await supabase
          .from("lesson_figures")
          .insert({
            lesson_id: lessonId,
            user_id: userId,
            context_id: lesson.context_id,
            page_number: crop.pageNum,
            figure_index: crop.figureIndex,
            // bbox stored for reference (original % coords on the source page),
            // but the file at storage_path is ALREADY cropped → PdfCrop will
            // receive bbox 0/0/100/100 from the URL (see below) so it shows
            // the file as-is. We override here with full-rect for renderer.
            bbox: { x: 0, y: 0, width: 100, height: 100, description: crop.description || "" },
            storage_path: storagePath,
            description: crop.description || "Figura dal materiale",
          })
          .select("id")
          .single();
        if (insErr || !inserted) {
          console.error("Insert lesson_figure failed:", insErr);
          continue;
        }
        result.push({
          id: inserted.id,
          page: crop.pageNum,
          bbox: { x: 0, y: 0, width: 100, height: 100, description: crop.description || "" },
          url: `${supabaseUrl}/storage/v1/object/public/study-images/${storagePath}`,
          description: crop.description || "Figura dal materiale",
        });
      }

      console.log(`Uploaded ${result.length} cropped figures for lesson ${lessonId}`);
      return successResponse({ figures: result, cached: false, phase: "uploaded" });
    }

    // 2. Check cache
    const { data: cached } = await supabase
      .from("lesson_figures")
      .select("id, page_number, figure_index, bbox, storage_path, description")
      .eq("lesson_id", lessonId)
      .order("page_number")
      .order("figure_index");

    if (cached && cached.length > 0) {
      console.log(`Cache hit: ${cached.length} figures for lesson ${lessonId}`);
      const figures = cached.map(c => ({
        id: c.id,
        page: c.page_number,
        bbox: c.bbox,
        url: `${supabaseUrl}/storage/v1/object/public/study-images/${c.storage_path}`,
        description: c.description || "Figura dal materiale",
      }));
      return successResponse({ figures, cached: true });
    }

    // ========================================================================
    // PHASE 1 — probe: no pages yet, ask client to render the page range.
    // ========================================================================
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      const startPage = lesson.page_start;
      const endPage = lesson.page_end;
      if (startPage == null || endPage == null) {
        return successResponse({ figures: [], cached: false });
      }
      return successResponse({
        figures: [],
        cached: false,
        needPages: { startPage, endPage: Math.min(endPage, startPage + 5) },
      });
    }

    // ========================================================================
    // PHASE 2 — detection: client sent full pages. Run Vision and return
    // the bounding boxes. Client will perform the physical crop and resend.
    // ========================================================================
    const limited = pages.slice(0, 6).filter(p => p && typeof p.pageNum === "number" && typeof p.b64 === "string");
    if (limited.length === 0) {
      return successResponse({ figures: [], cached: false });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return errorResponse("AI non configurato", 500);

    const detection = await detectFigures(limited, lovableKey);

    if (detection.length === 0 || detection.every(d => d.figures.length === 0)) {
      console.log("No figures detected");
      return successResponse({ figures: [], cached: false });
    }

    // Flatten boxes for the client (no upload yet — client will crop & resend)
    const detectedBoxes: { pageNum: number; figureIndex: number; bbox: FigureBox; description: string }[] = [];
    for (const det of detection) {
      det.figures.forEach((fig, idx) => {
        detectedBoxes.push({
          pageNum: det.pageNum,
          figureIndex: idx,
          bbox: fig,
          description: fig.description,
        });
      });
    }

    console.log(`Detected ${detectedBoxes.length} bounding boxes for lesson ${lessonId}`);
    return successResponse({
      figures: [],
      cached: false,
      detectedBoxes,
      phase: "detection",
    });
  } catch (error) {
    console.error("extract-lesson-figures error:", error);
    return errorResponse("Si è verificato un errore. Riprova.", 500);
  }
});
