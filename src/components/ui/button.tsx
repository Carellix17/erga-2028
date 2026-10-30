import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex min-w-0 touch-manipulation select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-button text-interface font-semibold transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-200 ease-in-out active:translate-x-px active:translate-y-px active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-input bg-primary text-primary-foreground font-sans font-semibold text-[15px] shadow-primary-action hover:bg-primary-deep",
        destructive: "bg-destructive text-destructive-foreground shadow-level-0 hover:opacity-90",
        outline: "border border-input bg-sheet text-foreground hover:bg-secondary",
        secondary: "border border-line bg-secondary text-secondary-foreground shadow-level-0 hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-foreground/[0.08]",
        link: "h-auto rounded-sm p-0 text-foreground underline-offset-4 hover:underline",
        tonal: "bg-secondary text-secondary-foreground shadow-level-0 hover:bg-secondary/80",
        fab: "bg-primary text-primary-foreground shadow-level-1 hover:bg-primary-deep",
        "fab-secondary": "border border-line bg-secondary text-secondary-foreground shadow-level-1 hover:bg-secondary/80",
        "fab-tertiary": "bg-tertiary text-tertiary-foreground shadow-level-1 hover:opacity-90",
        elevated: "border border-line bg-surface-primary text-card-foreground shadow-level-1 hover:brightness-110",
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

