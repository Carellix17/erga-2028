
The user wants a complete visual restyling — Duolingo + Apple inspired, mobile-first, premium. They referenced screenshots (image_0..image_4) but no images are attached in this turn. I'll proceed with their detailed written spec.

Key constraints:
- Logic untouched (PDF, AI, backend)
- Mobile-first (390px viewport confirmed)
- Light mode focus, white bg, intense blue accent
- Glow borders (Magic UI border-beam style)
- Bottom tab bar already exists (`BottomNav.tsx`) — needs restyling, not replacement
- App already has `framer-motion`, `clsx`, `tailwind-merge` installed
- Current system uses MD3 Expressive — this is a paradigm shift to iOS/Duolingo style

I should NOT change the navigation structure (Studio/Piano/Pratica/Profilo) — user said "Dashboard, Profilo, Impostazioni" generically but the actual app has 4 tabs that must remain.

Let me keep the plan tight and focused.
