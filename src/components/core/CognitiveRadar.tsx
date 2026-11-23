import { useId } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import type { CognitiveProfile } from "@/hooks/useCognitiveProfile";
import { cn } from "@/lib/utils";
import { hexPoint, insetPolygon, roundPolygon } from "./coreHexagon";

interface Props {
  profile: Pick<CognitiveProfile, "log_score" | "mem_score" | "foc_score" | "voc_score" | "ans_score" | "app_score">;
  /** Home uses the shape alone; the detailed Core view keeps dimension labels. */
  showLabels?: boolean;
  className?: string;
  /** `core` è solo la pagina Esagono. Home, profilo e demo restano sul radar precedente. */
  appearance?: "default" | "core";
}

const LABELS: Record<string, string> = {
  LOG: "Logica",
  MEM: "Memoria",
  FOC: "Focus",
  VOC: "Lessico",
  ANS: "Calma",
  APP: "Pratica",
};

export function CognitiveRadar({ profile, showLabels = true, className, appearance = "default" }: Props) {
  if (appearance === "core") {
    return <CoreHexagon profile={profile} showLabels={showLabels} className={className} />;
  }

  const data = [
    { area: LABELS.LOG, value: profile.log_score },
    { area: LABELS.MEM, value: profile.mem_score },
    { area: LABELS.FOC, value: profile.foc_score },
    { area: LABELS.VOC, value: profile.voc_score },
    { area: LABELS.ANS, value: profile.ans_score },
    { area: LABELS.APP, value: profile.app_score },
  ];

  return (
    <div className={cn("h-72 w-full select-none", className)}>
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="cognitive-radar-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--cognitive))" stopOpacity="0.18" />
            <stop offset="100%" stopColor="hsl(var(--cognitive))" stopOpacity="0.06" />
          </linearGradient>
        </defs>
      </svg>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="78%">
          <PolarGrid stroke="hsl(var(--outline-variant))" strokeOpacity={0.7} strokeWidth={0.6} />
          <PolarAngleAxis
            dataKey="area"
            axisLine={showLabels}
            tick={
              showLabels
                ? { fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500, letterSpacing: 1 }
                : false
            }
          />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Esagono"
            dataKey="value"
            stroke="hsl(var(--cognitive))"
            fill="url(#cognitive-radar-fill)"
            fillOpacity={1}
            strokeWidth={1.2}
            strokeOpacity={0.85}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

const CORE_AXES = [
  { key: "log_score", label: "Logica" },
  { key: "mem_score", label: "Memoria" },
  { key: "foc_score", label: "Focus" },
  { key: "voc_score", label: "Lessico" },
  { key: "ans_score", label: "Calma" },
  { key: "app_score", label: "Pratica" },
] as const;

const HEX_CENTER = { x: 180, y: 168 };
const HEX_RADIUS = 104;
const HEX_LABEL_RADIUS = 132;

function CoreHexagon({
  profile,
  showLabels,
  className,
}: {
  profile: Props["profile"];
  showLabels: boolean;
  className?: string;
}) {
  const rawId = useId().replace(/:/g, "");
  const clipId = `core-hex-clip-${rawId}`;
  const blurId = `core-hex-blur-${rawId}`;
  const scores = CORE_AXES.map((axis) => profile[axis.key]);
  const profilePoints = scores.map((score, index) =>
    hexPoint(HEX_CENTER.x, HEX_CENTER.y, (Math.max(0, Math.min(100, score)) / 100) * HEX_RADIUS, index),
  );
  const profilePath = roundPolygon(profilePoints, 8);
  const coverPath = roundPolygon(insetPolygon(profilePoints, 16), 6);
  const rings = [0.25, 0.5, 0.75, 1].map((scale) =>
    roundPolygon(
      Array.from({ length: 6 }, (_, index) => hexPoint(HEX_CENTER.x, HEX_CENTER.y, HEX_RADIUS * scale, index)),
      scale === 1 ? 8 : 4,
    ),
  );
  const spokes = Array.from({ length: 6 }, (_, index) => {
    const [x, y] = hexPoint(HEX_CENTER.x, HEX_CENTER.y, HEX_RADIUS, index);
    return `M ${HEX_CENTER.x} ${HEX_CENTER.y} L ${x} ${y}`;
  });

  return (
    <div className={cn("h-72 w-full select-none", className)}>
      <svg viewBox="-28 0 416 336" className="h-full w-full" role="img" aria-label="Esagono cognitivo">
        <defs>
          <clipPath id={clipId}>
            <path d={profilePath} />
          </clipPath>
          <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>

        <g fill="none" stroke="#6a6e74" strokeWidth="1">
          {rings.map((ring) => (
            <path key={ring} d={ring} />
          ))}
          {spokes.map((spoke) => (
            <path key={spoke} d={spoke} />
          ))}
        </g>

        <path data-core-hexagon d={profilePath} fill="#48252F" />

        <g clipPath={`url(#${clipId})`} filter={`url(#${blurId})`} fill="none" stroke="#D8CFBC" strokeOpacity="0.85" strokeWidth="1.4">
          {rings.map((ring) => (
            <path key={`blur-${ring}`} d={ring} />
          ))}
          {spokes.map((spoke) => (
            <path key={`blur-${spoke}`} d={spoke} />
          ))}
        </g>

        <path d={coverPath} fill="#48252F" />

        {showLabels &&
          CORE_AXES.map((axis, index) => {
            const [x, y] = hexPoint(HEX_CENTER.x, HEX_CENTER.y, HEX_LABEL_RADIUS, index);
            const anchor = x < HEX_CENTER.x - 16 ? "end" : x > HEX_CENTER.x + 16 ? "start" : "middle";
            return (
              <text
                key={axis.key}
                x={x}
                y={y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill="#D8CFBC"
                fontFamily="Geist Mono, ui-monospace, monospace"
                fontSize="11"
                fontWeight="600"
                style={{ letterSpacing: "0.08em" }}
              >
                {axis.label.toUpperCase()}
              </text>
            );
          })}
      </svg>
    </div>
  );
}
