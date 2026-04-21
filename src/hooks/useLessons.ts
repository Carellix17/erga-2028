import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { edgeFetch } from "@/lib/edgeFetch";
import { useTrackedMutation } from "./useTrackedMutation";
import type { Exercise } from "@/components/studio/exercises/ExerciseRenderer";

export interface Lesson {
  id: string;
  title: string;
  concept: string;
  explanation: string;
  example?: string;
  exercises?: Exercise[];
  is_generated: boolean;
  lesson_order: number;
  context_id?: string;
  page_start?: number | null;
  page_end?: number | null;
}

export interface StudyContextSummary {
  id: string;
  file_name: string;
  created_at: string;
  lesson_count?: number;
  processing_status?: string | null;
  error_message?: string | null;
}

export const lessonsKeys = {
  all: (userId: string | null) => ["lessons", userId] as const,
  list: (userId: string | null, contextId: string | null | undefined) =>
    ["lessons", userId, "list", contextId ?? "all"] as const,
  contexts: (userId: string | null) => ["lessons", userId, "contexts"] as const,
  hasContent: (userId: string | null) => ["lessons", userId, "hasContent"] as const,
  progress: (userId: string | null) => ["lessons", userId, "progress"] as const,
};

export function useLessonsQuery(contextId: string | null | undefined) {
  const { currentUser } = useAuth();
  return useQuery<{ lessons: Lesson[]; currentIndex: number }>({
    queryKey: lessonsKeys.list(currentUser, contextId),
    queryFn: async () => {
      const body: Record<string, unknown> = { userId: currentUser, action: "get" };
      if (contextId) body.contextId = contextId;
      const data = await edgeFetch<{ lessons?: Lesson[]; currentIndex?: number }>("get-lessons", body);
      return { lessons: data.lessons ?? [], currentIndex: data.currentIndex ?? 0 };
    },
    enabled: !!currentUser,
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
  });
}

export function useUpdateLessonProgress(contextId: string | null | undefined) {
  const { currentUser } = useAuth();
  const qc = useQueryClient();

  return useTrackedMutation<unknown, Error, number, { previous?: { lessons: Lesson[]; currentIndex: number } }>({
    mutationFn: async (lessonIndex: number) => {
      return edgeFetch("get-lessons", {
        userId: currentUser,
        action: "updateProgress",
        lessonIndex,
      });
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