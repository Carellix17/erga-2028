#!/usr/bin/env python3
"""P24 BOSCO — applica i token della nuova palette a index.css (chirurgico)."""
import re

CSS = "src/index.css"
src = open(CSS, encoding="utf-8").read()

LIGHT = {
    "--primary": "134 33% 15%", "--primary-foreground": "130 30% 96%",
    "--primary-container": "136 27% 89%", "--on-primary-container": "139 44% 8%",
    "--secondary": "140 21% 95%", "--secondary-foreground": "146 21% 15%",
    "--secondary-container": "135 18% 91%", "--on-secondary-container": "144 22% 14%",
    "--tertiary": "132 25% 41%", "--tertiary-container": "140 25% 88%",
    "--on-tertiary-container": "139 41% 13%",
    "--gold-antique": "43 80% 31%", "--gold-antique-soft": "46 66% 89%",
    "--destructive": "8 61% 43%",
    "--error-container": "12 68% 93%", "--on-error-container": "9 72% 20%",
    "--success": "138 46% 34%", "--success-container": "138 43% 90%",
    "--on-success-container": "141 61% 15%",
    "--warning": "40 82% 32%", "--warning-container": "41 70% 88%",
    "--on-warning-container": "41 83% 14%",
    "--background": "135 20% 96%", "--foreground": "120 8% 7%",
    "--surface-dim": "136 17% 87%",
    "--surface-container-low": "140 20% 97%", "--surface-container": "140 21% 95%",
    "--surface-container-high": "135 18% 91%", "--surface-container-highest": "136 19% 88%",
    "--card-foreground": "120 8% 7%", "--popover-foreground": "120 8% 7%",
    "--muted": "140 20% 94%", "--muted-foreground": "136 6% 37%",
    "--accent": "136 27% 89%", "--accent-foreground": "139 41% 13%",
    "--outline": "150 14% 24% / 0.25", "--outline-variant": "150 14% 24% / 0.12",
    "--border": "150 14% 24% / 0.12", "--ring": "132 25% 41%",
    "--inverse-surface": "134 33% 15%", "--inverse-on-surface": "135 20% 96%",
    "--inverse-primary": "132 21% 68%",
    "--sidebar-foreground": "120 8% 7%", "--sidebar-primary": "134 33% 15%",
    "--sidebar-primary-foreground": "130 30% 96%",
    "--sidebar-accent": "140 21% 95%", "--sidebar-accent-foreground": "120 8% 7%",
    "--sidebar-border": "150 14% 24% / 0.12", "--sidebar-ring": "132 25% 41%",
}

DARK = {
    "--primary": "134 18% 86%", "--primary-foreground": "139 44% 8%",
    "--primary-container": "139 29% 19%", "--on-primary-container": "135 26% 85%",
    "--secondary": "144 31% 13%", "--secondary-foreground": "135 22% 93%",
    "--secondary-container": "141 28% 16%", "--on-secondary-container": "140 24% 90%",
    "--tertiary": "132 21% 68%", "--tertiary-foreground": "139 44% 8%",
    "--tertiary-container": "139 33% 17%", "--on-tertiary-container": "135 26% 85%",
    "--gold-antique": "44 48% 59%", "--gold-antique-soft": "42 38% 12%",
    "--destructive": "9 65% 64%",
    "--error-container": "7 53% 15%", "--on-error-container": "10 73% 81%",
    "--success": "135 37% 59%", "--success-foreground": "139 44% 8%",
    "--success-container": "139 35% 14%",
    "--warning": "40 68% 61%", "--warning-foreground": "139 44% 8%",
    "--warning-container": "39 53% 15%",
    "--background": "138 36% 9%", "--foreground": "135 22% 93%",
    "--surface-dim": "145 35% 7%", "--surface-bright": "139 29% 19%",
    "--surface-container-lowest": "140 31% 6%", "--surface-container-low": "148 32% 10%",
    "--surface-container": "134 33% 15%", "--surface-container-high": "139 33% 17%",
    "--surface-container-highest": "139 31% 20%",
    "--card": "134 33% 15%", "--card-foreground": "135 22% 93%",
    "--popover": "140 33% 12%", "--popover-foreground": "135 22% 93%",
    "--muted": "144 31% 13%", "--muted-foreground": "141 11% 69%",
    "--accent": "139 33% 17%", "--accent-foreground": "135 26% 85%",
    "--outline": "150 20% 90% / 0.16", "--outline-variant": "150 20% 90% / 0.08",
    "--border": "150 20% 90% / 0.10", "--input": "148 32% 10%",
    "--ring": "132 21% 68%",
    "--inverse-surface": "135 18% 91%", "--inverse-on-surface": "138 36% 9%",
    "--inverse-primary": "132 25% 41%",
    "--sidebar-background": "138 36% 9%", "--sidebar-foreground": "135 22% 93%",
    "--sidebar-primary": "134 18% 86%", "--sidebar-primary-foreground": "139 44% 8%",
    "--sidebar-accent": "139 33% 17%", "--sidebar-accent-foreground": "135 22% 93%",
    "--sidebar-border": "150 20% 90% / 0.10", "--sidebar-ring": "132 21% 68%",
}

