# Refactor PLG: Landing anonima + Demo Sandbox + Soft Auth Wall

## Obiettivo
Trasformare Erga da "auth-first" a "product-led": chiunque atterra sulla home può provare una micro-lezione demo senza registrarsi. La registrazione è triggered solo al termine del quiz, con associazione dell'Esagono cognitivo appena generato.

## 1. Routing & Auth Guard

**`src/App.tsx`**
- La route `/` diventa pubblica: rende il nuovo componente `<Landing />` **senza** wrappare in `<ProtectedRoute>`.
- Aggiunta route `/app` (protetta) che monta l'attuale `<Index />` (dashboard privata).
- `/login` e `/registrati` restano invariate.

**`src/pages/Landing.tsx`** (nuovo)
- Se `isAuthenticated` → `<Navigate to="/app" replace />`.
- Altrimenti mostra la landing anonima.

**`ProtectedRoute`** invariato (redirige a `/login` chi tenta di aprire `/app` senza sessione).

## 2. Landing Page (design minimale premium)

Layout iper-minimale, ampio white-space, tipografia Serif per il titolo (riutilizzo `font-display` già presente — Fraunces/Inter fallback), container glassmorphic puliti (`backdrop-blur-md`, `border-white/40`, `rounded-3xl`).

Struttura:
```text
┌─────────────────────────────────────────┐
│  logo Erga  ·  [Accedi]  [Registrati]   │
├─────────────────────────────────────────┤
│                                         │
│        Studia qualsiasi cosa.           │  ← h1 serif
│        In 3 slide.                      │
│                                         │
│   ┌───────────────────────────────┐     │
│   │  [drag & drop PDF singolo]    │     │  ← dropzone
│   │  oppure                        │     │
│   │  [ input: "Lamarck..."      ]  │     │
│   │  [ Inizia Lezione Demo → ]     │     │  ← CTA prominente
│   └───────────────────────────────┘     │
│                                         │
│   Nessuna registrazione richiesta.      │
└─────────────────────────────────────────┘
```

## 3. Sandbox Demo (senza persistenza cloud)

**`src/components/demo/DemoFlow.tsx`** (nuovo) — gestisce l'intero flusso ospite in memoria locale:

1. **Input** (PDF o argomento testuale)
2. **Generazione** → chiama edge function `generate-lessons` con flag `guest: true` e `maxSlides: 3` (path esistente, no auth richiesta in modalità demo — vedi §5). Se PDF, prima `extract-pdf`.
3. **Slide** (max 3) → mini-renderer che riusa lo stile di `FullscreenLesson` ma consuma dati da state locale.
4. **Quiz** (3-5 domande chiuse) → generato inline, risposte tracciate in state.
5. **Esagono** → calcolo scores LOG/MEM/FOC/VOC/ANS/APP dalle risposte demo (heuristic locale, riuso `CognitiveRadar` per il chart).
6. **Auth Wall Modal** → glassmorphism, titolo "Consolida la tua conoscenza.", sottotitolo indicato, form email/password + Google inline (riuso componenti di `Login.tsx`).

Storage: `localStorage['erga_demo_state']` con `{ topic, slides, quiz, answers, hexagon, completedAt }`. Nessuna INSERT su Supabase.

Elementi UI disabilitati (opacità 40%, cursor-not-allowed, tooltip "Disponibile dopo la registrazione"): pulsanti "Vista Grafo", "Salva percorso", "Storico".

## 4. Trigger registrazione & handoff Esagono

Alla submit riuscita del form nel modal:
- Login/signup via `supabase.auth` (flusso attuale invariato).
- `onAuthStateChange` (SIGNED_IN) → hook `useDemoHandoff` legge `localStorage['erga_demo_state']`, chiama edge function `cognitive-profile` (POST) per persistere l'esagono ospite sul nuovo user_id, poi pulisce localStorage e naviga a `/app`.
- Setta `has_completed_onboarding = true` per skippare l'onboarding cognitivo (l'utente lo ha già fatto in demo).

## 5. Edge functions

**`generate-lessons`** — aggiunta modalità guest:
- Se header `x-erga-guest: 1` e nessun JWT valido → non richiede auth, non scrive su DB, ritorna slides in-memory (max 3), non incrementa `generation_count`. Usa rate limiting per IP (semplice mappa in-function o skip per ora).

**Alternativa più sicura**: creare `generate-lessons-demo` dedicata, con prompt ridotto (3 slide + 3-5 quiz), completamente stateless. Preferisco questa per non toccare la funzione core.

**`cognitive-profile`** — nessuna modifica: al primo login post-demo, il client fa POST normale con gli scores calcolati in locale.

## 6. File impattati

Nuovi:
- `src/pages/Landing.tsx`
- `src/components/demo/DemoFlow.tsx`
- `src/components/demo/DemoDropzone.tsx`
- `src/components/demo/DemoSlides.tsx`
- `src/components/demo/DemoQuiz.tsx`
- `src/components/demo/DemoAuthWall.tsx`
- `src/hooks/useDemoState.ts`
- `src/hooks/useDemoHandoff.ts`
- `supabase/functions/generate-lessons-demo/index.ts`

Modificati:
- `src/App.tsx` (routing)
- `src/pages/Login.tsx` (post-login redirect → se demo state presente, handoff)
- `src/pages/Registrati.tsx` (idem)
- `src/pages/Index.tsx` (route `/app`, invariato altrimenti)
- `supabase/config.toml` (registra nuova edge function)

## 7. Fuori scope

- Nessuna modifica a schema DB.
- Nessuna nuova libreria.
- Nessun cambio al design system globale.
- Componenti dashboard (Studio/Piano/Pratica/Profilo) invariati.

## Note tecniche
- L'esagono ospite è euristico: mappa risposte quiz → 6 scores. Trasparente, si può raffinare.
- Se JWT valido presente sulla landing → immediato redirect, la demo non parte.
- Localstorage cleanup dopo handoff riuscito per evitare re-import.
