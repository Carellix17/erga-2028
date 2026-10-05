/**
 * courseIdentity — V2-01 (DESIGN.md 2.1 §4, «Carta contemporanea»).
 *
 * UNICO punto di risoluzione corso → materia → palette/copertina. Lo stesso
 * corso riceve la stessa identità in Home, Studio, selettore e modulo,
 * personalizzazioni del colore comprese (via `customKey`, che già oggi
 * vince sul rilevamento automatico del nome).
 *
 * Che cosa risolve:
 *  · accent     — il colore materia (stringa hsl() di subjectColors);
 *  · family     — «light» (campo pastello, testo inchiostro) o
 *                 «deep» (campo profondo, testo carta), assegnato alla
 *                 materia in modo STABILE per avere copertine riconoscibili
 *                 e non tutte uguali (§4: non desaturare fino al beige);
 *  · field      — colore del campo dominante della copertina, ADATTATO
 *                 finché il contrasto con il proprio inchiostro è ≥ 4,5:1
 *                 (WCAG AA, testo ordinario). Nessun abbinamento a occhio;
 *  · ink/onInk  — inchiostro del testo e suo inverso, per la copertina;
 *  · layout     — variante della composizione astratta (0–2), stabile per
 *                 corso, così la stessa materia non genera copertine
 *                 ballerine tra viste.
 *
 * La copertina non dipende dal tema chiaro/scuro: il campo è la materia,
 * di giorno come di notte (la variante notte verificata riguarda il velo
 * satinato e i bordi, non l'inversione automatica del campo).
 */

import { resolveSubjectColor } from "@/lib/subjectColors";

export type CoverFamily = "light" | "deep";

export interface CourseCover {
  /** Chiave materia (es. "storia") o "default". */
  subjectKey: string;
  /** Colore materia, stringa hsl(). */
  accent: string;
  /** Famiglia del campo: pastello chiaro o profondo. */
  family: CoverFamily;
  /** Colore del campo dominante (hex) — contrasto ≥ 4,5:1 con `ink`. */
  field: string;
  /** Tono secondario della composizione (hex). */
  tone: string;
  /** Inchiostro del testo sulla copertina (hex). */
  ink: string;
  /** Inchiostro secondario sulla copertina (hex, stessa famiglia di ink). */
  inkSoft: string;
  /** Colore del testo sull'inchiostro (per riempimenti pieni). */
  onInk: string;
  /** Variante stabile della composizione (0 | 1 | 2). */
  layout: 0 | 1 | 2;
  /** Canali "r g b" di ink per le utility --contrast-ink esistenti. */
  inkChannels: string;
  /** Canali "r g b" di onInk per --contrast-surface. */
  onInkChannels: string;
}

/* ── Colori di sistema (DESIGN.md 2.1 §3, valori hex fissi) ── */
const PAPER = "#FFFEF9"; // carta
const INK = "#252623"; // inchiostro
const DARK = "#22211F"; // tavolo notte: base dei campi profondi

/* ── Famiglia assegnata alle materie (stabile, bilanciata) ─────────────
   Metà materie in campo chiaro e metà in campo profondo, scelte per il
   carattere del colore: tinte che reggono un campo profondo (terracotta,
   bosco, crepuscolo, oliva, grafite, violetto) vanno «deep»; le altre
   restano pastello. Il fallback senza materia è un chiaro caldo. */
const SUBJECT_FAMILY: Record<string, CoverFamily> = {
  storia: "deep",
  matematica: "light",
  economia: "light",
  scienze: "deep",
  letteratura: "light",
  filosofia: "deep",
  fisica: "light",
  informatica: "deep",
  arte: "light",
  geografia: "deep",
  diritto: "deep",
  lingue: "light",
};

/* ── Conversioni e misura (le stesse regole che usano i test) ── */

function hexToRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function hslToHex(color: string): string | null {
  const m = color.trim().match(/^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/i);
  if (!m) {
    const rgb = hexToRgb(color);
    if (!rgb) return null;
    return rgb.map((c) => c.toString(16).padStart(2, "0")).join("").replace(/^/, "#");
  }
  const h = ((Number(m[1]) % 360) + 360) % 360;
  const s = Math.min(100, Number(m[2])) / 100;
  const l = Math.min(100, Number(m[3])) / 100;
  const chroma = s * Math.min(l, 1 - l);
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m2 = l - chroma;
  let rgb: [number, number, number];
  if (h < 60) rgb = [chroma, x, 0];
  else if (h < 120) rgb = [x, chroma, 0];
  else if (h < 180) rgb = [0, chroma, x];
  else if (h < 240) rgb = [0, x, chroma];
  else if (h < 300) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  const to = (v: number) => Math.round((v + m2) * 255).toString(16).padStart(2, "0");
  return `#${to(rgb[0])}${to(rgb[1])}${to(rgb[2])}`;
}

