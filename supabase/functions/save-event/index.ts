import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { events, action } = body;

    // Validate authentication and get userId
    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    console.log(`Save event for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

    if (action === "add" && events) {
      // Add new events
      const eventsToInsert = events.map((event: { subject: string; title: string; date: string; time?: string; type: string }) => ({
        user_id: userId,
        subject: event.subject,
        title: event.title,
        event_date: event.date,
        event_time: event.time || null,
        event_type: event.type,
      }));

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
      // Delete events by id - ensure user owns the events
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
      // Modifica di un singolo evento esistente, sempre vincolata al proprietario.
      const ev = body.event;
      const id = String(ev.id || "");
      if (!id) return errorResponse("Missing event id", 400);

      // Whitelist dei campi modificabili + validazioni
      const allowedTypes = ["study", "test", "assignment"];
      const updateData: Record<string, unknown> = {};
      if (typeof ev.subject === "string" && ev.subject.trim()) updateData.subject = ev.subject.trim().slice(0, 80);
      if (typeof ev.title === "string" && ev.title.trim()) updateData.title = ev.title.trim().slice(0, 200);
      if (typeof ev.date === "string" && !Number.isNaN(Date.parse(ev.date))) updateData.event_date = ev.date;
      if (typeof ev.time === "string" && /^\d{2}:\d{2}$/.test(ev.time)) updateData.event_time = ev.time;
      if (ev.time === null) updateData.event_time = null;
      if (typeof ev.type === "string" && allowedTypes.includes(ev.type)) updateData.event_type = ev.type;
      if (Object.keys(updateData).length === 0) return errorResponse("Nessuna modifica valida", 400);

      const { error, data } = await supabase
        .from("study_events")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", userId)   // <-- nessuno puo' modificare eventi altrui
        .select("id");

      if (error) {
        console.error("Update error:", error);
        throw new Error("Errore nella modifica dell'evento");
      }
      if (!data || data.length === 0) return errorResponse("Evento non trovato", 404);

      return successResponse({ success: true });
    }

    if (action === "deleteByType" && typeof body.eventType === "string") {
      // Elimina tutte le sessioni di un tipo (es. solo quelle "study" generate dall'AI),
      // sempre e solo quelle dell'utente autenticato.
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
      // Elimina TUTTI gli eventi del piano dell'utente (doppia conferma lato UI)
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
      // List all events for user
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
