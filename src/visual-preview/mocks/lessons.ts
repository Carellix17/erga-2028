const contextId = "visual-context";
const lessons = [
  { id: "visual-lesson-0", context_id: contextId, title: "Che cosa descrive il moto", lesson_order: 0, is_generated: true },
  { id: "visual-lesson-1", context_id: contextId, title: "Velocità media e istantanea", lesson_order: 1, is_generated: true },
  { id: "visual-lesson-2", context_id: contextId, title: "Leggere un grafico spazio-tempo", lesson_order: 2, is_generated: true },
  { id: "visual-lesson-3", context_id: contextId, title: "Accelerazione costante", lesson_order: 3, is_generated: true },
  { id: "visual-lesson-4", context_id: contextId, title: "Moto uniformemente accelerato", lesson_order: 4, is_generated: true },
  { id: "visual-lesson-5", context_id: contextId, title: "Caduta libera", lesson_order: 5, is_generated: true },
  { id: "visual-lesson-6", context_id: contextId, title: "Il moto circolare", lesson_order: 6, is_generated: true },
  { id: "visual-lesson-7", context_id: contextId, title: "Ripasso di cinematica", lesson_order: 7, is_generated: true },
];

const listData = { lessons, currentIndex: 1, completed: [], finalTest: null };
const contexts = [
  {
    id: contextId,
    file_name: "Fisica - moto rettilineo.pdf",
    cover_image_url: null,
    generation_status: "idle",
    processing_status: "completed",
    generation_progress: {},
    created_at: "2026-10-20T10:00:00.000Z",
    is_demo: false,
    module_titles: null,
    new_material_pending: false,
  },
];

export function useStudyContextsQuery() {
  return { data: contexts, isLoading: false, isError: false, refetch: async () => ({ data: contexts }) };
}

export function useLessonsQuery() {
  return {
    data: listData,
    isLoading: false,
    isError: false,
    refetch: async () => ({ data: listData }),
  };
}

export function useLessonQuery(_contextId?: string | null, _lessonIndex?: number) {
  return { data: lessons[0], isLoading: false, isError: false };
}

const mutation = { mutate: () => {}, mutateAsync: async () => undefined, isPending: false };
export const useUpdateLessonProgress = () => mutation;
export const useMarkLessonComplete = () => mutation;
export const useSaveFinalTestResult = () => mutation;

export function useLessonsCacheControls() {
  return {
    invalidateList: () => {},
    invalidateContexts: () => {},
    invalidateAll: () => {},
    setLessonsList: () => {},
    invalidateHasContent: () => {},
  };
}

export async function fetchLessonsList() {
  return listData;
}

export async function fetchLessonFull(_userId: string, _id: string, index: number) {
  return lessons[index] ?? null;
}

export const lessonsKeys = {
  list: (...parts: unknown[]) => ["visual-lessons-list", ...parts],
  lesson: (...parts: unknown[]) => ["visual-lesson", ...parts],
};
