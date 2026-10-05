# La Minilezione 2.0 — il lettore a blocchi

**Data:** 3 ottobre 2026
**Stato:** ✅ design approvato (4 decisioni di interazione prese con Chiara; veste grafica aggiornata al `DESIGN.md` 2.1 «Carta contemporanea» il 5 ottobre — le estetiche precedenti, Bisturi Editoriale e Ottanio 1.1, sono superate)
**Fonte collegata:** `docs/matrice-materie-2026-10-03.md` (le famiglie, i cervelli, la roadmap)
**Per chi:** Chiara (parole semplici). Nessun codice qui: è il disegno del lettore delle lezioni v2.

---

## 1. In una frase

La lezione si legge **un blocco alla volta**, con le **formule in primo piano** quando serve, le note **a margine**, e **verifiche in linea** che misurano subito senza aspettare la fine. La veste grafica è quella di `DESIGN.md` (versione 2.1, «Carta contemporanea»): carta nitida, titoli serif, atmosfera per materia.

---

## 2. Lo scheletro comune (tutte le materie)

- **Temi giorno/notte di DESIGN.md 2.1:** fondo avorio e carta opaca di giorno, superfici calde di notte; il lettore è **carta nitida** (mai glass): una superficie di lettura continua, senza incapsulare ogni paragrafo.
- **Tipografia:** titolo del concetto in **serif (Lora)**, spiegazione in **sans (Inter)** 18px interlinea 1.6–1.7, larghezza 58–72 caratteri; formule KaTeX e tabelle con regole proprie (scroll locale se larghe).
- **Avanzamento discreto:** leggibile, con stato e progressione chiari; niente mirino laser né animazione continua.
- **Azioni:** primarie **inchiostro a pillola** (il satinato è riservato alle copertine del corso, non al lettore); il rosso resta per errori e distruzione.
- **Zero emoji** come icone dell'interfaccia (regola di AGENTS.md): i blocchi si riconoscono da tipografia, filetti e struttura.
- **Immagini** (ritratti, figure OCR dal PDF): nitide, ingrandibili quando serve, con descrizione; il piano dietro al testo resta leggibile.
- **Il colore materia** compare in una fascia o figura pertinente, senza coprire il testo con una campitura piena.
- **Telemetria onesta**: la durata mostrata è quella **calcolata** dal piano v2 (niente "5 minuti" di fantasia).
- **Fine lezione**: "fogli di sala" — riepilogo secco di cosa è stato inciso e cosa resta; il quiz-evento di completamento resta quello della fondamenta (voto salvato).

## 3. Le quattro decisioni di interazione (approvate)

1. **Marginalia** → colonna sottile a destra del testo su tablet/desktop; su telefono, linguetta sul bordo destro che apre la scheda. Le note a margine non inquinano mai il testo.
2. **Quiz** → **checkpoint in linea**: una domanda a risposta secca subito dopo il blocco che verifica; niente accumulo di dubbi a fine lezione.
3. **Navigazione** → **un blocco alla volta** (pulsante o swipe); dentro ogni blocco il testo scorre liberamente. Un blocco = un'idea. Il telefono resta leggero.
4. **Storia e filosofia** → **narrazione a blocchi** col tono di chi racconta; la chat resta disponibile come oggi. (La lezione-chat guidata piena resta un'evoluzione futura, non un punto di partenza.)

## 4. Le sei declinazioni per famiglia

| Famiglia | Il blocco-cuore della lezione |
|---|---|
| 🔬 Scientifiche | **Blocco-formula**: formula composta come sul libro (KaTeX) con **anatomia** (tocchi un termine → si illumina con la spiegazione); **widget interattivo** configurato dall'AI; **esempio svolto** numerato passo-passo; checkpoint con **chat socratica** (non dà la risposta, fa la domanda giusta) |
| 📖 Letteratura | Card più lunghe e ariose (150–250 parole); ritratto OCR; citazioni in evidenza e commentate; marginalia con le note di sintesi ("isolati i 3 temi") |
| ⏳ Storia | **Mini-timeline del modulo sempre visibile in basso** con la lezione attiva evidenziata (segmenti geometrici, niente laser); date in evidenza ancorate alla linea (si ricordano posizionate); narrazione conversazionale |
| 🤔 Filosofia | Struttura dialogica **tesi → obiezione → replica**; molti esempi concreti; verifiche "cosa risponderebbe X a Y" |
| 🗣 Lingue | Tre modalità distinte: **concetto** (spiegazione asciutta), **pratica** (esercizi), **conversazione** (voce, trascrizione, correzione prima dell'invio — stile SuperFluent) |
| 🎨 Arte | **L'opera prima del testo**, a piena larghezza, didascalia leggibile, zoom sui dettagli; tablet mostra la mappa completa, telefono usa card sovrapposte |

## 5. Cosa serve per costruirla (i mattoni tecnici, in parole semplici)

1. **KaTeX** — la composizione matematica vera (`x = (−b ± √(b²−4ac)) / 2a` impaginata come sul libro).
2. **Il renderizzatore di widget** — il "letto" dove atterrano le simulazioni della biblioteca (parabola, moto, equilibrio…), configurate dall'AI via JSON.
3. **Il lettore v2 separato** — i percorsi vecchi continuano col lettore attuale; il nuovo si attiva solo per i percorsi v2 (vedi Matrice, regola v1/v2).
4. **I dati v2 col scheletro** — obiettivo, durata calcolata, difficoltà, blocchi tipizzati (formula, widget, esempio, checkpoint, marginalia…): li produce il progettista del Fiume 1.

## 6. Ordine di costruzione

Prima lo **scheletro comune + la declinazione scientifica** (è la più ricca: formule, widget, chat socratica — e allinea reader e motore), poi letteratura e storia, poi le altre. Ogni passo: costruito, testato, spinto separatamente.

*Documento di design. Veste grafica aggiornata il 5 ottobre 2026 a `DESIGN.md` 2.1 «Carta contemporanea»: le quattro decisioni di interazione restano approvate; i blocchi tipizzati e i checkpoint restano evoluzioni funzionali con contratto dati reale.*
