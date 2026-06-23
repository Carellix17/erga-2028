"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const liquidbuttonVariants = cva(
  "inline-flex items-center transition-all duration-300 justify-center cursor-pointer gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-wide disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95 shadow-md",
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
        lg: "h-12 rounded-2xl px-6 text-base",
        xl: "h-14 rounded-2xl px-8 text-lg",
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
            baseFrequency="0.004 0.004"
            numOctaves="1"
            result="noise"
            seed="1"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1.2"
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
        {/* Inner glass distortion — applied only to the gloss layer so outer edges stay crisp */}
        <span
          aria-hidden
          className="absolute inset-[1px] z-10 block pointer-events-none rounded-[inherit] bg-gradient-to-b from-white/25 via-white/5 to-transparent"
          style={{ filter: 'url(#container-glass)' }}
        />

        {/* Bottom specular highlight — heavy glass bead */}
        <span
          aria-hidden
          className="absolute inset-x-2 bottom-[2px] h-1/3 z-10 block pointer-events-none rounded-[inherit] bg-gradient-to-t from-white/20 to-transparent blur-[2px]"
        />

        {/* Inner shadow / depth */}
        <span className="absolute inset-0 z-10 block pointer-events-none rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_2px_rgba(0,0,0,0.18)]" />

        {/* Contenuto del bottone (Testo / Icone) */}
        <span className="relative z-20 flex items-center justify-center gap-2">
          {children}
        </span>
      </Comp>

      <GlassFilter />
    </>
  )
}

export { LiquidButton, liquidbuttonVariants }
