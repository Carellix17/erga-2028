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
 * 🎛️ Retta: y = mx + q con cursori su pendenza e intercetta.
 */
export function LineWidget({ spec }: { spec: WidgetSpec }) {
  const lang = currentLanguage();
  const def = WIDGET_MAP.retta;
  const [m, setM] = useState(() => widgetParamValue(spec, "m"));
  const [q, setQ] = useState(() => widgetParamValue(spec, "q"));

  const plot = makePlot({ xmin: -6, xmax: 6, ymin: -6, ymax: 8, width: 320, height: 200 });
  const f = (x: number) => m * x + q;
  const zero = Math.abs(m) > 1e-9 ? -q / m : NaN;

  const readouts = [
    { label: lang === "en" ? "y-intercept" : "intercetta", value: nice(q) },
    { label: lang === "en" ? "x-axis cross" : "zero", value: Number.isFinite(zero) ? `x = ${nice(zero)}` : (lang === "en" ? "never" : "mai") },
  ];

  return (
    <WidgetShell
      title={widgetTitle("retta", lang)}
      caption={spec.caption}
      readouts={readouts}
      onReset={() => { setM(widgetParamValue(spec, "m")); setQ(widgetParamValue(spec, "q")); }}
    >
      <svg viewBox="0 0 320 200" className="w-full h-auto" role="img" aria-label="Grafico della retta">
        {plot.hasXAxis && <line x1={8} y1={plot.y0} x2={312} y2={plot.y0} className="stroke-current text-muted-foreground/30" strokeWidth={1} />}
        {plot.hasYAxis && <line x1={plot.x0} y1={8} x2={plot.x0} y2={192} className="stroke-current text-muted-foreground/30" strokeWidth={1} />}
        <polyline points={curvePoints(plot, f)} fill="none" className="stroke-current text-primary" strokeWidth={2.5} />
        <circle cx={plot.px(0)} cy={plot.py(q)} r={4.5} className="fill-current text-primary" />
      </svg>
      {def.params.map((p) => {
        const value = p.key === "m" ? m : q;
        const setter = p.key === "m" ? setM : setQ;
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
