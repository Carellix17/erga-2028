# Prompt per Lovable — Batch 2: pagine intere come immagini e lezioni-mostre

> **Cosa devi fare tu:** apri Lovable, incolla il testo qui sotto nella chat e premi invio.
> È il seguito del deploy del batch 1 (che hai già fatto): questo copre SOLO le funzioni toccate dal batch 2.
> Nessuna migrazione, nessun segreto nuovo, nessuna modifica al frontend.

---

## Testo da incollare in Lovable

Ciao! Nel ramo `main` è arrivato il batch 2 dei fix per la creazione delle lezioni (commit `c3ddb35`, già su GitHub). Sono modifiche alle Edge Function: serve il deploy.

Sincronizza il repository (branch main) e:

1. **Migrazioni SQL: nessuna.**
2. **Deploya queste 2 Edge Function:**
   - **generate-lessons** (da ridéployare: tetto alle formule nel prompt scientifico + verifica a posteriori delle lezioni-mostre + fix allo spazzino dei lavori morti)
   - **extract-lesson-figures** (nuova in questo deploy: tetto massimo ai ritagli — un riquadro che copre oltre il 60% della pagina viene rifiutato, niente più pagine intere come immagini)
3. **Rigenera i tipi TypeScript Supabase: non serve.**

Cosa fanno questi fix (per contesto, non serve azione):
- Le figure estratte dai PDF non possono più essere pagine intere: massimo il 60% dell'area della pagina.
- Le lezioni scientifiche hanno un tetto di formule in mostra (4) e di lunghezza (6-8 slide): se l'AI sfora, la lezione viene rifatta una volta più asciutta.
- Fix aggiuntivo: chi aveva un percorso bloccato in "generazione" e toccava un modulo si ritrovava una lezione sola — ora lo stato morto viene azzerato prima di partire.

Non toccare nient'altro.

---

## Dopo il deploy: prova di 2 minuti

1. Apri un percorso **scientifico** già generato con lezioni vecchie: quelle restano come sono (non le tocchiamo).
2. Rigenera una lezione (long-press → Rigenera) o creane una nuova: deve uscire **asciutta** — poche formule in mostra, non decine.
3. Se il percorso ha figure dal PDF: devono essere **ritagli veri**, non pagine intere. (Le figure già salvate in passato restano com'erano: il tetto vale per quelle nuove.)
