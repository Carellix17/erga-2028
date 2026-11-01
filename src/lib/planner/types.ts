export type StudyEventStatus = "planned" | "done" | "partial" | "skipped";
export type StudyEventSource = "manual" | "auto" | "replan" | "ai";
export type PlanChangeReason =
  | "skip"
  | "overrun"
  | "faster"
  | "deadline"
  | "routine"
  | "ai"
  | "manual"
  | "generate";

export type PlannerJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: PlannerJson | undefined }
  | PlannerJson[];

export interface StudyEventRow {
  completed_at: string | null;
  context_id: string | null;
  created_at: string;
  end_time: string | null;
  evaluation_id: string | null;
  event_date: string;
  event_time: string | null;
  event_type: string;
  id: string;
  is_completed: boolean;
  lesson_from: number | null;
  lesson_to: number | null;
  locked: boolean;
  move_count: number;
  notes: string | null;
  original_date: string | null;
  original_time: string | null;
  source: StudyEventSource;
  status: StudyEventStatus;
  subject: string;
  title: string;
  updated_at: string;
  user_id: string;
  version: number;
}

export interface StudyEventInsert {
  completed_at?: string | null;
  context_id?: string | null;
  created_at?: string;
  end_time?: string | null;
  evaluation_id?: string | null;
  event_date: string;
  event_time?: string | null;
  event_type: string;
  id?: string;
  is_completed?: boolean;
  lesson_from?: number | null;
  lesson_to?: number | null;
  locked?: boolean;
  move_count?: number;
  notes?: string | null;
  original_date?: string | null;
  original_time?: string | null;
  source?: StudyEventSource;
  status?: StudyEventStatus;
  subject: string;
  title: string;
  updated_at?: string;
  user_id: string;
  version?: number;
}

export type StudyEventUpdate = Partial<StudyEventInsert>;

export interface PlannerSettingsRow {
  ask_before_move: boolean;
  daily_limit_free_min: number;
  daily_limit_school_min: number;
  lessons_per_block: number;
  long_break_min: number;
  max_block_min: number;
  medium_break_min: number;
  notify_types: PlannerJson;
  short_break_min: number;
  sound_enabled: boolean;
  subject_types: PlannerJson;
  updated_at: string;
  user_id: string;
}

export interface PlannerSettingsInsert {
  ask_before_move?: boolean;
  daily_limit_free_min?: number;
  daily_limit_school_min?: number;
  lessons_per_block?: number;
  long_break_min?: number;
  max_block_min?: number;
  medium_break_min?: number;
  notify_types?: PlannerJson;
  short_break_min?: number;
  sound_enabled?: boolean;
  subject_types?: PlannerJson;
  updated_at?: string;
  user_id: string;
}
export type PlannerSettingsUpdate = Partial<PlannerSettingsRow>;

export interface FocusSessionRow {
  block_index: number;
  device_id: string | null;
  end_reason: string | null;
  ended_at: string | null;
  id: string;
  paused_at: string | null;
  pauses: PlannerJson;
  phase: string;
  phase_ends_at: string | null;
  slot_id: string | null;
  started_at: string;
  updated_at: string;
  user_id: string;
  version: number;
}

export interface FocusSessionInsert {
  block_index?: number;
  device_id?: string | null;
  end_reason?: string | null;
  ended_at?: string | null;
  id?: string;
  paused_at?: string | null;
  pauses?: PlannerJson;
  phase?: string;
  phase_ends_at?: string | null;
  slot_id?: string | null;
  started_at?: string;
  updated_at?: string;
  user_id: string;
  version?: number;
}

export type FocusSessionUpdate = Partial<FocusSessionInsert>;

export interface LessonReadingLogRow {
  active_seconds: number;
  base_estimate_min: number;
  completed_at: string;
  context_id: string | null;
  exercise_count: number;
  id: string;
  lesson_order: number;
  slot_id: string | null;
  subject: string | null;
  subject_type: string | null;
  user_id: string;
  word_count: number;
}

