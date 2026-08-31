import { Play, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CourseHeroCard — card unificata del corso attivo.
 *
 * Stato attivo: titolo del corso + anello di avanzamento, lezione corrente
 * con metadati reali ("7 di 28 lezioni") e CTA primaria a piena larghezza.
 * Stato vuoto (nessun corso attivo): invito elegante a scegliere o caricare
 * il primo percorso. Il colore primario del brand è riservato all'anello e
 * alla CTA: tutto il resto resta neutro.
 */

export interface CourseHeroCardProps {
  /** Titolo del corso attivo. Se manca, la card mostra lo stato vuoto. */
  courseTitle?: string | null;
  /** Titolo della lezione da riprendere. */
  lessonTitle?: string | null;
  /** Riga di metadati sotto la lezione, es. "7 di 28 lezioni". */
  lessonMetaText?: string | null;
  /** Avanzamento del percorso 0-100. Null → nessun anello. */
  progressPercent?: number | null;
  /** Etichetta della CTA primaria, es. "Riprendi lezione". */
  primaryCtaLabel?: string | null;
  onPrimaryCta?: () => void;
  /** Stato vuoto: titolo, descrizione, CTA e azione. */
  emptyTitle?: string | null;
  emptyDescription?: string | null;
  emptyCtaLabel?: string | null;
  onEmptyCta?: () => void;
}

function clampPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Anello di avanzamento SVG: circonferenza 100 → dash = percentuale. */
function ProgressRing({ percent, ariaLabel }: { percent: number; ariaLabel: string }) {
  const p = clampPercent(percent);
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="relative inline-grid h-16 w-16 shrink-0 place-items-center"
    >
      <svg viewBox="0 0 36 36" aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90">
        {/* traccia neutra */}
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          strokeWidth="3.5"
          stroke="hsl(var(--surface-container-highest))"
        />
        {/* avanzamento: unico uso del colore primario insieme alla CTA */}
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          strokeWidth="3.5"
          stroke="hsl(var(--primary))"
          strokeLinecap="round"
          strokeDasharray={`${p} ${100 - p}`}
          strokeDashoffset="0"
        />
      </svg>
      <span className="relative text-sm font-semibold tabular-nums text-foreground">{p}%</span>
    </span>
  );
}

export function CourseHeroCard({
  courseTitle,
  lessonTitle,
  lessonMetaText,
  progressPercent,
  primaryCtaLabel,
  onPrimaryCta,
  emptyTitle,
  emptyDescription,
  emptyCtaLabel,
  onEmptyCta,
}: CourseHeroCardProps) {
  const isActive = Boolean(courseTitle && lessonTitle && primaryCtaLabel);

  if (!isActive) {
    return (
      <article
        className={cn(
          "flex flex-col items-center rounded-card border border-border bg-card p-5 text-center sm:p-6",
        )}
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-container-high">
          <BookOpen className="h-6 w-6 text-foreground" aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-lg font-semibold text-foreground">
          {emptyTitle ?? "Scegli o carica il tuo primo percorso"}
        </h2>
        {emptyDescription && (
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{emptyDescription}</p>
        )}
        {emptyCtaLabel && (
          <button
            type="button"
            onClick={onEmptyCta}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-button bg-primary text-[15px] font-semibold text-primary-foreground transition-transform duration-150 ease-m3-emphasized active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {emptyCtaLabel}
          </button>
        )}
      </article>
    );
  }

  return (
    <article className="rounded-card border border-border bg-card p-5 sm:p-6">
      {/* Header card: corso a sinistra, anello di avanzamento a destra */}
      <div className="flex items-start justify-between gap-4">
        <h2 className="min-w-0 self-center text-lg font-semibold leading-snug text-foreground">
          <span className="block truncate">{courseTitle}</span>
        </h2>
        <ProgressRing percent={progressPercent ?? 0} ariaLabel={`Avanzamento: ${clampPercent(progressPercent)}%`} />
      </div>

      {/* Corpo card: lezione corrente + metadati reali */}
      <div className="mt-3 min-w-0">
        <p className="text-base font-medium leading-snug text-foreground line-clamp-2">{lessonTitle}</p>
        {lessonMetaText && (
          <p className="mt-1 truncate text-sm text-muted-foreground">{lessonMetaText}</p>
        )}
      </div>

      {/* CTA primaria: unico pulsante pieno del colore del brand */}
      <button
        type="button"
        onClick={onPrimaryCta}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-button bg-primary text-[15px] font-semibold text-primary-foreground transition-transform duration-150 ease-m3-emphasized active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
        {primaryCtaLabel}
      </button>
    </article>
  );
}
