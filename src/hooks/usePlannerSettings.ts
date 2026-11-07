import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { SubjectType } from "@/lib/planner/subjectType";
import { useSubscription } from "@/hooks/useSubscription";

export interface PlannerSettings {
  user_id: string;
  lessons_per_block: number;
  short_break_min: number;
  medium_break_min: number;
  long_break_min: number;
  max_block_min: number;
  daily_limit_school_min: number;
  daily_limit_free_min: number;
  ask_before_move: boolean;
  sound_enabled: boolean;
  notify_types: Record<string, Json | undefined>;
  subject_types: Record<string, SubjectType>;
}

export type PlannerSettingsPatch = Partial<Omit<PlannerSettings, "user_id">>;

const DEFAULT_NOTIFY_TYPES: Record<string, Json | undefined> = {
  slot_start: true,
  pomodoro: true,
  overrun: true,
  evening_summary: true,
  hide_subject: false,
};

const DEFAULT_SETTINGS = {
  lessons_per_block: 3,
  short_break_min: 5,
  medium_break_min: 10,
  long_break_min: 20,
  max_block_min: 50,
  daily_limit_school_min: 180,
  daily_limit_free_min: 300,
  ask_before_move: false,
  sound_enabled: true,
  notify_types: DEFAULT_NOTIFY_TYPES,
  subject_types: {} as Record<string, SubjectType>,
};

const PRO_ONLY_KEYS = [
  "lessons_per_block",
  "short_break_min",
  "medium_break_min",
  "long_break_min",
] as const satisfies readonly (keyof PlannerSettingsPatch)[];

const VALID_SUBJECT_TYPES = new Set<SubjectType>([
  "scientifico",
  "lingue",
  "umanistico",
  "generale",
]);

export const plannerSettingsKey = (userId: string | null) => ["planner_settings", userId] as const;

function jsonObject(value: Json | undefined): Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, Json | undefined>
    : {};
}

function normalizeSubjectTypes(value: Json | undefined): Record<string, SubjectType> {
  return Object.fromEntries(
    Object.entries(jsonObject(value)).filter((entry): entry is [string, SubjectType] =>
      typeof entry[1] === "string" && VALID_SUBJECT_TYPES.has(entry[1] as SubjectType),
    ),
  );
}

function normalizeSettings(
  row: Awaited<ReturnType<typeof readPlannerSettings>>,
  userId: string,
): PlannerSettings {
  return {
    user_id: userId,
    lessons_per_block: row?.lessons_per_block ?? DEFAULT_SETTINGS.lessons_per_block,
    short_break_min: row?.short_break_min ?? DEFAULT_SETTINGS.short_break_min,
    medium_break_min: row?.medium_break_min ?? DEFAULT_SETTINGS.medium_break_min,
    long_break_min: row?.long_break_min ?? DEFAULT_SETTINGS.long_break_min,
    max_block_min: row?.max_block_min ?? DEFAULT_SETTINGS.max_block_min,
    daily_limit_school_min: row?.daily_limit_school_min ?? DEFAULT_SETTINGS.daily_limit_school_min,
    daily_limit_free_min: row?.daily_limit_free_min ?? DEFAULT_SETTINGS.daily_limit_free_min,
    ask_before_move: row?.ask_before_move ?? DEFAULT_SETTINGS.ask_before_move,
    sound_enabled: row?.sound_enabled ?? DEFAULT_SETTINGS.sound_enabled,
    notify_types: {
      ...DEFAULT_SETTINGS.notify_types,
      ...jsonObject(row?.notify_types),
    },
    subject_types: normalizeSubjectTypes(row?.subject_types),
  };
}

async function readPlannerSettings(userId: string) {
  const { data, error } = await supabase
    .from("planner_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function hasProOnlySettings(patch: PlannerSettingsPatch): boolean {
  return PRO_ONLY_KEYS.some((key) => patch[key] !== undefined);
}

export function usePlannerSettings() {
  const { currentUser } = useAuth();
  const { isPro } = useSubscription();
  const queryClient = useQueryClient();
  const queryKey = plannerSettingsKey(currentUser);

  const query = useQuery({
    queryKey,
    queryFn: async () => normalizeSettings(await readPlannerSettings(currentUser!), currentUser!),
    enabled: Boolean(currentUser),
  });

  const mutation = useMutation({
    mutationFn: async (patch: PlannerSettingsPatch): Promise<PlannerSettings> => {
      if (!currentUser) throw new Error("Not authenticated");
      if (!isPro && hasProOnlySettings(patch)) {
        throw new Error("Pro plan required to change block and break settings");
      }

      // Keep the upsert sparse: a Free user's save must not write Pro-only
      // columns, and unrelated settings must survive this surface's changes.
      const latest = normalizeSettings(await readPlannerSettings(currentUser), currentUser);
      const notifyTypes = patch.notify_types === undefined
        ? latest.notify_types
        : { ...latest.notify_types, ...patch.notify_types };
      const subjectTypes = patch.subject_types === undefined
        ? latest.subject_types
        : { ...latest.subject_types, ...patch.subject_types };
      const payload = {
        user_id: currentUser,
        ...patch,
        ...(patch.notify_types === undefined ? {} : { notify_types: notifyTypes }),
        ...(patch.subject_types === undefined ? {} : { subject_types: subjectTypes }),
      };
      const { error } = await supabase
        .from("planner_settings")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      return {
        ...latest,
        ...patch,
        user_id: currentUser,
        notify_types: notifyTypes,
        subject_types: subjectTypes,
      };
    },
    onSuccess: async (settings) => {
      queryClient.setQueryData(queryKey, settings);
      await queryClient.invalidateQueries({ queryKey: ["planner-data", currentUser] });
    },
  });

  const settings = useMemo(
    () => query.data ?? { user_id: currentUser ?? "", ...DEFAULT_SETTINGS },
    [currentUser, query.data],
  );

  return {
    ...query,
    settings,
    isPro,
    saveSettings: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
