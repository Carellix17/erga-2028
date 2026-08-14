import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { cleanCourseName } from "@/lib/courseName";
import { getSubjectAccent } from "@/lib/subjectColors";
import { useCourseImage } from "@/hooks/useCourseImage";
import { CourseCardBackground } from "./CourseCardBackground";

export interface CourseCardData {
  id: string;
  file_name: string;
  lesson_count?: number | null;
  /** (opzionale) URL immagine già noto (es. da DB). */
  cover_image_url?: string | null;
}

interface CourseCardProps {
  course: CourseCardData;
  active?: boolean;
  onSelect: (course: CourseCardData) => void;
  /** Testo del pulsante. */
  actionLabel: string;
  /** Contenuto extra (es. avanzamento della hero). */
  children?: React.ReactNode;
  className?: string;
  /** Se true disabilita il recupero immagine. */
  noImage?: boolean;
}

// Prop di framer-motion inoltrate al motion.button interno.
type CourseCardMotionProps = Omit<
  React.ComponentPropsWithoutRef<typeof motion.button>,
  "children" | "className" | "onClick" | "style"
>;

/**
 * 🖼️ P24 — Card corso con cover immagine contestuale (hook centralizzato).
 * Usa `useCourseImage` (Supabase → localStorage → Wikipedia) e il componente
 * unificato `CourseCardBackground` per i layer. Testo/bottoni a contrasto.
 */
export function CourseCard({
  course,
  active = false,
  onSelect,
  actionLabel,
  children,
  className,
  noImage = false,
  ...motionProps
}: CourseCardProps & CourseCardMotionProps) {
  const coverUrl = useCourseImage(noImage ? null : course.id, course.file_name);

  const accent = getSubjectAccent(course.file_name);

  return (
    <motion.button
      {...motionProps}
      type="button"
      onClick={() => onSelect(course)}
      className={cn(
        "relative w-full overflow-hidden rounded-[28px] border border-white/10 shadow-level-2 p-4 sm:p-5 text-left transition-transform duration-150 active:scale-[0.98]",
        className,
      )}
      style={{ color: "#ffffff" }}
    >
      <CourseCardBackground coverUrl={coverUrl} subjectColor={accent} />

      {/* LAYER 2 — contenuto (testo bianco ad alto contrasto su fondo scuro) */}
      <div className="relative z-10">
        {children}
        <span
          className="mt-3.5 inline-flex items-center justify-center gap-1.5 rounded-full border h-10 w-full text-sm font-semibold"
          style={{
            backgroundColor: "rgba(255,255,255,0.15)",
            borderColor: "rgba(255,255,255,0.3)",
          }}
        >
          {actionLabel}
        </span>
      </div>
    </motion.button>
  );
}

/** Helper: nome pulito del corso (usato nei contenuti). */
export const courseDisplayName = (file_name: string) => cleanCourseName(file_name);
