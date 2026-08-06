/* eslint-disable @typescript-eslint/no-explicit-any -- P20-targhetta: quarantena documentata. Gli any sono eredita' dello scaffale Deno (prova del nove: 14 errori prima / 14 dopo sulle due funzioni toccate, zero aggiunti da questo pacco). I file gia' usano deno-lint-ignore mirati per il loro linter di casa; questo segnalibro vale per il cancello eslint node. */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors, errorResponse, successResponse } from "../_shared/auth.ts";
import { mammothHtmlToMarkdown } from "../_shared/docxMarkdown.ts";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_IMAGES = 20;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

// 📄 P17 — il lettore universale: oltre al PDF, anche DOCX, TXT e MD.
type FileKind = "pdf" | "docx" | "text";

function fileKind(file: File): FileKind | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown")) return "text";
  return null;
}

// 🥇 P18 — il DOCX letto "da nobile": mammoth (via esm.sh) ricostruisce la
// STRUTTURA vera (titoli, elenchi, tabelle) in HTML, e il nostro traduttore
// puro (_shared/docxMarkdown) la rende Markdown per il caveau. Se mammoth non
// risponde o il file lo manda in crisi, si apre il paracadute: il frullatore
// regex di P17, che perde l'eleganza ma porta a casa il testo.
async function extractDocxMarkdown(file: File): Promise<string> {
  try {
    const mod = await import("https://esm.sh/mammoth@1.12.0");
    // deno-lint-ignore no-explicit-any
    const mammoth: any = (mod as any).default ?? mod;
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    if (result?.messages?.length) {
      console.log("mammoth, avvisi di conversione:", JSON.stringify(result.messages).substring(0, 300));
    }
    const md = mammothHtmlToMarkdown(String(result?.value ?? ""));
    if (md.trim().length < 2) throw new Error("markdown vuoto");
    return md;
  } catch (e) {
    console.warn("mammoth non disponibile o DOCX ostico: apro il paracadute regex:", e);
    return await extractDocxTextLegacy(file);
  }
}

// 🪂 P17 — il "frullatore" originale: apre word/document.xml e spazza via i
// tag col machete. Ora fa da paracadute di mammoth.
async function extractDocxTextLegacy(file: File): Promise<string> {
  const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xmlFile = zip.file("word/document.xml");
  if (!xmlFile) throw new Error("DOCX non valido: document.xml mancante");
  const xml = await xmlFile.async("string");
  const text = xml
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "");
  return text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Stessa tecnica del worker extract-pdf: pdfjs-serverless, pagina per pagina.
async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdfjsModule = await import("https://esm.sh/pdfjs-serverless@0.5.1?bundle");
  const pdfjs = await pdfjsModule.resolvePDFJS();
  const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    try {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      // deno-lint-ignore no-explicit-any
      pages.push(textContent.items.map((it: any) => (it && typeof it.str === "string" ? it.str : "")).join(" "));
    } catch (e) {
      console.error(`pdfjs: pagina ${i} saltata a piè pari:`, e);
    }
  }
  return pages.join("\n").trim();
}

