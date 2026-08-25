import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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

// Transizione condivisa della HERO (layoutId): spring fluido per il volo
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
    timers.push(window.setTimeout(() => centerActiveInList(), 90));
    timers.push(window.setTimeout(() => centerActiveInList(), 700));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [isSelectingCourse, centerActiveInList]);

  // Body scroll lock — defer restore until animation completes
  const prevOverflowRef = useRef<string>("");
  useEffect(() => {
    if (isSelectingCourse) {
      prevOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else if (!isAnimating) {
      // Only restore when not animating
      document.body.style.overflow = prevOverflowRef.current || "";
    }
    return () => {
      if (!isSelectingCourse && !isAnimating) {
        document.body.style.overflow = prevOverflowRef.current || "";
      }
    };
  }, [isSelectingCourse, isAnimating]);

  const openPicker = () => {
    setIsSelectingCourse(true);
    onSelectingChange?.(true);
  };
  
  const closePicker = useCallback(() => {
    setIsSelectingCourse(false);
    onSelectingChange?.(false);
    // Defer scroll reset until animation completes
    // The listRef scrollTop will be preserved until AnimatePresence exit completes
  }, [onSelectingChange]);

  const handleSelectCourse = useCallback((course: CourseOption) => {
    // Prevent rapid double clicks
    if (isAnimating) return;
    
    // If selecting same course, just close
    if (course.id === activeCourseId) {
      closePicker();
      return;
    }

    // Immediately set transitioning for layoutId continuity
    // This ensures the clicked card gets layoutId="hero-card" before scroll reset
    setTransitioningId(course.id);
    setIsAnimating(true);

    // Critical: call onSelectCourse synchronously so state updates remain synchronized
    // with visual transition start (as required)
    // Framer Motion will have already captured First position via getBoundingClientRect()
    // relative to viewport because portal is fixed and list has layoutScroll
    onSelectCourse?.(course.id);

    // Defer picker close until after FLIP First measurement
    // This prevents race condition where scrollTop resets before layout calculation
    requestAnimationFrame(() => {
      setTimeout(() => {
        closePicker();
      }, 50);
    });

    // Clear transitioning state after animation completes (onAnimationComplete equivalent)
    setTimeout(() => {
      setTransitioningId(null);
      setIsAnimating(false);
      document.body.style.overflow = prevOverflowRef.current || "";
    }, 600);
  }, [activeCourseId, closePicker, isAnimating, onSelectCourse]);

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
        // Critical fix: when this card is the one being selected, give it layoutId="hero-card"
        // so it animates directly from its scrolled position to the header target
        // layoutScroll on parent ensures scrollTop is factored into FLIP calculation
        layoutId={isTransitioning ? "hero-card" : undefined}
        layout={isTransitioning ? true : undefined}
        transition={isTransitioning ? heroLayoutTransition : undefined}
        {...(!isTransitioning ? cardMotion : {})}
        style={isTransitioning ? { zIndex: 10 } : undefined}
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
                <span>Materiali</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => { setRenameValue(title ?? ""); setRenameOpen(true); }} className="rounded-button cursor-pointer">
              <Pencil className="w-4 h-4 text-foreground/80" strokeWidth={1.75} />
              <span>Rinomina</span>
            </DropdownMenuItem>
            {onDeleteCourse && (
              <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="rounded-button cursor-pointer text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                <span>Elimina percorso</span>
              </DropdownMenuItem>
            )}
            {generationBlocked && freeLimitMessage && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-3 py-2 leading-snug">
                  {freeLimitMessage}
                </DropdownMenuLabel>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h2 className="mt-3 font-display font-extrabold text-[clamp(1.35rem,5vw,1.9rem)] leading-tight break-words">
        {title ? cleanCourseName(title) : "Percorso"}
      </h2>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-current/15 overflow-hidden">
          <div className="h-full rounded-full bg-current transition-all duration-500" style={{ width: `${barPct}%` }} />
        </div>
        <span className="text-xs font-semibold tabular-nums">{barPct}%</span>
      </div>

      <div className="mt-1 flex items-center gap-2 text-xs opacity-70">
        <span>{completedCount}/{totalLessons} lezioni</span>
        {isGenerating && <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Generazione...</span>}
      </div>

      <div className="mt-4 flex gap-2">
        {inPicker ? (
          <Button variant="outline" onClick={closePicker} className="flex-1 h-11 rounded-pill">
            <X className="w-4 h-4 mr-1" />Annulla
          </Button>
        ) : (
          <>
            {canResume && onResume && (
              <Button onClick={onResume} className="flex-1 h-11 rounded-pill gap-1.5">
                <BookOpen className="w-4 h-4" />Riprendi
              </Button>
            )}
            {multi && (
              <Button variant="outline" onClick={openPicker} className="h-11 rounded-pill gap-1.5">
                <ArrowLeftRight className="w-4 h-4" />Cambia corso
              </Button>
            )}
          </>
        )}
      </div>

      {hasNewMaterial && !inPicker && (
        <div className="mt-3 flex items-center gap-2 text-xs bg-warning/15 text-warning-foreground px-3 py-2 rounded-button">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Nuovo materiale disponibile</span>
        </div>
      )}
    </div>
  );

  const heroStyle = {
    "--ambient-block-ink": getSubjectAccent(active?.file_name ?? ""),
  } as CSSProperties;

  // Determine if inline hero should have layoutId
  // During transition, the transitioning card has layoutId, so inline hero should also have it
  // to complete the animation from scrolled position directly to header
  const inlineHeroLayoutId = transitioningId ? "hero-card" : (isSelectingCourse ? undefined : "hero-card");
  const portalHeroLayoutId = transitioningId ? undefined : "hero-card";

  return (
    <section className="px-4 pt-4">
      {/* HERO inline — with layoutId for shared element transition */}
      <motion.div
        layout
        layoutId={inlineHeroLayoutId}
        transition={heroLayoutTransition}
        className={cn(
          "relative overflow-hidden rounded-card border border-inverse-on-surface/15 shadow-level-2 p-5 sm:p-6",
          isSelectingCourse && !transitioningId && "invisible pointer-events-none"
        )}
        data-auto-contrast
        style={heroStyle}
        // Ensure layout measurement uses viewport, not scroll parent
        layoutScroll={false}
      >
        <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-current opacity-[0.07]" aria-hidden />
        <div className="absolute -right-2 -bottom-20 w-36 h-36 rounded-full bg-current opacity-[0.05]" aria-hidden />
        <div className="absolute left-1/3 -bottom-24 w-40 h-40 rounded-full bg-current opacity-[0.04]" aria-hidden />
        <CourseCardBackground
          coverUrl={heroCover}
          subjectColor={getSubjectAccent(active?.file_name ?? "")}
          variant="studio"
        />
        {heroInner(false)}
      </motion.div>

      {/* SELEZIONE CORSI: PORTALE */}
      {createPortal(
        <AnimatePresence mode="wait">
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
              onAnimationComplete={(definition) => {
                // Defer scroll reset until exit animation completes
                if (definition === "exit" || definition === undefined) {
                  // Animation completed
                }
              }}
            >
              <div className="flex-1 min-h-0 w-full max-w-lg mx-auto flex flex-col px-4 py-6">
                {/* Critical fix: layoutScroll ensures Framer Motion factors scrollTop into FLIP */}
                <motion.div
                  ref={listRef as any}
                  layoutScroll
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
                  // Prevent scroll reset during transition
                  style={{ scrollBehavior: transitioningId ? "auto" : "smooth" } as any}
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
                        {before.map(renderCourseCard)}
                      </motion.div>
                    )}

                    {/* Portal HERO — only show when not transitioning to another course */}
                    {!transitioningId && (
                      <motion.div
                        layout
                        ref={heroRef}
                        layoutId={portalHeroLayoutId}
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

                    {/* When transitioning, show the transitioning card as hero in portal position */}
                    {transitioningId && (() => {
                      const tCourse = courses.find(c => c.id === transitioningId);
                      return (
                        <motion.div
                          layout
                          layoutId="hero-card"
                          transition={heroLayoutTransition}
                          className="relative overflow-hidden rounded-card border border-inverse-on-surface/15 shadow-level-2 p-5 sm:p-6"
                          data-auto-contrast
                          style={{
                            ...heroStyle,
                            "--ambient-block-ink": getSubjectAccent(tCourse?.file_name ?? ""),
                          } as any}
                        >
                          <CourseCardBackground
                            coverUrl={transitioningCover}
                            subjectColor={getSubjectAccent(tCourse?.file_name ?? "")}
                            variant="studio"
                          />
                          <div className="relative">
                            <p className="label-small tracking-[0.16em] opacity-70">Percorso selezionato</p>
                            <h2 className="mt-3 font-display font-extrabold text-[clamp(1.35rem,5vw,1.9rem)] leading-tight break-words">
                              {cleanCourseName(tCourse?.file_name ?? "")}
                            </h2>
                            <div className="mt-4 h-11 w-full rounded-pill bg-current/10 animate-pulse" />
                          </div>
                        </motion.div>
                      );
                    })()}

                    {after.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                        transition={{ duration: 0.15 }}
                        className="space-y-3 mt-4"
                      >
                        {after.map((course) => {
                          // Hide the transitioning course from the list to avoid duplicate
                          if (course.id === transitioningId) return null;
                          return renderCourseCard(course);
                        })}
                      </motion.div>
                    )}

                    {/* Also hide transitioning course from before list */}
                    {before.length > 0 && transitioningId && (
                      <div className="hidden">
                        {before.filter(c => c.id === transitioningId).map(() => null)}
                      </div>
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
