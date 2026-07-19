import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { action, key, value } = body;

    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    if (action === "get") {
      if (!key) return errorResponse("Missing key", 400);

      const { data } = await supabase
        .from("user_data")
        .select("value")
        .eq("user_id", userId)
        .eq("key", key)
        .maybeSingle();

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
