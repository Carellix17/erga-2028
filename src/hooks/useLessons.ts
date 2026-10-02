import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { edgeFetch } from "@/lib/edgeFetch";
import { useTrackedMutation } from "./useTrackedMutation";
import type { Exercise } from "@/components/studio/exercises/ExerciseRenderer";

// ⚡ P16: la corsia leggera — quello che serve per DISEGNARE il sentiero.
// I contenuti pesanti (concept, explanation, example, exercises) arrivano
// dopo, una lezione alla volta, solo quando la apri (useLessonQuery).
export interface LessonMeta {
  id: string;
  title: string;
  is_generated: boolean;
  lesson_order: number;
  context_id?: string;
  page_start?: number | null;
  page_end?: number | null;
}

export interface Lesson extends LessonMeta {
  concept?: string;
  explanation?: string;
  example?: string;
  exercises?: Exercise[];
}

/** 🅐 FONDAMENTA — esito dell'ultimo test finale di un percorso. */
export interface FinalTestResult {
  score: number;
  correct?: number;
  total?: number;
  at?: string;
}

/** La lista percorsi/lezioni come arriva dal server (con la nuova memoria). */
export interface LessonsListData {
  lessons: LessonMeta[];
  currentIndex: number;
  /** Ordini (lesson_order) delle lezioni completate davvero. */
  completed: number[];
  /** Esito dell'ultimo test finale, se è stato fatto e salvato. */
  finalTest: FinalTestResult | null;
}

export interface StudyContextSummary {
  id: string;
  file_name: string;
  created_at: string;
  lesson_count?: number;
  processing_status?: string | null;
  error_message?: string | null;
  is_demo?: boolean | null;
  generation_status?: "idle" | "generating" | "completed" | "failed" | null;
  generation_progress?: {
    step?: "analyzing" | "creating-index" | "generating-lessons" | "complete";
    generatedCount?: number;
    totalLessons?: number;
    // 🏭 P10b: cantiere della fabbrica dei moduli — presente solo mentre un
    // modulo è in lavorazione (viene tolto a lavoro finito, bene o male che sia).
    moduleGeneration?: {
      moduleIndex: number;
      totalLessons?: number;
      generatedCount?: number;
      startedAt?: string;
    } | null;
  } | null;
  generation_error?: string | null;
  generation_started_at?: string | null;
  // 🏷️ P11d: titoli AI dei moduli (0-based). Manca sui percorsi vecchi →
  // il client deriva il nome dalla prima lezione del modulo.
  module_titles?: string[] | null;
  // 📦 P17: il cartellino "c'è materiale nuovo non ancora nelle lezioni"
  new_material_pending?: boolean;
}

export const lessonsKeys = {
  all: (userId: string | null) => ["lessons", userId] as const,
  list: (userId: string | null, contextId: string | null | undefined) =>
    ["lessons", userId, "list", contextId ?? "all"] as const,
  contexts: (userId: string | null) => ["lessons", userId, "contexts"] as const,
  hasContent: (userId: string | null) => ["lessons", userId, "hasContent"] as const,
  lesson: (userId: string | null, contextId: string | null | undefined, lessonIndex: number) =>
    ["lessons", userId, "one", contextId ?? "all", lessonIndex] as const,
  progress: (userId: string | null) => ["lessons", userId, "progress"] as const,
};

// La dispensa tiene i pacchi un giorno intero (abbraccia la persistenza P16).
const DAY_MS = 24 * 60 * 60 * 1000;

// ⚡ P16: il fattorino della lista — ora porta solo il plico LEGGERO.
// 🅐 FONDAMENTA — porta anche le spunte (lezioni completate) e l'esito
// dell'ultimo test finale; se il server non li manda ancora, valori neutri.
export async function fetchLessonsList(userId: string | null, contextId: string | null | undefined): Promise<LessonsListData> {
  const body: Record<string, unknown> = { userId, action: "get" };
  if (contextId) body.contextId = contextId;
  const data = await edgeFetch<{
    lessons?: LessonMeta[];
    currentIndex?: number;
    completed?: number[];
    finalTest?: FinalTestResult | null;
  }>("get-lessons", body);
  return {
    lessons: data.lessons ?? [],
    currentIndex: data.currentIndex ?? 0,
    completed: data.completed ?? [],
    finalTest: data.finalTest ?? null,
  };
}

// ⚡ P16: il contenuto completo di UNA lezione — si chiede solo quando serve.
export async function fetchLessonFull(userId: string, contextId: string, lessonIndex: number) {
  const data = await edgeFetch<{ lesson?: Lesson }>("get-lessons", {
    userId, action: "getLesson", contextId, lessonIndex,
  });
  return data.lesson ?? null;
}

export function useLessonsQuery(contextId: string | null | undefined) {
  const { currentUser } = useAuth();
  return useQuery<LessonsListData>({
    queryKey: lessonsKeys.list(currentUser, contextId),
    queryFn: () => fetchLessonsList(currentUser, contextId),
    enabled: !!currentUser,
    gcTime: DAY_MS,
  });
}

