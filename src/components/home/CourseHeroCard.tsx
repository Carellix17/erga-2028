import { Play, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * CourseHeroCard — P36 dark luxury / warm minimalist.
 *
 * L'azione focale della Home vive su una card AVORIO (#F4F1EA) di notte,
 * con inchiostro #121214, secondo testo #4A4A4F e CTA a pillola scura:
 * il massimo contrasto possibile sull'azione di studio principale.
 * Di giorno la card resta la firma invertita (inchiostro su avorio chiaro):
 * stesse proporzioni, stesso contenuti, inversione specchiata.
 *
 * Superfici solide a strati: niente cover, niente blur — solo colore pieno,
 * filo di bordo sottilissimo e ombra tattile. Il titolo del corso usa il
 * font display Radja (peso unico 400: la gerarchia la fa la misura).
 *
 * Stato vuoto (nessun corso / generazione in corso): card secondaria con
 * invito a scegliere o caricare il primo percorso.
 */

export interface CourseHeroCardProps {
  /** Titolo del corso attivo. Se manca, la card mostra lo stato vuoto. */
  courseTitle?: string | null;
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

/** Soglia oltre la quale il titolo del corso viene mostrato un gradino
 *  più piccolo, per non gonfiare la card su nomi lunghi. */
const LONG_COURSE_TITLE_THRESHOLD = 20;

function clampPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Anello di avanzamento SVG (circonferenza 100 → dash = percentuale).
 *  La percentuale è la macro-metrica focale: cifra in Radja. */
function ProgressRing({ percent, ariaLabel }: { percent: number; ariaLabel: string }) {
  const p = clampPercent(percent);
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="relative inline-grid h-14 w-14 shrink-0 place-items-center text-inverse-on-surface dark:text-surface-cream-foreground sm:h-16 sm:w-16"
    >
      <svg viewBox="0 0 36 36" aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90">
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          strokeWidth="3.5"
          stroke="currentColor"
          strokeOpacity={0.25}
        />
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
      <span className="font-radja relative text-[15px] font-normal leading-none tabular-nums sm:text-base">
        {p}%
      </span>
    </span>
  );
}

export function CourseHeroCard({
  courseTitle,
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

  if (!isActive) {
    return (
      <article
        className={cn(
          "flex flex-col items-center rounded-card border border-border/50 bg-card p-5 text-center shadow-tactile sm:p-6",
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
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-transform duration-150 ease-m3-emphasized active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {emptyCtaLabel}
          </button>
        )}
      </article>
    );
  }

  // ── P36 — hero avorio di notte / inchiostro di giorno, always focal ─────
  return (
    <article
      className={cn(
        "relative w-full rounded-card border bg-inverse-surface p-5 text-left shadow-hero sm:p-6",
        "border-inverse-on-surface/15 dark:border-black/[0.08] dark:bg-surface-cream",
      )}
    >
      {/* Header: corso a sinistra, anello di avanzamento a destra */}
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          {eyebrowText && (
            <p className="label-small tracking-[0.16em] text-inverse-on-surface/70 dark:text-surface-cream-muted">
              {eyebrowText}
            </p>
          )}
          <h2
            className={cn(
              "font-radja mt-1 break-words font-normal leading-[1.05] tracking-tight text-inverse-on-surface dark:text-surface-cream-foreground",
              (courseTitle ?? "").length > LONG_COURSE_TITLE_THRESHOLD
                ? "text-2xl sm:text-3xl"
                : "text-3xl sm:text-4xl",
            )}
          >
            {courseTitle}
          </h2>
        </div>
        <ProgressRing
          percent={progressPercent ?? 0}
          ariaLabel={progressAriaLabel ?? `${clampPercent(progressPercent)}%`}
        />
      </div>

      {/* Corpo: lezione corrente + metadati reali (nessuna barra orizzontale) */}
      <div className="mt-2 min-w-0">
        <p className="text-[17px] font-semibold leading-snug text-inverse-on-surface dark:text-surface-cream-foreground line-clamp-2">
          {lessonTitle}
        </p>
        {lessonMetaText && (
          <p className="mt-1 truncate text-sm text-inverse-on-surface/75 dark:text-surface-cream-muted">
            {lessonMetaText}
          </p>
        )}
      </div>

      {/* CTA a pillola: scura sull'avorio di notte, avorio sull'inchiostro di giorno */}
      <button
        type="button"
        onClick={onPrimaryCta}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-inverse-on-surface px-6 text-[15px] font-semibold text-inverse-surface transition-opacity duration-200 hover:opacity-80 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-surface-cream-foreground dark:text-surface-cream"
      >
        <Play className="h-4 w-4 shrink-0 fill-current" strokeWidth={1.9} aria-hidden="true" />
        {primaryCtaLabel}
      </button>
    </article>
  );
}
