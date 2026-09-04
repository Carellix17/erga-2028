import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { contextId, action } = body;

    // Validate authentication and get userId
    let auth;
    try {
      auth = await validateAuth(req, body);
    } catch (authErr) {
      console.error("delete-context auth error:", (authErr as Error).message);
      return errorResponse("Unauthorized", 401);
    }
    const { userId, userEmail, supabase } = auth;

    const legacyUserId = userEmail && userEmail !== userId ? userEmail : null;

    console.log(`Delete context for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

    // List all contexts for user
    if (action === "list") {
      const { data: contexts, error } = await supabase
        .from("study_contexts")
        .select("id, file_name, created_at, file_path, new_material_pending")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const { data: legacyContexts } = legacyUserId
        ? await supabase
            .from("study_contexts")
            .select("id, file_name, created_at, file_path, new_material_pending")
            .eq("user_id", legacyUserId)
            .order("created_at", { ascending: false })
        : { data: null };

      if (error) {
        console.error("Error fetching contexts:", error);
        return errorResponse("Errore nel recupero dei file");
      }

      // Get lesson counts per context
      const { data: lessons } = await supabase
        .from("mini_lessons")
        .select("context_id")
        .eq("user_id", userId);
      const { data: legacyLessons } = legacyUserId
        ? await supabase
            .from("mini_lessons")
            .select("context_id")
            .eq("user_id", legacyUserId)
        : { data: null };

      const lessonCounts: Record<string, number> = {};
      const allLessons = [...(lessons || []), ...(legacyLessons || [])];
      for (const l of allLessons) {
        if (l.context_id) {
          lessonCounts[l.context_id] = (lessonCounts[l.context_id] || 0) + 1;
        }
      }

      const allContexts = [...(contexts || []), ...(legacyContexts || [])];
      const contextsWithCounts = allContexts.map((c: { id: string; file_name: string; created_at: string }) => ({
        ...c,
        lesson_count: lessonCounts[c.id] || 0,
      }));

      return successResponse({ success: true, contexts: contextsWithCounts });
    }

    // Delete a specific context
    if (action === "delete" && contextId) {
      console.log(`Deleting context ${contextId} for user ${userId}`);

      // First delete related lessons
      const { error: lessonsError } = await supabase
        .from("mini_lessons")
        .delete()
        .in("user_id", legacyUserId ? [userId, legacyUserId] : [userId])
        .eq("context_id", contextId);

      if (lessonsError) {
        console.error("Error deleting lessons:", lessonsError);
      }

      // Delete the context - ensure user owns it
      const { error } = await supabase
        .from("study_contexts")
        .delete()
        .eq("id", contextId)
        .in("user_id", legacyUserId ? [userId, legacyUserId] : [userId]);

      if (error) {
        console.error("Error deleting context:", error);
        return errorResponse("Errore nell'eliminazione del file");
      }

      console.log(`Successfully deleted context ${contextId}`);

      return successResponse({ success: true });
    }

    // 🗑️ P17 — Togli UN file dal ripostiglio di un percorso.
    // Se era l'ultimo file, il percorso sparisce con le sue lezioni.
    if (action === "removeFile" && contextId) {
      const filePath = body.filePath as string | undefined;
      if (!filePath) return errorResponse("filePath mancante", 400);

      const { data: ctxRows } = await supabase
        .from("study_contexts")
        .select("id, user_id, file_path")
        .eq("id", contextId);
      const ctx = (ctxRows || []).find((c: { user_id: string }) =>
        c.user_id === userId || (legacyUserId && c.user_id === legacyUserId));
      if (!ctx) return errorResponse("Percorso non trovato", 404);

      const paths = ((ctx.file_path as string | null) ?? "").split(",").filter(Boolean);
      if (!paths.includes(filePath)) return errorResponse("File non trovato nel percorso", 404);

      await supabase.storage.from("study-pdfs").remove([filePath]);
      const remaining = paths.filter((p: string) => p !== filePath);

      if (remaining.length === 0) {
        await supabase.from("mini_lessons").delete()
          .in("user_id", legacyUserId ? [userId, legacyUserId] : [userId])
          .eq("context_id", contextId);
        await supabase.from("study_contexts").delete()
          .eq("id", contextId)
          .in("user_id", legacyUserId ? [userId, legacyUserId] : [userId]);
        console.log(`Ultimo file tolto: percorso ${contextId} eliminato con le sue lezioni`);
        return successResponse({ success: true, removed: true, contextDeleted: true });
      }

      await supabase.from("study_contexts").update({
        file_path: remaining.join(","),
        new_material_pending: true, // il testo estratto e' rimasto vecchio: avvisa di rigenerare
      }).eq("id", contextId);
      console.log(`File tolto dal percorso ${contextId}: restano ${remaining.length} file`);
      return successResponse({ success: true, removed: true, contextDeleted: false });
    }

    return errorResponse("Invalid action", 400);

  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Errore nell'operazione. Riprova.");
  }
}));
