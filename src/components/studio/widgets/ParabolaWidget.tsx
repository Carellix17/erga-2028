import { useState } from "react";
import { WidgetShell, WidgetSlider } from "./WidgetShell";
import { makePlot, curvePoints, nice } from "./plot";
import {
  WIDGET_MAP,
  widgetParamValue,
  widgetParamLabel,
  widgetTitle,
  type WidgetSpec,
} from "@/lib/widgets";
import { currentLanguage } from "@/i18n";

/**
 * 🎛️ Parabola: y = ax² + bx + c con cursori su a, b, c.
 * Mostra vertice, delta e radici: l'equazione di secondo grado si TOCCA.
 */
export function ParabolaWidget({ spec }: { spec: WidgetSpec }) {
  const lang = currentLanguage();
  const def = WIDGET_MAP.parabola;
  const [a, setA] = useState(() => widgetParamValue(spec, "a"));
  const [b, setB] = useState(() => widgetParamValue(spec, "b"));
  const [c, setC] = useState(() => widgetParamValue(spec, "c"));

  const plot = makePlot({ xmin: -6, xmax: 6, ymin: -6, ymax: 8, width: 320, height: 200 });
  const f = (x: number) => a * x * x + b * x + c;

  const hasQuad = Math.abs(a) > 1e-9;
  const xv = hasQuad ? -b / (2 * a) : NaN;
  const yv = hasQuad ? f(xv) : NaN;
  const delta = b * b - 4 * a * c;
  const roots = hasQuad && delta >= 0
    ? [(-b - Math.sqrt(delta)) / (2 * a), (-b + Math.sqrt(delta)) / (2 * a)]
    : [];

  const readouts = [
    { label: lang === "en" ? "vertex" : "vertice", value: hasQuad ? `(${nice(xv)}; ${nice(yv)})` : "—" },
    { label: "Δ", value: nice(delta) },
    ...(roots.length === 2
      ? [{ label: lang === "en" ? "roots" : "radici", value: `x₁=${nice(roots[0])}  x₂=${nice(roots[1])}` }]
      : []),
  ];

  return (
    <WidgetShell
      title={widgetTitle("parabola", lang)}
      caption={spec.caption}
      readouts={readouts}
      onReset={() => { setA(widgetParamValue(spec, "a")); setB(widgetParamValue(spec, "b")); setC(widgetParamValue(spec, "c")); }}
    >
      <svg viewBox="0 0 320 200" className="w-full h-auto" role="img" aria-label="Grafico della parabola">
        {plot.hasXAxis && <line x1={8} y1={plot.y0} x2={312} y2={plot.y0} className="stroke-current text-muted-foreground/30" strokeWidth={1} />}
        {plot.hasYAxis && <line x1={plot.x0} y1={8} x2={plot.x0} y2={192} className="stroke-current text-muted-foreground/30" strokeWidth={1} />}
        <polyline points={curvePoints(plot, f)} fill="none" className="stroke-current text-brand-deep" strokeWidth={2.5} />
        {roots.map((r, i) => (
          Number.isFinite(r) && plot.w.xmin <= r && r <= plot.w.xmax ? (
            <circle key={i} cx={plot.px(r)} cy={plot.py(0)} r={4} className="fill-current text-foreground" />
          ) : null
        ))}
        {hasQuad && Number.isFinite(yv) && plot.w.ymin <= yv && yv <= plot.w.ymax ? (
          <>
            <circle cx={plot.px(xv)} cy={plot.py(yv)} r={4.5} className="fill-current text-brand-deep" />
            <text x={plot.px(xv)} y={plot.py(yv) + (a > 0 ? -8 : 14)} textAnchor="middle" className="fill-current text-muted-foreground" fontSize={10} fontFamily="monospace">
              V({nice(xv)}; {nice(yv)})
            </text>
          </>
        ) : null}
      </svg>
      {def.params.map((p) => {
        const value = p.key === "a" ? a : p.key === "b" ? b : c;
        const setter = p.key === "a" ? setA : p.key === "b" ? setB : setC;
        return (
          <WidgetSlider
            key={p.key}
            label={widgetParamLabel(p, lang)}
            value={value}
            min={p.min}
            max={p.max}
            step={p.step}
            onChange={setter}
          />
        );
      })}
    </WidgetShell>
  );
}
