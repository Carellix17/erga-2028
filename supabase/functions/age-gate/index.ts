import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";
import { loadAgeFacts } from "../_shared/ageAccess.ts";
import { calendarDateInRome, decideAgeSubmission } from "../_shared/ageCheck.ts";

/**
 * Controllo età obbligatorio.
 *
 * La data di nascita resta nel corpo di questa richiesta il tempo del calcolo
 * e non viene salvata, né scritta nei log.
 *
 * Cancellazione dell'account social appena creato: le condizioni sono in
 * planJustCreatedSocialDeletion (solo quell'account, entro 15 minuti, mai
 * gli account già esistenti con age o eta sotto i 14). Qui non c'è nessuna
 * chiamata che cancella utenti: è una decisione separata del CEO.
 */

serve(withCors(async (req) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return errorResponse("Richiesta non valida", 400);

    let auth;
    try {
      auth = await validateAuth(req);
    } catch {
      return errorResponse("Unauthorized", 401);
    }

    const facts = await loadAgeFacts(auth.supabase, auth.userId, auth.userEmail);
    if (facts === "error") return errorResponse("Controllo età non disponibile. Riprova.", 500);

    const action = (body as { action?: unknown }).action;

    if (action === "status") {
      if (facts.legacyUnder14) return successResponse({ state: "legacy_block" });
      if (facts.gate?.is_14_plus === true && !(facts.gate.is_under_18 && facts.gate.parent_ack !== true)) {
        return successResponse({ state: "passed" });
      }
      return successResponse({ state: "required" });
    }

    if (action === "submit") {
      const decision = decideAgeSubmission({
        birthDate: (body as { birthDate?: unknown }).birthDate,
        parentAck: (body as { parentAck?: unknown }).parentAck,
        today: calendarDateInRome(new Date()),
        legacyUnder14: facts.legacyUnder14,
        nowIso: new Date().toISOString(),
      });

      if (decision.outcome === "invalid") return errorResponse("Data di nascita non valida", 400);
      if (decision.outcome === "legacy_block") return successResponse({ state: "legacy_block" });
      if (decision.outcome === "blocked_under_14") return successResponse({ state: "blocked" });
      if (decision.outcome === "needs_parent_ack") return successResponse({ state: "needs_parent_ack" });

      const { error } = await auth.supabase.from("user_age_checks").upsert({
        user_id: auth.userId,
        is_14_plus: decision.row.is_14_plus,
        is_under_18: decision.row.is_under_18,
        age_checked_on: decision.row.age_checked_on,
        parent_ack: decision.row.parent_ack,
        parent_ack_at: decision.row.parent_ack_at,
        parent_ack_text_version: decision.row.parent_ack_text_version,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      if (error) return errorResponse("Controllo età non disponibile. Riprova.", 500);
      return successResponse({ state: "passed" });
    }

    return errorResponse("Azione non valida", 400);
  } catch {
    return errorResponse("Controllo età non disponibile. Riprova.", 500);
  }
}));
