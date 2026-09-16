# Analisi della repository — 16 settembre 2026

Visita di salute completa all’apertura del ciclo di lavoro con l’agente Arena.
Nessuna modifica al funzionamento dell’app: solo un controllo aggiornato rispetto
all’analisi del 14 settembre (`analisi-repo-2026-09-14.md`).

---

## 1. In una frase

Erga sta bene: **si compila, i tipi sono corretti, 412 test su 417 passano**.
Restano **5 controlli di stile sulla Home** (non rompono nulla) e alcuni avvisi
di stile minori. Nessuna emergenza: si può lavorare con calma.

---

## 2. Cosa ho fatto

1. Ho scaricato l’ultima versione del codice dal ramo `main` (commit `9b1189d`).
2. Ho installato le librerie necessarie.
3. Ho eseguito la visita completa: test automatici, controllo dei tipi,
   compilazione di produzione, esame degli avvisi di stile.
4. Ho verificato che la **chiave GitHub funziona** e ha i permessi di scrittura.
5. Ho riletto le regole di lavoro (`AGENTS.md`, `PRODUCT.md`, `DESIGN.md`) e il
   catalogo delle skill in `.agents/skills/`.

---

## 3. Lo stato di salute — risultati

| Controllo | Esito | Cosa significa in parole povere |
|---|---|---|
| Test automatici | ⚠️ **412 su 417 passati** (49 file) | Quasi tutto verde; 5 controlli di stile sulla Home sono rimasti indietro |
| Controllo tipi (TypeScript) | ✅ **0 errori** | Il codice è internamente coerente |
| Compilazione di produzione | ✅ **riuscita** in ~15 s | L’app è pubblicabile così com’è |
| Avvisi di stile (lint) | 🟡 **35** (15 errori, 20 avvisi) | Nessuno rompe l’app: scorciatoie di tipo e regole di stile |
| Chiave GitHub / push | ✅ verificata | Posso pubblicare le modifiche su GitHub da solo |

### Dimensioni del progetto (16 settembre 2026)

| Voce | Valore |
|---|---|
| App (codice, esclusi i test) | ~37.700 righe |
| Test | ~5.600 righe in 49 file |
| Funzioni cloud (“Edge Function”) | 31 cartelle, ~9.100 righe |
| Struttura del database (migrazioni) | 59 file |
| Commit totali | 352 |
| Commit di riferimento | `9b1189d` — *P46 — Percorsi: lista dei moduli guidata e percorso a serpentina* (14 set 2026) |

---

## 4. Cos’è Erga (in breve)

Erga è una piattaforma di studio per **studenti delle superiori**. Parte dai
materiali reali (PDF, documenti, foto, web), costruisce lezioni e esercizi con
l’AI, adatta il percorso a un **profilo cognitivo** (Logica, Memoria, Focus,
Lessico, Calma, Pratica) e collega tutto a un **piano** con verifiche e impegni.

### Le “stanze” dell’app

| Area | A cosa serve |
|---|---|
| **Home** | Da dove riprendere oggi (corso attivo, strumenti rapidi, timeline) |
| **Studio** | Percorsi, moduli, lezioni, generazione da materiali |
| **Pratica** | Esercizi e simulazione di interrogazione |
| **Piano** | Calendario e proposte di studio |
| **Core** | Profilo cognitivo, materie, routine settimanale |
| **Focus** | Sessioni di concentrazione e statistiche |
| **Chat** | Assistente di studio legato ai materiali |
| **Landing** | Vetrina pubblica (marketing) |
| **Impostazioni / Profilo** | Account, aspetto, accessibilità, lingua |

### Stack tecnico

- **Frontend:** React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Framer Motion
- **Dati / auth:** Supabase (via Lovable Cloud)
- **AI e lavoro pesante:** Edge Function (chat, lezioni, esercizi, PDF, piano, TTS, pagamenti…)
- **Pubblicazione UI:** Lovable (pulsante **Update** per vedere le modifiche)
- **Codice ufficiale:** ramo `main` su GitHub

---

## 5. Cosa è cambiato dal 14 settembre

Rispetto all’analisi del 14 settembre, sul ramo `main` risultano soprattutto:

| Lavoro | In parole povere |
|---|---|
| **P46 — Percorsi a serpentina** | Nello Studio, i moduli si presentano come un percorso guidato più chiaro |
| **DESIGN.md** | Ora esiste il documento ufficiale di colori, caratteri, spaziature e regole visive |
| Welcome mail e altri salvataggi Lovable | Piccole evoluzioni lato cloud / prodotto |

