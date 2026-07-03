import { ImageIcon } from "lucide-react";
import { PdfCrop } from "./PdfCrop";
import type { LessonFigure } from "@/hooks/useLessonFigures";

interface LessonFigureGalleryProps {
  figures: LessonFigure[];
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

/**
 * Renders a fallback gallery of all figures extracted for a lesson.
 * Shown when the AI didn't insert [FIG:N] markers in the explanation,
 * or as an inline preview inside the non-fullscreen MiniLesson card.
 */
export function LessonFigureGallery({
  figures,
  title = "Figure dal materiale",
  subtitle = "Estratte automaticamente dalle pagine del PDF",
  compact = false,
}: LessonFigureGalleryProps) {
  if (!figures || figures.length === 0) return null;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-secondary-container flex items-center justify-center shadow-level-1">
          <ImageIcon className="w-5 h-5 text-secondary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="label-large text-foreground">{title}</p>
          {subtitle && (
            <p className="body-small text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <span className="label-small px-2.5 py-1 rounded-full bg-surface-container-highest text-muted-foreground">
          {figures.length}
        </span>
      </div>

      <div
        className={
          compact
            ? "grid grid-cols-2 gap-3"
            : "grid grid-cols-1 sm:grid-cols-2 gap-3"
        }
      >
        {figures.map((fig) => (
          <div key={fig.id} className="space-y-1.5">
            <PdfCrop url={fig.url} bbox={fig.bbox} description={fig.description} />
            {fig.description && (
              <p className="body-small text-muted-foreground line-clamp-2 px-1">
                {fig.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
