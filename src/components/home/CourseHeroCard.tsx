import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageCourseBackground } from "@/components/studio/ImageCourseBackground";

interface CourseHeroCardProps {
  /** Titolo del corso attivo. Se manca, la card mostra lo stato vuoto. */
  courseTitle?: string | null;
  coverSubject?: string | null;
  materialSubject?: string | null;
  /** ID del percorso (informazione per i consumatori futuri). */
  contextId?: string | null;
  /** Etichetta soprastante il titolo del corso, es. "Percorso attivo". */
  eyebrowText?: string | null;
  /** Titolo della lezione da riprendere. */
  lessonTitle?: string | null;
  /** Riga di metadati sotto la lezione, es. "Lezione 7 di 28". */
  lessonMetaText?: string | null;
  /** Avanzamento del percorso 0-100, mostrato nella barra lineare. */
  progressPercent?: number | null;
  /** Etichetta accessibile della barra, es. "Avanzamento del percorso: 20%". */
  progressAriaLabel?: string | null;
  /** Etichetta della CTA primaria, es. "Riprendi lezione". */
  primaryCtaLabel?: string | null;
  onPrimaryCta?: () => void;
  /** Stato vuoto: titolo, descrizione, CTA e azione. */
  emptyTitle?: string | null;
  emptyDescription?: string | null;
  emptyCtaLabel?: string | null;
  onEmptyCta?: () => void;
}

function clampPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : 0;
}

const lessonCtaClass = "min-h-12 w-full sm:w-fit";

export function CourseHeroCard({
  courseTitle,
  coverSubject,
  materialSubject,
  lessonTitle,
  lessonMetaText,
  progressPercent,
  progressAriaLabel,
  primaryCtaLabel,
  onPrimaryCta,
  emptyTitle,
  emptyDescription,
  emptyCtaLabel,
  onEmptyCta,
}: CourseHeroCardProps) {
  const active = Boolean(courseTitle && lessonTitle && primaryCtaLabel);
  const percent = clampPercent(progressPercent);

  return (
    <article className="course-cover-surface relative isolate min-w-0 overflow-hidden border text-foreground">
      {active && (
        <ImageCourseBackground courseName={courseTitle} customKey={coverSubject} materialSubject={materialSubject} eager />
      )}
      {active ? (
        <div className="relative p-5 sm:p-6">
          <h2 className="max-w-[22ch] break-words text-3xl font-normal leading-tight tracking-tight sm:text-4xl">
            {courseTitle}
          </h2>
          <p className="mt-2 break-words text-lg leading-snug sm:text-xl">{lessonTitle}</p>
          {lessonMetaText && (
            <p className="mt-1.5 break-words text-sm text-sand">{lessonMetaText}</p>
          )}

          <div className="mt-5">
            <div className="mb-3 flex items-center gap-3">
              <div
                role="progressbar"
                aria-label={progressAriaLabel ?? "Avanzamento del percorso"}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1 min-w-0 flex-1 overflow-hidden bg-foreground/25"
              >
                <div className="h-full bg-foreground" style={{ width: `${percent}%` }} />
              </div>
              <span aria-hidden="true" className="shrink-0 font-mono text-sm tabular-nums text-sand">{percent}%</span>
            </div>
            <Button onClick={onPrimaryCta} className={lessonCtaClass}>
              {primaryCtaLabel}
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          <BookOpen className="mb-4 h-7 w-7" aria-hidden="true" />
          <h2 className="max-w-[24ch] break-words text-2xl font-normal leading-tight sm:text-3xl">
            {emptyTitle ?? "Scegli o carica il tuo primo percorso"}
          </h2>
          {emptyDescription && (
            <p className="mt-3 max-w-[52ch] break-words text-base leading-relaxed text-[#dadbdf]">
              {emptyDescription}
            </p>
          )}
          {emptyCtaLabel && (
            <Button onClick={onEmptyCta} className={`mt-5 ${lessonCtaClass}`}>
              {emptyCtaLabel}
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
