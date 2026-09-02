import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex min-w-0 touch-manipulation select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-button text-sm font-semibold transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 ease-in-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-38 motion-reduce:transform-none motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-level-0 hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-level-0 hover:opacity-90 state-layer",
        outline:
          "border border-border bg-card text-foreground hover:bg-surface-container-high",
        secondary:
          "bg-secondary-container text-secondary-foreground shadow-level-0 hover:opacity-90 state-layer",
        ghost: "text-foreground hover:bg-foreground/[0.08]",
        link: "text-primary underline-offset-4 hover:underline",
        tonal: "bg-secondary-container text-secondary-foreground shadow-level-0 hover:opacity-90 state-layer",
        fab: "bg-primary-container text-primary shadow-level-0 hover:opacity-90 state-layer",
        "fab-secondary":
          "bg-secondary-container text-secondary-foreground shadow-level-0 hover:opacity-90 state-layer",
        "fab-tertiary":
          "bg-tertiary-container text-tertiary shadow-level-0 hover:opacity-90 state-layer",
        elevated: "bg-surface-container-low text-primary shadow-level-1 hover:opacity-90 state-layer",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-11 w-11 p-0",
        "icon-sm": "h-9 w-9 p-0",
        "icon-lg": "h-12 w-12 p-0",
        fab: "h-14 w-14 p-0",
        "fab-extended": "h-14 px-7",
        //  P36 — pillola primaria: capsula piena con padding generoso
        pill: "h-12 rounded-full px-6 py-3",
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
