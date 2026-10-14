/**
 * Palette v3 per materie scolastiche e routine nel Piano.
 * Mantiene il matching per nome e i colori scelti dall'utente; cambiano solo
 * gli accenti visivi e i neutri del testo secondo DESIGN.md.
 */

export interface TintStyle {
  backgroundColor: string;
  /** Bordo 1px nella tinta materia, o nel neutro quando è borderless. */
  border: string;
  color: string;
  /** Colore pieno per pallini e legenda. */
  dot: string;
}

const TEXT_LIGHT = "#FFFBF4";
const TEXT_DARK = "#11120D";

/** Materie scolastiche → accenti già usati dal Piano; l'ordine è funzionale. */
const SUBJECT_HEX: { hex: string; keys: string[] }[] = [
  { hex: "#2563EB", keys: ["matematic", "math", "geometria", "algebra", "analisi"] },
  { hex: "#DC2626", keys: ["italian", "letteratura", "latino", "greco"] },
  // La corrispondenza più specifica precede "scienze".
  { hex: "#EAB308", keys: ["motorie", "sport", "educazione fisica", "ginnastica"] },
  { hex: "#059669", keys: ["scienz", "biologi", "chimic", "natur"] },
  { hex: "#D97706", keys: ["storia", "storico"] },
  { hex: "#65A30D", keys: ["geografia", "territorio"] },
  { hex: "#0891B2", keys: ["fisic", "astronomia"] },
  { hex: "#7C3AED", keys: ["filosof", "pedagogia"] },
  { hex: "#EA580C", keys: ["inglese", "lingu", "francese", "spagnolo", "tedesco"] },
  { hex: "#C026D3", keys: ["arte", "disegno"] },
];

export const DEFAULT_SUBJECT_HEX = "#94A3B8";

/** Converte un colore CSS (#hex o `hsl(h s% l%)`) in #RRGGBB, o null. */
export function cssColorToHex(color?: string | null): string | null {
  if (!color) return null;
  const value = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value.slice(1).split("").map((char) => char + char).join("").toUpperCase()}`;
  }
  const match = value.match(/^hsl\(\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(\d+(?:\.\d+)?)%\s*[ ,]\s*(\d+(?:\.\d+)?)%\s*\)$/i);
  if (!match) return null;

  const hue = ((Number(match[1]) % 360) + 360) % 360;
  const saturation = Math.min(100, Number(match[2])) / 100;
  const lightness = Math.min(100, Number(match[3])) / 100;
  const chroma = saturation * Math.min(lightness, 1 - lightness);
  const channel = (offset: number) => {
    const segment = (offset + hue / 30) % 12;
    const value = lightness - chroma * Math.max(-1, Math.min(segment - 3, 9 - segment, 1));
    return Math.round(value * 255).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}

/** Accento di materia (o personalizzato), confrontando nomi senza accenti. */
export function subjectHex(subjectName?: string | null, customColor?: string | null): string {
  const custom = cssColorToHex(customColor);
  if (custom) return custom;
  if (!subjectName) return DEFAULT_SUBJECT_HEX;
  const normalized = subjectName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const { hex, keys } of SUBJECT_HEX) {
    if (keys.some((key) => normalized.includes(key))) return hex;
  }
  return DEFAULT_SUBJECT_HEX;
}

/** Colori routine ufficiali v3. */
export const ROUTINE_HEX: Record<string, string> = {
  sleep: "#4F46E5",
  school: "#64748B",
  meal: "#EF4444",
  other: "#0D9488",
};

/** Stile "tinted surface" per gli eventi del calendario, senza alterare i dati. */
export function tintStyle(hex: string, opts?: { alpha?: number; borderless?: boolean; dark?: boolean }): TintStyle {
  const alpha = opts?.alpha ?? 0.18;
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  const rgb = `${red} ${green} ${blue}`;
  const edge = opts?.dark ? 0.55 : 0.42;
  return {
    backgroundColor: `rgba(${rgb} / ${alpha})`,
    border: opts?.borderless ? "1px solid rgba(148 163 184 / 0.28)" : `1px solid rgba(${rgb} / ${edge})`,
    color: opts?.dark ? TEXT_LIGHT : TEXT_DARK,
    dot: hex,
  };
}

export function subjectTint(subjectName?: string | null, dark?: boolean, customColor?: string | null): TintStyle {
  return tintStyle(subjectHex(subjectName, customColor), { dark });
}

export function routineTint(kind: string, dark?: boolean): TintStyle {
  return tintStyle(ROUTINE_HEX[kind] ?? ROUTINE_HEX.other, { dark });
}
