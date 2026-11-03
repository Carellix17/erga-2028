import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { FocusSetupDialog } from "@/components/focus/FocusSetupDialog";
import { FocusFullscreen } from "@/components/focus/FocusFullscreen";
import { triggerHaptic } from "@/utils/haptics";
import { playFocusSound, unlockFocusSound } from "@/lib/focusSound";
import {
  fromStoredPhase,
  nextPhase as advancePhase,
  overrun as getOverrun,
  pause as pauseClock,
  remaining as getRemaining,
  resume as resumeClock,
  start as startClock,
  toStoredPhase,
  type FocusEndReason,
  type FocusPhase,
  type PauseInterval,
} from "@/lib/focusClock";
import type { FocusSessionRow } from "@/lib/planner/types";

export type { FocusEndReason, FocusPhase } from "@/lib/focusClock";

export const FOCUS_STORAGE_KEY = "erga:focus";

export interface FocusTask {
  label: string;
  subject?: string;
  eventId?: string;
  subjectId?: string;
  estimatedDuration?: number;
  sourceType?: "planned" | "adhoc";
  durationMinutes?: number;
  lessonFrom?: number | null;
  lessonTo?: number | null;
  /** A standalone break timer must not be recorded as a study session. */
  isBreak?: boolean;
}

export interface FocusEndedSession {
  sessionKey: string;
  task: FocusTask;
  reason: FocusEndReason;
  endedAt: number;
  startedAt: number;
  focusSeconds: number;
  focusDurationSeconds: number;
  phase: FocusPhase;
}

export interface FocusSettings {
  shortBreakMinutes: number;
  mediumBreakMinutes: number;
  longBreakMinutes: number;
  soundEnabled: boolean;
}

interface ActiveFocusSession {
  id: string | null;
  userId: string;
  slotId: string | null;
  task: FocusTask;
  phase: FocusPhase;
  cycle: number;
  startedAt: number;
  phaseEndsAt: number;
  pausedAt: number | null;
  pauses: PauseInterval[];
  version: number;
  focusDurationSeconds: number;
  phaseDurationSeconds: number;
  focusSeconds: number;
  lastAccrualAt: number;
}

interface FocusContextValue {
  isActive: boolean;
  isFullscreen: boolean;
  isRunning: boolean;
  isSyncing: boolean;
  phase: FocusPhase;
  cycle: number;
  remaining: number;
  overrun: number;
  phaseDurationSeconds: number;
  task: FocusTask | null;
  sessionKey: string | null;
  lastEndedSession: FocusEndedSession | null;
  awaitingChoice: boolean;
  announcement: string;
  acknowledgeEndedSession: (sessionKey: string) => void;
  openSetup: () => void;
  openFullscreen: () => void;
  minimize: () => void;
  toggleRun: () => void;
  restart: () => void;
  end: () => void;
  endWithReason: (reason: FocusEndReason) => void;
  startSession: (task: FocusTask, customDurationMinutes?: number) => void;
  startPause: () => void;
  extend: () => void;
  extendByMinutes: (minutes: number) => void;
  addFiveMinutes: () => void;
  nextPhase: () => void;
}

const DEFAULT_BREAKS = {
  shortBreakMinutes: 5,
  mediumBreakMinutes: 10,
  longBreakMinutes: 20,
  soundEnabled: true,
} satisfies FocusSettings;

const DURATIONS: Record<FocusPhase, number> = {
  focus: 25 * 60,
  short: DEFAULT_BREAKS.shortBreakMinutes * 60,
  long: DEFAULT_BREAKS.longBreakMinutes * 60,
};
const AUTO_PAUSE_AFTER_SECONDS = 30 * 60;

function accrueFocusSession(
  session: ActiveFocusSession | null,
  timestamp: number,
): ActiveFocusSession | null {
  if (!session || session.pausedAt != null || session.phase !== "focus") return session;
  const accrualEndsAt = Math.min(timestamp, session.phaseEndsAt + AUTO_PAUSE_AFTER_SECONDS * 1000);
  const wholeSeconds = Math.floor(Math.max(0, accrualEndsAt - session.lastAccrualAt) / 1000);
  if (wholeSeconds <= 0) return session;
  return {
    ...session,
    focusSeconds: session.focusSeconds + wholeSeconds,
    lastAccrualAt: session.lastAccrualAt + wholeSeconds * 1000,
  };
}

const FocusContext = createContext<FocusContextValue | null>(null);

type PersistedFocusSession = ActiveFocusSession;

interface StoredSessionRow extends FocusSessionRow {
  phase: string;
}

function isoAt(value: number): string {
  return new Date(value).toISOString();
}

function milliseconds(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validPhase(value: unknown): value is FocusPhase {
  return value === "focus" || value === "short" || value === "long";
}

function parsePauseIntervals(value: unknown): PauseInterval[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PauseInterval =>
    !!item
    && typeof item === "object"
    && typeof (item as PauseInterval).from === "string"
    && typeof (item as PauseInterval).to === "string",
  );
}

