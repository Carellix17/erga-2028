import { useMemo, useState, type CSSProperties } from "react";
import {
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  Clock3,
  FileUp,
  Play,
  RefreshCw,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCardBackground } from "@/components/studio/CourseCardBackground";
import { useFocus } from "@/contexts/FocusContext";
import { useHomeDashboard, type HomeTask } from "@/hooks/useHomeDashboard";
import { useWelcomeMessage } from "@/hooks/useWelcomeMessage";
import { getSubjectAccent } from "@/lib/subjectColors";
import { cn } from "@/lib/utils";

interface HomeViewProps {
  onOpenStudio: () => void;
  onResumeLesson: (contextId: string, lessonIndex: number) => void;
  onOpenPlan: () => void;
  onOpenPratica: () => void;
  onOpenCognitive: () => void;
  onUpload: () => void;
}

const VISIBLE_TASKS = 3;

const HOME_BLOCK_CLASS =
  "border border-black/[0.08] bg-[#F8F7DD] text-[#11110E] shadow-[0_10px_30px_-24px_rgba(0,0,0,0.45)]";

interface MinimalArtworkProps {
  Icon: typeof Timer;
  compact?: boolean;
}

/**
 * Un piccolo segno editoriale, nero e geometrico, condiviso da tutti i blocchi
 * operativi della Home. È volutamente decorativo: il testo resta l'unica fonte
 * di significato per lettori di schermo.
 */
function MinimalArtwork({ Icon, compact = false }: MinimalArtworkProps) {
  return (
    <span
      data-testid="home-minimal-artwork"
      aria-hidden="true"
      className={cn(
        "relative isolate grid shrink-0 place-items-center overflow-hidden text-black",
        compact
          ? "h-9 w-9 [&_svg]:!h-6 [&_svg]:!w-6"
          : "h-14 w-16 [&_svg]:!h-9 [&_svg]:!w-9",
      )}
    >
      <span className="absolute inset-x-1 top-1/2 h-px -rotate-[18deg] bg-black/20" />
      <span className="absolute right-1 top-1 h-3 w-3 rounded-full border border-black/30" />
      <Icon className={cn("relative z-10 stroke-[1.6]", compact ? "h-6 w-6" : "h-9 w-9")} />
    </span>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-8 py-6" aria-label="Caricamento Home">
      <div className="space-y-2">
        <Skeleton className="h-5 w-28 rounded-pill" />
        <Skeleton className="h-8 w-48 rounded-button" />
        <Skeleton className="h-9 w-36 rounded-button" />
        <Skeleton className="h-4 w-64 rounded-full" />
      </div>
      <Skeleton className="h-56 rounded-card" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-44 rounded-button" />
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-20 rounded-card" />
      </div>
    </div>
  );
}