serve(withCors(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const formData = await req.formData();

    // Authenticate user via JWT
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      if (token !== supabaseAnonKey) {
        try {
          const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const { data, error } = await supabaseWithAuth.auth.getUser();
          if (!error && data?.user) {
            userId = data.user.id;
            console.log(`Authenticated user for upload: ${data.user.email || data.user.id}`);
          }
        } catch (authError) {
          console.log("JWT validation failed:", authError);
        }
      }
    }

    if (!userId) {
      return errorResponse("Autenticazione richiesta", 401);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a multi-image upload
    const uploadType = formData.get("uploadType") as string | null;

    if (uploadType === "images") {
      // Multi-image upload flow
      const imageFiles: File[] = [];
      for (let i = 0; i < MAX_IMAGES; i++) {
        const img = formData.get(`image_${i}`) as File | null;
        if (img) imageFiles.push(img);
      }

      if (imageFiles.length === 0) {
        return errorResponse("Nessuna immagine fornita", 400);
      }

      if (imageFiles.length > MAX_IMAGES) {
        return errorResponse(`Massimo ${MAX_IMAGES} immagini per volta`, 400);
      }

      // Validate each image
      for (const img of imageFiles) {
        if (!ALLOWED_IMAGE_TYPES.includes(img.type)) {
          return errorResponse(`Formato non supportato: ${img.name}. Usa JPG, PNG o WebP.`, 400);
        }
        if (img.size > MAX_FILE_SIZE) {
          return errorResponse(`Immagine troppo grande: ${img.name}. Max 100MB.`, 400);
        }
      }

      const contextName = formData.get("contextName") as string || `📷 ${imageFiles.length} foto`;
      const timestamp = Date.now();
      const uploadedPaths: string[] = [];

      // Upload all images to storage
      for (let i = 0; i < imageFiles.length; i++) {
        const img = imageFiles[i];
        const ext = img.name.split(".").pop() || "jpg";
        const sanitizedName = img.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${userId}/${timestamp}_photos_${i}_${sanitizedName}`;

        const { error: uploadError } = await supabase
          .storage
          .from("study-pdfs")
          .upload(filePath, img, {
            contentType: img.type,
            upsert: false,
          });

        if (uploadError) {
          console.error(`Storage upload error for ${img.name}:`, uploadError);
          // Cleanup already uploaded
          if (uploadedPaths.length > 0) {
            await supabase.storage.from("study-pdfs").remove(uploadedPaths);
          }
          return errorResponse("Errore durante il caricamento delle immagini");
        }
        uploadedPaths.push(filePath);
      }

      console.log(`Uploaded ${uploadedPaths.length} images to storage`);

      // Create study_contexts record with all image paths
      const { data: context, error: dbError } = await supabase
        .from("study_contexts")
        .insert({
          user_id: userId,
          file_name: contextName,
          file_path: uploadedPaths.join(","),
          content: "",
          processing_status: "pending"
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        await supabase.storage.from("study-pdfs").remove(uploadedPaths);
        return errorResponse("Errore nel salvataggio");
      }

      // Start async processing for images
      const processUrl = `${supabaseUrl}/functions/v1/extract-pdf`;
      fetch(processUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ action: "process-images", contextId: context.id }),
      }).catch(err => console.error("Background image processing trigger failed:", err));

      console.log(`Context created: ${context.id}, image processing started`);

      return successResponse({
        success: true,
        contextId: context.id,
        fileName: contextName,
        fileCount: imageFiles.length,
        status: "processing"
      });
    }

    // Original PDF upload flow
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("File mancante", 400);
    }

    const kind = fileKind(file);
    if (!kind) {
      return errorResponse(`Formato non supportato: ${file.name}. Accetto PDF, DOCX, TXT e MD.`, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(`File troppo grande. Dimensione massima: 100MB`, 400);
    }

    console.log(`Uploading ${kind}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) for user: ${userId}`);

    const contextName = ((formData.get("contextName") as string | null) ?? "").trim() || null;
    const attachId = (formData.get("contextId") as string | null) ?? null;

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${userId}/${timestamp}_${sanitizedName}`;
    const contentTypes: Record<FileKind, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      text: "text/plain",
    };

    async function extractText(f: File, k: FileKind): Promise<string> {
      if (k === "text") return (await f.text()).trim();
      if (k === "docx") return await extractDocxMarkdown(f);
      return await extractPdfText(new Uint8Array(await f.arrayBuffer()));
    }

    // ➕ P17 — ALLEGA a un percorso esistente (il tasto "+" del ripostiglio):
    // testo estratto qui e appeso al contenuto, cartellino "materiale nuovo" acceso.
    if (attachId) {
      const { data: ctx, error: ctxErr } = await supabase
        .from("study_contexts")
        .select("id, user_id, file_path, content, processing_status")
        .eq("id", attachId)
        .maybeSingle();
      if (ctxErr || !ctx || ctx.user_id !== userId) return errorResponse("Percorso non trovato", 404);
      if (ctx.processing_status === "pending" || ctx.processing_status === "processing") {
        return errorResponse("Questo percorso si sta ancora preparando: riprova tra poco.", 409);
      }

      let newText: string;
      try {
        newText = await extractText(file, kind);
      } catch (e) {
        console.error("estrazione allegato fallita:", e);
        return errorResponse(`Non riesco a leggere "${file.name}". Prova con un altro file.`, 422);
      }
      if (!newText) return errorResponse(`"${file.name}" sembra vuoto o illeggibile.`, 422);

      const { error: attachUploadError } = await supabase
        .storage.from("study-pdfs")
        .upload(filePath, file, { contentType: contentTypes[kind], upsert: false });
      if (attachUploadError) {
        console.error("errore storage allegato:", attachUploadError);
        return errorResponse("Errore durante il caricamento del file");
      }

      const oldPaths = ((ctx.file_path as string | null) ?? "").split(",").filter(Boolean);
      const mergedContent = `${(ctx.content as string) ?? ""}\n\n=== FILE: ${file.name} ===\n\n${newText}`.substring(0, 200000);
      const { error: updErr } = await supabase
        .from("study_contexts")
        .update({
          file_path: [...oldPaths, filePath].join(","),
          content: mergedContent,
          new_material_pending: true,
          processing_status: "completed",
        })
        .eq("id", attachId);
      if (updErr) {
        await supabase.storage.from("study-pdfs").remove([filePath]);
        return errorResponse("Errore nel salvataggio");
      }
      console.log(`File ${file.name} allegato al percorso ${attachId} (+${newText.length} caratteri)`);
      return successResponse({ success: true, contextId: attachId, attached: true, fileName: file.name });
    }

    // 🆕 P17 — CREATE da documento testuale (DOCX/TXT/MD): il testo è pronto
    // SUBITO, senza passare dal worker. Cartellino spento: è il primo materiale.
    if (kind !== "pdf") {
      let text: string;
      try {
        text = await extractText(file, kind);
      } catch (e) {
        console.error("estrazione documento fallita:", e);
        return errorResponse(`Non riesco a leggere "${file.name}". Prova con un altro file.`, 422);
      }
      if (!text) return errorResponse(`"${file.name}" sembra vuoto o illeggibile.`, 422);

      const { error: textUploadError } = await supabase
        .storage.from("study-pdfs")
        .upload(filePath, file, { contentType: contentTypes[kind], upsert: false });
      if (textUploadError) {
        console.error("errore storage documento:", textUploadError);
        return errorResponse("Errore durante il caricamento del file");
      }

      const { data: context, error: dbError } = await supabase
        .from("study_contexts")
        .insert({
          user_id: userId,
          file_name: contextName || file.name,
          file_path: filePath,
          content: text.substring(0, 200000),
          processing_status: "completed",
        })
        .select()
        .single();
      if (dbError) {
        await supabase.storage.from("study-pdfs").remove([filePath]);
        return errorResponse("Errore nel salvataggio");
      }
      console.log(`Percorso testuale creato: ${context.id} (${text.length} caratteri, tipo ${kind})`);
      return successResponse({
        success: true,
        contextId: context.id,
        fileName: contextName || file.name,
        fileSize: file.size,
        status: "completed",
      });
    }

    const { error: uploadError } = await supabase
      .storage
      .from("study-pdfs")
      .upload(filePath, file, {
        contentType: contentTypes[kind],
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return errorResponse("Errore durante il caricamento del file");
    }

    console.log(`File uploaded to storage: ${filePath}`);

    const { data: context, error: dbError } = await supabase
      .from("study_contexts")
      .insert({
        user_id: userId,
        file_name: contextName || file.name,
        file_path: filePath,
        content: "",
        processing_status: "pending"
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      await supabase.storage.from("study-pdfs").remove([filePath]);
      return errorResponse("Errore nel salvataggio");
    }

    const processUrl = `${supabaseUrl}/functions/v1/extract-pdf`;
    fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ action: "process", contextId: context.id }),
    }).catch(err => console.error("Background processing trigger failed:", err));

    console.log(`Context created: ${context.id}, processing started`);

    return successResponse({ 
      success: true, 
      contextId: context.id,
      fileName: file.name,
      fileSize: file.size,
      status: "processing"
    });

  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore durante il caricamento");
  }
}));
