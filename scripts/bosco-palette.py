#!/usr/bin/env python3
"""Calcola HSL + contrasto WCAG per la palette BOSCO di Erga."""
import colorsys, sys

def hex_to_hsl(h):
    h = h.lstrip('#')
    r, g, b = (int(h[i:i+2], 16)/255 for i in (0, 2, 4))
    hh, ll, s = colorsys.rgb_to_hls(r, g, b)  # HLS: h, l, s
    return hh*360, s*100, ll*100

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def lum(h):
    r, g, b = (c/255 for c in hex_to_rgb(h))
    def f(c): return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
    r, g, b = f(r), f(g), f(b)
    return 0.2126*r + 0.7152*g + 0.0722*b

def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def hsl_str(h):
    hh, s, l = hex_to_hsl(h)
    return f"{round(hh)} {round(s)}% {round(l)}%"

LIGHT = {
    "background": "#f3f7f4", "foreground": "#111411",
    "surface-dim": "#d9e4dc", "surface-bright": "#ffffff",
    "surface-container-lowest": "#ffffff", "surface-container-low": "#f6f9f7",
    "surface-container": "#eef4f0", "surface-container-high": "#e5ede7",
    "surface-container-highest": "#dce7df",
    "card": "#ffffff", "card-foreground": "#111411",
    "popover": "#ffffff", "input": "#ffffff",
    "muted": "#edf3ef", "muted-foreground": "#5a655d",
    "primary": "#19321f", "primary-foreground": "#f2f8f3",
    "primary-container": "#dcebe0", "on-primary-container": "#0c1f12",
    "secondary": "#eef4f0", "secondary-foreground": "#1f2f26",
    "secondary-container": "#e5ede7", "on-secondary-container": "#1b2a21",
    "tertiary": "#4f845a", "tertiary-foreground": "#ffffff",
    "tertiary-container": "#d9e8de", "on-tertiary-container": "#14301d",
    "success": "#2e7d46", "success-foreground": "#ffffff",
    "success-container": "#d9f0e0", "on-success-container": "#0f3d1f",
    "warning": "#96680f", "warning-foreground": "#ffffff",
    "warning-container": "#f6e9cc", "on-warning-container": "#3f2d06",
    "destructive": "#b03c2a", "destructive-foreground": "#ffffff",
    "error-container": "#f9e4df", "on-error-container": "#57190e",
    "gold-antique": "#8f6b10", "gold-antique-soft": "#f5eccf",
    "ring": "#4f845a",
    "accent": "#dcebe0", "accent-foreground": "#14301d",
    "inverse-surface": "#19321f", "inverse-on-surface": "#f3f7f4", "inverse-primary": "#9dbfa4",
    "sidebar-background": "#ffffff", "sidebar-foreground": "#111411",
    "sidebar-primary": "#19321f", "sidebar-primary-foreground": "#f2f8f3",
    "sidebar-accent": "#eef4f0", "sidebar-accent-foreground": "#111411",
}

DARK = {
    "background": "#0f2014", "foreground": "#e9f1eb",
    "surface-dim": "#0b1710", "surface-bright": "#23402c",
    "surface-container-lowest": "#0a130d", "surface-container-low": "#12231a",
    "surface-container": "#19321f", "surface-container-high": "#1d3a26",
    "surface-container-highest": "#23422d",
    "card": "#19321f", "card-foreground": "#e9f1eb",
    "popover": "#152a1c", "input": "#12231a",
    "muted": "#162a1e", "muted-foreground": "#a7b8ad",
    "primary": "#d5e2d8", "primary-foreground": "#0c1f12",
    "primary-container": "#23402c", "on-primary-container": "#cfe3d4",
    "secondary": "#162a1e", "secondary-foreground": "#e9f1eb",
    "secondary-container": "#1e3526", "on-secondary-container": "#e0ece4",
    "tertiary": "#9dbfa4", "tertiary-foreground": "#0c1f12",
    "tertiary-container": "#1d3a26", "on-tertiary-container": "#cfe3d4",
    "success": "#6fbd82", "success-foreground": "#0c1f12",
    "success-container": "#17301f", "on-success-container": "#a9e3b5",
    "warning": "#dfb25a", "warning-foreground": "#0c1f12",
    "warning-container": "#3a2c12", "on-warning-container": "#f0d9a8",
    "destructive": "#df7a68", "destructive-foreground": "#0c1f12",
    "error-container": "#3a1712", "on-error-container": "#f2b8ac",
    "gold-antique": "#c9ae66", "gold-antique-soft": "#2a2313",
    "ring": "#9dbfa4",
    "accent": "#1d3a26", "accent-foreground": "#cfe3d4",
    "inverse-surface": "#e5ede7", "inverse-on-surface": "#0f2014", "inverse-primary": "#4f845a",
    "sidebar-background": "#0f2014", "sidebar-foreground": "#e9f1eb",
    "sidebar-primary": "#d5e2d8", "sidebar-primary-foreground": "#0c1f12",
    "sidebar-accent": "#1d3a26", "sidebar-accent-foreground": "#e9f1eb",
}

PAIRS = [
    ("foreground/background", "foreground", "background", 4.5),
    ("muted-foreground/background", "muted-foreground", "background", 4.5),
    ("muted-foreground/card", "muted-foreground", "card", 4.5),
    ("primary/primary-foreground", "primary", "primary-foreground", 4.5),
    ("on-primary-container/primary-container", "on-primary-container", "primary-container", 4.5),
    ("on-secondary-container/secondary-container", "on-secondary-container", "secondary-container", 4.5),
    ("on-tertiary-container/tertiary-container", "on-tertiary-container", "tertiary-container", 4.5),
    ("tertiary/card", "tertiary", "card", 3.0),
    ("primary/background (text-primary)", "primary", "background", 4.5),
    ("success/background", "success", "background", 3.0),
    ("success-foreground/success", "success-foreground", "success", 4.5),
    ("warning/background", "warning", "background", 3.0),
    ("destructive/background", "destructive", "background", 3.0),
    ("destructive-foreground/destructive", "destructive-foreground", "destructive", 4.5),
    ("inverse-on-surface/inverse-surface", "inverse-on-surface", "inverse-surface", 4.5),
    ("ring/background", "ring", "background", 3.0),
    ("accent-foreground/accent", "accent-foreground", "accent", 4.5),
    ("foreground/card", "foreground", "card", 4.5),
]

for name, pal in (("CHIARO (bosco di luce)", LIGHT), ("SCURO (bosco di notte)", DARK)):
    print(f"\n===== TEMA {name} =====")
    print(f"{'token':<34}{'hex':<10}{'hsl':<22}contrasto vs bg/card")
    for k, v in pal.items():
        print(f"{k:<34}{v:<10}{hsl_str(v):<22}")
    print("\n-- Verifica contrasto WCAG --")
    fails = 0
    for label, a, b, minc in PAIRS:
        c = contrast(pal[a], pal[b])
        ok = c >= minc
        fails += 0 if ok else 1
        print(f"{'OK ' if ok else 'FAIL'} {label:<40} {c:.2f}:1  (min {minc}:1)")
    print(f"\n-> {fails} coppie sotto soglia")
