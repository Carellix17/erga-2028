import { useCallback, useEffect, useRef } from "react";

const IDLE_TIMEOUT_MS = 120_000;
const ACTIVE_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

interface ActiveTimeState {
  accumulatedMs: number;
  lastActivityAt: number;
  segmentStartedAt: number | null;
}

function isPageVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function finishVisibleSegment(state: ActiveTimeState, now: number): void {
  if (state.segmentStartedAt === null) return;

  // A visible segment stops counting at the 120-second idle deadline, even
  // when the next input or visibility event arrives much later.
  const activeUntil = Math.min(now, state.lastActivityAt + IDLE_TIMEOUT_MS);
  state.accumulatedMs += Math.max(0, activeUntil - state.segmentStartedAt);
  state.segmentStartedAt = null;
}

/**
 * Measures visible, non-idle time while a lesson is active. Time is derived
 * from Date.now() so delayed browser timers cannot over-count reading time.
 */
export function useActiveTime(active: boolean) {
  const stateRef = useRef<ActiveTimeState>({
    accumulatedMs: 0,
    lastActivityAt: Date.now(),
    segmentStartedAt: null,
  });

  const getSeconds = useCallback((): number => {
    const state = stateRef.current;
    let elapsedMs = state.accumulatedMs;

    if (state.segmentStartedAt !== null) {
      const activeUntil = Math.min(Date.now(), state.lastActivityAt + IDLE_TIMEOUT_MS);
      elapsedMs += Math.max(0, activeUntil - state.segmentStartedAt);
    }

    return Math.floor(elapsedMs / 1_000);
  }, []);

  const reset = useCallback((): void => {
    const now = Date.now();
    const state = stateRef.current;
    state.accumulatedMs = 0;
    state.lastActivityAt = now;
    state.segmentStartedAt = active && isPageVisible() ? now : null;
  }, [active]);

  useEffect(() => {
    const state = stateRef.current;
    const now = Date.now();

    if (!active) {
      finishVisibleSegment(state, now);
      return;
    }

    // Opening (or re-activating) the lesson starts a fresh idle window.
    state.lastActivityAt = now;
    state.segmentStartedAt = isPageVisible() ? now : null;

    const handleActivity = (): void => {
      if (!isPageVisible()) return;

      const activityAt = Date.now();
      finishVisibleSegment(state, activityAt);
      state.lastActivityAt = activityAt;
      state.segmentStartedAt = activityAt;
    };

    const handleVisibilityChange = (): void => {
      const changedAt = Date.now();
      if (!isPageVisible()) {
        finishVisibleSegment(state, changedAt);
        return;
      }

      // Returning to the page resumes only if the prior activity is still
      // inside its idle window; otherwise the next input starts a new segment.
      if (
        state.segmentStartedAt === null &&
        changedAt < state.lastActivityAt + IDLE_TIMEOUT_MS
      ) {
        state.segmentStartedAt = changedAt;
      }
    };

    for (const eventName of ACTIVE_EVENTS) {
      window.addEventListener(eventName, handleActivity, true);
    }
    // Capture on window reaches document and nested scroll containers as well.
    window.addEventListener("scroll", handleActivity, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      for (const eventName of ACTIVE_EVENTS) {
        window.removeEventListener(eventName, handleActivity, true);
      }
      window.removeEventListener("scroll", handleActivity, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      finishVisibleSegment(state, Date.now());
    };
  }, [active]);

  return { getSeconds, reset };
}
