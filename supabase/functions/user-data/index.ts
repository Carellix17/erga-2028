import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse, normalizeEmail, emailLikePattern } from "../_shared/auth.ts";

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { action, key, value } = body;

    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;
    const email = normalizeEmail(auth.userEmail);

    if (action === "get") {
      if (!key) return errorResponse("Missing key", 400);

      // 1) Lettura primaria per UUID (auth.uid()).
      const { data, error } = await supabase
        .from("user_data")
        .select("value")
        .eq("user_id", userId)
        .eq("key", key)
        .maybeSingle();

      if (error) {
        console.error("user-data get error:", error.message);
        return errorResponse("Errore nel servizio dati. Riprova.");
      }

      // 2) Fallback in sola lettura per dati legacy salvati sotto email.
      if (!data && email) {
        const { data: legacy, error: legacyError } = await supabase
          .from("user_data")
          .select("value")
          .ilike("user_id", emailLikePattern(email))
          .eq("key", key)
          .maybeSingle();
        if (legacyError) {
          console.error("user-data legacy lookup error:", legacyError.message);
        } else if (legacy) {
          console.warn("user-data: legacy row found by email for", userId, key);
          return successResponse({ value: legacy.value ?? null });
        }
      }

      return successResponse({ value: data?.value ?? null });
    }

    if (action === "save") {
      if (!key) return errorResponse("Missing key", 400);

      const { data: existing } = await supabase
        .from("user_data")
        .select("id")
        .eq("user_id", userId)
        .eq("key", key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_data")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("key", key);
      } else {
        await supabase
          .from("user_data")
          .insert({ user_id: userId, key, value });
      }

      return successResponse({ success: true });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Missing authentication")) {
      return errorResponse("Sessione scaduta. Effettua di nuovo l'accesso.", 401);
    }
    return errorResponse("Errore nel servizio dati. Riprova.");
  }
}));
