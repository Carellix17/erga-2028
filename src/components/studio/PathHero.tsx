import { useCallback, useEffect, useRef, useState } from "react";
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

const cardMotion = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};

/**
 * P24 MONO — l'EROE DEL PERCORSO con MORPHING del selettore corsi:
 * - stato `isSelectingCourse`: "Cambia corso" sparisce, "Riprendi" si espande
 *   al 100% (AnimatePresence + layout), le card degli altri corsi compaiono
 *   sopra/sotto la hero (opacity 0→1, scale 0.95→1) e la pagina scorre;
 * - gli altri percorsi sono card STESSO STILE della hero (sfondo accento,
 *   titolo, meta) con un solo tasto "Scegli corso";
 * - tap sulla hero o "Annulla" → ritorno allo stato singolo;
 * - selezione di un corso → diventa la nuova hero e si chiude il selettore.
 * Solo prop di framer-motion (transform/opacity), nessun JS pesante.
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
  // Fase 1: la hero va al centro (le card degli altri corsi NON sono ancora montate)
  const [isCentering, setIsCentering] = useState(false);
  // Fase 2: centratura finita → compaiono le card sopra/sotto
  const [showOthers, setShowOthers] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);

  const active = courses.find((c) => c.id === activeCourseId) ?? courses[0];
  const multi = courses.length > 1;
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const barPct = isGenerating
    ? Math.min(100, Math.max(4, progressPercent))
    : pct;

  const activeIdx = Math.max(0, courses.findIndex((c) => c.id === active?.id));
  const before = courses.slice(0, activeIdx);
  const after = courses.slice(activeIdx + 1);

  // Centra la hero nel viewport (calcolo esatto con clamp a 0)
  const centerHero = useCallback(() => {
    const el = heroRef.current;
    if (!el) return;
    // l'header sticky occupa spazio in alto: il centro visivo è l'area sotto di esso
    const header = document.querySelector("header");
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const rect = el.getBoundingClientRect();
    const avail = window.innerHeight - headerH;
    const top = Math.max(
      0,
      window.scrollY + rect.top - headerH - (avail - rect.height) / 2
    );
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  // FASE 1 — la hero va al centro PRIMA di mostrare gli altri corsi.
  // FASE 2 — compaiono le card sopra/sotto; la hero viene RICENTRATA dopo
  // la fine della layout animation di framer-motion (~300ms) + verifica
  // finale: così resta SEMPRE al centro dello schermo.
  useEffect(() => {
    if (!isSelectingCourse) return;
    setIsCentering(true);
    setShowOthers(false);
    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        centerHero();
        timers.push(
          window.setTimeout(() => {
            setShowOthers(true);
            // aspetta che la layout animation della hero sia finita
            timers.push(
              window.setTimeout(() => {
                centerHero();
                // verifica finale: se lo scroll smooth non è ancora arrivato,
                // ri-calcola dalla posizione corrente e ri-centra
                timers.push(window.setTimeout(() => centerHero(), 400));
                setIsCentering(false);
              }, 420)
            );
          }, 520)
        );
      }, 40)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [isSelectingCourse, centerHero]);

  // Chiudi: reset di tutte le fasi
  useEffect(() => {
    if (isSelectingCourse) return;
    setIsCentering(false);
    setShowOthers(false);
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
    // 🌲 P24 — ogni corso ha il PROPRIO colore materia (non quello della hero)
    const accent = getSubjectAccent(course.file_name);
    const fg = getAccentForeground(accent);
    return (
      <motion.button
        key={course.id}
        layout
        {...cardMotion}
        type="button"
        onClick={() => handleSelectCourse(course)}
        className="relative w-full overflow-hidden rounded-[28px] shadow-level-2 p-4 sm:p-5 text-left transition-transform duration-150 active:scale-[0.98]"
        style={{
          backgroundColor: accent,
          color: fg,
        }}
      >
        {/* Motivo organico tono-su-tono, come la hero */}
        <div className="absolute -right-10 -top-14 w-36 h-36 rounded-full bg-current opacity-[0.07]" aria-hidden />
        <div className="absolute -right-1 -bottom-16 w-28 h-28 rounded-full bg-current opacity-[0.05]" aria-hidden />
        <div className="relative">
          <p className="label-small tracking-[0.14em] opacity-70 flex items-center gap-2">
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            Percorso
          </p>
          <h3 className="mt-1.5 font-display font-extrabold text-base sm:text-lg leading-snug break-words text-current">
            {cleanCourseName(course.file_name)}
          </h3>
          {meta && (
            <p className="text-xs opacity-75 mt-1">{meta}</p>
          )}
          <span
            className="mt-3.5 inline-flex items-center justify-center gap-1.5 rounded-full border h-10 w-full text-sm font-semibold"
            style={{
              backgroundColor: "color-mix(in srgb, currentColor 8%, transparent)",
              borderColor: "color-mix(in srgb, currentColor 20%, transparent)",
            }}
          >
            <Check className="w-4 h-4 shrink-0" strokeWidth={2.2} />
            Scegli corso
          </span>
        </div>
      </motion.button>
    );
  };

  return (
    <section
      className={
        isSelectingCourse
          ? "px-4 pt-4 min-h-[calc(100vh-4rem)] flex flex-col"
          : "px-4 pt-4"
      }
    >
      {/* Card corsi PRIMA dell'attiva (compaiono sopra la hero) */}
      <AnimatePresence initial={false}>
        {isSelectingCourse && showOthers && before.length > 0 && (
          <motion.div
            key="picker-before"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 mb-4"
          >
            {before.map(renderCourseCard)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero card ── */}
      <motion.div
        layout
        ref={heroRef}
        onClick={(e) => {
          // tap sulla hero (non sui bottoni interni) → chiudi il selettore
          if (isSelectingCourse && !(e.target as HTMLElement).closest("button")) {
            closePicker();
          }
        }}
        className="relative overflow-hidden rounded-[32px] shadow-level-2 p-5 sm:p-6"
        style={{
          backgroundColor: "var(--subject-accent, #f59e0b)",
          color: "var(--subject-accent-foreground, #111111)",
        }}
      >
        {/* Motivo organico tono-su-tono, leggibile su accenti chiari o scuri. */}
        <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-current opacity-[0.07]" aria-hidden />
        <div className="absolute -right-2 -bottom-20 w-36 h-36 rounded-full bg-current opacity-[0.05]" aria-hidden />
        <div className="absolute left-1/3 -bottom-24 w-40 h-40 rounded-full bg-current opacity-[0.04]" aria-hidden />

        <div className="relative">
          {/* ── Riga alta: etichetta a sinistra, menù ⋯ in alto a destra ── */}
          <div className="flex items-center justify-between gap-3">
            <p className="label-small tracking-[0.16em] opacity-70">
              {isSelectingCourse ? "Seleziona un percorso" : "Percorso attuale"}
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

          {/* ── Titolo: a tutta larghezza, NOME INTERO (niente tagli su mobile) ── */}
          <h2 className="mt-2 font-display font-extrabold text-xl sm:text-2xl leading-snug break-words pr-1">
            {title ?? "Il tuo percorso"}
          </h2>

          {/* ── Avanzamento: scritta + barra con percentuale ── */}
          {isGenerating ? (
            <>
              <p className="mt-4 text-xs opacity-80">
                Erga sta trasformando il tuo materiale…
              </p>
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

          {/* ── Azioni con morphing: Cambia corso ⇄ Riprendi espanso + Annulla ── */}
          {!isGenerating && (canResume || multi) && (
            <AnimatePresence mode="popLayout" initial={false}>
              {!isSelectingCourse ? (
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
      </motion.div>

      {/* Card corsi DOPO l'attiva (compaiono sotto la hero) */}
      <AnimatePresence initial={false}>
        {isSelectingCourse && showOthers && after.length > 0 && (
          <motion.div
            key="picker-after"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 mt-4"
          >
            {after.map(renderCourseCard)}
          </motion.div>
        )}
      </AnimatePresence>

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