export interface LessonReadingLogInsert {
  active_seconds: number;
  base_estimate_min: number;
  completed_at?: string;
  context_id?: string | null;
  exercise_count?: number;
  id?: string;
  lesson_order: number;
  slot_id?: string | null;
  subject?: string | null;
  subject_type?: string | null;
  user_id: string;
  word_count: number;
}

export type LessonReadingLogUpdate = Partial<LessonReadingLogInsert>;

export interface PlanChangeRow {
  applied_at: string | null;
  changes: PlannerJson;
  created_at: string;
  id: string;
  reason: string;
  status: string;
  undone_at: string | null;
  user_id: string;
}

export interface PlanChangeInsert {
  applied_at?: string | null;
  changes: PlannerJson;
  created_at?: string;
  id?: string;
  reason: string;
  status?: string;
  undone_at?: string | null;
  user_id: string;
}

export type PlanChangeUpdate = Partial<PlanChangeInsert>;

export interface ScheduledPushRow {
  body: string;
  cancelled_at: string | null;
  created_at: string;
  focus_session_id: string | null;
  id: string;
  kind: string;
  send_at: string;
  sent_at: string | null;
  skip_reason: string | null;
  tag: string | null;
  title: string;
  url: string;
  user_id: string;
}

export interface ScheduledPushInsert {
  body: string;
  cancelled_at?: string | null;
  created_at?: string;
  focus_session_id?: string | null;
  id?: string;
  kind: string;
  send_at: string;
  sent_at?: string | null;
  skip_reason?: string | null;
  tag?: string | null;
  title: string;
  url?: string;
  user_id: string;
}

export type ScheduledPushUpdate = Partial<ScheduledPushInsert>;

export type PlannerTable<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
};

/** Manual planner-facing schema for the tables introduced with the planner migration. */
export interface PlannerSchema {
  study_events: PlannerTable<StudyEventRow, StudyEventInsert, StudyEventUpdate>;
  planner_settings: PlannerTable<PlannerSettingsRow, PlannerSettingsInsert, PlannerSettingsUpdate>;
  focus_sessions: PlannerTable<FocusSessionRow, FocusSessionInsert, FocusSessionUpdate>;
  lesson_reading_logs: PlannerTable<LessonReadingLogRow, LessonReadingLogInsert, LessonReadingLogUpdate>;
  plan_changes: PlannerTable<PlanChangeRow, PlanChangeInsert, PlanChangeUpdate>;
  scheduled_pushes: PlannerTable<ScheduledPushRow, ScheduledPushInsert, ScheduledPushUpdate>;
}

export type PlanChangeEventValues = Partial<Pick<StudyEventRow,
  | "context_id"
  | "end_time"
  | "event_date"
  | "event_time"
  | "evaluation_id"
  | "lesson_from"
  | "lesson_to"
  | "move_count"
  | "original_date"
  | "original_time"
  | "source"
  | "status"
  | "subject"
  | "title"
>>;

export type PlanChangeSnapshot = Partial<Pick<StudyEventRow,
  | "completed_at"
  | "context_id"
  | "end_time"
  | "event_date"
  | "event_time"
  | "event_type"
  | "evaluation_id"
  | "id"
  | "is_completed"
  | "lesson_from"
  | "lesson_to"
  | "locked"
  | "move_count"
  | "notes"
  | "original_date"
  | "original_time"
  | "source"
  | "status"
  | "subject"
  | "title"
  | "version"
>>;

export type PlanChange =
  | {
      op: "insert";
      after: PlanChangeEventValues & Pick<StudyEventRow, "event_date" | "subject" | "title">;
      before?: PlanChangeSnapshot;
    }
  | {
      op: "update";
      event_id: string;
      version: number;
      after: PlanChangeEventValues;
      before?: PlanChangeSnapshot;
    }
  | {
      op: "delete";
      event_id: string;
      version: number;
      before?: PlanChangeSnapshot;
    };
