---
name: Erga
description: Carta contemporanea — fondo avorio, fogli arrotondati, titoli serif (Lora) e testo sans (Inter), copertine colorate per materia con azioni satinato. Atmosfera Granola come riferimento, non copia.
colors:
  # ── Neutri e azioni — giorno (§4) ────────────────────────────────────
  canvas: "#F6F3EB"        # tavolo, fondo principale
  paper: "#FFFEF9"         # superficie leggibile
  paper-muted: "#ECE9DF"   # zone secondarie e pulsanti quieti
  ink: "#252623"           # testo principale e azione primaria
  ink-muted: "#65665E"     # testo secondario
  line: "#DEDCD2"          # separatore decorativo
  control-line: "#888B7A"  # contorno quando necessario per un controllo
  on-ink: "#FFFEF9"        # testo e icone sull'azione primaria
  focus: "#252623"         # indicatore di focus
  # ── Notte (§4, proposta) ─────────────────────────────────────────────
  night-canvas: "#22221F"
  night-paper: "#2D2C29"
  night-paper-muted: "#383632"
  night-ink: "#F4F1E7"
  night-ink-muted: "#C9C5BA"
  night-line: "#4B4842"
  night-control-line: "#918B80"
  # ── Famiglia di accenti per le composizioni (§4) ─────────────────────
  cedro: "#DCE879"         # luminoso e presente
  rosa-carta: "#DFADC6"    # caldo ed espressivo
  pervinca: "#C5CEF0"      # calmo, articolato
  albicocca: "#F1C6A5"     # caldo, energico
  azzurro-polvere: "#BDD9E1" # aperto, preciso
  # ── Materie: registro esistente da inventariare, identificatori conservati (§4) ──
  subject-blue: "#2563EB"
  subject-red: "#DC2626"
  subject-yellow: "#EAB308"
  subject-emerald: "#059669"
  subject-amber: "#D97706"
  subject-lime: "#65A30D"
  subject-cyan: "#0891B2"
  subject-violet: "#7C3AED"
  subject-orange: "#EA580C"
  subject-magenta: "#C026D3"
  subject-neutral: "#94A3B8"
  # ── Routine: blocchi fissi del calendario (dati, non marca) ──────────
  routine-sleep: "#4F46E5"
  routine-school: "#64748B"
  routine-meal: "#EF4444"
  routine-other: "#0D9488"
  # ── Marketing (vetrina attuale, isolata; il pilota la rivaluta, §17) ──
  marketing-red: "#E30613"
  marketing-rose: "#C4878B"
  marketing-gold: "#C4A574"
typography:
  # Coppia iniziale (§5): Lora serif 400/500 per i titoli; Inter sans
  # 400/500/600 per lettura, controlli e dati. Font da verificare nel
  # progetto prima di aggiungere caricamenti. KaTeX e code font preservati.
  display:            # saluto / titolo principale della pagina
    fontFamily: "Lora, Georgia, serif"
    fontSize: "2.25rem"     # 32–36 telefono, 40–48 desktop
    fontWeight: 400
    lineHeight: 1.16
  course-title:       # titolo corso protagonista
    fontFamily: "Lora, Georgia, serif"
    fontSize: "1.875rem"    # 26–30 telefono, 32–36 desktop
    fontWeight: 500
    lineHeight: 1.2
  scene-title:        # titolo scena didattica / concetto
    fontFamily: "Lora, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 500
    lineHeight: 1.2
  module-title:       # titolo modulo / intestazione di attività
    fontFamily: "Lora, Georgia, serif"
    fontSize: "1.625rem"
    fontWeight: 500
    lineHeight: 1.25
  subsection:         # sottosezione operativa / scelta strumento
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.3
  reading:            # lettura didattica
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"   # 18px, interlinea 1.6–1.7
    fontWeight: 400
    lineHeight: 1.65
  interface:          # interfaccia, pulsanti, input, navigazione
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"       # 15–16px
    fontWeight: 400
    lineHeight: 1.45
  label:              # metadati
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"   # 13–14px
    fontWeight: 400
    lineHeight: 1.45
rounded:
  # (§6) l'arrotondamento è una gerarchia, non un valore unico.
  sm: "8px"           # badge di data, dettagli piccoli
  control: "16px"     # input, select, menu, segmenti esterni
  card: "24px"        # card di strumenti, moduli, righe autonome
  hero: "32px"        # card corso e fogli protagonisti
  sheet: "32px"       # alias di hero per dialoghi e sheet
  nav: "24px"         # dock mobile, stessa famiglia delle card
  pill: "999px"       # azioni principali, satinato delle copertine, chip pertinenti
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    note: "inchiostro/carta, testo sans, sagoma a pillola (§9)"
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.pill}"
    height: "44px"
  button-satin:
    note: "SOLO Continua/Riprendi/Scegli sulle copertine (§7): carta calda 75–85%, blur locale 8–12px, testo inchiostro opaco, pillola, fallback carta piena"
    backgroundColor: "paper al 80% (giorno) / night-paper all'85% (notte)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.paper-muted}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "44px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    borderColor: "{colors.control-line}"
    rounded: "{rounded.control}"
    height: "44px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    borderColor: "{colors.line}"
    borderWidth: "1px"
    rounded: "{rounded.card}"
    padding: "16px 20px"
  card-hero:
    note: "copertina colorata: composizione astratta per materia, testo protetto, grana 3–5% (§3, §7)"
    backgroundColor: "colore materia + composizione"
    rounded: "{rounded.hero}"
    padding: "20px 24px"
  nav-dock:
    note: "dock flottante arrotondato, carta opaca, ombra controllata, ~64px, margini 16–20px, safe area (§10)"
    rounded: "{rounded.nav}"
    height: "64px"
---

# ERGA — DESIGN SYSTEM
Versione 2.1 · 5 ottobre 2026 · Carta contemporanea · Specifica finale della direzione approvata

> **Integrazione nel repository (pacchetto V2-00, 5 ottobre 2026).**
> Questa specifica v2.1 "Carta contemporanea" **sostituisce integralmente** la versione 1.1
> (ottanio, raggio zero, Ubuntu Sans obbligatorio): non si sommano le due identità. I token nel
> frontmatter e in `.impeccable/design.json` dichiarano il **sistema di destinazione** da validare
> nel pilota (V2-01: Home completa + lezione rappresentativa); **il runtime mostra ancora la veste 1**
> (pacchetti D1–D3) finché il pilota non la migra — cambiare questo documento non ridisegna l'app.
> La versione 1.1 resta solo come archivio storico nella storia del repository. Stato dei lavori e
> inventario dei test di stile da migrare: `docs/registro-redesign-2026-10-03.md`.


## 1. Autorità e ambito

