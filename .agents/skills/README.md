# Catalogo unificato delle skill

Questa è la cartella unica delle skill che gli assistenti possono utilizzare nel progetto Erga.
Le cartelle `.claude/skills/` contengono collegamenti a queste copie, mentre `.github/skills/impeccable/` è la copia richiesta dall'installer di Impeccable per GitHub Copilot.

Prima di usare una skill, leggere `PRODUCT.md` e `AGENTS.md`: le regole specifiche di Erga hanno precedenza sulle indicazioni generiche.

## Progettazione UI e frontend

| Skill | Uso principale |
|---|---|
| `impeccable` | Shape, audit, critique, polish, harden, adapt, animate, optimize e altri workflow UI completi. |
| `ui-ux-pro-max` | Ricerca di design system, colori, tipografia, pattern, UX e linee guida specifiche per stack. |
| `frontend-design` | Creazione di interfacce riconoscibili e production-ready evitando risultati generici. |
| `design-taste-frontend` | Landing page e superfici marketing anti-template; non va applicata automaticamente alle dashboard operative. |

## Motion e design engineering

| Skill | Uso principale |
|---|---|
| `animate` | Progettare e implementare un'animazione web con scopo, timing e uscita corretti. |
| `review-animations` | Revisionare con severità un'animazione esistente. |
| `find-animation-opportunities` | Individuare dove il movimento sarebbe utile e dove andrebbe evitato. |
| `improve-animations` | Audit complessivo del motion e piano di miglioramento. |
| `animation-vocabulary` | Trovare il nome preciso di un effetto o comportamento animato. |
| `emil-design-eng` | Rifinitura di componenti, interazioni e dettagli di design engineering. |
| `apple-design` | Principi Apple per gesti, spring, profondità, materiali e feedback. |

## Esperienze immersive

| Skill | Uso principale |
|---|---|
| `scroll-experience` | Scroll storytelling, sticky section e parallax senza scroll hijacking. |
| `3d-web-experience` | Three.js, React Three Fiber, WebGL, Spline e fallback statici. |

## Componenti e strumenti

| Skill | Uso principale |
|---|---|
| `ask-sonner` | Toast Sonner, promise toast, aggiornamenti, temi e risoluzione problemi. |
| `pick-ui-library` | Scelta motivata della libreria adatta a uno specifico problema frontend. |
| `prototype` | Creazione di varianti realmente diverse da confrontare prima di sceglierne una. |

## Skill specifiche di altre piattaforme

| Skill | Uso principale |
|---|---|
| `animate-expo` | Animazioni per React Native ed Expo. Non si applica alla web app attuale salvo futura app nativa. |
| `write-swift` | Swift moderno e concorrenza Swift 6. Non si applica alla web app attuale salvo futuro client iOS nativo. |

## Licenze e aggiornamenti

- Le licenze sono in `_licenses/` e, quando richiesto dalla skill, anche nella rispettiva cartella.
- Le skill installate tramite `skills` sono registrate in `skills-lock.json`.
- Impeccable viene aggiornato con `npx impeccable skills update`.
- Le altre skill installate tramite CLI vengono aggiornate con `npx skills update -p -y`.
