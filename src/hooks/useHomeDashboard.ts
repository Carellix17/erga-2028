import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cleanCourseName } from "@/lib/courseName";
import { addDays, computeStudyStreak, daysUntil, formatEventTime, toLocalDayKey } from "@/lib/homeDashboard";

export interface HomeResumeLesson {
  contextId: string;
  lessonIndex: number;
  lessonTitle: string;
  courseTitle: string;
  coverUrl: string | null;
  lessonNumber: number;
  lessonCount: number;
  progressPercent: number;
}

export interface HomeTask {
  id: string;
  sourceId: string;
  source: "event" | "evaluation";
  title: string;
  subject: string;
  time: string | null;
  kind: "study" | "test" | "assignment" | "evaluation";
  isCompleted: boolean;
  canStartFocus: boolean;
}

export interface HomeNextEvaluation {
  id: string;
  title: string;
  subject: string;
  daysAway: number;
  date: string;
}

export interface HomeDashboardData {
  displayName: string;
  resumeLesson: HomeResumeLesson | null;
  activeContextId: string | null;
  hasContexts: boolean;
  isGenerating: boolean;
  todayTasks: HomeTask[];
  nextEvaluation: HomeNextEvaluation | null;
  minutesToday: number;
  sessionsToday: number;
  completedActivities: number;
  streakDays: number;
}

interface ProfileRow {
  nickname: string | null;
  first_name: string | null;
  last_studio_context_id: string | null;
}

interface ContextRow {
  id: string;
  file_name: string;
  cover_image_url: string | null;
  generation_status: string | null;
  processing_status: string | null;
  created_at: string;
}

interface EventRow {
  id: string;
  subject: string;
  title: string;
  event_date: string;
  event_time: string | null;
  event_type: string;
}

interface EvaluationRow {
  id: string;
  title: string;
  date: string;
  subject_id: string | null;
  free_topic_title: string | null;
}

interface SessionRow {
  actual_duration: number;
  completed_at: string;
  event_id: string | null;
}