function readStoredSession(): PersistedFocusSession | null {
  try {
    const raw = window.localStorage.getItem(FOCUS_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PersistedFocusSession>;
    if (
      !value
      || typeof value.userId !== "string"
      || typeof value.task?.label !== "string"
      || !validPhase(value.phase)
      || !Number.isFinite(value.phaseEndsAt)
      || !Number.isFinite(value.startedAt)
      || !Number.isFinite(value.focusDurationSeconds)
    ) return null;

    return {
      id: typeof value.id === "string" ? value.id : null,
      userId: value.userId,
      slotId: typeof value.slotId === "string" ? value.slotId : null,
      task: value.task,
      phase: value.phase,
      cycle: Number.isInteger(value.cycle) && (value.cycle as number) >= 0 ? value.cycle as number : 0,
      startedAt: value.startedAt as number,
      phaseEndsAt: value.phaseEndsAt as number,
      pausedAt: Number.isFinite(value.pausedAt) ? value.pausedAt as number : null,
      pauses: parsePauseIntervals(value.pauses),
      version: Number.isInteger(value.version) && (value.version as number) >= 0 ? value.version as number : 0,
      focusDurationSeconds: value.focusDurationSeconds as number,
      phaseDurationSeconds: Number.isFinite(value.phaseDurationSeconds)
        ? value.phaseDurationSeconds as number
        : DURATIONS[value.phase],
      focusSeconds: Number.isFinite(value.focusSeconds) ? Math.max(0, value.focusSeconds as number) : 0,
      lastAccrualAt: Number.isFinite(value.lastAccrualAt) ? value.lastAccrualAt as number : Date.now(),
    };
  } catch {
    return null;
  }
}

function writeStoredSession(session: ActiveFocusSession): void {
  try {
    // Timer metadata only. Authentication tokens never enter this key.
    window.localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The absolute database deadline remains authoritative if storage is unavailable.
  }
}

function clearStoredSession(): void {
  try {
    window.localStorage.removeItem(FOCUS_STORAGE_KEY);
  } catch {
    // Storage can be disabled by the browser; the in-memory timer still works.
  }
}

function focusSettingsFromRow(row: {
  short_break_min: number;
  medium_break_min: number;
  long_break_min: number;
  sound_enabled: boolean;
} | null): FocusSettings {
  if (!row) return DEFAULT_BREAKS;
  const duration = (value: number, fallback: number) =>
    Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
  return {
    shortBreakMinutes: duration(row.short_break_min, DEFAULT_BREAKS.shortBreakMinutes),
    mediumBreakMinutes: duration(row.medium_break_min, DEFAULT_BREAKS.mediumBreakMinutes),
    longBreakMinutes: duration(row.long_break_min, DEFAULT_BREAKS.longBreakMinutes),
    soundEnabled: typeof row.sound_enabled === "boolean" ? row.sound_enabled : DEFAULT_BREAKS.soundEnabled,
  };
}

function settingsForClock(settings: FocusSettings) {
  return {
    short: settings.shortBreakMinutes,
    medium: settings.mediumBreakMinutes,
    long: settings.longBreakMinutes,
  };
}

async function fetchActiveRow(userId: string): Promise<{ row: StoredSessionRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from("focus_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { row: (data as StoredSessionRow | null) ?? null, error };
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [setupOpen, setSetupOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveFocusSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [focusSettings, setFocusSettings] = useState<FocusSettings>(DEFAULT_BREAKS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [lastEndedSession, setLastEndedSession] = useState<FocusEndedSession | null>(null);
  const activeSessionRef = useRef<ActiveFocusSession | null>(null);
  const userIdRef = useRef(userId);
  const focusSettingsRef = useRef(focusSettings);
  const syncingRef = useRef(false);
  const pendingStartRef = useRef<{ task: FocusTask; duration?: number; phase?: FocusPhase } | null>(null);
  const autoPausedSessionRef = useRef<string | null>(null);
  const clockBaselineRef = useRef<{
    sessionId: string | null;
    phaseEndsAt: number;
    remaining: number;
    overrun: number;
  } | null>(null);
  const allowSoundForClockUpdateRef = useRef(true);

  userIdRef.current = userId;
  focusSettingsRef.current = focusSettings;

  const setSyncing = useCallback((next: boolean) => {
    syncingRef.current = next;
    setIsSyncing(next);
  }, []);

  const installSession = useCallback((next: ActiveFocusSession | null, clearStorage = true) => {
    activeSessionRef.current = next;
    setActiveSession(next);
    if (next) writeStoredSession(next);
    else if (clearStorage) clearStoredSession();
  }, []);

  const publishAnnouncement = useCallback((message: string) => {
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 0);
  }, []);

  const taskForRow = useCallback(async (
    row: StoredSessionRow,
    uid: string,
    preferred?: ActiveFocusSession | null,
  ): Promise<FocusTask> => {
    const saved = readStoredSession();
    if (saved?.id === row.id && saved.userId === uid) return saved.task;
    if (
      preferred?.userId === uid
      && (preferred.id === row.id || (preferred.id == null && preferred.slotId === row.slot_id))
    ) return preferred.task;

    if (row.slot_id) {
      const { data } = await supabase
        .from("study_events")
        .select("id, title, subject, lesson_from, lesson_to")
        .eq("id", row.slot_id)
        .eq("user_id", uid)
        .maybeSingle();
      if (data) {
        return {
          label: data.title,
          subject: data.subject,
          eventId: data.id,
          sourceType: "planned",
          lessonFrom: data.lesson_from,
          lessonTo: data.lesson_to,
        };
      }
    }

    const isStandaloneBreak = !row.slot_id
      && row.block_index === 0
      && fromStoredPhase(row.phase) !== "focus";
    return {
      label: isStandaloneBreak ? t("focusTimer.pauseTask") : row.slot_id ? "Sessione di studio" : "Studio libero",
      eventId: row.slot_id ?? undefined,
      sourceType: row.slot_id ? "planned" : "adhoc",
      ...(isStandaloneBreak ? { isBreak: true } : {}),
    };
  }, [t]);

  const sessionFromRow = useCallback(async (
    row: StoredSessionRow,
    uid: string,
    preferred?: ActiveFocusSession | null,
  ): Promise<ActiveFocusSession> => {
    const currentTime = Date.now();
    const saved = readStoredSession();
    const matchingSaved = saved?.id === row.id && saved.userId === uid ? saved : null;
    const matchingPreferred = preferred?.userId === uid
      && (preferred.id === row.id || (preferred.id == null && preferred.slotId === row.slot_id))
      ? preferred
      : null;
    const retainedSession = matchingSaved ?? matchingPreferred;
    const phase = fromStoredPhase(row.phase) ?? "focus";
    const phaseEndsAt = milliseconds(row.phase_ends_at) ?? currentTime;
    const pausedAt = milliseconds(row.paused_at);
    const task = await taskForRow(row, uid, retainedSession);
    const focusDurationSeconds = retainedSession?.focusDurationSeconds ?? DURATIONS.focus;
    const configuredPhaseDuration = phase === "focus"
      ? focusDurationSeconds
      : phase === "long"
        ? focusSettingsRef.current.longBreakMinutes * 60
        : (row.block_index % 4 === 2
          ? focusSettingsRef.current.mediumBreakMinutes
          : focusSettingsRef.current.shortBreakMinutes) * 60;
    const phaseDurationSeconds = retainedSession?.phase === phase
      ? retainedSession.phaseDurationSeconds
      : configuredPhaseDuration;
    const remainingSeconds = getRemaining(currentTime, phaseEndsAt, pausedAt);
    const focusSeconds = retainedSession?.focusSeconds
      ?? row.block_index * focusDurationSeconds
        + (phase === "focus"
          ? Math.max(0, phaseDurationSeconds - remainingSeconds)
            + getOverrun(currentTime, phaseEndsAt, pausedAt)
          : 0);

    return {
      id: row.id,
      userId: uid,
      slotId: row.slot_id,
      task,
      phase,
      cycle: row.block_index,
      startedAt: milliseconds(row.started_at) ?? currentTime,
      phaseEndsAt,
      pausedAt,
      pauses: parsePauseIntervals(row.pauses),
      version: row.version,
      focusDurationSeconds,
      phaseDurationSeconds,
      focusSeconds,
      lastAccrualAt: retainedSession?.lastAccrualAt ?? currentTime,
    };
  }, [taskForRow]);

  const reconcileFromDatabase = useCallback(async (
    uid: string,
    preferred?: ActiveFocusSession | null,
  ): Promise<boolean> => {
    const { row, error } = await fetchActiveRow(uid);
    if (error) return false;
    if (!row) {
      installSession(null);
      return true;
    }
    const local = activeSessionRef.current;
    const restored = await sessionFromRow(row, uid, preferred ?? local);
    installSession(restored);
    setNow(Date.now());
    return true;
  }, [installSession, sessionFromRow]);

  const enrichTask = useCallback(async (task: FocusTask, uid: string): Promise<FocusTask> => {
    if (!task.eventId) return task;
    const { data } = await supabase
      .from("study_events")
      .select("id, title, subject, lesson_from, lesson_to")
      .eq("id", task.eventId)
      .eq("user_id", uid)
      .maybeSingle();
    if (!data) return task;
    return {
      ...task,
      label: task.label || data.title,
      subject: task.subject || data.subject,
      eventId: data.id,
      sourceType: "planned",
      lessonFrom: data.lesson_from,
      lessonTo: data.lesson_to,
    };
  }, []);

  const persistNewSession = useCallback(async (
    current: ActiveFocusSession,
    uid: string,
  ) => {
    setSyncing(true);
    try {
      const task = await enrichTask(current.task, uid);
      const { data, error } = await supabase
        .from("focus_sessions")
        .insert({
          user_id: uid,
          slot_id: current.slotId,
          device_id: null,
          started_at: isoAt(current.startedAt),
          phase: toStoredPhase(current.phase),
          block_index: current.cycle,
          phase_ends_at: isoAt(current.phaseEndsAt),
          paused_at: current.pausedAt == null ? null : isoAt(current.pausedAt),
          pauses: current.pauses.map(({ from, to }) => ({ from, to })),
          ended_at: null,
          end_reason: null,
          version: 0,
          updated_at: isoAt(Date.now()),
        })
        .select("*")
        .single();

      if (error || !data) {
        if (error?.code === "23505") {
          const { row, error: readError } = await fetchActiveRow(uid);
          if (!readError && row) {
            const existing = await sessionFromRow(row, uid);
            installSession(existing);
            setFullscreen(true);
            toast.info(t("focusTimer.existingSession"));
            return;
          }
        }
        const latest = activeSessionRef.current?.userId === uid && activeSessionRef.current.id == null
          ? activeSessionRef.current
          : current;
        installSession({ ...latest, task });
        toast.error(t("focusTimer.syncError"));
        return;
      }

      const latest = activeSessionRef.current?.userId === uid && activeSessionRef.current.id == null
        ? activeSessionRef.current
        : current;
      const saved = await sessionFromRow(data as StoredSessionRow, uid, { ...latest, task });
      installSession({
        ...saved,
        task,
        focusSeconds: latest.focusSeconds,
        lastAccrualAt: latest.lastAccrualAt,
        focusDurationSeconds: latest.focusDurationSeconds,
        phaseDurationSeconds: latest.phaseDurationSeconds,
      });
    } catch (error) {
      console.error("Failed to save focus timer:", error);
      const latest = activeSessionRef.current?.userId === uid && activeSessionRef.current.id == null
        ? activeSessionRef.current
        : current;
      installSession(latest);
      toast.error(t("focusTimer.syncError"));
    } finally {
      setSyncing(false);
    }
  }, [enrichTask, installSession, sessionFromRow, setSyncing, t]);

  const beginSession = useCallback((
    task: FocusTask,
    customDurationMinutes?: number,
    initialPhase: FocusPhase = "focus",
  ) => {
    const uid = userIdRef.current;
    if (!uid || activeSessionRef.current) return;
    const requestedDurationMinutes = customDurationMinutes
      ?? task.durationMinutes
      ?? (task.estimatedDuration ? Math.round(task.estimatedDuration) : 25);
    const focusTestMode = typeof window !== "undefined"
      && new URLSearchParams(window.location.search).get("focusTest") === "1";
    const durationMinutes = focusTestMode ? 1 : requestedDurationMinutes;
    const durationSeconds = Math.max(1, Math.floor(durationMinutes)) * 60;
    const nowValue = Date.now();
    const initialClock = startClock(nowValue, durationSeconds);
    const current: ActiveFocusSession = {
      id: null,
      userId: uid,
      slotId: task.eventId ?? null,
      task: {
        sourceType: task.eventId ? "planned" : "adhoc",
        durationMinutes,
        ...task,
      },
      phase: initialPhase,
      cycle: 0,
      startedAt: nowValue,
      phaseEndsAt: initialClock.phaseEndsAt,
      pausedAt: null,
      pauses: [],
      version: 0,
      focusDurationSeconds: initialPhase === "focus" ? initialClock.phaseDurationSeconds : DURATIONS.focus,
      phaseDurationSeconds: initialClock.phaseDurationSeconds,
      focusSeconds: 0,
      lastAccrualAt: nowValue,
    };
    autoPausedSessionRef.current = null;
    clockBaselineRef.current = null;
    installSession(current);
    setNow(nowValue);
    setSetupOpen(false);
    setFullscreen(true);
    void persistNewSession(current, uid);
  }, [installSession, persistNewSession]);

  const startSession = useCallback((task: FocusTask, customDurationMinutes?: number) => {
    // AudioContext creation/resume must happen synchronously inside the user's start gesture.
    unlockFocusSound();
    const uid = userIdRef.current;
    if (!uid) return;
    if (syncingRef.current) {
      pendingStartRef.current = { task, duration: customDurationMinutes };
      return;
    }
    if (activeSessionRef.current) {
      setFullscreen(true);
      return;
    }
    beginSession(task, customDurationMinutes);
  }, [beginSession]);

  const startPause = useCallback(() => {
    // Keep the same synchronous sound unlock contract as an ordinary start gesture.
    unlockFocusSound();
    const uid = userIdRef.current;
    if (!uid) return;
    const task: FocusTask = {
      label: t("focusTimer.pauseTask"),
      sourceType: "adhoc",
      durationMinutes: 5,
      isBreak: true,
    };
    if (syncingRef.current) {
      pendingStartRef.current = { task, duration: 5, phase: "short" };
      return;
    }
    if (activeSessionRef.current) {
      setFullscreen(true);
      return;
    }
    beginSession(task, 5, "short");
  }, [beginSession, t]);

  const acknowledgeEndedSession = useCallback((sessionKey: string) => {
    setLastEndedSession((current) => current?.sessionKey === sessionKey ? null : current);
  }, []);

  useEffect(() => {
    if (!userId) {
      activeSessionRef.current = null;
      setActiveSession(null);
      setLastEndedSession(null);
      pendingStartRef.current = null;
      setSyncing(false);
      return;
    }

    let alive = true;
    setSyncing(true);
    const saved = readStoredSession();
    if (saved?.userId === userId) installSession(saved);
    else {
      if (saved) clearStoredSession();
      installSession(null, false);
    }

    void (async () => {
      const { row, error } = await fetchActiveRow(userId);
      if (!alive) return;
      if (error) {
        if (!saved || saved.userId !== userId) toast.error(t("focusTimer.restoreError"));
        return;
      }
      if (!row) {
        installSession(null);
        return;
      }
      const restored = await sessionFromRow(row, userId, saved?.userId === userId ? saved : null);
      if (!alive) return;
      installSession(restored);
      setNow(Date.now());
    })().catch((error: unknown) => {
      console.error("Failed to restore focus timer:", error);
      if (alive) toast.error(t("focusTimer.restoreError"));
    }).finally(() => {
      if (!alive) return;
      setSyncing(false);
      const pendingStart = pendingStartRef.current;
      pendingStartRef.current = null;
      if (pendingStart && !activeSessionRef.current) {
        beginSession(pendingStart.task, pendingStart.duration, pendingStart.phase);
      } else if (pendingStart && activeSessionRef.current) {
        setFullscreen(true);
      }
    });

    return () => { alive = false; };
  }, [beginSession, installSession, sessionFromRow, setSyncing, t, userId]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setFocusSettings(DEFAULT_BREAKS);
    void supabase
      .from("planner_settings")
      .select("short_break_min, medium_break_min, long_break_min, sound_enabled")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive || error) return;
        const next = focusSettingsFromRow(data);
        focusSettingsRef.current = next;
        setFocusSettings(next);
      });
    return () => { alive = false; };
  }, [userId]);

  const refreshOnVisibility = useCallback(() => {
    const timestamp = Date.now();
    const current = activeSessionRef.current;
    const elapsed = accrueFocusSession(current, timestamp);
    if (elapsed && elapsed !== current) {
      activeSessionRef.current = elapsed;
      writeStoredSession(elapsed);
    }
    allowSoundForClockUpdateRef.current = false;
    setNow(timestamp);
    if (document.visibilityState === "visible" && userIdRef.current && !syncingRef.current) {
      void reconcileFromDatabase(userIdRef.current);
    }
  }, [reconcileFromDatabase]);

  useEffect(() => {
    document.addEventListener("visibilitychange", refreshOnVisibility);
    return () => document.removeEventListener("visibilitychange", refreshOnVisibility);
  }, [refreshOnVisibility]);

  const accrueFocusTime = useCallback((timestamp: number) => {
    const current = activeSessionRef.current;
    const next = accrueFocusSession(current, timestamp);
    if (next && next !== current) {
      activeSessionRef.current = next;
      writeStoredSession(next);
    }
    return next;
  }, []);

  const endWithReason = useCallback(async (reason: FocusEndReason) => {
    const current = activeSessionRef.current;
    const uid = userIdRef.current;
    if (!current || syncingRef.current) return;
    setSyncing(true);
    const endedAt = Date.now();
    const accrued = accrueFocusTime(endedAt) ?? current;
    const pauses = accrued.pausedAt == null
      ? accrued.pauses
      : [
          ...accrued.pauses,
          { from: isoAt(accrued.pausedAt), to: isoAt(endedAt) },
        ];
    const finalSession = { ...accrued, pauses };

    try {
      if (finalSession.id && uid) {
        const { data, error } = await supabase
          .from("focus_sessions")
          .update({
            ended_at: isoAt(endedAt),
            end_reason: reason,
            paused_at: null,
            pauses: pauses.map(({ from, to }) => ({ from, to })),
            updated_at: isoAt(endedAt),
            version: finalSession.version + 1,
          })
          .eq("id", finalSession.id)
          .eq("user_id", uid)
          .eq("version", finalSession.version)
          .select("*")
          .maybeSingle();
        if (error || !data) {
          if (reason === "auto_paused") autoPausedSessionRef.current = null;
          const reconciled = await reconcileFromDatabase(uid, finalSession);
          if (!reconciled) toast.error(t("focusTimer.syncError"));
          return;
        }
      }

      setLastEndedSession({
        sessionKey: String(finalSession.startedAt),
        task: finalSession.task,
        reason,
        endedAt,
        startedAt: finalSession.startedAt,
        focusSeconds: finalSession.focusSeconds,
        focusDurationSeconds: finalSession.focusDurationSeconds,
        phase: finalSession.phase,
      });
      installSession(null);
      setFullscreen(false);
      setSetupOpen(false);
      autoPausedSessionRef.current = null;
      clockBaselineRef.current = null;
      if (reason === "auto_paused") toast.info(t("focusTimer.autoPaused"), { duration: 10_000 });

      const actualMinutes = Math.max(1, Math.round(finalSession.focusSeconds / 60));
      const currentTask = finalSession.task;
      if (currentTask && !currentTask.isBreak && uid && actualMinutes > 0) {
        try {
          const { error } = await supabase.from("study_sessions_logs").insert({
            user_id: uid,
            subject_id: currentTask.subjectId ?? null,
            subject_name: currentTask.subject ?? null,
            task_label: currentTask.label,
            event_id: currentTask.eventId ?? null,
            source_type: currentTask.sourceType ?? (currentTask.eventId ? "planned" : "adhoc"),
            estimated_duration: currentTask.estimatedDuration ?? null,
            actual_duration: actualMinutes,
          });
          if (error) throw error;
          await queryClient.invalidateQueries({ queryKey: ["home-dashboard", uid] });
          toast.success(t("focusTimer.logged"));
        } catch (error) {
          console.error("Failed to log study session:", error);
          toast.error(t("focusTimer.logError"));
        }
      }
    } catch (error) {
      console.error("Failed to end focus timer:", error);
      if (reason === "auto_paused") autoPausedSessionRef.current = null;
      if (uid) await reconcileFromDatabase(uid, finalSession);
      toast.error(t("focusTimer.syncError"));
    } finally {
      setSyncing(false);
      const pendingStart = pendingStartRef.current;
      if (pendingStart) {
        pendingStartRef.current = null;
        if (reason !== "auto_paused") {
          if (!activeSessionRef.current) beginSession(pendingStart.task, pendingStart.duration, pendingStart.phase);
          else setFullscreen(true);
        }
      }
    }
  }, [accrueFocusTime, beginSession, installSession, queryClient, reconcileFromDatabase, setSyncing, t]);

  const persistTransition = useCallback(async (
    previous: ActiveFocusSession,
    next: ActiveFocusSession,
  ) => {
    installSession(next);
    setNow(Date.now());
    const uid = userIdRef.current;
    if (!uid) return;
    if (!previous.id) {
      await persistNewSession(next, uid);
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase
        .from("focus_sessions")
        .update({
          phase: toStoredPhase(next.phase),
          block_index: next.cycle,
          phase_ends_at: isoAt(next.phaseEndsAt),
          paused_at: next.pausedAt == null ? null : isoAt(next.pausedAt),
          pauses: next.pauses.map(({ from, to }) => ({ from, to })),
          updated_at: isoAt(Date.now()),
          version: previous.version + 1,
        })
        .eq("id", previous.id)
        .eq("user_id", uid)
        .eq("version", previous.version)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        const reconciled = await reconcileFromDatabase(uid, next);
        if (!reconciled) toast.error(t("focusTimer.syncError"));
        return;
      }

      const row = data as StoredSessionRow;
      const restoredPhase = fromStoredPhase(row.phase) ?? next.phase;
      const updated: ActiveFocusSession = {
        ...next,
        id: row.id,
        userId: row.user_id,
        slotId: row.slot_id,
        phase: restoredPhase,
        cycle: row.block_index,
        startedAt: milliseconds(row.started_at) ?? next.startedAt,
        phaseEndsAt: milliseconds(row.phase_ends_at) ?? next.phaseEndsAt,
        pausedAt: milliseconds(row.paused_at),
        pauses: parsePauseIntervals(row.pauses),
        version: row.version,
      };
      installSession(updated);
    } catch (error) {
      console.error("Failed to update focus timer:", error);
      const reconciled = await reconcileFromDatabase(uid, next);
      if (!reconciled) toast.error(t("focusTimer.syncError"));
    } finally {
      setSyncing(false);
    }
  }, [installSession, persistNewSession, reconcileFromDatabase, setSyncing, t]);

  const toggleRun = useCallback(() => {
    const current = activeSessionRef.current;
    if (!current || syncingRef.current) return;
    const timestamp = Date.now();
    if (current.pausedAt == null) {
      const accrued = accrueFocusTime(timestamp) ?? current;
      const next: ActiveFocusSession = {
        ...accrued,
        pausedAt: pauseClock(timestamp).pausedAt,
        lastAccrualAt: timestamp,
      };
      void persistTransition(accrued, next);
      return;
    }

    const resumed = resumeClock(timestamp, current.phaseEndsAt, current.pausedAt);
    const next: ActiveFocusSession = {
      ...current,
      phaseEndsAt: resumed.phaseEndsAt,
      pausedAt: resumed.pausedAt,
      pauses: [...current.pauses, resumed.interval],
      lastAccrualAt: timestamp,
    };
    void persistTransition(current, next);
  }, [accrueFocusTime, persistTransition]);

  const restart = useCallback(() => {
    const current = activeSessionRef.current;
    if (!current || syncingRef.current) return;
    const timestamp = Date.now();
    const accrued = accrueFocusTime(timestamp) ?? current;
    const pauseRecords = accrued.pausedAt == null
      ? accrued.pauses
      : [...accrued.pauses, { from: isoAt(accrued.pausedAt), to: isoAt(timestamp) }];
    const next: ActiveFocusSession = {
      ...accrued,
      phaseEndsAt: timestamp + accrued.phaseDurationSeconds * 1000,
      pausedAt: null,
      pauses: pauseRecords,
      lastAccrualAt: timestamp,
    };
    void persistTransition(accrued, next);
  }, [accrueFocusTime, persistTransition]);

  const end = useCallback(() => {
    const current = activeSessionRef.current;
    const reason: FocusEndReason = current
      && getOverrun(Date.now(), current.phaseEndsAt, current.pausedAt) > 0
      ? "overrun"
      : "finished";
    void endWithReason(reason);
  }, [endWithReason]);

  const startNextPhase = useCallback(() => {
    const current = activeSessionRef.current;
    if (!current || syncingRef.current) return;
    if (current.task.isBreak) {
      void endWithReason("finished");
      return;
    }
    const timestamp = Date.now();
    const accrued = accrueFocusTime(timestamp) ?? current;
    const transition = advancePhase(
      accrued.phase,
      accrued.cycle,
      timestamp,
      settingsForClock(focusSettingsRef.current),
      accrued.focusDurationSeconds,
    );
    const pauseRecords = accrued.pausedAt == null
      ? accrued.pauses
      : [...accrued.pauses, { from: isoAt(accrued.pausedAt), to: isoAt(timestamp) }];
    const next: ActiveFocusSession = {
      ...accrued,
      phase: transition.phase,
      cycle: transition.blockIndex,
      phaseEndsAt: transition.phaseEndsAt,
      pausedAt: null,
      pauses: pauseRecords,
      phaseDurationSeconds: transition.phaseDurationSeconds,
      lastAccrualAt: timestamp,
    };
    clockBaselineRef.current = null;
    void persistTransition(accrued, next);
  }, [accrueFocusTime, endWithReason, persistTransition]);

  const extend = useCallback(() => {
    const current = activeSessionRef.current;
    if (!current || syncingRef.current) return;
    const timestamp = Date.now();
    const accrued = accrueFocusTime(timestamp) ?? current;
    const pauseRecords = accrued.pausedAt == null
      ? accrued.pauses
      : [...accrued.pauses, { from: isoAt(accrued.pausedAt), to: isoAt(timestamp) }];
    const next: ActiveFocusSession = {
      ...accrued,
      phaseEndsAt: timestamp + accrued.phaseDurationSeconds * 1000,
      pausedAt: null,
      pauses: pauseRecords,
      lastAccrualAt: timestamp,
    };
    void persistTransition(accrued, next);
  }, [accrueFocusTime, persistTransition]);

  const extendByMinutes = useCallback((minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    const current = activeSessionRef.current;
    if (!current || syncingRef.current) return;
    const durationSeconds = Math.floor(minutes) * 60;
    if (durationSeconds <= 0) return;
    const timestamp = Date.now();
    const accrued = accrueFocusTime(timestamp) ?? current;
    const anchor = Math.max(accrued.phaseEndsAt, accrued.pausedAt ?? timestamp);
    const next: ActiveFocusSession = {
      ...accrued,
      phaseEndsAt: anchor + durationSeconds * 1000,
      phaseDurationSeconds: accrued.phaseDurationSeconds + durationSeconds,
    };
    clockBaselineRef.current = null;
    void persistTransition(accrued, next);
  }, [accrueFocusTime, persistTransition]);

  const addFiveMinutes = useCallback(() => {
    extendByMinutes(5);
  }, [extendByMinutes]);

  useEffect(() => {
    const current = activeSession;
    if (!current) {
      clockBaselineRef.current = null;
      return;
    }
    const remainingSeconds = getRemaining(now, current.phaseEndsAt, current.pausedAt);
    const overtimeSeconds = getOverrun(now, current.phaseEndsAt, current.pausedAt);
    const baseline = clockBaselineRef.current;
    if (!baseline || baseline.sessionId !== current.id || baseline.phaseEndsAt !== current.phaseEndsAt) {
      clockBaselineRef.current = {
        sessionId: current.id,
        phaseEndsAt: current.phaseEndsAt,
        remaining: remainingSeconds,
        overrun: overtimeSeconds,
      };
      return;
    }

    if (baseline.remaining > 5 * 60 && remainingSeconds <= 5 * 60 && remainingSeconds > 0) {
      publishAnnouncement(t("focusTimer.announceFiveMinutes"));
    }
    if (baseline.remaining > 0 && remainingSeconds === 0) {
      publishAnnouncement(t("focusTimer.announcePhaseEnd"));
      triggerHaptic("success");
      if (allowSoundForClockUpdateRef.current && document.visibilityState === "visible" && focusSettings.soundEnabled) {
        playFocusSound();
      }
    }
    if (baseline.overrun === 0 && overtimeSeconds > 0) {
      publishAnnouncement(t("focusTimer.announceOverrun"));
    }
    allowSoundForClockUpdateRef.current = true;
    clockBaselineRef.current = {
      sessionId: current.id,
      phaseEndsAt: current.phaseEndsAt,
      remaining: remainingSeconds,
      overrun: overtimeSeconds,
    };
  }, [activeSession, focusSettings.soundEnabled, now, publishAnnouncement, t]);

  useEffect(() => {
    const initialSession = activeSessionRef.current;
    if (!initialSession || initialSession.pausedAt != null) return;
    const tick = () => {
      const timestamp = Date.now();
      accrueFocusTime(timestamp);
      allowSoundForClockUpdateRef.current = document.visibilityState === "visible";
      setNow(timestamp);
      const current = activeSessionRef.current;
      if (!current) return;
      const overtimeSeconds = getOverrun(timestamp, current.phaseEndsAt, current.pausedAt);
      const sessionKey = current.id ?? String(current.startedAt);
      if (overtimeSeconds >= AUTO_PAUSE_AFTER_SECONDS && autoPausedSessionRef.current !== sessionKey && !syncingRef.current) {
        autoPausedSessionRef.current = sessionKey;
        void endWithReason("auto_paused");
      }
    };
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [activeSession?.id, activeSession?.pausedAt, accrueFocusTime, endWithReason]);

  const remaining = activeSession
    ? getRemaining(now, activeSession.phaseEndsAt, activeSession.pausedAt)
    : DURATIONS.focus;
  const overtime = activeSession
    ? getOverrun(now, activeSession.phaseEndsAt, activeSession.pausedAt)
    : 0;
  const isActive = activeSession !== null;
  const isRunning = !!activeSession && activeSession.pausedAt == null;
  const sessionKey = activeSession ? String(activeSession.startedAt) : null;
  const awaitingChoice = !!activeSession && remaining === 0;

  const value = useMemo<FocusContextValue>(() => ({
    isActive,
    isFullscreen: fullscreen,
    isRunning,
    isSyncing,
    phase: activeSession?.phase ?? "focus",
    cycle: activeSession?.cycle ?? 0,
    remaining,
    overrun: overtime,
    phaseDurationSeconds: activeSession?.phaseDurationSeconds ?? DURATIONS.focus,
    task: activeSession?.task ?? null,
    sessionKey,
    lastEndedSession,
    awaitingChoice,
    announcement,
    acknowledgeEndedSession,
    openSetup: () => setSetupOpen(true),
    openFullscreen: () => setFullscreen(true),
    minimize: () => setFullscreen(false),
    toggleRun,
    restart,
    end,
    endWithReason,
    startSession,
    startPause,
    extend,
    extendByMinutes,
    addFiveMinutes,
    nextPhase: startNextPhase,
  }), [
    activeSession,
    acknowledgeEndedSession,
    addFiveMinutes,
    announcement,
    awaitingChoice,
    end,
    endWithReason,
    extend,
    extendByMinutes,
    fullscreen,
    lastEndedSession,
    isActive,
    isRunning,
    isSyncing,
    overtime,
    remaining,
    restart,
    sessionKey,
    startNextPhase,
    startPause,
    startSession,
    toggleRun,
  ]);

  return (
    <FocusContext.Provider value={value}>
      {children}
      <FocusSetupDialog open={setupOpen} onOpenChange={setSetupOpen} onStart={startSession} />
      {isActive && fullscreen && <FocusFullscreen />}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used within FocusProvider");
  return ctx;
}

/** Optional for shared shell components that also render in isolated previews/tests. */
export function useOptionalFocus() {
  return useContext(FocusContext);
}

export function formatMMSS(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export const FOCUS_DURATIONS = DURATIONS;
