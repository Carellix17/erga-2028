# P48 — Ripulitura dei dettagli "da template"

> 14 settembre 2026 · Lavoro fatto sulle 27 segnalazioni del controllo automatico
> di design (`detector` della skill Impeccable). **17 risolte**, le restanti 10
> sono **una sola decisione** (il carattere dell'app) e aspettano te.

---

## 1. Che cos'era "da template"

Il controllo automatico segnalava 27 dettagli estetici che fanno somigliare
un'interfaccia a quelle fatte in serie. Tre famiglie:

1. **Movimenti "a rimbalzo"** (13) — animazioni che superano il punto d'arrivo e
   tornano indietro ("boing"). Gli oggetti veri non rimbalzano: rallentano mentre
   arrivano. Era il gruppo più visibile.
2. **Bordo colorato spesso su un lato** (3) — una barra piena da 3-4 px sul bordo
   sinistro dei blocchi del calendario: è il segno più riconoscibile delle
   interfacce fatte dall'AI generica (e ruba spazio in colonne strette).
3. **Caratteri molto comuni** (10) — ne parliamo al punto 4.

Più un dettaglio tecnico: **un'animazione che muoveva la larghezza** della barra
di avanzamento (1), che fa "scattare" l'interfaccia sui telefoni.

---

## 2. Cosa ho cambiato (in parole semplici)

### Movimento: una sola curva di casa

Ho aggiunto al foglio di stile **una curva di rallentamento naturale** (chiamata
`--ease-out`) e l'ho usata per tutti i movimenti che ho toccato. Da adesso c'è
**una sola lingua** per il movimento: niente più curve diverse in ogni schermata,
nessun rimbalzo.

| Dove | Prima | Adesso |
|---|---|---|
| Icone tonde di Pratica, Studio, File (7 punti) | Comparivano con un sobbalzo che "superava" la dimensione finale | Arrivano e si fermano: assestatura morbida di 280 ms |
| Risposta giusta negli esercizi | Oscillazione andata e ritorno (1 → +5% → −3% → 1) in 500 ms | Un solo respiro (+3%) in 340 ms, senza tornare indietro |
| Barra di avanzamento del Test Finale | Cresceva cambiando la **larghezza** (ricalcolo continuo della pagina) | Si "srotola" con una trasformazione: stessa animazione a occhio, molto più fluida |
| Schermata di avvio | La pillola entrava con una curva che superava la dimensione finale | Entra crescendo di un soffio, senza superare |
| Interruttori di Accessibilità | La manopola scattava con un rimbalzo all'indietro e ci metteva mezzo secondo | Scorre in 300 ms; alla **pressione** risponde in 110 ms (il pollice sente subito il tocco) |

### Le tre barre colorate del calendario

Nei blocchi del calendario (eventi con orario, attività senza orario, blocchi
routine) la barra piena da 3-4 px sul bordo sinistro è diventata un **filo di
1 px** nel colore della materia. Il colore resta leggibile perché il fondo del
blocco è già tinto del ~18% della stessa tinta, e la griglia ha più spazio per il
testo. È la stessa direzione già scelta per le card del Piano, dove l'accento è un
**puntino colorato**.

Il bordo è più marcato al buio (dove serve staccare dalla griglia) e più discreto
di giorno: sono due valori in un solo file (`src/lib/pianoPalette.ts`), facili da
ritoccare se a vedersi non ti convince.

### Due difetti trovati per strada

- **Un'animazione che non è mai partita:** l'apertura della pillola di avvio
  puntava a fotogrammi ("erga-pop") che **non esistevano** in nessun foglio di
  stile. Ora esistono: l'entrata c'è, ed è sobria.
- **Un lampo infinito:** l'interruttore di Accessibilità aveva un impulso che
  **continuava a pulsare per sempre** quando era acceso (`animate-ping`).
  Adesso fa **un solo impulso**, al momento in cui lo accendi o lo spegni.

---

## 3. Cosa vedrai tu (e cosa no)

- **Nessuna schermata cambia forma, posizione o contenuto.**
- Cambia il *modo* in cui le cose si muovono: più calmo, più pronto, senza
  rimbalzi. Il lampo infinito dell'interruttore sparisce.
- Nei blocchi del calendario il bordo spesso diventa un filo sottile.
- La barra di avanzamento del Test Finale si muove più fluida (soprattutto su
  telefono).
- Chi ha attivato "Riduci le animazioni" nel sistema operativo continua a vedere
  l'app quasi ferma: la regola di rispetto delle preferenze è rimasta intatta.

---

## 4. Cosa resta: 10 segnalazioni, una sola decisione

Le 10 segnalazioni rimaste sono tutte lo **stesso argomento**: il carattere
tipografico principale dell'app, **Montserrat** (9 punti nei fogli di stile) e
**Plus Jakarta Sans** usato come carattere delle etichette in maiuscolo (1 punto).

Il controllo li segnala perché sono caratteri usatissimi sul web: danno
l'impressione di "design generico". **Ma cambiarli significa cambiare l'aspetto di
tutta l'app**, non una rifinitura: è una decisione tua, non una pulizia che posso
fare di nascosto. Tre strade possibili:

1. **Confermare Montserrat come scelta di marca** e registrarla (con una nota nel
   file): costo zero, nessun cambio visivo, la segnalazione smette di essere un
   problema.
2. **Cambiare solo i titoli** (carattere display) e tenere Montserrat sul testo:
   dà personalità dove si nota, senza stravolgere tutto.
3. **Sostituire il carattere base** con una scelta più distintiva: effetto più
   forte e più lavoro (tutta l'app cambia voce).

---

## 5. Controlli eseguiti (e risultati)

| Controllo | Esito |
|---|---|
| Test automatici | ✅ 402 passati su 407 — i **5 rossi sono quelli della Home** che hai chiesto di non toccare |
| Controllo tipi (TypeScript) | ✅ 0 errori |
| Compilazione di produzione | ✅ riuscita |
| Controllo di design (detector) | ✅ **da 27 a 10 segnalazioni** — le 10 rimaste sono la sola questione carattere |
| Regole di accessibilità | ✅ `prefers-reduced-motion` rispettato, nessun testo o controllo rimpicciolito, nessuna emoji-icona |

**File toccati:** `src/index.css`, `src/lib/pianoPalette.ts`,
`src/components/piano/WeekPlanner.tsx`, `src/components/ui/bouncy-toggle.tsx`,
`src/components/shared/SplashScreen.tsx`, `src/components/studio/FinalTest.tsx`,
`src/components/pratica/InterrogazioneView.tsx`,
`src/components/pratica/EserciziView.tsx`, `src/components/upload/FileManager.tsx`,
`src/test/pianoPalette.test.ts`, `src/test/PlanItem.test.tsx`.

**Nessun cambiamento a database o funzioni cloud:** per questo lavoro non serve
nessun intervento su Lovable Cloud. Basta premere **Update** in Lovable per vedere
le rifiniture nell'anteprima.
