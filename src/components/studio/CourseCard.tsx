import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { cleanCourseName } from "@/lib/courseName";

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

type CourseCardMotionProps = Omit<
  React.ComponentPropsWithoutRef<typeof motion.button>,
  "children" | "className" | "onClick" | "style"
>;

/** Card corso del selettore Studio: superficie #191919, bordo hairline, 8 px. */
export function CourseCard({
  course,
  active = false,
  onSelect,
  actionLabel,
  children,
  className,
  noImage: _noImage = false,
  style,
  ...motionProps
}: CourseCardProps & CourseCardMotionProps) {
  return (
    <motion.button
      {...motionProps}
      type="button"
      onClick={() => onSelect(course)}
      style={style}
      className={cn(
        "relative w-full rounded-card border border-border bg-card p-4 text-left text-foreground sm:p-5",
        "transition-[transform,background-color] duration-150 active:scale-[0.98] motion-reduce:transform-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active && "studio-current border-white bg-[#0a0a0a] text-white",
        className,
      )}
    >
      <div className="relative">
        {children}
        <span className="mt-3.5 flex h-11 w-full items-center justify-center rounded-button border border-current/30 text-sm font-normal">
          {actionLabel}
        </span>
      </div>
    </motion.button>
  );
}

export const courseDisplayName = (file_name: string) => cleanCourseName(file_name);
