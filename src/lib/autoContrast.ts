/* ═══════════════════════════════════════════════════════════════
   P28 — CONTRASTO AUTOMATICO SUI BLOCCHI COLORATI

   Problema: i blocchi "ambientati" (card corso, lezione da riprendere
   in Home, eroe del percorso in Studio) hanno uno sfondo che dipende
   dal colore della materia e resta scuro in ENTRAMBI i temi, mentre il
   testo usava token legati al tema (`text-inverse-on-surface`): nel
   tema scuro diventava NERO su fondo marrone/nero → illeggibile.

   Soluzione: uno script generico che guarda il fondo EFFETTIVO di ogni
   blocco marcato con `data-auto-contrast` e sceglie l'inchiostro
   (bianco o quasi-nero) col miglior rapporto di contrasto WCAG.
   L'inchiostro scelto viene scritto sul blocco come variabile CSS:

     --contrast-ink      canali "r g b" del testo a contrasto
     --contrast-surface  canali "r g b" del fondo rilevato
     data-contrast-tone  "light-text" | "dark-text" (per regole CSS)
     data-contrast-ratio rapporto WCAG misurato (debug/test)

   Da dove legge il fondo (in ordine):
     1. i layer marcati `data-contrast-layer` dentro il blocco
        (CourseCardBackground li dichiara: base cromatica + veli/scrim),
        compositati dal basso verso l'alto con la loro opacità — i
        gradienti CSS vengono mediati stop per stop;
     2. il background-color/gradient del blocco e dei suoi antenati;
     3. ripiego: bianco (la pagina di giorno).

   Gli aloni decorativi parziali (le "orb" luminose, sfocate e in parte
   fuori card) NON sono marcati come layer: coprono una frazione minima
   della superficie e non devono spostare la scelta dell'inchiostro.

   Si aggiorna da solo: un MutationObserver riesamina i blocchi quando
   cambiano DOM, classi o stili inline (es. cambio corso → nuovo colore
   materia, cambio tema → nuovi token). Le classi di supporto vivono in
   index.css: .text-contrast, .text-contrast-secondary, .bg-contrast…
   ═══════════════════════════════════════════════════════════════ */

/** Colore con canali 0–255 e alfa 0–1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
/** Quasi-nero usato come inchiostro scuro (coerente con getAccentForeground). */
const INK_DARK: Rgba = { r: 17, g: 17, b: 17, a: 1 };
/**
 * P30 — Inchiostro CHIARO: off-white #F2F0EF, non bianco puro.
 * Attenzione: `WHITE` qui sopra resta bianco vero perché serve a due cose
 * diverse (la parola chiave CSS "white" e il fondo di ripiego della pagina):
 * cambia solo il colore con cui SCRIVIAMO sui blocchi scuri.
 */