Questa specifica sostituisce integralmente la direzione grafica della versione 1.1: ottanio come marca, angoli a raggio zero e Ubuntu Sans obbligatorio sono superati per decisione del proprietario. Non sommare le due identità. Il riferimento principale è l'atmosfera delle due immagini Granola fornite dal proprietario: carta calda, grana delicata, serif espressivo, forme arrotondate, inchiostro scuro e composizioni colorate.

Il documento è pronto per l'integrazione nel DESIGN.md alla radice del repository Carellix17/erga-2028. La sua presenza qui non implica che sia già integrato, implementato o pubblicato.

Rispettare PRODUCT.md, AGENTS.md e i vincoli operativi del progetto. Il nuovo design cambia presentazione e interazioni visive, non autorizza cambiamenti ai dati, alla didattica, all'autenticazione, ai pagamenti o al backend. Non inventare funzionalità per riempire una schermata.

### Decisioni approvate dal proprietario

- La direzione è carta contemporanea ispirata alle immagini Granola, con forme morbide e arrotondate.
- L'ottanio non è più il colore guida di Erga.
- Si prova il serif; Ubuntu Sans non è un vincolo da conservare.
- Le composizioni astratte delle materie e la matericità restano centrali.
- Le transizioni fluide tra corso, percorso, modulo e lezione restano desiderate.
- Home, Piano, Studio e Core restano le quattro destinazioni principali; navigazione mobile flottante unificata.
- Concentrazione e coinvolgimento convivono: diagrammi animati e piccole interazioni servono la comprensione.
- Core conserva il ruolo centrale nella parte personale e nei progressi futuri.
- Quattro materiali con ruoli stabili: fondo, carta, copertina colorata e velo satinato. La carta domina l'esperienza; il satinato è locale alle copertine.
- Continua/Riprendi sulle copertine è un'azione principale satinata. Nel resto del prodotto le azioni primarie sono inchiostro su carta.
- Titoli serif leggeri, colore espressivo sulle copertine e continuità della stessa identità corso nelle diverse viste.

Questa versione integra la revisione del documento e la proposta esplicitamente approvata dal proprietario. La direzione è approvata; la prima implementazione di Home e lezione rimane da valutare. Non confondere approvazione del sistema con verifica del risultato online.

### Valori iniziali proposti, da validare visivamente

Font Lora e Inter, palette numerica, raggi, ombre, scala tipografica e durate qui sotto sono una proposta coerente per il primo pilota. Non sono misure estratte da Granola. Correggerli dopo la verifica delle schermate, aggiornando i token condivisi.

Le immagini di riferimento mostrano accesso e presentazione: non provano da sole che lo stesso trattamento funzioni in una lezione lunga o in un calendario denso. La prima consegna deve verificare proprio questa differenza.

## 2. Identità: uno spazio personale per imparare

Erga deve sembrare un luogo curato, accogliente e vivo, in cui lo studente torna volentieri. Carta e inchiostro offrono continuità; colore, composizione e movimento offrono personalità. Il risultato deve mantenere precisione anche quando è morbido.

La riconoscibilità nasce dalla combinazione di:

1. fondo caldo e fogli con bordi arrotondati;
2. titoli serif espressivi e testo sans leggibile;
3. campiture colorate e composizioni astratte legate alle materie;
4. piccoli dettagli di grana, stampa e sovrapposizione;
5. ombre controllate e movimento che conserva l'identità degli oggetti;
6. gerarchie didattiche chiare e strumenti utili, non decorazione continua.

Prendere da Granola il rapporto tra questi elementi. Non copiarne logo, spirale, illustrazioni, testi, asset, sfondi o impaginazioni distintive. Non mettere una finta fotografia di quaderno dietro a ogni lezione. La carta è un linguaggio di superfici, non un oggetto da imitare letteralmente.

Questa direzione non richiede una palette monocromatica: i colori delle materie contribuiscono al marchio. Evitare però un colore diverso per ogni pulsante o pannello.

## 3. Gerarchia dei materiali

Usare quattro materiali riconoscibili, ciascuno legato a una funzione. Un sistema unico non impone lo stesso trattamento alla copertina, al grafico e al campo di un modulo. Evitare card dentro card senza necessità.

| Livello | Ruolo | Trattamento |
|---|---|---|
| Fondo | Contesto dell'app, spazi tra le sezioni | Avorio caldo, prevalentemente piatto |
| Carta | Card utili, calendario, lettura, pannelli | Carta più chiara e opaca, bordo delicato, ombra solo se serve |
| Copertina colorata | Corso protagonista, accoglienza, momenti di marca | Colore materia, composizione astratta e grana; testo protetto |
| Velo satinato | Azioni e piccoli controlli sopra una copertina | Carta semitrasparente, blur locale leggero, bordo luminoso discreto |

I materiali condividono gli stessi ruoli tipografici, raggi, spaziature, stati semantici e movimento. Il velo satinato è una variante controllata, non un secondo design system glass. Non usarlo come fondo del corpo di una lezione o dell'intero pannello corso.

### Matrice di applicazione

| Superficie | Materiale | Azione principale | Profondità |
|---|---|---|---|
| Home: corso protagonista | Copertina colorata | Continua/Riprendi satinato | Sollevamento controllato |
| Studio: corso e selettore | Stessa copertina del corso | Continua o Scegli satinato | Stessa famiglia della Home |
| Intestazione modulo | Copertina adattata a fascia | Controlli compatti satinati dove sovrapposti | Più quieta della card protagonista |
| Moduli e nodi del percorso | Carta con dettagli materia | Azione leggibile integrata nel foglio | Bassa, selezione esplicita |
| Lezione e widget | Carta nitida | Inchiostro; controlli carta | Una superficie di lettura, niente pannello glass |
| Chat e composer | Carta opaca | Inchiostro | Composer stabile e separazione leggera |
| Esercizi e interrogazione | Carta opaca | Inchiostro | Stesso sheet e stesse scelte della famiglia strumenti |
| Calendario e agenda | Carta | Inchiostro | Foglio esterno, celle senza ombra individuale |
| Core: profilo e grafici | Carta nitida | Inchiostro | Gruppi e dati distinti con spazio |
| Dialoghi, form e impostazioni | Carta | Inchiostro | Overlay condiviso, campi senza effetti glass |
| Dock e navigazione | Carta prevalentemente opaca | Selezione inchiostro | Un piano flottante controllato |
| Landing e accesso | Composizione colorata + fogli carta | Inchiostro/carta | Più espressiva, con gli stessi materiali |

Il lettore può usare un'unica superficie continua senza incapsulare ciascun paragrafo. I gruppi nel Piano e in Core possono essere separati con spazio e intestazioni. Non trasformare tutto in una bacheca di riquadri bianchi.

