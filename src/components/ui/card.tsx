import * as React from"react";

import { cn } from"@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
 <div
 ref={ref}
 className={cn(
// 🌲 P24 × Apple — superficie semi-trasparente con blur (degradazione: senza
// backdrop-filter resta un velo al 70%, sempre leggibile), bordo definito che
// riflette la luce (nero/10 di giorno, bianco/10 di notte) + hairline interna.
"rounded-2xl border bg-card/70 backdrop-blur-md text-card-foreground border-black/10 dark:border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]",
 className,
 )}
 {...props}
 />
));
Card.displayName ="Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
 ({ className, ...props }, ref) => (
 <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
 ),
);
CardHeader.displayName ="CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
 ({ className, ...props }, ref) => (
 <h3 ref={ref} className={cn("title-large font-display font-semibold tracking-tight", className)} {...props} />
 ),
);
CardTitle.displayName ="CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
 ({ className, ...props }, ref) => (
 <p ref={ref} className={cn("body-medium text-muted-foreground", className)} {...props} />
 ),
);
CardDescription.displayName ="CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
 ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName ="CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
 ({ className, ...props }, ref) => (
 <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
 ),
);
CardFooter.displayName ="CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
