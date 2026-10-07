import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Brain } from "lucide-react";

export type PipelinePhase = "material" | "analysis" | "generation";

interface UnifiedPipelineLoaderProps {
  phase: PipelinePhase;
  /** Avanzamento 0–100 della barra unica (cresce, non torna mai indietro). */
  progress: number;
  /** Nome del percorso in preparazione (facoltativo). */
  courseName?: string | null;
  /** Compare dopo un po': chi vuole può continuare in background. */
  onSkip: () => void;
}

const PHASE_CAPTION: Record<PipelinePhase, string> = {
  material: "Carico il materiale…",
  analysis: "Analizzo il contenuto…",
  generation: "Creo le lezioni…",
};

/**
 * IL caricamento unico (decisione del proprietario, 7 ottobre 2026).
 *
 * Dall'istante in cui l'utente tocca «Carica» fino alle prime lezioni
 * pronte, l'app mostra QUESTO e solo questo: una schermata piena, un
 * titolo, UNA barra che avanza senza mai tornare indietro. Dentro girano
 * compressione delle foto, caricamento, analisi del materiale e
 * generazione del percorso (schema + prime lezioni) — ma i passaggi
 * interni non si vedono: l'utente conta UN caricamento, come chiesto.
 *
 * Dopo 15 secondi compare un discreto «Continua in background»: chi non
 * vuole aspettare davanti allo schermo torna nell'app — la preparazione
 * prosegue nel server e il corso è lì quando è pronto.
 */
export function UnifiedPipelineLoader({ phase, progress, courseName, onSkip }: UnifiedPipelineLoaderProps) {
  const [canSkip, setCanSkip] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setCanSkip(true), 15000);
    return () => window.clearTimeout(t);
  }, []);

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-label="Preparazione del percorso in corso"
      className="pointer-events-auto fixed inset-0 z-[95] flex flex-col items-center justify-center gap-6 bg-background px-8 text-center"
    >
      <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-surface-container-high shadow-level-1">
        <Brain className="h-8 w-8 text-foreground" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="w-full max-w-sm">
        <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">
          Preparo il tuo percorso
        </h2>
        {courseName && (
          <p className="mt-1.5 truncate text-[15px] text-muted-foreground">{courseName}</p>
        )}
        {/* UNA barra: cresce con le fasi interne e non torna mai indietro. */}
        <div className="mt-6 h-2 w-full overflow-hidden rounded-pill bg-secondary" aria-hidden="true">
          <div
            className="h-full rounded-pill bg-primary transition-[width] duration-700 ease-m3-emphasized motion-reduce:transition-none"
            style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{PHASE_CAPTION[phase]}</p>
      </div>
      {canSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="rounded-pill px-3 py-1.5 text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Continua in background
        </button>
      )}
    </div>,
    document.body,
  );
}
