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
        "interactive-card relative w-full overflow-hidden rounded-card border border-inverse-on-surface/15 p-4 text-left text-inverse-on-surface shadow-level-2 [&_h1]:text-inverse-on-surface [&_h2]:text-inverse-on-surface [&_h3]:text-inverse-on-surface sm:p-5",
        className,
      )}
    >
      <CourseCardBackground coverUrl={coverUrl} subjectColor={accent} variant="studio" />

      {/* LAYER 2 — contenuto (testo bianco ad alto contrasto su fondo scuro) */}
      <div className="relative z-10">
        {children}
        <span
          className="mt-3.5 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-pill border border-inverse-on-surface/30 bg-inverse-on-surface/15 text-sm font-semibold"
        >
          {actionLabel}
        </span>
      </div>
    </motion.button>
  );
}

/** Helper: nome pulito del corso (usato nei contenuti). */
export const courseDisplayName = (file_name: string) => cleanCourseName(file_name);
