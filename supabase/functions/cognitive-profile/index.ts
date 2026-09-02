import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse, normalizeEmail, emailLikePattern } from "../_shared/auth.ts";

serve(withCors(async (req) => {
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
    const email = normalizeEmail(auth.userEmail);

    if (action === "get") {
      // 1) Lettura primaria: per ID utente Supabase (auth.uid()).
      const { data: cognitiveRow, error: cogError } = await supabase
        .from("cognitive_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      const { data: profRow, error: profError } = await supabase
        .from("user_profiles")
        .select("has_completed_onboarding")
        .eq("user_id", userId)
        .maybeSingle();
      let cognitive = cognitiveRow;
      let prof = profRow;

      if (cogError || profError) {
        console.error("cognitive-profile get error:", cogError?.message, profError?.message);
        return errorResponse("Errore nel servizio profilo cognitivo. Riprova.");
      }

      // 2) Fallback SICURO e in sola lettura: dati legacy salvati sotto email.
      //    Attivo solo quando l'email arriva dal JWT verificato e non è stata
      //    già trovata la riga canonica (nessun matching ambiguo).
      if (!cognitive && email) {
        const { data: legacyCognitive } = await supabase
          .from("cognitive_profiles")
          .select("*")
          .ilike("user_id", emailLikePattern(email))
          .maybeSingle();
        if (legacyCognitive) {
          console.warn("cognitive-profile: legacy row found by email for", userId);
          cognitive = legacyCognitive;
        }
      }
      if (!prof && email) {
        const { data: legacyProf } = await supabase
          .from("user_profiles")
          .select("has_completed_onboarding")
          .ilike("user_id", emailLikePattern(email))
          .maybeSingle();
        if (legacyProf) prof = legacyProf;
      }

      // 3) Un profilo cognitivo esistente è comunque prova di onboarding
      //    completato: copre i profili creati prima della colonna
      //    `has_completed_onboarding` (default false) e eventuali race.
      const hasCompletedOnboarding = !!prof?.has_completed_onboarding || !!cognitive;

      return successResponse({
        cognitive: cognitive || null,
        hasCompletedOnboarding,
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

      // Backfill sicuro a runtime: se esiste una riga legacy con l'email
      // dell'utente verificato (ma non la riga canonica), la colleghiamo
      // all'UUID corrente. Idempotente e senza cancellazioni: se la riga
      // canonica esiste già, il legacy resta intatto (gestito dalla
      // migration di backfill, che evita duplicati).
      if (email) {
        await linkLegacyRow(supabase, "cognitive_profiles", userId, email);
        await linkLegacyRow(supabase, "user_profiles", userId, email);
      }

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
}));

/**
 * Collega una riga legacy (user_id = email dell'utente) all'UUID corrente,
 * SOLO se non esiste già una riga canonica per quell'UUID (niente duplicati).
 * Il confronto usa l'email normalizzata del JWT verificato.
 */
async function linkLegacyRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- client service-role non tipizzato (pattern esistente nel progetto)
  supabase: { from: (t: string) => any },
  table: string,
  userId: string,
  email: string,
) {
  try {
    const { data: canonical } = await supabase
      .from(table)
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (canonical) return;

    const { data: legacy } = await supabase
      .from(table)
      .select("id")
      .ilike("user_id", emailLikePattern(email))
      .maybeSingle();
    if (!legacy) return;

    const { error } = await supabase
      .from(table)
      .update({ user_id: userId })
      .eq("id", legacy.id);
    if (error) {
      console.warn(`linkLegacyRow(${table}) skipped:`, error.message);
    }
  } catch (e) {
    console.warn(`linkLegacyRow(${table}) failed:`, (e as Error).message);
  }
}
