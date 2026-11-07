import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex min-w-0 touch-manipulation select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-button text-interface font-normal transition-[background-color,border-color,color,opacity,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-foreground/40 bg-transparent text-foreground font-sans font-normal text-[15px] hover:bg-foreground/10",
        filled: "border border-primary bg-primary text-primary-foreground font-sans font-normal text-[15px] hover:bg-primary-deep",
        destructive: "border border-destructive bg-transparent text-destructive hover:bg-destructive/10",
        outline: "border border-foreground/40 bg-transparent text-foreground hover:bg-foreground/10",
        secondary: "border border-foreground/25 bg-secondary text-secondary-foreground hover:bg-foreground/10",
        ghost: "text-foreground hover:bg-foreground/10",
        link: "h-auto rounded-sm p-0 text-foreground underline-offset-4 hover:underline",
        tonal: "border border-transparent bg-nest text-sand hover:bg-nest/80",
        fab: "border border-foreground/40 bg-transparent text-foreground hover:bg-foreground/10",
        "fab-secondary": "border border-foreground/25 bg-secondary text-secondary-foreground hover:bg-foreground/10",
        "fab-tertiary": "border border-foreground/25 bg-secondary text-foreground hover:bg-foreground/10",
        elevated: "border border-foreground/25 bg-surface-primary text-card-foreground hover:bg-foreground/10",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-11 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11 p-0",
        "icon-sm": "h-11 w-11 p-0",
        "icon-lg": "h-12 w-12 p-0",
        fab: "h-14 w-14 p-0",
        "fab-extended": "h-14 px-6",
        pill: "h-11 rounded-pill px-5 py-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

