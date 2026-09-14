# Analisi della repo Erga — 14 settembre 2026

Documento in linguaggio semplice, senza gergo tecnico.
Aggiorna l'analisi dell'8 settembre (`analisi-repo-2026-09-08.md`) allo stato
attuale del ramo `main`. **Nessuna modifica al funzionamento dell'app:** solo una
nuova "visita medica" completa, fatta per aprire il nuovo ciclo di lavoro.

---

## 1. In una frase

Erga sta bene: **si compila, i tipi sono corretti, i test passano al 98,8%**.
Restano **5 controlli fermati che riguardano solo lo stile della Home** (non
rompono nulla) e i controlli automatici di design hanno rilevato **27 dettagli
estetici "da template"** da ripulire. Nessuna emergenza: si può lavorare con calma
e con metodo.

---

## 2. Cosa ho fatto

Seguendo le regole di lavoro del progetto (`AGENTS.md`, `PRODUCT.md`, catalogo
`.agents/skills/`):

1. Ho scaricato l'ultima versione del codice dal ramo `main`.
2. Ho installato le librerie necessarie per far girare i controlli.
3. Ho eseguito la visita completa: test automatici, controllo dei tipi,
   compilazione di produzione, esame degli avvisi di stile, controllo di design.
4. Ho verificato che la **chiave GitHub fornita funziona** e ha i permessi di
   scrittura sul repository.

---

## 3. Lo stato di salute — risultati

| Controllo | Esito | Cosa significa in parole povere |
|---|---|---|
| Test automatici | ⚠️ **401 su 406 passati** (49 file) | Quasi tutto verde; 5 controlli di stile sulla Home sono rimasti indietro |
| Controllo tipi (TypeScript) | ✅ **0 errori** | Il codice è internamente coerente |
| Compilazione di produzione | ✅ **riuscita** in 13 s | L'app è pubblicabile così com'è |
| Avvisi di stile (lint) | 🟡 **85** (67 errori, 18 avvisi) su ~29 file | Nessuno rompe l'app: quasi tutti sono "scorciatoie di tipo" e piccole regole di stile |
| Controllo automatico di design | 🟡 **27 segnalazioni** | Dettagli estetici che "sa di template" (rimbalzi, font comuni, bordo colorato) |
| Riga di comando | ✅ `push` verificato | Posso pubblicare le modifiche su GitHub da solo |

### Dimensioni del progetto

| Voce | Valore |
|---|---|
| App (codice, esclusi i test) | ~34.700 righe |
| Test | ~5.400 righe in 49 file |
| Funzioni cloud ("Edge Function") | 26, ~8.300 righe |
| Struttura del database (migrazioni) | 59 file |
| Modifiche totali nel tempo | 337 |

---

## 4. Cos'è cambiato dall'8 settembre

| Data | Lavoro | In parole povere |
|---|---|---|
| 8 set | Serie di salvataggi e colori sistemati da Lovable | Riparazioni dal lato app/cloud |
| 8 set | Piano: foglio "Aggiungi evento" più compatto, ora di fine obbligatoria | Meno errori quando si pianifica |
| 12 set | Il menu di navigazione da computer diventa **uguale a quello del telefono** (pillola verticale in alto a sinistra + cerchio "Core" in basso) | Esperienza più coerente tra telefono e PC |
| 12 set | Gli interruttori di Accessibilità diventano "PremiumToggle" | Rifinitura dei comandi |
| 14 set | Sistemata la posizione del pulsante "Core" da computer | Piccola correzione di posizionamento |

**Nota:** dopo l'8 settembre non c'è nessun cambiamento che tocchi le aree in
sospeso (i 5 test e le segnalazioni di design): sono ancora lì, identiche.

---

## 5. Il punto aperto: i 5 controlli di stile della Home

Il **7 settembre** era stato annullato il nuovo stile "scuro/lussuoso" della card
del corso in Home, tornando alla versione **a colori** (quella che usa la stessa
"pelle" delle card di Studio). I **controlli di guardia** scritti per difendere lo
stile scuro non sono stati aggiornati: adesso si aspettano una Home che non esiste
più. Ecco, uno per uno, cosa chiedono e cosa c'è davvero oggi:

| # | Controllo | Cosa si aspetta | Situazione reale oggi |
|---|---|---|---|
| 1 | Superfici "solide", senza vetro sfocato | Nessuna sfocatura (`blur`) nei componenti della Home | La card del corso **nella versione "nessun corso attivo"** usa la classe `glass-tactile`, che applica una sfocatura dietro al pannello |
| 2 | Card "percorso" sopraelevata, di notte avorio | Ombra dedicata `shadow-hero` + versione notturna color avorio | L'ombra `shadow-hero` **c'è**; manca la versione notturna avorio |
| 3 | Pulsante "Riprendi lezione" a pillola scura | Pulsante con spaziatura `px-6` | Il pulsante è una pillola, ma con spaziatura diversa |
| 4 | Titolo del corso con font **Radja** | Titolo grande in Radja (`text-3xl` / `sm:text-4xl`) | Il titolo non usa più Radja (era parte dello stile annullato) |
| 5 | Token "dark luxury" centrali | Variabili colore avorio/antracite + font Radja attivi in modo stabile | Le variabili avorio esistono ancora nei fogli di stile, ma la card non le usa più |

**Perché non è un'emergenza:** questi 5 controlli non provano nessuna funzione
dell'app (caricamento, studio, esercizi, piano). Leggono il testo dei file e
verificano che compaiano o non compaiano certe classi di stile. L'app funziona e
si compila benissimo.