function mix(a: string, b: string, weightOfB: number): string {
  const ca = hexToRgb(a) ?? [255, 254, 249];
  const cb = hexToRgb(b) ?? [255, 254, 249];
  const out = ca.map((v, i) => Math.round(v * (1 - weightOfB) + cb[i] * weightOfB));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string): number {
  const c = hexToRgb(hex) ?? [255, 255, 255];
  const lin = c.map((v) => {
    const ch = v / 255;
    return ch <= 0.04045 ? ch / 12.92 : ((ch + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Rapporto di contrasto WCAG tra due hex. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/* ── Campi con contrasto GARANTITO ──
   light: parte da un 24% di materia sulla carta e schiarisce finché
   l'inchiostro non raggiunge 4,5:1 (i pastelli restano visibili: il peso
   non scende sotto l'8%).
   deep: 72% materia verso il tavolo notte; se il contrasto con la carta
   mancasse (non accade con le materie attuali), scurisce finché regge. */
const MIN_CONTRAST = 4.5;

function lightField(accentHex: string): string {
  let weight = 0.24;
  let field = mix(PAPER, accentHex, weight);
  while (contrastRatio(field, INK) < MIN_CONTRAST && weight > 0.08) {
    weight -= 0.03;
    field = mix(PAPER, accentHex, weight);
  }
  return field;
}

function deepField(accentHex: string): string {
  let weight = 0.72;
  let field = mix(accentHex, DARK, weight);
  while (contrastRatio(field, PAPER) < MIN_CONTRAST && weight < 0.92) {
    weight += 0.05;
    field = mix(accentHex, DARK, weight);
  }
  return field;
}

/** Hash stabile (stesso corso → stessa variante di composizione). */
function stableHash(name: string): number {
  let hash = 0;
  const key = name.toLowerCase().trim();
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function channels(hex: string): string {
  const c = hexToRgb(hex) ?? [255, 254, 249];
  return `${c[0]} ${c[1]} ${c[2]}`;
}

/**
 * Risolve l'identità di copertina di un corso.
 * @param courseName titolo/nome file del corso (il rilevamento materia legge qui)
 * @param customKey chiave materia scelta dall'utente, se presente (vince)
 */
export function resolveCourseCover(courseName: string, customKey?: string | null): CourseCover {
  const subject = resolveSubjectColor(courseName || "", customKey ?? undefined);
  const accentHex = hslToHex(subject.accent) ?? "#8A8C7E";
  const family = SUBJECT_FAMILY[subject.key] ?? "light";

  const field = family === "deep" ? deepField(accentHex) : lightField(accentHex);
  const ink = family === "deep" ? PAPER : INK;
  const onInk = family === "deep" ? DARK : PAPER;
  // Tono secondario della composizione: la materia, calibrata sulla famiglia.
  const tone = family === "deep" ? mix(accentHex, PAPER, 0.28) : mix(PAPER, accentHex, 0.5);

  return {
    subjectKey: subject.key,
    accent: subject.accent,
    family,
    field,
    tone,
    ink,
    inkSoft: family === "deep" ? mix(PAPER, field, 0.18) : mix(INK, field, 0.22),
    onInk,
    layout: (stableHash(`${subject.key}:${courseName}`) % 3) as 0 | 1 | 2,
    inkChannels: channels(ink),
    onInkChannels: channels(onInk),
  };
}

/**
 * Variabili CSS da stendere sul contenitore della copertina perché le
 * utility di testo esistenti (text-contrast…) lavorino con l'inchiostro
 * della famiglia giusta — senza lo script di auto-contrasto.
 */
export function courseCoverVars(courseName: string, customKey?: string | null) {
  const cover = resolveCourseCover(courseName, customKey);
  return {
    cover,
    style: {
      "--contrast-ink": cover.inkChannels,
      "--contrast-surface": cover.onInkChannels,
    } as React.CSSProperties,
  };
}
