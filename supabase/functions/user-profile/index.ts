import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { action } = body;

    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    if (action === "get") {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      return successResponse({ profile: profile || null });
    }

    if (action === "save") {
      const { institute_type, subject_levels, subject_goals, first_name, last_name, nickname, age, school, avatar_url } = body;

      const validInstitutes = ["liceo_scientifico", "liceo_classico", "liceo_linguistico", "istituto_tecnico"];
      if (institute_type && !validInstitutes.includes(institute_type)) {
        return errorResponse("Tipo di istituto non valido", 400);
      }

      if (subject_levels && (typeof subject_levels !== "object" || subject_levels === null)) {
        return errorResponse("Livelli materie non validi", 400);
      }

      if (subject_levels) {
        for (const [, level] of Object.entries(subject_levels)) {
          if (typeof level !== "number" || level < 2 || level > 10 || !Number.isInteger(level)) {
            return errorResponse("I livelli devono essere numeri interi tra 2 e 10", 400);
          }
        }
      }

      if (subject_goals && (typeof subject_goals !== "object" || subject_goals === null)) {
        return errorResponse("Obiettivi materie non validi", 400);
      }
      if (subject_goals) {
        for (const [, goal] of Object.entries(subject_goals)) {
          if (typeof goal !== "number" || goal < 6 || goal > 10 || !Number.isInteger(goal)) {
            return errorResponse("Gli obiettivi devono essere numeri interi tra 6 e 10", 400);
          }
        }
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (institute_type) updateData.institute_type = institute_type;
      if (subject_levels) updateData.subject_levels = subject_levels;
      if (subject_goals) updateData.subject_goals = subject_goals;
      if (first_name !== undefined) updateData.first_name = String(first_name).slice(0, 50);
      if (last_name !== undefined) updateData.last_name = String(last_name).slice(0, 50);
      if (nickname !== undefined) updateData.nickname = String(nickname).slice(0, 30);
      if (age !== undefined) updateData.age = typeof age === "number" ? age : null;
      if (school !== undefined) updateData.school = String(school).slice(0, 100);
      if (avatar_url !== undefined) updateData.avatar_url = String(avatar_url).slice(0, 500);

      const { data: existing } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase.from("user_profiles").update(updateData).eq("user_id", userId);
      } else {
        await supabase.from("user_profiles").insert({
          user_id: userId,
          institute_type: institute_type || "liceo_scientifico",
          subject_levels: subject_levels || {},
          ...updateData,
        });
      }

      return successResponse({ success: true });
    }

    if (action === "uploadAvatar") {
      const { fileData, ext: rawExt } = body;
      if (!fileData) return errorResponse("Dati mancanti", 400);

      // Always derive the storage path from the authenticated user's id so
      // that no caller can overwrite another user's avatar by supplying a
      // crafted filePath.
      const allowedExts = ["jpg", "jpeg", "png", "webp"] as const;
      const safeExt = (typeof rawExt === "string" && allowedExts.includes(rawExt.toLowerCase() as typeof allowedExts[number]))
        ? rawExt.toLowerCase()
        : "jpg";
      const filePath = `${userId}/avatar.${safeExt === "jpeg" ? "jpg" : safeExt}`;

      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const adminClient = createClient(supabaseUrl, serviceKey);

      const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
      const contentType = safeExt === "png" ? "image/png" : safeExt === "webp" ? "image/webp" : "image/jpeg";

      const { error: uploadError } = await adminClient.storage
        .from("avatars")
        .upload(filePath, binaryData, { contentType, upsert: true });

    if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        return errorResponse("Errore nel caricamento dell'immagine");
      }

      return successResponse({ success: true, filePath });
    }

    return errorResponse("Azione non valida", 400);
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore nel servizio profilo. Riprova.");
  }
}));
