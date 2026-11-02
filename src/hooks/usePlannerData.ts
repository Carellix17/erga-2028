import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getCompletedLessonOrders } from "@/lib/courseProgress";
import { baseMinutes } from "@/lib/planner/estimate";
import type { PlannerBusyEvent, PlannerRoutine, PlannerSettings } from "@/lib/planner/freeTime";
import type { BuildPlanInput, ContextLessons, EstimateFn, ScheduleEvaluation } from "@/lib/planner/schedule";
import { calculateSpeedFactor, estimateMinutes } from "@/lib/planner/speed";
import { subjectType, type SubjectType } from "@/lib/planner/subjectType";
import type { LessonReadingLogRow, StudyEventRow } from "@/lib/planner/types";
import { useSubscription } from "@/hooks/useSubscription";

interface PlannerLessonMetadata {
  lesson_order: number;
  word_count: number | null;
  exercise_count: number;
}

interface PlannerContextMetadata {
  subject: string | null;
  subject_family: string | null;
  lessons: PlannerLessonMetadata[];
}

interface PlannerSourceData {
  routines: PlannerRoutine[];
  events: StudyEventRow[];
  evaluations: ScheduleEvaluation[];
  lessonsByContext: Record<string, ContextLessons>;
  completedByContext: Record<string, number[]>;
  readingLogs: LessonReadingLogRow[];
  settings: PlannerSettings;
  askBeforeMove: boolean;
  subjectOverrides: Record<string, SubjectType>;
  contextMetadata: Record<string, PlannerContextMetadata>;
}

export interface PlannerInputOptions {
  today?: BuildPlanInput["today"];
  horizonDays?: number;
  evaluations?: readonly ScheduleEvaluation[];
}

export interface PlannerData extends PlannerSourceData {
  buildPlanInput: (options?: PlannerInputOptions) => BuildPlanInput;
}

const SUBJECT_TYPES = new Set<SubjectType>(["scientifico", "lingue", "umanistico", "generale"]);

export const plannerDataKeys = {
  all: (userId: string | null) => ["planner-data", userId] as const,
};

function assertNoError(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

/** Counts words with the same Markdown/math exclusions used by lesson metadata. */
function countWords(value: unknown): number {
  if (typeof value !== "string") return 0;
  const plainText = value
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$\r\n]*\$/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/<https?:\/\/[^>\s]+>/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#*_`]/g, "");
  const trimmed = plainText.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function subjectOverrides(value: unknown): Record<string, SubjectType> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, SubjectType] => SUBJECT_TYPES.has(entry[1] as SubjectType)),
  );
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function loadPlannerData(userId: string): Promise<PlannerSourceData> {
  const [
    routinesRes,
    eventsRes,
    evaluationsRes,
    subjectsRes,
    contextsRes,
    lessonsRes,
    progressRes,
    logsRes,
    settingsRes,
  ] = await Promise.all([
    supabase
      .from("user_routines")
      .select("id, kind, label, start_time, end_time, days_of_week")
      .eq("user_id", userId)
      .order("start_time"),
    supabase
      .from("study_events")
      .select("*")
      .eq("user_id", userId)
      .order("event_date", { ascending: true }),
    supabase
      .from("evaluations")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true }),
    supabase
      .from("user_subjects")
      .select("id, name")
      .eq("user_id", userId),
    supabase
      .from("study_contexts")
      .select("id, subject, subject_family")
      .eq("user_id", userId),
    supabase
      .from("mini_lessons")
      .select("id, context_id, lesson_order, is_generated, concept, explanation, example, exercises")
      .eq("user_id", userId)
      .order("lesson_order", { ascending: true }),
    supabase
      .from("lesson_progress")
      .select("context_id, completed_lessons")
      .eq("user_id", userId),
    supabase
      .from("lesson_reading_logs")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false }),
    supabase
      .from("planner_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  assertNoError(routinesRes.error, "Impossibile caricare le routine");
  assertNoError(eventsRes.error, "Impossibile caricare gli eventi del piano");
  assertNoError(evaluationsRes.error, "Impossibile caricare le verifiche");
  assertNoError(subjectsRes.error, "Impossibile caricare le materie");
  assertNoError(contextsRes.error, "Impossibile caricare i percorsi");
  assertNoError(lessonsRes.error, "Impossibile caricare le lezioni");
  assertNoError(progressRes.error, "Impossibile caricare i progressi delle lezioni");
  assertNoError(logsRes.error, "Impossibile caricare i tempi di studio");
  assertNoError(settingsRes.error, "Impossibile caricare le impostazioni del piano");

  const contextMetadata: Record<string, PlannerContextMetadata> = {};
  for (const context of contextsRes.data ?? []) {
    contextMetadata[context.id] = {
      subject: context.subject,
      subject_family: context.subject_family,
      lessons: [],
    };
  }

  for (const lesson of lessonsRes.data ?? []) {
    if (!lesson.context_id) continue;
    const context = contextMetadata[lesson.context_id];
    if (!context) continue;
    context.lessons.push({
      lesson_order: lesson.lesson_order,
      word_count: lesson.is_generated === false
        ? null
        : countWords(lesson.concept) + countWords(lesson.explanation) + countWords(lesson.example),
      exercise_count: Array.isArray(lesson.exercises) ? lesson.exercises.length : 0,
    });
  }

  const lessonsByContext: Record<string, ContextLessons> = {};
  for (const [contextId, context] of Object.entries(contextMetadata)) {
    lessonsByContext[contextId] = {
      lessons: context.lessons,
      subject: context.subject,
      subject_type: context.subject_family,
    };
  }

  const completedByContext: Record<string, number[]> = {};
  for (const progress of progressRes.data ?? []) {
    if (progress.context_id) completedByContext[progress.context_id] = getCompletedLessonOrders(progress.completed_lessons);
  }

  const subjectNames = new Map((subjectsRes.data ?? []).map((subject) => [subject.id, subject.name]));
  const evaluations = (evaluationsRes.data ?? []).map((evaluation): ScheduleEvaluation => {
    const context = evaluation.topic_id ? contextMetadata[evaluation.topic_id] : undefined;
    return {
      id: evaluation.id,
      date: evaluation.date,
      is_completed: evaluation.is_completed,
      topic_type: evaluation.topic_type === "free" ? "free" : "linked",
      topic_id: evaluation.topic_id,
      subject_id: evaluation.subject_id,
      title: evaluation.title,
      subject: (evaluation.subject_id ? subjectNames.get(evaluation.subject_id) : null)
        ?? context?.subject
        ?? (evaluation.topic_type === "free" ? evaluation.free_topic_title : null),
    };
  });

  const settingsRow = settingsRes.data;
  const settings: PlannerSettings = settingsRow ? {
    lessons_per_block: settingsRow.lessons_per_block,
    short_break_min: settingsRow.short_break_min,
    medium_break_min: settingsRow.medium_break_min,
    long_break_min: settingsRow.long_break_min,
    max_block_min: settingsRow.max_block_min,
    daily_limit_school_min: settingsRow.daily_limit_school_min,
    daily_limit_free_min: settingsRow.daily_limit_free_min,
  } : {};

  return {
    routines: (routinesRes.data ?? []).map((routine) => ({
      id: routine.id,
      kind: routine.kind,
      label: routine.label,
      start_time: routine.start_time,
      end_time: routine.end_time,
      days_of_week: routine.days_of_week ?? [],
    })),
    events: (eventsRes.data ?? []) as StudyEventRow[],
    evaluations,
    lessonsByContext,
    completedByContext,
    readingLogs: (logsRes.data ?? []) as LessonReadingLogRow[],
    settings,
    askBeforeMove: settingsRow?.ask_before_move ?? false,
    subjectOverrides: subjectOverrides(settingsRow?.subject_types),
    contextMetadata,
  };
}

