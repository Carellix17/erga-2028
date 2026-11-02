import { supabase } from "@/integrations/supabase/client";
import type { LessonReadingLogInsert } from "./types";

const MAX_ACTIVE_SECONDS = 14_400;

export interface BuildReadingLogInput {
  activeSeconds: number;
  baseEstimateMin: number;
  contextId?: string | null;
  exerciseCount: number;
  lessonOrder: number;
  subject?: string | null;
  subjectType?: string | null;
  userId: string;
  wordCount: number;
}

function clampActiveSeconds(seconds: number): number {
  if (Number.isNaN(seconds)) return 0;
  return Math.min(MAX_ACTIVE_SECONDS, Math.max(0, seconds));
}

/** Builds a database payload without ever copying lesson text into the log. */
export function buildReadingLog(input: BuildReadingLogInput): LessonReadingLogInsert {
  return {
    active_seconds: clampActiveSeconds(input.activeSeconds),
    base_estimate_min: input.baseEstimateMin,
    context_id: input.contextId ?? null,
    exercise_count: input.exerciseCount,
    lesson_order: input.lessonOrder,
    subject: input.subject ?? null,
    subject_type: input.subjectType ?? null,
    user_id: input.userId,
    word_count: input.wordCount,
  };
}

/** Best-effort insert: logging failures are reported to the console only. */
export async function insertReadingLog(input: BuildReadingLogInput): Promise<void> {
  try {
    const payload = buildReadingLog(input);
    const { error } = await supabase.from("lesson_reading_logs").insert(payload);
    if (error) console.error("[reading-log] insert failed:", error);
  } catch (error) {
    console.error("[reading-log] insert failed:", error);
  }
}