**Attenzione — un dettaglio è reale:** il punto 1 non è solo "gusto". La guardia è
stata scritta per un motivo di **prestazioni su telefono**: la sfocatura dietro ai
pannelli che scorrono costa batteria e fluidità. La card "nessun corso attivo" ha
davvero quella sfocatura. Quindi conviene non cancellare la guardia, ma **sistemare
la card** (sfondo pieno) — così il controllo 1 torna verde *senza* indebolire la
regola.

**Due strade possibili (serve la tua decisione):**

- **Strada A (consigliata)** — *tenere la Home a colori*: si aggiornano i controlli
  2–5 alla scelta di design attuale, e si toglie la sfocatura dalla card vuota
  (punto 1). Risultato: tutto verde, nessun cambio visibile, prestazioni migliori.
- **Strada B** — *riportare lo stile "scuro/lussuoso"*: si ripristina la Home
  avorio/antracite con titolo Radja, e i 5 controlli tornano verdi da soli. Cambia
  però di nuovo l'aspetto della Home e va fatto con le skill di design.

---

## 6. Le 27 segnalazioni del controllo automatico di design

Sono controlli meccanici (la "skill" Impeccable) su tutto il codice dell'app,
compresi i fogli di stile globali. Rispetto all'audit dell'8 settembre il numero è
più alto (27 contro 11) perché **questa volta ho incluso anche i file di stile
generali**, che prima non erano stati passati al setaccio.

| Tipo | Quante | Dove | Perché conta |
|---|---|---|---|
| Movimento "a rimbalzo" | 13 | `index.css` (5), `InterrogazioneView` (4), `EserciziView`, `FinalTest`, `SplashScreen`, `FileManager`, `bouncy-toggle` | I rimbalzi elastici sembrano datati. Un oggetto vero rallenta in modo morbido: si sostituiscono con curve di rallentamento naturali |
| Font molto comuni | 10 | `index.css` (9: Montserrat), `landing.css` (1: Plus Jakarta Sans) | Montserrat e Plus Jakarta Sans sono usatissimi: danno l'impressione di "design generico". Si può valutare un carattere con più personalità (il progetto ha già Radja, self-hosted) |
| Bordo colorato su un lato della card | 3 | `WeekPlanner` (2), `PlanItem.test.tsx` (1) | È il segno più riconoscibile delle interfacce fatte dall'AI generica. Si sostituisce con un accento più elegante |
| Animazione che muove la larghezza | 1 | `index.css` | Animare la larghezza fa "scattare" l'interfaccia: meglio usare trasformazione e opacità |

**Nota importante sulla coerenza:** il 7 settembre era già stato fatto un lavoro
proprio su questo tema ("via rimbalzi da template"). Le segnalazioni rimaste
riguardano i punti **non ancora** sistemati. È un lavoro a basso rischio, visibile
solo in rifiniture.

---

## 7. Punti di attenzione ancora aperti

- 🟡 **Primo caricamento pesante sul telefono.** Alla prima apertura l'app scarica
  due pacchetti grandi: uno da **1.023 KB** (compresso 293 KB) e uno da
  **795 KB** (compresso 240 KB). Su rete lenta si sente. Soluzione: caricare ogni
  "stanza" (Studio, Piano, Pratica, Core) solo quando serve.
- 🟡 **File molto lunghi** — `EserciziView.tsx` (1.245 righe),
  `StudioView.tsx` (1.180), `generate-lessons` (1.069): sono i punti dove è più
  facile rompere qualcosa toccando altro. Si possono dividere in pezzi più piccoli.
- 🟡 **85 avvisi di stile**, concentrati su "scorciatoie di tipo" (`any`, 44) e su
  componenti che esportano più cose insieme (16). Nessuno rompe nulla.
- 🟡 **`.env` dentro la repo.** Contiene solo chiavi pubbliche (riverificato), ma è
  un'abitudine da tenere d'occhio: una chiave "live" dei pagamenti è comunque
  visibile.
- 🟡 **Un test instabile** (`pathHeroPicker`): in ambiente di test manca una
  funzione di scorrimento. Non è un problema dell'app, ma sporca il risultato.

---

## 8. Un documento di design mancante

Il progetto ha `PRODUCT.md` (chi sono gli utenti, cosa fa il prodotto) ma **non ha
un `DESIGN.md`** (le regole visive: colori, caratteri, spaziature, movimenti). Le
decisioni visive oggi vivono solo nel codice. La skill Impeccable sa **ricostruire
quel documento leggendo il codice**: è un lavoro a basso rischio che renderebbe
tutte le modifiche future più coerenti e veloci.

---

## 9. Come lavorerò (regole confermate)

1. Leggo la skill adatta al lavoro: design → Impeccable / frontend-design;
   movimento → skill Emil Kowalski; scorrimento → scroll-experience; 3D solo se
   serve davvero.
2. Modifico il codice rispettando le priorità Erga: sicurezza → accessibilità →
   chiarezza → prestazioni → identità visiva → effetti.
3. Eseguo test + controllo tipi + compilazione, e il controllo di design sulle
   parti toccate.
4. Pubblico io su GitHub (chiave verificata) e ti dico cosa è stato pubblicato.
5. Ti spiego tutto in parole semplici: cosa cambia, perché, cosa vedi tu.
6. **Se serve il database o una funzione cloud, NON lo faccio io**: ti preparo un
   prompt pronto da incollare in Lovable.
7. Ti ricordo di premere **Update** su Lovable per vedere le modifiche nell'anteprima.

---

*Analisi eseguita al commit `d3bd6f0` ("Fixed desktop Core button pos"), ramo
`main`, 337 commit totali. Test: 401/406 passati (5 falliti in
`homeCleanSurfaces.test.ts`). TypeScript: 0 errori. Build di produzione: riuscita.
Detector Impeccable: 27 segnalazioni (13 rimbalzi, 10 font, 3 bordi laterali,
1 animazione di larghezza).*
