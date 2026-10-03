/**
 * 🎛️ PERCORSI 2.0 — IL CATALOGO DEI WIDGET INTERATTIVI.
 *
 * Le simulazioni sono costruite a mano da noi (nessun costo API): l'AI si
 * limita a SCEGLIERE un widget dal catalogo e a configurarlo con un piccolo
 * JSON dentro la slide. Questo modulo è la fonte di verità condivisa:
 *   - l'app la usa per validare il bigliettino dell'AI (sanitizeWidgetSpec);
 *   - il prompt del motore scientifico elenca gli stessi tipi e parametri
 *     (collaudo incrociato nei test, così i due elenchi non divergono mai).
 *
 * Regola d'oro: valori fuori scala vengono riportati dentro i limiti,
 * chiavi sconosciute buttate, tipo sconosciuto → niente widget (la slide
 * resta leggibilissima). L'AI non può rompere la lezione.
 */

export type WidgetType =
  | "parabola"
  | "retta"
  | "proiettile"
  | "piano-inclinato"
  | "ph"
  | "gas"
  | "mercato"
  | "codice";

export interface WidgetParamDef {
  key: string;
  label: { it: string; en: string };
  min: number;
  max: number;
  step: number;
  default: number;
  /** Unità di misura mostrata accanto al valore (es. "m/s"). */
  unit?: string;
}

export interface WidgetDef {
  type: WidgetType;
  title: { it: string; en: string };
  /** Parametri (cursori) configurabili dall'AI. */
  params: WidgetParamDef[];
  /** Disponibile per le lezioni delle materie scientifiche. */
  scientific: boolean;
}

export const WIDGET_REGISTRY: WidgetDef[] = [
  {
    type: "parabola",
    title: { it: "Parabola", en: "Parabola" },
    scientific: true,
    params: [
      { key: "a", label: { it: "a (apertura)", en: "a (width)" }, min: -5, max: 5, step: 0.1, default: 1 },
      { key: "b", label: { it: "b", en: "b" }, min: -10, max: 10, step: 0.1, default: 0 },
      { key: "c", label: { it: "c", en: "c" }, min: -10, max: 10, step: 0.1, default: -3 },
    ],
  },
  {
    type: "retta",
    title: { it: "Retta", en: "Line" },
    scientific: true,
    params: [
      { key: "m", label: { it: "m (pendenza)", en: "m (slope)" }, min: -5, max: 5, step: 0.1, default: 1 },
      { key: "q", label: { it: "q (intercetta)", en: "q (intercept)" }, min: -10, max: 10, step: 0.1, default: 2 },
    ],
  },
  {
    type: "proiettile",
    title: { it: "Moto del proiettile", en: "Projectile motion" },
    scientific: true,
    params: [
      { key: "v0", label: { it: "v₀ (velocità)", en: "v₀ (speed)" }, min: 1, max: 50, step: 0.5, default: 20, unit: "m/s" },
      { key: "angolo", label: { it: "angolo", en: "angle" }, min: 5, max: 85, step: 1, default: 45, unit: "°" },
    ],
  },
  {
    type: "piano-inclinato",
    title: { it: "Forze sul piano inclinato", en: "Forces on an inclined plane" },
    scientific: true,
    params: [
      { key: "angolo", label: { it: "angolo", en: "angle" }, min: 0, max: 60, step: 1, default: 30, unit: "°" },
      { key: "massa", label: { it: "massa", en: "mass" }, min: 0.1, max: 20, step: 0.1, default: 5, unit: "kg" },
      { key: "attrito", label: { it: "attrito μ", en: "friction μ" }, min: 0, max: 1, step: 0.05, default: 0.2 },
    ],
  },
  {
    type: "ph",
    title: { it: "Scala pH", en: "pH scale" },
    scientific: true,
    params: [
      { key: "ph", label: { it: "pH", en: "pH" }, min: 0, max: 14, step: 0.1, default: 3 },
    ],
  },
  {
    type: "gas",
    title: { it: "Legge dei gas", en: "Gas law" },
    scientific: true,
    params: [
      { key: "n", label: { it: "n (moli)", en: "n (moles)" }, min: 0.1, max: 5, step: 0.1, default: 1, unit: "mol" },
      { key: "T", label: { it: "T (temperatura)", en: "T (temperature)" }, min: 100, max: 600, step: 10, default: 300, unit: "K" },
      { key: "V", label: { it: "V (volume)", en: "V (volume)" }, min: 1, max: 50, step: 1, default: 10, unit: "L" },
    ],
  },
  {
    type: "mercato",
    title: { it: "Offerta e domanda", en: "Supply and demand" },
    scientific: true,
    params: [
      { key: "domanda", label: { it: "domanda", en: "demand" }, min: 1, max: 20, step: 0.5, default: 12 },
      { key: "offerta", label: { it: "offerta", en: "supply" }, min: 1, max: 20, step: 0.5, default: 4 },
    ],
  },
  {
    type: "codice",
    title: { it: "Esecutore di codice", en: "Code runner" },
    scientific: false,
    params: [],
  },
];

