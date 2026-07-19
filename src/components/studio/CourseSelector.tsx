import { BookOpen, Globe, FileText, Pencil, Loader2, ChevronDown, Check, MoreHorizontal, RefreshCw, Trash2, FolderOpen } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { getStableSubjectColor } from "@/lib/subjectColors";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Course {
  id: string;
  file_name: string;
  processing_status?: string | null;
}

interface CourseSelectorProps {
  courses: Course[];
  activeContextId: string | null;
  onSelectCourse: (contextId: string) => void;
  onRenameCourse?: (contextId: string, newName: string) => Promise<void> | void;
  onRegenerateCourse?: (contextId: string) => Promise<void> | void;
  onDeleteCourse?: (contextId: string) => Promise<void> | void;
  onOpenMaterials?: (contextId: string) => void;
  isRegenerating?: boolean;
}

const getIcon = (name: string) => {
  if (name.startsWith("🌐") || name.toLowerCase().includes("web")) return Globe;
  if (name.endsWith(".pdf")) return FileText;
  return BookOpen;
};

const cleanName = (name: string) =>
  name.replace(/^🌐\s*/, "").replace(/\.pdf$/i, "");

export function CourseSelector({
  courses,
  activeContextId,
  onSelectCourse,
  onRenameCourse,
  onRegenerateCourse,
  onDeleteCourse,
  onOpenMaterials,
  isRegenerating,
}: CourseSelectorProps) {
  // N.B.: gli hook devono essere chiamati PRIMA di qualunque return anticipato
  // (regole di React). L'uscita "nessun corso" e' piu' sotto, dopo gli hook.
  const [open, setOpen] = useState(false);
  const [renameCourse, setRenameCourse] = useState<Course | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Position the floating iOS-style menu right below the "more" button.
  useLayoutEffect(() => {
    if (!menuOpen) return;
    const update = () => {
      const el = moreBtnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Uscita anticipata: da qui in poi tutto assume almeno un corso.
  if (courses.length === 0) return null;

  const active = courses.find((c) => c.id === activeContextId) ?? courses[0];
  const activeColor = getStableSubjectColor(active.file_name);
  const ActiveIcon = getIcon(active.file_name);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (course: Course) => {
    if (!onRenameCourse) return;
    longPressTriggered.current = false;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      try { navigator.vibrate?.(20); } catch { /* alcune piattaforme non supportano la vibrazione: si ignora */ }
      setRenameValue(cleanName(course.file_name));
      setRenameCourse(course);
    }, 500);
  };

  const handleSelect = (course: Course) => {
    onSelectCourse(course.id);
    setOpen(false);
  };

  const handleSaveRename = async () => {
    if (!renameCourse || !onRenameCourse) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === cleanName(renameCourse.file_name)) {
      setRenameCourse(null);
      return;
    }
    setIsSaving(true);
    try {
      await onRenameCourse(renameCourse.id, trimmed);
      setRenameCourse(null);
    } finally {
      setIsSaving(false);
    }
  };

  const multi = courses.length > 1;

  const openRename = () => {
    setRenameValue(cleanName(active.file_name));
    setRenameCourse(active);
  };
  const handleRegenerate = async () => {
    if (!onRegenerateCourse) return;
    await onRegenerateCourse(active.id);
  };
  const handleOpenMaterials = () => onOpenMaterials?.(active.id);
  const handleDelete = async () => {
    if (!onDeleteCourse) return;
    setIsDeleting(true);
    try {
      await onDeleteCourse(active.id);
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const actions = [
    { key: "rename", label: "Rinomina", icon: Pencil, onClick: openRename, show: !!onRenameCourse },
    { key: "regen", label: "Rigenera", icon: RefreshCw, onClick: handleRegenerate, show: !!onRegenerateCourse, loading: isRegenerating },
    { key: "material", label: "Materiale", icon: FolderOpen, onClick: handleOpenMaterials, show: !!onOpenMaterials },
    { key: "delete", label: "Elimina", icon: Trash2, onClick: () => setConfirmDelete(true), show: !!onDeleteCourse, danger: true },
  ].filter((a) => a.show);

  return (
    <>
      <div className="px-4 pt-5 pb-2 flex justify-center items-center gap-2 animate-fade-up flex-wrap">
        <button
          onClick={() => {
            if (longPressTriggered.current) {
              longPressTriggered.current = false;
              return;
            }
            if (multi) setOpen(true);
          }}
          onPointerDown={() => startLongPress(active)}
          onPointerUp={clearLongPress}
          onPointerLeave={clearLongPress}
          onPointerCancel={clearLongPress}
          onContextMenu={(e) => e.preventDefault()}
          className={cn(
            "h-12 flex items-center gap-3 px-6 rounded-full shadow-level-2 select-none touch-none max-w-full",
            "transition-all duration-500 ease-m3-emphasized",
            "active:scale-[0.96] hover:scale-[1.02] hover:shadow-level-3",
            activeColor.bgActive,
            activeColor.textActive,
          )}
        >
          <ActiveIcon className="w-5 h-5 flex-shrink-0" />
          <span className="label-large truncate max-w-[60vw]">
            {cleanName(active.file_name)}
          </span>
          {multi && (
            <ChevronDown
              className={cn(
                "w-4 h-4 flex-shrink-0 transition-transform duration-300",
                open && "rotate-180",
              )}
            />
          )}
        </button>

        {actions.length > 0 && (
          <>
            {/* Mobile: single "more" button */}
            <button
              ref={moreBtnRef}
              aria-label="Azioni corso"
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "md:hidden h-12 w-12 flex items-center justify-center rounded-2xl shadow-level-2",
                "transition-all duration-300 active:scale-[0.94] hover:shadow-level-3",
                activeColor.bgActive,
                activeColor.textActive,
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {/* Desktop: full toolbar */}
            <div className="hidden md:flex items-center gap-2">
              {actions.map((a) => {
                const Icon = a.icon;
                const danger = a.danger;
                return (
                  <button
                    key={a.key}
                    onClick={a.onClick}
                    disabled={a.loading}
                    className={cn(
                      "h-12 px-4 flex items-center gap-2 rounded-full border bg-white/70 backdrop-blur transition-all duration-300",
                      "active:scale-[0.96] hover:shadow-level-2 label-large",
                      danger
                        ? "border-red-200 text-red-600 hover:bg-red-50"
                        : cn(activeColor.border, activeColor.text, "hover:bg-black/5"),
                    )}
                  >
                    {a.loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="text-sm font-semibold">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Floating iOS-style context menu (mobile) */}
      {menuOpen && menuPos && createPortal(
        <>
          <div className="fixed inset-0 z-[85]" onClick={() => setMenuOpen(false)} />
          <div
            role="menu"
            style={{ top: menuPos.top, right: menuPos.right }}
            className={cn(
              "fixed z-[86] min-w-[200px] rounded-2xl bg-white/90 backdrop-blur-xl shadow-level-3 border border-black/5 p-1.5",
              "animate-in fade-in-0 zoom-in-95 duration-200 ease-m3-emphasized-decel origin-top-right",
            )}
          >
            {actions.map((a) => {
              const Icon = a.icon;
              const danger = a.danger;
              return (
                <button
                  key={a.key}
                  role="menuitem"
                  disabled={a.loading}
                  onClick={() => {
                    setMenuOpen(false);
                    a.onClick();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                    "active:scale-[0.98]",
                    danger
                      ? "text-red-600 hover:bg-red-50"
                      : "text-foreground hover:bg-black/5",
                  )}
                >
                  {a.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className={cn("w-4 h-4", !danger && activeColor.text)} />
                  )}
                  <span className="text-sm font-medium">{a.label}</span>
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}

      <AlertDialog open={confirmDelete} onOpenChange={(o) => !isDeleting && setConfirmDelete(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare "{cleanName(active.file_name)}"?</AlertDialogTitle>
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

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-lg animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Seleziona un corso"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full max-w-md bg-surface-container-high rounded-[32px] shadow-level-3 p-6",
              "animate-in fade-in-0 zoom-in-95 duration-300 ease-m3-emphasized-decel",
            )}
          >
            <div className="mb-5 text-center">
              <h3 className="font-display text-2xl font-bold">I tuoi corsi</h3>
              <p className="body-medium text-muted-foreground mt-1">
                Scegli il corso su cui vuoi lavorare
              </p>
            </div>
            <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {courses.map((course) => {
                const color = getStableSubjectColor(course.file_name);
                const Icon = getIcon(course.file_name);
                const isActive = course.id === active.id;
                return (
                  <button
                    key={course.id}
                    onClick={() => handleSelect(course)}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3.5 rounded-full w-full text-left",
                      "transition-all duration-300 ease-m3-emphasized active:scale-[0.97]",
                      isActive
                        ? `${color.bgActive} ${color.textActive} shadow-level-2`
                        : `${color.bg} ${color.text} border ${color.border} hover:shadow-level-1`,
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="label-large flex-1 truncate">
                      {cleanName(course.file_name)}
                    </span>
                    {isActive && <Check className="w-4 h-4 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Drawer open={!!renameCourse} onOpenChange={(o) => !o && setRenameCourse(null)}>
        <DrawerContent className="rounded-t-[32px]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 font-display text-2xl">
              <Pencil className="w-5 h-5 text-primary" />
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
            />
          </div>
          <DrawerFooter className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-full"
              onClick={() => setRenameCourse(null)}
              disabled={isSaving}
            >
              Annulla
            </Button>
            <Button
              className="flex-1 h-12 rounded-full"
              onClick={handleSaveRename}
              disabled={isSaving || !renameValue.trim()}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}