### Grana

Una sola texture condivisa, locale e leggera. Non generare una texture casuale a ogni render e non fare richieste esterne per il rumore.

- Sulle composizioni di marca: visibilità iniziale circa 3–5%, da verificare sull'immagine effettiva.
- Sulla carta di accoglienza: circa 1–2% al massimo.
- Nei fogli la sensazione di carta può restare appena percepibile nelle parti decorative e nei margini. Testo lungo, formule, input, grafici e calendario restano nitidi: niente texture sovrapposta al contenuto o nuovo riquadro per ogni paragrafo.
- Texture decorativa non interattiva e assente dall'albero accessibile.

Non sovrapporre rumore al testo o alle icone. La grana deve suggerire un materiale, non ridurre nitidezza e contrasto. Non aggiungere filtri costosi a tutta la pagina.

## 4. Colore

### Neutri e azioni — tema giorno

| Token / ruolo | Valore iniziale | Uso |
|---|---|---|
| canvas | #F6F3EB | Tavolo, fondo principale |
| paper | #FFFEF9 | Superficie leggibile |
| paper-muted | #ECE9DF | Zone secondarie e pulsanti quieti |
| ink | #252623 | Testo principale e azione primaria |
| ink-muted | #65665E | Testo secondario |
| line | #DEDCD2 | Separatore decorativo |
| control-line | #888B7A | Contorno quando necessario per riconoscere un controllo |
| on-ink | #FFFEF9 | Testo e icone sull'azione primaria |
| focus | #252623 | Indicatore di focus con separazione dalla superficie |

Il pulsante primario ordinario è inchiostro con testo carta. Sulle copertine Continua/Riprendi/Scegli usa la variante satinata definita nel capitolo 7. Gli accenti non diventano automaticamente colori di testo o pulsanti pieni. Un bordo decorativo tenue non è sufficiente da solo per rendere distinguibile un campo interattivo.

### Famiglia di accenti

| Accento | Valore iniziale | Carattere |
|---|---|---|
| Cedro | #DCE879 | Luminoso e presente sulle composizioni |
| Rosa carta | #DFADC6 | Caldo ed espressivo sulle composizioni |
| Pervinca | #C5CEF0 | Calmo, articolato |
| Albicocca | #F1C6A5 | Caldo, energico |
| Azzurro polvere | #BDD9E1 | Aperto, preciso |

Sono una famiglia di composizione, non cinque nuove materie né una nuova mappa da imporre ai dati. Inventariare i colori materia già usati; conservare identificatori e riconoscibilità, adattando la loro resa di superficie dove necessario. Definire eventuali varianti chiara/profonda nel registro condiviso, non attraverso calcoli e opacità differenti in ogni componente.

### Registro materia e identità del corso

Un'unica risoluzione corso → materia → palette alimenta Home, Studio, selettore, modulo, lezione e Piano. Preservare i colori personali configurabili in Core. Lo stesso corso non può essere verde nella Home e blu in Studio per effetto di due mapping diversi.

Per ogni materia definire ruoli condivisi: colore riconoscibile, fondo di copertina, variante di supporto, testo e variante di contrasto. Eventuali trasformazioni di un colore personalizzato sono centralizzate, deterministiche e validate; non cambiano il dato salvato soltanto per abbellire una card.

Composizione e texture del corso devono essere stabili fra render e viste. La dimensione e il ritaglio si adattano, senza estrarre a caso nuove forme o tinte. Quando manca una materia usare una composizione neutra definita, senza attribuire una materia fittizia.

Il colore può essere vivo sulla copertina e nell'accoglienza. Non desaturare tutte le materie fino a renderle beige indistinguibili. Nella lettura e nei dati lo stesso colore diventa un dettaglio o una figura utile, evitando la tinta piena sotto ogni spiegazione.

Una composizione usa un colore dominante e al massimo un accento di supporto. Il colore non invade tutta la schermata di studio. Non assegnare lo stesso cedro a tutti i corsi e non riservare a una singola tinta la riconoscibilità di Erga.

### Tema notte

| Ruolo | Valore iniziale |
|---|---|
| canvas | #22211F |
| paper | #2D2C29 |
| paper-muted | #383632 |
| ink | #F4F1E7 |
| ink-muted | #C9C5BA |
| line | #4B4842 |
| control-line | #918B80 |
| primary-background | #F4F1E7 |
| primary-foreground | #252623 |

La notte mantiene materiali e gerarchia, con superfici calde e accenti attenuati dietro ai contenuti. Non applicare un filtro di inversione all'app o alle immagini e non sostituire tutti i colori materia con grigi. Non derivare ogni colore notturno da un'unica opacità arbitraria.

La base è carbone caldo, senza una dominante verde/oliva obbligatoria. Le copertine conservano colore e identità; le varianti scure e il satinato sono definiti insieme al registro materia. Non usare la modalità notte come giustificazione per introdurre un'altra famiglia grafica.

Il focus su superfici scure usa carta chiara e separazione scura; il focus su accenti molto chiari usa inchiostro. Verificare gli abbinamenti reali.

### Colori semantici

Errore, successo, avviso e informazione conservano significati propri e label o icone. Cedro non significa automaticamente successo; rosa non significa errore. Rimuovere l'ottanio dai token di marca e dalle selezioni della UI, senza vietare una tinta simile quando è un dato di materia o un colore necessario in una figura.

Testo ordinario: contrasto minimo 4,5:1; testo grande e segnali interattivi essenziali: almeno 3:1. I pastelli proposti sono fondi, con testo inchiostro. Non usare testo bianco su cedro, rosa o pervinca per imitare la vecchia card scura.

## 5. Tipografia

### Coppia iniziale

- Lora: saluto, titolo principale della pagina, corso, modulo e concetto della lezione; titolo di dialoghi e sheet che aprono una vera attività.
- Inter: sottosezioni operative, titoli delle scelte negli strumenti, navigazione, pulsanti, input, testo didattico, metadati, tabelle, grafici e numeri funzionali.
- Font matematici e code font esistenti: preservare KaTeX, MathML e leggibilità del codice.

Lora e Inter sono una proposta per Erga, non un'affermazione sui font effettivi di Granola. Verificare font e pesi già presenti nel progetto prima di aggiungere caricamenti. Per questa versione Ubuntu Sans non è più obbligatorio; migrare i ruoli interessati, senza lasciare vecchi override locali concorrenti.

Limitare i pesi caricati a quelli realmente usati. Serif iniziale 400/500: il carattere nasce dalla forma e dalla composizione, non da un bold pesante su tutti i corsi. Sans 400/500/600. Evitare corsivo decorativo diffuso, falso grassetto e nuove famiglie per ogni funzione. Fallback serif: Georgia, serif; fallback sans: system-ui, sans-serif. Impostare dimensioni e fallback per contenere lo spostamento del layout durante il caricamento.

