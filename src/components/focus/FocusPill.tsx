import { Timer } from "lucide-react";
import { useFocus, formatMMSS } from "@/contexts/FocusContext";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "default" | "warning";
  className?: string;
}

export function FocusPill({ variant = "default", className }: Props) {
  const { isActive, remaining, openFullscreen, isRunning } = useFocus();
  if (!isActive) return null;
  return (
    <button
      type="button"
      onClick={openFullscreen}
      aria-label="Apri timer focus"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors",
        variant === "warning"
          ? "bg-warning/10 text-warning hover:bg-warning/20"
          : "bg-primary/10 text-primary hover:bg-primary/20",
        !isRunning && "opacity-70",
        className,
      )}
    >
      <Timer className="w-3.5 h-3.5" />
      <span>{formatMMSS(remaining)}</span>
    </button>
  );
}