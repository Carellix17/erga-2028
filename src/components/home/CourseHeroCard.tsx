import { Play, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { CourseCardBackground } from "@/components/studio/CourseCardBackground";
import { courseCoverVars } from "@/lib/courseIdentity";

/**
 * CourseHeroCard — V2-01 (DESIGN.md 2.1 §4, §9).
 *
 * Stato attivo: copertina colorata del corso (campo materia + composizione
 * astratta + grana, raggio 32) con l'inchiostro garantito dalla famiglia
 * (light → inchiostro, deep → carta). Progresso reale con anello; titolo
 * del corso in Lora (font-display); azione «Riprendi/Continua» SATINATA a
 * pillola — l'unica superficie con velo, perché vive sulla copertina.
 *
 * Stato vuoto (nessun corso / generazione in corso): carta breve e utile,
 * icona, due righe, un'azione — niente grande pannello vuoto.
 */

export interface CourseHeroCardProps {
  /** Titolo del corso attivo. Se manca, la card mostra lo stato vuoto. */
  courseTitle?: string | null;
  /** ID del percorso (informazione per i consumatori futuri). */
  contextId?: string | null;
  /** Etichetta soprastante il titolo del corso, es. "Percorso attivo". */
  eyebrowText?: string | null;
  /** Titolo della lezione da riprendere. */
  lessonTitle?: string | null;
  /** Riga di metadati sotto la lezione, es. "7 di 28 lezioni". */
  lessonMetaText?: string | null;
  /** Avanzamento del percorso 0-100. Null → nessun anello. */
  progressPercent?: number | null;
  /** Etichetta accessibile dell'anello, es. "Avanzamento del percorso: 20%". */
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

function clampPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Anello di avanzamento SVG (contenuto: il cerchio è ammesso).
 *  Il tratto segue l'inchiostro della copertina (currentColor). */
function ProgressRing({ percent, ariaLabel }: { percent: number; ariaLabel: string }) {
  const p = clampPercent(percent);
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="relative inline-grid h-14 w-14 shrink-0 place-items-center text-contrast sm:h-16 sm:w-16"
    >
      <svg viewBox="0 0 36 36" aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3.5" stroke="currentColor" strokeOpacity={0.28} />
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          strokeWidth="3.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={`${p} ${100 - p}`}
          strokeDashoffset="0"
        />
      </svg>
      <span className="relative text-[13px] font-semibold tabular-nums sm:text-sm">{p}%</span>
    </span>
  );
}

export function CourseHeroCard({
  courseTitle,
  contextId,
  eyebrowText,
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
  const isActive = Boolean(courseTitle && lessonTitle && primaryCtaLabel);
  const { cover, style } = courseCoverVars(courseTitle ?? "");

  if (!isActive) {
    // ── Stato vuoto: breve, utile, su carta (2.1 §9) ──────────────────
    return (
      <article className="flex flex-col items-center rounded-card border border-border bg-card p-5 text-center shadow-tactile sm:p-6">
        <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-surface-container-high">
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
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-primary text-[15px] font-semibold text-primary-foreground transition-transform duration-150 ease-m3-emphasized active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {emptyCtaLabel}
          </button>
        )}
      </article>
    );
  }

  // ── Copertina del corso protagonista (2.1 §4) ──────────────────────
  return (
    <article
      className={cn("relative w-full overflow-hidden rounded-hero border border-border shadow-level-3")}
      style={style}
    >
      <CourseCardBackground courseName={courseTitle ?? ""} />

      <div className="relative z-10 p-5 text-left sm:p-6">
        {/* Header: corso a sinistra (Lora), anello di avanzamento a destra */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            {eyebrowText && (
              <p className="text-[13px] font-medium leading-none tracking-[0.08em] text-contrast-secondary">
                {eyebrowText}
              </p>
            )}
            <h2 className="mt-1.5 break-words font-display text-[1.75rem] font-medium leading-[1.12] tracking-[-0.01em] text-contrast sm:text-3xl">
              {courseTitle}
            </h2>
          </div>
          <ProgressRing
            percent={progressPercent ?? 0}
            ariaLabel={progressAriaLabel ?? `${clampPercent(progressPercent)}%`}
          />
        </div>

        {/* Lezione corrente + metadati reali */}
        <div className="mt-2.5 min-w-0">
          <p className="line-clamp-2 text-[15px] font-medium leading-snug text-contrast">{lessonTitle}</p>
          {lessonMetaText && (
            <p className="mt-1 text-sm leading-snug text-contrast-secondary">{lessonMetaText}</p>
          )}
        </div>

        {/* Azione principale della copertina: velo satinato a pillola (2.1 §4).
            Testo inchiostro opaco, blur locale SOLO sul fondo del controllo. */}
        <button type="button" onClick={onPrimaryCta} className="btn-satin mt-5 w-full">
          <Play className="h-4 w-4 shrink-0 fill-current" strokeWidth={1.9} aria-hidden="true" />
          {primaryCtaLabel}
        </button>
      </div>

      {/* Identificabile dai test e dal detector: famiglia della copertina. */}
      <span className="hidden" data-cover-family={cover.family} aria-hidden="true" />
    </article>
  );
}
