export type FocusPhase = "focus" | "short" | "long";
export type StoredFocusPhase = "focus" | "short_break" | "long_break";
export type FocusEndReason = "finished" | "interrupted" | "auto_paused" | "overrun";

export interface FocusBreakDurations {
  short: number;
  medium: number;
  long: number;
}

export interface FocusClockStart {
  phase: "focus";
  phaseEndsAt: number;
  pausedAt: null;
  phaseDurationSeconds: number;
}

export interface FocusClockTransition {
  phase: FocusPhase;
  blockIndex: number;
  phaseEndsAt: number;
  pausedAt: null;
  phaseDurationSeconds: number;
  breakKind?: "short" | "medium" | "long";
}

export interface PauseInterval {
  from: string;
  to: string;
}

function timestamp(value: number | string | Date | null | undefined): number | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function secondsFromMinutes(minutes: number): number {
  return Math.max(0, Math.round(minutes * 60));
}

/** Remaining whole seconds, always derived from the absolute phase deadline. */
export function remaining(
  now: number | Date,
  phaseEndsAt: number | string | Date | null | undefined,
  pausedAt: number | string | Date | null | undefined,
): number {
  const end = timestamp(phaseEndsAt);
  const reference = pausedAt == null ? timestamp(now) : timestamp(pausedAt);
  if (end == null || reference == null) return 0;
  return Math.max(0, Math.ceil((end - reference) / 1000));
}

export function start(now: number, durationSeconds: number): FocusClockStart {
  const phaseDurationSeconds = Math.max(0, Math.floor(durationSeconds));
  return {
    phase: "focus",
    phaseEndsAt: now + phaseDurationSeconds * 1000,
    pausedAt: null,
    phaseDurationSeconds,
  };
}

export function pause(now: number): { pausedAt: number } {
  return { pausedAt: now };
}

/** Resume by shifting the absolute deadline by the exact paused interval. */
export function resume(
  now: number,
  phaseEndsAt: number,
  pausedAt: number,
): { phaseEndsAt: number; pausedAt: null; interval: PauseInterval } {
  const resumedAt = Math.max(now, pausedAt);
  return {
    phaseEndsAt: phaseEndsAt + (resumedAt - pausedAt),
    pausedAt: null,
    interval: {
      from: new Date(pausedAt).toISOString(),
      to: new Date(resumedAt).toISOString(),
    },
  };
}

/** Translate the UI's three phases into the database's two break values. */
export function toStoredPhase(phase: FocusPhase): StoredFocusPhase {
  if (phase === "short") return "short_break";
  if (phase === "long") return "long_break";
  return "focus";
}

export function fromStoredPhase(phase: string): FocusPhase | null {
  if (phase === "focus") return "focus";
  if (phase === "short_break") return "short";
  if (phase === "long_break") return "long";
  return null;
}

/**
 * A 3-block cycle uses short, medium, then long breaks. The medium break keeps
 * the existing `short` UI/DB phase; its exact length lives in phase_ends_at.
 */
export function nextPhase(
  phase: FocusPhase,
  blockIndex: number,
  now: number,
  breaks: FocusBreakDurations,
  focusDurationSeconds: number,
): FocusClockTransition {
  if (phase !== "focus") {
    const duration = Math.max(0, Math.floor(focusDurationSeconds));
    return {
      phase: "focus",
      blockIndex,
      phaseEndsAt: now + duration * 1000,
      pausedAt: null,
      phaseDurationSeconds: duration,
    };
  }

  const nextBlock = blockIndex + 1;
  if (nextBlock % 4 === 0) {
    const duration = secondsFromMinutes(breaks.long);
    return {
      phase: "long",
      blockIndex: nextBlock,
      phaseEndsAt: now + duration * 1000,
      pausedAt: null,
      phaseDurationSeconds: duration,
      breakKind: "long",
    };
  }
  if (nextBlock % 2 === 0) {
    const duration = secondsFromMinutes(breaks.medium);
    return {
      phase: "short",
      blockIndex: nextBlock,
      phaseEndsAt: now + duration * 1000,
      pausedAt: null,
      phaseDurationSeconds: duration,
      breakKind: "medium",
    };
  }

  const duration = secondsFromMinutes(breaks.short);
  return {
    phase: "short",
    blockIndex: nextBlock,
    phaseEndsAt: now + duration * 1000,
    pausedAt: null,
    phaseDurationSeconds: duration,
    breakKind: "short",
  };
}

/** Seconds elapsed beyond the deadline; a paused timer holds its overrun. */
export function overrun(
  now: number | Date,
  phaseEndsAt: number | string | Date | null | undefined,
  pausedAt: number | string | Date | null | undefined,
): number {
  const end = timestamp(phaseEndsAt);
  const reference = pausedAt == null ? timestamp(now) : timestamp(pausedAt);
  if (end == null || reference == null) return 0;
  return Math.max(0, Math.floor((reference - end) / 1000));
}
