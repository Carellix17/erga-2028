import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-control border border-input bg-secondary px-4 py-2.5 text-base text-secondary-foreground transition-[background-color,border-color,box-shadow,color] duration-200 ease-in-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-secondary-foreground placeholder:text-ink-muted focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
