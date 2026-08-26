import type { CSSProperties } from "react";
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
  cover_image_url?: string | null;
}

interface CourseCardProps {
  course: CourseCardData;
  active?: boolean;
  onSelect: (course: CourseCardData) => void;
  actionLabel: string;
  children?: React.ReactNode;
  className?: string;
  noImage?: boolean;
  style?: CSSProperties;
}

// Prop di framer-motion inoltrate al motion.button interno - manteniamo style separato per merge
type CourseCardMotionProps = Omit<
  React.ComponentPropsWithoutRef<typeof motion.button>,
  "children" | "className" | "onClick" | "style"
>;

/**
 * 🖼️ P24 — Card corso con cover immagine contestuale
 * Fix: merge style prop con --ambient-block-ink per permettere zIndex e viewport-relative positioning
 * durante la transizione shared element. Aggiunto layoutScroll awareness per scroll container.
 */
export function CourseCard({
  course,
  active = false,
  onSelect,
  actionLabel,
  children,
  className,
  noImage = false,
  style,
  ...motionProps
}: CourseCardProps & CourseCardMotionProps) {
  const coverUrl = useCourseImage(noImage ? null : course.id, course.file_name);
  const accent = getSubjectAccent(course.file_name);

  return (
    <motion.button
      {...motionProps}
      type="button"
      onClick={() => onSelect(course)}
      data-auto-contrast
      style={{ "--ambient-block-ink": accent, ...style } as CSSProperties}
      className={cn(
        "interactive-card relative w-full overflow-hidden rounded-card border border-inverse-on-surface/15 bg-inverse-surface p-4 text-left shadow-level-2 sm:p-5",
        className,
      )}
    >
      <CourseCardBackground coverUrl={coverUrl} subjectColor={accent} variant="studio" />
      <div className="relative z-10">
        {children}
        <span
          className="mt-3.5 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-pill border border-contrast bg-contrast-soft text-sm font-semibold"
        >
          {actionLabel}
        </span>
      </div>
    </motion.button>
  );
}

export const courseDisplayName = (file_name: string) => cleanCourseName(file_name);
