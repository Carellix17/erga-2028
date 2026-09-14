# Il documento di design di Erga — 14 settembre 2026

Da oggi il progetto ha un **`DESIGN.md`**: il libretto delle regole visive di Erga.
Prima vivevano solo dentro il codice, quindi ogni modifica doveva "leggere" migliaia
di righe per capire quali colori, caratteri e spazi fossero quelli giusti. Adesso
sono scritti in un posto solo, in italiano, leggibile anche da chi non programma.

---

## 1. Che cosa contiene

Il file ha due parti:

1. **Una parte per le macchine** (in cima, tra i trattini `---`): l'elenco esatto dei
   valori — colori, caratteri e dimensioni, angoli, spaziature, componenti. Serve
   perché gli assistenti e i controlli automatici (come il detector di Impeccable)
   possano verificare che il codice resti coerente col sistema.
2. **Una parte leggibile** (sotto): otto capitoli — Panoramica, Colori, Tipografia,
   Layout, Profondità, Forme, Componenti, Cose da fare e da non fare — più **dodici
   "regole con un nome"** pensate per essere ricordate e citate.

| Regola | In una riga |
|---|---|
| La Regola del Palco | Il fondo pagina non compete mai col contenuto: niente sfocature sulle superfici che scorrono |
| La Regola del Mono | L'app parla una voce neutra; il colore entra solo se porta informazione |
| La Regola del Colore che Informa | Prima di aggiungere un colore, chiedersi cosa comunica |
| La Regola dell'Avorio Unico | Una sola superficie avorio per schermata (quella su cui agire adesso) |
| La Regola della Voce Unica per Livello | Un solo carattere per livello: se il titolo è Radja, i titoli di sezione restano Montserrat |
| La Regola del Piccolo Stampato | Sotto i 13 px solo metadati densi: il testo di lettura non scende mai sotto i 16 px |
| La Regola della Scala Rispettata | Il testo segue la preferenza di accessibilità dello studente |
| La Regola del Telefono Primo | Si progetta a 375 px e si verifica fino a 1440 px |
| La Regola della Navigazione Unica | Il guscio è uno solo: stesso menu su telefono e computer |
| La Regola dell'Elevazione Dichiarata Una Volta | O filetto o ombra, mai tutti e due |
| La Regola del Filo | Accenti colorati = filetti da 1 px o puntini, mai barre spesse |
| La Regola della Pressione Scontata | Ogni comando mostra di essere stato premuto entro 150 ms |
| La Regola dei 44 px | Nessun controllo sotto 44 × 44 px |

---

## 2. Le tue scelte di oggi

Le ho scritte nel documento come "voce" del sistema:

- **L'idea guida:** *"La stanza di studio"* — carta calda, inchiostro, silenzio
  attorno al contenuto.
- **Il carattere:** **energico e grintoso** — l'ordine è il punto di partenza;
  l'energia si esprime col contrasto e con i colori delle materie dove aiutano,
  non con decorazioni.
- **I comandi:** **pronti e reattivi** — risposta alla pressione entro 150 ms.

---

## 3. Due file di supporto

- **`.impeccable/design.json`** — la versione "per il pannello": 30 colori con i
  loro nomi descrittivi, 17 ruoli tipografici, 7 ombre, i tempi del movimento, i
  punti di rottura dello schermo e **9 componenti reali** (pulsante primario,
  pillola, contorno, card, card avorio, campo di testo, pillola di navigazione,
  chip materia, barra di avanzamento) con il loro codice pronto da mostrare.
- **`.impeccable/config.json`** — aggiornato: i controlli di coerenza col sistema
  ora guardano **l'app**, non i file di test né la vetrina marketing (che ha un
  sistema di colori tutto suo, dichiarato come "mondo a sé" nel documento).

---

## 4. Il documento ha subito fatto il suo lavoro

Appena scritto, il controllo automatico ha iniziato a confrontare il codice col
sistema dichiarato e ha trovato **197 incoerenze** (prima non poteva: non c'era
niente con cui confrontare). Le ho esaminate una per una:

| Esito | Quante | Cosa erano |
|---|---|---|
| Sistemate nel codice | 3 | Etichetta dei blocchi routine a 9 px → 10 px (leggibilità); etichetta editoriale che usava un carattere fuori ruolo → ora Raleway |
| Documentate perché legittime | ~180 | Scala tipografica reale (compreso il "piccolo stampato" 10–13 px), colori della routine, macro-metriche dei riepiloghi, raggio del foglio lezione, nero pieno di servizio |
| Escluse dal controllo | — | File di test (non sono interfaccia) e vetrina marketing (mondo a sé, con i suoi gettoni `--lp-*`) |
| **Rimaste aperte** | **10** | 8 = la questione carattere Montserrat (tua decisione, rimandata); 2 = due testi a 17 px da allineare alla scala |

---

## 5. Controlli eseguiti

| Controllo | Esito |
|---|---|
| Test automatici | ✅ 402 su 407 — i 5 rossi sono sempre le guardie della Home (invariate) |
| Controllo tipi (TypeScript) | ✅ 0 errori |
| Compilazione di produzione | ✅ riuscita |
| Controllo di design | ✅ da 27 segnalazioni a **10** (di cui 8 = la questione carattere) |

**Nessun intervento su Lovable Cloud richiesto:** questi file non toccano database
né funzioni cloud. Serve solo premere **Update** in Lovable per vedere le due
micro-correzioni grafiche (etichetta del calendario a 10 px ed etichetta Raleway).
