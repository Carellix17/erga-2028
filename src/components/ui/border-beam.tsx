import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
}

/**
 * Magic UI inspired BorderBeam — animated rotating gradient border.
 * Drop inside any `relative overflow-hidden` container.
 */
export function BorderBeam({
  className,
  size = 220,
  duration = 6,
  delay = 0,
  colorFrom = "hsl(var(--primary))",
  colorTo = "hsl(var(--tertiary))",
  borderWidth = 1.5,
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          "--size": size,
          "--duration": `${duration}s`,
          "--border-width": `${borderWidth}px`,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--delay": `-${delay}s`,
        } as React.CSSProperties
      }
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]",
        // Mask so only the border shows the moving gradient
        "![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
        // Animated rotating gradient
        "after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-[border-beam_calc(var(--duration))_infinite_linear]",
        "after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)]",
        "after:[offset-anchor:90%_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]",
        className
      )}
    />
  );
}

/**
 * Lightweight rotating conic-gradient halo (fallback / alternative).
 */
export function ConicGlow({ className, duration = 4 }: { className?: string; duration?: number }) {
  return (
    <motion.div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        className
      )}
      style={{
        background:
          "conic-gradient(from var(--angle, 0deg), hsl(var(--primary)), hsl(var(--tertiary)), hsl(var(--secondary)), hsl(var(--primary)))",
        filter: "blur(14px)",
        opacity: 0.35,
      }}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    />
  );
}
