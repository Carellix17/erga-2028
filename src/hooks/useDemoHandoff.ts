import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const DEMO_STORAGE_KEY = "erga_demo_state";

export interface DemoHexagon {
  log_score: number;
  mem_score: number;
  foc_score: number;
  voc_score: number;
  ans_score: number;
  app_score: number;
}

export interface DemoState {
  topic: string;
  courseTitle?: string;
  hexagon: DemoHexagon;
  completedLessons?: number;
  completedAt: string;
}

export function readDemoState(): DemoState | null {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoState;
  } catch {
    return null;
  }
}

export function writeDemoState(next: DemoState | null) {
  try {
    if (next === null) localStorage.removeItem(DEMO_STORAGE_KEY);
    else localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

/**
 * When a user finishes the guest demo and then signs in / signs up,
 * persist the computed hexagon to their new cognitive profile and
 * clear the local sandbox state. Best-effort, safe to call multiple times.
 */
export function useDemoHandoff() {
  const { isAuthenticated, currentUser } = useAuth();
  const doneRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !currentUser || doneRef.current) return;
    const state = readDemoState();
    if (!state?.hexagon) return;
    doneRef.current = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cognitive-profile`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              action: "save",
              userId: currentUser,
              ...state.hexagon,
            }),
          },
        );
        if (res.ok) writeDemoState(null);
      } catch (e) {
        console.error("demo handoff failed", e);
      }
    })();
  }, [isAuthenticated, currentUser]);
}