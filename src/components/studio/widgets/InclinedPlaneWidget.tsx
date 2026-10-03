import { useState } from "react";
import { WidgetShell, WidgetSlider } from "./WidgetShell";
import { nice } from "./plot";
import {
  WIDGET_MAP,
  widgetParamValue,
  widgetParamLabel,
  widgetTitle,
  type WidgetSpec,
} from "@/lib/widgets";
import { currentLanguage } from "@/i18n";

/**
 * 🎛️ Forze sul piano inclinato: angolo, massa e attrito regolabili.
 * Disegna il peso e le sue componenti; calcola attrito e accelerazione.
 */
export function InclinedPlaneWidget({ spec }: { spec: WidgetSpec }) {
  const lang = currentLanguage();
  const def = WIDGET_MAP["piano-inclinato"];
  const G = 9.81;
  const [deg, setDeg] = useState(() => widgetParamValue(spec, "angolo"));
  const [m, setM] = useState(() => widgetParamValue(spec, "massa"));
  const [mu, setMu] = useState(() => widgetParamValue(spec, "attrito"));

  const th = (deg * Math.PI) / 180;
  const W = m * G;
  const Fpar = W * Math.sin(th);
  const N = W * Math.cos(th);
  const a = G * (Math.sin(th) - mu * Math.cos(th));
  const moving = a > 0;
  const attrito = moving ? mu * N : Math.min(Fpar, mu * N);

  const readouts = [
    { label: lang === "en" ? "weight" : "peso", value: `${nice(W, 1)} N` },
    { label: lang === "en" ? "along plane" : "parallela", value: `${nice(Fpar, 1)} N` },
    { label: lang === "en" ? "friction" : "attrito", value: `${nice(attrito, 1)} N` },
    {
      label: lang === "en" ? "acceleration" : "accelerazione",
      value: moving ? `${nice(a, 2)} m/s²` : (lang === "en" ? "at rest" : "fermo"),
    },
  ];

  // Geometria del disegno (svg 320×200): piano inclinato da sinistra-basso a destra-alto.
  const base = { x: 30, y: 175 };
  const inclineLen = 250;
  const top = { x: base.x + inclineLen * Math.cos(th), y: base.y - inclineLen * Math.sin(th) };
  const mid = { x: (base.x + top.x) / 2, y: (base.y + top.y) / 2 };
  // terna locale: u lungo il piano (verso il basso), n perpendicolare
  const ux = -Math.cos(th), uy = Math.sin(th);
  const nx = Math.sin(th), ny = Math.cos(th);
  const scale = 90 / Math.max(W, 1); // lunghezza freccia del peso (max ~90px)
  const wLen = W * scale;

  return (
    <WidgetShell
      title={widgetTitle("piano-inclinato", lang)}
      caption={spec.caption}
      readouts={readouts}
      onReset={() => { setDeg(widgetParamValue(spec, "angolo")); setM(widgetParamValue(spec, "massa")); setMu(widgetParamValue(spec, "attrito")); }}
    >
      <svg viewBox="0 0 320 200" className="w-full h-auto" role="img" aria-label="Forze sul piano inclinato">
        <defs>
          <marker id="wa-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
            <polygon points="0 0, 7 3.5, 0 7" className="fill-current" />
          </marker>
        </defs>
        {/* piano */}
        <line x1={base.x} y1={base.y} x2={top.x} y2={top.y} className="stroke-current text-foreground" strokeWidth={2.5} />
        <line x1={base.x} y1={base.y} x2={base.x + inclineLen * Math.cos(th)} y2={base.y} className="stroke-current text-muted-foreground/40" strokeWidth={1} strokeDasharray="4 3" />
        {/* blocco */}
        <g transform={`translate(${mid.x} ${mid.y}) rotate(${-deg})`}>
          <rect x={-11} y={-22} width={22} height={22} className="fill-current text-primary/20 stroke-current text-primary" strokeWidth={1.5} />
        </g>
        {/* peso (verso il basso) */}
        <line x1={mid.x} y1={mid.y} x2={mid.x} y2={mid.y + wLen} strokeWidth={2} markerEnd="url(#wa-arrow)" className="stroke-current text-rose-500" />
        {/* componente parallela al piano */}
        <line x1={mid.x} y1={mid.y} x2={mid.x + ux * Fpar * scale} y2={mid.y + uy * Fpar * scale} strokeWidth={2} markerEnd="url(#wa-arrow)" className="stroke-current text-primary" strokeDasharray="5 3" />
        {/* componente perpendicolare */}
        <line x1={mid.x} y1={mid.y} x2={mid.x + nx * N * scale} y2={mid.y - ny * N * scale} strokeWidth={2} markerEnd="url(#wa-arrow)" className="stroke-current text-sky-600" strokeDasharray="5 3" />
        <text x={base.x + 6} y={base.y - 6} className="fill-current text-muted-foreground" fontSize={11} fontFamily="monospace">
          {deg.toFixed(0)}°
        </text>
      </svg>
      {def.params.map((p) => {
        const value = p.key === "angolo" ? deg : p.key === "massa" ? m : mu;
        const setter = p.key === "angolo" ? setDeg : p.key === "massa" ? setM : setMu;
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
