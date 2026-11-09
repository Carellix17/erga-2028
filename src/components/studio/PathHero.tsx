import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  FileText,
  FolderOpen,
  Globe,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";
import { getCourseProgress } from "@/lib/courseProgress";
import { CourseCard, courseDisplayName } from "./CourseCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CourseOption {
  id: string;
  file_name: string;
  lesson_count?: number | null;
}

interface PathHeroProps {
  /** Nome del percorso (senza estensione né prefissi). */
  title?: string | null;
  /** Zero-based index of the current lesson (same source used by Home). */
  currentLessonIndex: number;
  totalLessons: number;
  /** L'ultima lezione risulta completata nel registro persistito. */
  isCourseFinished?: boolean;
  /** La fabbrica è in corso: l'eroe mostra la barra di trasformazione. */
  isGenerating?: boolean;
  progressPercent?: number;
  canResume?: boolean;
  onResume?: () => void;
  /** P38: "resume" = vista moduli — un solo pulsante primario "Riprendi
   *  lezione" al posto della coppia Continua + Cambia corso. */
  variant?: "full" | "resume";
  /** P40: presente solo nella vista moduli — al posto del menù ⋯ compare
   *  la X che chiude i moduli e torna alla Home dello Studio. */
  onCloseModules?: () => void;
  /** Tutti i percorsi disponibili (per "Cambia corso" e il selettore). */
  courses: CourseOption[];
  activeCourseId?: string | null;
  onSelectCourse?: (contextId: string) => void;
  onRegenerate?: () => void;
  onOpenMaterials?: () => void;
  onRenameCourse?: (newName: string) => Promise<void> | void;
  onDeleteCourse?: () => Promise<void> | void;
  hasNewMaterial?: boolean;
  generationBlocked?: boolean;
  freeLimitMessage?: string;
  isRegenerating?: boolean;
  /** Notifica al genitore quando il selettore corsi si apre/chiude (per nascondere i moduli sotto). */
  onSelectingChange?: (selecting: boolean) => void;
}

const getCourseIcon = (name: string) => {
  if (name.startsWith("🌐") || name.toLowerCase().includes("web")) return Globe;
  if (name.toLowerCase().endsWith(".pdf")) return FileText;
  return BookOpen;
};

// Transizione condivisa della HERO (layoutId): spring fluido per il volo
// dalla posizione inline al centro del portale e ritorno.
const heroLayoutTransition = {
  layout: { type: "spring", stiffness: 300, damping: 25 },
} as const;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const check = () => {
      const htmlReduced = document.documentElement.classList.contains("reduce-motion");
      setReduced(mql.matches || htmlReduced);
    };
    check();
    mql.addEventListener?.("change", check);
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mql.removeEventListener?.("change", check);
      observer.disconnect();
    };
  }, []);
  return reduced;
}

// Card esterne: compaiono con DELAY 0.25 (dopo il volo della hero), escono rapide.
const cardMotion = {
  initial: { opacity: 0, y: 15, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.25, duration: 0.3, ease: "easeOut" as const },
  },
  exit: { opacity: 0, transition: { duration: 0.12, ease: "easeOut" as const } },
};

/**
 * P24 MONO — l'EROE DEL PERCORSO con SELEZIONE CORSI A PORTALE.
 *
 * Perché un portale: il contenitore del selettore è renderizzato come figlio
 * diretto di document.body (createPortal), quindi NESSUN antenato (layout di
 * Studio, transizioni, overflow) può interferire con il posizionamento:
 * `fixed inset-0` = SEMPRE il viewport reale del dispositivo, mai il
 * documento scrollabile.
 *
 * La HERO usa `layoutId="hero-card"` in entrambi gli stati (inline quando si
 * studia, nel portale quando si seleziona): Framer Motion anima la card che
 * "vola" dalla sua posizione al centro dello schermo in un unico movimento
 * fluido (spring), senza alcuna API di scroll.
 *
 * Sequenza: 1) la hero vola al centro; 2) con delay 0.25s compaiono le altre
 * card sopra/sotto (lista scrollabile solo al suo interno); 3) selezione o
 * Annulla → le card escono, la hero torna alla sua posizione.
 */
