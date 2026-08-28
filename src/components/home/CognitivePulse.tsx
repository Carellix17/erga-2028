import { Hexagon, TrendingUp, Brain, Activity } from "lucide-react";

export interface CognitivePulseProps {
  cognitiveState?: string;
  description?: string;
  hexagonValue?: number;
  trend?: "up" | "down" | "stable";
  onClick?: () => void;
  badgeText?: string;
}

export function CognitivePulse({
  cognitiveState = "Focus Alto",
  description = "Sei al picco di concentrazione oggi",
  hexagonValue = 78,
  trend = "up",
  onClick,
  badgeText = "Esagono",
}: CognitivePulseProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-200/80 bg-white p-4 flex items-center gap-4 text-left"
    >
      <div className="h-11 w-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 relative">
        <Hexagon className="h-6 w-6 text-indigo-600" />
        <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
          {hexagonValue}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-slate-900 truncate">
            {cognitiveState}
          </p>
          <span className="h-5 px-2 rounded-full bg-indigo-50 text-indigo-600 flex items-center gap-1 text-[10px] font-semibold">
            {trend === "up" ? <TrendingUp className="h-3 w-3" /> : trend === "down" ? <Activity className="h-3 w-3" /> : <Brain className="h-3 w-3" />}
            {badgeText}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-slate-500 leading-snug line-clamp-1">
          {description}
        </p>
      </div>
    </button>
  );
}