const INK_LIGHT: Rgba = { r: 242, g: 240, b: 239, a: 1 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundChannel = (value: number) => Math.round(clamp(value, 0, 255));

/* ────────────────────────── parsing ────────────────────────── */

/** Converte HSL (h in gradi, s/l 0–1) in canali RGB 0–255. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = (((h % 360) + 360) % 360) / 360;
  const sat = clamp(s, 0, 1);
  const lig = clamp(l, 0, 1);
  if (sat === 0) {
    const v = lig * 255;
    return [v, v, v];
  }
  const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat;
  const p = 2 * lig - q;
  const channel = (t0: number) => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [channel(hue + 1 / 3) * 255, channel(hue) * 255, channel(hue - 1 / 3) * 255];
}

/** Divide gli argomenti di una funzione colore: supporta virgole, spazi e "/". */
function splitColorArgs(body: string): string[] {
  // "18 45% 45% / 0.5" → ["18", "45%", "45%", "0.5"]
  return body
    .replace(/\//g, " / ")
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token !== "/");
}

/** Legge un canale RGB scritto in % o in valore assoluto. */
function rgbChannel(token: string): number | null {
  if (token.endsWith("%")) {
    const pct = Number(token.slice(0, -1));
    return Number.isFinite(pct) ? clamp(pct, 0, 100) * 2.55 : null;
  }
  const n = Number(token.replace(/deg$/, ""));
  return Number.isFinite(n) ? clamp(n, 0, 255) : null;
}

/** Legge l'alfa: numero 0–1, percentuale o assente. */
function alphaChannel(token: string | undefined): number {
  if (token === undefined) return 1;
  const pct = token.endsWith("%");
  const n = Number(token.replace(/%$/, ""));
  if (!Number.isFinite(n)) return 1;
  return clamp(pct ? n / 100 : n, 0, 1);
}

/**
 * Riconosce un colore CSS scritto come #hex, rgb()/rgba(), hsl()/hsla()
 * (sintassi sia vecchia con virgole sia moderna con spazi e slash),
 * "transparent", "white", "black". Restituisce null se non capisce.
 */
export function parseCssColor(value: string | null | undefined): Rgba | null {
  if (!value) return null;
  const c = value.trim().toLowerCase();
  if (!c) return null;

  if (c === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (c === "white") return { ...WHITE };
  if (c === "black") return { r: 0, g: 0, b: 0, a: 1 };

  if (c.startsWith("#")) {
    let hex = c.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split("").map((ch) => ch + ch).join("");
    }
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/.test(hex)) return null;
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
    };
  }

  const fn = c.match(/^(rgba?|hsla?)\((.*)\)$/);
  if (!fn) return null;
  const args = splitColorArgs(fn[2]).filter((t) => t !== ",");
  if (args.length < 3) return null;

  if (fn[1].startsWith("rgb")) {
    const r = rgbChannel(args[0]);
    const g = rgbChannel(args[1]);
    const b = rgbChannel(args[2]);
    if (r === null || g === null || b === null) return null;
    return { r, g, b, a: alphaChannel(args[3]) };
  }

  // hsl/hsla
  const hue = Number(args[0].replace(/deg$/, ""));
  if (!Number.isFinite(hue)) return null;
  const s = Number(args[1].replace(/%$/, ""));
  const l = Number(args[2].replace(/%$/, ""));
  if (!Number.isFinite(s) || !Number.isFinite(l)) return null;
  const [r, g, b] = hslToRgb(hue, s / 100, l / 100);
  return { r, g, b, a: alphaChannel(args[3]) };
}

/* ────────────────────── WCAG luminanza/contrasto ────────────────────── */

