import { BookOpen, Globe, FileText, Pencil, Loader2 } from "lucide-react";
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

export function CourseSelector({ courses, activeContextId, onSelectCourse, onRenameCourse }: CourseSelectorProps) {
  if (courses.length <= 1) return null;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);
  const [menuCourse, setMenuCourse] = useState<Course | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const btn = activeBtnRef.current;
    if (!scroller || !btn) return;
    const target =
      btn.offsetLeft - scroller.clientWidth / 2 + btn.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeContextId, courses.length]);

  const getIcon = (name: string) => {
    if (name.startsWith("🌐") || name.toLowerCase().includes("web")) return Globe;
    if (name.endsWith(".pdf")) return FileText;
    return BookOpen;
  };

  const cleanName = (name: string) => {
    return name.replace(/^🌐\s*/, "").replace(/\.pdf$/i, "");
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (course: Course) => {
    longPressTriggered.current = false;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      try { navigator.vibrate?.(20); } catch {}
      setRenameValue(cleanName(course.file_name));
      setMenuCourse(course);
    }, 450);
  };

  const handleClick = (course: Course) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onSelectCourse(course.id);
  };

  const handleSaveRename = async () => {
    if (!menuCourse || !onRenameCourse) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === cleanName(menuCourse.file_name)) {
      setMenuCourse(null);
      return;
    }
    setIsSaving(true);
    try {
      await onRenameCourse(menuCourse.id, trimmed);
      setMenuCourse(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <div className="px-4 pt-4 pb-1 animate-fade-up">
      <p className="label-medium text-muted-foreground mb-3 px-1">I tuoi corsi</p>
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
      >
        {courses.map((course, i) => {
          const isActive = course.id === activeContextId;
          const Icon = getIcon(course.file_name);
          const color = getStableSubjectColor(course.file_name);

          return (
            <button
              key={course.id}
              ref={isActive ? activeBtnRef : undefined}
              onClick={() => handleClick(course)}
              onPointerDown={() => startLongPress(course)}
              onPointerUp={clearLongPress}
              onPointerLeave={clearLongPress}
              onPointerCancel={clearLongPress}
              onContextMenu={(e) => e.preventDefault()}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3 rounded-full whitespace-nowrap flex-shrink-0 select-none touch-none",
                "transition-all duration-500 ease-m3-emphasized",
                "active:scale-[0.93]",
                `animate-fade-up animate-stagger-${Math.min(i + 1, 5)}`,
                isActive
                  ? `${color.bgActive} ${color.textActive} shadow-level-2 scale-[1.02]`
                  : `${color.bg} ${color.text} border ${color.border} hover:shadow-level-1 hover:scale-[1.04]`
              )}
            >
              <Icon className={cn("w-4.5 h-4.5 flex-shrink-0", isActive && "animate-wiggle")} />
              <span className="label-large">
                {cleanName(course.file_name)}
              </span>
            </button>
          );
        })}
      </div>
    </div>

    <Drawer open={!!menuCourse} onOpenChange={(o) => !o && setMenuCourse(null)}>
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
            onClick={() => setMenuCourse(null)}
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
