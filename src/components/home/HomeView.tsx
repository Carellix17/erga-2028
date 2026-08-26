import { useMemo, useState, type CSSProperties } from "react";
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
import { HomeDashboardSkeleton } from "./HomeDashboardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCardBackground } from "@/components/studio/CourseCardBackground";
import { useFocus } from "@/contexts/FocusContext";
import { useHomeDashboard, type HomeTask } from "@/hooks/useHomeDashboard";
import { useWelcomeMessage } from "@/hooks/useWelcomeMessage";
import { useHaptics } from "@/hooks/useHaptics";
import { getSubjectAccent } from "@/lib/subjectColors";
import { cn } from "@/lib/utils";

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
  "border border-ink/[0.08] bg-off-white text-[#181516] shadow-[0_10px_30px_-24px_rgba(0,0,0,0.45)]";
const HOME_DARK_MATERIAL_CLASS =
  "dark:border-white/10 dark:bg-[rgba(26,26,26,0.85)] dark:text-[#FAFAFA] supports-[backdrop-filter]:dark:bg-[rgba(26,26,26,0.72)] supports-[backdrop-filter]:dark:backdrop-blur-md dark:shadow-[0_0_30px_rgba(255,255,255,0.08),0_18px_40px_-28px_rgba(0,0,0,0.72)]";
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