### Scala iniziale

| Ruolo | Font | Telefono | Desktop | Interlinea |
|---|---|---|---|---|
| Saluto / titolo principale | Serif | 32–36 px | 40–48 px | 1,12–1,2 |
| Titolo corso protagonista | Serif | 26–30 px | 32–36 px | 1,15–1,25 |
| Titolo scena didattica | Serif | 26–32 px | 34–40 px | 1,2 |
| Titolo modulo / intestazione di attività | Serif | 24–28 px | 28–32 px | 1,25 |
| Sottosezione operativa / scelta strumento | Sans 500/600 | 18–22 px | 20–24 px | 1,3 |
| Lettura didattica | Sans | 18 px | 18–20 px | 1,6–1,7 |
| Interfaccia | Sans | 15–16 px | 15–16 px | 1,4–1,5 |
| Metadati | Sans | 13–14 px | 13–14 px | 1,45 |

Il serif non si estende automaticamente a ogni testo. La lezione resta precisa e leggibile; termini, formule, timer e controlli devono poter essere scansionati rapidamente.

Niente saluto gigantesco che spinge il percorso fuori dalla prima schermata di un telefono ordinario. Consentire una seconda riga naturale per nomi lunghi, senza ridurre tutto il carattere. Testi lunghi allineati a sinistra; centratura per una frase breve di accoglienza, non per spiegazioni e istruzioni operative. La larghezza di lettura indicativa è 58–72 caratteri, da verificare sui contenuti reali.

Le etichette piccole in maiuscolo sono rare e secondarie. Non trasformare ogni sezione in una didascalia d'archivio. Il testo italiano deve respirare quanto quello inglese delle reference.

## 6. Geometria, spaziatura e profondità

### Raggi condivisi

| Token | Valore iniziale | Applicazione |
|---|---|---|
| radius-sm | 8 px | Badge di data, dettagli piccoli |
| radius-control | 16 px | Input, select, menu e segmenti esterni |
| radius-card | 24 px | Card di strumenti, moduli e righe autonome |
| radius-hero | 32 px | Card corso e fogli protagonisti; alias radius-sheet per dialoghi/sheet |
| radius-nav | 24 px | Dock mobile; stesso valore della famiglia card |
| radius-pill | 999 px | Azioni principali, azioni satinate delle copertine e piccoli chip pertinenti |

L'arrotondamento è una gerarchia: non applicare 32 px a un piccolo campo né rendere ogni elemento una capsula. Le azioni principali e quelle satinate sulle copertine sono a pillola, come nelle immagini di riferimento; campi, liste e contenitori conservano forme più compatte. Azioni secondarie affiancate a una pillola condividono sagoma e altezza; toolbar dense usano radius-control. Le superfici annidate devono mantenere uno spessore di cornice visivamente regolare, adattando il raggio interno al padding reale.

Non azzerare o forzare i raggi attraverso un selettore universale. Radio, avatar, figure matematiche ed esagono cognitivo mantengono la geometria propria. Skeleton e stato caricato devono avere la stessa sagoma di base.

### Spaziatura

Unità di base 4 px. Scala: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Margini mobile iniziali 20 px, riducibili a 16 px a 320 px; card ordinarie 16–20 px di padding, protagoniste 20–24 px. Desktop 24–40 px di margini, con contenuto a larghezza controllata. Non ingrandire ogni card per riempire il monitor.

Target principali almeno 44 × 44 CSS px. Separare gruppi con spazio; usare bordi per struttura utile, non per incorniciare ogni riga. Non ridurre il testo per far stare un titolo in una misura prefissata.

### Ombre iniziali

- Foglio ordinario: 0 1px 2px rgba(37,38,35,0.04), 0 4px 12px rgba(37,38,35,0.03).
- Card protagonista: 0 2px 4px rgba(37,38,35,0.04), 0 10px 24px rgba(37,38,35,0.08).
- Overlay/dock: 0 6px 24px rgba(37,38,35,0.10).

Le ombre sono una base da verificare, non un effetto da moltiplicare su ogni elemento. Evitare un alone scuro largo, sfumature nere sotto tutta la card o ombre colorate sulle icone. Il sollevamento deve essere percepibile ma non rubare attenzione. Di notte distinguere superfici con luminosità e bordo oltre all'ombra; un alone nero da solo non basta.

Il bordo ordinario è 1 px e delicato. Focus e stato selezionato usano segnali più forti e non spostano il layout. Non accostare bordo spesso, ombra profonda, grana evidente e blur nella stessa card.

## 7. Composizioni astratte dei corsi

Le card corso sono il principale luogo di espressione delle materie. Usare una grammatica comune: campitura, poche forme dominanti, una traiettoria o un dettaglio di stampa facoltativo. Il rapporto tra elementi deve essere disegnato: non basta applicare un gradiente. Variare composizione e tinta secondo la materia; mantenere qualità e leggibilità costanti.

Possibili vocaboli, non nuove regole del motore didattico:

- Scientifiche: curve, intersezioni, piani, forme con un ritmo controllato.
- Storia e letteratura: strati, frammenti, tracciati, ritmi di pagina.
- Lingue: segni e percorsi di relazione, senza alfabeti inventati come decorazione dominante.
- Arte: campiture, collage astratto, trama e rapporti di colore.

Le forme non devono rappresentare falsamente il contenuto specifico della lezione. Nessuna foto sfocata obbligatoria, nessun identico gradiente radiale per tutti i corsi. Niente imitazioni degli asset Granola.

### Card protagonista

Titolo serif, indicazione breve della materia se disponibile, prossimo passo reale, avanzamento e un'azione chiara. Testo inchiostro su campo chiaro leggibile o su un foglio opaco integrato nella composizione. Se la materia ha una tinta profonda, riservare una zona carta al testo; non inventare un algoritmo locale di contrasto in ogni componente.

Continua/Riprendi è l'azione principale satinata della copertina, a pillola e leggibile. Scegli nel selettore usa lo stesso materiale. Cambia corso e controlli secondari mantengono la stessa famiglia con peso visivo inferiore; non sovrapporre due primarie equivalenti. La trama non attraversa i metadati piccoli o i controlli.

La card Home, quella Studio e il selettore corso devono riusare la stessa composizione e gli stessi ruoli tipografici. La dimensione cambia, l'identità dell'oggetto resta.

### Ricetta del velo satinato

Il satinato è una superficie di carta calda semitrasparente sopra una copertina colorata, non una scatola di vetro fredda. Deve conservare il senso di profondità apprezzato in Erga, restando nella direzione carta delle reference.