/** Luminanza relativa WCAG 2.x dei canali (l'alfa va compositata prima). */
export function relativeLuminance({ r, g, b }: Rgba): number {
  const linear = (channel: number) => {
    const c = clamp(channel, 0, 255) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Rapporto di contrasto WCAG tra due colori opachi (1..21). */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [bright, dark] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (bright + 0.05) / (dark + 0.05);
}

export type ContrastTone = "light-text" | "dark-text";

export interface ContrastPick {
  /** Canali RGB spazio-separati, pronti per `rgb(var(--contrast-ink))`. */
  channels: string;
  tone: ContrastTone;
  /** Rapporto WCAG dell'inchiostro scelto sul fondo dato. */
  ratio: number;
}

/**
 * Sceglie tra off-white (#F2F0EF) e quasi-nero quello che contrasta di più col
 * fondo. A parità vince l'off-white: i blocchi ambientati di Erga nascono scuri.
 */
export function pickContrastInk(background: Rgba): ContrastPick {
  const bg = { ...background, a: 1 };
  const lightRatio = contrastRatio(INK_LIGHT, bg);
  const darkRatio = contrastRatio(INK_DARK, bg);
  const useLight = lightRatio >= darkRatio;
  return {
    channels: useLight ? "242 240 239" : "17 17 17",
    tone: useLight ? "light-text" : "dark-text",
    ratio: Math.round((useLight ? lightRatio : darkRatio) * 100) / 100,
  };
}

/* ───────────────────── compositing e gradienti ───────────────────── */

/** Alpha compositing "source over destination" (Porter-Duff). */
export function compositeOver(top: Rgba, bottom: Rgba): Rgba {
  const aTop = clamp(top.a, 0, 1);
  const aBottom = clamp(bottom.a, 0, 1);
  const outA = aTop + aBottom * (1 - aTop);
  if (outA <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (cTop: number, cBottom: number) =>
    (cTop * aTop + cBottom * aBottom * (1 - aTop)) / outA;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: outA };
}

interface GradientStop {
  color: Rgba;
  pos: number | null;
}

/**
 * Media pesata dei color-stop di un background-image a gradiente.
 * Serve a stimare "di che colore è" un velo/scrim a gradiente senza
 * leggere pixel: gli stop con posizione nota pesano per l'estensione
 * che coprono (media trapezoidale); se mancano le posizioni, uniforme.
 */
export function averageCssGradient(backgroundImage: string): Rgba | null {
  if (!backgroundImage.includes("-gradient")) return null;

  const stopRe = /((?:rgba?|hsla?)\([^()]*\))\s*(?:(-?\d+(?:\.\d+)?)%)?/gi;
  const stops: GradientStop[] = [];
  let match: RegExpExecArray | null;
  while ((match = stopRe.exec(backgroundImage)) !== null) {
    const color = parseCssColor(match[1]);
    if (!color) continue;
    stops.push({ color, pos: match[2] !== undefined ? Number(match[2]) : null });
  }
  if (stops.length === 0) return null;

  // Segmenti [inizio, colore, peso]: il contributo di ogni tratto.
  const segments: { color: Rgba; weight: number }[] = [];
  const positioned = stops.length > 1 && stops.every((s) => s.pos !== null);
  if (positioned) {
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (first.pos! > 0) segments.push({ color: first.color, weight: first.pos! });
    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i];
      const to = stops[i + 1];
      const weight = to.pos! - from.pos!;
      if (weight <= 0) continue;
      // Colore medio del tratto: mix premoltiplicato a metà dei due stop.
      const aFrom = from.color.a;
      const aTo = to.color.a;
      const wA = aFrom + aTo;
      const mixed: Rgba =
        wA <= 0
          ? { r: 0, g: 0, b: 0, a: 0 }
          : {
              r: (from.color.r * aFrom + to.color.r * aTo) / wA,
              g: (from.color.g * aFrom + to.color.g * aTo) / wA,
              b: (from.color.b * aFrom + to.color.b * aTo) / wA,
              a: wA / 2,
            };
      segments.push({ color: mixed, weight });
    }
    if (last.pos! < 100) segments.push({ color: last.color, weight: 100 - last.pos! });
  } else {
    stops.forEach((s) => segments.push({ color: s.color, weight: 1 }));
  }

  let totalWeight = 0;
  let accA = 0;
  let accR = 0;
  let accG = 0;
  let accB = 0;
  segments.forEach(({ color, weight }) => {
    const w = weight * color.a;
    totalWeight += weight;
    accA += weight * color.a;
    accR += w * color.r;
    accG += w * color.g;
    accB += w * color.b;
  });
  if (totalWeight <= 0 || accA <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: roundChannel(accR / accA),
    g: roundChannel(accG / accA),
    b: roundChannel(accB / accA),
    a: clamp(accA / totalWeight, 0, 1),
  };
}

/* ─────────────────── risoluzione del fondo del blocco ─────────────────── */

function readElementColor(el: Element, win: Window): Rgba | null {
  const cs = win.getComputedStyle(el);
  let color: Rgba | null = null;
  const image = cs.backgroundImage;
  if (image && image !== "none" && image.includes("-gradient")) {
    color = averageCssGradient(image);
  }
  if (!color) color = parseCssColor(cs.backgroundColor);
  if (!color) return null;
  const opacity = Number.parseFloat(cs.opacity);
  const a = clamp(color.a * (Number.isFinite(opacity) ? opacity : 1), 0, 1);
  return { ...color, a };
}

/**
 * Stima il colore del fondo EFFETTIVO dietro il contenuto del blocco:
 * fondo degli antenati + layer marcati `data-contrast-layer` (dal basso
 * verso l'alto, cioè in ordine di DOM, come sono dipinti).
 */
