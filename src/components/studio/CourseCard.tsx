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
  style?: CSSProperties;
}

type CourseCardMotionProps = Omit<
  React.ComponentPropsWithoutRef<typeof motion.button>,
  "children" | "className" | "onClick" | "style"
>;

/** Card avorio del selettore Studio, con angoli da 24 px. */
export function CourseCard({
  course,
  active = false,
  onSelect,
  actionLabel,
  children,
  className,
  style,
  ...motionProps
}: CourseCardProps & CourseCardMotionProps) {
  return (
    <motion.button
      {...motionProps}
      type="button"
      aria-current={active || undefined}
      onClick={() => onSelect(course)}
      style={style}
      className={cn(
        "relative w-full rounded-[24px] border border-border bg-card p-4 text-left text-foreground sm:p-6",
        "transition-[transform,background-color] duration-150 active:scale-[0.98] motion-reduce:transform-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <div className="relative">
        {children}
        <span className="mt-4 flex h-11 w-full items-center justify-center rounded-button border border-current/30 text-sm font-normal">
          {actionLabel}
        </span>
      </div>
    </motion.button>
  );
}

export const courseDisplayName = (file_name: string) => cleanCourseName(file_name);
