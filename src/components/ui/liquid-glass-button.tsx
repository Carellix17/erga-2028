"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const liquidbuttonVariants = cva(
  "inline-flex items-center transition-all duration-300 justify-center cursor-pointer gap-2 whitespace-nowrap rounded-xl text-sm font-medium tracking-tight disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] shadow-sm border border-white/20",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-110",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:brightness-110",
        ghost: "hover:bg-accent",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 text-xs px-3",
        lg: "h-12 rounded-xl px-6 text-base",
        xl: "h-14 rounded-xl px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function GlassFilter() {
  return (
    <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
      <defs>
        <filter id="container-glass" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.008"
            numOctaves="1"
            result="noise"
            seed="1"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="3"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feMerge>
            <feMergeNode in="displaced" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}

interface LiquidButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof liquidbuttonVariants> {
  asChild?: boolean
}

function LiquidButton({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: LiquidButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <>
      <Comp
        data-slot="button"
        className={cn(
          "relative isolate overflow-hidden select-none",
          liquidbuttonVariants({ variant, size, className })
        )}
        {...props}
      >
        {/* Subtle top sheen — thin, soft, no muddy gradient */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1/2 z-10 block pointer-events-none rounded-t-[inherit] bg-gradient-to-b from-white/15 to-transparent"
        />
        {/* Hairline inner border for "molded glass" feel */}
        <span
          aria-hidden
          className="absolute inset-0 z-10 block pointer-events-none rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
        />

        {/* Contenuto del bottone (Testo / Icone) */}
        <span className="relative z-20 flex items-center justify-center gap-2">
          {children}
        </span>
      </Comp>
    </>
  )
}

export { LiquidButton, liquidbuttonVariants }
