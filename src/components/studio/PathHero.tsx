import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  Check,
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
import { cn } from "@/lib/utils";
import { cleanCourseName } from "@/lib/courseName";
import { getSubjectAccent, getAccentForeground } from "@/lib/subjectColors";
import { CourseCard, courseDisplayName } from "./CourseCard";
import { CourseCardBackground } from "./CourseCardBackground";
import { useCourseImage } from "@/hooks/useCourseImage";
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
  completedCount: number;
  totalLessons: number;
  /** La fabbrica è in corso: l'eroe mostra la barra di trasformazione. */
  isGenerating?: boolean;
  progressPercent?: number;
  canResume?: boolean;
  onResume?: () => void;
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
  completedCount,
  totalLessons,
  isGenerating = false,
  progressPercent = 0,
  canResume = false,
  onResume,
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
  const [isSelectingCourse, setIsSelectingCourse] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const active = courses.find((c) => c.id === activeCourseId) ?? courses[0];
  // 🖼️ P24 — immagine della HERO (corso attivo): centralizzata, resta nei cambi stato
  const heroCover = useCourseImage(active?.id ?? null, active?.file_name ?? "");
  const multi = courses.length > 1;
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
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
    if (!list || !hero) return;
    const listRect = list.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const offset =
      heroRect.top - listRect.top - (listRect.height - heroRect.height) / 2 + list.scrollTop;
    list.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!isSelectingCourse) return;
    const timers: number[] = [];
    // dopo il mount (layout iniziale)
    timers.push(window.setTimeout(() => centerActiveInList(), 90));
    // dopo l'ingresso delle card esterne (delay 0.25s) l'altezza cambia
    timers.push(window.setTimeout(() => centerActiveInList(), 700));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [isSelectingCourse, centerActiveInList]);

  // La pagina di sfondo NON deve scrollare durante la selezione.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = isSelectingCourse ? "hidden" : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isSelectingCourse]);

  const openPicker = () => {
    setIsSelectingCourse(true);
    onSelectingChange?.(true);
  };
  const closePicker = () => {
    setIsSelectingCourse(false);
    onSelectingChange?.(false);
  };

  const handleSelectCourse = (course: CourseOption) => {
    onSelectCourse?.(course.id);
    closePicker();
  };

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
    return (
      <CourseCard
        key={course.id}
        course={course}
        onSelect={() => handleSelectCourse(course)}
        actionLabel="Scegli corso"
        {...cardMotion}
      >
        <p className="label-small tracking-[0.14em] opacity-70 flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" strokeWidth={2} />
          Percorso
        </p>
        <h3 className="mt-1.5 font-display font-extrabold text-base sm:text-lg leading-snug break-words">
          {courseDisplayName(course.file_name)}
        </h3>
        {meta && <p className="text-xs opacity-75 mt-1">{meta}</p>}
      </CourseCard>
    );
  };

  // ── Contenuto interno della HERO (condiviso tra inline e portale) ──
  const heroInner = (inPicker: boolean) => (
    <div className="relative">
      {/* Riga alta: etichetta + menù ⋯ */}
      <div className="flex items-center justify-between gap-3">
        <p className="label-small tracking-[0.16em] opacity-70">
          {inPicker ? "Seleziona un percorso" : "Percorso attuale"}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Azioni corso"
              className="relative w-10 h-10 rounded-full transition-opacity duration-200 flex items-center justify-center shrink-0 hover:opacity-80 active:scale-[0.95]"
              style={{
                backgroundColor: "color-mix(in srgb, currentColor 15%, transparent)",
              }}
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
          <DropdownMenuContent align="end" className="w-64 rounded-2xl bg-popover text-popover-foreground shadow-level-3 border border-border p-1.5">
            {hasNewMaterial && (
              <DropdownMenuLabel className="text-xs font-medium text-warning px-3 py-2 leading-snug">
                Nuovo materiale: rigenera il percorso per includerlo
              </DropdownMenuLabel>
            )}
            {onRegenerate && (
              <DropdownMenuItem
                onSelect={onRegenerate}
                disabled={isGenerating || isRegenerating || generationBlocked}
                className="rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-foreground/80" strokeWidth={1.75} />
                <span className="flex-1">Rigenera percorso</span>
                {isRegenerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              </DropdownMenuItem>
            )}
            {onOpenMaterials && (
              <DropdownMenuItem onSelect={onOpenMaterials} className="rounded-xl cursor-pointer">
                <FolderOpen className="w-4 h-4 text-foreground/80" strokeWidth={1.75} />
                <span className="flex-1">Apri materiali</span>
              </DropdownMenuItem>
            )}
            {onRenameCourse && (
              <DropdownMenuItem
                onSelect={() => {
                  setRenameValue(title ?? "");
                  setRenameOpen(true);
                }}
                className="rounded-xl cursor-pointer"
              >
                <Pencil className="w-4 h-4 text-foreground/80" strokeWidth={1.75} />
                <span className="flex-1">Rinomina corso</span>
              </DropdownMenuItem>
            )}
            {onDeleteCourse && (
              <>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onSelect={() => setConfirmDelete(true)}
                  className="rounded-xl cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                  <span className="flex-1">Elimina corso</span>
                </DropdownMenuItem>
              </>
            )}
            {generationBlocked && freeLimitMessage && (
              <div className="mt-1 px-3 py-2 rounded-xl bg-warning-container/70 text-warning text-xs leading-snug flex gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.75} />
                <span>{freeLimitMessage}</span>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Titolo: nome intero */}
      <h2 className="mt-2 font-display font-extrabold text-xl sm:text-2xl leading-snug break-words pr-1">
        {title ?? "Il tuo percorso"}
      </h2>

      {/* Avanzamento */}
      {isGenerating ? (
        <>
          <p className="mt-4 text-xs opacity-80">Erga sta trasformando il tuo materiale…</p>
          <div
            className="mt-2 h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "color-mix(in srgb, currentColor 15%, transparent)" }}
          >
            <div
              className="h-full rounded-full bg-current transition-all duration-300"
              style={{ width: `${barPct}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex items-baseline justify-between gap-3">
            <p className="text-sm opacity-80">
              {completedCount} di {totalLessons} lezioni
            </p>
            <p className="text-sm font-bold tabular-nums">{pct}%</p>
          </div>
          <div
            className="mt-2 h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "color-mix(in srgb, currentColor 15%, transparent)" }}
          >
            <div
              className="h-full rounded-full bg-current transition-all duration-700 ease-m3-emphasized"
              style={{ width: `${barPct}%` }}
            />
          </div>
        </>
      )}

      {/* Azioni */}
      {!isGenerating && (canResume || multi) && (
        <AnimatePresence mode="popLayout" initial={false}>
          {!inPicker ? (
            <motion.div
              key="actions-closed"
              layout
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="mt-5 flex items-stretch gap-2.5"
            >
              {canResume && onResume && (
                <motion.button
                  layout
                  type="button"
                  onClick={onResume}
                  className="inline-flex items-center gap-1.5 rounded-full border h-11 px-4 text-sm font-semibold transition-opacity duration-200 hover:opacity-80 active:scale-[0.97]"
                  style={{
                    backgroundColor: "color-mix(in srgb, currentColor 8%, transparent)",
                    borderColor: "color-mix(in srgb, currentColor 20%, transparent)",
                  }}
                >
                  <BookOpen className="w-4 h-4 shrink-0" strokeWidth={1.9} />
                  Riprendi
                </motion.button>
              )}
              {multi && onSelectCourse && (
                <motion.button
                  layout
                  type="button"
                  onClick={openPicker}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border h-11 flex-1 px-3 text-sm font-semibold transition-opacity duration-200 hover:opacity-80 active:scale-[0.97]"
                  style={{
                    backgroundColor: "color-mix(in srgb, currentColor 8%, transparent)",
                    borderColor: "color-mix(in srgb, currentColor 20%, transparent)",
                  }}
                >
                  <ArrowLeftRight className="w-4 h-4 shrink-0" strokeWidth={1.9} />
                  Cambia corso
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="actions-open"
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.18 }}
              className="mt-5 flex items-stretch gap-2.5"
            >
              {canResume && onResume ? (
                <motion.button
                  layout
                  type="button"
                  onClick={onResume}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border h-11 flex-1 px-4 text-sm font-semibold transition-opacity duration-200 hover:opacity-80 active:scale-[0.97]"
                  style={{
                    backgroundColor: "color-mix(in srgb, currentColor 8%, transparent)",
                    borderColor: "color-mix(in srgb, currentColor 20%, transparent)",
                  }}
                >
                  <BookOpen className="w-4 h-4 shrink-0" strokeWidth={1.9} />
                  Riprendi
                </motion.button>
              ) : (
                <div className="flex-1" />
              )}
              <motion.button
                layout
                type="button"
                onClick={closePicker}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border h-11 px-4 text-sm font-semibold transition-opacity duration-200 hover:opacity-80 active:scale-[0.97]"
                style={{
                  backgroundColor: "color-mix(in srgb, currentColor 8%, transparent)",
                  borderColor: "color-mix(in srgb, currentColor 20%, transparent)",
                }}
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

  // Lo sfondo lo gestisce CourseCardBackground (base scura + glow materia):
  // il testo è SEMPRE bianco per il massimo contrasto.
  const heroStyle = {
    color: "#ffffff",
  } as const;

  return (
    <section className="px-4 pt-4">
      {/* ── HERO inline (stato normale) — con layoutId per il volo condiviso ── */}
      {!isSelectingCourse && (
        <motion.div
          layout
          layoutId="hero-card"
          transition={heroLayoutTransition}
          className="relative overflow-hidden rounded-[32px] shadow-level-2 p-5 sm:p-6"
          style={heroStyle}
        >
          <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-current opacity-[0.07]" aria-hidden />
          <div className="absolute -right-2 -bottom-20 w-36 h-36 rounded-full bg-current opacity-[0.05]" aria-hidden />
          <div className="absolute left-1/3 -bottom-24 w-40 h-40 rounded-full bg-current opacity-[0.04]" aria-hidden />
          <CourseCardBackground
            coverUrl={heroCover}
            subjectColor="var(--subject-accent, #f59e0b)"
          />
          {heroInner(false)}
        </motion.div>
      )}

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
                <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
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

                    {/* HERO: in flusso normale; all'apertura la lista la scrolla al centro (opzione B) */}
                    <motion.div
                      layout
                      ref={heroRef}
                      layoutId="hero-card"
                      transition={heroLayoutTransition}
                      className="relative overflow-hidden rounded-[32px] shadow-level-2 p-5 sm:p-6"
                      style={heroStyle}
                    >
                      <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-current opacity-[0.07]" aria-hidden />
                      <div className="absolute -right-2 -bottom-20 w-36 h-36 rounded-full bg-current opacity-[0.05]" aria-hidden />
                      <div className="absolute left-1/3 -bottom-24 w-40 h-40 rounded-full bg-current opacity-[0.04]" aria-hidden />
                      <CourseCardBackground
                        coverUrl={heroCover}
                        subjectColor="var(--subject-accent, #f59e0b)"
                      />
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Rinomina corso ── */}
      <Drawer open={renameOpen} onOpenChange={(o) => !o && setRenameOpen(false)}>
        <DrawerContent className="rounded-t-[32px]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 font-display text-2xl">
              <Pencil className="w-5 h-5 text-foreground" strokeWidth={1.75} />
              Rinomina corso
            </DrawerTitle>
            <DrawerDescription>
              Dai un nuovo nome al tuo corso. Il cambiamento verrà salvato nel cloud.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveRename();
              }}
              placeholder="Nome del corso"
              className="rounded-2xl"
            />
          </div>
          <DrawerFooter className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-full"
              onClick={() => setRenameOpen(false)}
              disabled={isSavingRename}
            >
              Annulla
            </Button>
            <Button
              className="flex-1 h-12 rounded-full"
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
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
