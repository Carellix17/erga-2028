import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CourseHeroCardProps {
  /** Titolo del corso attivo. Se manca, la card mostra lo stato vuoto. */
  courseTitle?: string | null;
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

/** Sulla card bianca il pill outline (bordo e testo bianchi) non si legge.
 *  Riempimento: canvas DESIGN.md #0a0a0a. Testo: ink #ffffff.
 *  Hover: canvas-soft #1a1c20. Focus: anello nero staccato dal bianco della card. */
const lessonCtaClass =
  "min-h-12 w-full border-[#0a0a0a] bg-[#0a0a0a] text-[#ffffff] hover:border-[#1a1c20] hover:bg-[#1a1c20] hover:text-[#ffffff] focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-[#ffffff] sm:w-fit";

export function CourseHeroCard({
  courseTitle,
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
    <article className="relative isolate min-w-0 overflow-hidden rounded-[8px] border border-[#212327] bg-[#ffffff] text-[#0a0a0a]">
      {active ? (
        <div className="relative p-5 sm:p-6">
          <h2 className="max-w-[22ch] break-words text-3xl font-semibold leading-tight tracking-tight text-[#0a0a0a] sm:text-4xl">
            {courseTitle}
          </h2>
          <p className="mt-2 break-words text-lg leading-snug text-[#0a0a0a] sm:text-xl">{lessonTitle}</p>
          {lessonMetaText && (
            <p className="mt-1.5 break-words text-sm text-[#3a3f45]">{lessonMetaText}</p>
          )}

          <div className="mt-5">
            <div className="mb-3 flex items-center gap-3">
              <div
                role="progressbar"
                aria-label={progressAriaLabel ?? "Avanzamento del percorso"}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-1 min-w-0 flex-1 overflow-hidden bg-[#0a0a0a]/25"
              >
                <div className="h-full bg-[#0a0a0a]" style={{ width: `${percent}%` }} />
              </div>
              <span className="shrink-0 font-mono text-sm tabular-nums text-[#0a0a0a]">{percent}%</span>
            </div>
            <Button onClick={onPrimaryCta} className={lessonCtaClass}>
              {primaryCtaLabel}
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          <BookOpen className="mb-4 h-7 w-7 text-[#0a0a0a]" aria-hidden="true" />
          <h2 className="max-w-[24ch] break-words text-2xl font-semibold leading-tight text-[#0a0a0a] sm:text-3xl">
            {emptyTitle ?? "Scegli o carica il tuo primo percorso"}
          </h2>
          {emptyDescription && (
            <p className="mt-3 max-w-[52ch] break-words text-base leading-relaxed text-[#3a3f45]">
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
