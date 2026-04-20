import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

/**
 * Extract figure crops for a single lesson on-demand.
 *
 * Client renders the relevant PDF pages (using pdfjs-dist in browser) and POSTs
 * them as base64 JPEGs. This function:
 *   1. Loads lesson + checks cache (lesson_figures table) → return if hit
 *   2. Sends pages to Gemini Vision → bbox in % coords
 *   3. Uploads page renders to study-pdfs/lesson-figures/<lessonId>/page_<n>.jpg
 *   4. Inserts rows in lesson_figures with bbox metadata
 *   5. Returns figures so client renders crops via CSS object-position/clip
 *
 * We store the FULL page image + bbox (not the actual crop) to avoid needing
 * a wasm image library in Deno Edge. PdfCrop component crops via CSS.
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
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function detectFigures(
  pageImages: IncomingPage[],
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
    const { lessonId, pages } = body as { lessonId?: string; pages?: IncomingPage[] };
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

    // 3. Need pages from client
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      // Tell client to render and resend
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

    // 4. Detect figures via Vision (cap at 6 pages)
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

    // 5. Upload pages that have figures + insert rows
    const result: { id: string; page: number; bbox: FigureBox; url: string; description: string }[] = [];

    for (const det of detection) {
      if (det.figures.length === 0) continue;
      const pageBundle = limited.find(p => p.pageNum === det.pageNum);
      if (!pageBundle) continue;

      const storagePath = `lesson-figures/${lessonId}/page_${det.pageNum}.jpg`;
      const bytes = base64ToBytes(pageBundle.b64);
      const { error: upErr } = await supabase.storage
        .from("study-images")
        .upload(storagePath, bytes, { contentType: "image/jpeg", upsert: true });
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