function assertNoError(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

export const homeDashboardKeys = {
  all: (userId: string | null) => ["home-dashboard", userId] as const,
};

export function useHomeDashboard() {
  const { currentUser, currentEmail } = useAuth();
  const todayKey = toLocalDayKey(new Date());

  return useQuery<HomeDashboardData>({
    queryKey: [...homeDashboardKeys.all(currentUser), todayKey],
    enabled: !!currentUser,
    staleTime: 30_000,
    refetchOnMount: "always",
    queryFn: async () => {
      const now = new Date();
      const today = toLocalDayKey(now);
      const horizon = toLocalDayKey(addDays(now, 14));
      const logsSince = addDays(now, -60).toISOString();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endHorizon = addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 15).toISOString();

      const [profileRes, contextsRes, eventsRes, evaluationsRes, subjectsRes, sessionsRes] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("nickname, first_name, last_studio_context_id")
          .eq("user_id", currentUser as string)
          .maybeSingle(),
        supabase
          .from("study_contexts")
          .select("id, file_name, cover_image_url, generation_status, processing_status, created_at")
          .eq("user_id", currentUser as string)
          .order("created_at", { ascending: false }),
        supabase
          .from("study_events")
          .select("id, subject, title, event_date, event_time, event_type")
          .eq("user_id", currentUser as string)
          .gte("event_date", today)
          .lte("event_date", horizon)
          .order("event_date", { ascending: true })
          .order("event_time", { ascending: true }),
        supabase
          .from("evaluations")
          .select("id, title, date, subject_id, free_topic_title")
          .eq("user_id", currentUser as string)
          .gte("date", startToday)
          .lt("date", endHorizon)
          .order("date", { ascending: true }),
        supabase
          .from("user_subjects")
          .select("id, name")
          .eq("user_id", currentUser as string),
        supabase
          .from("study_sessions_logs")
          .select("actual_duration, completed_at, event_id")
          .eq("user_id", currentUser as string)
          .gte("completed_at", logsSince)
          .order("completed_at", { ascending: false }),
      ]);

      assertNoError(profileRes.error, "Impossibile caricare il profilo");
      assertNoError(contextsRes.error, "Impossibile caricare i percorsi");
      assertNoError(eventsRes.error, "Impossibile caricare il piano");
      assertNoError(evaluationsRes.error, "Impossibile caricare le verifiche");
      assertNoError(subjectsRes.error, "Impossibile caricare le materie");
      assertNoError(sessionsRes.error, "Impossibile caricare le sessioni");

      const profile = profileRes.data as ProfileRow | null;
      const contexts = (contextsRes.data ?? []) as ContextRow[];
      const events = (eventsRes.data ?? []) as EventRow[];
      const evaluations = (evaluationsRes.data ?? []) as EvaluationRow[];
      const sessions = (sessionsRes.data ?? []) as SessionRow[];
      const subjectNames = new Map((subjectsRes.data ?? []).map((subject) => [subject.id, subject.name]));

      const rememberedContext = contexts.find((context) => context.id === profile?.last_studio_context_id);
      const activeContext = rememberedContext ?? contexts.find((context) => context.generation_status === "completed") ?? contexts[0] ?? null;

      let resumeLesson: HomeResumeLesson | null = null;
      if (activeContext) {
        const [lessonsRes, progressRes] = await Promise.all([
          supabase
            .from("mini_lessons")
            .select("id, title, is_generated, lesson_order, context_id")
            .eq("user_id", currentUser as string)
            .eq("context_id", activeContext.id)
            .order("lesson_order", { ascending: true }),
          supabase
            .from("lesson_progress")
            .select("current_lesson_index")
            .eq("user_id", currentUser as string)
            .eq("context_id", activeContext.id)
            .maybeSingle(),
        ]);
        assertNoError(lessonsRes.error, "Impossibile caricare le lezioni");
        assertNoError(progressRes.error, "Impossibile caricare il progresso");

        const lessons = lessonsRes.data ?? [];
        const storedIndex = Math.max(0, Number(progressRes.data?.current_lesson_index ?? 0));
        const clampedIndex = Math.min(storedIndex, Math.max(0, lessons.length - 1));
        const forwardIndex = lessons.findIndex((lesson, index) => index >= clampedIndex && lesson.is_generated);
        const fallbackIndex = lessons.findIndex((lesson) => lesson.is_generated);
        const lessonIndex = forwardIndex >= 0 ? forwardIndex : fallbackIndex;
        const lesson = lessonIndex >= 0 ? lessons[lessonIndex] : null;

        if (lesson) {
          resumeLesson = {
            contextId: activeContext.id,
            lessonIndex,
            lessonTitle: lesson.title,
            courseTitle: cleanCourseName(activeContext.file_name) || activeContext.file_name,
            coverUrl: activeContext.cover_image_url,
            lessonNumber: lessonIndex + 1,
            lessonCount: lessons.length,
            progressPercent: lessons.length > 0 ? Math.round((clampedIndex / lessons.length) * 100) : 0,
          };
        }
      }

      const sessionsToday = sessions.filter((session) => toLocalDayKey(session.completed_at) === today);
      const completedEventIds = new Set(sessionsToday.map((session) => session.event_id).filter(Boolean));
      const eventTasks: HomeTask[] = events
        .filter((event) => event.event_date === today)
        .map((event) => ({
          id: `event-${event.id}`,
          sourceId: event.id,
          source: "event" as const,
          title: event.title,
          subject: event.subject,
          time: formatEventTime(event.event_time),
          kind: (["study", "test", "assignment"].includes(event.event_type) ? event.event_type : "study") as HomeTask["kind"],
          isCompleted: completedEventIds.has(event.id),
          canStartFocus: event.event_type === "study" && !completedEventIds.has(event.id),
        }));

      const evaluationTasks: HomeTask[] = evaluations
        .filter((evaluation) => daysUntil(evaluation.date, now) === 0)
        .map((evaluation) => ({
          id: `evaluation-${evaluation.id}`,
          sourceId: evaluation.id,
          source: "evaluation" as const,
          title: evaluation.title,
          subject: (evaluation.subject_id && subjectNames.get(evaluation.subject_id)) || evaluation.free_topic_title || "Verifica",
          time: formatEventTime(new Date(evaluation.date).toTimeString()),
          kind: "evaluation" as const,
          isCompleted: false,
          canStartFocus: false,
        }));

      const todayTasks = [...eventTasks, ...evaluationTasks].sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return (a.time ?? "99:99").localeCompare(b.time ?? "99:99");
      });

      const upcomingEvaluation = evaluations
        .map((evaluation) => ({ evaluation, daysAway: daysUntil(evaluation.date, now) }))
        .find(({ daysAway }) => daysAway > 0);

      const displayName = profile?.nickname?.trim()
        || profile?.first_name?.trim()
        || currentEmail?.split("@")[0]
        || "Studente";

      return {
        displayName,
        resumeLesson,
        activeContextId: activeContext?.id ?? null,
        hasContexts: contexts.length > 0,
        isGenerating: contexts.some((context) => context.generation_status === "generating" || context.processing_status === "processing"),
        todayTasks,
        nextEvaluation: upcomingEvaluation
          ? {
              id: upcomingEvaluation.evaluation.id,
              title: upcomingEvaluation.evaluation.title,
              subject: (upcomingEvaluation.evaluation.subject_id && subjectNames.get(upcomingEvaluation.evaluation.subject_id))
                || upcomingEvaluation.evaluation.free_topic_title
                || "Verifica",
              daysAway: upcomingEvaluation.daysAway,
              date: upcomingEvaluation.evaluation.date,
            }
          : null,
        minutesToday: sessionsToday.reduce((total, session) => total + Math.max(0, session.actual_duration || 0), 0),
        sessionsToday: sessionsToday.length,
        completedActivities: completedEventIds.size,
        streakDays: computeStudyStreak(sessions.map((session) => session.completed_at), now),
      };
    },
  });
}
