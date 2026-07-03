## Obiettivo

Eliminare del tutto la dark mode dall'app: un solo look, sempre chiaro e coerente con la landing (`bg-[#FCFCFC]`, testi slate, accenti colore materia solo su nodi lezione/badge).

## Cosa cambia

### 1. Runtime tema
- **`src/contexts/ThemeContext.tsx`** — Semplifico il provider: rimuovo il tipo `"dark"`, rimuovo la lettura da `user_data`, rimuovo `setTheme`. Il provider si limita a garantire che `document.documentElement` non abbia mai la classe `.dark` e imposta il meta `theme-color` fisso a `#FCFCFC`. `useTheme()` continua a esistere ma ritorna sempre `"light"` per non rompere i consumer.
- **`src/index.css`** — Rimuovo l'intero blocco `.dark { … }` (righe ~123-199) con tutti i token dark. Restano solo i token `:root` chiari già allineati a Erga editorial.

### 2. Toggle UI e chiamate a `setTheme`
- Trovo e rimuovo qualunque toggle "Aspetto / Tema chiaro-scuro" nelle viste profilo/impostazioni (probabile in `src/components/profile/ProfileView.tsx`).
- Rimuovo import/uso di `useTheme` dove serve solo per il toggle; lascio dove serve per compat.

### 3. Pulizia varianti `dark:*` nei componenti /app
Passo file per file e cancello ogni variante `dark:bg-black/…`, `dark:bg-white/…`, `dark:border-white/…`, `dark:text-…`, `dark:prose-…` così il markup resta pulito e non re-introduce look scuri. Non tocco:
- la logica JS/TS,
- le classi light (base),
- i colori dinamici per materia in `src/lib/subjectColors.ts` (che restano l'unico accento colore, applicato solo su nodi/percorso/badge lezione come richiesto).

File coinvolti (elenco derivato dalla mia ricerca `rg "dark:"`):
- `src/components/layout/AppHeader.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/ui/card.tsx`
- `src/components/onboarding/CognitiveOnboarding.tsx`
- `src/components/pratica/InterrogazioneView.tsx`
- `src/components/pratica/EserciziView.tsx`
- `src/components/pratica/PraticaView.tsx`
- `src/components/chat/ChatView.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`, `ChatHistory.tsx`, `QuickActions.tsx`
- `src/components/studio/StudioView.tsx`, `LessonsList.tsx`, `FullscreenLesson.tsx`, `MiniLesson.tsx`, `CourseSelector.tsx`, `FinalTest.tsx`, `GenerationProgress.tsx`, `LessonFigureGallery.tsx`, `PdfCrop.tsx`
- `src/components/piano/PianoView.tsx`, `PlanItem.tsx`, `PlanSuggestion.tsx`, `AddEventSheet.tsx`
- `src/components/profile/ProfileView.tsx`, `NotificationsCard.tsx`, `CognitiveRadar.tsx`
- `src/components/subscription/SubscriptionBadge.tsx`, `SubscriptionSheet.tsx`
- `src/components/upload/UploadSheet.tsx`, `FileManager.tsx`
- `src/components/shared/EmptyState.tsx`
- `src/components/layout/UserMenu.tsx`, `SaveStatusIndicator.tsx`
- `src/lib/subjectColors.ts` — rimuovo solo le varianti `dark:` interne alle stringhe (i colori base per materia restano).
- eventuali componenti shadcn con varianti `dark:` non usate.

### 4. Persistenza
- **NON tocco** il DB né lo schema `user_data`: la vecchia chiave `theme` resta lì come dato orfano ma innocuo. Al login, se il valore era `"dark"`, viene semplicemente ignorato.

### 5. Verifica
- Screenshot autenticato di `/app` su Studio, Piano, Pratica, Profilo, FullscreenLesson e onboarding cognitivo per confermare che tutto sia chiaro, con accenti materia solo su nodi lezione/badge.
- Build check.

## Non in scope
- Nessuna modifica a logiche di quiz, auth Supabase, chiamate AI, upload PDF, edge functions.
- Nessuna modifica ai colori materia (`subjectColors.ts` mantiene tutte le mappe base).
- Nessuna nuova libreria/font: resta Inter già configurato.

## Rischio
Basso. Le varianti `dark:` sono puramente CSS additivo: rimuoverle non altera comportamento, solo rendering in dark (che d'ora in poi non esisterà).
