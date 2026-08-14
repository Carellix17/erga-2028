interface CourseCardBackgroundProps {
  /** URL dell'immagine di copertina (null → solo Ambient Glow con Orbs). */
  coverUrl: string | null;
  /** Colore materia (HEX o HSL): guida base, orbs e bagliori. */
  subjectColor: string;
  /** Opacità dell'immagine (default 0.4). */
  opacity?: number;
}

/**
 * 🖼️ P24 — AMBIENT GLOW con ORBS (riferimento visivo Capo).
 *
 * Struttura a livelli cromatici:
 *  1) BASE CROMATICA: tono scuro DERIVATO dal colore materia (mai nero pece).
 *     Es. Impressionismo → base bordeaux scuro; Evoluzionismo → base blu scuro.
 *  2) ORB PRINCIPALE (alto destra, dietro il menu ⋯): bolla luminosa
 *     w-56 h-56 rounded-full blur-2xl opacity-60 colorata con la materia.
 *  3) ORB SECONDARIO (alto sinistra): w-40 h-40 blur-3xl opacity-30 con una
 *     tonalità più chiara per la tridimensionalità.
 *  4) OVERLAY leggero from-transparent via-black/20 to-black/70 per garantire
 *     contrasto a testi bianchi e bottoni in basso.
 * Se coverUrl c'è: immagine sfocata sopra con dissolvenza.
 * Reattivo al cambio materia (inline style). Nessun asset esterno.
 */

// ── Helpers colore (accettano HEX o HSL) ──

/** Da una stringa colore (hex/hsl) a canali RGB [r,g,b]. */
function toRgb(color: string): [number, number, number] | null {
  const c = color.trim();
  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3) hex = hex.split("").map((x) => x + x).join("");
    if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  const hsl = c.match(/^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/i);
  if (hsl) {
    const h = ((Number(hsl[1]) % 360) + 360) % 360;
    const s = Math.min(100, Number(hsl[2])) / 100;
    const l = Math.min(100, Number(hsl[3])) / 100;
    const chroma = s * Math.min(l, 1 - l);
    const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - chroma;
    let rgb: [number, number, number];
    if (h < 60) rgb = [chroma, x, 0];
    else if (h < 120) rgb = [x, chroma, 0];
    else if (h < 180) rgb = [0, chroma, x];
    else if (h < 240) rgb = [0, x, chroma];
    else if (h < 300) rgb = [x, 0, chroma];
    else rgb = [chroma, 0, x];
    return [
      Math.round((rgb[0] + m) * 255),
      Math.round((rgb[1] + m) * 255),
      Math.round((rgb[2] + m) * 255),
    ];
  }
  return null;
}

/** Scala un colore verso il nero (factor 0..1: 0 = invariato, 1 = nero). */
function mixWithBlack(color: string, factor: number): string {
  const rgb = toRgb(color);
  if (!rgb) return "#121212";
  const [r, g, b] = rgb;
  const nr = Math.round(r * (1 - factor));
  const ng = Math.round(g * (1 - factor));
  const nb = Math.round(b * (1 - factor));
  return `rgb(${nr} ${ng} ${nb})`;
}

/** Scala un colore verso il bianco (factor 0..1: 1 = bianco). */
function mixWithWhite(color: string, factor: number): string {
  const rgb = toRgb(color);
  if (!rgb) return "#ffffff";
  const [r, g, b] = rgb;
  const nr = Math.round(r + (255 - r) * factor);
  const ng = Math.round(g + (255 - g) * factor);
  const nb = Math.round(b + (255 - b) * factor);
  return `rgb(${nr} ${ng} ${nb})`;
}

export function CourseCardBackground({
  coverUrl,
  subjectColor,
  opacity = 0.4,
}: CourseCardBackgroundProps) {
  const hasImage = !!coverUrl;
  const color = subjectColor || "#4A2E37"; // fallback caldo elegante

  // Base meno scurita (0.5): il colore materia resta ben visibile, mai nero
  const baseColor = mixWithBlack(color, 0.5);
  // Orbs più vivaci: schiariti meno, opacità alte
  const orbMain = mixWithWhite(color, 0.1);
  const orbSecondary = mixWithWhite(color, 0.3);

  return (
    <>
      {/* 1) BASE CROMATICA — tono scuro derivato dalla materia */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundColor: baseColor }}
      />

      {/* 4) OVERLAY leggero per la leggibilità (testi/bottoni) */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/70"
      />

      {/* LAYER 0 — immagine sfocata (sopra l'overlay, con dissolvenza) */}
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

      {/* Ombra leggera sopra l'immagine per il testo bianco */}
      {hasImage && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
          aria-hidden
        />
      )}

      {/* 2) ORB PRINCIPALE — alto destra (dietro il menu ⋯).
          DOPO overlay e immagine: sempre visibile sopra tutto (tranne contenuto z-10) */}
      <div
        aria-hidden
        className="absolute -top-10 -right-10 w-72 h-72 rounded-full opacity-80 blur-2xl"
        style={{ backgroundColor: orbMain }}
      />

      {/* 3) ORB SECONDARIO — alto sinistra (tridimensionalità) */}
      <div
        aria-hidden
        className="absolute top-4 left-6 w-48 h-48 rounded-full opacity-50 blur-3xl"
        style={{ backgroundColor: orbSecondary }}
      />
    </>
  );
}
