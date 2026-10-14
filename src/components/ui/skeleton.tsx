import { cn } from "@/lib/utils";

/**
 * Skeleton UI Primitive — Erga
 * 
 * - Usa una tinta discreta del primo piano come placeholder, leggibile sulle superfici Olive e Bone
 * - Eredita il border-radius dal contesto tramite className (rounded-card, rounded-button ecc.)
 * - Rispetta i token di design di Erga per zero layout shift
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse bg-foreground/[0.12]",
        "rounded-card",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
