# Prompt per Lovable — P49: dare memoria alla spunta del Diario

> **Cosa devi fare tu:** apri Lovable, incolla il testo qui sotto nella chat, e premi invio.
> Lovable applicherà la modifica al database (io non posso farlo: le migrazioni passano solo da te).
> **Poi premi Update.** Se non lo fai, il Diario funziona comunque, ma la spunta dei compiti "veri" non viene ricordata.

---

## Testo da incollare in Lovable

Ciao! Nel ramo `main` è arrivata la vista **Diario** nella stanza Piano (P49).
Per farle ricordare le spunte dei compiti serve **una sola colonna** nella tabella `evaluations`.
Non toccare nient'altro: nessuna nuova tabella, nessuna funzione, nessun dato da spostare.

### 1) Migrazione

```sql
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;
```

Regole di sicurezza che ci aspettiamo da questa colonna (se il tuo schema usa già una politica
generica "l'utente vedo/modifico solo le proprie righe" su `evaluations`, non serve altro):

```sql
-- Solo per chiarezza: le politiche esistenti su `evaluations` devono coprire anche
-- l'UPDATE di questa colonna per l'utente proprietario della riga.
```

### 2) Rigenera i tipi generati da Supabase

Dopo la migrazione, rigenera `src/integrations/supabase/types.ts` così che `evaluations`
esponga anche `is_completed: boolean` in `Row`, `Insert` e `Update`.
Nel codice il campo è già usato: appena i tipi si aggiornano, il cast dichiarato in
`src/hooks/useEvaluations.ts` (funzione `useToggleEvaluationCompleted`) resta valido e
si potrà rimuovere senza fretta.

### 3) Nota per il futuro (NON farla adesso)

Gli impegni extra-scolastici creati dalla scheda **"Altro"** del foglio "Aggiungi evento"
vivono in `study_events` e nel Diario compaiono come compiti: oggi la loro spunta è
ricordata **solo nel browser** (e il Diario lo dichiara apertamente nella card).
Se in futuro vorrai la stessa memoria anche per loro, la strada è la stessa colonna
sulla tabella `study_events` — ma è una decisione separata, da valutare insieme.

### 4) Controllo finale

- La vista **Diario** è la predefinita nella stanza Piano; il selettore mostra
  Diario / Settimana / Mese.
- Spuntando un compito nella giornata, il contatore "N di M compiti completati" e la
  barra si aggiornano subito, e la spunta resta dopo un ricaricamento della pagina.
- Le verifiche collegate a un percorso mostrano il tasto **"Apri il percorso"** che porta
  alla stanza Studio su quel corso.
