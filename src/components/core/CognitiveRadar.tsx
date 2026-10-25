import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import type { CognitiveProfile } from "@/hooks/useCognitiveProfile";
import { cn } from "@/lib/utils";

interface Props {
  profile: Pick<CognitiveProfile, "log_score" | "mem_score" | "foc_score" | "voc_score" | "ans_score" | "app_score">;
  /** Home uses the shape alone; the detailed Core view keeps dimension labels. */
  showLabels?: boolean;
  className?: string;
}

const LABELS: Record<string, string> = {
  LOG: "Logica",
  MEM: "Memoria",
  FOC: "Focus",
  VOC: "Lessico",
  ANS: "Calma",
  APP: "Pratica",
};

export function CognitiveRadar({ profile, showLabels = true, className }: Props) {
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
