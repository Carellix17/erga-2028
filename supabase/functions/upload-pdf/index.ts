import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_IMAGES = 5;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
          return errorResponse(`Immagine troppo grande: ${img.name}. Max 20MB.`, 400);
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

    if (file.type !== "application/pdf") {
      return errorResponse("Solo file PDF sono accettati", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse(`File troppo grande. Dimensione massima: 20MB`, 400);
    }

    console.log(`Uploading PDF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB) for user: ${userId}`);

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${userId}/${timestamp}_${sanitizedName}`;

    const { error: uploadError } = await supabase
      .storage
      .from("study-pdfs")
      .upload(filePath, file, {
        contentType: "application/pdf",
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
        file_name: file.name,
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
});
