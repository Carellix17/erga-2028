import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Pencil,
  Play,
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
import { Exercise } from "./exercises/ExerciseRenderer";

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
  onRegenerateLesson?: (lessonIndex: number) => Promise<void> | void;
  onDeleteLesson?: (lessonId: string) => Promise<void> | void;
  onRenameLesson?: (lessonId: string, newTitle: string) => Promise<void> | void;
}

// 🌀 P46 — SCHERMATA 2: il PERCORSO SERPENTINA del modulo.
// Nodi TONDI che si muovono su tre colonne (centro-sinistra → centro →
// centro-destra → centro → …) e si snodano su una curva morbida (Bézier)
// disegnata in SVG: i tratti già fatti sono pieni nell'accento materia, quelli
// futuri sono grigi e tratteggiati. In fondo, il nodo speciale del test finale.
// Il titolo NON sta mai dentro il nodo: è in una scheda accanto, con buon
// contrasto. Il modulo in generazione mostra banner + nodi tratteggiati che
// girano (l'animazione del "respiro" resta solo sul nodo corrente).

const NODE = 56; // diametro del nodo tondo (px)
const STEP = 132; // distanza verticale fra il centro di un nodo e il successivo
const TROPHY = 64; // diametro del nodo del test finale
const COL_A = 25; // % — colonna "centro-sinistra"
const COL_B = 50; // % — colonna "centro"
const COL_C = 75; // % — colonna "centro-destra"
const MID = 50; // % — il trofeo sta in mezzo
// Serpentina: A → B → C → B → A → … (ampiezza costante, mai fuori schermo)
const SERPENTINE = [COL_A, COL_B, COL_C, COL_B];
const CURVE = 0.42; // quanto la curva "tira" dritta prima di piegare (frazione di STEP)
const TROPHY_DROP = 24; // quanto il trofeo scende sotto l'ultimo nodo
const GAP_LABEL = 12; // px fra il bordo del nodo e la scheda del titolo
const FALLBACK_W = 360; // larghezza di ripiego quando la misura non c'è (jsdom)

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
  onRegenerateLesson,
  onDeleteLesson,
  onRenameLesson,
}: ModulePathProps) {
  // P46 — rispetta "riduci movimento": niente cascata, niente nodi che respirano.
  const prefersReduced = usePrefersReducedMotion();

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
      try { navigator.vibrate?.(15); } catch { /* non supportato */ }
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
      try { navigator.vibrate?.(15); } catch { /* non supportato */ }
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

  const stateOf = (globalIndex: number, lesson: LessonLike): NodeState => {
    const isCompleted = globalIndex < currentIndex;
    const isCurrent = globalIndex === currentIndex;
    const isLocked = !lesson.is_generated && globalIndex > currentIndex;
    if (isGeneratingLesson && isCurrent) return "gen";
    if (isCompleted) return "done";
    if (isCurrent) return "cur";
    if (isLocked) return "lock";
    return "av";
  };

  const allDone = modLessons.length > 0 && modLessons.every(({ globalIndex }) => globalIndex < currentIndex);
  const doneCount = modLessons.filter(({ globalIndex }) => globalIndex < currentIndex).length;
  const pct = modLessons.length > 0 ? Math.round((doneCount / modLessons.length) * 100) : 0;

  const n = Math.max(modLessons.length, 1);
  const height = n * STEP + TROPHY + 70;

  // ── Misura della larghezza: così l'SVG disegna in PIXEL VERI (curve tonde,
  //    tratteggio uniforme) e non serve nessuna scala stirata. ──
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [boxW, setBoxW] = useState(0);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBoxW(el.clientWidth || 0);
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = boxW > 0 ? boxW : FALLBACK_W;
  const xAt = (pctX: number) => (pctX / 100) * W; // % → px dentro l'SVG
  const colOf = (i: number) => SERPENTINE[i % SERPENTINE.length];
  const rowY = (i: number) => i * STEP + NODE / 2; // centro del nodo i
  const trophyY = n * STEP + TROPHY_DROP; // centro del nodo "test finale"

  // ── 🌀 La serpentina: una Bézier morbida fra un nodo e il successivo ──
  const segs = useMemo(() => {
    const parts: string[] = [];
    const states = modLessons.map(({ lesson, globalIndex }) => stateOf(globalIndex, lesson));
    const link = (x1: number, y1: number, x2: number, y2: number, lit: boolean) => {
      const c = STEP * CURVE;
      const d = `M ${xAt(x1)} ${y1} C ${xAt(x1)} ${y1 + c} ${xAt(x2)} ${y2 - c} ${xAt(x2)} ${y2}`;
      return `<path d="${d}" class="${lit ? "seg-on" : "seg-base"}"${lit ? "" : ' stroke-dasharray="9 11"'} fill="none"/>`;
    };
    modLessons.forEach((_, i) => {
      if (i === 0) return;
      const lit =
        states[i - 1] !== "lock" && states[i - 1] !== "gen" &&
        states[i] !== "lock" && states[i] !== "gen";
      parts.push(link(colOf(i - 1), rowY(i - 1), colOf(i), rowY(i), lit));
    });
    // ultimo tratto: dall'ultima lezione al nodo del test finale
    parts.push(link(colOf(n - 1), rowY(n - 1), MID, trophyY, allDone));
    return parts.join("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modLessons, n, allDone, W]);

  /**
   * 🏷️ Dove sta la scheda del titolo: sempre ACCANTO al nodo, mai dentro.
   * Colonna sinistra → scheda a destra; colonna destra → scheda a sinistra;
   * nodi centrali → alternano (2 a destra, 2 a sinistra), così sui 320 px non
   * si esce mai dallo schermo e il titolo resta per intero.
   */
  const labelLayout = (i: number, colPct: number) => {
    const offset = `calc(${NODE / 2 + GAP_LABEL}px)`;
    if (colPct === COL_A) return { rightSide: true, pos: { left: `calc(${colPct}% + ${offset})` }, width: "min(48%, 168px)" };
    if (colPct === COL_C) return { rightSide: false, pos: { right: `calc(${100 - colPct}% + ${offset})` }, width: "min(48%, 168px)" };
    if (i % 4 === 1) return { rightSide: false, pos: { right: `calc(${100 - colPct}% + ${offset})` }, width: "min(34%, 150px)" };
    return { rightSide: true, pos: { left: `calc(${colPct}% + ${offset})` }, width: "min(34%, 150px)" };
  };

  return (
    <div className="pb-32 animate-fade-in">
      {/* ── Intestazione: torna ai moduli + titolo modulo INTERO ── */}
      <div className="px-4 pt-4">
        {!hideHeader && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onBack}
              aria-label="Torna ai moduli"
              className="rounded-full shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <p className="label-small text-muted-foreground">Modulo {moduleIndex + 1}</p>
              <h2 className="font-display font-extrabold text-lg leading-snug text-foreground break-words">
                {moduleTitle}
              </h2>
            </div>
          </div>
        )}

        {!isModuleGenerating && (
          <>
            <div className="flex items-baseline justify-between gap-3 px-1 mt-3">
              <p className="text-xs text-muted-foreground font-medium">
                {doneCount} di {modLessons.length} lezioni completate
              </p>
              <p className="text-sm font-bold text-subject-accent tabular-nums">{pct}%</p>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full bg-subject-accent transition-all duration-700 ease-m3-emphasized"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Banner "in generazione" ── */}
      {isModuleGenerating && (
        <div className="mx-4 mt-4 rounded-[20px] bg-card border border-border p-4 flex items-center gap-3.5 animate-fade-up">
          <span className="w-10 h-10 rounded-[14px] bg-surface-container-high flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-5 h-5 text-tertiary animate-spin" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Sto generando le lezioni…</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Le nuove lezioni entreranno qui appena pronte
            </p>
          </div>
          <span className="text-lg font-extrabold tabular-nums text-tertiary flex-shrink-0">
            {genTotal > 0 ? Math.min(100, Math.round((genCount / genTotal) * 100)) : 8}%
          </span>
        </div>
      )}
      {isModuleGenerating && genTotal > 0 && (
        <div className="mx-4 mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-subject-accent transition-all duration-500"
            style={{ width: `${Math.max(4, Math.min(100, (genCount / genTotal) * 100))}%` }}
          />
        </div>
      )}

      {/* ── 🌀 Il percorso serpentina — ingressi a cascata ── */}
      <motion.div
        ref={boxRef}
        className="relative mx-2 mt-6"
        style={{ height }}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: prefersReduced ? 0 : 0.06, delayChildren: prefersReduced ? 0 : 0.12 } },
        }}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${W} ${height}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <g
            className="segs"
            dangerouslySetInnerHTML={{ __html: segs }}
            style={{ strokeWidth: 7, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }}
          />
        </svg>

        {/* Nodi tondi + schede del titolo (la scheda sta FUORI dal nodo) */}
        {modLessons.map(({ lesson, globalIndex }, i) => {
          const colPct = colOf(i);
          const y = rowY(i);
          const state: NodeState = isModuleGenerating ? "gen" : stateOf(globalIndex, lesson);
          const clickable = !isModuleGenerating && (state === "av" || state === "cur" || state === "done");
          const lab = labelLayout(i, colPct);

          return (
            <motion.div
              key={lesson.id}
              variants={{
                hidden: { opacity: 0, y: prefersReduced ? 0 : 14 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { type: "spring", stiffness: 380, damping: 30, bounce: 0.12, duration: 0.42 },
                },
              }}
              className="absolute inset-x-0"
              style={{ top: y - STEP / 2, height: STEP }}
            >
              {/* ── Il nodo: sempre TONDO, mai con il titolo dentro ── */}
              <div
                data-lesson-node={globalIndex}
                data-node-state={state}
                className={cn(
                  "absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full",
                  "font-display font-extrabold text-lg tabular-nums select-none transition-all duration-200",
                  state === "done" && "bg-subject-accent text-subject-accent-foreground shadow-level-2",
                  state === "cur" && "bg-subject-accent text-subject-accent-foreground shadow-level-3 ring-2 ring-background",
                  state === "cur" && !prefersReduced && "animate-breathe-ring",
                  state === "av" && "bg-card border-2 border-border text-foreground",
                  state === "lock" && "bg-surface-container-high border-2 border-border text-muted-foreground",
                  state === "gen" && "bg-card border-[2.5px] border-dashed border-tertiary text-tertiary",
                  clickable && "cursor-pointer hover:scale-[1.04] active:scale-[0.96]",
                )}
                style={{
                  left: `calc(${colPct}% - ${NODE / 2}px)`,
                  width: NODE,
                  height: NODE,
                  touchAction: "manipulation",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
                onClick={() => {
                  if (longPressTriggeredRef.current) {
                    longPressTriggeredRef.current = false;
                    return;
                  }
                  if (clickable) onSelectLesson(globalIndex);
                }}
                onPointerDown={() => startPress(lesson, globalIndex)}
                onPointerUp={() => { clearPressTimer(); detectDoubleTap(lesson, globalIndex); }}
                onPointerLeave={clearPressTimer}
                onPointerCancel={clearPressTimer}
                onContextMenu={(e) => e.preventDefault()}
                onDoubleClick={() => {
                  if (isGeneratingLesson) return;
                  setMenuLesson({ lesson, index: globalIndex });
                  setIsRenaming(false);
                  setRenameValue(lesson.title);
                }}
              >
                {state === "done" ? (
                  <Check className="h-6 w-6" strokeWidth={2.5} />
                ) : state === "lock" ? (
                  <Lock className="h-[18px] w-[18px]" strokeWidth={1.9} />
                ) : state === "gen" ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  globalIndex + 1
                )}

                {/* Etichetta del nodo corrente: "Riprendi" */}
                {state === "cur" && !isGeneratingLesson && (
                  <span className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-pill bg-subject-accent px-2.5 py-1 text-[10.5px] font-extrabold text-subject-accent-foreground shadow-level-2">
                      <Play className="h-2.5 w-2.5" fill="currentColor" strokeWidth={0} />
                      Riprendi
                    </span>
                  </span>
                )}
              </div>

              {/* ── La scheda del titolo: accanto al nodo, sfondo pieno (leggibile
                     anche sopra la curva), testo che va a capo senza limiti ── */}
              <div
                data-lesson-label={globalIndex}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 rounded-xl border bg-card px-3.5 py-2.5 shadow-level-1",
                  state === "cur" ? "border-subject-accent/50" : "border-border",
                  (state === "lock" || state === "gen") && "opacity-80",
                  clickable && "cursor-pointer",
                )}
                style={{ ...lab.pos, width: lab.width, maxWidth: lab.width }}
                onClick={() => { if (clickable) onSelectLesson(globalIndex); }}
              >
                <span className="label-small block text-muted-foreground">Lezione {globalIndex + 1}</span>
                <span className="mt-0.5 block text-[13px] font-semibold leading-snug text-foreground break-words">
                  {lesson.title}
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* ── Nodo speciale: il test finale ── */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: prefersReduced ? 0 : 14 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 360, damping: 30, bounce: 0.1, duration: 0.42 } },
          }}
          className="absolute inset-x-0"
          style={{ top: trophyY - STEP / 2, height: STEP }}
        >
          <div
            className={cn(
              "absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full font-display select-none transition-all duration-200",
              allDone
                ? "bg-subject-accent text-subject-accent-foreground shadow-level-3 cursor-pointer hover:scale-[1.04] active:scale-[0.96]"
                : "bg-surface-container-high border-2 border-border text-muted-foreground",
            )}
            style={{
              left: `calc(${MID}% - ${TROPHY / 2}px)`,
              width: TROPHY,
              height: TROPHY,
            }}
            role={allDone && showFinalTest && onStartFinalTest ? "button" : undefined}
            onClick={() => {
              if (allDone && showFinalTest && onStartFinalTest && !isLoadingFinalTest) {
                onStartFinalTest();
              }
            }}
          >
            {isLoadingFinalTest ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Trophy className="h-7 w-7" strokeWidth={1.8} />
            )}
            <div className="absolute left-1/2 top-[calc(100%+14px)] z-10 -translate-x-1/2 whitespace-nowrap">
              <div className="rounded-xl border border-border bg-card px-3.5 py-2 text-center shadow-level-1">
                <span className="label-small block text-muted-foreground">Ultimo passo</span>
                <span className="block text-[13px] font-bold text-foreground">Test finale</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottone modulo completato */}
      {allDone && (
        <div className="px-4 mt-14">
          <button
            type="button"
            onClick={onModuleCompleted}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.97]"
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
                  <span className="text-foreground font-display font-bold">{menuLesson.index + 1}</span>
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
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-[18px] bg-card hover:bg-surface-container-high transition-colors duration-200 disabled:opacity-50"
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
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-[18px] bg-card hover:bg-surface-container-high transition-colors duration-200 disabled:opacity-50"
                  >
                    <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <Pencil className="w-5 h-5 text-foreground" strokeWidth={1.75} />
                    </span>
                    <span className="text-xs font-semibold text-foreground">Rinomina</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={actionLoading !== null || !onDeleteLesson}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-[18px] bg-card hover:bg-error-container/40 transition-colors duration-200 disabled:opacity-50"
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