export const WIDGET_MAP: Record<WidgetType, WidgetDef> = Object.fromEntries(
  WIDGET_REGISTRY.map((w) => [w.type, w]),
) as Record<WidgetType, WidgetDef>;

export interface WidgetSpec {
  type: WidgetType;
  /** Valori dei cursori (già validati e dentro i limiti). */
  params: Record<string, number>;
  /** Breve didascalia dell'AI (max 140 caratteri). */
  caption?: string;
  /** Solo per "codice": il programma da far eseguire (max 2000 caratteri). */
  code?: string;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Trasforma il bigliettino dell'AI in un piano sicuro:
 *  - accetta i parametri in forma piatta {"type":"parabola","a":1} o annidata
 *    {"type":"parabola","params":{"a":1}};
 *  - valori non numerici o mancanti → default del catalogo;
 *  - valori fuori scala → riportati dentro i limiti;
 *  - tipo sconosciuto o input spazzatura → null (niente widget, slide illesa).
 */
export function sanitizeWidgetSpec(raw: unknown): WidgetSpec | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;

  const typeRaw = typeof o.type === "string" ? o.type.trim() : "";
  if (!Object.prototype.hasOwnProperty.call(WIDGET_MAP, typeRaw)) return null;
  const def = WIDGET_MAP[typeRaw as WidgetType];

  const nested = (o.params && typeof o.params === "object" && !Array.isArray(o.params))
    ? (o.params as Record<string, unknown>)
    : null;

  const params: Record<string, number> = {};
  for (const p of def.params) {
    const v = nested ? nested[p.key] : o[p.key];
    params[p.key] = typeof v === "number" && Number.isFinite(v)
      ? clamp(v, p.min, p.max)
      : p.default;
  }

  const spec: WidgetSpec = { type: def.type, params };

  if (typeof o.caption === "string" && o.caption.trim()) {
    spec.caption = o.caption.trim().slice(0, 140);
  }
  if (def.type === "codice" && typeof o.code === "string" && o.code.trim()) {
    spec.code = o.code.slice(0, 2000);
  }
  return spec;
}

/** Il valore di un cursore: dal piano validato, col default come rete di sicurezza. */
export function widgetParamValue(spec: WidgetSpec, key: string): number {
  const def = WIDGET_MAP[spec.type];
  const p = def?.params.find((d) => d.key === key);
  const v = spec.params?.[key];
  if (typeof v === "number" && Number.isFinite(v) && p) return clamp(v, p.min, p.max);
  return p?.default ?? 0;
}

/** Il titolo del widget nella lingua della lezione. */
export function widgetTitle(type: WidgetType, lang: string): string {
  const def = WIDGET_MAP[type];
  if (!def) return "";
  return lang === "en" ? def.title.en : def.title.it;
}

/** L'etichetta di un cursore nella lingua della lezione. */
export function widgetParamLabel(def: WidgetParamDef, lang: string): string {
  return lang === "en" ? def.label.en : def.label.it;
}