| Proprietà | Base iniziale da provare |
|---|---|
| Fondo | Carta calda al 75–85% di opacità; token comune, non opacity sull'intero controllo |
| Sfocatura dietro il controllo | Locale, 8–12 px |
| Testo e icone | Inchiostro, completamente opachi |
| Bordo | 1 px luminoso e discreto; separato dall'indicatore di focus |
| Sagoma | Pillola, altezza e target adeguati |
| Pressione | Compressione minima, circa 0,98, e superficie più opaca |
| Loading | Sagoma e label stabili, stato esplicito |
| Fallback | Carta piena, stessa sagoma e stessi ruoli |

Il contrasto va verificato sul composito effettivo, non soltanto sui due token isolati. Una copertina scura o un colore personalizzato può richiedere più opacità, fino alla carta piena. Definire questa scelta nella variante centrale, senza lasciare ogni componente a calcolare un altro effetto. Base iniziale di giorno: paper al 80% con ink; di notte: paper notturna al 85% con ink notturno. Il satinato di notte conserva un'area leggibile; eventuali varianti carta chiara con testo scuro sono ammesse soltanto nel registro condiviso, verificate insieme al fondo. Non invertire automaticamente il filtro.

Il blur non deve diventare animazione permanente e non si moltiplica su ogni forma della copertina. Senza supporto al blur o quando gli effetti sono ridotti, usare il fallback opaco. La superficie resta comprensibile anche senza texture, blur o movimento.

Le copertine possono avere luce e stratificazione; evitare il vecchio vetro molto trasparente su un fondo già indistinto, il testo bianco sui pastelli e i bagliori. Il satinato non è ammesso per composer, campi, dati, calendario o spiegazione lunga.

## 8. Movimento, blur e aptica

Conservare le transizioni apprezzate, migliorando orchestrazione e pulizia delle animazioni esistenti. Il movimento deve far percepire continuità: un foglio si apre, un corso mantiene la propria composizione, un dettaglio emerge nel contesto giusto.

| Trigger | Cosa si muove | Cosa conserva identità | Durata iniziale | Movimento ridotto |
|---|---|---|---|---|
| Pressione / stato controllo | Minima compressione e cambio superficie | Sagoma, label, posizione | 120–180 ms | Cambio di stato, senza compressione |
| Home / Piano / Studio / Core | Breve cambio di opacità del contenuto | Shell e navigazione | 150–220 ms | Cambio immediato o breve dissolvenza |
| Corso → percorso → modulo | Copertina condivisa; emerge il foglio di dettaglio | Corso, colore, composizione, contesto | 320–420 ms | Stesso stato finale, senza morph |
| Cambio corso | Entrano le alternative con poco scarto e ordine | Corso attuale fino alla scelta; dati e scroll | 280–380 ms | Alternative immediatamente leggibili |
| Sheet chat / esercizi / evento | Pannello dal basso su telefono, scrim comune | Stessa superficie e controlli di chiusura | 260–340 ms | Cambio immediato o dissolvenza |
| Espansione sezione | Solo il gruppo interessato | Posizione e contesto vicino | 180–260 ms | Espansione immediata |
| Diagramma didattico | Elementi pertinenti, costruiti per passaggi | Relazioni, unità, label e controllo utente | Secondo il processo spiegato | Figura statica equivalente / passi controllati |

Usare easing condivisi; base per l'apertura cubic-bezier(0.22,1,0.36,1). Una spring è ammessa solo con parametri condivisi e rimbalzo quasi assente. Niente oscillazioni giocattolo, tilt casuale delle card, fogli che volano o premi per ogni click.

Preferire trasformazioni e opacità. Evitare l'animazione permanente di grana, ombre larghe e blur. Nessun timer arbitrario per ritardare un'azione fino alla fine dell'effetto. Gestire click rapidi, doppia uscita, interruzioni, caricamento ed errori.

### Orchestrazione e uscita

Riutilizzare primitive e identità condivise esistenti quando pertinenti; non riscrivere l'intero sistema di animazione soltanto per adottare la nuova veste. Ogni transizione ha trigger, stato di destinazione e cleanup. Alla chiusura il dettaglio torna al contesto d'origine, senza una dissolvenza estranea; l'uscita può essere più breve dell'ingresso.

Una nuova azione interrompe o ridirige la transizione senza perdere corso, lezione o focus. Chiudere mentre il contenuto carica non lascia pannelli fantasma; doppio click non apre due sessioni. Il tempo di caricamento non viene mascherato con una durata artificiale: mostrare uno stato coerente finché il contenuto è pronto.

Lo stagger del selettore, se usato, è breve e non ritarda l'accesso all'ultima card. Non applicare zoom a ogni cambio di sezione o fare arrivare i controlli molto dopo il titolo. L'animazione di un diagramma ha tempi didattici propri e non eredita meccanicamente i 360 ms di un morph dell'interfaccia.

Blur locale sui controlli satinati delle copertine; blur transitorio contenuto quando separa piani nel passaggio. Non sfocare permanentemente il testo delle alternative che l'utente deve scegliere: attenuare il contesto può bastare. Lettura, calendario, input e grafici restano nitidi. Il dock è principalmente carta opaca; il vetro non è il materiale dominante della nuova direzione.

Con movimento ridotto: eliminare morph, spostamenti ampi, zoom, parallasse e animazioni didattiche automatiche; mantenere stato finale e controlli, con cambio immediato o dissolvenza breve. Un diagramma animato offre alternativa statica e controllo di riproduzione quando necessario.

Riutilizzare useHaptics e le utility del progetto. Aptica breve e discreta per azioni intenzionali significative, ove supportata; nessuna vibrazione a ogni lettera, scroll o generazione di token. Nessuna nuova API aptica e nessuna promessa di supporto uniforme nei browser.

## 9. Componenti e stati condivisi

- Pulsante primario ordinario: inchiostro/carta, testo sans, sagoma a pillola. Eccezione esplicita: Continua/Riprendi/Scegli satinato sulle copertine, secondo il capitolo 7.
- Secondario: carta o superficie quieta, bordo quando utile. Terziario: testo e icona con target adeguato.
- Input/select: radius-control, testo sans, label persistente; focus chiaro e messaggi associati al campo.
- Chip: piccolo indicatore sintetico, non contenitore per intere frasi; colore materia se pertinente.
- Tabs: segmento o selezione su carta, indicatore inchiostro e semantica accessibile; non un nuovo stile a ogni pagina.
- Menu: carta e testo sans, radius-control. Dialoghi e sheet: foglio radius-hero, titolo serif e contenuto/controlli sans; preservare focus trap, Escape e ritorno del focus.
- Toast: breve e sobrio; errore esplicito, non solo un cambio di tinta.
- Skeleton: proporzioni del contenuto finale, movimento contenuto; evitare un flash di card molto più arrotondate o alte rispetto a quelle caricate.

