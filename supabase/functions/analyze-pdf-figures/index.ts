import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { imagePaths } = body;

    const auth = await validateAuth(req, body);
    console.log(`Analyze PDF figures for user: ${auth.userId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) return errorResponse("AI config missing");
    if (!imagePaths || !Array.isArray(imagePaths) || imagePaths.length === 0) {
      return errorResponse("No image paths provided");
    }

    const BATCH_SIZE = 5;
    const allResults: { pageNum: number; storagePath: string; figures: { x: number; y: number; width: number; height: number; description: string }[] }[] = [];

    for (let batchStart = 0; batchStart < imagePaths.length; batchStart += BATCH_SIZE) {
      const batchPaths = imagePaths.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      console.log(`Analyzing batch ${batchNum} (${batchPaths.length} pages)`);

      const imageContents: { path: string; base64: string; pageNum: number; batchIndex: number }[] = [];

      for (let idx = 0; idx < batchPaths.length; idx++) {
        const path = batchPaths[idx];
        const { data, error } = await supabase.storage.from("study-images").download(path);
        if (error || !data) {
          console.warn(`Failed to download ${path}:`, error);
          continue;
        }
        const buf = await data.arrayBuffer();
        const base64 = uint8ToBase64(new Uint8Array(buf));
        const pageNum = parseInt(path.match(/page_(\d+)/)?.[1] || "0");
        imageContents.push({ path, base64, pageNum, batchIndex: idx });
      }

      if (imageContents.length === 0) continue;

      const pageList = imageContents.map((img, i) => `Immagine ${i + 1} = pagina ${img.pageNum}`).join(", ");

      const aiResponse = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: [
              {
                type: "text",
                text: `Analizza le seguenti pagine di un documento PDF. Per ogni pagina, identifica SOLO figure, diagrammi, grafici, foto, illustrazioni o schemi che sono DISTINTI dal testo circostante. NON includere l'intera pagina.

${pageList}

Per ogni figura trovata, restituisci le coordinate del bounding box come PERCENTUALI (0-100) dell'intera pagina:
- x: posizione orizzontale dell'angolo in alto a sinistra
- y: posizione verticale dell'angolo in alto a sinistra  
- width: larghezza della figura
- height: altezza della figura

Aggiungi un margine del 3-5% intorno alla figura per non tagliarla.

REGOLE IMPORTANTI:
- Identifica SOLO immagini, figure, diagrammi, grafici, foto reali. NON il testo.
- Se una pagina contiene SOLO testo, restituisci figures vuoto.
- Se una figura occupa quasi tutta la pagina, includila con coordinate appropriate.
- Ogni descrizione deve essere una breve didascalia in italiano.

Rispondi SOLO con JSON valido:
[
  {"page_index": 0, "figures": [{"x": 10, "y": 25, "width": 80, "height": 45, "description": "Diagramma del processo"}]},
  {"page_index": 1, "figures": []}
]`
              },
              ...imageContents.map(img => ({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${img.base64}` }
              }))
            ]
          }],
          max_tokens: 4000,
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI error:", aiResponse.status, await aiResponse.text());
        continue;
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      console.log("AI response (first 500 chars):", content.substring(0, 500));

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          for (const pageResult of parsed) {
            const idx = pageResult.page_index;
            if (idx === undefined || idx >= imageContents.length) continue;
            const imgInfo = imageContents[idx];
            if (!imgInfo) continue;

            allResults.push({
              pageNum: imgInfo.pageNum,
              storagePath: imgInfo.path,
              figures: (pageResult.figures || []).map((f: { x: number; y: number; width: number; height: number; description: string }) => ({
                x: Math.max(0, f.x),
                y: Math.max(0, f.y),
                width: Math.min(100 - Math.max(0, f.x), f.width),
                height: Math.min(100 - Math.max(0, f.y), f.height),
                description: f.description || "Figura dal materiale",
              }))
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    const totalFigures = allResults.reduce((sum, r) => sum + r.figures.length, 0);
    console.log(`Found ${totalFigures} figures across ${allResults.length} pages`);

    return successResponse({ results: allResults });
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore nell'analisi delle figure");
  }
}));