def apply_block(s, a, b, mapping):
    blk = s[a:b]
    for name, val in mapping.items():
        blk2 = re.sub(rf"^\s*({re.escape(name)}\s*:\s*)[^;]+(;)", rf"\g<1>{val}\g<2>", blk, count=1, flags=re.M)
        if blk2 == blk:
            print(f"  [AVVISO] {name} non trovato nel blocco")
        blk = blk2
    return s[:a] + blk + s[b:]

def block(s, start_marker, end_marker):
    i = s.index(start_marker)
    j = s.index(end_marker, i)
    return i, j

# Applica DAL BASSO VERSO L'ALTO così gli indici trovati restano validi
# a ogni passo (le sostituzioni precedenti sono tutte PIÙ GIÙ nel file).

# 1) angoli (secondo :root)
i_r, j_r = block(src, ":root {", ".force-light {")
src = apply_block(src, i_r, j_r, {
    "--radius-lg": "1rem",
    "--radius-xl": "1.25rem",
})
print("1/4 angoli (radii)")

# 2) vetrina force-light
i_f, j_f = block(src, ".force-light {", "@keyframes cinematic-enter")
src = apply_block(src, i_f, j_f, LIGHT)
print("2/4 vetrina force-light")

# 3) tema scuro
i_d, j_d = block(src, ".dark {", ":root {")
src = apply_block(src, i_d, j_d, DARK)
print("3/4 tema scuro")

# 4) tema chiaro (il primo :root)
i_l, j_l = block(src, ":root {", ".dark {")
src = apply_block(src, i_l, j_l, LIGHT)
print("4/4 tema chiaro")

# ── commenti di testata ──
src = src.replace(
    """   ERGA OPAL — FONDAMENTA (P21a)
   Nero pieno / carta avorio, carbone OPACO (vetro abolito),
   pill-firma, Inter ovunque, UNA goccia di salvia (🌿).
   REGOLA DEL PALCO: intonsa (vedi sotto, mai toccarla).""",
    """   ERGA BOSCO — FONDAMENTA (P24)
   Bosco di luce (salvia/menta) / Bosco di notte (verde profondo),
   superfici OPACHE (vetro abolito), pill-firma verde bosco,
   Plus Jakarta Sans ovunque, salvia come voce di casa.
   REGOLA DEL PALCO: intonsa (vedi sotto, mai toccarla).""")
src = src.replace(
    '/* ─── Erga OPAL "Carta" (tema chiaro, default) — avorio editoriale ─── */',
    '/* ─── Erga BOSCO "Bosco di luce" (tema chiaro, default) — menta e salvia ─── */')
src = src.replace(
    '/* ─── Erga OPAL "Noir" (tema scuro) — nero pieno, carbone, salvia ─── */',
    '/* ─── Erga BOSCO "Bosco di notte" (tema scuro) — verde profondo, carbone ─── */')
src = src.replace(
    '/* ─── Radii Opal — angoli grandi, bottoni sempre a pillola ─── */',
    '/* ─── Radii Bosco — angoli grandi, bottoni sempre a pillola ─── */')
src = src.replace(
    '/* Inchiostro — la pill primaria è NERA su carta (firma Opal invertita) */',
    '/* Bosco scuro — la pill-firma è VERDE BOSCO su menta */')
src = src.replace(
    '/* avorio #FAF7F3 */',
    '/* menta #F3F7F4 */')
src = src.replace(
    '/* nero #080808 */',
    '/* bosco profondo #0F2014 */')

# ── font: Inter → Plus Jakarta Sans (con fallback Inter) ──
n_font = src.count("font-family: 'Inter',")
src = src.replace("font-family: 'Inter',", "font-family: 'Plus Jakarta Sans', 'Inter',")
print(f"font-family aggiornate: {n_font}")

open(CSS, "w", encoding="utf-8").write(src)
print("OK — index.css aggiornato")
