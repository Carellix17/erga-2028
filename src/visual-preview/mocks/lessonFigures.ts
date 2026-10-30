export interface LessonFigure {
  id: string;
  page: number;
  bbox: { x: number; y: number; width: number; height: number };
  url: string;
  description: string;
}

export function prefetchLessonFigures() {}

export function useLessonFigures() {
  return { figures: [] as LessonFigure[], loading: false, error: null };
}
