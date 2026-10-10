import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";
import { callVisionText } from "../_shared/vision.ts";

/**
 * Converte byte in base64 a pezzettini. La versione "tutto in un boccone"
 * (String.fromCharCode(...bytes)) supera il limite di argomenti del motore
 * e crasha gia' con ~400KB: una foto di telefono pesa 2-8MB, quindi il
 * caricamento foto falliva SEMPRE prima di questo fix.
 */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

serve(withCors(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const body = await req.json();
    const { fileName, filePath, contextId, action } = body;

    // Check if this is an internal service call (from upload-pdf background processing)
    const authHeader = req.headers.get("Authorization");
    const isInternalServiceCall = authHeader === `Bearer ${supabaseServiceKey}`;

    let userId: string;
    let supabase;

    if (isInternalServiceCall) {
      console.log("Internal service call for PDF processing");
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      if ((action === "process" || action === "process-images") && contextId) {
        const { data: context, error: fetchError } = await supabase
          .from("study_contexts")
          .select("user_id")
          .eq("id", contextId)
          .single();
        
        if (fetchError || !context) {
          console.error("Context not found:", fetchError);
          return errorResponse("Contesto non trovato", 404);
        }
        userId = context.user_id;
      } else {
        return errorResponse("Richiesta non valida", 400);
      }
    } else {
      const auth = await validateAuth(req, body);
      userId = auth.userId;
      supabase = auth.supabase;
      console.log(`Extract PDF for user: ${userId}`);
    }

    // Action: process-images (extract text from photos using AI vision)
    if (action === "process-images" && contextId) {
      console.log(`Processing images for context: ${contextId}`);
      
      const { data: context, error: fetchError } = await supabase
        .from("study_contexts")
        .select("*")
        .eq("id", contextId)
        .single();

      if (fetchError || !context) {
        return errorResponse("Contesto non trovato", 404);
      }

      if (context.user_id !== userId) {
        return errorResponse("Non autorizzato", 403);
      }

      await supabase
        .from("study_contexts")
        .update({ processing_status: "processing" })
        .eq("id", contextId)
        .eq("user_id", userId);

      try {
        const imagePaths = (context.file_path || "").split(",").filter(Boolean);
        if (imagePaths.length === 0) throw new Error("MISSING_IMAGES");

        console.log(`Processing ${imagePaths.length} images`);

        // Process images in batches of 5 to avoid token/memory limits
        const BATCH_SIZE = 5;
        const allExtractedTexts: string[] = [];

        for (let batchStart = 0; batchStart < imagePaths.length; batchStart += BATCH_SIZE) {
          const batchPaths = imagePaths.slice(batchStart, batchStart + BATCH_SIZE);
          const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(imagePaths.length / BATCH_SIZE);
          console.log(`Processing batch ${batchNum}/${totalBatches} (${batchPaths.length} images)`);

          // Download batch images and convert to base64
          const imageContents: { base64: string; mimeType: string }[] = [];
          for (const imgPath of batchPaths) {
            const { data: fileData, error: downloadError } = await supabase
              .storage
              .from("study-pdfs")
              .download(imgPath.trim());

            if (downloadError || !fileData) {
              console.error(`Error downloading image ${imgPath}:`, downloadError);
              throw new Error("FILE_DOWNLOAD_ERROR");
            }

            const arrayBuffer = await fileData.arrayBuffer();
            const base64 = uint8ToBase64(new Uint8Array(arrayBuffer));
            const ext = imgPath.split(".").pop()?.toLowerCase() || "jpg";
            const mimeType = ext === "png" ? "image/png"
              : ext === "webp" ? "image/webp"
              : ext === "heic" || ext === "heif" ? "image/heic"
              : "image/jpeg";
            imageContents.push({ base64, mimeType });
          }

          const aiMessages: unknown[] = [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Sei un assistente specializzato nell'estrarre testo e contenuti didattici dalle immagini. Analizza attentamente tutte le immagini fornite ed estrai TUTTO il testo visibile, formule, diagrammi e concetti. Organizza il contenuto in modo logico e strutturato. Se ci sono formule matematiche, trascrivile. Se ci sono diagrammi, descrivili in dettaglio. Rispondi SOLO con il contenuto estratto, senza commenti aggiuntivi. (Batch ${batchNum}/${totalBatches})`
                },
                ...imageContents.map(img => ({
                  type: "image_url",
                  image_url: {
                    url: `data:${img.mimeType};base64,${img.base64}`
                  }
                }))
              ]
            }
          ];

          let batchText = "";
          try {
            batchText = await callVisionText({ messages: aiMessages, max_tokens: 16000 });
          } catch (visionErr) {
            console.error("Vision processing error:", visionErr);
            throw new Error("AI_PROCESSING_ERROR");
          }
          if (batchText.trim()) {
            allExtractedTexts.push(batchText);
          }
        }

        const extractedText = allExtractedTexts.join("\n\n---\n\n");

        if (!extractedText || extractedText.length < 20) {
          throw new Error("INSUFFICIENT_TEXT");
        }

        console.log(`AI extracted ${extractedText.length} characters from ${imagePaths.length} images in ${Math.ceil(imagePaths.length / BATCH_SIZE)} batches`);

        const { error: updateError } = await supabase
          .from("study_contexts")
          .update({
            content: extractedText.substring(0, 200000),
            processing_status: "completed",
            error_message: null
          })
          .eq("id", contextId);

        if (updateError) throw new Error("DATABASE_ERROR");

        return successResponse({
          success: true,
          contextId,
          extractedLength: extractedText.length
        });

      } catch (processError) {
        console.error("Image processing error:", processError);
        
        const userMessage = processError instanceof Error
          ? processError.message === "FILE_DOWNLOAD_ERROR" ? "Impossibile scaricare le immagini"
          : processError.message === "INSUFFICIENT_TEXT" ? "Impossibile estrarre contenuto sufficiente dalle immagini. Prova con foto più nitide."
          : processError.message === "MISSING_IMAGES" ? "Nessuna immagine trovata"
          : processError.message === "AI_CONFIG_ERROR" ? "Configurazione AI mancante"
          : processError.message === "AI_PROCESSING_ERROR" ? "Errore nell'analisi delle immagini"
          : "Errore durante l'elaborazione delle immagini"
          : "Errore durante l'elaborazione delle immagini";

        await supabase
          .from("study_contexts")
          .update({
            processing_status: "failed",
            error_message: userMessage
          })
          .eq("id", contextId)
          .eq("user_id", userId);

        return errorResponse(userMessage);
      }
    }

    // 🩺 P7 (7 ottobre 2026) — IL MOTORE DI ELABORAZIONE, condiviso dall'azione
    // interna "process" (chiamata da upload-pdf con la chiave di servizio) e
    // dalla nuova azione "reprocess" (utente autenticato): chi si ritrova il
    // materiale "in elaborazione" per sempre — perché il lavoro in background
    // è morto per un blip di rete — ora può ripartire da solo. Il client
    // supabase è quello giusto per entrambi i casi (chiusura lessicale).
    const processContext = async (
      context: { id: string; user_id: string; file_path: string; processing_status?: string },
    ): Promise<Response> => {
      const contextId = String(context.id);
      const userId = String(context.user_id);
      await supabase
        .from("study_contexts")
        .update({ processing_status: "processing" })
        .eq("id", contextId)
        .eq("user_id", userId);

      try {
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from("study-pdfs")
          .download(context.file_path);

        if (downloadError || !fileData) {
          console.error("File download error:", downloadError);
          throw new Error("FILE_DOWNLOAD_ERROR");
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const pdfBytes = new Uint8Array(arrayBuffer);
        
        console.log(`Downloaded PDF: ${pdfBytes.length} bytes`);

        let extractedText = "";
        
        try {
          extractedText = await extractTextWithPdfJs(pdfBytes);
          console.log(`Extracted with pdfjs: ${extractedText.length} characters`);
        } catch (pdfJsError) {
          console.error("pdfjs extraction failed, trying fallback:", pdfJsError);
          extractedText = extractTextFallback(pdfBytes);
          console.log(`Extracted with fallback: ${extractedText.length} characters`);
        }

        if (!extractedText || extractedText.length < 50) {
          console.warn("PDF text layer is empty, trying Gemini PDF vision fallback");
          extractedText = await extractTextWithGeminiPdfVision(pdfBytes);
          console.log(`Extracted with Gemini PDF vision: ${extractedText.length} characters`);
        }

        if (!extractedText || extractedText.length < 50) {
          throw new Error("INSUFFICIENT_TEXT");
        }

        const cleanedText = cleanExtractedText(extractedText);
        console.log(`Cleaned text: ${cleanedText.length} characters`);

        // Image extraction is now handled client-side via PDF page rendering
        // 🗺️ P6 — magazzino più capiente: da 200k a 600k caratteri. Il
        // cartografo mappa i libri lunghi pagina per pagina e ogni chiamata AI
        // riceve comunque solo la sua fetta: conservare di più non costa più.
        const finalContent = cleanedText.substring(0, 600000);

        const { error: updateError } = await supabase
          .from("study_contexts")
          .update({
            content: finalContent,
            processing_status: "completed",
            error_message: null
          })
          .eq("id", contextId);

        if (updateError) {
          console.error("Database update error:", updateError);
          throw new Error("DATABASE_ERROR");
        }

        return successResponse({ 
          success: true, 
          contextId,
          extractedLength: cleanedText.length 
        });

      } catch (processError) {
        console.error("Processing error:", processError);
        
        const userMessage = processError instanceof Error
          ? processError.message === "FILE_DOWNLOAD_ERROR" ? "Impossibile scaricare il file"
          : processError.message === "INSUFFICIENT_TEXT" ? "Impossibile estrarre testo sufficiente dal PDF. Il file potrebbe essere un'immagine o protetto."
          : processError.message === "AI_CONFIG_ERROR" ? "Configurazione AI mancante"
          : processError.message === "PDF_TOO_LARGE_FOR_VISION" ? "Il PDF scansionato è troppo grande per l'analisi AI (massimo ~18 MB). Esporta una versione più leggera o usa la versione con testo selezionabile."
          : processError.message === "AI_PROCESSING_ERROR" ? "Servizio AI temporaneamente occupato. Riprova tra qualche minuto."
          : processError.message === "DATABASE_ERROR" ? "Errore nel salvataggio"
          : "Errore durante l'elaborazione del PDF"
          : "Errore durante l'elaborazione del PDF";

        await supabase
          .from("study_contexts")
          .update({
            processing_status: "failed",
            error_message: userMessage
          })
          .eq("id", contextId)
          .eq("user_id", userId);

        return errorResponse(userMessage);
      }
    };

    // Action: process (chiamata interna da upload-pdf, chiave di servizio)
    if (action === "process" && contextId) {
      console.log(`Processing PDF for context: ${contextId}`);

      const { data: context, error: fetchError } = await supabase
        .from("study_contexts")
        .select("*")
        .eq("id", contextId)
        .single();

      if (fetchError || !context) {
        console.error("Context not found:", fetchError);
        return errorResponse("Contesto non trovato", 404);
      }

      if (context.user_id !== userId) {
        console.error(`Unauthorized access attempt for context ${contextId}`);
        return errorResponse("Non autorizzato", 403);
      }

      return processContext(context);
    }

    // 🩺 P7 — RIPROVA ANALISI (utente autenticato): per il materiale rimasto
    // appeso in "pending"/"processing" per un lavoro morto. Se era già pronto,
    // non si rifà nulla (no-op). NOTA: se l'elaborazione originale è VIVA e
    // soltanto lenta, questo può farla partire due volte: l'esito finale è
    // comunque un contenuto completo (l'ultima scrittura vince), e il client
    // lo chiede solo quando l'attesa dura davvero troppo.
    if (action === "reprocess" && contextId) {
      const { data: context, error: fetchError } = await supabase
        .from("study_contexts")
        .select("*")
        .eq("id", contextId)
        .maybeSingle();

      if (fetchError || !context) {
        return errorResponse("Contesto non trovato", 404);
      }
      if (context.user_id !== userId) {
        return errorResponse("Non autorizzato", 403);
      }
      if (context.processing_status === "completed") {
        return successResponse({ success: true, alreadyCompleted: true, contextId });
      }
      console.log(`[P7] reprocess richiesto dall'utente per ${contextId} (status precedente: ${String(context.processing_status)})`);
      // 📷 Le foto NON passano dal motore PDF: file_path è una lista di
      // immagini. Se il lavoro foto è in corso (anche solo lento) non lo si
      // tocca; se non è mai partito, si rilancia il ramo "process-images".
      const srcPaths = String(context.file_path || "").split(",").map((p) => p.trim()).filter(Boolean);
      const isPdfContext = srcPaths.length === 1 && srcPaths[0].toLowerCase().endsWith(".pdf");
      if (!isPdfContext) {
        if (context.processing_status === "processing") {
          return successResponse({ success: true, stillRunning: true, contextId });
        }
        const kick = fetch(`${supabaseUrl}/functions/v1/extract-pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ action: "process-images", contextId }),
        }).catch((e) => console.error("[P7] rilancio process-images fallito:", e));
        // @ts-ignore — EdgeRuntime è iniettato dal runtime
        if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") EdgeRuntime.waitUntil(kick);
        return successResponse({ success: true, restarted: "images", contextId });
      }
      return processContext(context);
    }

    // Action: register
    if (!userId || !fileName || !filePath) {
      return errorResponse("Dati mancanti", 400);
    }

    console.log(`Registering PDF upload: ${fileName} for user: ${userId}`);

    // Validate file path ownership to prevent path traversal across users.
    // The background processor runs with service-role and would otherwise
    // happily download any other user's PDF if they could supply the path.
    const paths = String(filePath).split(",").map((p) => p.trim()).filter(Boolean);
    if (paths.length === 0 || !paths.every((p) => p.startsWith(`${userId}/`))) {
      return errorResponse("File non autorizzato", 403);
    }

    const { data, error } = await supabase
      .from("study_contexts")
      .insert({
        user_id: userId,
        file_name: fileName,
        file_path: filePath,
        content: "",
        processing_status: "pending"
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return errorResponse("Errore nel salvataggio");
    }

    const processUrl = `${supabaseUrl}/functions/v1/extract-pdf`;
    fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ action: "process", contextId: data.id }),
    }).catch(err => console.error("Background processing failed:", err));

    return successResponse({ 
      success: true, 
      contextId: data.id,
      status: "processing"
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore durante l'elaborazione");
  }
}));

async function extractTextWithPdfJs(pdfBytes: Uint8Array): Promise<string> {
  const pdfjsModule = await import("https://esm.sh/pdfjs-serverless@0.5.1?bundle");
  const pdfjs = await pdfjsModule.resolvePDFJS();
  
  const doc = await pdfjs.getDocument({
    data: pdfBytes,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];
  const numPages = doc.numPages;
  
  console.log(`PDF has ${numPages} pages`);

  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      
      // deno-lint-ignore no-explicit-any
      const pageText = textContent.items
        .map((item: any) => {
          if (item && typeof item.str === "string") {
            return item.str;
          }
          return "";
        })
        .join(" ");
      
      if (pageText.trim()) {
        // Prefix every page with an explicit marker so downstream LLMs can
        // map content back to the original PDF page numbers (used for figure
        // extraction, page_start/page_end in the study plan, etc.).
        pages.push(`=== PAGINA ${i} ===\n${pageText}`);
      }
    } catch (pageError) {
      console.error(`Error extracting page ${i}:`, pageError);
    }
  }

  return pages.join("\n\n");
}

function extractTextFallback(pdfBytes: Uint8Array): string {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let pdfString = decoder.decode(pdfBytes);
  
  if (pdfString.includes("�")) {
    const latin1Decoder = new TextDecoder("latin1");
    pdfString = latin1Decoder.decode(pdfBytes);
  }

  const extractedParts: string[] = [];

  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;

  while ((match = btEtRegex.exec(pdfString)) !== null) {
    const textBlock = match[1];

    const tjMatches = textBlock.matchAll(/\(([^)]*)\)\s*Tj/g);
    for (const tj of tjMatches) {
      const text = cleanPdfText(tj[1]);
      if (text.length > 1 && !isPdfGarbage(text)) {
        extractedParts.push(text);
      }
    }

    const tjArrayMatches = textBlock.matchAll(/\[(.*?)\]\s*TJ/gi);
    for (const tja of tjArrayMatches) {
      const parts = tja[1].matchAll(/\(([^)]*)\)/g);
      let lineText = "";
      for (const part of parts) {
        lineText += cleanPdfText(part[1]);
      }
      if (lineText.length > 1 && !isPdfGarbage(lineText)) {
        extractedParts.push(lineText);
      }
    }
  }

  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
  while ((match = streamRegex.exec(pdfString)) !== null) {
    const streamContent = match[1];
    const readableMatches = streamContent.match(/[\x20-\x7E]{10,}/g) || [];
    for (const readable of readableMatches) {
      if (!isPdfGarbage(readable) && readable.length > 10) {
        extractedParts.push(readable);
      }
    }
  }

  return cleanExtractedText(extractedParts.join(" "));
}

async function extractTextWithGeminiPdfVision(pdfBytes: Uint8Array): Promise<string> {
  const apiKey = Deno.env.get("ERGA_GEMINI_KEY_APRIL") || Deno.env.get("ERGA_DEMO_ROUTER");
  if (!apiKey) throw new Error("AI_CONFIG_ERROR");

  // 📏 P13: l'API rifiuta i PDF inline oltre ~20 MB: prima si finiva in un
  // errore AI generico ("servizio occupato"). Soglia onesta a 18 MB.
  if (pdfBytes.length > 18 * 1024 * 1024) {
    console.warn(`[P13] PDF scansionato di ${(pdfBytes.length / 1048576).toFixed(1)} MB: oltre il tetto dell'analisi AI`);
    throw new Error("PDF_TOO_LARGE_FOR_VISION");
  }

  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < pdfBytes.length; i += chunkSize) {
    binary += String.fromCharCode(...pdfBytes.slice(i, i + chunkSize));
  }

  const requestBody = {
      contents: [{
        role: "user",
        parts: [
          {
            text: `Estrai TUTTO il testo leggibile da questo PDF scansionato o basato su immagini.

REGOLE OBBLIGATORIE:
- Mantieni l'ordine originale delle pagine.
- Inserisci prima di ogni pagina il marker esatto: === PAGINA N ===
- Trascrivi titoli, paragrafi, didascalie, tabelle, schemi e testo dentro immagini.
- Non riassumere e non aggiungere spiegazioni esterne.
- Se una pagina non contiene testo leggibile, scrivi comunque il marker e passa alla pagina successiva.`
          },
          {
            inline_data: {
              mime_type: "application/pdf",
              data: btoa(binary),
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0,
        // 📏 P13: 20000 token tronavano i libri scansionati lunghi a metà.
        maxOutputTokens: 30000,
      },
    };

  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  let data: { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null = null;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (resp.ok) {
        data = await resp.json();
        break;
      }
      const errBody = await resp.text();
      console.error(`Gemini PDF vision error (${model}, attempt ${attempt + 1}):`, resp.status, errBody);
      if (![429, 500, 502, 503, 504].includes(resp.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
    if (data) break;
  }

  if (!data) throw new Error("AI_PROCESSING_ERROR");

  // 📏 P13: se l'AI si è fermata per il tetto di token, la trascrizione è
  // PARZIALE: si accetta comunque (meglio un pezzo di libro che niente) ma
  // si lascia la traccia nei log per saperlo.
  const finishReason = data.candidates?.[0]?.finishReason;
  if (finishReason === "MAX_TOKENS") {
    console.warn("[P13] trascrizione AI del PDF troncata dal tetto di token: il materiale sarà parziale");
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("\n") || "";
  return cleanExtractedText(text);
}

function isPdfGarbage(text: string): boolean {
  const garbagePatterns = [
    /^[0-9\s.]+$/,
    /obj\s*$/,
    /endobj/,
    /^stream$/,
    /^xref$/,
    /^trailer$/,
    /\/Type/,
    /\/Font/,
    /\/Page/,
    /\/Filter/,
    /\/Length/,
    /^R$/,
    /^[A-Z]{1,3}\d{0,3}$/,
    /\\x[0-9a-fA-F]{2}/,
    /^\s*[<>]+\s*$/,
    /^[0-9a-fA-F]{20,}$/,
  ];

  for (const pattern of garbagePatterns) {
    if (pattern.test(text.trim())) {
      return true;
    }
  }

  const letters = text.match(/[a-zA-ZàèéìòùÀÈÉÌÒÙ]/g) || [];
  if (text.length > 5 && letters.length / text.length < 0.3) {
    return true;
  }

  return false;
}

function cleanPdfText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
}

function cleanExtractedText(text: string): string {
  return text
    // Spazi e tabulazioni collassano in UNO spazio; gli a-capo RESTANO
    // (struttura dei paragrafi e marcatori === PAGINA N === servono a valle).
    // NOTA: una vecchia regola cancellava TUTTE le parole di una lettera —
    // in italiano "a", "e", "o", "i" sono parole vere: il testo veniva mutilato.
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, " ")
    .trim();
}

