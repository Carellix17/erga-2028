import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";
import { normalizeLanguage, languageDirective } from "../_shared/language.ts";
import { fetchCognitiveProfile, buildCognitivePromptAddon } from "../_shared/cognitive.ts";
import { callAIText } from "../_shared/ai.ts";
import { tryOpenRouterText } from "../_shared/openrouter.ts";
import {
  buildGymPrompt,
  parseExerciseSet,
  GYM_SYSTEM_MESSAGE,
} from "../_shared/scientificGym.ts";
import { buildSocraticMessages } from "../_shared/socraticTutor.ts";
import { sliceByPageRange, maxPageNumber } from "../_shared/pagemap.ts";

/**
 * 🏋️ PERCORSI 2.0 — LA PALESTRA SCIENTIFICA (edge function).
 *
 * Due azioni sincrone (niente job in background: qui si risponde subito):
 *   · "generate" — prepara una serie di esercizi numerici (con soluzione
 *     passo-passo e suggerimenti) su un modulo o su tutto il percorso.
 *     Cervello: DeepSeek via OpenRouter, paracadute Gemini.
 *   · "socratic" — un turno della chat socratica su un esercizio.
 *
 * Riservata ai percorsi con subject_family = "scientifiche": l'app mostra
 * la sezione solo per matematica, fisica e chimica.
 */

