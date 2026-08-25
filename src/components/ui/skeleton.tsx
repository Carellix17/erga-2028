import { cn } from "@/lib/utils";

/**
 * Skeleton UI Primitive — Erga
 * 
 * - Usa animate-pulse con fondo neutro desaturato (bg-muted = grigio chiaro)
 * - Eredita il border-radius dal contesto tramite className (rounded-card, rounded-button, rounded-pill ecc.)
 * - Rispetta i token di design di Erga per zero layout shift
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse bg-muted",
        // Default neutro: rounded-xl (1.25rem) vicino a rounded-card, ma sovrascrivibile
        // con rounded-card / rounded-button / rounded-pill per match pixel-perfect
        "rounded-xl",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
