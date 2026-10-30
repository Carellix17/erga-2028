export interface CourseProgress {
  /** One-based position of the current lesson. */
  lessonNumber: number;
  totalLessons: number;
  /** Number of completed lessons used for completion %. */
  completedCount: number;
  completionPercent: number;
}

/**
 * Parse the persisted `completed_lessons` JSON into lesson-order indices.
 * Invalid entries are ignored so a partially migrated row cannot break a view.
 */
export function getCompletedLessonOrders(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const order = (entry as { order?: unknown }).order;
    return typeof order === "number" && Number.isInteger(order) && order >= 0 ? [order] : [];
  });
}

/** True when the last lesson's order appears in the saved completion list. */
export function isLastLessonCompleted(
  completedLessonOrders: readonly number[],
  lastLessonOrder: number | null | undefined,
): boolean {
  return typeof lastLessonOrder === "number" && completedLessonOrders.includes(lastLessonOrder);
}

/**
 * Keep the course position and completion percentage consistent in Home and
 * Studio. The saved current index remains zero-based: lesson 1 therefore
 * displays as position 1 while completion remains 0% until it is completed.
 * The explicit finished flag comes from the saved completed-lessons list;
 * indexes stay clamped for display and are never rewritten here.
 */
export function getCourseProgress(
  currentLessonIndex: number,
  totalLessons: number,
  isCourseFinished = false,
): CourseProgress {
  const total = Number.isFinite(totalLessons) ? Math.max(0, Math.floor(totalLessons)) : 0;
  const rawIndex = Number.isFinite(currentLessonIndex) ? Math.floor(currentLessonIndex) : 0;
  const index = total > 0 ? Math.min(Math.max(0, rawIndex), total - 1) : 0;
  const finished = total > 0 && isCourseFinished;
  const completedCount = finished ? total : index;

  return {
    lessonNumber: total > 0 ? index + 1 : 0,
    totalLessons: total,
    completedCount,
    completionPercent: total > 0
      ? finished
        ? 100
        : Math.round((index / total) * 100)
      : 0,
  };
}