**Nota:** i **5 test di stile della Home** sono ancora rossi, per lo stesso motivo
del 14 settembre (stile “dark luxury” abbandonato, controlli non aggiornati).

---

## 6. Il punto aperto: i 5 controlli di stile della Home

File: `src/test/homeCleanSurfaces.test.ts`.
Non verificano funzioni (studio, login, piano): leggono il testo dei file e
cercano certe classi di stile.

| # | Controllo | Situazione reale oggi |
|---|---|---|
| 1 | Niente sfocatura (`glass` / `backdrop-blur`) sulle superfici Home | La card “nessun corso attivo” usa ancora `glass-tactile` |
| 2 | Card percorso avorio di notte + bordo dedicato | La card attiva usa lo stile colorato di Studio (`bg-inverse-surface` + `shadow-hero`), non l’avorio P36 |
| 3 | Pulsante “Riprendi” con `px-6` | La pillola c’è, ma con spaziatura diversa (`px-4`) |
| 4 | Titolo corso in font **Radja** | Il titolo usa `font-display` (Montserrat), non Radja |
| 5 | Token “dark luxury” centrali | Avorio/Radja esistono nei fogli di stile, ma la card non li usa più |

**Perché non è un’emergenza:** l’app funziona e si compila.

**Dettaglio reale sul punto 1:** la sfocatura dietro ai pannelli che scorrono costa
batteria e fluidità sul telefono. Conviene **togliere il vetro** dalla card vuota
(fondo pieno), non cancellare la regola.

**Due strade (serve decisione):**

- **A (consigliata)** — tenere la Home a colori: aggiornare i controlli 2–5 e
  togliere la sfocatura dalla card vuota.
- **B** — ripristinare lo stile scuro/lussuoso avorio + Radja (cambio visivo vero).

---

## 7. Altri punti di attenzione

- 🟡 **Primo caricamento pesante sul telefono.** Due pacchetti grandi restano:
  ~1.030 KB (gzip ~295 KB) e ~796 KB (gzip ~240 KB). Su rete lenta si sente.
  Parte del codice è già “a pezzi” (lazy load), ma il nucleo dell’app autenticata
  è ancora corposo.
- 🟡 **File molto lunghi** (es. viste Studio / Pratica e alcune Edge Function):
  toccarli richiede attenzione.
- 🟡 **35 avvisi lint** (15 errori, 20 warning): soprattutto `any` e export multipli
  nei context. Non bloccano build o test.
- 🟡 **`.env` in repo** con sole chiavi **pubbliche** Vite/Supabase (verificato).
  Abitudine da tenere d’occhio: niente segreti privati lì.
- ✅ **DESIGN.md** ora c’è (mancava il 14 settembre): da usare come bussola visiva
  insieme a `PRODUCT.md` e `AGENTS.md`.

---

## 8. Come lavorerò da qui in poi (regole confermate)

1. **Skill** in `.agents/skills/` come linee guida (Impeccable, frontend-design,
   animate, scroll-experience, ecc.), con priorità a `PRODUCT.md` → `AGENTS.md` →
   `DESIGN.md`.
2. **Spiegazioni in italiano semplice** a ogni passo: cosa cambia, perché, cosa vedi.
3. **Push autonomo su GitHub** dopo le modifiche (chiave fornita, verificata).
4. **Lovable Cloud:** se servono migrazioni database o deploy di Edge Function,
   preparo un **prompt pronto** da incollare in Lovable — non le eseguo io.
5. Dopo ogni modifica al codice: ricordare di premere **Update** su Lovable.
6. Priorità: sicurezza → accessibilità → chiarezza → prestazioni → identità visiva → effetti.
7. Non dichiaro nulla “online” finché non è davvero pubblicato o verificato.

---

## 9. Capacità dell’agente su questa chat

- Leggere e modificare il codice della repo.
- Eseguire test, TypeScript, build, lint.
- Pubblicare su GitHub.
- **Analizzare immagini** che mi invii o che siano nei file del progetto
  (screenshot, mockup, foto di UI): posso descriverle e usarle come riferimento
  per correzioni di design.

---

*Analisi eseguita al commit `9b1189d` (“P46 — Percorsi…”), ramo `main`, 352 commit.
Test: 412/417 passati (5 falliti in `homeCleanSurfaces.test.ts`). TypeScript: 0 errori.
Build di produzione: riuscita (~15 s). Lint: 35 problemi non bloccanti.
Push GitHub: verificato.*
