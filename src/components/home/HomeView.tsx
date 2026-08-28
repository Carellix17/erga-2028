import { useMemo, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  FileUp,
  Minus,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Timer,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { HomeDashboardSkeleton } from "./HomeDashboardSkeleton";
import { CourseCardBackground } from "@/components/studio/CourseCardBackground";
import { useFocus } from "@/contexts/FocusContext";
import { useHomeDashboard, type HomeTask } from "@/hooks/useHomeDashboard";
import { useWelcomeMessage } from "@/hooks/useWelcomeMessage";
import { useHaptics } from "@/hooks/useHaptics";
import { getSubjectAccent } from "@/lib/subjectColors";
import { cn } from "@/lib/utils";
import { HomeV2 } from "./HomeV2";
import { useCognitiveProfile } from "@/hooks/useCognitiveProfile";

interface HomeViewProps {
  onOpenStudio: () => void;
  onResumeLesson: (contextId: string, lessonIndex: number) => void;
  onOpenPlan: () => void;
  onOpenPratica?: () => void;
  onOpenCognitive?: () => void;
  onUpload: () => void;
}

const VISIBLE_TASKS = 3;

const HOME_BLOCK_CLASS =
  "rounded-card border border-border bg-card text-card-foreground shadow-level-1";
const HOME_DARK_MATERIAL_CLASS = "";
const HOME_DARK_TITLE_CLASS = "dark:text-[#FAFAFA]";
const HOME_DARK_BODY_CLASS = "dark:text-[#E0E0E0]";
const HOME_DARK_MUTED_CLASS = "dark:text-[rgba(224,224,224,0.82)]";
const HOME_DARK_INVERTED_BUTTON_CLASS =
  "dark:border-[#FAFAFA]/90 dark:bg-[#FAFAFA] dark:text-[#111111] dark:hover:bg-[#F2F0EF] dark:hover:text-[#111111] dark:active:bg-[#E0E0E0]";
const HOME_DARK_OUTLINE_BUTTON_CLASS =
  "dark:border-white/15 dark:bg-transparent dark:text-[#FAFAFA] dark:hover:bg-[#FAFAFA] dark:hover:text-[#111111]";
const HOME_DARK_GHOST_BUTTON_CLASS =
  "dark:text-[#FAFAFA] dark:hover:bg-white/[0.08] dark:hover:text-[#FAFAFA]";

interface MinimalArtworkProps {
  Icon: typeof Timer;
  compact?: boolean;
  lightOnDarkCard?: boolean;
}

function MinimalArtwork({ Icon, compact = false, lightOnDarkCard = false }: MinimalArtworkProps) {
  return (
    <span
      data-testid="home-minimal-artwork"
      aria-hidden="true"
      className={cn(
        "relative isolate grid shrink-0 place-items-center overflow-hidden text-foreground",
        !lightOnDarkCard && "dark:text-black",
        lightOnDarkCard && "dark:text-[#FAFAFA]",
        compact
          ? "h-9 w-9 [&_svg]:!h-6 [&_svg]:!w-6"
          : "h-14 w-16 [&_svg]:!h-9 [&_svg]:!w-9",
      )}
    >
      <span className={cn("absolute inset-x-1 top-1/2 h-px -rotate-[18deg] bg-foreground/20", !lightOnDarkCard && "dark:bg-black/20", lightOnDarkCard && "dark:bg-white/20")} />
      <span className={cn("absolute right-1 top-1 h-3 w-3 rounded-full border border-foreground/30", !lightOnDarkCard && "dark:border-black/30", lightOnDarkCard && "dark:border-white/30")} />
      <Icon className={cn("relative z-10 stroke-[1.6]", compact ? "h-6 w-6" : "h-9 w-9")} />
    </span>
  );
}

export function HomeView({
  onOpenStudio,
  onResumeLesson,
  onOpenPlan,
  onOpenCognitive,
  onUpload,
}: HomeViewProps) {
  const { t, i18n } = useTranslation();
  const dashboard = useHomeDashboard();
  const focus = useFocus();
  const { triggerLight, triggerMedium } = useHaptics();
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [focusMinutes, setFocusMinutes] = useState(25);
  const { profile: cognitiveProfile } = useCognitiveProfile();

  const data = dashboard.data;
  const pendingTasks = data?.todayTasks.filter((task) => !task.isCompleted).length ?? 0;
  const welcome = useWelcomeMessage({
    userName: data?.displayName ?? "",
    pendingTasks,
    completedTasks: data?.completedActivities ?? 0,
    hasResumeLesson: !!data?.resumeLesson,
    nextEvaluationDays: data?.nextEvaluation?.daysAway ?? null,
  });

  const todayLabel = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" }).format(new Date()),
    [i18n.language],
  );

  const showHomeSkeleton = useDelayedLoading(dashboard.isLoading, 100);
  if (showHomeSkeleton) return <HomeDashboardSkeleton />;
  if (dashboard.isLoading) return null;

  if (dashboard.isError || !data) {
    return (
      <div className="pb-10 pt-20">
        <Card className="mx-auto max-w-xl border-destructive/25 bg-card p-6 text-center">
          <RefreshCw className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
          <h1 className="mt-4 font-display text-xl font-bold">{t("home.error.title")}</h1>
          <p className="mt-2 text-base text-muted-foreground">{t("home.error.description")}</p>
          <Button className="mt-5 min-h-12 rounded-button" onClick={() => dashboard.refetch()}>
            {t("home.error.retry")}
          </Button>
        </Card>
      </div>
    );
  }

  const tasks = showAllTasks ? data.todayTasks : data.todayTasks.slice(0, VISIBLE_TASKS);
  const hiddenTasks = Math.max(0, data.todayTasks.length - VISIBLE_TASKS);
  const resume = data.resumeLesson;

  // Determine heroState from data
  const heroState = resume
    ? ("ACTIVE_SESSION" as const)
    : data.nextEvaluation && data.nextEvaluation.daysAway <= 1
      ? ("CONTEXT_EVENT" as const)
      : ("SPACED_REPETITION" as const);

  const handleOpenPlan = () => {
    triggerLight();
    onOpenPlan();
  };

  const handleToggleTasks = () => {
    triggerLight();
    setShowAllTasks((value) => !value);
  };

  const handleAdjustFocusMinutes = (direction: "increase" | "decrease") => {
    triggerMedium();
    setFocusMinutes((minutes) => {
      if (direction === "increase") return Math.min(180, minutes + 5);
      return Math.max(5, minutes - 5);
    });
  };

  const handleStartFocusTimer = () => {
    triggerMedium();
    focus.startSession(
      {
        label: t("home.focusTimer.sessionLabel"),
        sourceType: "adhoc",
        estimatedDuration: focusMinutes,
        durationMinutes: focusMinutes,
      },
      focusMinutes,
    );
  };

  const startTaskFocus = (task: HomeTask) => {
    if (!task.canStartFocus) return;
    triggerLight();
    focus.startSession({
      label: task.title,
      subject: task.subject,
      eventId: task.sourceId,
      sourceType: "planned",
    });
  };

  // Home V2 assembly with new design system tokens (slate) — modular components
  return (
    <HomeV2
      headerProps={{
        userName: data.displayName || "Studente",
        streakDays: data.streakDays,
        onSettingsClick: () => {
          triggerLight();
          // Settings navigation handled by parent layout
        },
        onAvatarClick: () => {
          triggerLight();
          onOpenCognitive?.();
        },
      }}
      heroProps={{
        heroState,
        subject: resume?.courseTitle ?? "Generale",
        lessonTitle: resume?.lessonTitle ?? (heroState === "CONTEXT_EVENT" ? "Hai saltato l'allenamento di ieri" : "Ripasso: Fotosintesi clorofilliana"),
        retentionText:
          heroState === "ACTIVE_SESSION"
            ? `Ritenzione ${resume?.progressPercent ?? 78}% · ${resume ? `${resume.lessonNumber} di ${resume.lessonCount} lezioni` : "Riprendi oggi"}`
            : heroState === "CONTEXT_EVENT"
              ? "Riprendi il ritmo con una sessione breve"
              : "3 concetti da ripassare per fissare la memoria",
        progressPercent: resume?.progressPercent ?? 42,
        badgeText: resume?.courseTitle ?? (heroState === "CONTEXT_EVENT" ? "Pausa programmata" : "Consolidamento"),
        secondaryText: data.nextEvaluation ? `${data.nextEvaluation.subject} · ${data.nextEvaluation.title} tra ${data.nextEvaluation.daysAway} giorni` : undefined,
        onPrimaryAction: () => {
          triggerLight();
          if (resume) {
            onResumeLesson(resume.contextId, resume.lessonIndex);
          } else {
            onOpenStudio();
          }
        },
        primaryActionLabel:
          heroState === "ACTIVE_SESSION"
            ? resume && resume.lessonNumber > 1
              ? "Riprendi Lezione"
              : "Inizia Lezione"
            : heroState === "CONTEXT_EVENT"
              ? "Studia ora"
              : "Ripasso rapido",
      }}
      quickActionsProps={{
        onImportPdf: () => {
          triggerLight();
          onUpload();
        },
        onQuizEspresso: () => {
          triggerLight();
          onOpenStudio();
        },
        onAskErga: () => {
          triggerLight();
          // Open chat — handled via custom event
          window.dispatchEvent(new CustomEvent("erga:goto-tab", { detail: "core" }));
        },
        onFocusLibero: () => {
          triggerLight();
          focus.openSetup();
        },
      }}
      cognitiveProps={{
        cognitiveState: cognitiveProfile
          ? cognitiveProfile.foc_score >= 70
            ? "Focus Alto"
            : cognitiveProfile.foc_score >= 40
              ? "Focus Medio"
              : "Focus Basso"
          : "Focus Medio",
        description: cognitiveProfile
          ? `Logica ${cognitiveProfile.log_score} · Memoria ${cognitiveProfile.mem_score} · Calma ${cognitiveProfile.ans_score}`
          : "Sei al picco di concentrazione oggi",
        hexagonValue: cognitiveProfile ? Math.round((cognitiveProfile.log_score + cognitiveProfile.mem_score + cognitiveProfile.foc_score) / 3) : 78,
        onClick: () => {
          triggerLight();
          onOpenCognitive?.();
        },
      }}
      timelineProps={{
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          time: t.time,
          subject: t.subject,
          isCompleted: t.isCompleted,
          kind: t.kind as any,
        })),
        onTaskClick: (id) => {
          const task = data.todayTasks.find((t) => t.id === id);
          if (task) startTaskFocus(task);
        },
        onSeeAll: hiddenTasks > 0 || showAllTasks ? handleToggleTasks : onOpenPlan,
        title: showAllTasks ? "Tutte le attività" : "Oggi",
        eyebrow: `Piano · ${pendingTasks} da fare`,
      }}
      activeTab="home"
      onTabChange={(tab) => {
        triggerLight();
        if (tab === "home") return;
        window.dispatchEvent(new CustomEvent("erga:goto-tab", { detail: tab }));
      }}
    />
  );
}
