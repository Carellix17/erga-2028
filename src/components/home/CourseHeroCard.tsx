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


function clampPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
}

export function CourseHeroCard({ courseTitle, lessonTitle, lessonMetaText, progressPercent, progressAriaLabel, primaryCtaLabel, onPrimaryCta, emptyTitle, emptyDescription, emptyCtaLabel, onEmptyCta }: CourseHeroCardProps) {
  const active = Boolean(courseTitle && lessonTitle && primaryCtaLabel);
  const percent = clampPercent(progressPercent);
  return <article className="flex h-full min-h-[360px] flex-col justify-between bg-card p-6 sm:p-8">
    {active ? <>
      <div>
        <h2 className="max-w-[22ch] break-words text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{courseTitle}</h2>
        <p className="mt-5 break-words text-xl leading-snug">{lessonTitle}</p>
        {lessonMetaText && <p className="mt-2 font-mono text-sm tabular-nums text-muted-foreground">{lessonMetaText}</p>}
      </div>
      <div className="mt-8">
        <div className="mb-5 flex items-center gap-4">
          <div role="progressbar" aria-label={progressAriaLabel ?? "Avanzamento del percorso"} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1 flex-1 bg-secondary">
            <div className="h-full bg-cognitive" style={{ width: percent + '%' }} />
          </div>
          <span className="font-mono text-sm tabular-nums text-muted-foreground">{percent}%</span>
        </div>
        <Button onClick={onPrimaryCta} className="min-h-12 w-full sm:w-auto">{primaryCtaLabel}<ArrowRight aria-hidden="true" /></Button>
      </div>
    </> : <>
      <div>
        <BookOpen className="mb-5 h-7 w-7 text-cognitive" aria-hidden="true" />
        <h2 className="max-w-[24ch] text-2xl font-semibold leading-tight sm:text-3xl">{emptyTitle ?? "Scegli o carica il tuo primo percorso"}</h2>
        {emptyDescription && <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">{emptyDescription}</p>}
      </div>
      {emptyCtaLabel && <Button onClick={onEmptyCta} className="mt-8 min-h-12 w-full sm:w-fit">{emptyCtaLabel}<ArrowRight aria-hidden="true" /></Button>}
    </>}
  </article>;
}

