## Obiettivo

Rendere le generazioni di lezioni ed esercizi **asincrone, persistenti e ripristinabili**, con notifiche Web Push al completamento. Niente più progresso perso se l'utente chiude l'app o blocca lo schermo.

Procediamo in **due fasi separate** come richiesto: prima la persistenza dello stato e il background processing, poi le notifiche push.

---

## FASE 1 — Stato persistente + background processing

### 1.1 Database — campo status sulle generazioni

`study_contexts` ha già `processing_status` (pending/processing/completed/failed) per l'estrazione del PDF, ma **manca uno stato dedicato alla generazione delle lezioni**. Aggiungere:

- `study_contexts.generation_status` — text default `'idle'` (valori: `idle | generating | completed | failed`)
- `study_contexts.generation_started_at` — timestamptz
- `study_contexts.generation_progress` — jsonb default `'{}'` (campi: `step`, `generatedCount`, `totalLessons`, `currentTitle`)
- `study_contexts.generation_error` — text

Per gli esercizi mirati (`generate-exercises`) creiamo una tabella nuova `exercise_jobs`:
- `id`, `user_id`, `context_id`, `lesson_ids jsonb`, `status`, `result jsonb`, `error text`, `created_at`, `updated_at`

RLS: stesso pattern delle altre tabelle (user_id = auth.uid()::text).

Realtime: abilitare su `study_contexts` e `exercise_jobs` per subscription dal client.

### 1.2 Edge Functions — esecuzione in background

Sia `generate-lessons` sia `generate-exercises` oggi attendono la fine dell'AI prima di rispondere. Riscriverle in modo che:

1. Validino input + auth
2. Aggiornino il DB a `generating` con timestamp
3. **Avviino il lavoro pesante con `EdgeRuntime.waitUntil(...)`** così l'esecuzione continua anche se il client chiude la connessione
4. Restituiscano subito `202 Accepted` con l'id della riga / job

Dentro il task in background:
- Aggiornare periodicamente `generation_progress` (dopo ogni lezione generata)
- Al termine: scrivere `generation_status = 'completed'` + payload finale
- Su errore: `generation_status = 'failed'` + `generation_error`
- Wrapping try/catch totale per non lasciare mai job appesi in `generating`

### 1.3 Frontend — ripristino UX al rientro

Hook `useGenerationStatus(contextId)`:
- Query iniziale su `study_contexts` per recuperare `generation_status` + `generation_progress`
- Subscription Realtime sui cambi della riga
- Espone `{ status, progress, error }`

In `StudioView` / `LessonsList`:
- All'avvio, query "ci sono contesti con `generation_status = 'generating'`?". Se sì, aprire automaticamente `GenerationProgress` su quello attivo.
- Bottone "Genera percorso" disabilitato finché lo stato è `generating` (idempotenza).
- `GenerationProgress` legge i dati dal hook invece che da stato locale.

Stesso pattern per `EserciziView` con `exercise_jobs`.

### 1.4 Messaggio UX nel loader

In `src/components/studio/GenerationProgress.tsx`, sotto il tip rotante:

> "L'AI sta elaborando testo e immagini. Potrebbe volerci un po'. Puoi anche uscire dall'app o bloccare lo schermo, non perderai i progressi e ti avviseremo quando è pronto!"

---

## FASE 2 — Notifiche Web Push (PWA)

Da fare **solo dopo** che la Fase 1 è validata.

### 2.1 Tabella `push_subscriptions`
`user_id`, `endpoint` (unique), `p256dh`, `auth`, `user_agent`, `created_at`. RLS standard.

### 2.2 Service Worker
Estendere il SW generato da `vite-plugin-pwa` con un file custom (`src/sw.ts`, strategy `injectManifest`) che gestisce:
- `push` event → mostra notifica con titolo/body/icon/data.url
- `notificationclick` event → apre/focalizza la finestra sull'URL passato

⚠️ Vincolo Lovable: il SW **non si registra** in preview/iframe (guardia già presente in `src/main.tsx`). Le push funzioneranno solo sull'app pubblicata.

### 2.3 Permessi e subscription
Hook `usePushNotifications`:
- Espone `permission`, `subscribe()`, `unsubscribe()`
- Al primo click su "Genera", se `permission === 'default'` mostra un piccolo banner inline che spiega il beneficio e chiama `Notification.requestPermission()`
- Su grant: chiama `registration.pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC })` e POST della subscription all'edge `push-subscribe`

### 2.4 Chiavi VAPID + invio
- Generare coppia VAPID, salvare `VAPID_PUBLIC_KEY` (esposta via env pubblica) e `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` come secrets
- Edge function `send-push` che, dato `user_id` + payload, itera su `push_subscriptions` e invia con `web-push` (npm via `npm:web-push`); rimuove subscription scadute (410/404)
- `generate-lessons` e `generate-exercises`, al termine con successo, chiamano `send-push` con:
  > "La tua lezione su {file_name} è pronta! 🚀"

---

## Dettagli tecnici principali

- **`EdgeRuntime.waitUntil`**: API Deno disponibile su Supabase Edge Runtime per task post-response. Senza, la function viene killata quando il client si disconnette.
- **Idempotenza**: prima di avviare un job, verificare che non esista già uno `generating` sullo stesso contesto/lessonIds.
- **Cleanup stale jobs**: edge function schedulata (pg_cron) opzionale che marca `failed` i job in `generating` da > 15 minuti. La aggiungiamo solo se necessaria dopo il primo deploy.
- **Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.study_contexts, public.exercise_jobs;`
- **Compatibilità iOS**: Web Push su iOS funziona solo se l'utente ha installato la PWA (Add to Home Screen) — lo comunichiamo nel banner permessi.

---

## Ordine di esecuzione

1. Migration: campi su `study_contexts` + tabella `exercise_jobs` + realtime
2. Refactor `generate-lessons` e `generate-exercises` con `waitUntil` + scrittura stato
3. Hook `useGenerationStatus` + integrazione in `StudioView`/`LessonsList`/`EserciziView`
4. Testo UX nel loader
5. **Stop e validazione con l'utente**
6. Tabella `push_subscriptions` + secrets VAPID
7. Service Worker custom + hook `usePushNotifications` + banner permessi
8. Edge `push-subscribe` e `send-push` + integrazione nei job al completamento
