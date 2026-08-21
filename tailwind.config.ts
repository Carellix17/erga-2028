/* eslint-disable @typescript-eslint/no-require-imports -- QUARANTENA P21i: eredita'.
   I plugin Tailwind si registrano con require() (forma ufficiale dei config). */
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        scrim: "hsl(var(--scrim) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          container: "hsl(var(--primary-container))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          container: "hsl(var(--secondary-container))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        tertiary: {
          DEFAULT: "hsl(var(--tertiary))",
          foreground: "hsl(var(--tertiary-foreground))",
          container: "hsl(var(--tertiary-container))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          container: "hsl(var(--success-container))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        outline: {
          DEFAULT: "hsl(var(--outline))",
          variant: "hsl(var(--outline-variant))",
        },
        surface: {
          DEFAULT: "hsl(var(--background))",
          dim: "hsl(var(--surface-dim))",
          bright: "hsl(var(--surface-bright))",
          "container-lowest": "hsl(var(--surface-container-lowest))",
          "container-low": "hsl(var(--surface-container-low))",
          container: "hsl(var(--surface-container))",
          "container-high": "hsl(var(--surface-container-high))",
          "container-highest": "hsl(var(--surface-container-highest))",
        },
        inverse: {
          surface: "hsl(var(--inverse-surface))",
          "on-surface": "hsl(var(--inverse-on-surface))",
          primary: "hsl(var(--inverse-primary))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        //  P21e — pastelli materia domati (i valori vivono in index.css, dual-theme)
        "pastel-terracotta": "hsl(var(--pastel-terracotta))",
        "pastel-polvere": "hsl(var(--pastel-polvere))",
        "pastel-ocra": "hsl(var(--pastel-ocra))",
        "pastel-prugna": "hsl(var(--pastel-prugna))",
        "pastel-crepuscolo": "hsl(var(--pastel-crepuscolo))",
        "pastel-mare": "hsl(var(--pastel-mare))",
        "pastel-violetto": "hsl(var(--pastel-violetto))",
        "pastel-cipria": "hsl(var(--pastel-cipria))",
        "pastel-grafite": "hsl(var(--pastel-grafite))",
        "pastel-miele": "hsl(var(--pastel-miele))",
        "pastel-neutro": "hsl(var(--pastel-neutro))",
        //  P24 — firme del guscio: nav a pillola (neutro) e puntino neutro
        nav: {
          DEFAULT: "hsl(var(--nav-surface))",
          foreground: "hsl(var(--nav-foreground))",
        },
        //  P24 × MONOCROMO — accento dinamico della materia (var CSS)
        "subject-accent": "var(--subject-accent)",
        "subject-accent-foreground": "var(--subject-accent-foreground)",
        "subject-accent-light": "var(--subject-accent-light)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        card: "var(--radius-card)",
        button: "var(--radius-button)",
        pill: "var(--radius-pill)",
        dialog: "var(--radius-dialog)",
        media: "var(--radius-media)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        "level-0": "var(--shadow-level-0)",
        "level-1": "var(--shadow-level-1)",
        "level-2": "var(--shadow-level-2)",
        "level-3": "var(--shadow-level-3)",
        "level-4": "var(--shadow-level-4)",
        "level-5": "var(--shadow-level-5)",
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      transitionTimingFunction: {
        "m3-emphasized": "cubic-bezier(0.2, 0, 0, 1)",
        "m3-emphasized-decel": "cubic-bezier(0.05, 0.7, 0.1, 1)",
        "m3-emphasized-accel": "cubic-bezier(0.3, 0, 0.8, 0.15)",
        "m3-standard": "cubic-bezier(0.2, 0, 0, 1)",
        "m3-standard-decel": "cubic-bezier(0, 0, 0, 1)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
} satisfies Config;
