# Prompt per Lovable — Fix creazione lezioni (batch 1: lezioni vuote, JSON rotto, blocchi eterni)

> **Cosa devi fare tu:** apri Lovable, incolla il testo qui sotto nella chat e premi invio.
> Io non posso deployare le Edge Function né applicare migrazioni: passano solo da te (direttiva `docs/external-agent-prompt.md`).
> Dopo il deploy, fai la prova di 5 minuti descritta in fondo.

---

## Testo da incollare in Lovable

Ciao! Nel ramo `main` sono arrivati i fix per la creazione delle lezioni (commit `492d327` e `a6b7f96`, già su GitHub). Sono modifiche alle Edge Function: serve il deploy, niente migrazioni.

Sincronizza il repository (branch main) e:

1. **Migrazioni SQL: nessuna** (nessun file nuovo in `supabase/migrations/`, nessuna nuova tabella o colonna).
2. **Deploya queste Edge Function** (sono tutte quelle che usano i moduli condivisi modificati `_shared/ai.ts`, `_shared/openrouter.ts` e il nuovo `_shared/lessonPayload.ts`):
   - generate-lessons (la principale: qui vivono i fix)
   - chat
   - generate-exercises
   - generate-lessons-demo
   - generate-plan
   - interrogazione
   - lesson-chat
   - scientific-gym
   - study-tutor
   - web-search
3. **Rigenera i tipi TypeScript Supabase: non serve** (nessuna nuova tabella/colonna).

Cosa sono questi fix (per contesto, non serve azione):
- Le lezioni vuote non vengono più salvate come "generate" e la generazione delle prime 4 lezioni non si spezza più al primo errore.
- Il riparatore JSON ora gestisce le formule LaTeX (`\sqrt`, `\frac`) che prima rompevano il parse («Impossibile estrarre JSON»).
- Rimosso dalla catena OpenRouter il gradino `deepseek-v4-flash:free` che non esiste (dava 404 su ogni lezione scientifica).
- Le risposte AI troncate dal limite di token vengono riprovate con più token.
- Gli stati "in generazione" rimasti appesi (lavori morti) non bloccano più il percorso per sempre.

Non toccare nient'altro: nessuna modifica a `src/` (il frontend è già a posto), nessuna nuova dipendenza, nessun segreto nuovo (la chiave `OPENROUTER_SEPTEMBER_2026` esiste già).

---

## Dopo il deploy: prova di 5 minuti

1. Carica un **PDF scientifico** (matematica/fisica, meglio se con formule) e segui il caricamento unico fino in fondo.
2. Apri il percorso: dovresti trovare **4 lezioni pronte** (non 1), tutte con contenuto dentro.
3. Apri la lezione 5 o 6 (non generata): deve generarsi al volo, senza «errore nell'estrarre file JSON».
4. Guarda una lezione con formule: devono apparire **intere** (niente `rac{a}{b}` mutilati).

Se qualcosa non funziona, salva i log della funzione `generate-lessons` dal pannello Lovable: servono per la diagnosi.
