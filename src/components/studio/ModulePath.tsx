import { useMemo, useRef, useState } from "react";
import { useHaptics } from "@/hooks/useHaptics";
import {
  Check,
  ChevronLeft,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moduleRange, type ModuleLessonLike } from "@/lib/lessonModules";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LessonLike extends ModuleLessonLike {
  id: string;
  title: string;
}

interface ModulePathProps {
  moduleIndex: number;
  moduleTitle: string;
  lessons: LessonLike[];
  currentIndex: number;
  /** Una lezione (singola) sta venendo generata al momento. */
  isGeneratingLesson: boolean;
  /** Il modulo intero è in generazione (fabbrica): mostra la vista "in costruzione". */
  isModuleGenerating: boolean;
  genCount: number;
  genTotal: number;
  onBack: () => void;
  /** P38: la barra compatta del corso (BranchTopBar) sostituisce l'intestazione. */
  hideHeader?: boolean;
  onSelectLesson: (globalIndex: number) => void;
  /** Modulo completamente completato → bottone "torna ai moduli". */
  onModuleCompleted: () => void;
  onStartFinalTest?: () => void;
  isLoadingFinalTest?: boolean;
  showFinalTest?: boolean;
  /** 🅐 FONDAMENTA — ordini (lesson_order) delle lezioni completate DAVVERO
   * (registrate nel database): il nodo prende la spunta anche se l'utente
   * è tornato indietro nel percorso. */
  completedOrders?: number[];
  /** 🅐 FONDAMENTA — punteggio dell'ultimo test finale salvato (0-100). */
  finalTestScore?: number | null;
  onRegenerateLesson?: (lessonIndex: number) => Promise<void> | void;
  onDeleteLesson?: (lessonId: string) => Promise<void> | void;
  onRenameLesson?: (lessonId: string, newTitle: string) => Promise<void> | void;
}

type NodeState = "done" | "cur" | "av" | "lock" | "gen";

