export interface CourseProgress {
  /** One-based position of the current lesson. */
  lessonNumber: number;
  totalLessons: number;
  /** Number of lessons before the current position, used for completion %. */
  completedCount: number;
  completionPercent: number;
}

/**
 * Keep the course position and completion percentage consistent in Home and
 * Studio. The saved current index remains zero-based: lesson 1 therefore
 * displays as position 1 while completion remains 0% until it is completed.
 */
export function getCourseProgress(currentLessonIndex: number, totalLessons: number): CourseProgress {
  const total = Number.isFinite(totalLessons) ? Math.max(0, Math.floor(totalLessons)) : 0;
  const rawIndex = Number.isFinite(currentLessonIndex) ? Math.floor(currentLessonIndex) : 0;
  const index = total > 0 ? Math.min(Math.max(0, rawIndex), total - 1) : 0;

  return {
    lessonNumber: total > 0 ? index + 1 : 0,
    totalLessons: total,
    completedCount: index,
    completionPercent: total > 0 ? Math.round((index / total) * 100) : 0,
  };
}
