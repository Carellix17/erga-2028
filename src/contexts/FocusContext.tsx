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
import { FocusSetupDialog } from "@/components/focus/FocusSetupDialog";
import { FocusFullscreen } from "@/components/focus/FocusFullscreen";

export type FocusPhase = "focus" | "short" | "long";

export interface FocusTask {
  label: string;
  subject?: string;
  eventId?: string;
}

const DURATIONS: Record<FocusPhase, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 25 * 60,
};

interface FocusContextValue {
  isActive: boolean;
  isFullscreen: boolean;
  isRunning: boolean;
  phase: FocusPhase;
  cycle: number; // completed focus cycles
  remaining: number; // seconds
  task: FocusTask | null;
  awaitingChoice: boolean; // timer hit 0, waiting user
  openSetup: () => void;
  openFullscreen: () => void;
  minimize: () => void;
  toggleRun: () => void;
  restart: () => void;
  end: () => void;
  startSession: (task: FocusTask) => void;
  extend: () => void;
  nextPhase: () => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export function FocusProvider({ children }: { children: ReactNode }) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [task, setTask] = useState<FocusTask | null>(null);
  const [phase, setPhase] = useState<FocusPhase>("focus");
  const [cycle, setCycle] = useState(0);
  const [remaining, setRemaining] = useState(DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [awaitingChoice, setAwaitingChoice] = useState(false);
  const tickRef = useRef<number | null>(null);

  const isActive = task !== null;

  const stopTick = () => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  useEffect(() => {
    if (!isRunning) {
      stopTick();
      return;
    }
    tickRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          stopTick();
          setIsRunning(false);
          setAwaitingChoice(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => stopTick();
  }, [isRunning]);

  const startSession = useCallback((t: FocusTask) => {
    setTask(t);
    setPhase("focus");
    setCycle(0);
    setRemaining(DURATIONS.focus);
    setAwaitingChoice(false);
    setIsRunning(true);
    setSetupOpen(false);
    setFullscreen(true);
  }, []);

  const openSetup = useCallback(() => setSetupOpen(true), []);
  const openFullscreen = useCallback(() => setFullscreen(true), []);
  const minimize = useCallback(() => setFullscreen(false), []);

  const toggleRun = useCallback(() => {
    if (awaitingChoice) return;
    setIsRunning((r) => !r);
  }, [awaitingChoice]);

  const restart = useCallback(() => {
    setRemaining(DURATIONS[phase]);
    setAwaitingChoice(false);
    setIsRunning(true);
  }, [phase]);

  const end = useCallback(() => {
    stopTick();
    setIsRunning(false);
    setTask(null);
    setFullscreen(false);
    setAwaitingChoice(false);
    setPhase("focus");
    setCycle(0);
    setRemaining(DURATIONS.focus);
  }, []);

  const nextPhase = useCallback(() => {
    let nextPhaseVal: FocusPhase;
    let nextCycle = cycle;
    if (phase === "focus") {
      nextCycle = cycle + 1;
      nextPhaseVal = nextCycle % 4 === 0 ? "long" : "short";
    } else {
      nextPhaseVal = "focus";
    }
    setCycle(nextCycle);
    setPhase(nextPhaseVal);
    setRemaining(DURATIONS[nextPhaseVal]);
    setAwaitingChoice(false);
    setIsRunning(true);
  }, [phase, cycle]);

  const extend = useCallback(() => {
    setRemaining(DURATIONS[phase]);
    setAwaitingChoice(false);
    setIsRunning(true);
  }, [phase]);

  const value = useMemo<FocusContextValue>(
    () => ({
      isActive,
      isFullscreen: fullscreen,
      isRunning,
      phase,
      cycle,
      remaining,
      task,
      awaitingChoice,
      openSetup,
      openFullscreen,
      minimize,
      toggleRun,
      restart,
      end,
      startSession,
      extend,
      nextPhase,
    }),
    [isActive, fullscreen, isRunning, phase, cycle, remaining, task, awaitingChoice, openSetup, openFullscreen, minimize, toggleRun, restart, end, startSession, extend, nextPhase],
  );

  return (
    <FocusContext.Provider value={value}>
      {children}
      <FocusSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onStart={startSession}
      />
      {isActive && fullscreen && <FocusFullscreen />}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used within FocusProvider");
  return ctx;
}

export function formatMMSS(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export const FOCUS_DURATIONS = DURATIONS;