import { useState } from "react";
import { WidgetShell, WidgetSlider } from "./WidgetShell";
import {
  WIDGET_MAP,
  widgetParamValue,
  widgetParamLabel,
  widgetTitle,
  type WidgetSpec,
} from "@/lib/widgets";
import { currentLanguage } from "@/i18n";

/**
 * 🎛️ Scala pH: il cursore muove il marcatore sulla barra 0–14 e mostra
 * la concentrazione [H+] e la classificazione (acido / neutro / basico).
 */
export function PhWidget({ spec }: { spec: WidgetSpec }) {
  const lang = currentLanguage();
  const def = WIDGET_MAP.ph;
  const [ph, setPh] = useState(() => widgetParamValue(spec, "ph"));

  const classification = ph < 6.9
    ? (lang === "en" ? "acidic" : "acido")
    : ph > 7.1
      ? (lang === "en" ? "basic" : "basico")
      : (lang === "en" ? "neutral" : "neutro");

  const readouts = [
    { label: "[H⁺]", value: `10^−${ph.toFixed(1)} mol/L` },
    { label: lang === "en" ? "solution" : "soluzione", value: classification },
  ];

  // posizioni nella barra svg (0 → x=10, 14 → x=310)
  const x = 10 + (ph / 14) * 300;

  return (
    <WidgetShell
      title={widgetTitle("ph", lang)}
      caption={spec.caption}
      readouts={readouts}
      onReset={() => setPh(widgetParamValue(spec, "ph"))}
    >
      <svg viewBox="0 0 320 70" className="w-full h-auto" role="img" aria-label="Scala pH">
        <defs>
          {/* I colori della scala pH replicano l'indicatore universale (rosso →
              verde → viola): sono SEMANTICA scientifica, non palette decorativa.
              La legge del monocromo (noGreen) resta intatta altrove. */}
          <linearGradient id="ph-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c0392b" />
            <stop offset="35%" stopColor="#e67e22" />
            <stop offset="50%" stopColor="#27ae60" />
            <stop offset="75%" stopColor="#2980b9" />
            <stop offset="100%" stopColor="#8e44ad" />
          </linearGradient>
        </defs>
        <rect x={10} y={28} width={300} height={18} rx={9} fill="url(#ph-grad)" />
        {[0, 7, 14].map((tick) => (
          <text key={tick} x={10 + (tick / 14) * 300} y={62} textAnchor="middle" className="fill-current text-muted-foreground" fontSize={11} fontFamily="monospace">
            {tick}
          </text>
        ))}
        <polygon points={`${x - 6},18 ${x + 6},18 ${x},28`} className="fill-current text-foreground" />
      </svg>
      {def.params.map((p) => (
        <WidgetSlider
          key={p.key}
          label={widgetParamLabel(p, lang)}
          value={ph}
          min={p.min}
          max={p.max}
          step={p.step}
          onChange={setPh}
        />
      ))}
    </WidgetShell>
  );
}
