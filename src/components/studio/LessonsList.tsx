import { ChevronLeft, CheckCircle2, Lock, Loader2, RefreshCw, Target, Star, Crown } from "lucide-react";
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

const MODULE_SIZE = 4;

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
  const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const color = getStableSubjectColor(contextFileName || "");

  // Group lessons into modules
  const modules: { title: string; lessons: { lesson: Lesson; globalIndex: number }[] }[] = [];
  for (let i = 0; i < lessons.length; i += MODULE_SIZE) {
    const chunk = lessons.slice(i, i + MODULE_SIZE);
    modules.push({
      title: `Modulo ${modules.length + 1}`,
      lessons: chunk.map((l, j) => ({ lesson: l, globalIndex: i + j })),
    });
  }

  // Zigzag: nodes alternate left → center → right → center
  const getX = (indexInModule: number): number => {
    const cycle = indexInModule % 4;
    if (cycle === 0) return 50;
    if (cycle === 1) return 75;
    if (cycle === 2) return 50;
    return 25;
  };

  const NODE_SPACING = 110;
  const NODE_R_NORMAL = 30;
  const NODE_R_CURRENT = 38;

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-outline-variant/30 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full -ml-2">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-display font-bold text-foreground truncate">
              {contextFileName || "Percorso di studio"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{lessons.length} lezioni completate
            </p>
          </div>
          {onRegenerate && (
            <Button variant="outline" size="icon" onClick={onRegenerate} disabled={isRegenerating} className="rounded-full h-8 w-8">
              {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700 ease-m3-emphasized bg-gradient-to-r", color.gradient)}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-warning fill-warning" />
            <span className="text-xs font-semibold text-foreground">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="px-4 pt-4">
        {modules.map((mod, modIndex) => {
          const totalH = mod.lessons.length * NODE_SPACING;

          return (
            <div key={modIndex} className="mb-8">
              {/* Module header */}
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className={cn(
                  "h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r shadow-level-1",
                  color.gradient
                )}>
                  <Crown className="w-3.5 h-3.5" />
                  {mod.title}
                </div>
                <div className="flex-1 h-px bg-outline-variant/30" />
              </div>

              {/* Path SVG + Nodes */}
              <div className="relative" style={{ height: totalH }}>
                {/* SVG connectors */}
                <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                  {mod.lessons.map((item, i) => {
                    if (i >= mod.lessons.length - 1) return null;
                    const x1 = getX(i);
                    const x2 = getX(i + 1);
                    const y1 = NODE_SPACING * i + NODE_SPACING / 2;
                    const y2 = NODE_SPACING * (i + 1) + NODE_SPACING / 2;
                    const midY = (y1 + y2) / 2;

                    const isSegmentDone = item.globalIndex < currentIndex;

                    return (
                      <path
                        key={i}
                        d={`M ${x1}% ${y1} C ${x1}% ${midY}, ${x2}% ${midY}, ${x2}% ${y2}`}
                        fill="none"
                        stroke={isSegmentDone ? "hsl(160 70% 40%)" : "hsl(245 12% 82%)"}
                        strokeWidth={isSegmentDone ? 4 : 3}
                        strokeLinecap="round"
                        strokeDasharray={isSegmentDone ? "none" : "0"}
                        className="transition-all duration-500"
                      />
                    );
                  })}
                </svg>

                {/* Nodes */}
                {mod.lessons.map((item, i) => {
                  const { lesson, globalIndex } = item;
                  const isCompleted = globalIndex < currentIndex;
                  const isCurrent = globalIndex === currentIndex;
                  const isLocked = !lesson.is_generated && globalIndex > currentIndex;
                  const x = getX(i);
                  const y = NODE_SPACING * i + NODE_SPACING / 2;
                  const r = isCurrent ? NODE_R_CURRENT : NODE_R_NORMAL;

                  return (
                    <div
                      key={lesson.id}
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${x}%`,
                        top: y,
                        transform: "translate(-50%, -50%)",
                        zIndex: isCurrent ? 10 : 1,
                      }}
                    >
                      <button
                        onClick={() => !isGenerating && onSelectLesson(globalIndex)}
                        disabled={isGenerating || isLocked}
                        className={cn(
                          "relative flex items-center justify-center rounded-full transition-all duration-300 ease-m3-emphasized",
                          !isGenerating && !isLocked && "active:scale-90 hover:scale-105",
                          isCurrent && "lesson-node-current",
                        )}
                        style={{ width: r * 2, height: r * 2 }}
                      >
                        {/* Pulse ring for current */}
                        {isCurrent && (
                          <span
                            className={cn("absolute inset-[-6px] rounded-full animate-pulse opacity-25 bg-gradient-to-br", color.gradient)}
                          />
                        )}

                        {/* Circle */}
                        <span className={cn(
                          "absolute inset-0 rounded-full flex items-center justify-center transition-all duration-300",
                          isCompleted && "bg-success shadow-level-2",
                          isCurrent && cn("bg-gradient-to-br shadow-level-3", color.gradient),
                          !isCurrent && !isCompleted && !isLocked && "bg-surface-container-high shadow-level-1 border-2 border-outline-variant/50",
                          isLocked && "bg-surface-container shadow-level-0 opacity-50",
                        )}>
                          {isGenerating && isCurrent ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-white" />
                          ) : isLocked ? (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          ) : isCurrent ? (
                            <span className="text-base font-display font-bold text-white">{globalIndex + 1}</span>
                          ) : (
                            <span className="text-sm font-display font-bold text-muted-foreground">{globalIndex + 1}</span>
                          )}
                        </span>

                        {/* Badge for current */}
                        {isCurrent && !isGenerating && (
                          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center shadow-level-2 animate-bounce-gentle">
                            <Star className="w-3 h-3 text-warning-foreground fill-warning-foreground" />
                          </span>
                        )}
                      </button>

                      {/* Label */}
                      <span className={cn(
                        "mt-1.5 max-w-[120px] text-center text-[11px] leading-tight font-medium line-clamp-2 transition-all duration-300",
                        isCompleted && "text-success",
                        isCurrent && cn(color.text, "font-semibold text-xs"),
                        isLocked && "text-muted-foreground/40",
                        !isCurrent && !isCompleted && !isLocked && "text-foreground/70",
                      )}>
                        {lesson.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Final Test */}
        {showFinalTest && onStartFinalTest && (
          <div className="flex justify-center py-4">
            <button
              onClick={onStartFinalTest}
              disabled={isLoadingFinalTest}
              className="relative group flex flex-col items-center transition-all duration-300 ease-m3-emphasized active:scale-90"
            >
              <span className={cn("absolute inset-[-8px] rounded-full animate-pulse opacity-15 bg-gradient-to-br", color.gradient)} />
              <span className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center shadow-level-3 text-white bg-gradient-to-br group-hover:shadow-level-4 group-hover:scale-105 transition-all",
                color.gradient,
              )}>
                {isLoadingFinalTest ? <Loader2 className="w-7 h-7 animate-spin" /> : <Target className="w-8 h-8" />}
              </span>
              <span className={cn("mt-2 text-sm font-display font-bold", color.text)}>Test Finale</span>
              <span className="text-[11px] text-muted-foreground">
                {isLoadingFinalTest ? "Generazione..." : "Mettiti alla prova!"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
