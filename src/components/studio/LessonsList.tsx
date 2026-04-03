import { ChevronLeft, CheckCircle2, Lock, Loader2, Sparkles, RefreshCw, Target, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Exercise } from "./exercises/ExerciseRenderer";
import { getStableSubjectColor } from "@/lib/subjectColors";

interface Lesson {
  id: string;
  title: string;
  is_generated: boolean;
  lesson_order: number;
  concept?: string;
  explanation?: string;
  example?: string;
  exercises?: Exercise[];
}

interface LessonsListProps {
  lessons: Lesson[];
  currentIndex: number;
  onSelectLesson: (index: number) => void;
  onBack: () => void;
  isGenerating: boolean;
  showBackButton?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  showFinalTest?: boolean;
  onStartFinalTest?: () => void;
  isLoadingFinalTest?: boolean;
  contextFileName?: string | null;
}

export function LessonsList({
  lessons,
  currentIndex,
  onSelectLesson,
  onBack,
  isGenerating,
  showBackButton = true,
  onRegenerate,
  isRegenerating,
  showFinalTest,
  onStartFinalTest,
  isLoadingFinalTest,
  contextFileName,
}: LessonsListProps) {
  const completedCount = lessons.filter(l => l.is_generated).length;
  const progress = Math.round((completedCount / lessons.length) * 100);
  const color = getStableSubjectColor(contextFileName || "");

  // Path zigzag positions: nodes alternate left-center-right
  const getNodePosition = (index: number): "left" | "center" | "right" => {
    const cycle = index % 4;
    if (cycle === 0) return "center";
    if (cycle === 1) return "right";
    if (cycle === 2) return "center";
    return "left";
  };

  return (
    <div className="pb-28 animate-fade-up">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full -ml-2">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="title-large font-display truncate">{contextFileName || "Percorso di studio"}</h2>
            <p className="body-small text-muted-foreground">
              {completedCount}/{lessons.length} lezioni completate
            </p>
          </div>
          {onRegenerate && (
            <Button variant="outline" size="icon-sm" onClick={onRegenerate} disabled={isRegenerating} className="rounded-full">
              {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700 ease-m3-emphasized bg-gradient-to-r", color.gradient)}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-warning fill-warning" />
            <span className="label-large text-foreground">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Path */}
      <div className="relative px-4 pt-6">
        {/* Vertical connector line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {lessons.map((_, index) => {
            if (index === lessons.length - 1) return null;
            const fromPos = getNodePosition(index);
            const toPos = getNodePosition(index + 1);

            const fromX = fromPos === "left" ? 30 : fromPos === "right" ? 70 : 50;
            const toX = toPos === "left" ? 30 : toPos === "right" ? 70 : 50;

            const yStart = 60 + index * 120;
            const yEnd = 60 + (index + 1) * 120;
            const midY = (yStart + yEnd) / 2;

            const isCompleted = index < currentIndex;

            return (
              <path
                key={`line-${index}`}
                d={`M ${fromX}% ${yStart} C ${fromX}% ${midY}, ${toX}% ${midY}, ${toX}% ${yEnd}`}
                fill="none"
                stroke={isCompleted ? "hsl(var(--success))" : "hsl(var(--outline-variant))"}
                strokeWidth="3"
                strokeDasharray={isCompleted ? "none" : "8 6"}
                opacity={isCompleted ? 0.6 : 0.3}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>

        {/* Lesson nodes */}
        <div className="relative" style={{ zIndex: 1 }}>
          {lessons.map((lesson, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isLocked = !lesson.is_generated && index > currentIndex;
            const position = getNodePosition(index);

            return (
              <div
                key={lesson.id}
                className="flex items-center"
                style={{
                  height: 120,
                  justifyContent: position === "left" ? "flex-start" : position === "right" ? "flex-end" : "center",
                  paddingLeft: position === "left" ? "8%" : 0,
                  paddingRight: position === "right" ? "8%" : 0,
                }}
              >
                <button
                  onClick={() => !isGenerating && onSelectLesson(index)}
                  disabled={isGenerating}
                  className={cn(
                    "relative group flex flex-col items-center transition-all duration-400 ease-m3-emphasized",
                    !isGenerating && "active:scale-90",
                    isCurrent && "scale-110",
                  )}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  {/* Glow ring for current */}
                  {isCurrent && (
                    <div className={cn(
                      "absolute inset-0 -m-3 rounded-full animate-pulse opacity-30 bg-gradient-to-r",
                      color.gradient
                    )} />
                  )}

                  {/* Node circle */}
                  <div className={cn(
                    "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-400 ease-m3-emphasized shadow-level-1",
                    isCompleted && "bg-success text-white shadow-level-2",
                    isCurrent && cn("text-white shadow-level-3 bg-gradient-to-br", color.gradient),
                    !isCurrent && !isCompleted && !isLocked && "bg-surface-container-high text-muted-foreground",
                    isLocked && "bg-surface-container text-muted-foreground opacity-50",
                    !isGenerating && !isLocked && "group-hover:shadow-level-2 group-hover:scale-105"
                  )}>
                    {isGenerating && isCurrent ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="w-7 h-7" />
                    ) : isLocked ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <span className="text-lg font-display font-bold">{index + 1}</span>
                    )}

                    {/* Crown/star for current */}
                    {isCurrent && !isGenerating && (
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-warning flex items-center justify-center shadow-level-2 animate-bounce-gentle">
                        <Sparkles className="w-3.5 h-3.5 text-warning-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div className={cn(
                    "mt-2 max-w-[140px] text-center transition-all duration-300",
                    isCurrent && "scale-105"
                  )}>
                    <p className={cn(
                      "label-medium leading-tight line-clamp-2",
                      isCurrent && cn(color.text, "font-semibold"),
                      isCompleted && "text-success font-medium",
                      isLocked && "text-muted-foreground/50",
                      !isCurrent && !isCompleted && !isLocked && "text-foreground"
                    )}>
                      {lesson.title}
                    </p>
                    {isCompleted && (
                      <p className="body-small text-success/70 mt-0.5">✓ Completata</p>
                    )}
                    {isCurrent && lesson.is_generated && (
                      <p className={cn("body-small mt-0.5", color.text, "opacity-70")}>
                        {lesson.exercises?.length || 0} esercizi
                      </p>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Final Test Node */}
        {showFinalTest && onStartFinalTest && (
          <div className="flex justify-center" style={{ height: 120, paddingTop: 10 }}>
            <button
              onClick={onStartFinalTest}
              disabled={isLoadingFinalTest}
              className="relative group flex flex-col items-center transition-all duration-400 ease-m3-emphasized active:scale-90"
            >
              {/* Glow */}
              <div className={cn(
                "absolute inset-0 -m-4 rounded-full animate-pulse opacity-20 bg-gradient-to-r",
                color.gradient
              )} />

              {/* Node */}
              <div className={cn(
                "relative w-20 h-20 rounded-full flex items-center justify-center shadow-level-3 text-white bg-gradient-to-br",
                color.gradient,
                "group-hover:shadow-level-4 group-hover:scale-105"
              )}>
                {isLoadingFinalTest ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <Target className="w-8 h-8" />
                )}
              </div>

              <div className="mt-2 text-center">
                <p className={cn("label-large font-semibold", color.text)}>Test Finale</p>
                <p className="body-small text-muted-foreground">
                  {isLoadingFinalTest ? "Generazione..." : "Mettiti alla prova!"}
                </p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
