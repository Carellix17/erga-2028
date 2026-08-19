import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
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
import { useCourseImage } from "@/hooks/useCourseImage";
import { CourseCardBackground } from "@/components/studio/CourseCardBackground";
import { getSubjectAccent } from "@/lib/subjectColors";


interface HomeViewProps {
  onOpenStudio: () => void;
  onOpenPratica: () => void;
  onOpenCognitive: () => void;
}

type DashboardTaskStatus = "completed" | "current" | "upcoming";
type QuickToolId = "pomodoro" | "practice" | "studio" | "cognitive";

interface DashboardTask {
  id: string;
  title: string;
  subject: string;
  timeLabel: string;
  status: DashboardTaskStatus;
}

interface QuickTool {
  id: QuickToolId;
  title: string;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  iconClassName: string;
  toastTitle: string;
  toastDescription: string;
}

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
    student: {
      name: "Alessandro",
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
        status: "completed",
      },
      {
        id: "task-math-exercises",
        title: "Completa 8 esercizi sulle funzioni esponenziali",
        subject: "Matematica",
        timeLabel: "16:20",
        status: "current",
      },
      {
        id: "task-english-review",
        title: "Prepara il vocabolario per la prossima verifica di inglese",
        subject: "Inglese",
        timeLabel: "18:10",
        status: "upcoming",
      },
      {
        id: "task-science-map",
        title: "Completa la mappa concettuale sulla cellula",
        subject: "Scienze",
        timeLabel: "18:40",
        status: "upcoming",
      },
      {
        id: "task-literature-reading",
        title: "Leggi e annota il prossimo canto della Divina Commedia",
        subject: "Italiano",
        timeLabel: "19:15",
        status: "upcoming",
      },
    ] satisfies DashboardTask[],
    taskStatusLabels: {
      completed: "Completato",
      current: "In corso",
      upcoming: "Da fare",
    } satisfies Record<DashboardTaskStatus, string>,
    quickTools: [
      {
        id: "pomodoro",
        title: "Pomodoro",
        description: "Focus da 25 min",
        eyebrow: "Timer",
        icon: Timer,
        iconClassName: "bg-neutral-900 text-white dark:bg-white dark:text-black",
        toastTitle: "Pomodoro pronto",
        toastDescription: "Timer mock impostato su 25 minuti.",
      },
      {
        id: "practice",
        title: "Pratica rapida",
        description: "12 esercizi pronti",
        eyebrow: "Allenati",
        icon: Zap,
        iconClassName: "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-white",
        toastTitle: "",
        toastDescription: "",
      },
      {
        id: "studio",
        title: "Area Studio",
        description: "Riprendi il modulo",
        eyebrow: "Continua",
        icon: BookOpen,
        iconClassName: "bg-secondary/80 text-tertiary",
        toastTitle: "",
        toastDescription: "",
      },
      {
        id: "cognitive",
        title: "Esagono rapido",
        description: "Profilo cognitivo",
        eyebrow: "Personalizza",
        icon: Brain,
        iconClassName: "bg-tertiary/10 text-tertiary",
        toastTitle: "",
        toastDescription: "",
      },
    ] satisfies QuickTool[],
  };
})();

const INITIAL_VISIBLE_TASKS = 3;

