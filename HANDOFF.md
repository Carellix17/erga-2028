# HANDOFF

Questo file serve come guida di riferimento per il coding agent che lavora allo sviluppo di Erga. Contiene tutte le informazioni tecniche fondamentali per orientarsi nel progetto, comprendere la struttura esistente e prendere decisioni coerenti con l'architettura attuale.

---

## GOAL
file in corso di progettazione

---

## FEATURES
file in corso di progettazione

---

## STACK

Erga è una piattaforma educativa moderna costruita su uno stack tecnologico completo e ben strutturato. Di seguito viene descritto in dettaglio ogni componente, dall'interfaccia utente fino all'infrastruttura cloud, organizzato per livelli logici.


### 🎨 **Livello di Presentazione (Frontend UI)**

#### Framework e Runtime
- **React 18.3.1**: Libreria principale per la costruzione dell'interfaccia utente, con supporto completo per componenti funzionali, hook e concurrent features
- **TypeScript 5.8.3**: Tipizzazione statica per tutto il codice frontend, garantendo sicurezza e manutenibilità
- **Vite 5.4.19**: Bundler ultra-veloce per lo sviluppo e la build di produzione, configurato con plugin React SWC per transpiling ottimizzato
- **PWA (Progressive Web App)**: Supporto nativo tramite `vite-plugin-pwa` e Workbox, con service worker (`sw.ts`) per caching, notifiche push e installazione offline

