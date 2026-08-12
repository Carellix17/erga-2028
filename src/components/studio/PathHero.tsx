import { useState } from "react";
import { createPortal } from "react-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { cleanCourseName } from "@/lib/courseName";
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
}

const getCourseIcon = (name: string) => {
  if (name.startsWith("🌐") || name.toLowerCase().includes("web")) return Globe;
  if (name.toLowerCase().endsWith(".pdf")) return FileText;
  return BookOpen;
};

/**
 * 🌲 P24 BOSCO — l'EROE DEL PERCORSO, versione "cappello completo":
 * la card ad arco in cima a Studio ora contiene TUTTO il comando del corso:
 * barra di avanzamento con percentuale, Riprendi + Cambia corso,
 * e il menù ⋯ (rigenera / materiali / rinomina / elimina) in alto a destra.
 * Sotto restano solo le lezioni. La logica dati resta in StudioView.
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
}: PathHeroProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const active = courses.find((c) => c.id === activeCourseId) ?? courses[0];
  const multi = courses.length > 1;
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const barPct = isGenerating
    ? Math.min(100, Math.max(4, progressPercent))
    : pct;

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

  return (
    <section className="px-4 pt-4 animate-fade-up">
      <div className="relative overflow-hidden rounded-[32px] bg-primary text-primary-foreground shadow-level-2 p-5 sm:p-6">
        {/* Motivo organico: due tondi di luce, come raggi tra le fronde */}
        <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-white/[0.07]" aria-hidden />
        <div className="absolute -right-2 -bottom-20 w-36 h-36 rounded-full bg-white/[0.05]" aria-hidden />
        <div className="absolute left-1/3 -bottom-24 w-40 h-40 rounded-full bg-white/[0.04]" aria-hidden />

        <div className="relative">
          {/* ── Riga alta: etichetta a sinistra, menù ⋯ in alto a destra ── */}
          <div className="flex items-center justify-between gap-3">
            <p className="label-small text-primary-foreground/70 tracking-[0.16em]">
              Percorso attuale
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Azioni corso"
                  className="relative w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 transition-colors duration-200 flex items-center justify-center shrink-0 active:scale-[0.95]"
                >
                  <MoreHorizontal className="w-5 h-5 text-white" strokeWidth={2} />
                  {hasNewMaterial && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-warning ring-2 ring-primary"
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
              <p className="mt-4 text-xs text-primary-foreground/80">
                Erga sta trasformando il tuo materiale…
              </p>
              <div className="mt-2 h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-subject-accent transition-all duration-300"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <p className="text-sm text-primary-foreground/80">
                  {completedCount} di {totalLessons} lezioni
                </p>
                <p className="text-sm font-bold text-subject-accent tabular-nums">{pct}%</p>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-subject-accent transition-all duration-700 ease-m3-emphasized"
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </>
          )}

          {/* ── Azioni: Riprendi + Cambia corso — STESSA ALTEZZA (h-11) ── */}
          {!isGenerating && (canResume || multi) && (
            <div className="mt-5 flex items-stretch gap-2.5">
              {canResume && onResume && (
                <button
                  type="button"
                  onClick={onResume}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 h-11 px-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/25 active:scale-[0.97]"
                >
                  <BookOpen className="w-4 h-4 shrink-0" strokeWidth={1.9} />
                  Riprendi
                </button>
              )}
              {multi && onSelectCourse && (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/[0.08] border border-white/20 h-11 flex-1 px-3 text-sm font-semibold text-white/90 transition-all duration-200 hover:bg-white/15 active:scale-[0.97]"
                >
                  <ArrowLeftRight className="w-4 h-4 shrink-0" strokeWidth={1.9} />
                  Cambia corso
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Selettore dei percorsi: in un PORTALE sopra tutto (anche l'header),
          con sfondo sfocato. Renderizzato fuori dalla card animata, così la
          finestra fissa non resta intrappolata sotto gli altri elementi. ── */}
      {pickerOpen && onSelectCourse && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in"
          onClick={() => setPickerOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Seleziona un percorso"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-popover text-popover-foreground rounded-[24px] shadow-level-3 p-5"
          >
            <div className="mb-4 px-1">
              <h3 className="font-display text-xl font-bold text-foreground">I tuoi percorsi</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Scegli su quale vuoi lavorare
              </p>
            </div>
            <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto">
              {courses.map((course) => {
                const Icon = getCourseIcon(course.file_name);
                const isActive = course.id === active?.id;
                const meta =
                  typeof course.lesson_count === "number" && course.lesson_count > 0
                    ? `${course.lesson_count} lezioni`
                    : null;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => {
                      onSelectCourse(course.id);
                      setPickerOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-2xl w-full text-left transition-colors duration-150",
                      isActive ? "bg-accent" : "hover:bg-secondary active:bg-secondary",
                    )}
                  >
                    <span
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                        isActive ? "bg-tertiary/20 text-tertiary" : "bg-secondary text-foreground",
                      )}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "block truncate text-[15px] font-semibold",
                          isActive ? "text-accent-foreground" : "text-foreground",
                        )}
                      >
                        {cleanCourseName(course.file_name)}
                      </span>
                      {meta && (
                        <span className="block text-xs text-muted-foreground mt-0.5">{meta}</span>
                      )}
                    </span>
                    {isActive && <Check className="w-4 h-4 text-tertiary flex-shrink-0" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
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