/**
 * Un piccolo segno editoriale, nero e geometrico, condiviso da tutti i blocchi
 * operativi della Home. È volutamente decorativo: il testo resta l'unica fonte
 * di significato per lettori di schermo.
 */
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

  return (
    <div className="relative isolate min-w-0 overflow-x-clip py-6">
      <div className="relative z-10 space-y-9 md:space-y-12">
        <div className="home-hero" data-testid="home-hero">
          <header className="home-welcome min-w-0">
            <p className="max-w-[calc(100%-6rem)] truncate text-sm font-semibold capitalize text-muted-foreground min-[360px]:max-w-[calc(100%-11.5rem)]">{todayLabel}</p>
            <h1 className="mt-4 flex flex-col gap-0">
              <span className="break-words font-display text-[clamp(2rem,7vw,3rem)] font-extrabold leading-[1.08] text-foreground">
                {welcome.greeting}
              </span>
              <span className="break-words font-display text-[clamp(2.35rem,8.5vw,3.8rem)] font-extrabold leading-[1.02] text-tertiary">
                {welcome.name}
              </span>
            </h1>
            <p className="mt-3 hidden max-w-2xl text-base font-medium leading-relaxed text-muted-foreground md:block">{welcome.subtitle}</p>
          </header>

          <section aria-labelledby="resume-title" className="min-w-0">
            {resume ? (
              <Card
                data-testid="resume-lesson-card"
                data-auto-contrast
                style={{ "--ambient-block-ink": getSubjectAccent(resume.courseTitle) } as CSSProperties}
                className="relative h-auto overflow-hidden border-inverse-surface bg-inverse-surface"
              >
                <CourseCardBackground
                  coverUrl={resume.coverUrl}
                  subjectColor={getSubjectAccent(resume.courseTitle)}
                  opacity={0.46}
                />
                <div className="relative z-10 p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* P28: chip e testi seguono l'inchiostro misurato sul fondo
                        reale del blocco (--contrast-ink/--contrast-surface),
                        così restano leggibili in entrambi i temi. */}
                    <Badge className="gap-1.5 border-0" style={{ backgroundColor: "rgb(var(--contrast-ink))", color: "rgb(var(--contrast-surface))" }}>
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      {t("home.resume.eyebrow")}
                    </Badge>
                    <Badge variant="outline" className="border-contrast bg-contrast-soft text-contrast">
                      {resume.courseTitle}
                    </Badge>
                  </div>
                  <h2 id="resume-title" className="mt-3 max-w-2xl font-display text-[clamp(1.5rem,5vw,2.25rem)] font-extrabold leading-[1.12] tracking-tight">
                    {resume.lessonTitle}
                  </h2>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-contrast-secondary">
                    <span>{t("home.resume.lessonCount", { current: resume.lessonNumber, total: resume.lessonCount })}</span>
                    <span aria-hidden="true">·</span>
                    <span>{t("home.resume.progress", { progress: resume.progressPercent })}</span>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => {
                      triggerLight();
                      onResumeLesson(resume.contextId, resume.lessonIndex);
                    }}
                    style={{ backgroundColor: "rgb(var(--contrast-ink))", color: "rgb(var(--contrast-surface))" }}
                    className="mt-5 min-h-12 w-full gap-2 rounded-button px-6 text-sm transition-opacity hover:opacity-90 sm:w-auto sm:min-w-[220px]"
                  >
                    <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    {resume.lessonNumber > 1 ? t("home.resume.continue") : t("home.resume.start")}
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="h-auto border-card bg-card p-6 sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-card bg-surface-container-high">
                  {data.isGenerating ? <RefreshCw className="h-5 w-5 animate-spin" aria-hidden="true" /> : <FileUp className="h-5 w-5" aria-hidden="true" />}
                </div>
                <h2 id="resume-title" className="mt-4 font-display text-2xl font-bold">
                  {data.isGenerating ? t("home.resume.generatingTitle") : data.hasContexts ? t("home.resume.noLessonTitle") : t("home.resume.noContentTitle")}
                </h2>
                <p className="mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
                  {data.isGenerating ? t("home.resume.generatingDescription") : data.hasContexts ? t("home.resume.noLessonDescription") : t("home.resume.noContentDescription")}
                </p>
                <Button
                  className="mt-5 min-h-12 rounded-button"
                  onClick={() => {
                    triggerLight();
                    if (data.hasContexts) {
                      onOpenStudio();
                      return;
                    }
                    onUpload();
                  }}
                >
                  {data.hasContexts ? t("home.resume.openStudio") : t("home.resume.upload")}
                </Button>
              </Card>
            )}
          </section>
        </div>

        <section aria-labelledby="today-plan-title" className="min-w-0 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("home.today.eyebrow")}</p>
              <h2 id="today-plan-title" className="mt-1 font-display text-2xl font-bold tracking-tight">{t("home.today.title")}</h2>
            </div>
            <Button variant="ghost" size="sm" className="min-h-11 rounded-button" onClick={handleOpenPlan}>
              {t("home.today.openPlan")}
            </Button>
          </div>

          {data.nextEvaluation && (
            <button
              type="button"
              onClick={handleOpenPlan}
              className={cn(
                HOME_BLOCK_CLASS,
                "group flex min-h-[84px] w-full items-center gap-3 rounded-lg p-4 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-20px_rgba(0,0,0,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink dark:focus-visible:ring-black focus-visible:ring-offset-2 motion-reduce:transform-none dark:border-black/[0.08] dark:text-[#11110E]",
              )}
            >
              <MinimalArtwork Icon={CalendarDays} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wider text-foreground/60 dark:text-black/60">
                  {t("home.evaluation.inDays", { count: data.nextEvaluation.daysAway })}
                </span>
                <span className="mt-1 block truncate text-base font-bold">{data.nextEvaluation.subject} · {data.nextEvaluation.title}</span>
              </span>
            </button>
          )}

          {tasks.length > 0 ? (
            <Card data-testid="home-daily-plan-card" className={cn(HOME_BLOCK_CLASS, HOME_DARK_MATERIAL_CLASS, "overflow-hidden rounded-lg")}>
              <CardContent className="p-2 sm:p-3">
                <div id="today-task-list" role="list">
                  {tasks.map((task, index) => (
                    <div
                      key={task.id}
                      role="listitem"
                      className={cn(
                        "flex min-h-[76px] items-center gap-3 rounded-md px-2 py-3 text-foreground sm:px-3",
                        HOME_DARK_TITLE_CLASS,
                        index !== tasks.length - 1 && "border-b border-ink/[0.08] dark:border-white/10",
                        task.isCompleted && "opacity-70",
                      )}
                    >
                      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full border border-ink/15 text-foreground dark:border-white/20 dark:text-[#FAFAFA]", task.isCompleted && "bg-ink text-cream dark:bg-[#FAFAFA] dark:text-[#111111]")}>
                        {task.isCompleted ? <Check className="h-5 w-5" aria-hidden="true" /> : task.kind === "study" ? <BookOpen className="h-5 w-5 stroke-[1.6]" aria-hidden="true" /> : <CalendarDays className="h-5 w-5 stroke-[1.6]" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("break-words text-base font-bold leading-snug", HOME_DARK_TITLE_CLASS, task.isCompleted && "line-through")}>{task.title}</p>
                        <p className={cn("mt-1 flex flex-wrap gap-x-2 text-sm text-foreground/60", HOME_DARK_MUTED_CLASS)}>
                          <span>{task.subject}</span>
                          {task.time && <><span aria-hidden="true">·</span><span>{task.time}</span></>}
                        </p>
                      </div>
                      {task.canStartFocus && (
                        <Button size="icon-sm" variant="outline" className={cn("h-11 w-11 shrink-0 rounded-full border-ink/15 bg-transparent text-foreground hover:bg-ink hover:text-cream", HOME_DARK_OUTLINE_BUTTON_CLASS)} aria-label={t("home.today.startFocus", { title: task.title })} onClick={() => startTaskFocus(task)}>
                          <Timer className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {hiddenTasks > 0 && (
                  <Button variant="ghost" className={cn("mt-1 min-h-11 w-full rounded-button text-foreground hover:bg-ink/[0.06]", HOME_DARK_GHOST_BUTTON_CLASS)} aria-expanded={showAllTasks} aria-controls="today-task-list" onClick={handleToggleTasks}>
                    {showAllTasks ? t("home.today.showLess") : t("home.today.showAll", { count: hiddenTasks })}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card data-testid="home-daily-plan-card" className={cn(HOME_BLOCK_CLASS, HOME_DARK_MATERIAL_CLASS, "rounded-lg p-5")}>
              <MinimalArtwork Icon={Clock3} lightOnDarkCard />
              <h3 className={cn("mt-3 font-display text-lg font-bold", HOME_DARK_TITLE_CLASS)}>{t("home.today.emptyTitle")}</h3>
              <p className={cn("mt-1 text-base text-foreground/65", HOME_DARK_BODY_CLASS)}>{t("home.today.emptyDescription")}</p>
              <Button variant="outline" className={cn("mt-4 min-h-11 rounded-button border-ink/15 bg-transparent text-foreground hover:bg-ink hover:text-cream", HOME_DARK_INVERTED_BUTTON_CLASS)} onClick={handleOpenPlan}>{t("home.today.organize")}</Button>
            </Card>
          )}
        </section>

        <section aria-labelledby="focus-timer-title" className="space-y-4 pb-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("home.focusTimer.eyebrow")}</p>
            <h2 id="focus-timer-title" className="mt-1 font-display text-xl font-bold">{t("home.focusTimer.title")}</h2>
          </div>
          <Card data-testid="home-focus-timer-card" className={cn(HOME_BLOCK_CLASS, HOME_DARK_MATERIAL_CLASS, "rounded-lg p-5 sm:p-6")}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <MinimalArtwork Icon={Timer} lightOnDarkCard />
                <div>
                  <h3 className={cn("font-display text-lg font-extrabold tracking-tight text-foreground sm:text-xl", HOME_DARK_TITLE_CLASS)}>
                    {t("home.focusTimer.cardTitle")}
                  </h3>
                  <p className={cn("mt-1 max-w-sm text-sm font-medium leading-relaxed text-foreground/70", HOME_DARK_BODY_CLASS)}>
                    {t("home.focusTimer.description")}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3.5 sm:items-end">
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleAdjustFocusMinutes("decrease")}
                    disabled={focusMinutes <= 5}
                    aria-label={t("home.focusTimer.decreaseAria")}
                    className={cn("h-12 w-12 rounded-full border-ink/20 bg-transparent text-foreground transition-all hover:bg-ink hover:text-cream disabled:opacity-30 active:scale-95", HOME_DARK_OUTLINE_BUTTON_CLASS)}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>

                  <div className="min-w-[90px] text-center">
                    <span className={cn("block font-display text-4xl font-black tabular-nums tracking-tight text-foreground sm:text-5xl", HOME_DARK_TITLE_CLASS)}>
                      {focusMinutes}
                    </span>
                    <span className={cn("block text-xs font-bold uppercase tracking-wider text-foreground/60", HOME_DARK_MUTED_CLASS)}>
                      {t("home.focusTimer.minutes")}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleAdjustFocusMinutes("increase")}
                    disabled={focusMinutes >= 180}
                    aria-label={t("home.focusTimer.increaseAria")}
                    className={cn("h-12 w-12 rounded-full border-ink/20 bg-transparent text-foreground transition-all hover:bg-ink hover:text-cream disabled:opacity-30 active:scale-95", HOME_DARK_OUTLINE_BUTTON_CLASS)}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>

                <Button
                  type="button"
                  onClick={handleStartFocusTimer}
                  aria-label={t("home.focusTimer.start")}
                  className={cn("min-h-12 w-full gap-2 rounded-full bg-ink px-6 text-sm font-bold text-cream shadow-level-1 transition-transform hover:opacity-90 active:scale-95 sm:w-auto sm:min-w-[140px]", HOME_DARK_INVERTED_BUTTON_CLASS)}
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  <span>{t("home.focusTimer.start")}</span>
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
