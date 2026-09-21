import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface WelcomeMessage {
  greeting: string;
  name: string;
  subtitle: string | null;
}

interface UseWelcomeMessageOptions {
  userName: string;
  pendingTasks?: number;
  completedTasks?: number;
  hasResumeLesson?: boolean;
  nextEvaluationDays?: number | null;
}

function greetingKeyForHour(hour: number) {
  if (hour < 5) return "home.greeting.night";
  if (hour < 12) return "home.greeting.morning";
  if (hour < 17) return "home.greeting.afternoon";
  return "home.greeting.evening";
}

/**
 * Saluto stabile e basato su dati reali. Nessuna frase casuale: spuntare
 * un'attività o ricaricare la Home non cambia improvvisamente il tono.
 */
export function useWelcomeMessage({
  userName,
  pendingTasks = 0,
  completedTasks = 0,
  hasResumeLesson = false,
  nextEvaluationDays = null,
}: UseWelcomeMessageOptions): WelcomeMessage {
  const { t } = useTranslation();

  return useMemo(() => {
    let subtitle: string | null;
    if (pendingTasks > 0) {
      subtitle = t("home.subtitle.pending", { count: pendingTasks });
    } else if (completedTasks > 0) {
      subtitle = t("home.subtitle.completed");
    } else if (nextEvaluationDays !== null && nextEvaluationDays > 0) {
      subtitle = t("home.subtitle.nextEvaluation", { count: nextEvaluationDays });
    } else if (hasResumeLesson) {
      // Il messaggio "Hai una lezione da riprendere" è stato rimosso dalla
      // Home: sotto il saluto non deve più comparire nulla in questo caso.
      subtitle = null;
    } else {
      subtitle = t("home.subtitle.empty");
    }

    return {
      greeting: t(greetingKeyForHour(new Date().getHours())),
      name: userName,
      subtitle,
    };
  }, [userName, pendingTasks, completedTasks, hasResumeLesson, nextEvaluationDays, t]);
}
