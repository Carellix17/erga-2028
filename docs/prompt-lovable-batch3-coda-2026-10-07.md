# Prompt per Lovable — Batch 3: tutta la coda rimasta dei fix lezioni (P7-P19)

> **Cosa devi fare tu:** apri Lovable, incolla il testo qui sotto nella chat e premi invio.
> È il seguito dei batch 1 e 2 (già deployati). Nessuna migrazione, nessun segreto nuovo.
> Le modifiche al frontend (`src/`) si aggiornano da sole col sync del repo: qui sotto si chiede solo il deploy delle Edge Function.

---

## Testo da incollare in Lovable

Ciao! Nel ramo `main` è arrivato il batch 3 dei fix per la creazione delle lezioni (commit `2ecb755`, già su GitHub). Sono modifiche alle Edge Function: serve il deploy.

Sincronizza il repository (branch main) e:

1. **Migrazioni SQL: nessuna.**
2. **Deploya queste 4 Edge Function:**
   - **upload-pdf** (trigger di elaborazione con ritento; allegati PDF con marcatori di pagina; limite HEIC 14 MB; fix errore mascherato; controllo 20 foto reale)
   - **extract-pdf** (nuova azione `reprocess` per il materiale rimasto «in elaborazione» per sempre; PDF scansionati: tetto 18 MB con messaggio chiaro e trascrizione 30k token; mime HEIC corretto)
   - **generate-lessons** (lezione singola idempotente: le lezioni già pronte non si rifanno; 409 se il percorso è in costruzione)
   - **extract-lesson-figures** (solo le figure promesse alla lezione: niente ritagli extra)
3. **Rigenera i tipi TypeScript Supabase: non serve.**

Cosa fanno questi fix (per contesto, non serve azione):
- Il materiale non resta più bloccato in «elaborazione» per sempre: il trigger ritenta da solo e l'app può chiedere una ripartenza.
- Gli allegati PDF ora hanno la mappa delle pagine (quindi possono avere anche le figure).
- Un retry di rete non rigenera più lezioni già pronte (niente doppi costi AI); le vecchie lezioni vuote si rigenerano da sole al primo tocco.
- Le foto HEIC di iPhone fino a 14 MB vengono accettate.

Non toccare nient'altro: il frontend (lettore, Studio, caricamento) viaggia già nel repo e si aggiorna col sync.

---

## Dopo il deploy: prove rapide (facoltative, 3 minuti)

1. **Materiale appeso**: se avevi un percorso fermo su «elaborazione», riapri l'app e ricarica: entro un paio di minuti l'analisi dovrebbe ripartire da sola.
2. **Allega un PDF a un percorso esistente** (+): ora le lezioni nuove possono avere figure da quel PDF.
3. **Tocca una vecchia lezione vuota** (se ne hai): si rigenera da sola.
4. **Foto HEIC dall'iPhone**: fino a 14 MB passano.
