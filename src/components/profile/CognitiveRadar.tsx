import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import type { CognitiveProfile } from "@/hooks/useCognitiveProfile";

interface Props {
  profile: Pick<CognitiveProfile, "log_score" | "mem_score" | "foc_score" | "voc_score" | "ans_score" | "app_score">;
}

const LABELS: Record<string, string> = {
  LOG: "Logica",
  MEM: "Memoria",
  FOC: "Focus",
  VOC: "Lessico",
  ANS: "Calma",
  APP: "Pratica",
};

export function CognitiveRadar({ profile }: Props) {
  const data = [
    { area: LABELS.LOG, value: profile.log_score },
    { area: LABELS.MEM, value: profile.mem_score },
    { area: LABELS.FOC, value: profile.foc_score },
    { area: LABELS.VOC, value: profile.voc_score },
    { area: LABELS.ANS, value: profile.ans_score },
    { area: LABELS.APP, value: profile.app_score },
  ];

  return (
    <div className="w-full h-72 select-none">
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="cognitive-radar-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.22" />
            <stop offset="100%" stopColor="hsl(var(--gold-antique))" stopOpacity="0.08" />
          </linearGradient>
        </defs>
      </svg>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="78%">
          <PolarGrid stroke="hsl(var(--outline-variant))" strokeOpacity={0.7} strokeWidth={0.6} />
          <PolarAngleAxis
            dataKey="area"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500, letterSpacing: 1 }}
          />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Esagono"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="url(#cognitive-radar-fill)"
            fillOpacity={1}
            strokeWidth={1.2}
            strokeOpacity={0.85}
            isAnimationActive
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}