export function resolveBlockBackdrop(block: Element): Rgba {
  const win = block.ownerDocument.defaultView;
  let base: Rgba = { ...WHITE }; // ripiego: la pagina di giorno

  if (win) {
    // 1) blocco + antenati (dal più esterno verso il blocco stesso)
    const chain: Element[] = [];
    let node: Element | null = block;
    while (node && node !== block.ownerDocument.documentElement) {
      chain.push(node);
      node = node.parentElement;
    }
    for (let i = chain.length - 1; i >= 0; i--) {
      const color = readElementColor(chain[i], win);
      if (color && color.a > 0) base = compositeOver(color, base);
    }

    // 2) i layer ambientali dentro il blocco (base cromatica, veli, scrim)
    block.querySelectorAll("[data-contrast-layer]").forEach((layer) => {
      const color = readElementColor(layer, win);
      if (color && color.a > 0) base = compositeOver(color, base);
    });
  }

  // Fondo trasparente residuo: si appoggia sulla pagina (bianca per sicurezza).
  if (base.a < 0.999) base = compositeOver(base, WHITE);
  return { ...base, a: 1 };
}

/* ────────────────────── applicazione ai blocchi ────────────────────── */

/** Scrive sul blocco le variabili di contrasto (solo se cambiano). */
export function applyAutoContrast(block: HTMLElement): ContrastPick {
  const backdrop = resolveBlockBackdrop(block);
  const pick = pickContrastInk(backdrop);
  const surface = `${roundChannel(backdrop.r)} ${roundChannel(backdrop.g)} ${roundChannel(backdrop.b)}`;

  if (block.style.getPropertyValue("--contrast-ink") !== pick.channels) {
    block.style.setProperty("--contrast-ink", pick.channels);
  }
  if (block.style.getPropertyValue("--contrast-surface") !== surface) {
    block.style.setProperty("--contrast-surface", surface);
  }
  if (block.getAttribute("data-contrast-tone") !== pick.tone) {
    block.setAttribute("data-contrast-tone", pick.tone);
  }
  const ratio = String(pick.ratio);
  if (block.getAttribute("data-contrast-ratio") !== ratio) {
    block.setAttribute("data-contrast-ratio", ratio);
  }
  return pick;
}

/** Ricalcola tutti i blocchi marcati `data-auto-contrast` nel documento. */
export function refreshAutoContrast(root: ParentNode = document): number {
  const blocks: HTMLElement[] = [];
  if (root instanceof HTMLElement && root.hasAttribute("data-auto-contrast")) {
    blocks.push(root);
  }
  root.querySelectorAll<HTMLElement>("[data-auto-contrast]").forEach((el) => {
    if (el.isConnected) blocks.push(el);
  });
  blocks.forEach(applyAutoContrast);
  return blocks.length;
}

/**
 * Avvia lo script globale: ricalcola i blocchi `data-auto-contrast` al
 * primo paint e a ogni cambio rilevante del DOM (nuovi blocchi, classi,
 * stili inline, cambio tema su <html>). Ritorna la funzione di stop.
 */
export function initAutoContrast(): () => void {
  if (typeof document === "undefined") return () => {};

  let frame: number | null = null;
  const schedule = () => {
    if (frame !== null) return;
    if (typeof requestAnimationFrame === "function") {
      frame = requestAnimationFrame(() => {
        frame = null;
        refreshAutoContrast(document);
      });
    } else {
      // Ripiego (jsdom, ambienti senza rAF): gira comunque, fuori dal frame.
      frame = window.setTimeout(() => {
        frame = null;
        refreshAutoContrast(document);
      }, 16) as unknown as number;
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        schedule();
        return;
      }
      // Cambi di classe/stile contano solo se toccano un blocco, un suo
      // layer di sfondo o la radice (cambio tema). Così le animazioni
      // che scrivono style sui figli non innescano ricalcoli inutili.
      const target = mutation.target as Element | null;
      const relevant =
        target === document.documentElement ||
        !!target?.hasAttribute?.("data-auto-contrast") ||
        !!target?.hasAttribute?.("data-contrast-layer");
      if (relevant) {
        schedule();
        return;
      }
    }
  });

  const start = () => {
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-auto-contrast", "data-contrast-layer"],
    });
    schedule();
  };

  if (document.documentElement) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });

  return () => {
    observer.disconnect();
    document.removeEventListener("DOMContentLoaded", start);
    if (frame !== null) {
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
      else clearTimeout(frame);
      frame = null;
    }
  };
}
