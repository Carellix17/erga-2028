import { useState } from "react";
import { WidgetShell, WidgetSlider } from "./WidgetShell";
import { makePlot, nice } from "./plot";
import {
  WIDGET_MAP,
  widgetParamValue,
  widgetParamLabel,
  widgetTitle,
  type WidgetSpec,
} from "@/lib/widgets";
import { currentLanguage } from "@/i18n";

/**
 * 🎛️ Offerta e domanda: i cursori spostano le curve e il punto di
 * equilibrio (prezzo e quantità) si ricalcola in diretta.
 * Domanda: p = D − q · Offerta: p = S + q
 */
export function MarketWidget({ spec }: { spec: WidgetSpec }) {
  const lang = currentLanguage();
  const def = WIDGET_MAP.mercato;
  const [D, setD] = useState(() => widgetParamValue(spec, "domanda"));
  const [S, setS] = useState(() => widgetParamValue(spec, "offerta"));

  const plot = makePlot({ xmin: 0, xmax: 24, ymin: 0, ymax: 24, width: 320, height: 210 });

  const qEq = (D - S) / 2;
  const pEq = (D + S) / 2;
  const hasEq = qEq > 0;

  const demandPts = `${plot.px(0).toFixed(1)},${plot.py(Math.min(D, 24)).toFixed(1)} ${plot.px(Math.min(D, 24)).toFixed(1)},${plot.py(0).toFixed(1)}`;
  const supplyPts = `${plot.px(0).toFixed(1)},${plot.py(Math.min(S, 24)).toFixed(1)} ${plot.px(24 - Math.min(S, 24)).toFixed(1)},${plot.py(24).toFixed(1)}`;

  const readouts = hasEq
    ? [
        { label: lang === "en" ? "eq. price" : "prezzo eq.", value: `${nice(pEq, 1)}` },
        { label: lang === "en" ? "eq. quantity" : "quantità eq.", value: `${nice(qEq, 1)}` },
      ]
    : [{ label: lang === "en" ? "market" : "mercato", value: lang === "en" ? "no trade" : "nessuno scambio" }];

  return (
    <WidgetShell
      title={widgetTitle("mercato", lang)}
      caption={spec.caption}
      readouts={readouts}
      onReset={() => { setD(widgetParamValue(spec, "domanda")); setS(widgetParamValue(spec, "offerta")); }}
    >
      <svg viewBox="0 0 320 210" className="w-full h-auto" role="img" aria-label="Grafico offerta e domanda">
        <line x1={8} y1={plot.py(0)} x2={312} y2={plot.py(0)} className="stroke-current text-muted-foreground/40" strokeWidth={1} />
        <line x1={plot.px(0)} y1={8} x2={plot.px(0)} y2={202} className="stroke-current text-muted-foreground/40" strokeWidth={1} />
        <text x={305} y={plot.py(0) - 6} textAnchor="end" className="fill-current text-muted-foreground" fontSize={10} fontFamily="monospace">q</text>
        <text x={plot.px(0) + 6} y={16} className="fill-current text-muted-foreground" fontSize={10} fontFamily="monospace">p</text>
        {/* domanda */}
        <polyline points={demandPts} fill="none" className="stroke-current text-brand-deep" strokeWidth={2.5} />
        {/* offerta */}
        <polyline points={supplyPts} fill="none" className="stroke-current text-amber-600" strokeWidth={2.5} />
        {hasEq && (
          <>
            <line x1={plot.px(qEq)} y1={plot.py(pEq)} x2={plot.px(qEq)} y2={plot.py(0)} className="stroke-current text-muted-foreground/50" strokeWidth={1} strokeDasharray="4 3" />
            <line x1={plot.px(qEq)} y1={plot.py(pEq)} x2={plot.px(0)} y2={plot.py(pEq)} className="stroke-current text-muted-foreground/50" strokeWidth={1} strokeDasharray="4 3" />
            <circle cx={plot.px(qEq)} cy={plot.py(pEq)} r={5} className="fill-current text-foreground" />
          </>
        )}
      </svg>
      {def.params.map((p) => {
        const value = p.key === "domanda" ? D : S;
        const setter = p.key === "domanda" ? setD : setS;
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
