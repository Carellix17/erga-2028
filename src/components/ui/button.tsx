import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex min-w-0 touch-manipulation select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-xl text-sm font-semibold transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-100 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-38 motion-reduce:transform-none motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-black text-white shadow-level-0 hover:bg-neutral-800 active:scale-[0.97] dark:bg-white dark:text-black dark:hover:bg-neutral-200",
        destructive: "bg-destructive text-destructive-foreground shadow-level-0 hover:opacity-90 state-layer",
        outline:
          "border border-foreground/15 bg-background/80 text-foreground backdrop-blur-sm hover:bg-foreground/[0.06] supports-[backdrop-filter]:bg-background/55",
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
        lg: "h-12 rounded-2xl px-7 text-base",
        icon: "h-11 w-11 p-0",
        "icon-sm": "h-9 w-9 p-0",
        "icon-lg": "h-12 w-12 rounded-2xl p-0",
        fab: "h-14 w-14 rounded-2xl p-0",
        "fab-extended": "h-14 rounded-2xl px-7",
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
