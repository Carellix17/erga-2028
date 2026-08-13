import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { cleanCourseName } from "@/lib/courseName";
import { getSubjectAccent, getAccentForeground } from "@/lib/subjectColors";
import { fetchCourseImage, getCachedCourseImage } from "@/lib/wikipediaImage";
import { cleanSubjectTitleForSearch } from "@/lib/courseTitle";

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
  /** Se true disabilita il recupero immagine (es. card inline della hero). */
  noImage?: boolean;
}

// Prop di framer-motion (initial/animate/exit/transition/layout) inoltrate
// al motion.button interno, così l'animazione di entrata/uscita funziona.
type CourseCardMotionProps = Omit<
  React.ComponentPropsWithoutRef<typeof motion.button>,
  "children" | "className" | "onClick" | "style"
>;

/**
 * 🖼️ P24 — Card corso con COVER IMMAGINE contestuale:
 *  Layer 0: immagine sfocata (blur-md, scale-110, opacity-40)
 *  Layer 1: gradiente tinta materia (--subject-accent al 50%) + ombra scura
 *  Layer 2: contenuto z-10 con testo ad alto contrasto
 * Se l'immagine manca (o in attesa): fallback a gradiente materia (niente
 * immagini rotte, niente blocco della UI — caricamento asincrono + cache).
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
  const [coverUrl, setCoverUrl] = useState<string | null>(
    course.cover_image_url ?? null,
  );

  const accent = getSubjectAccent(course.file_name);
  const fg = getAccentForeground(accent);

  // Recupero asincrono immagine (solo se serve e non già in cache/DB)
  useEffect(() => {
    if (noImage || coverUrl) return;
    const title = cleanSubjectTitleForSearch(course.file_name);
    if (!title) return;
    const cached = getCachedCourseImage(title);
    if (cached !== null) {
      setCoverUrl(cached);
      return;
    }
    let alive = true;
    void fetchCourseImage(title).then((url) => {
      if (alive) setCoverUrl(url);
    });
    return () => {
      alive = false;
    };
  }, [course.file_name, coverUrl, noImage]);

  const hasImage = !!coverUrl;

  return (
    <motion.button
      {...motionProps}
      type="button"
      onClick={() => onSelect(course)}
      className={cn(
        "relative w-full overflow-hidden rounded-[28px] shadow-level-2 p-4 sm:p-5 text-left transition-transform duration-150 active:scale-[0.98]",
        className,
      )}
      style={{
        backgroundColor: accent,
        color: hasImage ? "#ffffff" : fg,
      }}
    >
      {/* LAYER 0 — immagine di copertina sfocata */}
      {hasImage && (
        <div className="absolute inset-0 overflow-hidden rounded-[28px]" aria-hidden>
          <img
            src={coverUrl!}
            alt=""
            className="w-full h-full object-cover blur-md scale-110 opacity-40"
            loading="lazy"
          />
        </div>
      )}

      {/* LAYER 1 — tinta materia + ombra per la leggibilità */}
      <div
        className={cn("absolute inset-0", hasImage && "bg-gradient-to-t from-black/80 via-black/40 to-transparent")}
        aria-hidden
        style={
          !hasImage
            ? {
                background: `linear-gradient(to bottom, color-mix(in srgb, ${accent} 50%, transparent), color-mix(in srgb, ${accent} 50%, transparent))`,
              }
            : undefined
        }
      />

      {/* LAYER 2 — contenuto */}
      <div className="relative z-10">
        {children}
        <span
          className="mt-3.5 inline-flex items-center justify-center gap-1.5 rounded-full border h-10 w-full text-sm font-semibold"
          style={
            hasImage
              ? { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)" }
              : {
                  backgroundColor: "color-mix(in srgb, currentColor 8%, transparent)",
                  borderColor: "color-mix(in srgb, currentColor 20%, transparent)",
                }
          }
        >
          {actionLabel}
        </span>
      </div>
    </motion.button>
  );
}

/** Helper: nome pulito del corso (usato nei contenuti). */
export const courseDisplayName = (file_name: string) => cleanCourseName(file_name);