Prevedere riposo, hover, premuto, focus, selezionato, disabilitato, caricamento, errore, vuoto e successo dove pertinenti. Non usare sola opacità per rendere un controllo disabilitato se il testo diventa illeggibile. Caricamento non deve cambiare la larghezza di un pulsante o cancellarne il significato.

Icone coerenti per peso, stile e dimensione. Cerchi ammessi ma non obbligatori dietro alle icone. Sulle card degli strumenti evitare bollini colorati con ombre vistose: la superficie e la gerarchia devono fare il lavoro.

## 10. Navigazione e shell

Destinazioni: Home, Piano, Studio, Core, nello stesso ordine e tutte etichettate. Core non è una pallina separata o un accesso nascosto nelle impostazioni.

- Sotto 768 px: un dock flottante arrotondato, carta opaca, ombra controllata, margini laterali 16–20 px e safe area inferiore. Altezza iniziale circa 64 px.
- 768–1023 px: rail etichettata, con lo stesso ordine.
- Da 1024 px: sidebar calma, senza duplicare la navigazione mobile.

Soglie iniziali da verificare sul contenuto. Se servono correzioni, aggiornare la shell e il documento insieme. Selezione con testo e icona inchiostro, fondo carta/tinta quieta e segnale di stato; nessuna barretta ottanio ereditata.

Riservare spazio reale per dock e safe area in ogni vista con scroll; il bottone finale deve poter comparire interamente sopra la navigazione. Con tastiera aperta evitare copertura dei campi e accessi duplicati. Non far sparire il dock durante lo scroll ordinario. Nasconderlo nelle sessioni immersive già definite, con uscita sempre comprensibile.

Header: piano/account, eventuale serie e impostazioni discreti; evitare un rettangolo per ogni piccola azione. Non trasformare la parte superiore in una toolbar da software amministrativo.

## 11. Home — prima schermata di riferimento

Scopo: far riprendere lo studio e mostrare il prossimo impegno senza affollare l'accoglienza.

1. Saluto serif compatto, personale, con spaziatura intenzionale.
2. Corso attivo protagonista, con composizione astratta, prossimo passo reale e Riprendi/Continua.
3. Prossimo impegno o giornata: contenuto utile, più quieto del corso.
4. Strumenti rapidi, nello stesso linguaggio di Studio.

Se non ci sono impegni, mostrare un invito breve e utile. Evitare un grande pannello bianco vuoto che compete con il corso. Non inventare attività suggerite o progressi per riempire il layout.

La composizione della card deve essere visibile, non ridotta a un fondo colorato dietro a una lunga pila di testo. Riprendi/Continua usa il satinato a pillola della stessa famiglia Studio. Nessun enorme alone sotto la card. Controllare saluto lungo, titolo corso lungo, materia chiara/scura e avanzamento zero/completo.

Ricetta Home: fondo avorio, saluto serif 400/500, copertina radius-hero con padding intenzionale, azione satinata, prossimo impegno su carta quieta e strumenti su fogli radius-card. Lo stato vuoto degli impegni può essere una breve riga con azione, senza un altro grande contenitore. Header più quieto del saluto; niente box bianco per ogni piccola azione.

## 12. Studio e percorso

Studio distingue percorsi e strumenti, senza obbligare ad aprire uno strumento per continuare una lezione. Chat, esercizi, interrogazione e palestra restano nel Banco di Studio; palestra per la famiglia scientifica quando prevista dal prodotto. Non reintrodurre Pratica come quinta destinazione.

Il selettore corso usa card della stessa famiglia della Home. Corso → percorso → modulo → lezione mantiene composizione, colore e contesto. Non conservare a caso le vecchie pillole dentro card nuove: tutti i ruoli devono migrare insieme.

Ricetta Studio: stessa copertina della Home, Continua satinato, Cambia corso subordinato, strumenti su carta con icone coerenti senza bollini ombreggiati. I moduli sono fogli radius-card, titolo serif e metadati sans; stato completato con segno e testo discreti, stato attivo riconoscibile senza un riempimento ottanio obbligatorio. Un'intestazione di modulo usa una versione compatta della copertina, non un nuovo gradiente.

### Percorso e prerequisiti — direzione funzionale conservata

Vista Percorso: spina verticale sottile di 1 px dove resta percepibile, moduli come nodi principali, lezioni come rami brevi e fogli arrotondati. Nodi attivi con inchiostro e colore materia, label chiara e segnale geometrico semplice; niente mirino laser o animazione continua.

La linea guida è secondaria rispetto ai titoli. Nodi e check sono discreti, non grandi pulsanti da gioco; le lezioni hanno spazio per titoli italiani lunghi. Migrare la geometria del percorso preservando le azioni e lo stato reale, senza dedurre una nuova logica di completamento dall'aspetto.

Toggle Percorso / Elenco comprensibile, senza dipendere dal simbolo ☍. Su telefono nessun pan/zoom obbligatorio. Elenco offre contenuti, stati e azioni equivalenti; cambio vista conserva contesto e lezione selezionata.

Le dipendenze devono essere dati espliciti e validati: niente relazioni inferite solo dai titoli, cicli, autoreferenze o riferimenti mancanti. Inizialmente prerequisiti consigliati e superabili, non blocchi obbligatori. Mostrare perché una lezione è consigliata e collegare il contenuto necessario. Completamento non equivale automaticamente a padronanza.

Nei corsi legacy senza dati di prerequisito mostrare ordine e stato reali, senza inventare un grafo. Sviluppo e persistenza delle dipendenze sono un incarico funzionale separato; il restyling non deve fingere che esistano.

## 13. Lezioni — seconda schermata di riferimento

La lezione non è una versione con meno colori del libro. Alterna concetto, spiegazione, esempio, diagramma, interazione ed esercizio con una gerarchia comune. Non mettere tutti i blocchi dentro identiche card decorative.

- Titolo serif per il concetto, spiegazione sans per leggere a lungo.
- Carta nitida e larghezza di lettura controllata; accento materia in una fascia o figura pertinente.
- Un diagramma animato o una piccola interazione quando serve a capire una relazione, non una decorazione casuale.
- Tutor disponibile senza perdere scena e posizione; progressione, uscita e ripresa restano chiare.
- Formule, figure, tabelle e codice hanno spazio e regole proprie; una formula larga scorre localmente, non fa traboccare la pagina.

Ricetta della scena: intestazione serif, testo sans a sinistra quando è una spiegazione, diagramma o interazione integrato su carta nitida, avanzamento leggibile e azione inchiostro a pillola. Una frase breve di apertura può essere centrata; un paragrafo lungo non diventa una grande slide centrata per abitudine. Il colore materia può comparire nella figura o in un dettaglio, senza coprire il testo con un'intera campitura. La differenza tra spiegazione, esempio ed esercizio è data da struttura e label utili, non da tre stili di card incompatibili.

