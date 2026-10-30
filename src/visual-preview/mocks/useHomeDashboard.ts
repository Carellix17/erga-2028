import { getCourseProgress } from "@/lib/courseProgress";

const visualCourseProgress = getCourseProgress(1, 8);

const tasks = [
  {
    id: "visual-task-1",
    sourceId: "visual-event-1",
    source: "event" as const,
    title: "Ripasso di cinematica",
    subject: "Fisica",
    time: "15:30",
    kind: "study" as const,
    isCompleted: false,
    canStartFocus: true,
  },
  {
    id: "visual-task-2",
    sourceId: "visual-event-2",
    source: "event" as const,
    title: "Verifica sulle funzioni",
    subject: "Matematica",
    time: "17:00",
    kind: "test" as const,
    isCompleted: false,
    canStartFocus: false,
  },
  {
    id: "visual-task-3",
    sourceId: "visual-event-3",
    source: "event" as const,
    title: "Ripasso conclusivo di cinematica",
    subject: "Fisica e applicazioni",
    time: "18:15",
    kind: "study" as const,
    isCompleted: false,
    canStartFocus: true,
  },
];

const data = {
  displayName: "Arianna Bianchi",
  resumeLesson: {
    contextId: "visual-context",
    lessonIndex: 1,
    lessonTitle: "Velocità, spazio e tempo: un ripasso guidato",
    courseTitle: "Fisica — moto rettilineo",
    coverUrl: null,
    lessonNumber: visualCourseProgress.lessonNumber,
    lessonCount: visualCourseProgress.totalLessons,
    progressPercent: visualCourseProgress.completionPercent,
  },
  activeContextId: "visual-context",
  hasContexts: true,
  isGenerating: false,
  todayTasks: tasks,
  nextEvaluation: {
    id: "visual-evaluation",
    title: "Cinematica",
    subject: "Fisica",
    daysAway: 3,
    date: "2026-10-28T08:00:00.000Z",
  },
  minutesToday: 32,
  sessionsToday: 2,
  completedActivities: 1,
  streakDays: 12,
  focusSessions: [],
};

export function useHomeDashboard() {
  return {
    data,
    isLoading: false,
    isError: false,
    refetch: async () => ({ data }),
  };
}