export function PathHero({
  title,
  currentLessonIndex,
  totalLessons,
  isCourseFinished = false,
  isGenerating = false,
  progressPercent = 0,
  canResume = false,
  onResume,
  variant = "full",
  onCloseModules,
  courses,
  activeCourseId,
  onSelectCourse,
  onRegenerate,
  onOpenMaterials,
  onRenameCourse,
  onDeleteCourse,
  hasNewMaterial = false,
  generationBlocked = false,
  freeLimitMessage,
  isRegenerating = false,
  onSelectingChange,
}: PathHeroProps) {
  const { t } = useTranslation();
  const { triggerLight } = useHaptics();
  const [isSelectingCourse, setIsSelectingCourse] = useState(false);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const isTransitioningRef = useRef(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const active = courses.find((c) => c.id === activeCourseId) ?? courses[0];
  // 🖼️ P24 — immagine della HERO (corso attivo): centralizzata, resta nei cambi stato
  const prefersReducedMotion = usePrefersReducedMotion();
  const effectiveLayoutTransition = prefersReducedMotion ? { layout: { duration: 0 } } : heroLayoutTransition;
  const multi = courses.length > 1;
  const progress = getCourseProgress(currentLessonIndex, totalLessons, isCourseFinished);
  const pct = progress.completionPercent;
  const barPct = isGenerating
    ? Math.min(100, Math.max(4, progressPercent))
    : pct;

  const activeIdx = Math.max(0, courses.findIndex((c) => c.id === active?.id));
  const before = courses.slice(0, activeIdx);
  const after = courses.slice(activeIdx + 1);

  // OPZIONE B — all'apertura la lista parte col corso attuale al CENTRO
  // dell'area visibile: scroll iniziale del CONTENITORE interno (mai la
  // finestra). Dopo l'utente scrolla liberamente.
  const centerActiveInList = useCallback(() => {
    const list = listRef.current;
    const hero = heroRef.current;
    if (!list || !hero || transitioningId) return;
    const listRect = list.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const offset =
      heroRect.top - listRect.top - (listRect.height - heroRect.height) / 2 + list.scrollTop;
    list.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
  }, [transitioningId]);

  useEffect(() => {
    if (!isSelectingCourse || transitioningId) return;
    const timers: number[] = [];
    timers.push(window.setTimeout(() => centerActiveInList(), 90));
    timers.push(window.setTimeout(() => centerActiveInList(), 700));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [isSelectingCourse, centerActiveInList, transitioningId]);

  // La pagina di sfondo NON deve scrollare durante la selezione — mantieni bloccato durante transizione
  const prevOverflowRef = useRef<string>("");
  // Timer della transizione corso → percorso: tracciati per il cleanup.
  const transitionTimersRef = useRef<number[]>([]);
  useEffect(() => {
    if (isSelectingCourse) {
      prevOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else if (!transitioningId) {
      document.body.style.overflow = prevOverflowRef.current || "";
    }
    return () => {
      if (!isSelectingCourse && !transitioningId) {
        document.body.style.overflow = prevOverflowRef.current || "";
      }
    };
  }, [isSelectingCourse, transitioningId]);

  // Uscita rapida / smontaggio a metà transizione: ferma i timer pendenti
  // e restituisce lo scroll al documento.
  useEffect(() => {
    return () => {
      transitionTimersRef.current.forEach((t) => window.clearTimeout(t));
      transitionTimersRef.current = [];
      document.body.style.overflow = "";
    };
  }, []);

  const openPicker = useCallback(() => {
    triggerLight();
    setIsSelectingCourse(true);
    onSelectingChange?.(true);
  }, [onSelectingChange, triggerLight]);

  const closePicker = useCallback(() => {
    setIsSelectingCourse(false);
    onSelectingChange?.(false);
  }, [onSelectingChange]);

  const handleSelectCourse = useCallback((course: CourseOption) => {
    if (isTransitioningRef.current) return;
    triggerLight();
    if (course.id === activeCourseId) {
      closePicker();
      return;
    }

    // Preserve scroll position — do NOT reset scrollTop synchronously
    const scrollTop = listRef.current?.scrollTop ?? 0;

    // Synchronously update selected course — maintains layoutId bridge continuously
    onSelectCourse?.(course.id);

    isTransitioningRef.current = true;
    setTransitioningId(course.id);

    // I timer della transizione vivono in un ref: se il componente smonta a
    // metà volo (uscita rapida da Studio), il cleanup li ferma invece di
    // toccare lo stato di un componente morto o lasciare il body bloccato.
    transitionTimersRef.current.forEach((t) => window.clearTimeout(t));
    transitionTimersRef.current = [];

    // Keep scroll position intact during FLIP measurement via layoutScroll
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = scrollTop;
      }
      // Defer unmounting until after layout animation has captured First position
      transitionTimersRef.current.push(window.setTimeout(() => {
        closePicker();
      }, 60));
    });

    // Clear transitioning after animation completes
    transitionTimersRef.current.push(window.setTimeout(() => {
      setTransitioningId(null);
      isTransitioningRef.current = false;
      document.body.style.overflow = prevOverflowRef.current || "";
    }, 650));
  }, [activeCourseId, closePicker, onSelectCourse, triggerLight]);

  const handleSaveRename = async () => {
    if (!onRenameCourse) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === title) {
      setRenameOpen(false);
      return;
    }
    setIsSavingRename(true);
    try {
      await onRenameCourse(trimmed);
      setRenameOpen(false);
    } finally {
      setIsSavingRename(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteCourse) return;
    setIsDeleting(true);
    try {
      await onDeleteCourse();
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderCourseCard = (course: CourseOption) => {
    const Icon = getCourseIcon(course.file_name);
    const meta =
      typeof course.lesson_count === "number" && course.lesson_count > 0
        ? `${course.lesson_count} lezioni`
        : null;
    const isTransitioning = transitioningId === course.id;
    return (
      <CourseCard
        key={course.id}
        course={course}
        onSelect={() => handleSelectCourse(course)}
        actionLabel="Scegli corso"
        // Preserve scroll measurement: course-specific layoutId maintains continuous viewport measurement
        layoutId={`course-card-${course.id}`}
        layout
        transition={isTransitioning ? effectiveLayoutTransition : undefined}
        {...(!isTransitioning && !prefersReducedMotion ? cardMotion : {})}
        style={isTransitioning ? { zIndex: 20 } : undefined}
      >
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
          <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
          Percorso
        </p>
        <h3 className="mt-1.5 break-words font-sans text-base font-normal leading-snug text-foreground sm:text-lg">
          {courseDisplayName(course.file_name)}
        </h3>
        {meta && <p className="mt-1 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">{meta}</p>}
      </CourseCard>
    );
  };

  // ── Contenuto interno della HERO (condiviso tra inline e portale) ──
  // text-contrast alla RADICE: tutto ciò che dentro usa currentColor (il
  // binario e il fill della barra, i veli dei pulsanti Continua/Cambia
  // corso, i tasti ⋯ e ✕) eredita l'INCHIOSTRO DELLA COPERTINA, non quello
  // della pagina — prima, sulle copertine profonde in chiaro, barra e
  // pulsanti risultavano inchiostro su inchiostro, invisibili.
  const heroInner = (inPicker: boolean) => (
    <div className="relative text-foreground">
      {/* Riga alta: etichetta + menù ⋯ */}
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
          {inPicker ? "Seleziona un percorso" : "Percorso attuale"}
        </p>
        {!inPicker && onCloseModules ? (
          /* ✕ P40 — vista moduli: la X chiude i moduli (nessun menù). */
          <button
            type="button"
            onClick={() => { triggerLight(); onCloseModules(); }}
            aria-label="Chiudi moduli"
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none"
          >
            <X className="w-5 h-5 text-current" strokeWidth={2} />
          </button>
        ) : (
        <DropdownMenu onOpenChange={(open) => { if (open) triggerLight(); }}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Azioni corso"
              className="relative flex w-11 h-11 shrink-0 items-center justify-center rounded-full border border-white/25 transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none"
            >
              <MoreHorizontal className="w-5 h-5 text-current" strokeWidth={2} />
              {hasNewMaterial && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-warning ring-2 ring-current"
                  aria-label="Nuovo materiale da includere"
                />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-dialog bg-popover text-popover-foreground shadow-level-3 border border-border p-1.5">
            {hasNewMaterial && (
              <DropdownMenuLabel className="text-xs font-medium text-warning px-3 py-2 leading-snug">
                Nuovo materiale: rigenera il percorso per includerlo
              </DropdownMenuLabel>
            )}
            {onRegenerate && (
              <DropdownMenuItem
                onSelect={() => { triggerLight(); onRegenerate?.(); }}
                disabled={isGenerating || isRegenerating || generationBlocked}
                className="rounded-button cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-foreground/80" strokeWidth={1.75} />
                <span className="flex-1">Rigenera percorso</span>
                {isRegenerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              </DropdownMenuItem>
            )}
            {onOpenMaterials && (
              <DropdownMenuItem onSelect={() => { triggerLight(); onOpenMaterials?.(); }} className="rounded-button cursor-pointer">
                <FolderOpen className="w-4 h-4 text-foreground/80" strokeWidth={1.75} />
                <span className="flex-1">Apri materiali</span>
              </DropdownMenuItem>
            )}
            {onRenameCourse && (
              <DropdownMenuItem
                onSelect={() => {
                  triggerLight();
                  setRenameValue(title ?? "");
                  setRenameOpen(true);
                }}
                className="rounded-button cursor-pointer"
              >
                <Pencil className="w-4 h-4 text-foreground/80" strokeWidth={1.75} />
                <span className="flex-1">Rinomina corso</span>
              </DropdownMenuItem>
            )}
            {onDeleteCourse && (
              <>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onSelect={() => { triggerLight(); setConfirmDelete(true); }}
                  className="rounded-button cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                  <span className="flex-1">Elimina corso</span>
                </DropdownMenuItem>
              </>
            )}
            {generationBlocked && freeLimitMessage && (
              <div className="mt-1 px-3 py-2 rounded-button bg-warning-container/70 text-warning text-xs leading-snug flex gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>{freeLimitMessage}</span>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        )}
      </div>

      {/* Titolo: nome intero — usa text-contrast per garantire visibilità su card scura in light mode */}
      <h2 className="mt-2 break-words pr-1 font-sans text-xl font-normal leading-snug text-foreground sm:text-2xl">
        {title ?? "Il tuo percorso"}
      </h2>

      {/* Avanzamento */}
      {isGenerating ? (
        <>
          <p className="mt-4 text-xs text-muted-foreground">Erga sta trasformando il tuo materiale…</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-white/15">
            <div
              className="h-full rounded-sm bg-foreground transition-[width] duration-200"
              style={{ width: `${barPct}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            {progress.totalLessons > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("lesson.lessonOf", { number: progress.lessonNumber, total: progress.totalLessons })}
              </p>
            )}
            <p className="font-mono text-sm tabular-nums text-foreground">{pct}%</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-white/15">
            <div
              className="h-full rounded-sm bg-foreground transition-[width] duration-200"
              style={{ width: `${barPct}%` }}
            />
          </div>
        </>
      )}

      {/* Azioni */}
      {!isGenerating && (variant === "resume" || canResume || multi) && (
        <AnimatePresence mode="popLayout" initial={false}>
          {!inPicker ? (
            <motion.div
              key="actions-closed"
              layout
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="mt-5 flex items-stretch gap-2"
            >
              {variant === "resume" ? (
                /* 🧭 P38 — vista moduli: UN solo pulsante primario, ben visibile. */
                <motion.button
                  layout
                  type="button"
                  onClick={() => { triggerLight(); onResume?.(); }}
                  disabled={!canResume}
                  aria-label="Riprendi lezione"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-button border border-white/25 bg-transparent px-5 font-sans text-sm font-normal text-foreground transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 motion-reduce:transform-none"
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={1.9} />
                  Riprendi lezione
                </motion.button>
              ) : (
                <>
              {canResume && onResume && (
                <Button
                  asChild
                  type="button"
                  onClick={() => { triggerLight(); onResume(); }}
                  className="min-w-0 flex-1 gap-1 px-1.5 sm:gap-2 sm:px-4"
                >
                  <motion.button layout>
                    <BookOpen className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={1.9} />
                    Continua
                  </motion.button>
                </Button>
              )}
              {multi && onSelectCourse && (
                <motion.button
                  layout
                  type="button"
                  onClick={openPicker}
                  className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-button border border-white/25 bg-transparent px-1.5 text-xs font-normal text-foreground transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none sm:gap-1.5 sm:px-3 sm:text-sm"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={1.9} />
                  Cambia corso
                </motion.button>
              )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="actions-open"
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
              className="mt-5 flex items-stretch gap-2"
            >
              {canResume && onResume ? (
                <Button
                  asChild
                  type="button"
                  onClick={() => { triggerLight(); closePicker(); onResume?.(); }}
                  className="min-w-0 flex-1 gap-1 px-1.5 sm:gap-2 sm:px-4"
                >
                  <motion.button layout>
                    <BookOpen className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" strokeWidth={1.9} />
                    Continua
                  </motion.button>
                </Button>
              ) : (
                <div className="flex-1" />
              )}
              <motion.button
                layout
                type="button"
                onClick={() => { triggerLight(); closePicker(); }}
                className="inline-flex h-11 min-w-0 items-center justify-center gap-1 rounded-button border border-white/25 bg-transparent px-1.5 text-xs font-normal text-foreground transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transform-none sm:gap-1.5 sm:px-4 sm:text-sm"
              >
                <X className="w-4 h-4 shrink-0" strokeWidth={2} />
                Annulla
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );

  return (
    <section className="px-4 pt-4">
      {/* HERO inline — course-specific layoutId for seamless transition from any scroll depth */}
      <motion.div
        layout
        layoutId={transitioningId ? `course-card-${transitioningId}` : isSelectingCourse ? undefined : `course-card-${active?.id}`}
        transition={effectiveLayoutTransition}
        className={`relative overflow-hidden rounded-card border border-border bg-card p-5 text-foreground sm:p-6 ${isSelectingCourse && !transitioningId ? "invisible pointer-events-none h-0 overflow-hidden p-0 border-0" : ""}`}
      >
          {heroInner(false)}
        </motion.div>

      {/* ── SELEZIONE CORSI: PORTALE su document.body (viewport garantito) ── */}
      {createPortal(
        <AnimatePresence>
          {isSelectingCourse && (
            <motion.div
              key="course-picker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[80] flex flex-col bg-background"
              onClick={(e) => {
                // tap sullo sfondo (non sulle card) → chiudi
                if (e.target === e.currentTarget) closePicker();
              }}
            >
              <div className="flex-1 min-h-0 w-full max-w-lg mx-auto flex flex-col px-4 py-6">
                <motion.div ref={listRef as React.Ref<HTMLDivElement>} layoutScroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                  <div className="flex flex-col">
                    {/* Card sopra */}
                    {before.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3 mb-4"
                      >
                        {before.map(renderCourseCard)}
                      </motion.div>
                    )}

                    {/* HERO: in flusso normale; all'apertura la lista la scrolla al centro */}
                    <motion.div
                      layout
                      ref={heroRef}
                      layoutId={`course-card-${active?.id}`}
                      transition={effectiveLayoutTransition}
                      className="relative overflow-hidden rounded-card border border-border bg-card p-5 text-foreground sm:p-6"
                      layoutScroll
                    >
                      {heroInner(true)}
                    </motion.div>

                    {/* Card sotto */}
                    {after.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3 mt-4"
                      >
                        {after.map(renderCourseCard)}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Rinomina corso ── */}
      <Drawer open={renameOpen} onOpenChange={(o) => !o && setRenameOpen(false)}>
        <DrawerContent className="rounded-t-sheet">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 font-display text-2xl">
              <Pencil className="w-5 h-5 text-foreground" strokeWidth={1.75} />
              Rinomina corso
            </DrawerTitle>
            <DrawerDescription>
              Dai un nuovo nome al tuo corso. Il cambiamento verrà salvato nel cloud.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2">
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveRename();
              }}
              placeholder="Nome del corso"
              className="rounded-dialog"
            />
          </div>
          <DrawerFooter className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-button"
              onClick={() => setRenameOpen(false)}
              disabled={isSavingRename}
            >
              Annulla
            </Button>
            <Button
              className="flex-1 h-12 rounded-button"
              onClick={handleSaveRename}
              disabled={isSavingRename || !renameValue.trim()}
            >
              {isSavingRename ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* ── Elimina corso ── */}
      <AlertDialog open={confirmDelete} onOpenChange={(o) => !isDeleting && setConfirmDelete(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare "{title ?? "questo corso"}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Verranno rimosse anche tutte le lezioni e gli esercizi collegati a questo corso. L'azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="border border-destructive bg-transparent text-destructive hover:bg-destructive/10">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
