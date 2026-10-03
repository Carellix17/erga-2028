/**
 * 🎛️ PERCORSI 2.0 — piccolo aiutante per i grafici SVG dei widget.
 * Mappa coordinate matematiche (x cresce a destra, y cresce in SU) sui
 * pixel di un viewBox SVG (y cresce in giù). Puro e senza dipendenze.
 */

export interface PlotWindow {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  width: number;
  height: number;
  /** margini interni in pixel svg */
  pad?: number;
}

export function makePlot(w: PlotWindow) {
  const pad = w.pad ?? 8;
  const sx = (w.xmax - w.xmin) || 1;
  const sy = (w.ymax - w.ymin) || 1;
  const px = (x: number) => pad + ((x - w.xmin) / sx) * (w.width - 2 * pad);
  const py = (y: number) => w.height - pad - ((y - w.ymin) / sy) * (w.height - 2 * pad);
  return {
    px,
    py,
    /** La posizione x=0 e y=0 in pixel (per disegnare gli assi). */
    x0: px(Math.max(w.xmin, Math.min(w.xmax, 0))),
    y0: py(Math.max(w.ymin, Math.min(w.ymax, 0))),
    hasXAxis: w.ymin <= 0 && w.ymax >= 0,
    hasYAxis: w.xmin <= 0 && w.xmax >= 0,
    w,
  };
}

export type Plot = ReturnType<typeof makePlot>;

/** Converte una funzione y(x) in una polyline SVG campionata. */
export function curvePoints(
  plot: Plot,
  f: (x: number) => number,
  samples = 120,
): string {
  const { xmin, xmax } = plot.w;
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = xmin + ((xmax - xmin) * i) / samples;
    const y = f(x);
    if (Number.isFinite(y)) pts.push(`${plot.px(x).toFixed(1)},${plot.py(y).toFixed(1)}`);
  }
  return pts.join(" ");
}

/** Numero "bello" per le etichette: interi senza decimali, altrimenti 2 cifre. */
export function nice(n: number, d = 2): string {
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(d);
}
