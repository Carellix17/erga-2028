import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

/**
 * Extract figure crops for a single lesson on-demand.
 *
 * Flow:
 * 1. Load lesson + page range (page_start..page_end) from mini_lessons
 * 2. Check lesson_figures cache → if present, return immediately
 * 3. Render only those PDF pages to JPEG (in this Edge Function via pdfjs-serverless)
 * 4. Send pages to Gemini Vision → get bbox of figures (% coordinates)
 * 5. Crop each figure from rendered page (using @cf-wasm/photon? No → use canvas-via-skia not in Deno)
 *    → Strategy: store the FULL page render + bbox metadata; client crops via CSS object-fit
 * 6. Upload page renders to study-pdfs/lesson-figures/<lessonId>/page_<n>.jpg
 * 7. Insert rows in lesson_figures with bbox metadata
 *
 * Why store the full page + crop client-side:
 * - Avoids needing a wasm image library in Deno Edge runtime (heavy, slow cold start)
 * - The PdfCrop component uses bbox to position with object-position/clip → identical UX
 * - Storage cost is similar (one page can host multiple figures)
 */

interface FigureBox {
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
}

async function renderPdfPage(pdfBytes: Uint8Array, pageNum: number): Promise<Uint8Array | null> {
  try {
    const pdfjsModule = await import("https://esm.sh/pdfjs-serverless@0.5.1?bundle");
    const pdfjs = await pdfjsModule.resolvePDFJS();
    const doc = await pdfjs.getDocument({ data: pdfBytes, useSystemFonts: true }).promise;
    if (pageNum > doc.numPages || pageNum < 1) return null;

    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.4 });

    // pdfjs-serverless ships with a canvas implementation
    const { createCanvas } = await import("https://esm.sh/@napi-rs/canvas@0.1.53");
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    // deno-lint-ignore no-explicit-any
    await page.render({ canvasContext: ctx as any, viewport }).promise;
    const buf = canvas.toBuffer("image/jpeg", 82);
    return new Uint8Array(buf);
  } catch (err) {
    console.error(`renderPdfPage(${pageNum}) failed:`, err);
    return null;
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function detectFigures(
  pageImages: { pageNum: number; b64: string }[],
  apiKey: string,
): Promise<{ pageNum: number; figures: FigureBox[] }[]> {
  if (pageImages.length === 0) return [];

  const pageList = pageImages.map((p, i) => `Immagine ${i + 1} = pagina ${p.pageNum}`).join(", ");

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
            text: `Analizza queste pagine di un PDF didattico. Identifica SOLO figure visive REALI (foto, diagrammi, grafici, schemi, illustrazioni, tabelle complesse). NON segnalare blocchi di testo, intestazioni o paragrafi.

${pageList}

Per ogni figura trovata restituisci un bounding box in PERCENTUALI (0-100) della pagina:
- x, y: angolo in alto a sinistra
- width, height: dimensioni
- description: didascalia breve in italiano (max 8 parole)

Aggiungi un margine del 3% intorno alla figura per non tagliarla.

REGOLE:
- Se una pagina contiene SOLO testo, ritorna figures: [].
- Massimo 3 figure per pagina (le più rilevanti).
- Non inventare figure che non vedi.

Rispondi SOLO con JSON valido, senza markdown:
[{"page_index": 0, "figures": [{"x": 12, "y": 30, "width": 70, "height": 40, "description": "Schema della cellula"}]}]`,
          },
          ...pageImages.map(p => ({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${p.b64}` },
          })),
        ],
      }],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });

  if (!resp.ok) {
    console.error("Vision AI error:", resp.status, await resp.text());
    return [];
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "";
  console.log("Vision response (first 400):", content.substring(0, 400));

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
          .map(f => ({
            x: Math.max(0, Math.min(95, f.x)),
            y: Math.max(0, Math.min(95, f.y)),
            width: Math.max(5, Math.min(100 - Math.max(0, f.x), f.width)),
            height: Math.max(5, Math.min(100 - Math.max(0, f.y), f.height)),
            description: f.description || "Figura dal materiale",
          }));
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
    const { lessonId } = body;
    if (!lessonId) return errorResponse("lessonId mancante", 400);

    const auth = await validateAuth(req, body);
    const { userId } = auth;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Load lesson
    const { data: lesson, error: lessonErr } = await supabase
      .from("mini_lessons")
      .select("id, user_id, context_id, page_start, page_end, title")
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonErr || !lesson) return errorResponse("Lezione non trovata", 404);
    if (lesson.user_id !== userId) return errorResponse("Non autorizzato", 403);

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
        url: `${supabaseUrl}/storage/v1/object/public/study-pdfs/${c.storage_path}`,
        description: c.description || "Figura dal materiale",
      }));
      return successResponse({ figures, cached: true });
    }

    // 3. Need PDF + page range
    if (!lesson.context_id || lesson.page_start == null || lesson.page_end == null) {
      console.log("Lesson has no page range, returning empty");
      return successResponse({ figures: [], cached: false });
    }

    const { data: ctx } = await supabase
      .from("study_contexts")
      .select("file_path")
      .eq("id", lesson.context_id)
      .maybeSingle();

    if (!ctx?.file_path || !ctx.file_path.toLowerCase().endsWith(".pdf")) {
      console.log("Context has no PDF file, returning empty");
      return successResponse({ figures: [], cached: false });
    }

    // 4. Download PDF
    const { data: pdfBlob, error: dlErr } = await supabase.storage
      .from("study-pdfs")
      .download(ctx.file_path);

    if (dlErr || !pdfBlob) {
      console.error("PDF download failed:", dlErr);
      return errorResponse("Impossibile scaricare il PDF", 500);
    }

    const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());

    // 5. Render pages in range (cap at 6 pages to control cost/time)
    const startPage = Math.max(1, lesson.page_start);
    const endPage = Math.min(lesson.page_end, startPage + 5);
    const pageImages: { pageNum: number; b64: string; bytes: Uint8Array }[] = [];

    for (let p = startPage; p <= endPage; p++) {
      const bytes = await renderPdfPage(pdfBytes, p);
      if (bytes) {
        pageImages.push({ pageNum: p, b64: uint8ToBase64(bytes), bytes });
      }
    }

    if (pageImages.length === 0) {
      console.log("No pages rendered");
      return successResponse({ figures: [], cached: false });
    }

    // 6. Detect figures via Vision
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return errorResponse("AI non configurato", 500);

    const detection = await detectFigures(
      pageImages.map(p => ({ pageNum: p.pageNum, b64: p.b64 })),
      lovableKey,
    );

    if (detection.length === 0 || detection.every(d => d.figures.length === 0)) {
      console.log("No figures detected");
      return successResponse({ figures: [], cached: false });
    }

    // 7. Upload pages that have figures + insert rows
    const result: { id: string; page: number; bbox: FigureBox; url: string; description: string }[] = [];

    for (const det of detection) {
      if (det.figures.length === 0) continue;
      const pageBundle = pageImages.find(p => p.pageNum === det.pageNum);
      if (!pageBundle) continue;

      const storagePath = `lesson-figures/${lessonId}/page_${det.pageNum}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("study-pdfs")
        .upload(storagePath, pageBundle.bytes, { contentType: "image/jpeg", upsert: true });
      if (upErr) {
        console.error(`Upload failed for ${storagePath}:`, upErr);
        continue;
      }

      for (let idx = 0; idx < det.figures.length; idx++) {
        const fig = det.figures[idx];
        const { data: inserted, error: insErr } = await supabase
          .from("lesson_figures")
          .insert({
            lesson_id: lessonId,
            user_id: userId,
            context_id: lesson.context_id,
            page_number: det.pageNum,
            figure_index: idx,
            bbox: fig,
            storage_path: storagePath,
            description: fig.description,
          })
          .select("id")
          .single();
        if (insErr || !inserted) {
          console.error("Insert lesson_figure failed:", insErr);
          continue;
        }
        result.push({
          id: inserted.id,
          page: det.pageNum,
          bbox: fig,
          url: `${supabaseUrl}/storage/v1/object/public/study-pdfs/${storagePath}`,
          description: fig.description,
        });
      }
    }

    console.log(`Extracted ${result.length} figures for lesson ${lessonId}`);
    return successResponse({ figures: result, cached: false });
  } catch (error) {
    console.error("extract-lesson-figures error:", error);
    return errorResponse(error instanceof Error ? error.message : "Errore");
  }
});