const MODULE_SIZE = 4; // allineato a generate-lessons
const MAX_MATERIAL_CHARS = 20000;

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { action, contextId } = body;
    const language = normalizeLanguage(body.language);

    if (!contextId || typeof contextId !== "string") {
      return errorResponse("contextId richiesto", 400);
    }

    const auth = await validateAuth(req, body);
    const { userId, supabase } = auth;

    // Il percorso deve essere dello studente E di materia scientifica.
    const { data: ctx } = await supabase
      .from("study_contexts")
      .select("id, file_name, subject_family, subject, content, processing_status")
      .eq("id", contextId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!ctx) return errorResponse("Contesto non trovato", 404);
    if ((ctx as { subject_family?: string | null }).subject_family !== "scientifiche") {
      return errorResponse("La palestra è disponibile solo per i percorsi di matematica, fisica e chimica.", 403);
    }
    if ((ctx as { processing_status?: string }).processing_status !== "completed") {
      return errorResponse("Il materiale è ancora in elaborazione. Riprova tra qualche secondo.", 400);
    }

    const subject = String((ctx as { subject?: string | null }).subject || "Scienze");
    const langDirective = languageDirective(language);

    // ── AZIONE: GENERA LA SERIE DI ESERCIZI ──────────────────────────────
    if (action === "generate") {
      const moduleIndex = typeof body.moduleIndex === "number" && body.moduleIndex >= 0
        ? Math.floor(body.moduleIndex)
        : null;
      const count = typeof body.count === "number"
        ? Math.min(8, Math.max(3, Math.round(body.count)))
        : 5;

      // Le lezioni del modulo (o del percorso intero): titoli + concetti.
      let lessonsQuery = supabase
        .from("mini_lessons")
        .select("title, concept, lesson_order, is_generated, page_start, page_end")
        .eq("user_id", userId)
        .eq("context_id", contextId)
        .eq("is_generated", true)
        .order("lesson_order");
      if (moduleIndex !== null) {
        lessonsQuery = lessonsQuery
          .gte("lesson_order", moduleIndex * MODULE_SIZE)
          .lte("lesson_order", moduleIndex * MODULE_SIZE + MODULE_SIZE - 1);
      }
      const { data: moduleLessons } = await lessonsQuery;
      if (!moduleLessons || moduleLessons.length === 0) {
        return errorResponse("Prima prepara qualche lezione di questo percorso, poi la palestra costruisce gli esercizi.", 400);
      }

      const topicsSummary = moduleLessons
        .map((l: { title: string; concept?: string | null }, i: number) =>
          `${i + 1}. ${l.title}${l.concept ? ` — ${String(l.concept).slice(0, 200)}` : ""}`)
        .join("\n");

      // Fetta di materiale: le pagine coperte dalle lezioni scelte.
      const content = String((ctx as { content?: string | null }).content || "");
      let materialSlice = "";
      if (content && maxPageNumber(content) > 0) {
        const starts = moduleLessons.map((l: { page_start?: number | null }) => l.page_start).filter((v: unknown) => typeof v === "number") as number[];
        const ends = moduleLessons.map((l: { page_end?: number | null }) => l.page_end).filter((v: unknown) => typeof v === "number") as number[];
        if (starts.length > 0 && ends.length > 0) {
          materialSlice = sliceByPageRange(
            content,
            Math.min(...starts),
            Math.max(...ends),
            MAX_MATERIAL_CHARS,
          );
        }
      }
      if (!materialSlice && content) {
        materialSlice = content.substring(0, 12000);
      }

      const cognitive = await fetchCognitiveProfile(supabase, userId);
      const profileContext = buildCognitivePromptAddon(cognitive);
      const moduleLabel = moduleIndex !== null ? `modulo ${moduleIndex + 1}` : "percorso completo";

      const prompt = buildGymPrompt({
        subject,
        topicsSummary,
        materialSlice,
        count,
        profileContext,
        moduleLabel,
      });

      // Cervello scientifico: DeepSeek, paracadute Gemini.
      const messages = [
        { role: "system", content: `${langDirective}\n${GYM_SYSTEM_MESSAGE}` },
        { role: "user", content: prompt },
      ];
      let raw = await tryOpenRouterText({
        messages,
        temperature: 0.4,
        maxTokens: 6000,
        tag: "scientific-gym",
        userId,
      });
      if (raw === null) {
        raw = await callAIText(messages, 0.4, 6000, "scientific-gym");
      }

      let exercises = parseExerciseSet(raw, count);
      if (exercises.length === 0) {
        console.warn("[gym] serie illeggibile, riprovo una volta. Inizio risposta:", String(raw).slice(0, 300));
        const retry = await callAIText(messages, 0.3, 6000, "scientific-gym");
        exercises = parseExerciseSet(retry, count);
      }
      if (exercises.length === 0) {
        return errorResponse("Il tutor non è riuscito a preparare gli esercizi. Riprova tra un attimo.", 502);
      }
      return successResponse({ success: true, exercises });
    }

    // ── AZIONE: UN TURNO DELLA CHAT SOCRATICA ───────────────────────────
    if (action === "socratic") {
      const exercise = body.exercise as { text?: unknown; answerUnit?: unknown; steps?: unknown } | undefined;
      const history = Array.isArray(body.history) ? body.history : [];
      const studentAnswer = typeof body.studentAnswer === "string" ? body.studentAnswer.slice(0, 200) : undefined;
      const solved = body.solved === true;

      const exText = exercise && typeof exercise.text === "string" ? exercise.text : "";
      if (!exText.trim()) return errorResponse("Esercizio mancante", 400);

      const cleanHistory = history
        .filter((t: unknown): t is { role: "user" | "assistant"; content: string } => {
          if (!t || typeof t !== "object") return false;
          const o = t as { role?: unknown; content?: unknown };
          return (o.role === "user" || o.role === "assistant") && typeof o.content === "string" && o.content.trim() !== "";
        })
        .slice(-20)
        .map((t: { role: "user" | "assistant"; content: string }) => ({
          role: t.role,
          content: t.content.slice(0, 1500),
        }));

      const steps = Array.isArray(exercise?.steps)
        ? (exercise.steps as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 8)
        : undefined;

      const messages = buildSocraticMessages(
        {
          exercise: {
            text: exText,
            answerUnit: typeof exercise?.answerUnit === "string" ? exercise.answerUnit : undefined,
            steps,
          },
          history: cleanHistory,
          studentAnswer,
          solved,
        },
        langDirective,
      );

      let reply = await tryOpenRouterText({
        messages,
        temperature: 0.4,
        maxTokens: 500,
        tag: "scientific-gym-socratic",
        userId,
      });
      if (reply === null) {
        reply = await callAIText(messages, 0.4, 500, "scientific-gym-socratic");
      }
      return successResponse({ success: true, reply });
    }

    return errorResponse("Azione non riconosciuta", 400);
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error && [
      "Contesto non trovato",
      "La palestra è disponibile solo per i percorsi di matematica, fisica e chimica.",
      "Il materiale è ancora in elaborazione. Riprova tra qualche secondo.",
      "Prima prepara qualche lezione di questo percorso, poi la palestra costruisce gli esercizi.",
      "Il tutor non è riuscito a preparare gli esercizi. Riprova tra un attimo.",
      "Esercizio mancante",
    ].includes(error.message)
      ? error.message
      : "Errore nella palestra scientifica. Riprova.";
    return errorResponse(msg);
  }
}));
