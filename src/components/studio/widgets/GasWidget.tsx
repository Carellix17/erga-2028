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
 * 🎛️ Legge dei gas: P·V = nRT. Il cilindro mostra il pistone che sale o
 * scende col volume; il colore del gas segue la temperatura; la pressione
 * è il risultato, sempre davanti agli occhi.
 */
export function GasWidget({ spec }: { spec: WidgetSpec }) {
  const lang = currentLanguage();
  const def = WIDGET_MAP.gas;
  const R = 0.0821; // L·atm / (mol·K)
  const [n, setN] = useState(() => widgetParamValue(spec, "n"));
  const [T, setT] = useState(() => widgetParamValue(spec, "T"));
  const [V, setV] = useState(() => widgetParamValue(spec, "V"));

  const P = (n * R * T) / V;

  // cilindro svg (320×170): altezza gas ∝ V (1..50 L)
  const gasH = 24 + (V / 50) * 110;
  const hue = 220 - ((T - 100) / 500) * 220; // 100K blu → 600K rosso
  const gasColor = `hsl(${hue.toFixed(0)}, 55%, 45%)`;

  const readouts = [
    { label: lang === "en" ? "pressure" : "pressione", value: `${nice(P, 2)} atm` },
    { label: "P·V = nRT", value: `${nice(P * V, 1)} = ${nice(n, 1)}·0.0821·${nice(T, 0)}` },
  ];

  return (
    <WidgetShell
      title={widgetTitle("gas", lang)}
      caption={spec.caption}
      readouts={readouts}
      onReset={() => { setN(widgetParamValue(spec, "n")); setT(widgetParamValue(spec, "T")); setV(widgetParamValue(spec, "V")); }}
    >
      <svg viewBox="0 0 320 170" className="w-full h-auto" role="img" aria-label="Cilindro con pistone">
        {/* pareti */}
        <path d={`M 90 20 L 90 150 L 230 150 L 230 20`} fill="none" className="stroke-current text-foreground" strokeWidth={3} />
        {/* gas */}
        <rect x={93} y={150 - gasH} width={134} height={gasH} fill={gasColor} opacity={0.45} />
        {/* pistone */}
        <rect x={84} y={150 - gasH - 12} width={152} height={12} rx={2} className="fill-current text-muted-foreground" />
        <line x1={160} y1={150 - gasH - 12} x2={160} y2={150 - gasH - 34} className="stroke-current text-muted-foreground" strokeWidth={3} />
        <text x={245} y={150 - gasH / 2} className="fill-current text-muted-foreground" fontSize={12} fontFamily="monospace">
          {nice(V, 0)} L
        </text>
      </svg>
      {def.params.map((p) => {
        const value = p.key === "n" ? n : p.key === "T" ? T : V;
        const setter = p.key === "n" ? setN : p.key === "T" ? setT : setV;
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
