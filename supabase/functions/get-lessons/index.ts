import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { action, lessonIndex, contextId } = body;

    // Validate authentication and get userId
    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    console.log(`Get lessons for user: ${userId} (authenticated: ${auth.isAuthenticated})`);

    if (action === "get") {
      // Get all lessons, optionally filtered by context.
      // Ownership is strict: users can only read rows whose user_id is their auth uid.
      if (contextId) {
        const { data: ctx } = await supabase
          .from("study_contexts")
          .select("user_id")
          .eq("id", contextId)
          .maybeSingle();
        if (!ctx) {
          return successResponse({ success: true, lessons: [], currentIndex: 0 });
        }
        if (ctx.user_id !== userId) {
          return errorResponse("Not authorized", 403);
        }
      }

      // ⚡ P16: la corsia LEGGERA — la lista viaggia con i soli metadati
      // (titoli, ordine, stato, pagine). I contenuti pesanti (concept,
      // explanation, example, exercises) si prendono UNO ALLA VOLTA con
      // "getLesson", solo quando l'utente apre davvero quella lezione.
      let lessonsQuery = supabase
        .from("mini_lessons")
        .select("id, title, is_generated, lesson_order, context_id, page_start, page_end")
        .order("lesson_order", { ascending: true });

      if (contextId) {
        lessonsQuery = lessonsQuery.eq("context_id", contextId);
        lessonsQuery = lessonsQuery.eq("user_id", userId);
      } else {
        lessonsQuery = lessonsQuery.eq("user_id", userId);
      }

      const { data: lessons, error: lessonsError } = await lessonsQuery;

      // Get progress (per-context when contextId provided, else global).
      // 🅐 FONDAMENTA — portiamo con noi anche le lezioni completate e
      // l'esito dell'ultimo test finale. Se la migrazione non è ancora
      // applicata, ricadiamo sulla lettura leggera di prima (mai rompere
      // la lista per un campo mancante).
      let progressQuery = supabase
        .from("lesson_progress")
        .select("current_lesson_index")
        .eq("user_id", userId);
      progressQuery = contextId
        ? progressQuery.eq("context_id", contextId)
        : progressQuery.is("context_id", null);
      let progress: { current_lesson_index?: number; completed_lessons?: unknown; final_test?: unknown } | null = null;
      try {
        const full = progressQuery.select(
          "current_lesson_index, completed_lessons, final_test",
        );
        const { data } = await full.maybeSingle();
        progress = data ?? null;
      } catch {
        const { data } = await progressQuery.maybeSingle();
        progress = data ?? null;
      }

      if (lessonsError) {
        console.error("Lessons error:", lessonsError);
        throw new Error("Errore nel caricamento delle lezioni");
      }

      // Gli «ordini» delle lezioni completate, per le spunte sul percorso.
      const completedRaw = Array.isArray(progress?.completed_lessons)
        ? (progress!.completed_lessons as Array<{ order?: number }>)
        : [];
      const completed = completedRaw
        .map((c) => (typeof c?.order === "number" ? c.order : null))
        .filter((o): o is number => o !== null);

      return successResponse({
        success: true,
        lessons: lessons || [],
        currentIndex: progress?.current_lesson_index || 0,
        completed,
        finalTest: (progress?.final_test as Record<string, unknown> | null) ?? null,
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

    // 🅐 FONDAMENTA — registra «lezione completata» con l'esito degli
    // esercizi. Idempotente: rifare la lezione sostituisce la vecchia voce.
    if (action === "markLessonComplete" && lessonIndex !== undefined) {
      const correct = typeof body.correct === "number" ? body.correct : null;
      const total = typeof body.total === "number" ? body.total : null;

      let existingQuery = supabase
        .from("lesson_progress")
        .select("id, completed_lessons")
        .eq("user_id", userId);
      existingQuery = contextId
        ? existingQuery.eq("context_id", contextId)
        : existingQuery.is("context_id", null);
      const { data: existing, error: readError } = await existingQuery.maybeSingle();
      if (readError) throw new Error("Errore nella lettura del progresso");

      const entry = {
        order: lessonIndex,
        at: new Date().toISOString(),
        ...(correct !== null ? { correct } : {}),
        ...(total !== null ? { total } : {}),
      };

      const prevList = Array.isArray(existing?.completed_lessons)
        ? (existing!.completed_lessons as Array<{ order?: number }>)
        : [];
      // sostituisce la voce con lo stesso ordine, altrimenti accoda
      const nextList = [
        ...prevList.filter((c) => c?.order !== lessonIndex),
        entry,
      ];

      const { error } = existing
        ? await supabase
            .from("lesson_progress")
            .update({ completed_lessons: nextList, updated_at: new Date().toISOString() })
            .eq("id", existing.id)
        : await supabase.from("lesson_progress").insert({
            user_id: userId,
            context_id: contextId ?? null,
            current_lesson_index: lessonIndex,
            completed_lessons: nextList,
            updated_at: new Date().toISOString(),
          });

      if (error) {
        console.error("markLessonComplete error:", error);
        throw new Error("Errore nel registrare la lezione completata");
      }

      return successResponse({ success: true, completedCount: nextList.length });
    }

    // 🅐 FONDAMENTA — salva l'esito dell'ultimo test finale del percorso.
    if (action === "saveFinalTest") {
      const score = typeof body.score === "number" ? body.score : null;
      const correct = typeof body.correct === "number" ? body.correct : null;
      const total = typeof body.total === "number" ? body.total : null;
      if (score === null) return errorResponse("Punteggio mancante", 400);

      const finalTest = {
        score,
        ...(correct !== null ? { correct } : {}),
        ...(total !== null ? { total } : {}),
        at: new Date().toISOString(),
      };

      let existingQuery = supabase
        .from("lesson_progress")
        .select("id")
        .eq("user_id", userId);
      existingQuery = contextId
        ? existingQuery.eq("context_id", contextId)
        : existingQuery.is("context_id", null);
      const { data: existing, error: readError } = await existingQuery.maybeSingle();
      if (readError) throw new Error("Errore nella lettura del progresso");

      const { error } = existing
        ? await supabase
            .from("lesson_progress")
            .update({ final_test: finalTest, updated_at: new Date().toISOString() })
            .eq("id", existing.id)
        : await supabase.from("lesson_progress").insert({
            user_id: userId,
            context_id: contextId ?? null,
            final_test: finalTest,
            updated_at: new Date().toISOString(),
          });

      if (error) {
        console.error("saveFinalTest error:", error);
        throw new Error("Errore nel salvataggio del test finale");
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

      return successResponse({ 
        success: true, 
        hasContent: !!contexts && contexts.length > 0,
      });
    }

    if (action === "listContexts") {
      // List all contexts with lesson counts and processing status.
      // Strictly include only contexts owned by the authenticated user.
      const ctxFields = "id, file_name, created_at, processing_status, error_message, is_demo, generation_status, generation_progress, generation_error, generation_started_at, module_titles, new_material_pending, subject_family, subject";
      const { data: contexts } = await supabase
        .from("study_contexts")
        .select(ctxFields)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const { data: lessons } = await supabase
        .from("mini_lessons")
        .select("context_id")
        .eq("user_id", userId);

      const lessonCounts: Record<string, number> = {};
      for (const l of lessons || []) {
        if (l.context_id) {
          lessonCounts[l.context_id] = (lessonCounts[l.context_id] || 0) + 1;
        }
      }

      const contextsWithCounts = (contexts || []).map((c: { 
        id: string; 
        file_name: string; 
        created_at: string;
        processing_status: string | null;
        error_message: string | null;
        is_demo?: boolean | null;
      }) => ({
        ...c,
        lesson_count: lessonCounts[c.id] || 0,
      }));

      return successResponse({ success: true, contexts: contextsWithCounts });
    }

    if (action === "getUsage") {
      // Restituisce l'uso corrente del piano gratuito per il rate limiting beta.
      const FREE_LIMIT = 5;
      // 🚧 P12 — RECINTO APERTO: il limite beta è DISATTIVATO (richiesta del
      // capo-cantiere). unlimited:true → il client non mostra più blocchi né
      // banner. Per riaccenderlo: rimetti true qui e in generate-lessons.
      const BETA_LIMIT_ENABLED = false;
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("generation_count")
        .eq("user_id", userId)
        .maybeSingle();
      const used = profile?.generation_count ?? 0;
      return successResponse({
        success: true,
        used,
        limit: FREE_LIMIT,
        remaining: Math.max(0, FREE_LIMIT - used),
        unlimited: !BETA_LIMIT_ENABLED,
      });
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
}));
