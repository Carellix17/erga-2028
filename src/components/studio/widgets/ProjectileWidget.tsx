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
 * 🎛️ Moto del proiettile: traiettoria con v₀ e angolo regolabili.
 * Gittata, altezza massima e tempo di volo si ricalcolano in diretta.
 */
export function ProjectileWidget({ spec }: { spec: WidgetSpec }) {
  const lang = currentLanguage();
  const def = WIDGET_MAP.proiettile;
  const G = 9.81;
  const [v0, setV0] = useState(() => widgetParamValue(spec, "v0"));
  const [deg, setDeg] = useState(() => widgetParamValue(spec, "angolo"));

  const th = (deg * Math.PI) / 180;
  const R = (v0 * v0 * Math.sin(2 * th)) / G;
  const H = (v0 * v0 * Math.sin(th) ** 2) / (2 * G);
  const T = (2 * v0 * Math.sin(th)) / G;

  const plot = makePlot({ xmin: 0, xmax: Math.max(R * 1.15, 5), ymin: 0, ymax: Math.max(H * 1.35, 2), width: 320, height: 190 });
  const pts: string[] = [];
  for (let i = 0; i <= 80; i++) {
    const t = (T * i) / 80;
    const x = v0 * Math.cos(th) * t;
    const y = v0 * Math.sin(th) * t - 0.5 * G * t * t;
    pts.push(`${plot.px(x).toFixed(1)},${plot.py(Math.max(0, y)).toFixed(1)}`);
  }

  const readouts = [
    { label: lang === "en" ? "range" : "gittata", value: `${nice(R, 1)} m` },
    { label: lang === "en" ? "max height" : "h massima", value: `${nice(H, 1)} m` },
    { label: lang === "en" ? "flight time" : "tempo", value: `${nice(T, 1)} s` },
  ];

  return (
    <WidgetShell
      title={widgetTitle("proiettile", lang)}
      caption={spec.caption}
      readouts={readouts}
      onReset={() => { setV0(widgetParamValue(spec, "v0")); setDeg(widgetParamValue(spec, "angolo")); }}
    >
      <svg viewBox="0 0 320 190" className="w-full h-auto" role="img" aria-label="Traiettoria del proiettile">
        <line x1={8} y1={plot.py(0)} x2={312} y2={plot.py(0)} className="stroke-current text-muted-foreground/40" strokeWidth={1.5} />
        <line x1={plot.px(R / 2)} y1={plot.py(H)} x2={plot.px(R / 2)} y2={plot.py(0)} className="stroke-current text-muted-foreground/40" strokeWidth={1} strokeDasharray="4 3" />
        <polyline points={pts.join(" ")} fill="none" className="stroke-current text-primary" strokeWidth={2.5} />
        <circle cx={plot.px(R / 2)} cy={plot.py(H)} r={4} className="fill-current text-primary" />
        <text x={plot.px(R / 2)} y={plot.py(H) - 6} textAnchor="middle" className="fill-current text-muted-foreground" fontSize={10} fontFamily="monospace">
          h={nice(H, 1)} m
        </text>
      </svg>
      {def.params.map((p) => {
        const value = p.key === "v0" ? v0 : deg;
        const setter = p.key === "v0" ? setV0 : setDeg;
        return (
          <WidgetSlider
            key={p.key}
            label={widgetParamLabel(p, lang)}
            value={value}
            min={p.min}
            max={p.max}
            step={p.step}
            unit={p.unit}
            onChange={setter}
          />
        );
      })}
    </WidgetShell>
  );
}
