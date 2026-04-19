import * as React from "react";
import { cn } from "@/lib/utils";

type GlowVariant = "primary" | "success" | "error" | "neutral";

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlowVariant;
  active?: boolean;
}

const variantClass: Record<GlowVariant, string> = {
  primary: "border-primary/30 ring-glow-primary",
  success: "border-success/40 ring-glow-success",
  error: "border-destructive/40 ring-glow-error",
  neutral: "border-border shadow-level-1",
};

export const GlowCard = React.forwardRef<HTMLDivElement, GlowCardProps>(
  ({ className, variant = "neutral", active = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative rounded-2xl bg-card border-2 transition-all duration-300",
        active ? variantClass[variant] : variantClass.neutral,
        className
      )}
      {...props}
    />
  )
);
GlowCard.displayName = "GlowCard";
