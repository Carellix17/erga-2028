import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium relative overflow-hidden transition-all duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-38 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.95]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-level-0 hover:opacity-90 rounded-lg state-layer",
        destructive:
          "bg-destructive text-destructive-foreground shadow-level-0 hover:opacity-90 rounded-lg state-layer",
        outline:
          "border border-white bg-transparent text-foreground hover:bg-foreground/[0.08] rounded-lg",
        secondary:
          "bg-secondary-container text-secondary-foreground shadow-level-0 hover:opacity-90 rounded-lg state-layer",
        ghost:
          "text-foreground hover:bg-foreground/[0.08] rounded-lg",
        link:
          "text-primary underline-offset-4 hover:underline",
        tonal:
          "bg-secondary-container text-secondary-foreground shadow-level-0 hover:opacity-90 rounded-lg state-layer",
        fab:
          "bg-primary-container text-primary shadow-level-0 hover:opacity-90 rounded-lg state-layer",
        "fab-secondary":
          "bg-secondary-container text-secondary-foreground shadow-level-0 hover:opacity-90 rounded-lg state-layer",
        "fab-tertiary":
          "bg-tertiary-container text-tertiary shadow-level-0 hover:opacity-90 rounded-lg state-layer",
        elevated:
          "bg-surface-container-low text-primary shadow-level-0 hover:opacity-90 rounded-lg state-layer",
      },
      size: {
        default: "h-11 px-6 rounded-lg",
        sm: "h-9 px-5 text-xs rounded-lg",
        lg: "h-14 px-8 text-base rounded-lg",
        icon: "h-11 w-11 rounded-full",
        "icon-sm": "h-9 w-9 rounded-full",
        "icon-lg": "h-12 w-12 rounded-full",
        fab: "h-14 w-14 rounded-lg",
        "fab-extended": "h-14 px-7 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
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
