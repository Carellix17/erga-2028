import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";
import {
  buildStudyEventInsert,
  buildStudyEventUpdate,
  isPlanChangeReason,
  validatePlanChanges,
} from "./validate.ts";

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { events, action } = body;

    // Validate authentication and get userId.
    let auth;
    try {
      auth = await validateAuth(req, body);
    } catch (authErr) {
      console.error("save-event auth error:", (authErr as Error).message);
      return errorResponse("Unauthorized", 401);
    }
    const { userId, supabase } = auth;

    console.log(`Save event for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

    if (action === "applyChanges") {
      if (!isPlanChangeReason(body.reason)) return errorResponse("reason_invalid", 400);
      const validation = validatePlanChanges(body.changes);
      if (!validation.ok) return errorResponse(validation.error, 400);

      const { data, error } = await supabase.rpc("apply_plan_changes", {
        p_user_id: userId,
        p_reason: body.reason,
        p_changes: validation.changes,
      });
      if (error) {
        if (error.code === "40001") return errorResponse("version_conflict", 409);
        console.error("Apply plan changes error:", error);
        throw new Error("Errore nell'applicazione delle modifiche al piano");
      }

      return successResponse({ packageId: data });
    }

    if (action === "add" && Array.isArray(events)) {
      // Aggiunge sempre e solo i campi base legacy più i nuovi campi validati.
      // Le chiavi opzionali assenti/non valide non entrano nell'INSERT.
      const eventsToInsert = events.map((rawEvent: unknown) => {
        const event = rawEvent && typeof rawEvent === "object"
          ? rawEvent as Record<string, unknown>
          : {};
        return buildStudyEventInsert(userId, event);
      });

      const { error } = await supabase
        .from("study_events")
        .insert(eventsToInsert);

      if (error) {
        console.error("Insert error:", error);
        throw new Error("Errore nel salvataggio degli eventi");
      }

      return successResponse({ success: true });
    }

    if (action === "delete" && events) {
      // Delete events by id - ensure user owns the events.
      const { error } = await supabase
        .from("study_events")
        .delete()
        .eq("user_id", userId)
        .in("id", events);

      if (error) {
        console.error("Delete error:", error);
        throw new Error("Errore nella cancellazione degli eventi");
      }

      return successResponse({ success: true });
    }

    if (action === "update" && body.event) {
      // Modifica di un singolo evento, con optimistic concurrency sul campo version.
      const nowIso = new Date().toISOString();
      const update = buildStudyEventUpdate(body.event, nowIso);
      if (!update.ok) return errorResponse(update.error, update.status);

      const { error, data } = await supabase
        .from("study_events")
        .update({
          ...update.data,
          version: update.version + 1,
          updated_at: nowIso,
        })
        .eq("id", update.id)
        .eq("user_id", userId)
        .eq("version", update.version)
        .select("id");

      if (error) {
        console.error("Update error:", error);
        throw new Error("Errore nella modifica dell'evento");
      }
      if (!data || data.length === 0) return errorResponse("version_conflict", 409);

      return successResponse({ success: true });
    }

    if (action === "deleteByType" && typeof body.eventType === "string") {
      // Delete all matching event types for this user only.
      const allowedTypes = ["study", "test", "assignment"];
      if (!allowedTypes.includes(body.eventType)) return errorResponse("Tipo non valido", 400);

      const { error } = await supabase
        .from("study_events")
        .delete()
        .eq("user_id", userId)
        .eq("event_type", body.eventType);

      if (error) {
        console.error("DeleteByType error:", error);
        throw new Error("Errore nella cancellazione delle sessioni");
      }

      return successResponse({ success: true });
    }

    if (action === "deleteAll") {
      // Delete all planner events for this user (the UI requires confirmation).
      const { error } = await supabase
        .from("study_events")
        .delete()
        .eq("user_id", userId);

      if (error) {
        console.error("DeleteAll error:", error);
        throw new Error("Errore nella cancellazione del piano");
      }

      return successResponse({ success: true });
    }

    if (action === "list") {
      const { data, error } = await supabase
        .from("study_events")
        .select("*")
        .eq("user_id", userId)
        .order("event_date", { ascending: true });

      if (error) {
        console.error("List error:", error);
        throw new Error("Errore nel caricamento degli eventi");
      }

      return successResponse({ success: true, events: data });
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore nel salvataggio degli eventi. Riprova.");
  }
}));
