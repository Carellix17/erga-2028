import { ChevronLeft, CheckCircle2, Lock, Loader2, RefreshCw, Target, Star, Crown, Sparkles, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Exercise } from "./exercises/ExerciseRenderer";
import { getStableSubjectColor } from "@/lib/subjectColors";
import { useMemo, useRef as useReactRef, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";

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
  onRegenerateLesson?: (lessonIndex: number) => Promise<void> | void;
  onDeleteLesson?: (lessonId: string) => Promise<void> | void;
  onRenameLesson?: (lessonId: string, newTitle: string) => Promise<void> | void;
}

const MODULE_SIZE = 4;
const NODE_SPACING = 120;
const NODE_SIZE = 56;
const NODE_SIZE_CURRENT = 64;
const BORDER_RADIUS = 16;
const BORDER_RADIUS_CURRENT = 20;

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
  onRegenerateLesson,
  onDeleteLesson,
  onRenameLesson,
}: LessonsListProps) {
  // Conta le lezioni effettivamente completate dall'utente (non quelle generate).
  // currentIndex = indice della lezione "corrente"; le precedenti sono completate.
  // Clampato in [0, lessons.length] così se l'utente torna indietro il valore non scende.
  const completedCount = Math.max(0, Math.min(currentIndex, lessons.length));
  const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const color = getStableSubjectColor(contextFileName || "");

  // ── Long-press menu state ──
  const [menuLesson, setMenuLesson] = useState<{ lesson: Lesson; index: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [actionLoading, setActionLoading] = useState<"regen" | "delete" | "rename" | null>(null);
  const pressTimerRef = useReactRef<number | null>(null);
  const longPressTriggeredRef = useReactRef(false);
  // Manual double-tap detection (onDoubleClick is unreliable on touch devices)
  const lastTapRef = useReactRef<{ id: string; time: number } | null>(null);
  const DOUBLE_TAP_MS = 350;

  const detectDoubleTap = (lesson: Lesson, index: number): boolean => {
    if (isGenerating) return false;
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.id === lesson.id && now - last.time < DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      longPressTriggeredRef.current = true; // suppress upcoming click
      try { (navigator as any).vibrate?.(15); } catch {}
      setMenuLesson({ lesson, index });
      setIsRenaming(false);
      setRenameValue(lesson.title);
      return true;
    }
    lastTapRef.current = { id: lesson.id, time: now };
    return false;
  };

  const clearPressTimer = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const startPress = (lesson: Lesson, index: number) => {
    if (isGenerating) return;
    longPressTriggeredRef.current = false;
    clearPressTimer();
    pressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      // Haptic feedback if supported
      try { (navigator as any).vibrate?.(15); } catch {}
      setMenuLesson({ lesson, index });
      setIsRenaming(false);
      setRenameValue(lesson.title);
    }, 450);
  };

  const closeMenu = () => {
    setMenuLesson(null);
    setIsRenaming(false);
    setActionLoading(null);
  };

  const handleRegenerate = async () => {
    if (!menuLesson || !onRegenerateLesson) return;
    setActionLoading("regen");
    try {
      await onRegenerateLesson(menuLesson.index);
      closeMenu();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!menuLesson || !onDeleteLesson) return;
    setActionLoading("delete");
    try {
      await onDeleteLesson(menuLesson.lesson.id);
      closeMenu();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRename = async () => {
    if (!menuLesson || !onRenameLesson) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === menuLesson.lesson.title) {
      setIsRenaming(false);
      return;
    }
    setActionLoading("rename");
    try {
      await onRenameLesson(menuLesson.lesson.id, trimmed);
      closeMenu();
    } finally {
      setActionLoading(null);
    }
  };

  // Group lessons into modules
  const modules = useMemo(() => {
    const result: { title: string; lessons: { lesson: Lesson; globalIndex: number }[] }[] = [];
    for (let i = 0; i < lessons.length; i += MODULE_SIZE) {
      const chunk = lessons.slice(i, i + MODULE_SIZE);
      result.push({
        title: `Modulo ${result.length + 1}`,
        lessons: chunk.map((l, j) => ({ lesson: l, globalIndex: i + j })),
      });
    }
    return result;
  }, [lessons]);

  // Zigzag X positions (percentage)
  const getX = (indexInModule: number): number => {
    const cycle = indexInModule % 4;
    if (cycle === 0) return 50;
    if (cycle === 1) return 75;
    if (cycle === 2) return 50;
    return 25;
  };

  const getY = (indexInModule: number): number => NODE_SPACING * indexInModule + NODE_SPACING / 2;

  // Build a single continuous SVG path using a fixed width reference (390px mobile)
  const SVG_WIDTH = 390;
  const buildModulePath = (lessonCount: number): string => {
    if (lessonCount < 2) return "";
    const points: string[] = [];
    for (let i = 0; i < lessonCount; i++) {
      const x = (getX(i) / 100) * SVG_WIDTH;
      const y = getY(i);
      if (i === 0) {
        points.push(`M ${x} ${y}`);
      } else {
        const prevX = (getX(i - 1) / 100) * SVG_WIDTH;
        const prevY = getY(i - 1);
        const midY = (prevY + y) / 2;
        points.push(`C ${prevX} ${midY}, ${x} ${midY}, ${x} ${y}`);
      }
    }
    return points.join(" ");
  };

  // Calculate path length ratio for progress split
  const getProgressRatio = (modLessons: { globalIndex: number }[]): number => {
    if (modLessons.length < 2) return 0;
    // How many segments are completed in this module
    let completedSegments = 0;
    for (let i = 0; i < modLessons.length - 1; i++) {
      if (modLessons[i].globalIndex < currentIndex) {
        completedSegments++;
      }
    }
    return completedSegments / (modLessons.length - 1);
  };

  return (
    <div className="pb-32 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-outline-variant/30 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={onBack} aria-label="Torna indietro" className="rounded-full -ml-2">
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
            <Button variant="outline" size="icon" onClick={onRegenerate} disabled={isRegenerating} aria-label="Rigenera percorso di studio" className="rounded-full h-8 w-8">
              {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          )}
        </div>

        {/* Progress bar */}
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
          const pathD = buildModulePath(mod.lessons.length);
          const progressRatio = getProgressRatio(mod.lessons);

          return (
            <div key={modIndex} className="mb-8">
              {/* Module header */}
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className={cn(
                  "h-8 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r shadow-level-1",
                  color.gradient
                )}>
                  <Crown className="w-3.5 h-3.5" />
                  {mod.title}
                </div>
                <div className="flex-1 h-px bg-outline-variant/30" />
              </div>

              {/* Path + Nodes */}
              <div className="relative" style={{ height: totalH }}>
                {/* Single continuous SVG path — behind everything */}
                {pathD && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${SVG_WIDTH} ${totalH}`} preserveAspectRatio="none" style={{ zIndex: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${modIndex}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" className={cn("[stop-color:currentColor]", color.text)} />
                        <stop offset="100%" className={cn("[stop-color:currentColor]", color.text)} />
                      </linearGradient>
                    </defs>
                    {/* Background track (future) */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="hsl(var(--outline-variant))"
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.35}
                    />
                    {/* Progress overlay (completed) */}
                    {progressRatio > 0 && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={`url(#grad-${modIndex})`}
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="10000"
                        strokeDashoffset={10000 - 10000 * progressRatio}
                        className="transition-all duration-700 ease-m3-emphasized"
                      />
                    )}
                  </svg>
                )}

                {/* Nodes */}
                {mod.lessons.map((item, i) => {
                  const { lesson, globalIndex } = item;
                  const isCompleted = globalIndex < currentIndex;
                  const isCurrent = globalIndex === currentIndex;
                  const isLocked = !lesson.is_generated && globalIndex > currentIndex;
                  const x = getX(i);
                  const y = getY(i);
                  const size = isCurrent ? NODE_SIZE_CURRENT : NODE_SIZE;
                  const radius = isCurrent ? BORDER_RADIUS_CURRENT : BORDER_RADIUS;

                  return (
                    <div
                      key={lesson.id}
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${x}%`,
                        top: y,
                        transform: "translate(-50%, -50%)",
                        zIndex: isCurrent ? 10 : 2,
                      }}
                    >
                      <button
                        onClick={() => {
                          if (longPressTriggeredRef.current) {
                            longPressTriggeredRef.current = false;
                            return;
                          }
                          if (!isGenerating) onSelectLesson(globalIndex);
                        }}
                        onPointerDown={() => startPress(lesson, globalIndex)}
                        onPointerUp={clearPressTimer}
                        onPointerLeave={clearPressTimer}
                        onPointerCancel={clearPressTimer}
                        onContextMenu={(e) => { e.preventDefault(); }}
                        onDoubleClick={() => {
                          if (isGenerating) return;
                          setMenuLesson({ lesson, index: globalIndex });
                          setIsRenaming(false);
                          setRenameValue(lesson.title);
                        }}
                        disabled={isGenerating || isLocked}
                        className={cn(
                          "relative flex items-center justify-center transition-all duration-300 ease-m3-emphasized",
                          !isGenerating && !isLocked && "active:scale-90 hover:scale-105",
                        )}
                        style={{
                          width: size,
                          height: size,
                          borderRadius: radius,
                          touchAction: "manipulation",
                          WebkitUserSelect: "none",
                          userSelect: "none",
                        }}
                      >
                        {/* Pulse ring for current */}
                        {isCurrent && (
                          <span
                            className={cn("absolute animate-pulse opacity-20 bg-gradient-to-br", color.gradient)}
                            style={{
                              inset: -6,
                              borderRadius: radius + 4,
                            }}
                          />
                        )}

                        {/* Node shape */}
                        <span
                          className={cn(
                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                            isCompleted && cn("bg-gradient-to-br shadow-level-2 opacity-90", color.gradient),
                            isCurrent && cn("bg-gradient-to-br shadow-level-3", color.gradient),
                            !isCurrent && !isCompleted && !isLocked && "bg-surface-container-low shadow-level-1 border-2 border-outline-variant/40",
                            isLocked && "bg-surface-container shadow-level-0 opacity-45",
                          )}
                          style={{ borderRadius: radius }}
                        >
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
                          <span
                            className="absolute w-6 h-6 bg-warning flex items-center justify-center shadow-level-2 animate-bounce-gentle"
                            style={{ top: -4, right: -4, borderRadius: 8 }}
                          >
                            <Star className="w-3 h-3 text-warning-foreground fill-warning-foreground" />
                          </span>
                        )}
                      </button>

                      {/* Label */}
                      <button
                        type="button"
                        onPointerDown={(e) => { e.stopPropagation(); startPress(lesson, globalIndex); }}
                        onPointerUp={clearPressTimer}
                        onPointerLeave={clearPressTimer}
                        onPointerCancel={clearPressTimer}
                        onContextMenu={(e) => { e.preventDefault(); }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (isGenerating) return;
                          setMenuLesson({ lesson, index: globalIndex });
                          setIsRenaming(false);
                          setRenameValue(lesson.title);
                        }}
                        onClick={(e) => {
                          if (longPressTriggeredRef.current) {
                            e.stopPropagation();
                            longPressTriggeredRef.current = false;
                            return;
                          }
                          if (!isGenerating && !isLocked) onSelectLesson(globalIndex);
                        }}
                        disabled={isGenerating}
                        className={cn(
                          "mt-2 max-w-[120px] text-center text-[11px] leading-tight font-medium line-clamp-2 transition-all duration-300 px-2 py-1 rounded-xl bg-background/90 active:scale-95 hover:shadow-level-1",
                          isCompleted && cn(color.text, "font-semibold"),
                          isCurrent && cn(color.text, "font-semibold text-xs"),
                          isLocked && "text-muted-foreground/40",
                          !isCurrent && !isCompleted && !isLocked && "text-foreground/70",
                        )}
                        style={{ touchAction: "manipulation", WebkitUserSelect: "none", userSelect: "none" }}
                      >
                        {lesson.title}
                      </button>
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
              <span
                className={cn("absolute animate-pulse opacity-15 bg-gradient-to-br", color.gradient)}
                style={{ inset: -8, borderRadius: 24 }}
              />
              <span
                className={cn(
                  "w-20 h-20 flex items-center justify-center shadow-level-3 text-white bg-gradient-to-br group-hover:shadow-level-4 group-hover:scale-105 transition-all",
                  color.gradient,
                )}
                style={{ borderRadius: 24 }}
              >
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

      {/* ── Long-press action drawer ── */}
      <Drawer
        open={!!menuLesson}
        onOpenChange={(open) => { if (!open) closeMenu(); }}
      >
        <DrawerContent className="pb-6">
          {menuLesson && (
            <div className="px-5 pt-2 animate-fade-in">
              <div className="flex flex-col items-center text-center mb-5">
                <div className={cn(
                  "w-12 h-12 rounded-2xl bg-gradient-to-br shadow-level-2 flex items-center justify-center mb-3",
                  color.gradient,
                )}>
                  <span className="text-white font-display font-bold">{menuLesson.index + 1}</span>
                </div>
                {!isRenaming ? (
                  <>
                    <h3 className="font-display font-bold text-base text-foreground line-clamp-2 max-w-xs">
                      {menuLesson.lesson.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Cosa vuoi fare con questa lezione?</p>
                  </>
                ) : (
                  <div className="w-full max-w-sm mx-auto flex items-center gap-2">
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleRename(); }
                        if (e.key === "Escape") { setIsRenaming(false); }
                      }}
                      placeholder="Nuovo titolo"
                      className="h-11 rounded-xl"
                      maxLength={120}
                    />
                    <Button
                      size="icon"
                      onClick={handleRename}
                      disabled={actionLoading === "rename" || !renameValue.trim()}
                      className="h-11 w-11 rounded-xl flex-shrink-0"
                      aria-label="Conferma"
                    >
                      {actionLoading === "rename" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setIsRenaming(false)}
                      className="h-11 w-11 rounded-xl flex-shrink-0"
                      aria-label="Annulla"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {!isRenaming && (
                <div className="grid grid-cols-3 gap-3 animate-scale-in">
                  <button
                    onClick={handleRegenerate}
                    disabled={actionLoading !== null || !onRegenerateLesson}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-surface-container-low hover:bg-surface-container shadow-level-1 hover:shadow-level-2 transition-all duration-300 ease-m3-emphasized active:scale-95 disabled:opacity-50",
                    )}
                  >
                    <span className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-level-1", color.gradient)}>
                      {actionLoading === "regen" ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-white" />
                      )}
                    </span>
                    <span className="text-xs font-semibold text-foreground">Rigenera</span>
                  </button>

                  <button
                    onClick={() => { setRenameValue(menuLesson.lesson.title); setIsRenaming(true); }}
                    disabled={actionLoading !== null || !onRenameLesson}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-surface-container-low hover:bg-surface-container shadow-level-1 hover:shadow-level-2 transition-all duration-300 ease-m3-emphasized active:scale-95 disabled:opacity-50"
                  >
                    <span className="w-10 h-10 rounded-xl bg-tertiary-container text-tertiary flex items-center justify-center shadow-level-1">
                      <Pencil className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-semibold text-foreground">Rinomina</span>
                  </button>

                  <button
                    onClick={handleDelete}
                    disabled={actionLoading !== null || !onDeleteLesson}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl bg-surface-container-low hover:bg-error-container/50 shadow-level-1 hover:shadow-level-2 transition-all duration-300 ease-m3-emphasized active:scale-95 disabled:opacity-50"
                  >
                    <span className="w-10 h-10 rounded-xl bg-error-container text-destructive flex items-center justify-center shadow-level-1">
                      {actionLoading === "delete" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </span>
                    <span className="text-xs font-semibold text-foreground">Elimina</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
