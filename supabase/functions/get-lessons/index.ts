import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { validateAuth, corsHeaders, errorResponse, successResponse } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, lessonIndex, contextId } = body;

    // Validate authentication and get userId
    const auth = await validateAuth(req, body);
    const { userId, userEmail, supabase } = auth;
    const legacyUserId = userEmail && userEmail !== userId ? userEmail : null;

    console.log(`Get lessons for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

    if (action === "get") {
      // Get all lessons, optionally filtered by context
      let lessonsQuery = supabase
        .from("mini_lessons")
        .select("*")
        .eq("user_id", userId)
        .order("lesson_order", { ascending: true });

      if (contextId) {
        lessonsQuery = lessonsQuery.eq("context_id", contextId);
      }

      const { data: lessons, error: lessonsError } = await lessonsQuery;
      let legacyLessonsQuery = legacyUserId
        ? supabase
            .from("mini_lessons")
            .select("*")
            .eq("user_id", legacyUserId)
            .order("lesson_order", { ascending: true })
        : null;
      if (legacyLessonsQuery && contextId) {
        legacyLessonsQuery = legacyLessonsQuery.eq("context_id", contextId);
      }
      const { data: legacyLessons } = legacyLessonsQuery
        ? await legacyLessonsQuery
        : { data: null };

      // Get progress (per-context when contextId provided, else global)
      let progressQuery = supabase
        .from("lesson_progress")
        .select("current_lesson_index")
        .eq("user_id", userId);
      progressQuery = contextId
        ? progressQuery.eq("context_id", contextId)
        : progressQuery.is("context_id", null);
      const { data: progress } = await progressQuery.maybeSingle();

      if (lessonsError) {
        console.error("Lessons error:", lessonsError);
        throw new Error("Errore nel caricamento delle lezioni");
      }

      const mergedLessons = [...(lessons || []), ...(legacyLessons || [])].sort(
        (a: { lesson_order: number }, b: { lesson_order: number }) =>
          (a.lesson_order ?? 0) - (b.lesson_order ?? 0)
      );
      return successResponse({
        success: true,
        lessons: mergedLessons,
        currentIndex: progress?.current_lesson_index || 0,
      });
    }

    if (action === "getLesson" && lessonIndex !== undefined) {
      // Get specific lesson, optionally filtered by context
      let lessonQuery = supabase
        .from("mini_lessons")
        .select("*")
        .eq("user_id", userId)
        .eq("lesson_order", lessonIndex);

      if (contextId) {
        lessonQuery = lessonQuery.eq("context_id", contextId);
      }

      const { data: lesson, error: lessonError } = await lessonQuery.maybeSingle();

      if (lessonError) {
        console.error("Lesson error:", lessonError);
        throw new Error("Errore nel caricamento della lezione");
      }

      return successResponse({ success: true, lesson });
    }

    if (action === "updateProgress" && lessonIndex !== undefined) {
      // Update progress per context (or global when no contextId)
      // We can't rely on onConflict with a partial/expression unique index,
      // so do a manual select-then-insert/update.
      let existingQuery = supabase
        .from("lesson_progress")
        .select("id")
        .eq("user_id", userId);
      existingQuery = contextId
        ? existingQuery.eq("context_id", contextId)
        : existingQuery.is("context_id", null);
      const { data: existing } = await existingQuery.maybeSingle();

      const { error } = existing
        ? await supabase
            .from("lesson_progress")
            .update({
              current_lesson_index: lessonIndex,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
        : await supabase.from("lesson_progress").insert({
            user_id: userId,
            context_id: contextId ?? null,
            current_lesson_index: lessonIndex,
            updated_at: new Date().toISOString(),
          });

      if (error) {
        console.error("Progress error:", error);
        throw new Error("Errore nell'aggiornamento del progresso");
      }

      return successResponse({ success: true });
    }

    if (action === "hasContent") {
      // Check if user has study content
      const { data: contexts } = await supabase
        .from("study_contexts")
        .select("id")
        .eq("user_id", userId)
        .limit(1);
      const { data: legacyContexts } = legacyUserId
        ? await supabase
            .from("study_contexts")
            .select("id")
            .eq("user_id", legacyUserId)
            .limit(1)
        : { data: null };

      return successResponse({ 
        success: true, 
        hasContent: (contexts && contexts.length > 0) || (legacyContexts && legacyContexts.length > 0)
      });
    }

    if (action === "listContexts") {
      // List all contexts with lesson counts and processing status
      const { data: contexts } = await supabase
        .from("study_contexts")
        .select("id, file_name, created_at, processing_status, error_message")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      const { data: legacyContexts } = legacyUserId
        ? await supabase
            .from("study_contexts")
            .select("id, file_name, created_at, processing_status, error_message")
            .eq("user_id", legacyUserId)
            .order("created_at", { ascending: false })
        : { data: null };

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
      const contextsWithCounts = allContexts.map((c: { 
        id: string; 
        file_name: string; 
        created_at: string;
        processing_status: string | null;
        error_message: string | null;
      }) => ({
        ...c,
        lesson_count: lessonCounts[c.id] || 0,
      }));

      return successResponse({ success: true, contexts: contextsWithCounts });
    }

    return errorResponse("Invalid action", 400);

  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Missing authentication")) {
      return errorResponse("Sessione scaduta. Effettua di nuovo l'accesso.", 401);
    }
    return errorResponse("Errore nel caricamento delle lezioni. Riprova.");
  }
});