export function HomeView({
  onOpenStudio,
  onOpenPratica,
  onOpenCognitive,
}: HomeViewProps) {
  const { toast } = useToast();
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(() =>
    MOCK_DASHBOARD_DATA.upcomingTasks
      .filter((task) => task.status === "completed")
      .map((task) => task.id),
  );

  const { student, lessonsToday, upcomingTasks, quickTools } =
    MOCK_DASHBOARD_DATA;
  const nextLesson = lessonsToday[0];
  // 🖼️ P24 — immagine di copertina per la card "Prossima lezione" (Wikipedia)
  const lessonCover = useCourseImage(
    nextLesson?.id ?? null,
    nextLesson?.subject ?? "",
  );
  const visibleTasks = showAllTasks
    ? upcomingTasks
    : upcomingTasks.slice(0, INITIAL_VISIBLE_TASKS);
  const hiddenTasksCount = Math.max(
    0,
    upcomingTasks.length - INITIAL_VISIBLE_TASKS,
  );
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

  const handleToolClick = (toolId: QuickToolId) => {
    if (toolId === "practice") {
      onOpenPratica();
      return;
    }

    if (toolId === "studio") {
      onOpenStudio();
      return;
    }

    if (toolId === "cognitive") {
      onOpenCognitive();
      return;
    }

    const tool = quickTools.find((item) => item.id === toolId);
    if (tool) {
      toast({ title: tool.toastTitle, description: tool.toastDescription });
    }
  };

  return (
    <div className="relative isolate min-w-0 overflow-x-clip py-6 sm:py-8">
      <div className="relative z-10 space-y-10 md:space-y-14">
        {/* Intro compatta: orienta senza competere con l'azione principale. */}
        <header className="min-w-0">
          <h1 className="break-words font-display text-[clamp(1.7rem,6vw,2.35rem)] font-extrabold leading-tight tracking-normal text-foreground [overflow-wrap:anywhere]">
            {MOCK_DASHBOARD_DATA.greeting},{" "}
            <span className="text-tertiary">{student.name}</span>
          </h1>
        </header>

        {/* Azione principale — la prossima lezione. */}
        <section aria-labelledby="next-lesson-title" className="min-w-0">
          <Card className="relative w-full min-w-0 overflow-hidden border-primary/15 bg-background/95 supports-[backdrop-filter]:bg-background/80 dark:border-white/10">
            {/* 🖼️ P24 — sfondo unificato (immagine + tinta materia) */}
            <CourseCardBackground
              coverUrl={lessonCover}
              subjectColor={getSubjectAccent(nextLesson?.subject ?? "")}
              opacity={0.4}
            />

            <CardHeader className="relative z-10 p-5 pb-3 sm:p-6 sm:pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="gap-1.5 border-0 bg-black text-white dark:bg-white dark:text-black">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Prossima lezione
                </Badge>
                <Badge
                  variant="outline"
                  className="backdrop-blur-sm bg-black/30 text-white border-white/30"
                >
                  {nextLesson.subject}
                </Badge>
              </div>
              <h2
                id="next-lesson-title"
                className="max-w-2xl break-words pt-2 font-display text-[clamp(1.45rem,5vw,2.2rem)] font-extrabold leading-[1.12] tracking-tight text-white [overflow-wrap:anywhere]"
              >
                {nextLesson.title}
              </h2>
            </CardHeader>

            <CardContent className="relative z-10 p-5 pt-0 sm:p-6 sm:pt-0">
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-neutral-300">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3
                    className="h-3.5 w-3.5 text-tertiary"
                    aria-hidden="true"
                  />
                  Oggi, {nextLesson.startTime}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Timer
                    className="h-3.5 w-3.5 text-tertiary"
                    aria-hidden="true"
                  />
                  Sessione guidata · {nextLesson.durationMinutes} min
                </span>
              </div>

              <div className="mt-4 max-w-md">
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-semibold">
                  <span className="text-neutral-300">
                    Preparazione lezione
                  </span>
                  <span className="tabular-nums text-white">
                    {nextLesson.preparationProgress}%
                  </span>
                </div>
                <Progress
                  value={nextLesson.preparationProgress}
                  aria-label={`Preparazione lezione ${nextLesson.preparationProgress}%`}
                  className="h-1.5 bg-white/15"
                />
              </div>

              <Button
                size="lg"
                onClick={onOpenStudio}
                className="mt-5 h-12 w-full gap-2 rounded-xl bg-white px-6 text-sm text-black shadow-level-2 hover:bg-neutral-200 active:scale-[0.97] sm:w-auto sm:min-w-[220px]"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                Inizia lezione · {nextLesson.durationMinutes} min
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Piano essenziale, con dettaglio progressivo. */}
        <section
          aria-labelledby="today-plan-title"
          className="min-w-0 space-y-4"
        >
          <div className="flex min-w-0 items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Oggi
              </p>
              <h2
                id="today-plan-title"
                className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground"
              >
                Piano del giorno
              </h2>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {completedTasksCount}/{upcomingTasks.length}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <Card className="min-w-0 bg-background/70 shadow-level-1 supports-[backdrop-filter]:bg-background/55 md:col-span-8">
              <CardContent className="p-3 sm:p-4">
                <div id="today-task-list" className="min-w-0" role="list">
                  {visibleTasks.map((task, index) => {
                    const isCompleted = completedTaskIds.includes(task.id);
                    const visualStatus: DashboardTaskStatus = isCompleted
                      ? "completed"
                      : task.status === "completed"
                        ? "upcoming"
                        : task.status;

                    return (
                      <div
                        key={task.id}
                        role="listitem"
                        className={cn(
                          "flex min-w-0 items-start gap-3 px-2 py-3.5 sm:items-center sm:px-3",
                          index !== visibleTasks.length - 1 &&
                            "border-b border-foreground/[0.07]",
                          visualStatus === "current" &&
                            "rounded-xl bg-primary/[0.045]",
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
                              isCompleted &&
                                "text-muted-foreground line-through",
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
                </div>

                {hiddenTasksCount > 0 && (
                  <div className="border-t border-foreground/[0.07] px-1 pt-2 sm:px-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-expanded={showAllTasks}
                      aria-controls="today-task-list"
                      onClick={() => setShowAllTasks((current) => !current)}
                      className="w-full justify-between text-muted-foreground"
                    >
                      {showAllTasks
                        ? "Mostra meno"
                        : `Mostra tutti · altri ${hiddenTasksCount}`}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-150",
                          showAllTasks && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 bg-background/50 shadow-none supports-[backdrop-filter]:bg-background/35 md:col-span-4">
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      Ritmo di oggi
                    </p>
                    <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-foreground">
                      Obiettivo giornaliero
                    </h2>
                  </div>
                  <Target
                    className="h-5 w-5 shrink-0 text-tertiary"
                    aria-hidden="true"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                    {student.studyMinutesCompleted}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    / {student.dailyGoalMinutes} min
                  </span>
                </div>
                <Progress
                  value={dailyProgress}
                  aria-label={`Obiettivo giornaliero ${dailyProgress}%`}
                  className="mt-3 h-2 bg-secondary/65"
                />

                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-foreground/[0.07] pt-4">
                  <div className="min-w-0">
                    <CheckCircle2
                      className="h-4 w-4 text-tertiary"
                      aria-hidden="true"
                    />
                    <p className="mt-1.5 text-sm font-extrabold tracking-tight text-foreground tabular-nums">
                      {completedTasksCount}/{upcomingTasks.length}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground">
                      Attività
                    </p>
                  </div>
                  <div className="min-w-0">
                    <Flame
                      className="h-4 w-4 text-warning"
                      aria-hidden="true"
                    />
                    <p className="mt-1.5 text-sm font-extrabold tracking-tight text-foreground tabular-nums">
                      {student.streakDays} giorni
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground">
                      Serie attiva
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Strumenti secondari, volutamente più quieti. */}
        <section
          aria-labelledby="quick-tools-title"
          className="min-w-0 space-y-4 pb-2"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Scorciatoie
            </p>
            <h2
              id="quick-tools-title"
              className="mt-1 font-display text-xl font-bold tracking-tight text-foreground"
            >
              Strumenti rapidi
            </h2>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4">
            {quickTools.map((tool) => {
              const Icon = tool.icon;

              return (
                <Button
                  key={tool.id}
                  type="button"
                  variant="outline"
                  onClick={() => handleToolClick(tool.id)}
                  className="group press h-auto min-h-[118px] min-w-0 flex-col items-start justify-start whitespace-normal rounded-2xl border-foreground/[0.08] bg-background/40 p-3.5 text-left shadow-none supports-[backdrop-filter]:bg-background/25 dark:border-white/[0.08]"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      tool.iconClassName,
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="mt-2 min-w-0 self-stretch">
                    <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {tool.eyebrow}
                    </span>
                    <span className="mt-0.5 block break-words text-sm font-bold leading-tight text-foreground [overflow-wrap:anywhere]">
                      {tool.title}
                    </span>
                    <span className="mt-1 block break-words text-[10px] font-medium leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                      {tool.description}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
