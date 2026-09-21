---
name: Erga
description: La stanza di studio digitale — un ambiente neutro e ordinato che si adatta a come pensa lo studente.
colors:
  # ── Tema chiaro (giorno) ─────────────────────────────────────────────
  ink: "hsl(340 6.67% 8.82%)"                # #181516 — inchiostro caldo, il nero di Erga
  paper: "hsl(20 10.34% 94.31%)"             # #F2F0EF — off-white unificato del fondo
  card-light: "hsl(0 0% 100%)"               # #FFFFFF — superficie delle card di giorno
  muted-foreground-light: "hsl(0 0% 38%)"    # secondo testo di giorno (≥4.5:1)
  border-light: "hsl(340 6.67% 8.82% / 0.12)"
  # ── Tema notte ───────────────────────────────────────────────────────
  night: "hsl(240 9% 4.3%)"                  # #0A0A0C — antracite profondo
  card-night: "hsl(240 9% 8.6%)"             # #141418 — card secondaria di notte
  muted-foreground-night: "hsl(0 0% 72%)"
  border-night: "hsl(20 10.34% 94.31% / 0.07)"
  night-text: "hsl(20 10.34% 94.31%)"        # di notte il testo è panna, non bianco
  # ── Superficie focale (P36 "dark luxury") ────────────────────────────
  hero-cream: "hsl(42 31% 94%)"              # #F4F1EA — avorio della card percorso
  hero-ink: "hsl(240 5% 8%)"                 # #121214 — inchiostro sull'avorio
  # ── Superfici secondarie (impostazioni, liste) ───────────────────────
  surface-container-high: "hsl(0 0% 92%)"
  surface-container-highest: "hsl(0 0% 89%)"
  # ── Marketing (solo vetrina, non entra nell'app) ─────────────────────
  marketing-red: "#E30613"
  marketing-rose: "#C4878B"
  marketing-gold: "#C4A574"
  # ── Materie: colori vividi, SOLO Piano/Core ──────────────────────────
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
  # ── Routine: blocchi fissi del calendario (sonno, scuola, pasti, altro) ──
  routine-sleep: "#4F46E5"
  routine-school: "#64748B"
  routine-meal: "#EF4444"
  routine-other: "#0D9488"
  # ── Routine nel Core: versione smorzata (fondo tinto + puntino) ──
  routine-mono-text: "hsl(222 0% 22%)"
  routine-mono-dot: "hsl(214 0% 64%)"
  routine-mono-border: "hsl(38 0% 86% / 0.9)"
  # ── Utility ──
  pure-black: "#000"
typography:
  # Scala reale del sistema: i gradini che il codice dichiara e usa.
  display:
    fontFamily: "Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  headline-medium:
    fontFamily: "Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title-large:
    fontFamily: "Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  title-small:
    fontFamily: "Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.01em"
  body:
    fontFamily: "Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.01em"
  body-small:
    fontFamily: "Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  # ── Piccolo stampato (superfici dense: calendario, chat, badge) ──
  # Mai per il testo di lettura: quello resta a 16px minimo sul telefono.
  dense-13:
    fontFamily: "Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "0.8125rem"
    lineHeight: 1.4
  label-large:
    fontFamily: "Raleway, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.1em"
  label:
    fontFamily: "Raleway, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.12em"
    fontFeature: "uppercase"
  label-small:
    fontFamily: "Raleway, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.625rem"
    fontWeight: 600
    letterSpacing: "0.14em"
  # ── Macro-metriche (numeri grandi dei riepiloghi, cifre tabulari) ──
  metric:
    fontFamily: "Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "1.8rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  metric-lg:
    fontFamily: "Montserrat, 'Plus Jakarta Sans', system-ui, sans-serif"
    fontSize: "2.1rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
  # ── Voci speciali ──
  focal:
    fontFamily: "Radja, 'Zalando Sans Expanded', Montserrat, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.1
  focal-large:
    fontFamily: "Radja, 'Zalando Sans Expanded', Montserrat, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 1.05
  welcome:
    fontFamily: "'Ubuntu Sans', Montserrat, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 500
    lineHeight: 1.2
  welcome-md:
    fontFamily: "'Ubuntu Sans', Montserrat, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 500
    lineHeight: 1.1
  welcome-lg:
    fontFamily: "'Ubuntu Sans', Montserrat, system-ui, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 500
    lineHeight: 1.05
