import type { ReactNode } from "react";

export const FOCUS_DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 25 * 60 };

export function formatMMSS(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function FocusProvider({ children }: { children: ReactNode }) {
  return children;
}

export function useFocus() {
  return {
    isActive: false,
    startSession: () => {},
    openSetup: () => {},
    openFullscreen: () => {},
  };
}
