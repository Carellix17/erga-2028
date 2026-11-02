import { countWords } from "../_shared/wordCount.ts";

export interface LessonListRow {
  concept: unknown;
  context_id: string | null;
  example: unknown;
  exercises: unknown;
  explanation: unknown;
  id: string;
  is_generated: boolean;
  lesson_order: number;
  page_end: number | null;
  page_start: number | null;
  title: string;
}

export interface LessonMeta {
  id: string;
  title: string;
  is_generated: boolean;
  lesson_order: number;
  context_id: string | null;
  page_start: number | null;
  page_end: number | null;
  word_count: number | null;
  exercise_count: number;
}

/** Projects a lesson row into list metadata without exposing lesson content. */
export function toLessonMeta(row: LessonListRow): LessonMeta {
  return {
    id: row.id,
    title: row.title,
    is_generated: row.is_generated,
    lesson_order: row.lesson_order,
    context_id: row.context_id,
    page_start: row.page_start,
    page_end: row.page_end,
    word_count: row.is_generated === false
      ? null
      : countWords(typeof row.concept === "string" ? row.concept : "")
        + countWords(typeof row.explanation === "string" ? row.explanation : "")
        + countWords(typeof row.example === "string" ? row.example : ""),
    exercise_count: Array.isArray(row.exercises) ? row.exercises.length : 0,
  };
}
