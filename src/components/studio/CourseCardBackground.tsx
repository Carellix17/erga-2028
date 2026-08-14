interface CourseCardBackgroundProps {
  /** URL dell'immagine di copertina (null → solo Ambient Glow radiale). */
  coverUrl: string | null;
  /** Colore materia (HEX o HSL): illumina la parte superiore della card. */
  subjectColor: string;
  /** Opacità dell'immagine (default 0.4). */
  opacity?: number;
  /** Se true mantiene il gradiente scuro in basso (default true). */
  withDarkGradient?: boolean;
}

/**
 * 🖼️ P24 — SFONDO AMBIENT GLOW a GRADIENTE RADIALE (riferimento visivo Capo).
 *
 * Un solo contenitore con style inline:
 *  · backgroundColor #121212 (fondo scuro, MAI nero pieno);
 *  · radial-gradient(130% 100% at 75% 10%, coloreMateria 47% → 20% → transparent 75%)
 *    = il colore della materia ILLUMINA la metà superiore destra della card;
 *  · linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.6) 100%)
 *    = leggero chiarore in alto + fondo scuro uniforme in basso (dove stanno
 *    i bottoni), senza soffocare il colore.
 *
 * Se coverUrl è presente: l'immagine sfocata si sovrappone con dissolvenza,
 * ma la base radiale resta sotto (continuità). Il colore risponde in tempo
 * reale al cambio di subjectColor. Nessun asset esterno: solo CSS.
 */
export function CourseCardBackground({
  coverUrl,
  subjectColor,
  opacity = 0.4,
  withDarkGradient = true,
}: CourseCardBackgroundProps) {
  const hasImage = !!coverUrl;
  const color = subjectColor || "#7A3B4E";

  return (
    <>
      {/* BASE — gradiente radiale Ambient Glow (sempre, sotto tutto) */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundColor: "#121212",
          backgroundImage: `radial-gradient(130% 100% at 75% 10%, color-mix(in srgb, ${color} 47%, transparent) 0%, color-mix(in srgb, ${color} 20%, transparent) 45%, transparent 75%), linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(0, 0, 0, 0.6) 100%)`,
        }}
      />

      {/* LAYER 0 — immagine sfocata (sopra la base, con dissolvenza) */}
      {hasImage && (
        <div className="absolute inset-0 overflow-hidden rounded-[inherit] animate-fade-in" aria-hidden>
          <img
            src={coverUrl!}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover blur-md scale-110"
            style={{ opacity }}
          />
        </div>
      )}

      {/* Ombra leggera sopra l'immagine per il testo bianco (se richiesto) */}
      {hasImage && withDarkGradient && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
          aria-hidden
        />
      )}
    </>
  );
}
