import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    let auth;
    try {
      auth = await validateAuth(req, body);
    } catch (authErr) {
      console.error("cognitive-profile auth error:", (authErr as Error).message);
      return errorResponse("Unauthorized", 401);
    }
    const { userId, supabase } = auth;

    if (action === "get") {
      const { data: cognitive } = await supabase
        .from("cognitive_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      const { data: prof } = await supabase
        .from("user_profiles")
        .select("has_completed_onboarding")
        .eq("user_id", userId)
        .maybeSingle();
      return successResponse({
        cognitive: cognitive || null,
        hasCompletedOnboarding: !!prof?.has_completed_onboarding,
      });
    }

    if (action === "save") {
      const { nome, eta, istituto, log_score, mem_score, foc_score, voc_score, ans_score, app_score } = body;
      const clamp = (n: unknown) => {
        const x = Math.round(Number(n));
        if (!Number.isFinite(x)) return 50;
        return Math.max(0, Math.min(100, x));
      };
      const row = {
        user_id: userId,
        nome: typeof nome === "string" ? nome.slice(0, 60) : null,
        eta: typeof eta === "number" && Number.isInteger(eta) && eta >= 8 && eta <= 99 ? eta : null,
        istituto: typeof istituto === "string" ? istituto.slice(0, 200) : null,
        log_score: clamp(log_score),
        mem_score: clamp(mem_score),
        foc_score: clamp(foc_score),
        voc_score: clamp(voc_score),
        ans_score: clamp(ans_score),
        app_score: clamp(app_score),
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from("cognitive_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase.from("cognitive_profiles").update(row).eq("user_id", userId);
      } else {
        await supabase.from("cognitive_profiles").insert(row);
      }

      // Mark onboarding as completed in user_profiles
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (existingProfile) {
        await supabase
          .from("user_profiles")
          .update({ has_completed_onboarding: true, updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      } else {
        await supabase.from("user_profiles").insert({
          user_id: userId,
          institute_type: "liceo_scientifico",
          subject_levels: {},
          has_completed_onboarding: true,
        });
      }

      return successResponse({ success: true });
    }

    if (action === "updateFromPerformance") {
      const { correct, total, area } = body as { correct?: unknown; total?: unknown; area?: unknown };
      const totalN = Number(total);
      const correctN = Number(correct);
      if (!Number.isInteger(totalN) || totalN <= 0 || totalN > 1000) {
        return errorResponse("Parametri non validi", 400);
      }
      if (!Number.isInteger(correctN) || correctN < 0 || correctN > totalN) {
        return errorResponse("Parametri non validi", 400);
      }
      const targetArea = area === "APP" || area === undefined ? "app_score" : null;
      if (!targetArea) return errorResponse("Area non supportata", 400);

      const { data: current } = await supabase
        .from("cognitive_profiles")
        .select("app_score")
        .eq("user_id", userId)
        .maybeSingle();
      if (!current) {
        return successResponse({ skipped: true, reason: "no_profile" });
      }

      const oldScore = Number(current.app_score) || 0;
      const perf = (correctN / totalN) * 100;
      const alpha = 0.1;
      const raw = oldScore * (1 - alpha) + perf * alpha;
      const newScore = Math.max(0, Math.min(100, Math.round(raw)));

      await supabase
        .from("cognitive_profiles")
        .update({ app_score: newScore, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      return successResponse({ success: true, oldScore, newScore, perf: Math.round(perf) });
    }

    return errorResponse("Azione non valida", 400);
  } catch (error) {
    console.error("cognitive-profile error:", error);
    return errorResponse("Errore nel servizio profilo cognitivo. Riprova.");
  }
});