function createEstimateFn(data: PlannerSourceData, isPro: boolean): EstimateFn {
  return (lesson, contextId, evaluation) => {
    const context = data.contextMetadata[contextId];
    const subject = evaluation.subject?.trim() || context?.subject?.trim() || "Materia";
    const type = subjectType(context?.subject_family ?? null, subject, data.subjectOverrides);
    const contextMedianWords = median(
      (context?.lessons ?? [])
        .map((item) => item.word_count)
        .filter((wordCount): wordCount is number => wordCount !== null),
    );
    const base = baseMinutes(lesson.word_count ?? null, lesson.exercise_count ?? null, type, contextMedianWords);
    const factor = calculateSpeedFactor(subject, type, data.readingLogs).factor;
    return estimateMinutes(base.minutes, factor, isPro);
  };
}

export function usePlannerData() {
  const { currentUser } = useAuth();
  const { isPro } = useSubscription();
  const query = useQuery<PlannerSourceData>({
    queryKey: plannerDataKeys.all(currentUser),
    queryFn: async () => {
      if (!currentUser) return emptyPlannerData();
      return loadPlannerData(currentUser);
    },
    enabled: !!currentUser,
    staleTime: 30_000,
    refetchOnMount: "always",
  });

  const data = useMemo<PlannerData | undefined>(() => {
    if (!query.data) return undefined;
    const source = query.data;
    const estimateFn = createEstimateFn(source, isPro);
    return {
      ...source,
      buildPlanInput: (options = {}) => ({
        today: options.today ?? new Date(),
        horizonDays: options.horizonDays ?? 30,
        evaluations: options.evaluations ?? source.evaluations,
        lessonsByContext: source.lessonsByContext,
        completedByContext: source.completedByContext,
        estimateFn,
        routines: source.routines,
        busyEvents: source.events as PlannerBusyEvent[],
        existingSlots: source.events,
        settings: source.settings,
      }),
    };
  }, [isPro, query.data]);

  return { ...query, data };
}

function emptyPlannerData(): PlannerSourceData {
  return {
    routines: [],
    events: [],
    evaluations: [],
    lessonsByContext: {},
    completedByContext: {},
    readingLogs: [],
    settings: {},
    askBeforeMove: false,
    subjectOverrides: {},
    contextMetadata: {},
  };
}
