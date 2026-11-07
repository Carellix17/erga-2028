import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { calculateSpeedFactor, type ReadingSpeedSample } from "@/lib/planner/speed";
import { normalizeSubjectName } from "@/lib/planner/subjectType";
import { ProExplainer } from "@/components/piano/ProExplainer";

const MIN_MEASURED_SESSIONS = 5;
const STORAGE_PREFIX = "erga:piano:pro-nudge:v1";

interface NudgePreferences {
  userId: string | null;
  shown: boolean;
  dismissed: boolean;
}

interface MeasuredSessions {
  userId: string | null;
  count: number | null;
}

export interface ProNudgeCardProps {
  userId: string | null;
  isPro: boolean;
  subscriptionLoading?: boolean;
}

function preferenceKey(userId: string, state: "shown" | "dismissed") {
  return `${STORAGE_PREFIX}:${userId}:${state}`;
}

function readPreferences(userId: string | null): NudgePreferences {
  if (!userId || typeof window === "undefined") {
    return { userId, shown: false, dismissed: false };
  }

  try {
    return {
      userId,
      shown: window.localStorage.getItem(preferenceKey(userId, "shown")) === "true",
      dismissed: window.localStorage.getItem(preferenceKey(userId, "dismissed")) === "true",
    };
  } catch {
    return { userId, shown: false, dismissed: false };
  }
}

function countMeasuredSessions(samples: readonly ReadingSpeedSample[]): number {
  const subjects = new Set(
    samples
      .map((sample) => normalizeSubjectName(sample.subject ?? ""))
      .filter((subject) => subject.length > 0),
  );

  let count = 0;
  for (const subject of subjects) {
    // `n` uses the same validity rules as the planner's speed estimate.
    count += calculateSpeedFactor(subject, "generale", samples).n;
  }
  return count;
}

async function loadMeasuredSessions(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from("lesson_reading_logs")
    .select("active_seconds, base_estimate_min, completed_at, subject, subject_type")
    .eq("user_id", userId);

  if (error) throw error;
  return countMeasuredSessions((data ?? []) as ReadingSpeedSample[]);
}

export function ProNudgeCard({ userId, isPro, subscriptionLoading = false }: ProNudgeCardProps) {
  const { t } = useTranslation();
  const [measuredSessions, setMeasuredSessions] = useState<MeasuredSessions>({ userId: null, count: null });
  const [preferences, setPreferences] = useState<NudgePreferences>(() => readPreferences(userId));
  const [shownForThisMount, setShownForThisMount] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  useEffect(() => {
    setPreferences(readPreferences(userId));
    setShownForThisMount(false);
  }, [userId]);

  useEffect(() => {
    if (!userId || subscriptionLoading || isPro) {
      setMeasuredSessions({ userId, count: null });
      return;
    }

    const savedPreferences = readPreferences(userId);
    if (savedPreferences.shown || savedPreferences.dismissed) {
      setMeasuredSessions({ userId, count: 0 });
      return;
    }

    let active = true;
    setMeasuredSessions({ userId, count: null });
    void loadMeasuredSessions(userId)
      .then((count) => {
        if (active) setMeasuredSessions({ userId, count });
      })
      .catch(() => {
        if (active) setMeasuredSessions({ userId, count: null });
      });

    return () => {
      active = false;
    };
  }, [userId, isPro, subscriptionLoading]);

  const preferencesReady = preferences.userId === userId;
  const eligible = !!userId
    && !subscriptionLoading
    && !isPro
    && measuredSessions.userId === userId
    && measuredSessions.count !== null
    && measuredSessions.count >= MIN_MEASURED_SESSIONS;

  useEffect(() => {
    if (
      !eligible
      || !preferencesReady
      || preferences.dismissed
      || preferences.shown
      || shownForThisMount
      || !userId
    ) return;

    try {
      window.localStorage.setItem(preferenceKey(userId, "shown"), "true");
    } catch {
      // The card remains available for this mount when browser storage is blocked.
    }
    setPreferences({ userId, shown: true, dismissed: false });
    setShownForThisMount(true);
  }, [eligible, preferencesReady, preferences.dismissed, preferences.shown, shownForThisMount, userId]);

  const shouldShow = eligible
    && preferencesReady
    && !preferences.dismissed
    && (!preferences.shown || shownForThisMount);

  const dismissForever = () => {
    if (!userId) return;
    try {
      window.localStorage.setItem(preferenceKey(userId, "shown"), "true");
      window.localStorage.setItem(preferenceKey(userId, "dismissed"), "true");
    } catch {
      // The in-memory state still closes the card for this app session.
    }
    setPreferences({ userId, shown: true, dismissed: true });
    setShownForThisMount(false);
  };

  if (!shouldShow) return null;

  return (
    <>
      <aside className="space-y-3 rounded-xl border border-cognitive/30 bg-cognitive/5 p-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">{t("piano.pro.nudge.title")}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("piano.pro.nudge.description")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setExplainerOpen(true)}>
            {t("piano.pro.nudge.discover")}
          </Button>
          <Button type="button" variant="ghost" className="min-h-11" onClick={dismissForever}>
            {t("piano.pro.nudge.dismiss")}
          </Button>
        </div>
      </aside>
      <ProExplainer open={explainerOpen} onOpenChange={setExplainerOpen} />
    </>
  );
}