#### Styling e Design System
- **Tailwind CSS 3.4.17**: Framework utility-first per lo styling, con configurazione personalizzata che estende il design system di Erga
- **shadcn/ui**: Raccolta di componenti accessibili e personalizzabili, basati su Radix UI e costruiti con Tailwind
- **Radix UI**: Libreria di primitive UI non stilizzate (accordion, dialog, select, tabs, toast, tooltip, ecc.) che fornisce accessibilità e comportamenti standard out-of-the-box
- **Custom Design Tokens**: Sistema di design token completo in `src/index.css` con:
  - Colori tematici per materia (terracotta, polvere, ocra, prugna, crepuscolo, mare, violetto, cipria, grafite, miele, neutro, bosco, oliva)
  - Palette per tema chiaro/scuro con sfumature di avorio (#F6F3EB), carta (#FFFEF9), inchiostro (#252623)
  - Variabili CSS per contrasto automatico, superfici, bordi, stati (success, warning, error)
  - Supporto per contrasto automatico tramite `autoContrast.ts` che adatta dinamicamente il testo in base allo sfondo

#### Componenti e Struttura UI
- **Componenti Organizzati**: La cartella `src/components/` contiene componenti raggruppati per dominio:
  - `auth/`: Componenti di autenticazione
  - `chat/`: Interfaccia di chat e conversazioni
  - `core/`: Componenti fondamentali riutilizzabili
  - `demo/`: Componenti per la modalità demo
  - `focus/`: Componenti per la funzionalità di focus studio
  - `home/`: Componenti della dashboard principale
  - `landing/`: Componenti della pagina pubblica
  - `layout/`: Layout e strutture di pagina
  - `onboarding/`: Componenti per il flusso di onboarding
  - `piano/`: Componenti per la pianificazione studio
  - `pratica/`: Componenti per esercizi e pratica
  - `profile/`: Componenti del profilo utente
  - `settings/`: Componenti delle impostazioni
  - `shared/`: Componenti condivisi (ErrorBoundary, SplashScreen, SeoHead)
  - `studio/`: Componenti per l'area di studio
  - `subscription/`: Componenti per la gestione abbonamenti
  - `ui/`: Componenti shadcn/ui personalizzati
  - `upload/`: Componenti per il caricamento file

#### Animazioni e Interazioni
- **Framer Motion 12.42.2**: Libreria per animazioni fluide e interazioni complesse
- **react-resizable-panels 2.1.9**: Pannelli ridimensionabili per layout flessibili
- **embla-carousel-react 8.6.0**: Carosello performante e accessibile
- **vaul 0.9.9**: Componenti per drawer accessibili


### 🧠 **Livello di Logica Applicativa**

#### State Management
- **TanStack Query 5.83.0** (React Query): Gestione centrale dello stato server-side con:
  - Caching intelligente con `query-sync-storage-persister` per persistenza in localStorage
  - Configurazione ottimizzata per query (staleTime: 5 minuti, gcTime: 30 minuti)
  - Gestione automatica del refetch e retry
  - Persistenza selettiva: solo le query del dominio "lessons" vengono dehydrate per 24 ore

#### Routing
- **React Router DOM 6.30.1**: Routing dichiarativo con:
  - Lazy loading delle pagine tramite `React.lazy()` e `Suspense`
  - Protected routes per aree autenticate
  - Gestione ottimizzata del code splitting

#### Form e Validazione
- **React Hook Form 7.61.1**: Gestione form performante con validazione integrata
- **Zod 4.4.3**: Schema validation per dati e form, usato insieme a `@hookform/resolvers`
- **input-otp 1.4.2**: Componenti per input OTP (One-Time Password)

#### Internazionalizzazione
- **i18next 26.3.4**: Sistema di traduzione completo con:
  - `react-i18next 17.0.8`: Integrazione React
  - `i18next-browser-languagedetector 8.2.1`: Rilevamento automatico lingua browser
  - Supporto per Italiano e Inglese (`src/i18n/locales/`)
  - Persistenza preferenze lingua in localStorage

#### Gestione Tema e Accessibilità
- **next-themes 0.3.0**: Gestione tema chiaro/scuro con persistenza
- **Context API**: Contesti personalizzati per:
  - `AuthContext`: Gestione autenticazione e sessione utente
  - `ThemeContext`: Gestione tema e preferenze visuali
  - `FocusContext`: Gestione stato di focus studio
  - `SaveStatusContext`: Gestione stato di salvataggio dati
  - `AccessibilityContext`: Gestione preferenze accessibilità

#### Utility e Hooks
- **Hooks Personalizzati** (`src/hooks/`): Oltre 30 hooks custom per:
  - Gestione dati utente (`useUserData`, `useProfileData`, `useUserSubjects`, `useUserRoutines`)
  - Gestione lezioni e studio (`useLessons`, `useLessonFigures`, `useLessonModules`, `useLessonParts`, `useLessonExercises`)
  - Gestione contesti studio (`useFileContexts`, `useStudyContexts`)
  - Gestione valutazioni cognitive (`useCognitiveProfile`, `useEvaluations`)
  - Gestione focus e statistiche (`useFocusStats`, `useStudyEvents`, `useStudyTutor`)
  - Gestione abbonamenti (`useSubscription`)
  - Gestione notifiche push (`usePushNotifications`)
  - Gestione immagini corsi (`useCourseImage`)
  - Gestione demo (`useDemoHandoff`)
  - Utility varie (`useDelayedLoading`, `useHaptics`, `useKeyboardInset`, `usePrefersReducedMotion`)

- **Lib Utility** (`src/lib/`): Funzioni e logiche di business:
  - `autoContrast.ts`: Sistema di contrasto automatico per testo su sfondi colorati
  - `courseIdentity.ts`: Gestione identità e colori dei corsi
  - `subjectColors.ts`: Mappatura colori per materia
  - `chatProtocol.ts`: Protocollo per gestione chat AI
  - `cognitiveQuestions.ts`: Domande per valutazione cognitiva
  - `cognitiveArchetype.ts`: Archetipi cognitivi
  - `exerciseQuality.ts`: Valutazione qualità esercizi
  - `focusStats.ts`: Calcolo statistiche focus
  - `homeDashboard.ts`: Logica dashboard principale
  - `imageCompression.ts`: Compressione immagini
  - `lessonExercises.ts`, `lessonModules.ts`, `lessonParts.ts`: Gestione struttura lezioni
  - `onboardingGate.ts`: Gestione gate onboarding
  - `paddle.ts`: Integrazione sistema pagamenti
  - `pdfPageRenderer.ts`: Rendering pagine PDF
  - `pianoPalette.ts`: Palette colori per piani studio
  - `routineLayout.ts`: Layout routine studio
  - `sourcePaths.ts`: Percorsi risorse
  - `weekPlanner.ts`: Pianificatore settimanale
  - `widgets.ts`: Gestione widget
  - `wikipediaImage.ts`: Recupero immagini Wikipedia


### 🔌 **Livello di Integrazione e API**

#### MCP (Model Context Protocol)
- **@lovable.dev/mcp-js 0.20.0**: Framework per integrazione con AI tramite Model Context Protocol
- **Definizione MCP** (`src/lib/mcp/index.ts`): Server MCP "erga-mcp" con tools per:
  - `list_study_contexts`: Elencare contesti studio dell'utente
  - `get_study_context`: Recuperare testo estratto da un contesto
  - `list_lessons`: Elencare mini-lezioni per un contesto
  - `get_lesson`: Recuperare una singola mini-lezione
- **Autenticazione MCP**: OAuth tramite Supabase Auth

#### Lovable Integration
- **@lovable.dev/cloud-auth-js 1.2.0**: Autenticazione tramite Lovable Cloud
- **lovable-tagger 1.1.13**: Plugin Vite per tagging componenti (solo in sviluppo)
- **Integrazione Lovable** (`src/integrations/lovable/index.ts`):
  - Autenticazione OAuth con provider: Google, Apple, Microsoft, Lovable
  - Gestione sessione automatica con Supabase
  - Supporto per preview in iframe (Lovable editor)


### 🗃️ **Livello Dati (Database e Storage)**

#### Database
- **Supabase**: Piattaforma backend-as-a-service basata su PostgreSQL
- **Drizzle ORM 0.45.2**: ORM leggero e type-safe per interazione con database
  - Configurazione in `drizzle.config.ts`
  - Schema auto-generato da database Supabase
  - Migrazioni gestite tramite `drizzle-kit 0.31.10`

#### Schema Database (principali tabelle)
- **ai_usage**: Tracciamento utilizzo AI (token, durata, modello, provider)
- **chat_conversations**: Conversazioni chat con utente, contesto, titolo
- **study_contexts**: Contesti di studio (materiali caricati dall'utente)
- **lessons**: Lezioni e mini-lezioni generate
- **evaluations**: Valutazioni cognitive e progressi
- **user_profiles**: Profili utente con preferenze e dati personali
- **user_subjects**: Materie associate all'utente
- **user_routines**: Routine e abitudini di studio
- **subscriptions**: Gestione abbonamenti e pagamenti
- **focus_sessions**: Sessioni di focus con statistiche
- **file_contexts**: Contesti file (PDF, documenti caricati)

#### Storage
- **Supabase Storage**: Archiviazione file (PDF, immagini, risorse)
- **Local Storage**: Cache client-side per:
  - Persistenza query TanStack Query (24 ore per dominio "lessons")
  - Preferenze utente (tema, lingua)
  - Dati di sessione


### 🔐 **Livello Autenticazione e Sicurezza**

#### Autenticazione
- **Supabase Auth**: Sistema di autenticazione completo con:
  - OAuth providers (Google, Apple, Microsoft)
  - Email/password
  - Magic link
  - Gestione sessioni persistenti
  - Token refresh automatico
- **AuthContext** (`src/contexts/AuthContext.tsx`):
  - Gestione stato autenticazione
  - Invio email di benvenuto al primo accesso
  - Timeout di 2 secondi per lettura sessione iniziale
  - Gestione errori e loading state

#### Sicurezza
- **Protected Routes**: Componenti che richiedono autenticazione
- **Service Worker Guard**: Protezione contro registrazione service worker in iframe/preview
- **CORS e CSP**: Configurazioni di sicurezza lato server


### ☁️ **Livello Cloud e Infrastruttura**

#### Lovable Cloud
- **Piattaforma**: Lovable Cloud (gestibile solo tramite Lovable)
- **Deploy**: Edge functions e frontend tramite Lovable
- **Preview**: Supporto nativo per anteprime in tempo reale
- **Ambienti**: Sviluppo, staging e produzione gestiti tramite Lovable

#### Supabase Project
- **Project Reference**: Configurato tramite variabili d'ambiente (`VITE_SUPABASE_PROJECT_ID`)
- **Edge Functions**: Funzioni serverless per:
  - Invio email di benvenuto (`send-welcome-email`)
  - Elaborazione dati
  - Integrazione con servizi esterni
- **Configurazione**: `supabase/config.toml` per definizione progetto

#### Configurazione Ambiente
- **Variabili d'Ambiente**:
  - `VITE_SUPABASE_URL`: URL istanza Supabase
  - `VITE_SUPABASE_PUBLISHABLE_KEY`: Chiave pubblica Supabase
  - `VITE_SUPABASE_PROJECT_ID`: ID progetto Supabase
  - `LOVABLE_DB_MIGRATION_URL`: URL per migrazioni database
  - Variabili per pagamenti (Paddle)
  - Variabili per notifiche push

- **File di Configurazione**:
  - `.env.example`: Template variabili d'ambiente
  - `.env.development`: Configurazione sviluppo
  - `.env.production`: Configurazione produzione


### 🛠️ **Livello Build e Tooling**

#### Package Manager
- **Bun**: Runtime JavaScript/TypeScript usato come package manager e per esecuzione script

#### Linting e Formattazione
- **ESLint 9.32.0**: Linting con configurazione personalizzata
- **TypeScript ESLint 8.38.0**: Plugin TypeScript per ESLint
- **React Hooks ESLint 5.2.0**: Plugin per linting React hooks
- **React Refresh ESLint 0.4.20**: Plugin per linting React Fast Refresh

#### Testing
- **Vitest 3.2.4**: Framework testing unitario e di integrazione
- **@testing-library/react 16.0.0**: Utility per testing componenti React
- **@testing-library/jest-dom 6.6.0**: Matcher DOM per Jest
- **@testing-library/dom 10.4.1**: Utility testing DOM
- **jsdom 29.1.1**: Implementazione DOM per testing

#### Styling Tooling
- **PostCSS 8.5.6**: Processatore CSS con:
  - `autoprefixer 10.4.21`: Aggiunta prefissi vendor
  - `tailwindcss 3.4.17`: Plugin Tailwind
  - `@tailwindcss/typography 0.5.16`: Plugin tipografia Tailwind


### 📱 **Livello Piattaforma e Distribuzione**

#### Target Piattaforme
- **Web**: Applicazione web responsive con supporto PWA
- **iOS**: Supporto tramite Capacitor o wrapper nativo (da configurare)
- **Android**: Supporto tramite Capacitor o wrapper nativo (da configurare)

#### PWA (Progressive Web App)
- **Service Worker** (`src/sw.ts`):
  - Precaching risorse con Workbox
  - Gestione notifiche push
  - Cleanup cache obsolete
  - Gestione navigazione offline
- **Manifest**: Configurazione PWA in `vite.config.ts` con:
  - Nome: "Erga - Ridefinisci lo studio"
  - Tema: #0a0a0a (scuro)
  - Sfondo: #f5f5f5 (chiaro)
  - Icone: 192x192, 512x512
  - Lingua: Italiano
  - Display: Standalone

#### Notifiche Push
- **Web Push API**: Supporto nativo per notifiche browser
- **Service Worker**: Gestione event listener per:
  - `push`: Ricezione notifiche
  - `notificationclick`: Gestione click su notifica


### 📊 **Livello Analisi e Monitoraggio**

#### Tracciamento Utilizzo AI
- **Tabella `ai_usage`**: Registrazione dettagliata di:
  - Token di completamento e prompt
  - Durata elaborazione
  - Modello e provider utilizzati
  - Stato e esito operazioni
  - Associazione con utente

#### Statistiche Studio
- **Focus Stats**: Tracciamento tempo e qualità studio
- **Study Events**: Registrazione eventi di studio (inizio, fine, pause)
- **Evaluations**: Valutazione progressi e competenze acquisite


### 🎯 **Architettura Complessiva**

```
┌─────────────────────────────────────────────────────────────┐
│                      UTENTE (Browser/Mobile)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PWA (Service Worker)                         │
│  - Precaching (Workbox)                                        │
│  - Notifiche Push                                              │
│  - Gestione Offline                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routing   │  │   State      │  │    UI Components     │  │
│  │ (React      │  │ (TanStack   │  │ (shadcn + Radix +    │  │
│  │  Router)    │  │  Query)     │  │  Tailwind)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Contexts   │  │   Hooks      │  │    i18n              │  │
│  │ (Auth,      │  │ (Custom)     │  │ (i18next)           │  │
│  │  Theme,     │  │             │  │                      │  │
│  │  Focus)     │  │             │  │                      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTEGRAZIONI                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  MCP Server  │  │  Lovable     │  │    Supabase Client   │  │
│  │ (AI Tools)   │  │  Auth        │  │ (Database, Storage,  │  │
│  └─────────────┘  └─────────────┘  │   Auth, Functions)    │  │
│                                      └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LOVABLE CLOUD                                 │
│  - Hosting Frontend                                            │
│  - Edge Functions                                              │
│  - Gestione Deploy e Preview                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  PostgreSQL  │  │   Storage    │  │   Edge Functions     │  │
│  │ (Database)   │  │ (File)       │  │ (Serverless)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Auth (OAuth, Email, etc.)                 │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```


### 📁 **Struttura Cartelle Progetto**

```
erga-2028/
├── public/                    # Risorse statiche (font, icone, immagini)
├── src/
│   ├── App.tsx               # Componente radice applicazione
│   ├── main.tsx              # Entry point React
│   ├── sw.ts                 # Service Worker PWA
│   ├── index.css             # Stili globali e design tokens
│   ├── vite-env.d.ts          # Tipi Vite
│   │
│   ├── components/           # Componenti React
│   │   ├── ui/               # Componenti shadcn/ui
│   │   ├── auth/             # Componenti autenticazione
│   │   ├── chat/             # Componenti chat
│   │   ├── shared/           # Componenti condivisi
│   │   └── ...               # Altri componenti per dominio
│   │
│   ├── contexts/             # React Contexts
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   ├── FocusContext.tsx
│   │   ├── SaveStatusContext.tsx
│   │   └── AccessibilityContext.tsx
│   │
│   ├── hooks/                # Custom hooks
│   │   ├── useLessons.ts
│   │   ├── useUserData.ts
│   │   ├── useCognitiveProfile.ts
│   │   └── ... (30+ hooks)
│   │
│   ├── lib/                  # Librerie e utility
│   │   ├── mcp/              # MCP Server e tools
│   │   │   ├── index.ts
│   │   │   └── tools/
│   │   ├── autoContrast.ts
│   │   ├── courseIdentity.ts
│   │   ├── subjectColors.ts
│   │   └── ... (20+ utility)
│   │
│   ├── integrations/         # Integrazioni esterne
│   │   ├── supabase/
│   │   │   ├── client.ts     # Client Supabase
│   │   │   └── types.ts      # Tipi TypeScript auto-generati
│   │   └── lovable/
│   │       └── index.ts      # Integrazione Lovable Auth
│   │
│   ├── pages/                # Pagine applicazione
│   │   ├── Index.tsx         # Dashboard principale
│   │   ├── Landing.tsx       # Pagina pubblica
│   │   ├── Login.tsx         # Pagina login
│   │   ├── Registrati.tsx    # Pagina registrazione
│   │   └── settings/         # Pagine impostazioni
│   │
│   ├── i18n/                # Internazionalizzazione
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── it.json
│   │       └── en.json
│   │
│   └── assets/               # Risorse locali
│
├── drizzle/                  # Configurazione Drizzle ORM
│   ├── config.ts
│   └── migrations/           # Migrazioni database
│
├── supabase/                 # Configurazione Supabase
│   ├── config.toml
│   ├── functions/           # Edge Functions
│   └── migrations/          # Migrazioni Supabase
│
├── scripts/                 # Script utilità
├── .lovable/                 # Configurazione Lovable
├── .github/                  # Configurazione GitHub
│
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── README.md
```


### 🔧 **Comandi Principali**

| Comando | Descrizione |
|---------|-------------|
| `bun install` | Installa dipendenze |
| `bun run dev` | Avvia server sviluppo (porta 8080) |
| `bun run build` | Build per produzione |
| `bun run build:dev` | Build per sviluppo |
| `bun run lint` | Esegue linting |
| `bun run test` | Esegue test |
| `bun run test:watch` | Esegue test in watch mode |
| `bun run preview` | Anteprima build |


### 📝 **Convenzioni e Best Practice**

1. **Code Splitting**: Utilizzo di `React.lazy()` per lazy loading delle pagine
2. **Type Safety**: Tutto il codice è tipizzato con TypeScript
3. **Accessibilità**: Componenti Radix UI garantiscono accessibilità out-of-the-box
4. **Performance**: TanStack Query con caching intelligente e refetch ottimizzato
5. **Design System**: Utilizzo coerente dei design tokens definiti in `index.css`
6. **Error Handling**: ErrorBoundary per gestione errori a livello applicazione
7. **Loading States**: SplashScreen e stati di loading gestiti tramite Suspense
8. **PWA**: Service worker configurato per non registrarsi in iframe/preview


### 🚀 **Deploy e CI/CD**

- **Piattaforma**: Lovable Cloud (gestibile solo tramite Lovable)
- **Deploy**: Automatico tramite Lovable al push su main
- **Preview**: Generazione automatica anteprime per ogni commit
- **Migrazioni**: Gestite tramite Drizzle ORM e Supabase
- **Variabili d'Ambiente**: Configurate tramite Lovable e file `.env.*`

Per eseguire migrazioni o deploy di edge functions, utilizzare il seguente prompt per Lovable:
```
Esegui migrazioni database e deploy edge functions per il progetto Erga su Lovable Cloud.
```


---

*Ultimo aggiornamento: [Data odierna]*
