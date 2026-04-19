import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium relative overflow-hidden transition-all duration-400 ease-m3-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-38 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.95]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground duo-pressable rounded-full font-semibold hover:scale-[1.01] active:scale-[1]",
        destructive:
          "bg-destructive text-destructive-foreground rounded-full font-semibold shadow-level-1 hover:shadow-level-2",
        outline:
          "border-2 border-border bg-background text-foreground hover:bg-muted rounded-full font-semibold",
        secondary:
          "bg-secondary text-secondary-foreground duo-pressable-success rounded-full font-semibold",
        ghost:
          "text-foreground hover:bg-muted rounded-full",
        link:
          "text-primary underline-offset-4 hover:underline",
        tonal:
          "bg-primary-container text-primary rounded-full font-semibold hover:shadow-level-1",
        fab:
          "bg-primary text-primary-foreground shadow-level-3 hover:shadow-level-4 hover:scale-[1.04] rounded-2xl",
        "fab-secondary":
          "bg-secondary-container text-secondary shadow-level-3 hover:shadow-level-4 hover:scale-[1.04] rounded-2xl",
        "fab-tertiary":
          "bg-tertiary-container text-tertiary shadow-level-3 hover:shadow-level-4 hover:scale-[1.04] rounded-2xl",
        elevated:
          "bg-card text-primary shadow-level-1 hover:shadow-level-2 rounded-full font-semibold",
        duo:
          "bg-primary text-primary-foreground duo-pressable rounded-full font-bold tracking-wide uppercase text-sm",
      },
      size: {
        default: "h-11 px-6 rounded-full",
        sm: "h-9 px-5 text-xs rounded-full",
        lg: "h-14 px-8 text-base rounded-full",
        icon: "h-11 w-11 rounded-full",
        "icon-sm": "h-9 w-9 rounded-full",
        "icon-lg": "h-12 w-12 rounded-full",
        fab: "h-14 w-14 rounded-2xl",
        "fab-extended": "h-14 px-7 rounded-2xl",
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
