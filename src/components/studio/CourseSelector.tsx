import { BookOpen, Globe, FileText, Pencil, Loader2, ChevronDown, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
}

const getIcon = (name: string) => {
  if (name.startsWith("🌐") || name.toLowerCase().includes("web")) return Globe;
  if (name.endsWith(".pdf")) return FileText;
  return BookOpen;
};

const cleanName = (name: string) =>
  name.replace(/^🌐\s*/, "").replace(/\.pdf$/i, "");

export function CourseSelector({ courses, activeContextId, onSelectCourse, onRenameCourse }: CourseSelectorProps) {
  if (courses.length === 0) return null;

  const [open, setOpen] = useState(false);
  const [renameCourse, setRenameCourse] = useState<Course | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  const active = courses.find((c) => c.id === activeContextId) ?? courses[0];
  const activeColor = getStableSubjectColor(active.file_name);
  const ActiveIcon = getIcon(active.file_name);

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
      try { navigator.vibrate?.(20); } catch {}
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

  return (
    <>
      <div className="px-4 pt-5 pb-2 flex justify-center animate-fade-up">
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
            "flex items-center gap-3 px-6 py-3.5 rounded-full shadow-level-2 select-none touch-none max-w-full",
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
      </div>

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