rounded:
  xs: "0.5rem"
  sm: "0.625rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  card: "1.5rem"
  button: "1rem"
  dialog: "1.5rem"
  pill: "9999px"
  sheet: "1.75rem"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    padding: "20px 20px"
    height: "44px"
  button-pill:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "24px 24px"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.card-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "20px 20px"
    height: "44px"
  card:
    backgroundColor: "{colors.card-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px 24px"
  card-hero:
    backgroundColor: "{colors.hero-cream}"
    textColor: "{colors.hero-ink}"
    rounded: "{rounded.card}"
    padding: "20px 20px"
  input:
    backgroundColor: "{colors.card-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "16px 16px"
    height: "44px"
  nav-pill:
    backgroundColor: "{colors.card-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "72px"
  subject-chip:
    backgroundColor: "{colors.subject-amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 6px"
---

# Design System: Erga

## Overview

**Creative North Star: "La stanza di studio"**

Erga è una stanza di studio ben ordinata: carta calda, inchiostro scuro, silenzio
attorno al contenuto. Non è una vetrina e non è un cruscotto: è il posto dove lo
studente apre i suoi materiali e capisce da dove ricominciare. Per questo la
struttura viene prima dell'espressione — poche decorazioni, superfici opache,
nessun effetto che competa con il testo.