Prima adattare il lettore e i widget effettivamente presenti: la precedente revisione aveva rilevato parabola, retta, proiettile, piano inclinato, pH, gas, mercato e codice. Verificare il catalogo attuale invece di assumere che sia invariato. Preservare calcoli, unità, range, isolamento del codice, sanitizzazione, KaTeX e MathML.

Le famiglie didattiche possono avere strutture differenti: scientifiche, letteratura, storia/geografia, filosofia, lingue, latino, arte. La grammatica comune non impone lo stesso schema di insegnamento.

Nuovi blocchi tipizzati, checkpoint e scene v2 richiedono contratti reali e incarichi separati. Non inventare campi, salvataggi o risposte per rendere una demo più bella. Non marcare una lezione completata per il solo effetto di aprirla durante una prova.

## 14. Strumenti di Studio

Chat: superficie continua, testo sans, composer arrotondato stabile, messaggi leggibili; non una pila di bolle colorate troppo strette per formule o tabelle.

Esercizi: domanda protagonista, opzioni o risposta con stati chiari, feedback e spiegazione distinti. Corretto/errato con testo e icona, oltre al colore. Nessuna confettata per ogni risposta.

Interrogazione: domanda e turno corrente evidenti, controlli voce/testo e stato del microfono chiari. Non fingere un ascolto, una trascrizione o una valutazione che il sistema non fornisce.

Palestra: calcoli, suggerimenti progressivi, unità e tutor restano precisi. Non cambiare il motore per uniformare la grafica. Tavole e grafici mantengono label leggibili e colori dati indipendenti dalla decorazione.

Gli ingressi degli strumenti condividono uno sheet carta radius-hero, titolo serif, descrizione sans e scelte radius-card con contorno delicato. La scelta selezionata ha un segnale e un testo chiari; niente enorme riquadro ottanio, contorno nero rigido o maiuscolo diffuso. Composer e aree di risposta sono opachi con radius-control. Suggestion della chat sintetiche e quiete, senza una nuova famiglia tipografica. Le icone non ricevono una diversa ombra colorata in ogni strumento.

## 15. Piano

Calendario coerente col tema: carta chiara di giorno, superficie scura calda di notte. Header mese, navigazione, oggi, selezione e densità sono progettati insieme. Raggi più contenuti nelle celle rispetto al foglio esterno; non una griglia di palline tutte uguali.

Ricetta Piano: un foglio radius-hero, mese leggibile con ruolo di titolo, numeri e dati sans; giorni senza ombra individuale, oggi con contorno, selezione con stato pieno controllato, eventi con colore materia e label. Non riempire di nero il calendario nel tema giorno. Agenda e routine di Core riusano la stessa grammatica per orari e blocchi, senza creare un secondo calendario visivo.

Colore materia sugli impegni, con label e tipo riconoscibili. Verifica, scadenza compito e sessione di studio hanno significati diversi. Non usare un enorme sfondo nero di giorno o contorni che rendono il calendario visivamente più pesante del contenuto.

Flusso manuale: titolo, data, materia e corso quando disponibile, senza ripetizioni inutili. Apertura e chiusura del pannello fluide; errori e salvataggio comprensibili.

Il form evento usa lo sheet comune, campi opachi radius-control, label sans persistenti, selettore di tipo coerente con gli altri segmenti e Salva inchiostro a pillola. Non combinare campi squadrati, select a capsula e una nuova CTA rettangolare. La grafica non elimina o inventa campi necessari.

Evoluzione AI conservata: testo con più impegni → proposta modificabile con date esplicite → conferma unica → esito e annullamento. La proposta non salva eventi. Date relative nel contesto e fuso dell'utente; chiarire ambiguità senza inventare materia, corso o scadenza. Conferma idempotente, retry senza duplicati, gestione degli errori parziali. La funzione richiede contratto e integrazione reali, non è inclusa automaticamente nel restyling.

## 16. Core

Core è la parte personale: profilo, esagono cognitivo, preferenze, routine e progressi quando disponibili. Deve poter essere visitato spesso senza sembrare un pannello amministrativo.

Sintesi leggibile del periodo e pochi approfondimenti pertinenti. Esagono dentro un foglio semplice, non un oggetto luminoso su una console scura. Grafici su superfici pulite, con label, unità, periodo, riepilogo testuale e alternative accessibili. Non arrotondare o deformare i dati per motivi estetici.

Ricetta Core: titolo serif, tab sans coerenti con il Piano e gli strumenti, fogli radius-card, dati nitidi. L'esagono conserva forma e significato; il suo colore è un token dati definito, non il vecchio ottanio della selezione ereditato per caso. Materie e interessi usano chip e campi condivisi; i colori personali alimentano le copertine invece di restare una decorazione isolata del profilo.

Distinguere attività, valutazioni Erga, voti scolastici ed esagono. Non chiamare ore studiate la permanenza su una pagina, non inventare una storia del profilo senza snapshot, non presentare una correlazione tempo/voti come causalità. Stato vuoto utile se i dati non ci sono, senza curve fittizie.

Nuove metriche, inserimento voti e persistenza richiedono specifiche dedicate. Verificare i dati reali prima di progettare un grafico che non si può alimentare.

## 17. Landing, accesso e superfici secondarie

Landing e onboarding possono usare composizioni più ampie, colore più presente e grana più visibile rispetto alla lettura. Titoli serif, pulsanti inchiostro, fogli morbidi; illustrazioni astratte originali. Nessuna promessa di funzionalità non disponibile.

Accesso, impostazioni, ricerca, caricamento materiali, errori, pagina vuota e dialoghi devono usare gli stessi token. Preservare flussi account, fatturazione e dati. Non aggiungere un provider di accesso perché compare nelle reference.

Impostazioni: titolo serif e lista carta con separazioni calme, titoli operativi sans e icone coerenti. Non incorniciare ogni riga con una card bianca ombreggiata e un box icona grigio. Accesso: composizione originale più espressiva e azioni grandi a pillola opache, in linea con le reference; il satinato non è obbligatorio fuori dalle copertine corso.

La sera e il giorno sono due versioni della stessa identità. La landing può avere più espressività; l'app può avere più concentrazione senza sembrare un prodotto diverso.

## 18. Piano di migrazione e punto di validazione

L'errore da non ripetere: cambiare raggi e palette globali, poi chiamare la migrazione un'identità. La prima prova deve mostrare composizione, gerarchia e materiali insieme.

### V2-00 — allineare le fonti

