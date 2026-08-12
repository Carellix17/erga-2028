import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Play,
  Sparkles,
  Target,
  Timer,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface HomeViewProps {
  onOpenStudio: () => void;
  onOpenPratica: () => void;
}

type DashboardTaskStatus = "completed" | "current" | "upcoming";

/**
 * Dati dimostrativi della dashboard. Nessun valore mostrato in questa view
 * dipende da API o servizi esterni.
 */
const MOCK_DASHBOARD_DATA = (() => {
  const now = new Date();
  const hour = now.getHours();

  return {
    greeting:
      hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera",
    todayLabel: new Intl.DateTimeFormat("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(now),
    student: {
      name: "Alessandro",
      level: 8,
      levelName: "Esploratore",
      levelProgress: 72,
      studyMinutesCompleted: 42,
      dailyGoalMinutes: 60,
      streakDays: 6,
    },
    lessonsToday: [
      {
        id: "lesson-industrial-revolution",
        subject: "Storia",
        title:
          "La rivoluzione industriale e la nascita della società contemporanea",
        startTime: "15:30",
        durationMinutes: 5,
        preparationProgress: 68,
      },
      {
        id: "lesson-functions",
        subject: "Matematica",
        title: "Ripasso delle funzioni esponenziali",
        startTime: "17:00",
        durationMinutes: 20,
        preparationProgress: 34,
      },
    ],
    upcomingTasks: [
      {
        id: "task-history-notes",
        title: "Rileggi gli appunti sulla rivoluzione industriale",
        subject: "Storia",
        timeLabel: "14:45",
        status: "completed" as DashboardTaskStatus,
      },
      {
        id: "task-math-exercises",
        title: "Completa 8 esercizi sulle funzioni esponenziali",
        subject: "Matematica",
        timeLabel: "16:20",
        status: "current" as DashboardTaskStatus,
      },
      {
        id: "task-english-review",
        title: "Prepara il vocabolario per la prossima verifica di inglese",
        subject: "Inglese",
        timeLabel: "18:10",
        status: "upcoming" as DashboardTaskStatus,
      },
    ],
    taskStatusLabels: {
      completed: "Completato",
      current: "In corso",
      upcoming: "Da fare",
    } as Record<DashboardTaskStatus, string>,
    quickTools: [
      {
        id: "pomodoro",
        title: "Pomodoro",
        description: "Focus da 25 min",
        eyebrow: "Timer",
        icon: Timer,
        iconClassName: "bg-primary text-primary-foreground",
        toastTitle: "Pomodoro pronto",
        toastDescription: "Timer mock impostato su 25 minuti.",
      },
      {
        id: "practice",
        title: "Pratica rapida",
        description: "12 esercizi pronti",
        eyebrow: "Allenati",
        icon: Zap,
        iconClassName: "bg-lime text-[#0C1F12]",
        toastTitle: "",
        toastDescription: "",
      },
      {
        id: "studio",
        title: "Area Studio",
        description: "Riprendi il modulo",
        eyebrow: "Continua",
        icon: BookOpen,
        iconClassName: "bg-secondary text-tertiary",
        toastTitle: "",
        toastDescription: "",
      },
    ],
  };
})();

export function HomeView({ onOpenStudio, onOpenPratica }: HomeViewProps) {
  const { toast } = useToast();
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(() =>
    MOCK_DASHBOARD_DATA.upcomingTasks
      .filter((task) => task.status === "completed")
      .map((task) => task.id),
  );

  const { student, lessonsToday, upcomingTasks, quickTools } =
    MOCK_DASHBOARD_DATA;
  const nextLesson = lessonsToday[0];
  const dailyProgress = Math.min(
    100,
    Math.round(
      (student.studyMinutesCompleted / student.dailyGoalMinutes) * 100,
    ),
  );
  const completedTasksCount = completedTaskIds.length;

  const toggleTask = (taskId: string, checked: boolean) => {
    setCompletedTaskIds((current) =>
      checked
        ? [...new Set([...current, taskId])]
        : current.filter((id) => id !== taskId),
    );
  };

  const handleToolClick = (toolId: string) => {
    if (toolId === "practice") {
      onOpenPratica();
      return;
    }

    if (toolId === "studio") {
      onOpenStudio();
      return;
    }

    const tool = quickTools.find((item) => item.id === toolId);
    if (tool) {
      toast({ title: tool.toastTitle, description: tool.toastDescription });
    }
  };

  return (
    <div className="relative isolate min-w-0 overflow-x-clip py-6 sm:py-8">
      {/* Luce ambientale decorativa: resta confinata alla dashboard. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-20 -z-10 h-56 w-56 rounded-full bg-tertiary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 top-72 -z-10 h-64 w-64 rounded-full bg-lime/10 blur-3xl"
      />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        {/* Header di benvenuto */}
        <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <CalendarDays
                className="h-3.5 w-3.5 text-tertiary"
                aria-hidden="true"
              />
              <span className="capitalize">
                {MOCK_DASHBOARD_DATA.todayLabel}
              </span>
              <span
                aria-hidden="true"
                className="h-1 w-1 rounded-full bg-muted-foreground/40"
              />
              <span>{lessonsToday.length} lezioni oggi</span>
            </div>
            <h1 className="max-w-2xl break-words font-display text-[clamp(1.9rem,6vw,3rem)] font-extrabold leading-[1.04] tracking-tight text-foreground [overflow-wrap:anywhere]">
              {MOCK_DASHBOARD_DATA.greeting},{" "}
              <span className="text-tertiary">{student.name}</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Il tuo ritmo è buono. Completa la prossima sessione per
              avvicinarti all’obiettivo di oggi.
            </p>
          </div>

          <Card className="w-full shrink-0 bg-background/95 p-4 supports-[backdrop-filter]:bg-background/80 sm:w-[260px]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Livello {student.level}
                </p>
                <p className="truncate text-sm font-bold text-foreground">
                  {student.levelName}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="shrink-0 border border-foreground/5"
              >
                {student.levelProgress}%
              </Badge>
            </div>
            <Progress
              value={student.levelProgress}
              aria-label={`Progresso livello ${student.levelProgress}%`}
              className="mt-3 h-2 bg-secondary/80"
            />
          </Card>
        </header>

        {/* Sessione principale + riepilogo giornaliero */}
        <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <Card className="relative min-w-0 overflow-hidden border-white/50 bg-background/95 shadow-level-2 supports-[backdrop-filter]:bg-background/80 dark:border-white/10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-tertiary/15 blur-3xl"
            />
            <CardHeader className="relative z-10 p-5 pb-3 sm:p-6 sm:pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="gap-1.5 border-0 bg-primary text-primary-foreground">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Prossima sessione
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-background/50 text-foreground backdrop-blur-sm"
                >
                  {nextLesson.subject}
                </Badge>
              </div>
              <h2
                id="next-lesson-title"
                className="max-w-2xl break-words pt-2 font-display text-2xl font-extrabold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-3xl"
              >
                {nextLesson.title}
              </h2>
            </CardHeader>
            <CardContent className="relative z-10 p-5 pt-1 sm:p-6 sm:pt-1">
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3
                    className="h-4 w-4 text-tertiary"
                    aria-hidden="true"
                  />
                  Oggi, {nextLesson.startTime}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Timer className="h-4 w-4 text-tertiary" aria-hidden="true" />
                  Sessione guidata
                </span>
              </div>

              <div className="mt-5 max-w-md">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
                  <span className="text-muted-foreground">
                    Preparazione lezione
                  </span>
                  <span className="tabular-nums text-foreground">
                    {nextLesson.preparationProgress}%
                  </span>
                </div>
                <Progress
                  value={nextLesson.preparationProgress}
                  aria-label={`Preparazione lezione ${nextLesson.preparationProgress}%`}
                  className="h-2 bg-secondary/80"
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Un ripasso breve, costruito sul tuo piano di oggi.
                </p>
                <Button
                  onClick={onOpenStudio}
                  className="w-full shrink-0 gap-2 sm:w-auto"
                >
                  <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                  Inizia lezione · {nextLesson.durationMinutes} min
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 bg-background/95 supports-[backdrop-filter]:bg-background/75">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    Ritmo di oggi
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
                    Obiettivo giornaliero
                  </h2>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
                  <Target className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-3">
              <div className="flex items-end gap-2">
                <span className="font-display text-4xl font-extrabold tracking-tight text-foreground tabular-nums">
                  {student.studyMinutesCompleted}
                </span>
                <span className="pb-1 text-sm font-semibold text-muted-foreground">
                  / {student.dailyGoalMinutes} min
                </span>
              </div>
              <Progress
                value={dailyProgress}
                aria-label={`Obiettivo giornaliero ${dailyProgress}%`}
                className="mt-4 h-2.5 bg-secondary/80"
              />

              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <div className="min-w-0 rounded-xl border border-foreground/10 bg-background/55 p-3 backdrop-blur-sm dark:border-white/10">
                  <CheckCircle2
                    className="h-4 w-4 text-tertiary"
                    aria-hidden="true"
                  />
                  <p className="mt-2 text-lg font-extrabold tracking-tight text-foreground tabular-nums">
                    {completedTasksCount}/{upcomingTasks.length}
                  </p>
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    Attività
                  </p>
                </div>
                <div className="min-w-0 rounded-xl border border-foreground/10 bg-background/55 p-3 backdrop-blur-sm dark:border-white/10">
                  <Flame className="h-4 w-4 text-warning" aria-hidden="true" />
                  <p className="mt-2 text-lg font-extrabold tracking-tight text-foreground tabular-nums">
                    {student.streakDays} giorni
                  </p>
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    Serie attiva
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Piano di studio + strumenti rapidi */}
        <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <Card className="min-w-0 bg-background/95 supports-[backdrop-filter]:bg-background/75">
            <CardHeader className="flex-row items-center justify-between gap-3 p-5 pb-3 sm:p-6 sm:pb-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Agenda
                </p>
                <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Piano di studio del giorno
                </h2>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {completedTasksCount}/{upcomingTasks.length}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-1 sm:p-4 sm:pt-1">
              {upcomingTasks.map((task) => {
                const isCompleted = completedTaskIds.includes(task.id);
                const visualStatus: DashboardTaskStatus = isCompleted
                  ? "completed"
                  : task.status === "completed"
                    ? "upcoming"
                    : task.status;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex min-w-0 items-start gap-3 rounded-2xl border border-transparent px-3 py-3 transition-colors duration-150 sm:items-center",
                      visualStatus === "current" &&
                        "border-primary/10 bg-primary/[0.05]",
                      isCompleted && "bg-secondary/45",
                    )}
                  >
                    <Checkbox
                      id={task.id}
                      checked={isCompleted}
                      onCheckedChange={(checked) =>
                        toggleTask(task.id, checked === true)
                      }
                      aria-label={`Segna come ${isCompleted ? "da fare" : "completata"}: ${task.title}`}
                      className="mt-0.5 h-5 w-5 rounded-md border-foreground/20 sm:mt-0"
                    />
                    <label
                      htmlFor={task.id}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <span
                        className={cn(
                          "block break-words text-sm font-bold leading-snug text-foreground [overflow-wrap:anywhere] sm:line-clamp-1",
                          isCompleted && "text-muted-foreground line-through",
                        )}
                      >
                        {task.title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{task.subject}</span>
                        <span aria-hidden="true">·</span>
                        <span>{task.timeLabel}</span>
                      </span>
                    </label>
                    <Badge
                      variant={
                        visualStatus === "current"
                          ? "default"
                          : visualStatus === "completed"
                            ? "secondary"
                            : "outline"
                      }
                      className="hidden shrink-0 sm:inline-flex"
                    >
                      {MOCK_DASHBOARD_DATA.taskStatusLabels[visualStatus]}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="min-w-0 bg-background/95 supports-[backdrop-filter]:bg-background/75">
            <CardHeader className="p-5 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Scorciatoie
              </p>
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                Strumenti rapidi
              </h2>
            </CardHeader>
            <CardContent className="grid gap-2.5 p-3 pt-0 sm:grid-cols-3 lg:grid-cols-1">
              {quickTools.map((tool) => {
                const Icon = tool.icon;

                return (
                  <Button
                    key={tool.id}
                    variant="outline"
                    onClick={() => handleToolClick(tool.id)}
                    className="group h-auto min-h-[88px] min-w-0 justify-start whitespace-normal rounded-2xl border-foreground/10 bg-background/60 p-3.5 text-left shadow-none supports-[backdrop-filter]:bg-background/45 dark:border-white/10"
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        tool.iconClassName,
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {tool.eyebrow}
                      </span>
                      <span className="mt-0.5 block break-words text-sm font-bold leading-tight text-foreground [overflow-wrap:anywhere]">
                        {tool.title}
                      </span>
                      <span className="mt-1 block text-[11px] font-medium leading-snug text-muted-foreground">
                        {tool.description}
                      </span>
                    </span>
                    <ChevronRight
                      className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 group-hover:translate-x-0.5 lg:block"
                      aria-hidden="true"
                    />
                  </Button>
                );
              })}

              <Button
                variant="ghost"
                onClick={onOpenStudio}
                className="col-span-full h-10 justify-between px-3 text-xs text-muted-foreground sm:hidden lg:flex"
              >
                Tutti gli strumenti
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
