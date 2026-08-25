import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
import { cn } from "@/lib/utils";
import { cleanCourseName } from "@/lib/courseName";
import { getSubjectAccent } from "@/lib/subjectColors";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
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

export interface CourseOption {
  id: string;
  file_name: string;
  lesson_count?: number | null;
}

interface PathHeroProps {
  title?: string | null;
  completedCount: number;
  totalLessons: number;
  isGenerating?: boolean;
  progressPercent?: number;
  canResume?: boolean;
  onResume?: () => void;
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
  onSelectingChange?: (selecting: boolean) => void;
}

const getCourseIcon = (name: string) => {
  if (name.startsWith("🌐") || name.toLowerCase().includes("web")) return Globe;
  if (name.toLowerCase().endsWith(".pdf")) return FileText;
  return BookOpen;
};

const heroLayoutTransition = {
  layout: { type: "spring", stiffness: 300, damping: 25 },
} as const;

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
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const active = courses.find((c) => c.id === activeCourseId) ?? courses[0];
  const heroCover = useCourseImage(active?.id ?? null, active?.file_name ?? "");
  const transitioningCourse = courses.find((c) => c.id === transitioningId) ?? null;
  const transitioningCover = useCourseImage(transitioningId, transitioningCourse?.file_name ?? "");
  const multi = courses.length > 1;
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const barPct = isGenerating ? Math.min(100, Math.max(4, progressPercent)) : pct;

  const activeIdx = Math.max(0, courses.findIndex((c) => c.id === active?.id));
  const before = courses.slice(0, activeIdx);
  const after = courses.slice(activeIdx + 1);

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

  // Body scroll lock — defer restore until animation completes
  const prevOverflowRef = useRef<string>("");
  useEffect(() => {
    if (isSelectingCourse) {
      prevOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else if (!isAnimating) {
      document.body.style.overflow = prevOverflowRef.current || "";
    }
    return () => {
      if (!isSelectingCourse && !isAnimating) {
        document.body.style.overflow = prevOverflowRef.current || "";
      }
    };
  }, [isSelectingCourse, isAnimating]);

  const openPicker = useCallback(() => {
    setIsSelectingCourse(true);
    onSelectingChange?.(true);
  }, [onSelectingChange]);

  const closePicker = useCallback(() => {
    setIsSelectingCourse(false);
    onSelectingChange?.(false);
  }, [onSelectingChange]);

  const handleSelectCourse = useCallback(
    (course: CourseOption) => {
      if (isAnimating) return;
      if (course.id === activeCourseId) {
        closePicker();
        return;
      }

      // Preserve scroll position — do NOT reset scrollTop synchronously
      // Capture current scrollTop to restore if needed, but we keep it intact during transition
      const currentScrollTop = listRef.current?.scrollTop ?? 0;

      setTransitioningId(course.id);
      setIsAnimating(true);

      // Synchronously update selected course state — remains synchronized with visual transition
      onSelectCourse?.(course.id);

      // Defer unmounting/resetting scroll until layout animation finishes
      // The scroll container maintains exact scroll position during shared element transition
      // via layoutScroll prop, ensuring getBoundingClientRect() is viewport-relative
      requestAnimationFrame(() => {
        // Keep scroll position during first frame
        if (listRef.current) {
          listRef.current.scrollTop = currentScrollTop;
        }
        setTimeout(() => {
          closePicker();
        }, 80);
      });

      setTimeout(() => {
        setTransitioningId(null);
        setIsAnimating(false);
        document.body.style.overflow = prevOverflowRef.current || "";
      }, 650);
    },
    [activeCourseId, closePicker, isAnimating, onSelectCourse]
  );

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

  const renderCourseCard = (course: CourseOption, index?: number) => {
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
        // Fix: use course-specific layoutId for continuous viewport measurement
        // When this card is selected, it shares layoutId with target hero slot
        layoutId={isTransitioning ? `course-card-${course.id}` : `course-card-${course.id}`}
        layout
        transition={isTransitioning ? heroLayoutTransition : undefined}
        {...(!isTransitioning ? cardMotion : {})}
        style={isTransitioning ? { zIndex: 20 } : undefined}
        className={cn(isTransitioning && "ring-2 ring-primary/30")}
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

  const heroInner = (inPicker: boolean) => (
    <div className="relative">
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
          <DropdownMenuContent align="end" className="w-64 rounded-dialog bg-popover text-popover-foreground shadow-level-3 border border-border p-1.5">
            {hasNewMaterial && (
              <DropdownMenuLabel className="text-xs font-medium text-warning px-3 py-2 leading-snug">
                Nuovo materiale: rigenera il percorso per includerlo
              </DropdownMenuLabel>
            )}
            {onRegenerate && (
              <DropdownMenuItem
                onSelect={onRegenerate}
                disabled={isGenerating || isRegenerating || generationBlocked}
                className="rounded-button cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-foreground/80" strokeWidth={1.75} />
                <span className="flex-1">Rigenera percorso</span>
                {isRegenerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              </DropdownMenuItem>
            )}
            {onOpenMaterials && (
              <DropdownMenuItem onSelect={onOpenMaterials} className="rounded-button cursor-pointer">
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
                  onSelect={() => setConfirmDelete(true)}
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
      </div>

      <h2 className="mt-2 font-display font-extrabold text-xl sm:text-2xl leading-snug break-words pr-1">
        {title ?? "Il tuo percorso"}
      </h2>

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
              {multi && (
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

  const heroStyle = {
    "--ambient-block-ink": getSubjectAccent(active?.file_name ?? ""),
  } as CSSProperties;

  // For smooth single-step animation from scrolled list to header:
  // - When transitioning, inline hero uses same layoutId as transitioning card
  // - This ensures viewport-relative measurement via getBoundingClientRect()
  // - Scroll container maintains scroll position during transition via layoutScroll
  const isTransitioningActive = !!transitioningId;
  const inlineHeroId = isTransitioningActive
    ? `course-card-${transitioningId}`
    : isSelectingCourse
      ? undefined
      : `course-card-${active?.id}`;

  const portalHeroId = isTransitioningActive ? undefined : `course-card-${active?.id}`;

  return (
    <section className="px-4 pt-4">
      {/* HERO inline — maintains layoutId for shared element */}
      <motion.div
        layout
        layoutId={inlineHeroId}
        transition={heroLayoutTransition}
        className={cn(
          "relative overflow-hidden rounded-card border border-inverse-on-surface/15 shadow-level-2 p-5 sm:p-6",
          isSelectingCourse && !isTransitioningActive && "invisible pointer-events-none h-0 overflow-hidden p-0 border-0"
        )}
        data-auto-contrast
        style={heroStyle}
      >
        <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-current opacity-[0.07]" aria-hidden />
        <div className="absolute -right-2 -bottom-20 w-36 h-36 rounded-full bg-current opacity-[0.05]" aria-hidden />
        <div className="absolute left-1/3 -bottom-24 w-40 h-40 rounded-full bg-current opacity-[0.04]" aria-hidden />
        <CourseCardBackground
          coverUrl={isTransitioningActive ? transitioningCover : heroCover}
          subjectColor={getSubjectAccent(isTransitioningActive ? transitioningCourse?.file_name ?? "" : active?.file_name ?? "")}
          variant="studio"
        />
        {heroInner(false)}
      </motion.div>

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
                if (e.target === e.currentTarget && !isAnimating) closePicker();
              }}
            >
              <div className="flex-1 min-h-0 w-full max-w-lg mx-auto flex flex-col px-4 py-6">
                {/* layoutScroll ensures scrollTop is factored into FLIP */}
                <motion.div
                  ref={listRef as any}
                  layoutScroll
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                  style={{ scrollBehavior: isTransitioningActive ? "auto" : "smooth" } as any}
                >
                  <div className="flex flex-col">
                    {before.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3 mb-4"
                      >
                        {before
                          .filter((c) => c.id !== transitioningId)
                          .map((c) => renderCourseCard(c))}
                      </motion.div>
                    )}

                    {!isTransitioningActive && (
                      <motion.div
                        layout
                        ref={heroRef}
                        layoutId={portalHeroId}
                        transition={heroLayoutTransition}
                        className="relative overflow-hidden rounded-card border border-inverse-on-surface/15 shadow-level-2 p-5 sm:p-6"
                        data-auto-contrast
                        style={heroStyle}
                        layoutScroll
                      >
                        <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-current opacity-[0.07]" aria-hidden />
                        <div className="absolute -right-2 -bottom-20 w-36 h-36 rounded-full bg-current opacity-[0.05]" aria-hidden />
                        <div className="absolute left-1/3 -bottom-24 w-40 h-40 rounded-full bg-current opacity-[0.04]" aria-hidden />
                        <CourseCardBackground
                          coverUrl={heroCover}
                          subjectColor={getSubjectAccent(active?.file_name ?? "")}
                          variant="studio"
                        />
                        {heroInner(true)}
                      </motion.div>
                    )}

                    {isTransitioningActive && transitioningCourse && (
                      <motion.div
                        layout
                        layoutId={`course-card-${transitioningId}`}
                        transition={heroLayoutTransition}
                        className="relative overflow-hidden rounded-card border border-inverse-on-surface/15 shadow-level-2 p-5 sm:p-6"
                        data-auto-contrast
                        style={{
                          "--ambient-block-ink": getSubjectAccent(transitioningCourse.file_name),
                        } as CSSProperties}
                      >
                        <CourseCardBackground
                          coverUrl={transitioningCover}
                          subjectColor={getSubjectAccent(transitioningCourse.file_name)}
                          variant="studio"
                        />
                        <div className="relative">
                          <p className="label-small tracking-[0.16em] opacity-70">Percorso selezionato</p>
                          <h2 className="mt-3 font-display font-extrabold text-xl sm:text-2xl leading-snug break-words">
                            {cleanCourseName(transitioningCourse.file_name)}
                          </h2>
                          <div className="mt-4 flex items-center gap-2 text-xs opacity-70">
                            <span>Transizione in corso...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {after.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3 mt-4"
                      >
                        {after
                          .filter((c) => c.id !== transitioningId)
                          .map((c) => renderCourseCard(c))}
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
              className="rounded-dialog"
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