export function HomeView({
  onOpenStudio,
  onResumeLesson,
  onOpenPlan,
  onOpenPratica,
  onOpenCognitive,
  onUpload,
}: HomeViewProps) {
  const { t, i18n } = useTranslation();
  const dashboard = useHomeDashboard();
  const focus = useFocus();
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

  const todayLabel = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { weekday: "long", day: "numeric", month: "long" }).format(new Date()),
    [i18n.language],
  );

  if (dashboard.isLoading) return <HomeSkeleton />;

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

  const startTaskFocus = (task: HomeTask) => {
    if (!task.canStartFocus) return;
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
        <div className="space-y-6 md:space-y-8">
          <header className="min-w-0">
            <p className="max-w-[calc(100%-6rem)] truncate text-sm font-semibold capitalize text-muted-foreground min-[360px]:max-w-[calc(100%-11.5rem)]">{todayLabel}</p>
            <h1 className="mt-3 flex flex-col gap-0">
              <span className="break-words font-display text-[clamp(1.55rem,5.5vw,2.1rem)] font-extrabold leading-tight text-foreground">
                {welcome.greeting}
              </span>
              <span className="break-words font-display text-[clamp(1.8rem,6vw,2.45rem)] font-extrabold leading-tight text-tertiary">
                {welcome.name}
              </span>
            </h1>
            <p className="mt-2 hidden text-base font-medium text-muted-foreground md:block">{welcome.subtitle}</p>
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
                    onClick={() => onResumeLesson(resume.contextId, resume.lessonIndex)}
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
                <Button className="mt-5 min-h-12 rounded-button" onClick={data.hasContexts ? onOpenStudio : onUpload}>
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
            <Button variant="ghost" size="sm" className="min-h-11 rounded-button" onClick={onOpenPlan}>
              {t("home.today.openPlan")}
            </Button>
          </div>

          {data.nextEvaluation && (
            <button
              type="button"
              onClick={onOpenPlan}
              className={cn(
                HOME_BLOCK_CLASS,
                "group flex min-h-[84px] w-full items-center gap-3 rounded-lg p-4 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-20px_rgba(0,0,0,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 motion-reduce:transform-none",
              )}
            >
              <MinimalArtwork Icon={CalendarDays} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wider text-black/60">
                  {t("home.evaluation.inDays", { count: data.nextEvaluation.daysAway })}
                </span>
                <span className="mt-1 block truncate text-base font-bold">{data.nextEvaluation.subject} · {data.nextEvaluation.title}</span>
              </span>
            </button>
          )}

          {tasks.length > 0 ? (
            <Card className={cn(HOME_BLOCK_CLASS, "overflow-hidden rounded-lg")}>
              <CardContent className="p-2 sm:p-3">
                <div id="today-task-list" role="list">
                  {tasks.map((task, index) => (
                    <div
                      key={task.id}
                      role="listitem"
                      className={cn(
                        "flex min-h-[76px] items-center gap-3 rounded-md px-2 py-3 text-[#11110E] sm:px-3",
                        index !== tasks.length - 1 && "border-b border-black/[0.08]",
                        task.isCompleted && "opacity-70",
                      )}
                    >
                      <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full border border-black/15 text-black", task.isCompleted && "bg-black text-[#F8F7DD]")}>
                        {task.isCompleted ? <Check className="h-5 w-5" aria-hidden="true" /> : task.kind === "study" ? <BookOpen className="h-5 w-5 stroke-[1.6]" aria-hidden="true" /> : <CalendarDays className="h-5 w-5 stroke-[1.6]" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("break-words text-base font-bold leading-snug", task.isCompleted && "line-through")}>{task.title}</p>
                        <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-black/60">
                          <span>{task.subject}</span>
                          {task.time && <><span aria-hidden="true">·</span><span>{task.time}</span></>}
                        </p>
                      </div>
                      {task.canStartFocus && (
                        <Button size="icon-sm" variant="outline" className="h-11 w-11 shrink-0 rounded-full border-black/15 bg-transparent text-black hover:bg-black hover:text-[#F8F7DD]" aria-label={t("home.today.startFocus", { title: task.title })} onClick={() => startTaskFocus(task)}>
                          <Timer className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {hiddenTasks > 0 && (
                  <Button variant="ghost" className="mt-1 min-h-11 w-full rounded-button text-black hover:bg-black/[0.06]" aria-expanded={showAllTasks} aria-controls="today-task-list" onClick={() => setShowAllTasks((value) => !value)}>
                    {showAllTasks ? t("home.today.showLess") : t("home.today.showAll", { count: hiddenTasks })}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className={cn(HOME_BLOCK_CLASS, "rounded-lg p-5")}>
              <MinimalArtwork Icon={Clock3} />
              <h3 className="mt-3 font-display text-lg font-bold">{t("home.today.emptyTitle")}</h3>
              <p className="mt-1 text-base text-black/65">{t("home.today.emptyDescription")}</p>
              <Button variant="outline" className="mt-4 min-h-11 rounded-button border-black/15 bg-transparent text-black hover:bg-black hover:text-[#F8F7DD]" onClick={onOpenPlan}>{t("home.today.organize")}</Button>
            </Card>
          )}
        </section>

        <section aria-labelledby="quick-tools-title" className="space-y-4 pb-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("home.quick.eyebrow")}</p>
            <h2 id="quick-tools-title" className="mt-1 font-display text-xl font-bold">{t("home.quick.title")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { id: "focus", title: t("home.quick.focus"), description: t("home.quick.focusDescription"), Icon: Timer, action: focus.openSetup },
              { id: "practice", title: t("home.quick.practice"), description: t("home.quick.practiceDescription"), Icon: Zap, action: onOpenPratica },
              { id: "upload", title: t("home.quick.upload"), description: t("home.quick.uploadDescription"), Icon: FileUp, action: onUpload },
              { id: "cognitive", title: t("home.quick.cognitive"), description: t("home.quick.cognitiveDescription"), Icon: Brain, action: onOpenCognitive },
            ].map((tool) => (
              <Button
                key={tool.id}
                type="button"
                variant="outline"
                aria-label={`${tool.title}: ${tool.description}`}
                onClick={tool.action}
                className={cn(
                  HOME_BLOCK_CLASS,
                  "group h-auto min-h-[164px] flex-col items-start justify-between whitespace-normal rounded-lg p-4 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[#F8F7DD] hover:shadow-[0_14px_30px_-20px_rgba(0,0,0,0.38)] motion-reduce:transform-none sm:p-5",
                )}
              >
                <MinimalArtwork Icon={tool.Icon} />
                <span className="mt-5 block">
                  <span className="block text-base font-extrabold tracking-[-0.02em]">{tool.title}</span>
                  <span className="mt-1 block text-sm font-medium leading-snug text-black/65">{tool.description}</span>
                </span>
              </Button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
