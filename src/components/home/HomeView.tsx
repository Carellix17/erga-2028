import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { HomeDashboardSkeleton } from "./HomeDashboardSkeleton";
import { useFocus } from "@/contexts/FocusContext";
import { useHomeDashboard, type HomeTask } from "@/hooks/useHomeDashboard";
import { useWelcomeMessage } from "@/hooks/useWelcomeMessage";
import { useHaptics } from "@/hooks/useHaptics";
import { HomeHeader } from "./HomeHeader";
import { CourseHeroCard } from "./CourseHeroCard";
import { DailyTimeline } from "./DailyTimeline";

interface HomeViewProps {
  onOpenStudio: () => void;
  onResumeLesson: (contextId: string, lessonIndex: number) => void;
  onOpenPlan: () => void;
  onUpload: () => void;
}

const VISIBLE_TASKS = 3;

export function HomeView({
  onOpenStudio,
  onResumeLesson,
  onOpenPlan,
  onUpload,
}: HomeViewProps) {
  const { t } = useTranslation();
  const dashboard = useHomeDashboard();
  const focus = useFocus();
  const { triggerLight } = useHaptics();
  const [showAllTasks, setShowAllTasks] = useState(false);

  const data = dashboard.data;
  const pendingTasks = data?.todayTasks.filter((task) => !task.isCompleted).length ?? 0;
  const welcome = useWelcomeMessage({
    userName: data?.displayName ?? "",
    pendingTasks,
    completedTasks: data?.completedActivities ?? 0,
    hasResumeLesson: !!data?.resumeLesson,
    nextEvaluationDays: data?.nextEvaluation?.daysAway ?? null,
  });

  const showHomeSkeleton = useDelayedLoading(dashboard.isLoading, 100);
  if (showHomeSkeleton) return <HomeDashboardSkeleton />;
  if (dashboard.isLoading) return null;

  if (dashboard.isError || !data) {
    return (
      <div className="pb-10 pt-16">
        <Card className="mx-auto max-w-xl rounded-[24px] border border-border bg-card p-6 text-center">
          <RefreshCw className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold">{t("home.error.title")}</h1>
          <p className="mt-2 text-base text-muted-foreground">{t("home.error.description")}</p>
          <Button className="mt-5 min-h-12 rounded-[24px]" onClick={() => dashboard.refetch()}>
            {t("home.error.retry")}
          </Button>
        </Card>
      </div>
    );
  }

  const tasks = showAllTasks ? data.todayTasks : data.todayTasks.slice(0, VISIBLE_TASKS);
  const hiddenTasks = Math.max(0, data.todayTasks.length - VISIBLE_TASKS);
  const resume = data.resumeLesson;

  // La card in testa riflette soltanto il percorso reale e la sua lezione.
  const heroIsGenerating = !resume && data.isGenerating;
  const heroHasNoLessons = !resume && !data.isGenerating && data.hasContexts;

  const handleOpenPlan = () => {
    triggerLight();
    onOpenPlan();
  };

  const handleToggleTasks = () => {
    triggerLight();
    setShowAllTasks((value) => !value);
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

  return (
    <div className="min-w-0 pt-16 pb-4">
      <HomeHeader
        className="mb-4"
        greeting={welcome.greeting}
        userName={welcome.name || t("home.resume.studentFallback")}
        subtitle={welcome.subtitle}
      />

      <div className="flex min-w-0 flex-col gap-4">
        <CourseHeroCard
          courseTitle={resume?.courseTitle ?? null}
          contextId={resume?.contextId ?? null}
          eyebrowText={t("home.course.eyebrow")}
          lessonTitle={resume?.lessonTitle ?? null}
          lessonMetaText={
            resume
              ? t("lesson.lessonOf", { number: resume.lessonNumber, total: resume.lessonCount })
              : null
          }
          progressPercent={resume?.progressPercent ?? null}
          progressAriaLabel={
            resume
              ? t("home.course.progressAria", {
                  percent: Math.min(100, Math.max(0, Math.round(resume.progressPercent))),
                })
              : null
          }
          primaryCtaLabel={
            resume
              ? resume.lessonIndex > 0
                ? t("home.resume.continue")
                : t("home.resume.start")
              : null
          }
          onPrimaryCta={
            resume
              ? () => {
                  triggerLight();
                  onResumeLesson(resume.contextId, resume.lessonIndex);
                }
              : undefined
          }
          emptyTitle={
            heroIsGenerating
              ? t("home.resume.generatingTitle")
              : heroHasNoLessons
                ? t("home.resume.noLessonTitle")
                : t("home.resume.noContentTitle")
          }
          emptyDescription={
            heroIsGenerating
              ? t("home.resume.generatingDescription")
              : heroHasNoLessons
                ? t("home.resume.noLessonDescription")
                : t("home.resume.noContentDescription")
          }
          emptyCtaLabel={
            heroIsGenerating || heroHasNoLessons ? t("home.resume.openStudio") : t("home.resume.upload")
          }
          onEmptyCta={
            heroIsGenerating || heroHasNoLessons
              ? () => {
                  triggerLight();
                  onOpenStudio();
                }
              : () => {
                  triggerLight();
                  onUpload();
                }
          }
        />

        {/* Sotto il percorso resta solo il piano del giorno. */}
        <DailyTimeline
          title={t("home.today.title")}
          seeAllLabel={t("home.today.openPlan")}
          emptyTitle={t("home.today.emptyTitle")}
          emptyDescription={t("home.today.emptyDescription")}
          emptyCtaLabel={t("home.today.organize")}
          tasks={tasks.map((task) => ({
            id: task.id,
            title: task.title,
            time: task.time,
            subject: task.subject,
            isCompleted: task.isCompleted,
            kind: task.kind,
          }))}
          onTaskClick={(id) => {
            const task = data.todayTasks.find((item) => item.id === id);
            if (task) startTaskFocus(task);
          }}
          onSeeAll={hiddenTasks > 0 || showAllTasks ? handleToggleTasks : handleOpenPlan}
        />
      </div>
    </div>
  );
}
