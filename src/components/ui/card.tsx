import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Varianti superficie (P36 — dark luxury / warm minimalist):
 * - default: card semantica del tema (scuro di notte, chiara di giorno);
 * - dark: card secondaria notte #141418 con filo bianco al 7%;
 * - cream: hero avorio #F4F1EA con inchiostro #121214 (azione focale).
 */
export type CardVariant = "default" | "dark" | "cream";

const CARD_VARIANTS: Record<CardVariant, string> = {
  default: "bg-card text-card-foreground border-border",
  dark: "bg-surface-dark-card text-card-foreground border-white/[0.07]",
  cream: "bg-surface-cream text-surface-cream-foreground border-black/[0.06]",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-card border shadow-level-1 transition-[background-color,border-color,box-shadow] duration-200 ease-in-out",
        CARD_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("title-large font-display font-semibold tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("body-medium text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
