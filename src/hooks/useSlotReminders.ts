import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { enqueueSlotReminders } from "@/lib/pushSchedule";
import type { StudyEvent } from "@/hooks/useStudyEvents";

export function useSlotReminders(events: readonly StudyEvent[], enabled = true): void {
  const { currentUser } = useAuth();
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;

  useEffect(() => {
    if (!enabled || !currentUser) return;
    let active = true;

    const synchronize = async () => {
      const { data, error } = await supabase
        .from("planner_settings")
        .select("notify_types")
        .eq("user_id", currentUser)
        .maybeSingle();
      if (error) throw new Error("notification settings unavailable");
      if (!active) return;
      await enqueueSlotReminders(events, {
        userId: currentUser,
        notifyTypes: data?.notify_types ?? null,
        language,
      });
    };

    void synchronize().catch(() => {
      if (active) console.warn("[push] slot reminder sync failed");
    });
    return () => { active = false; };
  }, [currentUser, enabled, events, language]);
}
