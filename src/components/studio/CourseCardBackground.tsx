import { cn } from "@/lib/utils";

interface CourseCardBackgroundProps {
  /** URL dell'immagine di copertina (può essere null → fallback a tinta). */
  coverUrl: string | null;
  /** Colore materia (HEX o HSL) per la tinta di overlay. */
  subjectColor: string;
  /** Opacità dell'immagine (default 0.4 come da brief). */
  opacity?: number;
  /** Se true mostra il gradiente scuro per il testo bianco (default true). */
  withDarkGradient?: boolean;
}

/**
 * 🖼️ P24 — SFONDO UNIFICATO per le card dei corsi (Hero, selettore, dashboard).
 *
 * Layer 0: immagine sfocata (blur-md, scale-110, opacity 40%) — con `object-cover`
 *          per coprire sempre, e `scale-110` per evitare bordi bianchi dal blur.
 * Layer 1: tinta della materia (subjectColor) + gradiente scuro in basso
 *          (from-black/80 via-black/40) per garantire il contrasto del testo bianco.
 * Fallback: se coverUrl è null → solo tinta materia (nessuna immagine rotta).
 */
export function CourseCardBackground({
  coverUrl,
  subjectColor,
  opacity = 0.4,
  withDarkGradient = true,
}: CourseCardBackgroundProps) {
  return (
    <>
      {/* LAYER 0 — immagine sfocata */}
      {coverUrl && (
        <div className="absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover blur-md scale-110"
            style={{ opacity }}
          />
        </div>
      )}

      {/* LAYER 1 — tinta materia + ombra per leggibilità */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0",
          withDarkGradient && "bg-gradient-to-t from-black/80 via-black/40 to-transparent",
        )}
        style={{
          background: coverUrl
            ? undefined
            : `linear-gradient(to bottom, color-mix(in srgb, ${subjectColor} 50%, transparent), color-mix(in srgb, ${subjectColor} 50%, transparent))`,
        }}
      />
    </>
  );
}
