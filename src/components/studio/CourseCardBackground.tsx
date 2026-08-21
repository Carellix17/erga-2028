interface CourseCardBackgroundProps {
  /** URL dell'immagine di copertina (null → solo Ambient Glow con Orbs). */
  coverUrl: string | null;
  /** Colore materia (HEX o HSL): guida base, orbs e bagliori. */
  subjectColor: string;
  /** Opacità dell'immagine (default 0.4). */
  opacity?: number;
  /** Il nuovo gradiente è intenzionalmente limitato alle card corso di Studio. */
  variant?: "default" | "studio";
}

/**
 * 🖼️ P24/P25 — AMBIENT GLOW con ORBS (riferimento visivo Capo).
 *
 * La variante `default` conserva esattamente lo sfondo P24 usato dalla Home.
 * La variante `studio` applica la struttura approvata da image.png soltanto
 * alle card corso di Studio:
 *  1) BASE CROMATICA: tre tappe derivate dal colore materia. La metà alta
 *     conserva la tinta; il carbone arriva gradualmente soltanto in basso.
 *  2) COVER opzionale: immagine sfocata e fusa nel colore della materia.
 *  3) DISCESA: velo verticale leggero al centro e profondo sul bordo basso.
 *  4) ORB PRINCIPALE: grande luce in alto a destra, parzialmente fuori card.
 *  5) ORB SECONDARIO: luce più piccola in alto a sinistra; tra le due resta
 *     la valle cromatica visibile nel riferimento.
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
  variant = "default",
}: CourseCardBackgroundProps) {
  const hasImage = !!coverUrl;
  const color = subjectColor || "#4A2E37"; // fallback caldo elegante

  if (variant === "default") {
    // P24 invariato: questa è la resa condivisa con la Home.
    const baseColor = mixWithBlack(color, 0.5);
    const orbMain = mixWithWhite(color, 0.1);
    const orbSecondary = mixWithWhite(color, 0.3);

    return (
      <>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundColor: baseColor }}
        />

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-transparent via-scrim/20 to-scrim/70"
        />

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

        {hasImage && (
          <div
            className="absolute inset-0 bg-gradient-to-t from-scrim/60 via-transparent to-transparent"
            aria-hidden
          />
        )}

        <div
          aria-hidden
          className="absolute -top-10 -right-10 w-72 h-72 rounded-full opacity-80 blur-2xl"
          style={{ backgroundColor: orbMain }}
        />

        <div
          aria-hidden
          className="absolute top-4 left-6 w-48 h-48 rounded-full opacity-50 blur-3xl"
          style={{ backgroundColor: orbSecondary }}
        />
      </>
    );
  }

  // 🌗 P25 — scala misurata sul riferimento approvato:
  // la materia resta viva per circa due terzi della card e diventa carbone
  // soltanto in basso. Prima la base partiva già al 50% di nero e l'overlay
  // arrivava al 70%: il risultato era piatto e troppo scuro (image2).
  const baseTop = mixWithBlack(color, 0.34);
  const baseMiddle = mixWithBlack(color, 0.45);
  const baseBottom = mixWithBlack(color, 0.57);

  // Due sorgenti distinte: una grande in alto a destra e una più piccola a
  // sinistra. Il centro rimane leggermente più scuro, come in image.png.
  const orbMain = mixWithWhite(color, 0.5);
  const orbSecondary = mixWithWhite(color, 0.62);

  return (
    <>
      {/* 1) BASE CROMATICA — colore materia vivo sopra, carbone solo in fondo. */}
      <div
        aria-hidden
        data-course-card-layer="base"
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, ${baseTop} 0%, ${baseTop} 34%, ${baseMiddle} 68%, ${baseBottom} 100%)`,
        }}
      />

      {/* 2) COVER — resta opzionale e sfocata, senza cambiare la geometria. */}
      {hasImage && (
        <div
          aria-hidden
          data-course-card-layer="cover"
          className="absolute inset-0 overflow-hidden rounded-[inherit] animate-fade-in"
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

      {/* 3) DISCESA — delicata al centro, più profonda soltanto sul bordo basso.
          È sopra l'eventuale cover, quindi il contrasto resta stabile. */}
      <div
        aria-hidden
        data-course-card-layer="shade"
        className="absolute inset-0 bg-gradient-to-b from-transparent via-scrim/[0.08] to-scrim/[0.55]"
      />

      {/* 4) ALONE PRINCIPALE — spostato davvero in alto a destra: non lava
          l'intera card e lascia visibile la valle cromatica centrale. */}
      <div
        aria-hidden
        data-course-card-layer="orb-main"
        className="absolute -top-28 -right-28 w-72 h-72 rounded-full blur-[6px]"
        style={{ backgroundColor: orbMain, opacity: 0.42 }}
      />

      {/* 5) ALONE SECONDARIO — luce più piccola e morbida in alto a sinistra. */}
      <div
        aria-hidden
        data-course-card-layer="orb-secondary"
        className="absolute -top-6 -left-[88px] w-48 h-48 rounded-full blur-[18px]"
        style={{ backgroundColor: orbSecondary, opacity: 0.38 }}
      />
    </>
  );
}
