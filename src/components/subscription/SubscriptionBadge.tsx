import { Crown, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlanTier = "free" | "beta" | "pro";

interface SubscriptionBadgeProps {
  tier: PlanTier;
  onClick?: () => void;
}

const tierConfig = {
  free: {
    icon: Zap,
    label: "Free",
    gradient: "from-primary via-secondary to-tertiary",
    iconColor: "text-white",
    ring: "ring-primary/30",
  },
  beta: {
    icon: Sparkles,
    label: "Beta",
    gradient: "from-primary via-secondary to-tertiary",
    iconColor: "text-white",
    ring: "ring-primary/30",
  },
  pro: {
    icon: Crown,
    label: "Pro",
    gradient: "from-warning via-warning to-secondary",
    iconColor: "text-white",
    ring: "ring-warning/30",
  },
};

export function SubscriptionBadge({ tier, onClick }: SubscriptionBadgeProps) {
  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      aria-label={`Piano ${config.label} — visualizza dettagli abbonamento`}
      className={cn(
        "w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center",
        "bg-gradient-to-br", config.gradient,
        "shadow-level-2 ring-2", config.ring,
        "rotate-3 hover:rotate-0 hover:scale-110 active:scale-95",
        "transition-all duration-500 ease-m3-emphasized",
        "relative group"
      )}
    >
      <Icon className={cn("w-5 h-5", config.iconColor, "drop-shadow-sm transition-transform duration-300 group-hover:scale-110")} />
      {tier === "beta" && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      )}
    </button>
  );
}