Integrare questa specifica in DESIGN.md. Verificare schema dei token, frontmatter e .impeccable/design.json prima di aggiornarli. Allineare le sole prescrizioni visuali contraddittorie in AGENTS.md e documenti collegati, preservando didattica e vincoli operativi. Registrare i precedenti pacchetti D0–D3 come lavoro della versione 1, senza cancellare commit o riscrivere la storia.

I prompt della versione 1 non sono più una sequenza da eseguire per il nuovo design. Non riavviarli e non mescolare due agenti che cambiano gli stessi token.

### V2-01 — Home e lezione pilota

Implementare una Home completa e una lezione rappresentativa esistente, con il minimo sistema condiviso necessario. Verificare anche un caso matematico o interattivo per non approvare solo una bella copertina. Usare dati reali nella UI; fixture sintetiche soltanto in prove isolate e dichiarate.

Se componenti condivisi cambiano tutte le schermate, verificare l'impatto e inventariare quelle ancora da migrare. Non spacciarle per finite. Una preview isolata può accompagnare il prodotto, ma non sostituisce l'implementazione del flusso reale.

Consegna: viste reali telefono/desktop, giorno/notte, stati utili, build e controlli pertinenti, limiti espliciti. Se l'agente non dispone di browser, dichiarare verifica visiva pendente e fornire una preview implementata apribile; non usare un HTML dimostrativo scollegato come prova del prodotto.

Il proprietario valuta il pilota prima del rollout. Questa è una scelta del processo di design: non dedurre l'approvazione dal completamento di una build o dal silenzio del proprietario. Correggere Home e lezione, poi consolidare i token.

### Rollout successivo, dopo la valutazione

1. Sistema condiviso definitivo, shell e navigazione.
2. Studio, card, selettore e transizioni corso/modulo/lezione.
3. Lettore completo, widget, chat, esercizi, interrogazione e palestra.
4. Piano, Core esistente, impostazioni e superfici secondarie.
5. Landing e accesso; revisione complessiva.
6. Evoluzioni funzionali separate: prerequisiti, scene v2, impegni AI, progressi Core.

Non eseguire il rollout come una coda automatica di vecchi prompt. Ogni incarico successivo parte dallo stato effettivo del repository e dai token validati.

## 19. Verifica e criteri di accettazione

### Visiva

- Home riconoscibile come carta contemporanea senza dipendere dal logo.
- Serif e sans hanno ruoli chiari; nessun residuo di Ubuntu imposto o vecchia identità per errore.
- Raggi, composizione, bordo e ombra lavorano insieme; niente semplice sostituzione del border-radius.
- Almeno due famiglie materia leggibili senza recolorare tutte le azioni.
- Lo stesso corso conserva colore e composizione tra Home, Studio, selettore e modulo, comprese personalizzazioni e fallback senza materia.
- Continua/Riprendi/Scegli sulle copertine usa la stessa variante satinata; contrasto verificato sul composito, fallback opaco verificato e nessun vetro su lettura/campi/grafici.
- Grana discreta dove pertinente, lettura e grafici puliti.
- Nessun enorme alone grigio sotto le card; nessuna card dentro card senza gerarchia.
- Dock flottante completo e contenuto finale raggiungibile sopra la safe area.

### Comportamento e accessibilità

- Verificare 320, 390, 768 e 1280 CSS px, giorno/notte e zoom 200%; niente overflow globale o controlli coperti.
- Tastiera, focus visibile, ritorno focus, label, stati di errore e movimento ridotto.
- Riprendi, cambio corso, uscita, doppia uscita e strumenti conservano contesto e stato.
- Apertura interrotta, chiusura durante loading e cambio vista ripetuto non lasciano pannelli fantasma, duplicati o focus perso.
- Contrasto misurato sugli abbinamenti effettivi, comprese composizioni, focus e stati disabilitati.
- Formule/tabelle larghe con scroll locale; titoli lunghi senza troncamenti che nascondono il significato.
- Diagrammi utilizzabili senza animazione obbligatoria e senza dipendere soltanto dal colore.
- Nessuna nuova chiamata backend o mutazione dati introdotta solo per il restyling.

### Verifica tecnica e consegna

Eseguire build, controlli previsti dal repository e test significativi per le azioni modificate. Distinguere fallimenti nuovi e preesistenti. Aggiornare i test che impongono il vecchio stile affinché verifichino il nuovo contratto; non cancellare suite o aggiungere un'allowlist per ogni file. Non usare test verdi come prova di qualità visiva.

Consegnare file cambiati, token adottati, verifiche effettuate con esito, superfici non migrate, limiti e stato di pubblicazione. Screenshot del prodotto con dati sensibili esclusi o mascherati. Un mockup non è uno screenshot dell'app e deve essere dichiarato tale.

Per backend Lovable Cloud: niente migrazioni o deploy diretti in contrasto con il flusso del progetto. Preparare il prompt Lovable preciso soltanto se la funzione richiede un cambiamento reale. Un commit su GitHub non significa frontend pubblicato; verificare il flusso Update/Publish effettivo e il risultato online.

## 20. Origine e limiti della specifica

Riferimenti forniti dal proprietario il 5 ottobre 2026:

- refero.design ce3ac042-5610-42bb-9253-bef3aa83a9f7.jpg — accoglienza verde cedro, serif, texture e azioni a pillola.
- refero.design ba851411-10d7-4f12-b9ff-d33258ff92b2.jpg — carta avorio, rosa/cedro, superfici arrotondate sovrapposte e titoli serif.

Le reference definiscono l'atmosfera desiderata. Font, token e layout qui proposti sono progettati per Erga e devono essere validati nel suo contenuto. Il codice e i dati attuali vanno ispezionati dall'agente prima di intervenire: questa revisione non afferma di aver verificato nuovamente GitHub o lo stato del prompt 03.

La revisione visiva successiva ha confrontato il documento con le reference e visitato nel browser Erga attuale: Home, Studio, corso/modulo/lezione, selettore, ingressi degli strumenti, Piano, form evento, Core e Impostazioni, nel tema chiaro e nella vista stretta disponibile. Sono stati rilevati materiali concorrenti e mapping cromatici diversi dello stesso corso. I pulsanti osservati erano semitrasparenti senza blur diretto: il velo satinato qui definito è una scelta di redesign, non una descrizione tecnica di tutti i controlli attuali.

Il proprietario ha approvato la gerarchia carta/copertine/satinato e la proposta di unificazione. Le durate, font e misure sono basi implementative, non valori misurati dalle immagini; il tema notte, tutti i widget e le prestazioni non sono stati validati integralmente durante quella visita. La versione finale del documento non equivale a un'implementazione completata.

La versione 1.1 resta solo come archivio storico; non è una fonte concorrente per la grafica.
