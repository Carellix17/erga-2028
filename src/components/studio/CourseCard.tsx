import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { cleanCourseName } from "@/lib/courseName";
import { courseCoverVars } from "@/lib/courseIdentity";
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
  // V2-01: identità del corso dal resolver condiviso (stessa pelle in
  // Home, Studio, selettore e modulo); niente foto Wikipedia sfocate.
  const { style: coverStyle } = courseCoverVars(course.file_name);

  return (
    <motion.button
      {...motionProps}
      type="button"
      onClick={() => onSelect(course)}
      style={{ ...coverStyle, ...style } as CSSProperties}
      className={cn(
        "relative w-full overflow-hidden rounded-hero border border-border bg-card p-4 text-left shadow-level-2 sm:p-5",
        className,
      )}
    >
      <CourseCardBackground courseName={course.file_name} />
      <div className="relative z-10">
        {children}
        {/* «Scegli» sulla copertina: velo satinato a pillola (2.1 §4). */}
        <span className="btn-satin mt-3.5 h-10 w-full text-sm">{actionLabel}</span>
      </div>
    </motion.button>
  );
}

export const courseDisplayName = (file_name: string) => cleanCourseName(file_name);
