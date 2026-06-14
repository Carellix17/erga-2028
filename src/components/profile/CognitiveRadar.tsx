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
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="78%">
          <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.6} />
          <PolarAngleAxis
            dataKey="area"
            tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
          />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Esagono"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.35}
            strokeWidth={2}
            isAnimationActive
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}