La stanza ha due luci: **il giorno** è off-white caldo (#F2F0EF) con card bianche e
inchiostro quasi nero (#181516); **la notte** è antracite profondo (#0A0A0C) con
card carbone (#141418) e testo panna, mai bianco puro. In entrambe le luci l'app
resta **monocroma**: il colore non decora, informa. Dove il colore compare, ha un
significato preciso — il vivido delle materie nel Piano e nel Core, il verde e il
rosso degli esercizi, il rosso e il rosa della vetrina marketing.

Il carattere confermato è **energico e grintoso**: l'ordine è il punto di partenza,
non il traguardo. L'energia si esprime con il contrasto (inchiostro pieno su carta),
con i colori delle materie dove aiutano a riconoscere, e con comandi che rispondono
sulla pressione in meno di 150 ms — mai con decorazioni, rimbalzi o movimento
continuo.

**Key Characteristics:**

- Monocroma di giorno e di notte, con un solo accento dinamico per materia.
- Superfici opache e stratificate; il vetro è riservato al guscio (navigazione).
- Angoli generosi: card a 24 px, comandi a 16 px, badge e pillole a capsula.
- Tipografia editoriale: titoli stretti e decisi, etichette in maiuscolo spaziato.
- Movimento breve e naturale: una sola curva di casa, nessun rimbalzo.
- Testo minimo 16 px sul telefono, controlli almeno 44 × 44 px.

**La Regola del Palco.** Il fondo pagina non compete mai con il contenuto: la Home
è dichiarata `no-ambient` e le superfici che scorrono non hanno sfocatura. Il
"palco" resta intonso; l'unica materia translucida ammessa è quella del guscio
(pillola di navigazione, schermata di avvio).

**La Regola del Mono.** L'app parla una sola voce neutra. Il colore entra solo
quando porta informazione: la materia nel Piano/Core, l'esito di un esercizio, il
rosso di marca in vetrina. Se un colore non dice nulla, diventa grigio.

## Colors

Il sistema è costruito su **due luci e una tinta**. Le due luci sono il tema
chiaro (carta) e il tema notte (antracite); la tinta è l'inchiostro caldo di Erga,
un quasi-nero con una punta di rosso (#181516), che di notte diventa panna.

**Ruoli, non sfumature.** I token sono raggruppati per ruolo (superfici, contenitori,
bordi, testo, semantica) e non per tinta: cambiando il tema, un componente non
cambia una sola riga di codice, cambia solo il valore del token.

- **Superfici.** `background` (carta di giorno, antracite di notte) + la famiglia
  `surface-container-*` per gli strati intermedi. La gerarchia nasce dagli strati,
  non dalle ombre.
- **Contenitori.** `card` è la superficie di lavoro (bianca di giorno, #141418 di
  notte); `card-hero` (avorio #F4F1EA) è riservata a **un solo** elemento per
  schermata: quello su cui lo studente deve agire adesso.
- **Filetti.** I bordi sono sempre sottili: `border` sta al 12% di inchiostro di
  giorno e al 7% di panna di notte. Mai sopra 1 px.
- **Accento dinamico.** `--subject-accent` è l'unico colore che cambia con il
  contesto: segue la materia di studio corrente. Il valore di partenza è neutro
  (inchiostro di giorno, panna di notte): se nessuno lo sovrascrive, l'app resta
  monocroma.
- **Materie (solo Piano/Core).** Dieci tinte piene, una per materia, usate come
  fondo tinto al ~18% con contorno da 1 px e, per il riconoscimento a colpo
  d'occhio, un puntino pieno. Fuori dal Piano e dal Core queste tinte non esistono.
- **Esiti.** Verde/rosso delle risposte sono fissi e semantici, non tematici:
  devono restare leggibili in tutte e due le luci.

**La vetrina è un mondo a sé.** La landing marketing (`src/components/landing/`) ha
i suoi gettoni locali (`--lp-*` in `landing.css`): carta più chiara, inchiostri
grigi, il rosso e il rosa di marca, l'oro. Sono **fuori dall'app** e non entrano
nelle schermate di studio: nessun componente dell'app deve leggerli.

**La Regola del Colore che Informa.** Prima di aggiungere un colore, chiedersi cosa
comunica. Se la risposta è "rende più bello", non si aggiunge.

**La Regola dell'Avorio Unico.** La superficie avorio è una risorsa scarsa: una per
schermata, sull'azione focale. Due avori nella stessa vista annullano la gerarchia.

## Typography

Erga parla con **Montserrat** per testo e titoli, **Raleway** per le etichette in
maiuscolo e tre voci speciali: **Radja** (self-hosted, peso unico 400) per il titolo
focale delle schermate di accesso, **Ubuntu Sans** (Google Fonts, peso 500) solo
per il saluto e il nome nell'h1 della Home. Il sottotitolo della Home resta in
**Zalando Sans Expanded**: la sostituzione non riguarda il contenitore né altri testi.

La scala è quella dichiarata nel codice: 36 / 24 / 20 / 18 / 16 / 15 / 14 / 13 / 12 /
11 / 10 px. Sotto i 13 px comincia il **piccolo stampato**, ammesso solo dove
l'informazione è densa e secondaria (griglia del calendario, orari, badge, timestamp
della chat).

- **Titoli** (display 2.25 rem / headline 1.5 rem / title 1.25 rem): peso 700–600,
  interlinea stretta (1.05–1.25), spaziatura negativa (−0.01…−0.02 em). Il titolo
  si riconosce dalla misura e dal peso, non dal colore.
- **Testo** (body 1 rem, interlinea 1.6): spaziatura −0.01 em, larghezza di lettura
  65–75 caratteri. Su telefono il corpo non scende mai sotto 16 px.
- **Etichette** (Raleway, maiuscolo, 10–12 px, spaziatura 0.10–0.14 em): solo per
  micro-titoli di sezione e stati, mai per frasi.
- **Macro-metriche** (1.8 rem / 2.1 rem, peso 800, cifre tabulari, spaziatura
  −0.04 em): i numeri dei riepiloghi (minuti di Focus, sessioni). Un solo numero
  grande per blocco.
- **Voce focale** (Radja): riservata al titolo della schermata di accesso (36 px,
  48 px su schermi larghi). Peso unico 400: la gerarchia la fa la misura, mai un
  grassetto sintetico.

**La Regola della Voce Unica per Livello.** Un solo carattere per livello
gerarchico: se il titolo di una schermata usa Radja, i titoli di sezione restano
Montserrat. Mescolare le voci nella stessa schermata spegne quella focale.

**La Regola del Piccolo Stampato.** Sotto i 13 px vive solo il metadato in una
superficie densa (orario nella griglia, contatore, timestamp). Il testo che si legge
— lezioni, chat, spiegazioni, etichette dei comandi — non scende mai sotto i 16 px
sul telefono.

**La Regola della Scala Rispettata.** La dimensione del testo segue la preferenza
di accessibilità dello studente (`--text-scale`: normale 1, grande 1.125, molto
grande 1.28). I layout usano unità relative, così un testo più grande non rompe
nulla.

## Layout

La struttura è "prima il telefono": una colonna, contenuti che scorrono in
verticale, navigazione in basso (pillola sospesa + cerchio del Core staccato).
Da 768 px in su l'app diventa un **guscio sigillato**: a sinistra una **sidebar-card
sospesa** — arrotondata come una card, staccata dal bordo della finestra, con il
brand in cima, le voci con icona ed etichetta, la voce attiva riempita d'inchiostro
e il Core in fondo — mentre il contenuto scorre nella card accanto. Sono le **stesse
voci, nello stesso ordine, nella stessa materia**: nessun menu diverso da imparare.

- **Ritmo**: griglia da 4 px (4 / 8 / 12 / 16 / 24 / 32). I gruppi stanno stretti,
  le sezioni stanno larghe; sopra un titolo c'è più spazio che sotto.
- **Punti di rottura**: 640 / 768 / 1024 / 1280 px, contenitore massimo 1400 px.
- **Scorrimento**: nativo, mai bloccato o rallentato. Nessuno scorrimento
  orizzontale involontario: la pagina ha una "cintura" anti-straripo.
- **Densità**: una schermata, un compito. Lo stato vuoto è progettato come gli
  altri stati (invito chiaro, nessun contenuto finto).

**La Regola del Telefono Primo.** Ogni schermata si progetta a 375 px e si
verifica a 375 / 768 / 1024 / 1440 px prima di considerarla finita.

**La Regola della Navigazione Unica.** Il guscio è uno solo: stesse voci, stesso
ordine, stessa materia su telefono e computer (pillola in basso, sidebar-card su
desktop). Se una schermata ha bisogno di un menu tutto suo, il problema è la
schermata, non il menu.

## Elevation & Depth

La profondità è **materica e discreta**: superfici opache che si posano una
sull'altra, con ombre corte che suggeriscono il contatto. Non ci sono aloni colorati
e nessuna ombra netta da fumetto.

- **Livelli 1–5** (`shadow-level-1…5`): ombra di contatto (vicina, netta) + ombra
  d'ambiente (larga, soffusa). Di notte ogni livello aggiunge un filo di luce
  interna, perché sul nero il rilievo ha bisogno di un bordo luminoso.
- **Ombre speciali**: `tactile` per le superfici della Home, `card-active` per la
  card in primo piano, `hero` per la card del percorso (l'unica ombra profonda
  dell'app, perché è l'unica che deve "staccarsi" davvero).
- **Niente vetro decorativo**: la sfocatura dietro il pannello costa fluidità sul
  telefono. È ammessa solo sulla pillola di navigazione e sulla schermata di avvio.

**La Regola dell'Elevazione Dichiarata Una Volta.** Una superficie sceglie: o un
filetto, o un'ombra. Filetto **e** ombra larga insieme producono la "card fantasma"
che sembra un errore di caricamento.

## Shapes

Il linguaggio delle forme è **morbido e deciso**: angoli generosi e costanti, mai
spigoli vivi, mai cerchi improvvisati.

- Card e fogli: **24 px** (`--radius-card`, `--radius-dialog`, `--radius-media`).
- Comandi (pulsanti, campi): **16 px** (`--radius-button`).
- Elementi piccoli (badge, chip, blocchi del calendario): 8–12 px.
- Pillole e indicatori: capsula piena (9999 px) — usata per i comandi piccoli, mai
  per le card.

**La Regola del Filo.** Gli accenti colorati sono filetti da 1 px o puntini pieni,
mai barre spesse su un lato della card: la barra laterale è il segno più
riconoscibile di un'interfaccia fatta in serie. Un blocco colorato si riconosce dal
fondo tinto e dal puntino, non da una striscia.

## Components

I componenti sono descritti dai token del frontmatter; qui c'è **quando** usarli.

- **Pulsante primario** — inchiostro pieno, testo carta, altezza 44 px, angolo
  16 px. Una sola azione primaria per schermata. Alla pressione scende del 2%
  (`active:scale-[0.98]`) e risponde subito.
- **Pulsante pillola** — stessa voce del primario ma a capsula piena (48 px), per
  l'azione di ripresa (es. "Riprendi lezione").
- **Pulsante contorno** — card chiara con filetto: per le azioni secondarie.
- **Pulsante fantasma** — nessun fondo, solo testo: per azioni terziarie e
  strumenti dentro le liste.
- **Card** — superficie di lavoro (bianca di giorno, carbone di notte), angolo
  24 px, ombra di livello 1–2.
- **Card focale (avorio)** — una per schermata, sull'azione del momento. In notte è
  l'unico elemento chiaro della pagina.
- **Campo di testo** — 44 px di altezza, angolo 16 px, filetto, focus con anello
  visibile da 2 px. Etichetta sempre presente, mai solo il segnaposto.
- **Pillola di navigazione (telefono)** — capsula sospesa (72 px di altezza) con
  voce attiva in inchiostro pieno e sotto-pillola fluida; il Core è un cerchio
  staccato accanto.
- **Sidebar-card (da 768 px)** — card sospesa larga 256 px con angoli da card
  (24 px): brand in cima, voci con icona ed etichetta, voce attiva in inchiostro
  pieno, Core in fondo. Se le voci non entrano, scorre **solo** il menu.
- **Chip materia** — fondo tinto al 18% della tinta, contorno 1 px, puntino pieno;
  solo Piano e Core.
- **Interruttore (PremiumToggle)** — capsula 32 × 56 px, manopola che risponde al
  tocco in 110 ms e si assesta in 300 ms; un solo impulso all'accensione.

**La Regola della Pressione Scontata.** Ogni comando mostra di essere stato premuto
entro 150 ms (colore o scala), senza attese, timer o animazioni di ingresso.

**La Regola dei 44 px.** Nessun controllo toccabile scende sotto 44 × 44 px — né
visivamente, né come area sensibile.

## Do's and Don'ts

**Sì**

- Usa i token del tema (`bg-card`, `text-muted-foreground`, `border-border`): si
  adattano da soli a giorno, notte, alto contrasto e scala del testo.
- Fai entrare i contenuti con movimenti brevi (240–300 ms) e una sola curva
  naturale, che rallenta e si ferma.
- Rispetta `prefers-reduced-motion`, `prefers-contrast` e `prefers-reduced-transparency`.
- Lascia un anello di focus visibile su tutto ciò che si può raggiungere da tastiera.
- Usa icone Lucide o SVG coerenti (16–24 px, stesso spessore), mai emoji.
- Dichiara i dati dimostrativi come tali: Erga non inventa risultati né testimonianze.
- Progetta gli stati vuoti, di caricamento e di errore con la stessa cura degli altri.

**No**

- Niente barre colorate spesse su un lato delle card o dei blocchi.
- Niente rimbalzi, molle elastiche o curve che superano il bersaglio.
- Niente ombre nere pesanti, bagliori o sfocatura sulle superfici che scorrono.
- Niente gradienti decorativi tra le card della Home, né testo con gradiente.
- Niente animazioni che spostano larghezza, altezza o margini: solo trasformazione e
  opacità.
- Niente colore senza significato, né due superfici focali nella stessa schermata.
- Niente testo sotto i 16 px sul telefono, e niente controlli sotto i 44 px.
- Niente emoji come icone, né dati, prezzi o risultati inventati.