// ⚡ P16: la singola lezione a schermo intero — caricamento mirato,
// mai tutta la pagina. In cache anche lei, così riaprirla è gratis.
export function useLessonQuery(contextId: string | null | undefined, lessonIndex: number, enabled = true) {
  const { currentUser } = useAuth();
  return useQuery<Lesson | null>({
    queryKey: lessonsKeys.lesson(currentUser, contextId, lessonIndex),
    queryFn: () => fetchLessonFull(currentUser as string, contextId as string, lessonIndex),
    enabled: !!currentUser && !!contextId && enabled,
    gcTime: DAY_MS,
  });
}

export function useStudyContextsQuery() {
  const { currentUser } = useAuth();
  return useQuery<StudyContextSummary[]>({
    queryKey: lessonsKeys.contexts(currentUser),
    queryFn: async () => {
      const data = await edgeFetch<{ contexts?: StudyContextSummary[] }>("get-lessons", {
        userId: currentUser,
        action: "listContexts",
      });
      return data.contexts ?? [];
    },
    enabled: !!currentUser,
    gcTime: DAY_MS,
  });
}

export function useHasContentQuery() {
  const { currentUser } = useAuth();
  return useQuery<boolean>({
    queryKey: lessonsKeys.hasContent(currentUser),
    queryFn: async () => {
      const data = await edgeFetch<{ hasContent?: boolean }>("get-lessons", {
        userId: currentUser,
        action: "hasContent",
      });
      return !!data.hasContent;
    },
    enabled: !!currentUser,
    gcTime: DAY_MS,
  });
}

export function useUpdateLessonProgress(contextId: string | null | undefined) {
  const { currentUser } = useAuth();
  const qc = useQueryClient();

  return useTrackedMutation<unknown, Error, number, { previous?: { lessons: Lesson[]; currentIndex: number } }>({
    mutationFn: async (lessonIndex: number) => {
      const body: Record<string, unknown> = {
        userId: currentUser,
        action: "updateProgress",
        lessonIndex,
      };
      if (contextId) body.contextId = contextId;
      return edgeFetch("get-lessons", body);
    },
    onMutate: async (lessonIndex) => {
      const qk = lessonsKeys.list(currentUser, contextId);
      await qc.cancelQueries({ queryKey: qk });
      const previous = qc.getQueryData<{ lessons: Lesson[]; currentIndex: number }>(qk);
      if (previous) {
        qc.setQueryData(qk, { ...previous, currentIndex: lessonIndex });
      }
      return { previous };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(lessonsKeys.list(currentUser, contextId), ctx.previous);
      }
    },
  });
}

// 🅐 FONDAMENTA — registra «lezione completata» (con esito esercizi).
// Best-effort: se il backend non è ancora aggiornato, l'errore resta nel
// console — mai rovinare la lettura di una lezione per una spunta.
export function useMarkLessonComplete(contextId: string | null | undefined) {
  const { currentUser } = useAuth();
  const qc = useQueryClient();

  return useTrackedMutation<unknown, Error, { lessonIndex: number; correct?: number; total?: number }>({
    mutationFn: async (vars) => {
      const body: Record<string, unknown> = {
        userId: currentUser,
        action: "markLessonComplete",
        lessonIndex: vars.lessonIndex,
      };
      if (vars.correct !== undefined) body.correct = vars.correct;
      if (vars.total !== undefined) body.total = vars.total;
      if (contextId) body.contextId = contextId;
      return edgeFetch("get-lessons", body);
    },
    onError: (err) => {
      console.warn("[fondamenta] lezione completata non registrata:", err.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: lessonsKeys.list(currentUser, contextId) });
    },
  });
}

// 🅐 FONDAMENTA — salva l'esito dell'ultimo test finale del percorso.
export function useSaveFinalTestResult(contextId: string | null | undefined) {
  const { currentUser } = useAuth();
  const qc = useQueryClient();

  return useTrackedMutation<unknown, Error, { score: number; correct: number; total: number }>({
    mutationFn: async (vars) => {
      const body: Record<string, unknown> = {
        userId: currentUser,
        action: "saveFinalTest",
        score: vars.score,
        correct: vars.correct,
        total: vars.total,
      };
      if (contextId) body.contextId = contextId;
      return edgeFetch("get-lessons", body);
    },
    onError: (err) => {
      console.warn("[fondamenta] esito test finale non salvato:", err.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: lessonsKeys.list(currentUser, contextId) });
    },
  });
}

export function useLessonsCacheControls() {
  const { currentUser } = useAuth();
  const qc = useQueryClient();
  return {
    /** Forza un refetch (es. dopo upload di un nuovo PDF). */
    invalidateAll: () => qc.invalidateQueries({ queryKey: lessonsKeys.all(currentUser) }),
    invalidateList: (contextId: string | null | undefined) =>
      qc.invalidateQueries({ queryKey: lessonsKeys.list(currentUser, contextId) }),
    invalidateContexts: () => qc.invalidateQueries({ queryKey: lessonsKeys.contexts(currentUser) }),
    invalidateHasContent: () => qc.invalidateQueries({ queryKey: lessonsKeys.hasContent(currentUser) }),
    setLessonsList: (
      contextId: string | null | undefined,
      updater: (prev: { lessons: Lesson[]; currentIndex: number } | undefined) => { lessons: Lesson[]; currentIndex: number } | undefined,
    ) => {
      qc.setQueryData(lessonsKeys.list(currentUser, contextId), updater);
    },
  };
}