import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CognitiveHexagonSvg } from "./CognitiveHexagonSvg";
import type { CognitiveHexagonScores } from "@/lib/cognitiveArchetype";

/**
 * CognitiveProfileCard — card orizzontale compatta, interamente cliccabile.
 * Badge "PROFILO COGNITIVO" e chevron in alto; sotto, due colonne:
 * archetipo + descrizione sintetica a sinistra, esagono SVG a destra.
 * Se il profilo non è calibrato la card mostra l'invito alla calibrazione
 * e l'esagono resta tratteggiato.
 */

export interface CognitiveProfileCardProps {
  /** Testo del badge in alto a sinistra. */
  badgeText?: string;
  /** Titolo archetipo, es. "Il Logico-Sistemico", o invito alla calibrazione. */
  title: string;
  /** Descrizione sintetica (max 2 righe). */
  description?: string | null;
  /** Punteggi reali dell'esagono. Null → profilo non calibrato. */
  scores?: CognitiveHexagonScores | null;
  onClick?: () => void;
  ariaLabel?: string;
}

export function CognitiveProfileCard({
  badgeText = "Profilo cognitivo",
  title,
  description,
  scores,
  onClick,
  ariaLabel,
}: CognitiveProfileCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? title}
      className={cn(
        "w-full cursor-pointer rounded-card border border-border bg-card p-5 text-left",
        "transition-colors hover:bg-surface-container-low active:bg-surface-container",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      )}
    >
      {/* Riguardo: badge + chevron */}
      <span className="flex items-center justify-between gap-3">
        <span className="inline-flex h-6 items-center rounded-pill bg-surface-container px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {badgeText}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </span>

      {/* Corpo: archetipo a sinistra, esagono a destra */}
      <span className="mt-3 flex items-center gap-4">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-semibold text-foreground">{title}</span>
          {description && (
            <span className="mt-1 block text-sm leading-snug text-muted-foreground line-clamp-2">
              {description}
            </span>
          )}
        </span>
        <CognitiveHexagonSvg scores={scores} />
      </span>
    </button>
  );
}