export function ModulePath({
  moduleIndex,
  moduleTitle,
  lessons,
  currentIndex,
  isGeneratingLesson,
  isModuleGenerating,
  genCount,
  genTotal,
  onBack,
  hideHeader = false,
  onSelectLesson,
  onModuleCompleted,
  onStartFinalTest,
  isLoadingFinalTest,
  showFinalTest,
  completedOrders,
  finalTestScore,
  onRegenerateLesson,
  onDeleteLesson,
  onRenameLesson,
}: ModulePathProps) {
  const { triggerLight, triggerSuccess } = useHaptics();

  // ── Long-press menu (stessa logica della vecchia lista) ──
  const [menuLesson, setMenuLesson] = useState<{ lesson: LessonLike; index: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [actionLoading, setActionLoading] = useState<"regen" | "delete" | "rename" | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const DOUBLE_TAP_MS = 350;

  const detectDoubleTap = (lesson: LessonLike, index: number): boolean => {
    if (isGeneratingLesson) return false;
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.id === lesson.id && now - last.time < DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      longPressTriggeredRef.current = true;
      triggerLight();
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

  const startPress = (lesson: LessonLike, index: number) => {
    if (isGeneratingLesson) return;
    longPressTriggeredRef.current = false;
    clearPressTimer();
    pressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      triggerLight();
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

  // ── Lezioni del modulo con il loro indice globale ──
  const range = moduleRange(moduleIndex);
  const modLessons = useMemo(
    () =>
      lessons
        .map((lesson, pos) => ({ lesson, globalIndex: pos }))
        .filter(({ lesson, globalIndex }) => {
          const order = lesson.lesson_order ?? globalIndex;
          return order >= range.start && order <= range.end;
        }),
    [lessons, range.start, range.end],
  );

  // 🅐 FONDAMENTA — una lezione è «fatta» se è prima dell'indice corrente
  // (comportamento storico) OPPURE se è registrata come completata nel
  // database: così le spunte sopravvivono anche a ritorni e ripensamenti.
  const completedSet = useMemo(() => new Set(completedOrders ?? []), [completedOrders]);

  const stateOf = (globalIndex: number, lesson: LessonLike): NodeState => {
    const order = lesson.lesson_order ?? globalIndex;
    const isCompleted = globalIndex < currentIndex || completedSet.has(order);
    const isCurrent = globalIndex === currentIndex;
    const isLocked = !lesson.is_generated && globalIndex > currentIndex;
    if (isGeneratingLesson && isCurrent) return "gen";
    if (isCompleted) return "done";
    if (isCurrent) return "cur";
    if (isLocked) return "lock";
    return "av";
  };

  const isLessonDone = (globalIndex: number, lesson: LessonLike) =>
    globalIndex < currentIndex || completedSet.has(lesson.lesson_order ?? globalIndex);

  const allDone = modLessons.length > 0 && modLessons.every(({ lesson, globalIndex }) => isLessonDone(globalIndex, lesson));
  const doneCount = modLessons.filter(({ lesson, globalIndex }) => isLessonDone(globalIndex, lesson)).length;
  const pct = modLessons.length > 0 ? Math.round((doneCount / modLessons.length) * 100) : 0;

  return (
    <div className="pb-6 animate-fade-in">
      {/* ── Intestazione: torna ai moduli + titolo modulo INTERO ── */}
      <div className="px-4 pt-4">
        {!hideHeader && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { triggerLight(); onBack(); }}
              aria-label="Torna ai moduli"
              className="rounded-full shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">Modulo {moduleIndex + 1}</p>
              <h2 className="break-words font-sans text-lg font-normal leading-snug text-foreground">
                {moduleTitle}
              </h2>
            </div>
          </div>
        )}

        {!isModuleGenerating && (
          <>
            <div className="flex items-baseline justify-between gap-3 px-1 mt-3">
              <p className="text-xs font-normal text-muted-foreground">
                {doneCount} di {modLessons.length} lezioni completate
              </p>
              <p className="font-mono text-sm tabular-nums text-foreground">{pct}%</p>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-white/15">
              <div
                className="h-full rounded-sm bg-foreground transition-[width] duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Banner "in generazione" ── */}
      {isModuleGenerating && (
        <div className="mx-4 mt-4 rounded-card bg-card border border-border p-4 flex items-center gap-3.5 animate-fade-up">
          <span className="w-10 h-10 rounded-button bg-surface-container-high flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-5 h-5 text-tertiary animate-spin" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-normal text-foreground">Sto generando le lezioni…</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Le nuove lezioni entreranno qui appena pronte
            </p>
          </div>
          <span className="shrink-0 font-mono text-lg tabular-nums text-foreground">
            {genTotal > 0 ? Math.min(100, Math.round((genCount / genTotal) * 100)) : 8}%
          </span>
        </div>
      )}
      {isModuleGenerating && genTotal > 0 && (
        <div className="mx-4 mt-3 h-1.5 rounded-sm bg-secondary overflow-hidden">
          <div
            className="h-full rounded-sm bg-foreground transition-[width] duration-200"
            style={{ width: `${Math.max(4, Math.min(100, (genCount / genTotal) * 100))}%` }}
          />
        </div>
      )}

      <div data-path-layout="list" className="mx-4 mt-5 flex flex-col gap-3">
        {modLessons.map(({ lesson, globalIndex }) => {
          const state: NodeState = isModuleGenerating ? "gen" : stateOf(globalIndex, lesson);
          const clickable = !isModuleGenerating && (state === "av" || state === "cur" || state === "done");
          const stateLabel = ({ done: "completata", cur: "in corso", av: "disponibile", lock: "bloccata", gen: "in generazione" } as const)[state];
          const openActions = () => {
            if (isGeneratingLesson) return;
            setMenuLesson({ lesson, index: globalIndex });
            setIsRenaming(false);
            setRenameValue(lesson.title);
          };

          return (
            <button
              key={lesson.id}
              type="button"
              aria-label={`Lezione ${globalIndex + 1}: ${lesson.title}, ${stateLabel}`}
              aria-disabled={!clickable}
              aria-current={state === "cur" ? "step" : undefined}
              data-lesson-node={globalIndex}
              data-node-state={state}
              className={cn(
                "flex w-full items-start gap-3 rounded-card border px-4 py-4 text-left font-normal transition-[transform,background-color,border-color] duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none",
                state === "cur" && "border-primary bg-primary text-primary-foreground",
                state === "done" && "border-border bg-card text-muted-foreground",
                state === "av" && "border-border bg-card text-foreground",
                (state === "lock" || state === "gen") && "cursor-default border-border bg-card text-muted-foreground",
                state === "gen" && "border-dashed",
                clickable && "active:scale-[0.98]",
              )}
              onClick={() => {
                if (longPressTriggeredRef.current) {
                  longPressTriggeredRef.current = false;
                  return;
                }
                if (clickable) {
                  triggerLight();
                  onSelectLesson(globalIndex);
                }
              }}
              onPointerDown={() => startPress(lesson, globalIndex)}
              onPointerUp={() => { clearPressTimer(); detectDoubleTap(lesson, globalIndex); }}
              onPointerLeave={clearPressTimer}
              onPointerCancel={clearPressTimer}
              onContextMenu={(event) => { event.preventDefault(); openActions(); }}
              onKeyDown={(event) => {
                if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                  event.preventDefault();
                  openActions();
                }
              }}
              onDoubleClick={openActions}
            >
              <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                {state === "done" ? (
                  <Check className="h-5 w-5" strokeWidth={1.75} />
                ) : state === "lock" ? (
                  <Lock className="h-4 w-4" strokeWidth={1.75} />
                ) : state === "gen" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="font-mono text-xs tabular-nums">{globalIndex + 1}</span>
                )}
              </span>
              <span data-lesson-label={globalIndex} className="min-w-0 flex-1">
                <span className={cn("font-mono text-[12px] uppercase tracking-[0.08em]", state === "cur" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  Lezione {globalIndex + 1}
                </span>
                {state === "cur" && !isGeneratingLesson && (
                  <span className="ml-2 font-mono text-[12px] uppercase tracking-[0.08em]">Riprendi</span>
                )}
                <span className="mt-1 block break-words text-base font-normal leading-snug">
                  {lesson.title}
                </span>
              </span>
            </button>
          );
        })}

        <button
          type="button"
          data-final-test-node
          disabled={!allDone || !showFinalTest || !onStartFinalTest || !!isLoadingFinalTest}
          aria-label={typeof finalTestScore === "number" ? `Test finale, ultimo esito ${finalTestScore}%` : "Test finale"}
          className={cn(
            "flex w-full items-center gap-3 rounded-card border px-4 py-4 text-left font-normal",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            allDone && showFinalTest && onStartFinalTest
              ? "border-border bg-card text-foreground"
              : "cursor-default border-border bg-card text-muted-foreground",
          )}
          onClick={() => {
            if (allDone && showFinalTest && onStartFinalTest && !isLoadingFinalTest) {
              triggerLight();
              onStartFinalTest();
            }
          }}
        >
          {isLoadingFinalTest ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
          ) : (
            <Trophy className="h-5 w-5 shrink-0" strokeWidth={1.75} />
          )}
          <span>
            <span className="block font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground">Ultimo passo</span>
            <span className="mt-1 block text-base font-normal">Test finale</span>
            {typeof finalTestScore === "number" && (
              <span className="mt-1 block font-mono text-sm tabular-nums text-muted-foreground">
                Ultimo esito: {finalTestScore}%
              </span>
            )}
          </span>
        </button>
      </div>

      {/* Bottone modulo completato */}
      {allDone && (
        <div className="px-4 mt-6">
          <button
            type="button"
            onClick={() => { triggerSuccess(); onModuleCompleted(); }}
            className="flex h-12 w-full items-center justify-center rounded-button border border-white/25 bg-transparent px-4 text-center font-sans text-sm font-normal leading-tight text-foreground transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none"
          >
            ✓ Modulo completato — Torna ai moduli
          </button>
        </div>
      )}

      {/* ── Long-press action drawer ── */}
      <Drawer open={!!menuLesson} onOpenChange={(open) => { if (!open) closeMenu(); }}>
        <DrawerContent className="pb-6">
          {menuLesson && (
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-2 animate-fade-in">
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <span className="text-foreground font-display font-semibold">{menuLesson.index + 1}</span>
                </div>
                {!isRenaming ? (
                  <>
                    <h3 className="font-display font-semibold text-base text-foreground line-clamp-2 max-w-xs">
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
                      className="h-11 rounded-2xl"
                      maxLength={120}
                    />
                    <Button size="icon" onClick={handleRename} disabled={actionLoading === "rename" || !renameValue.trim()} className="h-11 w-11 rounded-full flex-shrink-0" aria-label="Conferma">
                      {actionLoading === "rename" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => setIsRenaming(false)} className="h-11 w-11 rounded-full flex-shrink-0" aria-label="Annulla">
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
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-card bg-card hover:bg-surface-container-high transition-colors duration-200 disabled:opacity-50"
                  >
                    <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      {actionLoading === "regen" ? (
                        <Loader2 className="w-5 h-5 text-foreground animate-spin" />
                      ) : (
                        <RefreshCw className="w-5 h-5 text-foreground" strokeWidth={1.75} />
                      )}
                    </span>
                    <span className="text-xs font-semibold text-foreground">Rigenera</span>
                  </button>
                  <button
                    onClick={() => { setRenameValue(menuLesson.lesson.title); setIsRenaming(true); }}
                    disabled={actionLoading !== null || !onRenameLesson}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-card bg-card hover:bg-surface-container-high transition-colors duration-200 disabled:opacity-50"
                  >
                    <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <Pencil className="w-5 h-5 text-foreground" strokeWidth={1.75} />
                    </span>
                    <span className="text-xs font-semibold text-foreground">Rinomina</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading !== null || !onDeleteLesson}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-card bg-card hover:bg-error-container/40 transition-colors duration-200 disabled:opacity-50"
                  >
                    <span className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center">
                      {actionLoading === "delete" ? (
                        <Loader2 className="w-5 h-5 text-destructive animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5 text-destructive" strokeWidth={1.75} />
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
