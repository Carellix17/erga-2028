import { cn } from "@/lib/utils";

interface CourseCardBackgroundProps {
  /** URL dell'immagine di copertina (null/undefined → fallback Ambient Glow). */
  coverUrl: string | null;
  /** Colore materia (HEX o HSL) per i bagliori ambient. */
  subjectColor: string;
  /** Opacità dell'immagine (default 0.4). */
  opacity?: number;
  /** Se true mostra il gradiente di contrasto scuro (default true). */
  withDarkGradient?: boolean;
}

/**
 * 🖼️ P24 — SFONDO UNIFICATO per le card dei corsi con FALLBACK AMBIENT GLOW.
 *
 * Sempre presente (base):
 *  · bg-neutral-950 (fondo scuro profondo)
 *  · bagliore principale in alto a destra (blur-3xl, colore materia, opacity 35%)
 *  · bagliore secondario in basso a sinistra (blur-2xl, colore materia, opacity 20%)
 *  · gradiente di contrasto (from-neutral-900/40 via-neutral-950/70 to-neutral-950/90)
 *    per garantire testi/badge/bottoni ad alto contrasto.
 *
 * Quando coverUrl è presente:
 *  · l'immagine sfocata (blur-md, scale-110) si sovrappone con DISSOLVENZA
 *    (transition-opacity duration-500), i bagliori si attenuano.
 * Solo CSS puro / classi Tailwind: nessun asset esterno.
 */
export function CourseCardBackground({
  coverUrl,
  subjectColor,
  opacity = 0.4,
  withDarkGradient = true,
}: CourseCardBackgroundProps) {
  const hasImage = !!coverUrl;

  return (
    <>
      {/* BASE — fondo scuro profondo (sempre) */}
      <div className="absolute inset-0 bg-neutral-950" aria-hidden />

      {/* BAGLIORE principale — alto a destra (colore materia) */}
      <div
        className={cn(
          "absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl transition-opacity duration-500",
          hasImage ? "opacity-0" : "opacity-35",
        )}
        style={{ backgroundColor: subjectColor }}
        aria-hidden
      />

      {/* BAGLIORE secondario — basso a sinistra (colore materia, più tenue) */}
      <div
        className={cn(
          "absolute -bottom-8 -left-8 w-36 h-36 rounded-full blur-2xl transition-opacity duration-500",
          hasImage ? "opacity-0" : "opacity-20",
        )}
        style={{ backgroundColor: subjectColor }}
        aria-hidden
      />

      {/* GRADIENTE DI CONTRASTO — sopra i bagliori, sotto tutto il resto */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b from-neutral-900/40 via-neutral-950/70 to-neutral-950/90",
          !withDarkGradient && "opacity-0",
        )}
        aria-hidden
      />

      {/* LAYER 0 — immagine sfocata (con dissolvenza) */}
      {hasImage && (
        <div
          className="absolute inset-0 overflow-hidden rounded-[inherit] animate-fade-in"
          aria-hidden
        >
          <img
            src={coverUrl!}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover blur-md scale-110"
            style={{ opacity }}
          />
        </div>
      )}

      {/* Gradiente scuro sopra l'immagine per il contrasto del testo bianco */}
      {hasImage && withDarkGradient && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
          aria-hidden
        />
      )}
    </>
  );
}
