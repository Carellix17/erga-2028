
# Piano — Evoluzione Esagono Cognitivo

Nessuna modifica allo schema DB, alle 18 domande di onboarding, o alle action `get`/`save`. Le firme delle funzioni esistenti restano compatibili (in particolare `buildCognitivePromptAddon(p)` continua a essere pura e a ritornare `string`).

---

## 1. `src/lib/cognitiveQuestions.ts`

**Modifica a `computeAreaScores`** — aggiungere consistency-check:

- Per ciascuna area, dopo aver calcolato il punteggio 0-100:
  - Prendere i 3 punti grezzi (0-10) dell'area.
  - Se `variance == 0` **e** `media == 10` (utente ha selezionato solo le opzioni con il punteggio massimo → risposta "desiderabile"), applicare uno sconto del 10% al punteggio finale.
  - Clamp finale 0-100, arrotondamento intero.
- Nessun'altra logica cambia; la funzione resta pura e retro-compatibile per i chiamanti attuali.

Esporto anche una piccola utility interna (non pubblica) per il calcolo della varianza, sempre nello stesso file.

---

## 2. `supabase/functions/_shared/cognitive.ts`

**Riscrittura di `buildCognitivePromptAddon`** mantenendo firma `(p: CognitiveScores | null) => string`.

### 2a. Bandizzazione a 5 livelli continui
Per ciascuna delle 6 dimensioni (LOG, MEM, FOC, VOC, ANS, APP) mappare il punteggio in una fascia:

```text
critico    : 0-20
basso      : 21-40
medio      : 41-60
buono      : 61-80
eccellente : 81-100
```

Per ogni dimensione definire 5 stringhe di regola (una per livello) che sostituiscono le attuali soglie binarie `>=75` / `<40`. Contenuti indicativi (mantengono il tono e la sostanza delle regole esistenti, estendendoli):

- **LOG** — es. critico: "Guida passo passo, un concetto per frase, evita astrazioni"; medio: "Alterna spiegazioni discorsive a brevi schemi causa-effetto"; eccellente: "Sfrutta scomposizione sistemica e nessi causa-effetto espliciti".
- **MEM**, **FOC**, **VOC**, **ANS**, **APP** — analogamente 5 livelli ciascuno.

### 2b. Rilevamento profili "paradossali"
Dopo l'elenco delle 6 regole, controllare **coppie teoricamente correlate**:
- `LOG ↔ APP` (ragionamento vs applicazione)
- `MEM ↔ APP` (memoria vs uso pratico)
- `VOC ↔ LOG` (esposizione vs struttura logica)

Se `|score_a - score_b| > 50`, aggiungere una nota nell'addon del tipo:
> "⚠️ Profilo paradossale rilevato (es. LOG=90 ma APP=30): non dare per scontato che una buona esposizione teorica implichi comprensione operativa. Verifica esplicitamente l'applicazione con esempi mirati."

La nota è informativa: non blocca nulla, non altera le regole esistenti.

### 2c. Output
La stringa finale mantiene lo stesso header (`PERSONALIZZAZIONE COGNITIVA…`) più:
1. le 6 regole di livello (una per dimensione),
2. l'eventuale sezione `Note aggiuntive:` con i paradossi rilevati.

Restano compatibili i consumer attuali: `generate-lessons/index.ts` e `generate-exercises/index.ts` continuano a fare semplicemente `systemPrompt += addon`.

---

## 3. `supabase/functions/cognitive-profile/index.ts` — nuova action `updateFromPerformance`

Aggiungere un ramo `if (action === "updateFromPerformance")` accanto a `get` / `save`.

**Input atteso** (nel body, in aggiunta a `userId` gestito da `validateAuth`):
- `correct: number` (numero risposte corrette)
- `total: number` (numero totale esercizi valutati)
- opzionale `area: "APP"` (default `"APP"`; per ora solo APP è supportato, ma la struttura è pronta a estensioni future).

**Logica lato server (sicura):**
1. Validazione: `total` intero > 0, `correct` intero 0..`total`, altrimenti 400 con messaggio generico.
2. Fetch riga corrente da `cognitive_profiles` per `user_id`. Se manca → 404-like: rispondere `{ skipped: true }` senza errore (l'utente non ha ancora fatto onboarding).
3. `perf = (correct / total) * 100`
4. `alpha = 0.1`
5. `new_score = Math.round(old_app_score * (1 - alpha) + perf * alpha)`, clamp 0-100.
6. `update` solo del campo `app_score` (+ `updated_at`), scritto con la stessa `supabase` client autenticato dell'utente (RLS enforce che `user_id = auth.uid()`), quindi nessun uso di service role, nessun trust del `user_id` nel body.
7. Response: `{ success: true, oldScore, newScore, perf }`.

Nessun'altra action viene toccata; nessun cambiamento allo schema.

---

## 4. Aggancio lato client — `src/components/pratica/EserciziView.tsx`

Punto d'aggancio: quando la sessione esercizi si chiude, cioè in `nextExercise()` nel ramo in cui `currentIndex + 1 >= exercises.length` (dove viene settato `setIsFinished(true)`).

- Considerare **solo** i `results` di tipo `multiple_choice` o `true_false` (obiettivi verificabili in modo deterministico).
- Se `filtered.length === 0`, skip.
- Calcolare `correct` e `total`, chiamare la nuova action `updateFromPerformance` con `fetch` verso `/functions/v1/cognitive-profile` (stesso pattern già in uso nel file), fire-and-forget con `.catch(() => {})` per non disturbare l'UX.
- Nessuna modifica visibile all'utente, nessun toast, nessun re-render bloccante.

Nessuna modifica in `MiniLesson.tsx` o in altri componenti (l'utente ha chiesto specificamente il flusso "esercizi di una lezione", che nell'app corrente passa da EserciziView — MiniLesson non salva risultati misurabili).

---

## 5. Nessuna modifica a
- Schema DB / migrazioni.
- `useCognitiveProfile.ts` (le action `get`/`save` restano invariate; la nuova action è chiamata direttamente dal componente esercizi, non ha bisogno di stato React lato hook).
- `generate-lessons/index.ts`, `generate-exercises/index.ts` (continuano a importare `buildCognitivePromptAddon` con la stessa firma).
- `supabase/config.toml` (la funzione esiste già con `verify_jwt = false` + validazione JWT interna).

---

## Sintesi file toccati
1. `src/lib/cognitiveQuestions.ts` — consistency-check in `computeAreaScores`.
2. `supabase/functions/_shared/cognitive.ts` — 5-livelli + paradossi in `buildCognitivePromptAddon`.
3. `supabase/functions/cognitive-profile/index.ts` — nuova action `updateFromPerformance`.
4. `src/components/pratica/EserciziView.tsx` — chiamata fire-and-forget a fine sessione esercizi.
