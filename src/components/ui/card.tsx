import * as React from"react";

import { cn } from"@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
 <div
 ref={ref}
 className={cn(
/* 🎨 P9a — il mattone di fabbrica nello STILE NUOVO: superficie piena (niente
 vetro), angoli della famiglia, ombre ai gradini di casa, sollevamento dolce
 al passaggio. Chi la usava ereditava il look vecchio gratis: ora eredita quello nuovo. */
"rounded-2xl bg-card text-card-foreground border border-outline-variant/60 shadow-level-1 transition-shadow duration-300 ease-m3-emphasized hover:shadow-level-2",
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
