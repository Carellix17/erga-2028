import { useMemo, useState } from "react";
import {
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  Clock3,
  FileUp,
  Flame,
  Play,
  RefreshCw,
  Sparkles,
  Target,
  Timer,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

function HomeSkeleton() {
  return (
    <div className="space-y-8 py-6" aria-label="Caricamento Home">
      <div className="space-y-2">
        <Skeleton className="h-5 w-28 rounded-pill" />
        <Skeleton className="h-8 w-48 rounded-button" />
        <Skeleton className="h-9 w-36 rounded-button" />
        <Skeleton className="h-4 w-64 rounded-full" />
      </div>
      <Skeleton className="h-72 rounded-card" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-44 rounded-button" />
        <Skeleton className="h-20 rounded-card" />
        <Skeleton className="h-20 rounded-card" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
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
          <p className="mt-2 text-base font-medium text-muted-foreground">{welcome.subtitle}</p>
        </header>

        <section aria-labelledby="resume-title" className="min-w-0">
          {resume ? (
            <Card className="relative min-h-[280px] overflow-hidden border-primary/15 bg-inverse-surface text-inverse-on-surface">
              <CourseCardBackground
                coverUrl={resume.coverUrl}
                subjectColor={getSubjectAccent(resume.courseTitle)}
                opacity={0.46}
              />
              <CardHeader className="relative z-10 p-5 pb-3 sm:p-6 sm:pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="gap-1.5 border-0 bg-background text-foreground">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />
                    {t("home.resume.eyebrow")}
                  </Badge>
                  <Badge variant="outline" className="border-inverse-on-surface/30 bg-inverse-surface/70 text-inverse-on-surface">
                    {resume.courseTitle}
                  </Badge>
                </div>
                <h2 id="resume-title" className="max-w-2xl pt-3 font-display text-[clamp(1.5rem,5vw,2.25rem)] font-extrabold leading-[1.12] tracking-tight text-inverse-on-surface">
                  {resume.lessonTitle}
                </h2>
              </CardHeader>
              <CardContent className="relative z-10 p-5 pt-0 sm:p-6 sm:pt-0">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-inverse-on-surface/80">
                  <span>{t("home.resume.lessonCount", { current: resume.lessonNumber, total: resume.lessonCount })}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t("home.resume.progress", { progress: resume.progressPercent })}</span>
                </div>
                <Button
                  size="lg"
                  onClick={() => onResumeLesson(resume.contextId, resume.lessonIndex)}
                  className="mt-5 min-h-12 w-full gap-2 rounded-button bg-background px-6 text-sm text-foreground hover:bg-surface-container-high sm:w-auto sm:min-w-[220px]"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  {resume.lessonNumber > 1 ? t("home.resume.continue") : t("home.resume.start")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-outline-variant/60 bg-card p-6 sm:p-8">
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
            <button type="button" onClick={onOpenPlan} className="flex min-h-16 w-full items-center gap-3 rounded-card border border-warning/25 bg-warning-container/45 p-4 text-left">
              <CalendarDays className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("home.evaluation.inDays", { count: data.nextEvaluation.daysAway })}
                </span>
                <span className="block truncate text-base font-bold">{data.nextEvaluation.subject} · {data.nextEvaluation.title}</span>
              </span>
            </button>
          )}

          {tasks.length > 0 ? (
            <Card className="overflow-hidden border-outline-variant/60 bg-card shadow-level-1">
              <CardContent className="p-2 sm:p-3">
                <div id="today-task-list" role="list">
                  {tasks.map((task, index) => (
                    <div
                      key={task.id}
                      role="listitem"
                      className={cn(
                        "flex min-h-[72px] items-center gap-3 rounded-button px-2 py-3 sm:px-3",
                        index !== tasks.length - 1 && "border-b border-foreground/[0.07]",
                        task.isCompleted && "opacity-70",
                      )}
                    >
                      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-button", task.isCompleted ? "bg-success text-success-foreground" : "bg-surface-container-high text-foreground")}>
                        {task.isCompleted ? <Check className="h-5 w-5" aria-hidden="true" /> : task.kind === "study" ? <BookOpen className="h-5 w-5" aria-hidden="true" /> : <CalendarDays className="h-5 w-5" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("break-words text-base font-bold leading-snug", task.isCompleted && "line-through")}>{task.title}</p>
                        <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-muted-foreground">
                          <span>{task.subject}</span>
                          {task.time && <><span aria-hidden="true">·</span><span>{task.time}</span></>}
                        </p>
                      </div>
                      {task.canStartFocus && (
                        <Button size="icon-sm" variant="outline" className="h-11 w-11 shrink-0 rounded-button" aria-label={t("home.today.startFocus", { title: task.title })} onClick={() => startTaskFocus(task)}>
                          <Timer className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {hiddenTasks > 0 && (
                  <Button variant="ghost" className="mt-1 min-h-11 w-full rounded-button" aria-expanded={showAllTasks} aria-controls="today-task-list" onClick={() => setShowAllTasks((value) => !value)}>
                    {showAllTasks ? t("home.today.showLess") : t("home.today.showAll", { count: hiddenTasks })}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-outline-variant bg-card p-5">
              <Clock3 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <h3 className="mt-3 font-display text-lg font-bold">{t("home.today.emptyTitle")}</h3>
              <p className="mt-1 text-base text-muted-foreground">{t("home.today.emptyDescription")}</p>
              <Button variant="outline" className="mt-4 min-h-11 rounded-button" onClick={onOpenPlan}>{t("home.today.organize")}</Button>
            </Card>
          )}
        </section>

        <section aria-labelledby="rhythm-title" className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("home.rhythm.eyebrow")}</p>
            <h2 id="rhythm-title" className="mt-1 font-display text-xl font-bold">{t("home.rhythm.title")}</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t("home.rhythm.minutes"), value: data.minutesToday, Icon: Timer },
              { label: t("home.rhythm.sessions"), value: data.sessionsToday, Icon: Target },
              { label: t("home.rhythm.streak"), value: data.streakDays, Icon: Flame },
            ].map(({ label, value, Icon }) => (
              <Card key={label} className="min-w-0 border-outline-variant/60 bg-card p-3 shadow-none sm:p-4">
                <Icon className="h-4 w-4 text-tertiary" aria-hidden="true" />
                <p className="mt-2 font-display text-2xl font-extrabold tabular-nums">{value}</p>
                <p className="mt-1 break-words text-sm leading-tight text-muted-foreground">{label}</p>
              </Card>
            ))}
          </div>
          {data.sessionsToday === 0 && <p className="text-sm text-muted-foreground">{t("home.rhythm.empty")}</p>}
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
              <Button key={tool.id} type="button" variant="outline" onClick={tool.action} className="h-auto min-h-[116px] flex-col items-start justify-start whitespace-normal rounded-card border-outline-variant/60 bg-card p-4 text-left shadow-none">
                <span className="grid h-10 w-10 place-items-center rounded-button bg-surface-container-high"><tool.Icon className="h-4 w-4" aria-hidden="true" /></span>
                <span className="mt-3 block text-base font-bold">{tool.title}</span>
                <span className="mt-1 block text-sm font-medium leading-snug text-muted-foreground">{tool.description}</span>
              </Button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
