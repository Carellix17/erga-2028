import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // 🌲 P24 × Apple — materiale traslucido con FISICA DELLA LUCE:
        // · gradiente di rifrazione interno (luce che entra dall'alto);
        // · specular highlight sul bordo superiore (inset 1px bianco);
        // · ombra a doppio strato (occlusione stretta + ambient morbida);
        // · blur dove supportato, con degradazione opaca per la leggibilità
        //   (supports-[backdrop-filter]) e varianti light/dark.
        "rounded-2xl border border-foreground/10 bg-background/95 text-card-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_10px_30px_-10px_rgba(0,0,0,0.18),0_2px_6px_-1px_rgba(0,0,0,0.10)] bg-gradient-to-b from-white/50 to-white/5 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 dark:border-white/10 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_10px_30px_-10px_rgba(0,0,0,0.5),0_2px_6px_-1px_rgba(0,0,0,0.32)] dark:from-white/12 dark:to-white/2",
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
