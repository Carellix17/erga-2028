# Fix: utenti esistenti trattati come nuovi dopo login Google

> Data: 2026-09-02 · Branch: `arena/01a062ce-erga-2028` (richiesta equivalente di `fix/google-login-existing-users`)
> Stato: PR pronta per review — le parti che richiedono Lovable/Supabase Dashboard sono contrassegnate **"richiede intervento manuale"**.

---

## 1. Diagnosi

### Sintomo
Un utente esistente che accede con Google (e che in passato ha completato l'onboarding e ha dati salvati) si ritrova:
- onboarding cognitivo da zero;
- dati vuoti / schermate iniziali;
- come se l'account fosse appena nato.

Il login in sé funziona (la sessione viene creata), quindi il problema non è "non riesco ad autenticarmi" ma **"dopo l'autenticazione l'app non riesce a distinguere un utente esistente da uno nuovo"**.

### Catena del flusso attuale
1. Landing → "Accedi" → `/login` → Google (broker OAuth Lovable `@lovable.dev/cloud-auth-js`).
2. Il broker restituisce i token → `supabase.auth.setSession(...)` (solo in `Login.tsx`!) oppure rimanda il browser a `origin + /app` con i token nell'hash.
3. `ProtectedRoute` + `AuthContext` leggono la sessione.
4. `Index` decide se mostrare l'onboarding leggendo il profilo dall'Edge Function `cognitive-profile` (`useCognitiveProfile`).
5. I dati arrivano da Edge Function (`user-data`, `user-profile`, `get-lessons`, …) o da query dirette Supabase con RLS.

### Cause principali individuate nel codice (con evidenze)

| # | Causa | Evidenza | Effetto |
|---|-------|----------|---------|
| C1 | **Errore di lettura interpretato come "utente nuovo"** | `src/hooks/useCognitiveProfile.ts`: `callFn` → `res.json()` senza controllo di `res.ok`; nel `catch` si faceva solo `console.error` e lo stato restava `hasCompletedOnboarding = false`. `src/hooks/useUserData.ts`: su errore React Query ritorna `defaultValue` → dati "vuoti" senza errore visibile. `src/hooks/useProfileData.ts`: `fetch` con fallback all'anon key, errori silenziosi. | Qualsiasi 401/500/CORS/errore di deploy della Edge Function trasforma l'utente esistente in "nuovo": onboarding + dati vuoti. |
| C2 | **CORS / allowlist Edge Function non include il dominio di produzione custom** | `supabase/functions/_shared/auth.ts`: `ALLOWED_ORIGINS_EXACT = { https://erga-demo.lovable.app, capacitor://localhost }`, mentre sitemap/SEO usano `https://erga-learning.app` (`scripts/generate-sitemap.ts`, `src/components/SeoHead.tsx`). | Se l'app è servita da `erga-learning.app`, il browser blocca TUTTE le Edge Function → stessa catena di C1. **Richiede intervento manuale** (deploy della funzione con il nuovo allowlist + verifica dominio in Supabase Auth). |
| C3 | **Onboarding deciso su un solo flag mai retro-compilato** | `user_profiles.has_completed_onboarding` introdotto il 2026-06-14 con DEFAULT `false` e **nessun backfill** per i profili esistenti (nessuna migration aggiorna il flag per chi ha già `cognitive_profiles`). Il GET di `cognitive-profile` usava SOLO quel flag. | Utenti con profilo cognitivo ma flag `false` → onboarding di nuovo. |
| C4 | **Redirect OAuth direttamente sulla rotta protetta, senza callback che attende la sessione** | `Login.tsx`/`Registrati.tsx`/`DemoFlow.tsx`: `redirect_uri = origin + nextPath` (es. `/app`). Non esiste una rotta `/auth/callback`. | Atterraggio su rotta protetta prima che la sessione sia nello storage → loop verso `/login` oppure render senza sessione. |
| C5 | **`setSession` dei token OAuth fatto solo in `Login.tsx`** | `Registrati.tsx` e `DemoFlow.tsx` scartavano `result.tokens` (flusso popup/postMessage). | Registrazione/accesso da demo con Google resta "a metà" (soprattutto in anteprima Lovable). |
| C6 | **Dati legacy salvati sotto email invece di `auth.uid()`** | La migration `20260502090551_4a688e70...` cita esplicitamente `-- fallback per eventuale legacy user_id` (`sc.user_id = 'admin@example.com'`). | Le query per UUID non trovano le righe → dati "vuoti" per utenti storici. |
| C7 | **Ambiente incoerente** | `index.html`/`auth.ts` → `erga-demo.lovable.app`; `SeoHead`/`sitemap` → `erga-learning.app`; `.env.example` assente; `.env` (con token Paddle live) è tracciato in git. | Canale documentale: non si può verificare a runtime quale dominio sia pubblicato → fix difensivi su entrambi. **Nota di sicurezza**: il file `.env` committato contiene `VITE_PAYMENTS_CLIENT_TOKEN=live_c803…`; essendo una chiave pubblica client-side il rischio è contenuto, ma conviene comunque escludere `.env*` dal repo e gestire i segreti via variabili d'ambiente della piattaforma (Lovable/CI). |

Le ipotesi "RLS mancante su tabelle principali" sono state **verificate ed escluse**: le policy di proprietà esistono per `user_profiles`, `user_data`, `cognitive_profiles`, `study_contexts`, `mini_lessons`, `study_events`, `lesson_progress`, ecc. (migrations 20260203‑20260720 con `auth.uid()::text`). La priorità 5 è comunque coperta con un blocco "ensure" idempotente.

**Conclusione della diagnosi**: non è un singolo bug ma una *regressione di robustezza*: (a) il sistema non distingue "errore di lettura" da "nessun dato", (b) il flag di onboarding non è retro-compilato, (c) il redirect OAuth non attende la sessione, (d) l'allowlist CORS non copre il dominio custom. Il fix rende il flusso **error-aware e idempotente** così che, qualunque sia la causa ambientale, un utente esistente non venga mai più mostrato come nuovo.

---

## 2. Fix applicati

### File modificati

| File | Modifica |
|------|----------|
| `src/lib/auth.ts` | Aggiunti `normalizeEmail`, `safeNextPath` (blocco URL esterni/traversal), `oauthCallbackUrl`, `completeOAuthSignIn` (unico punto che applica i token del broker). |
| `src/lib/onboardingGate.ts` | **Nuovo**: logica pura e testata del cancello: `loading → mai onboarding`, `error → mai onboarding`, `ready → solo qui decide`. |
| `src/hooks/useCognitiveProfile.ts` | Riscritto: usa `edgeFetch` (retry + gestione 401), espone `status`/`error`/`readResult`; **un errore non resetta più `hasCompletedOnboarding`**. |
| `src/pages/Index.tsx` | Cancello basato su `resolveOnboardingGate`; in caso di errore mostra schermata recuperabile ("Riprova" / "Esci") invece dell'onboarding; banner visibile se i dati cloud non si caricano. |
| `src/pages/AuthCallback.tsx` | **Nuova rotta**: attende la sessione (evento + polling + timeout 12s), pulisce hash con i token, poi naviga a `next`; timeout → `/login?next=…`. |
| `src/App.tsx` | Registrata la rotta `/auth/callback`. |
| `src/pages/Login.tsx` | `redirect_uri` → `/auth/callback?next=…`; usa `completeOAuthSignIn` e `safeNextPath`. |
| `src/pages/Registrati.tsx` | Idem (corregge C5: ora applica i token). |
| `src/components/demo/DemoFlow.tsx` | Idem per l'auth wall della demo (corregge C5). |
| `src/hooks/useUserData.ts` | Espone `isError` / `error` (niente più "vuoto" silenzioso). |
| `src/hooks/useProfileData.ts` | Lettura/salvataggio via `edgeFetch`; espone `loadError`; profilo non più "vuoto" in caso di errore. |
| `src/components/profile/ProfileView.tsx` | Banner visibile per `loadError`. |
| `src/contexts/AuthContext.tsx` | `syncSession` con gestione errori + `authError` esposto. |
| `supabase/functions/_shared/auth.ts` | Aggiunto `https://erga-learning.app` all'allowlist CORS + helper `normalizeEmail`/`emailLikePattern` (confronto letterale non ambiguo). |
| `supabase/functions/cognitive-profile/index.ts` | GET: errore non più "no data"; `hasCompletedOnboarding = flag || cognitive row` (copre legacy/race); fallback di lettura sicuro per righe legacy via email; `save` ri-collega la riga legacy all'UUID (senza cancellazioni, senza duplicati). |
| `supabase/functions/user-profile/index.ts`, `supabase/functions/user-data/index.ts` | Fallback di lettura (sola lettura) per righe legacy via email verificata. |
| `supabase/migrations/20260902090000_fix_existing_users_google_login.sql` | **Nuova migration** idempotente (vedi sotto). |
| `.env.example` | **Nuovo**: placeholder senza segreti. |
| `docs/auth-google-existing-users-fix.md` | Questo documento. |
| `src/test/*` | Nuovi test: `authFlow.test.ts`, `onboardingGate.test.ts`, `authCallback.test.tsx`; aggiornato `landingMarketing.test.tsx` (hero ridisegnato). |

### Migration aggiunta (`20260902090000_fix_existing_users_google_login.sql`)
1. Backfill `user_profiles.has_completed_onboarding = true` dove esiste `cognitive_profiles`.
2. Crea la riga `user_profiles` mancante (solo se assente, `ON CONFLICT DO NOTHING`).
3. Collega le righe legacy con `user_id` = email all'UUID (`auth.users.email` è univoco; confronto case-insensitive; se una riga canonica esiste già, la legacy resta intatta — nessun duplicato, nessuna cancellazione).
4. Ri-afferma (solo se mancanti) le policy RLS di proprietà su `user_profiles`, `user_data`, `cognitive_profiles`.
5. Query di verifica finale commentata.

---

## 3. Test

### Eseguiti
- `npx vitest run` → 331 test: **1 fail pre-esistente** (landingMarketing, aggiornato al nuovo hero) e 1 errore unhandled flaky pre-esistente in `pathHeroPicker.repro.test.tsx` (`list.scrollTo` in jsdom, già presente prima di questa PR).
- `npx tsc --noEmit` (typecheck) e `npm run build` / `npm run lint`.

### Aggiunti
1. `authFlow.test.ts` — `normalizeEmail`, `safeNextPath` (blocco URL esterni/traversal), `oauthCallbackUrl`, `completeOAuthSignIn` (token applicati, redirect ⇒ nessun setSession, errori propagati).
2. `onboardingGate.test.ts` — i 5 casi chiave: loading ⇒ mai onboarding; **errore ⇒ mai onboarding**; completato ⇒ no; nuovo confermato ⇒ onboarding; **flag false + profilo cognitivo ⇒ no onboarding**.
3. `authCallback.test.tsx` — sessione subito presente ⇒ `next`; sessione assente ⇒ dopo timeout `/login?next=…`; sessione che arriva via `onAuthStateChange` ⇒ `next`.

### Test manuali consigliati (quando l'ambiente reale è disponibile)
1. Con account esistente (completato onboarding): login Google → deve arrivare alla dashboard con esagono e dati; **non** vedere le slide di onboarding.
2. Con account esistente e dominio `erga-learning.app`: verificare in DevTools che le chiamate a `/functions/v1/cognitive-profile` rispondano 200 (niente blocco CORS).
3. Nuovo utente: login Google → onboarding → completare → "Esagono Cognitivo" salvato → logout → login di nuovo → nessun onboarding.
4. Prova a far fallire la Edge Function (es. disabilitarla temporaneamente in Lovable): l'app deve mostrare "Non riusciamo a caricare i tuoi dati" + Riprova, **mai** l'onboarding.
5. Flusso email/password invariato.

---

## 4. Pull Request

**Titolo**: `fix: gli utenti Google esistenti non vengono più trattati come nuovi`

**Descrizione** (bozza per la PR):

> **Problema**: dopo la modifica della landing, un utente esistente che accede con Google viene mostrato come nuovo: onboarding, dati vuoti, flusso da zero.
>
> **Causa**: il sistema non distingueva "impossibile leggere i dati" da "nessun dato" (`useCognitiveProfile` inghiottiva errori e lasciava `hasCompletedOnboarding=false`; `useUserData`/`useProfileData` mostravano default silenziosi). A ciò si aggiungono: flag `has_completed_onboarding` mai retro-compilato per i profili esistenti, redirect OAuth diretto su rotta protetta senza attesa della sessione, `setSession` dei token assente in Registrati/DemoFlow, allowlist CORS delle Edge Function senza il dominio custom `erga-learning.app`, e possibili righe legacy con `user_id` = email.
>
> **Soluzione**: cancello di onboarding "error-aware" (onboarding solo con conferma positiva del server), rotta `/auth/callback` che attende esplicitamente la sessione, helper unico `completeOAuthSignIn`, fallback sicuri email→UUID (con migrazione idempotente che collega le righe legacy), allowlist CORS estesa, errori di lettura visibili e testabili.
>
> **Rischi**: basso. Nessuna cancellazione; migrazione con `ON CONFLICT DO NOTHING` e guardie anti-duplicato; il runtime fallback email è in sola lettura o ri-collega solo se manca la riga canonica. Modifica minore del flusso redirect (`/auth/callback`) — va aggiunta la rotta ai Redirect URL di Lovable/Supabase solo se l'ambiente lo richiede (il broker Lovable accetta URI same-origin).
>
> **Rollback**: revert della PR (frontend) + nessuna azione necessaria sulla migration (aggiornamenti solo id, nessuna riga cancellata; il backfill del flag è desiderato ma reversibile a mano).
>
> **Checklist accettazione**:
> - [ ] Utente esistente Google → dati visibili, nessun onboarding.
> - [ ] Nuovo utente Google → onboarding funziona, poi non ricompare.
> - [ ] Nessun duplicato in `user_profiles`/`cognitive_profiles`/`user_data`.
> - [ ] Con Edge Function giù → schermata di errore con Riprova, non onboarding.
> - [ ] Login email/password invariato.
> - [ ] Build, typecheck, lint, test verdi.

---

## 5. Istruzioni manuali (richiede intervento manuale)


### 5.1 Come applicare la migration
Il backend è Lovable Cloud (regola di progetto): **non eseguire direttamente**.
1. Apri il progetto Erga in Lovable → tab Cloud → SQL editor (o "Update" con il prompt sotto).
2. Copia il contenuto di `supabase/migrations/20260902090000_fix_existing_users_google_login.sql` in un nuovo SQL e **esegui soltanto su un ambiente di staging** prima di produzione.
3. Prompt pronto per Lovable:

> "Applica la migration contenuta in `supabase/migrations/20260902090000_fix_existing_users_google_login.sql`: backfill del flag di onboarding per chi ha un profilo cognitivo, collegamento delle righe legacy email→UUID senza duplicati né cancellazioni, e ri-assert delle policy RLS di proprietà. Non toccare tabelle o dati non elencati."

4. Verifica con la query commentata in fondo al file (atteso: 0 righe "ancora_senza_flag") e controllando `auth.users` vs `user_profiles.user_id` per 2‑3 utenti noti.

### 5.2 Edge Functions da ridistribuire (deploy)
Le modifiche toccano `_shared/auth.ts`, `cognitive-profile`, `user-profile`, `user-data`. In Lovable: Cloud → Edge Functions → ridistribuisci le quattro funzioni (Deploy). **Richiede intervento manuale.**

### 5.3 Variabili d'ambiente da verificare
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PUBLISHABLE_KEY` devono puntare **tutti** a `xtcifacgiyekudoispdk` in ogni ambiente (`.env`, `.env.development`, `.env.production`, e le Secret di Lovable).
- `VITE_PAYMENTS_CLIENT_TOKEN`: separare test/live nei file di modalità.
- Aggiungere `https://erga-learning.app` (e l'eventuale altro dominio custom) al **redirect URL** di Supabase Auth: `https://erga-learning.app/**`, `https://erga-demo.lovable.app/**`.

### 5.4 Supabase Auth / Google OAuth
- Google Cloud Console → OAuth Client → Authorized redirect URIs: devono esserci gli URL di callback del broker Lovable per entrambi i domini (stesso set già configurato per `erga-demo.lovable.app`).
- Supabase → Authentication → URL Configuration: Site URL = dominio pubblicato; Redirect URLs con wildcard per entrambi i domini.
- Tabella da controllare: `auth.users` (identità Google), `user_profiles.user_id` (deve essere l'UUID), `cognitive_profiles`, `user_data`.

### 5.5 Verifica utenti e dati nel dashboard
```sql
-- Utenti con profilo cognitivo ma flag onboarding false (atteso: 0 dopo la migration)
SELECT count(*) FROM public.user_profiles p
WHERE p.has_completed_onboarding = false
  AND EXISTS (SELECT 1 FROM public.cognitive_profiles c WHERE c.user_id = p.user_id);

-- Righe legacy ancora con email come user_id (atteso: solo quelle non collegabili)
SELECT 'user_profiles' AS tbl, user_id FROM public.user_profiles WHERE user_id ~ '@'
UNION ALL SELECT 'user_data', user_id FROM public.user_data WHERE user_id ~ '@'
UNION ALL SELECT 'cognitive_profiles', user_id FROM public.cognitive_profiles WHERE user_id ~ '@'
UNION ALL SELECT 'study_contexts', user_id FROM public.study_contexts WHERE user_id ~ '@';

-- Duplicati profilo (atteso: nessuno)
SELECT user_id, count(*) FROM public.user_profiles GROUP BY user_id HAVING count(*) > 1;
```
