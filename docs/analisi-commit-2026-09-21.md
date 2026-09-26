# Analisi degli ultimi cambiamenti — 16 → 21 settembre 2026

**Ramo `main`**: era fermo al nostro `95c1045` (Diario P49), ora è a `2022369` (merge PR #82).
**In numeri**: 32 commit, 57 file toccati, **+1.160 righe aggiunte / −4.566 rimosse**.
Si è tagliato molto più di quanto si è aggiunto: tre commit hanno cancellato lavoro.

---

## 1. Il database: la migrazione che avevamo chiesto è stata applicata ✅

Commit `a929849` "Aggiunta colonna is_completed":

- `drizzle/migrations/0001_add_is_completed_to_evaluations.sql`
  → `ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;`
- `src/integrations/supabase/types.ts` rigenerato: `is_completed` c'è in `Row`, `Insert`, `Update`.
- Il nostro hook è stato ripulito come previsto: via il cast, resta
  `const patch: TablesUpdate<"evaluations"> = { is_completed: next, ... }`.

**Quindi**: la colonna esiste davvero nel database. Peccato che (vedi punto 2) **nessuna schermata la usi più**.

---

## 2. Piano: il Diario è stato cancellato e sostituito ❌

Commit `95cf2ed` — *"Piano: calendario degli appuntamenti al posto di diario e viste multiple"* (PR #82, 21 settembre).
Motivo dichiarato dall'autore: *"La stanza Piano era confusionaria: tre viste (diario/settimana/mese), un calendario con pallini-colori e una lista di prossimi eventi separata."*

**Cancellati** (tutti file del P49, più la griglia settimanale):

| File | Righe |
|---|---|
| `src/components/piano/DiaryView.tsx` | −291 |
| `src/components/piano/DiaryTaskCard.tsx` | −161 |
| `src/components/piano/DiaryExamCard.tsx` | −165 |
| `src/components/piano/DiaryDayStrip.tsx` | −127 |
| `src/components/piano/diaryUtils.ts` | −370 |
| `src/components/piano/WeekPlanner.tsx` | −360 |
| `src/test/diaryView.test.tsx` | −31 casi di collaudo |

`PianoView.tsx`: da ~660 righe a **268**. Il selettore Diario/Settimana/Mese non esiste più.

**Al suo posto**: `AppointmentsCalendar.tsx` (428 righe) — una sola schermata: mese dal calendario di
sistema, superficie scura, badge col numero di impegni per giorno che si espande al passaggio del
mouse, pannello "Prossimi eventi" accanto alla griglia (il giorno puntato sale in cima),
"Aggiungi evento" sotto la griglia, "Genera piano di studio" che compare solo dopo il primo evento.

**Cosa resta orfano nel codice** (esiste, ma nessuno lo chiama più):

- `useToggleEvaluationCompleted` in `useEvaluations.ts` → il motore della spunta, senza interfaccia;
- `src/components/piano/PlanItem.tsx` → solo il suo test lo usa;
- `routineTint` / `subjectTint` in `pianoPalette.ts` → servivano alla griglia settimanale;
- `src/lib/weekPlanner.ts` → sopravvive solo per `dayKey` (usato dal calendario nuovo);
- **28 chiavi di traduzione** `piano.diary.*` in italiano e inglese: **intatte**, solo inutilizzate.

**Cosa NON è stato toccato**: i **Percorsi** (P46) sono integri — serpentina, nodi tondi, pillola
dei moduli completati e atterraggio automatico sono ancora lì, verificati file per file.

---

## 3. Le fondamenta visive sono cambiate (e DESIGN.md è stato aggiornato con loro)

| Cosa | Prima | Adesso | Dove |
|---|---|---|---|
| Etichette (maiuscoletto) | Raleway | **Ubuntu Sans** | `index.css`, `tailwind.config.ts` (`font-mono`), DESIGN.md |
| Titolo di benvenuto Home | Zalando Sans Expanded | **Ubuntu Sans** (peso 500) | `HomeHeader`, nuova utility `font-welcome-title` |
| Fondo notte | `#0A0A0C` | **`#11120D`** (oliva quasi nero) | `index.css`, `theme-color`, interruttore impostazioni, DESIGN.md |
| Saluto Home | 3 saluti + sottotitolo | **2 saluti** (Buongiorno/Buonasera), due righe, misure 2.7→5.4 rem | `HomeHeader`, `HomeView` |
| Email | stack proprio + pagina Unsubscribe | **API email gestita da Lovable** (`@lovable.dev/email-js`), mittente `notify.erga-learning.app` | 4 funzioni rimosse, 2 nuove (`send-welcome-email`, `handle-email-events`), `auth-email-hook` riscritto |

`DESIGN.md` e `.impeccable/design.json` sono stati aggiornati **da loro** per riflettere font e
colore notte: il sistema di design resta la fonte di verità, semplicemente aggiornato.

---

## 4. Stato di salute del ramo online (misurato adesso)

| Controllo | Esito |
|---|---|
| Tipi TypeScript | **0 errori** ✅ |
| Build di produzione | **ok** ✅ |
| Collaudo | **427 passati / 432** (i 5 rossi sono sempre le guardie "Superfici pulite della Home") |
| Controllo di stile impeccable | **14 segnalazioni** (erano 10): 8 "font troppo usato" (Montserrat) + 6 misure fuori scala |

I 5 test rossi, in dettaglio: sono guardie scritte a mano che **leggono il sorgente** di
`CourseHeroCard.tsx` e pretendono la vecchia card eroica (classe `font-radja`, pillola `px-6`,
`dark:border-black/[0.08]`, niente sfocatura). La card è cambiata — molto prima di questi commit —
ma le guardie no: **il test è vecchio, non il codice**. Restano lì da prima, come da accordi.

Le 4 segnalazioni **nuove** di stile arrivano dalla Home: `HomeHeader.tsx` usa `text-[2.7rem]`,
`[4.4rem]`, `[4.8rem]`, `[5.4rem]`, quattro misure che non esistono nella scala di DESIGN.md
(che documenta 2.25 rem / 4 rem per il benvenuto).

---

## 5. Cosa comporta per il lavoro in corso

1. **Il Diario non c'è più.** Chi l'ha rimosso ha motivato con "troppe viste". Ma la specifica
   chiesta prevedeva proprio il Diario come vista unica e predefinita: il disaccordo è di merito,
   non tecnico. Riattivarlo oggi costerebbe **poco**, perché la parte difficile è già fatta:
   migrazione applicata, hook pronto, 28 chiavi di traduzione intatte. Le strade:
   - **a)** rimettere il Diario come **seconda vista** accanto al calendario nuovo (le chiavi e la
     logica tornano dal commit precedente, il collaudo si riscrive in gran parte);
   - **b)** aggiungere solo la **sezione "compiti da spuntare"** sotto il calendario nuovo
     (meno ambizioso, nessuna vista in più, ma il calendario nuovo è "scuro zinc": va armonizzato);
   - **c)** lasciare com'è e tenere la colonna `is_completed` per il futuro.
2. **Cinque file orfani** (hook della spunta, `PlanItem`, due tinte, mezzo `weekPlanner`).
   Si possono ripulire in pochi minuti — o servono proprio se si sceglie la strada (a).
3. **Le guardie di Home restano rosse**: allinearle significa riscrivere i 5 controlli sulla card
   attuale. Decisione tua, come prima.

---

*Rapporto generato il 21 settembre 2026 sul ramo `main` @ `2022369`. Verifiche eseguite su questo
commit: `tsc --noEmit -p tsconfig.app.json` (0 errori), `vite build` (ok), `vitest run` (427/432),
detection impeccable (14 segnalazioni).*
