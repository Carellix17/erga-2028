import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface CognitiveProfile {
  nome: string | null;
  eta: number | null;
  istituto: string | null;
  log_score: number;
  mem_score: number;
  foc_score: number;
  voc_score: number;
  ans_score: number;
  app_score: number;
}

export interface UseCognitiveProfileResult {
  profile: CognitiveProfile | null;
  hasCompletedOnboarding: boolean;
  isLoaded: boolean;
  refresh: () => Promise<void>;
  save: (data: Partial<CognitiveProfile>) => Promise<boolean>;
}

async function callFn(payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cognitive-profile`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify(payload),
    }
  );
  return res.json();
}

export function useCognitiveProfile(): UseCognitiveProfileResult {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<CognitiveProfile | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentUser) {
      setIsLoaded(true);
      return;
    }
    try {
      const data = await callFn({ action: "get", userId: currentUser });
      setProfile(data?.cognitive ?? null);
      setHasCompletedOnboarding(!!data?.hasCompletedOnboarding);
    } catch (e) {
      console.error("cognitive get error", e);
    } finally {
      setIsLoaded(true);
    }
  }, [currentUser]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = useCallback(async (data: Partial<CognitiveProfile>) => {
    if (!currentUser) return false;
    try {
      const res = await callFn({ action: "save", userId: currentUser, ...data });
      if (res?.success) {
        await refresh();
        return true;
      }
      return false;
    } catch (e) {
      console.error("cognitive save error", e);
      return false;
    }
  }, [currentUser, refresh]);

  return { profile, hasCompletedOnboarding, isLoaded, refresh, save };
}