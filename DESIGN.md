---
name: Erga
description: Uno strumento di studio contemporaneo, personale e curato — geometria squadrata, carta e inchiostro, atmosfera astratta per materia, accento ottanio.
colors:
  # ── Marca: base proposta della prima implementazione (§4) ────────────
  brand: "#087F83"            # ottanio: pulsanti pieni, indicatore attivo, accento
  brand-deep: "#07585C"       # testo di marca sulla carta, dettagli a contrasto
  brand-tint: "#E8F2F0"       # contesti secondari, selezioni leggere
  # ── Giorno ───────────────────────────────────────────────────────────
  paper: "#F2F0EF"            # fondo caldo del prodotto
  surface: "#FFFFFF"          # pannelli e card opache (superficie elevata)
  ink: "#181516"              # testo principale
  ink-muted: "#625D59"        # metadati leggibili
  border: "#D6D5D0"           # separazioni decorative; non unico segnale interattivo
  # ── Notte (proposta, §4) ─────────────────────────────────────────────
  night-bg: "#101717"
  night-surface: "#141D1D"
  night-elevated: "#1B2828"
  night-text: "#F2F0EF"
  night-muted: "#B8C6C3"
  night-accent: "#8ECFD0"
  night-border: "#3D5351"
  # ── Materie: orientamento e atmosfera del corso, NON marca (§4) ──────
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
  # ── Routine: blocchi fissi del calendario ────────────────────────────
  routine-sleep: "#4F46E5"
  routine-school: "#64748B"
  routine-meal: "#EF4444"
  routine-other: "#0D9488"
  routine-mono-text: "hsl(222 0% 22%)"
  routine-mono-dot: "hsl(214 0% 64%)"
  routine-mono-border: "hsl(38 0% 86% / 0.9)"
  # ── Marketing (solo vetrina, non entra nell'app — §16) ───────────────
  marketing-red: "#E30613"
  marketing-rose: "#C4878B"
  marketing-gold: "#C4A574"
typography:
  # Direzione iniziale (§5): Ubuntu Sans per titoli e interfaccia.
  # Il saluto della Home resta Ubuntu Sans (decisione consolidata).
  # Il font del testo didattico è da valutare su contenuti reali.
  display:
    fontFamily: "'Ubuntu Sans', system-ui, sans-serif"
    fontSize: "2.5rem"        # 32–44 px adattivi
    fontWeight: 500
    lineHeight: 1.1
  section:
    fontFamily: "'Ubuntu Sans', system-ui, sans-serif"
    fontSize: "1.75rem"       # 24–32 px
    fontWeight: 600
    lineHeight: 1.2
  card-title:
    fontFamily: "'Ubuntu Sans', system-ui, sans-serif"
    fontSize: "1.375rem"      # 20–24 px
    fontWeight: 600
    lineHeight: 1.3
  didactic:
    fontFamily: "'Ubuntu Sans', system-ui, sans-serif"   # da validare
    fontSize: "1.125rem"     # 18 px; 17 px su contesti stretti
    fontWeight: 400
    lineHeight: 1.6
  interface:
    fontFamily: "'Ubuntu Sans', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "'Ubuntu Sans', system-ui, sans-serif"
    fontSize: "0.875rem"     # 13–14 px
    fontWeight: 500
    lineHeight: 1.4
  metric:
    fontFamily: "'Ubuntu Sans', system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em" # cifre stabili e confrontabili
  welcome:
    fontFamily: "'Ubuntu Sans', system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 500
    lineHeight: 1.05
rounded:
  # (§3) raggio zero per il prodotto; i cerchi restano nel contenuto.
  card: "0px"
  panel: "0px"
  button: "0px"
  input: "0px"
  dialog: "0px"
  menu: "0px"
  dock: "0px"
  callout: "0px"
  badge: "0px"
  content-circle: "9999px"   # solo contenuto: avatar, radio nativi, esagono, grafici
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "#FFFFFF"
    rounded: "{rounded.button}"
    height: "44px"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.border}"
    borderWidth: "1px"
    rounded: "{rounded.button}"
    height: "44px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.brand-deep}"
    rounded: "{rounded.button}"
    height: "44px"
  button-danger:
    note: "trattamento semantico dedicato (§8)"
    rounded: "{rounded.button}"
    height: "44px"
  button-translucent:
    note: "variante limitata alla card atmosferica del corso, non quarto stile generico (§8)"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.border}"
    borderWidth: "1px"
    rounded: "{rounded.card}"
    padding: "16px 24px"
  card-course:
    note: "composizione astratta per materia, zona stabile per titolo/avanzamento/azione (§6)"
    rounded: "{rounded.card}"
    padding: "24px 32px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.border}"
    rounded: "{rounded.input}"
    height: "44px"
  nav-dock:
    note: "dock inferiore flottante unico sotto 768 px; rail 768–1199; sidebar da 1200 (§9, proposta)"
    rounded: "{rounded.dock}"
    height: "64px"
---

# ERGA — DESIGN SYSTEM
Versione 1.1 · 3 ottobre 2026 · Specifica per il redesign

> **Integrazione nel repository (pacchetto D0 del redesign, 3 ottobre 2026).**
> Questo documento sostituisce il DESIGN.md precedente ("La stanza di studio", monocromo).
> I token nel frontmatter e in `.impeccable/design.json` dichiarano il **sistema di destinazione**:
> sono la base della prima implementazione, non lo stato attuale del codice — la migrazione
> dell'interfaccia non è iniziata. Stati dei pacchetti e punti aperti vivono in
> `docs/registro-redesign-2026-10-03.md`.


## 1. Scopo e autorità

Questo documento definisce un linguaggio unico per Erga. È destinato a sostituire il DESIGN.md attuale dopo l'inserimento nel repository e a guidare gli agenti incaricati dell'implementazione. Non descrive tutte le funzionalità come già disponibili.

Rispettare PRODUCT.md e AGENTS.md del repository. Il redesign non autorizza modifiche a logiche didattiche, dati, autenticazione, pagamenti o backend. Le evoluzioni funzionali indicate qui vanno implementate con incarichi separati e con le integrazioni richieste dal progetto.

Aggiornamento dopo la revisione GitHub al commit f54e2371e4322705370ae98e99e79bf6a31bfdc9: il proprietario ha confermato esplicitamente che la direzione di questa conversazione prevale sulla veste “Bisturi Editoriale” descritta nella Matrice delle Materie e nella Minilezione 2.0. Non adottare automaticamente rosso lacca, Playfair/Inter/Roboto Mono, ossidiana obbligatoria o immagini in bianco e nero. Preservare le specifiche didattiche utili di quei documenti, distinguendole dalle loro scelte estetiche. Il primo incarico di implementazione deve allineare DESIGN.md, le specifiche collegate e i controlli di stile: non lasciare più fonti grafiche contraddittorie.

Le regole di identità sono vincolanti per il redesign. Le misure iniziali sono una base coerente da verificare nel prodotto: eventuali correzioni devono aggiornare i token condivisi, non introdurre un'altra variante locale.

### Decisioni consolidate
- Energia nel marchio, concentrazione nell'uso; concentrazione non significa assenza di coinvolgimento.
- Geometria squadrata come caratteristica dell'intero prodotto.
- Matericità attraverso superfici, ombre e risposta alle interazioni.
- Composizioni astratte per le card dei corsi.
- Fluidità nelle transizioni tra card, moduli, lezioni e selezione del corso.
- Ubuntu Sans del saluto da conservare.
- Navigazione principale flottante e unificata; Core è una destinazione centrale e frequente.
- Lezioni coinvolgenti con diagrammi animati e piccole interazioni.
- Percorso visuale con prerequisiti e alternativa Elenco.

### Proposte operative ancora da validare
- Palette ottanio e relativi valori: base proposta, non identità cromatica definitivamente approvata.
- Ubuntu Sans anche per il testo didattico, dopo confronto su contenuti reali.
- Breakpoint e misure indicati sotto.
- Prerequisiti consigliati con possibilità di proseguire. Non introdurre blocchi obbligatori senza una decisione di prodotto.
- Intensità delle ombre e durata delle transizioni, da verificare con Arena nel prodotto.

### Stato del prodotto verificato su GitHub
- Pratica non è più una destinazione autonoma: chat, esercizi, interrogazione e palestra sono strumenti di Studio, raggiungibili anche dalla Home.
- Palestra scientifica già presente nel codice per matematica, fisica e chimica: risposte numeriche, suggerimenti progressivi, soluzione passo-passo e tutor socratico.
- Biblioteca già presente di otto widget: parabola, retta, proiettile, piano inclinato, pH, gas, mercato ed esecuzione di codice. Adattare questi componenti prima di aggiungerne altri.
- Generazione delle lezioni differenziata per scientifiche, letteratura, storia/geografia, filosofia, lingue, latino e storia dell'arte. Una grammatica visiva comune non implica una struttura didattica identica.
- Esistono fondamenta dati v1/v2 e specifiche del nuovo lettore; la compatibilità dei percorsi esistenti va mantenuta. Grafi per materia, blocchi tipizzati e checkpoint in linea richiedono di verificare i contratti effettivamente implementati prima di costruire nuove viste.
- Feedback aptico già presente attraverso useHaptics e le utility condivise: non ricreare un secondo sistema.

La presenza nel repository non dimostra che tutte le funzioni siano pubblicate e funzionanti online. Per il dettaglio della revisione, vedere il documento di aggiornamento GitHub.

## 2. Identità

Erga deve sembrare uno strumento di studio contemporaneo, personale e curato. Il riferimento Mistral riguarda il rapporto tra geometria netta e movimento fluido; non copiarne logo, font proprietario, palette arancione o composizioni riconoscibili.

L'identità nasce dalla combinazione di:
1. sagome rettangolari e proporzioni precise;
2. carta, inchiostro e profondità controllata;
3. atmosfera astratta legata alle materie;
4. tipografia riconoscibile e gerarchia coerente;
5. transizioni che conservano l'identità dell'oggetto;
6. contenuti didattici che si costruiscono attraverso il movimento e l'interazione.

Non trasformare Erga in un'interfaccia militare, una console tecnica o un gioco pieno di premi e bagliori. Il coinvolgimento deve servire lo studio. Non rendere ogni schermata una pagina di testo neutra.

## 3. Geometria e spaziatura

### Angoli
Token iniziale di raggio: 0 px per card, pannelli, pulsanti, input, dialoghi, dock, selettori, menu, calendario e callout. Vietate pillole e capsule come stile generico. Non sostituire la squadratura con smussi o angoli tagliati arbitrari.

Cerchi e forme diverse restano ammessi quando appartengono al contenuto o a una convenzione necessaria: avatar, radio nativi, figure didattiche, grafici, esagono cognitivo. Le icone non devono diventare tutte rettangolari. Non compromettere la comprensibilità per applicare il raggio zero.

### Griglia
Unità di base: 4 px. Scala condivisa: 4, 8, 12, 16, 24, 32, 48, 64.
- Margini iniziali: 16 px su telefono; 24–32 px su finestre ampie.
- Padding card ordinarie: 16–24 px; card protagonista: 24–32 px.
- Separare gruppi attraverso spazio e gerarchia, evitando una card annidata per ogni elemento.
- Target interattivi principali almeno 44 × 44 CSS px; la sagoma visibile può essere più piccola purché l'area cliccabile non crei sovrapposizioni.
- Bordo ordinario 1 px; selezione può usare 2 px senza spostare il layout.
- I contorni sottili devono restare percepibili su entrambi i temi.

## 4. Colore

### Palette iniziale
| Ruolo | Giorno | Uso |
|---|---|---|
| Marca / azione principale | #087F83 | Pulsanti pieni, indicatore attivo, accento |
| Marca profonda | #07585C | Testo di marca sulla carta, dettagli a contrasto |
| Fondo leggermente tinto | #E8F2F0 | Contesti secondari, selezioni leggere |
| Carta | #F2F0EF | Fondo caldo del prodotto |
| Superficie elevata | #FFFFFF | Pannelli e card opache |
| Inchiostro | #181516 | Testo principale |
| Testo secondario | #625D59 | Metadati leggibili |
| Bordo | #D6D5D0 | Separazioni decorative; non unico segnale interattivo |

Tema notte proposto:
| Ruolo | Valore |
|---|---|
| Fondo | #101717 |
| Superficie | #141D1D |
| Superficie elevata | #1B2828 |
| Testo | #F2F0EF |
| Testo secondario | #B8C6C3 |
| Accento chiaro | #8ECFD0 |
| Pulsante principale | #087F83 con testo bianco |
| Bordo | #3D5351 |

Questi valori vanno tradotti in token semantici condivisi. Non usare colori hardcoded per ricreare una modalità giorno o notte dentro una singola schermata.

### Contrasto e ruoli
Controlli iniziali su colori solidi: bianco su #087F83 circa 4,80:1; #07585C su #E8F2F0 circa 7,19:1; inchiostro su carta circa 15,97:1. #087F83 su carta è circa 4,23:1: non usarlo per testo ordinario piccolo. Usare il tono profondo. Trasparenze, hover, disabled, focus e temi richiedono verifica separata.

I colori delle materie non devono essere sostituiti dall'ottanio. Distinguere:
- marca: identità e azioni;
- materia: orientamento e atmosfera del corso;
- stato: corretto, errato, attenzione, selezionato, indisponibile.

Il colore materia vive in una zona delimitata: card corso, piccolo indicatore, nodo o intestazione. Non colora tutti i pulsanti della pagina. Non imporre che ogni colore materia sia accostato a un grande blocco ottanio.

Gli stati devono avere testo, simbolo o struttura oltre al colore. Il rosso è disponibile per errore o distruzione, non come secondo accento permanente. Nessun mirino laser rosso o bagliore come regola del percorso.

## 5. Tipografia

Conservare Ubuntu Sans del saluto. Non ricreare una falsa calligrafia: il carattere distintivo osservato deriva dalla sua forma e dal trattamento tipografico.

Direzione iniziale: Ubuntu Sans per titoli e interfaccia. Valutare lo stesso font sui testi didattici. Se serve un secondo font di lettura, sceglierne uno e assegnargli un ruolo unico documentato; evitare che ogni schermata erediti un font diverso.

| Ruolo | Dimensione iniziale | Peso / interlinea |
|---|---|---|
| Saluto / titolo protagonista | 32–44 px adattivi | 500, 1,05–1,15 |
| Titolo sezione | 24–32 px | 500–600, 1,2 |
| Titolo card / lezione | 20–24 px | 600, 1,25–1,35 |
| Testo didattico | 18 px | 400, 1,6 |
| Testo interfaccia | 16 px | 400–500, 1,4–1,5 |
| Label / metadato | 13–14 px | 500, 1,4 |

Su contesti stretti provare 17 px per lettura; non rimpicciolire automaticamente perché il contenuto è lungo. Non usare 12–13 px per spiegazioni. Mai testo didattico tutto maiuscolo o tracking stretto sistematico.

Paragrafi lunghi allineati a sinistra. Centratura ammessa per un breve concetto protagonista o un messaggio introduttivo. Titoli e gerarchia devono avere anche una struttura semantica, non soltanto classi visive.

I font matematici di KaTeX conservano il proprio ruolo. Numeri di grafici e statistiche devono essere stabili e confrontabili.

## 6. Superfici, ombre e blur

### Tre livelli
1. Fondo: carta o equivalente notte, senza movimento decorativo continuo.
2. Elementi ordinari: superficie opaca, bordo discreto, ombra minima quando utile.
3. Protagonisti e overlay: profondità più evidente, sempre con una funzione.

Ombre iniziali giorno:
- ordinaria: 0 2px 6px rgba(24,21,22,0.06);
- protagonista: 0 10px 28px rgba(24,21,22,0.12), 0 2px 6px rgba(24,21,22,0.05);
- overlay: 0 18px 48px rgba(24,21,22,0.18).

In notte ridurre la dipendenza dall'ombra nera e distinguere i livelli con superficie e bordo. Evitare aloni grigi estesi e ombre elevate su ogni elemento.

### Card corso
Conservare i caratteri apprezzati: squadratura, sensazione sollevata, sfondo astratto e pulsante Continua semiopaco.
- Composizioni di luce e colore con una grammatica comune; la materia modifica la famiglia cromatica.
- Nessuna foto sfocata riconoscibile usata come sostituto dell'astrazione.
- Riservare zone stabili per titolo, avanzamento e azione.
- Il pulsante traslucido deve avere un fondo sufficiente a mantenere contrasto anche sulle zone più chiare.
- La card deve conservare identità quando diventa intestazione del percorso.

### Blur
Ammesso nell'atmosfera della card, negli sfondi secondari e nella separazione temporanea di un overlay. Non applicare blur al contenuto interattivo attivo, né renderlo necessario per leggere una lezione.

Le scene didattiche possono avere colore e materia; il piano immediatamente dietro al testo resta controllato e leggibile. Non usare backdrop blur su tutte le card per ottenere artificialmente coerenza.

## 7. Movimento e risposta

Il movimento comunica continuità, relazione e risultato.
- Feedback locale: 100–160 ms.
- Apertura di menu o pannelli: 180–260 ms.
- Transizione tra passaggi: 180–300 ms.
- Trasformazione card → percorso / modulo → lezione: circa 300–500 ms o una molla equivalente, senza rimbalzo vistoso.

Sono intervalli iniziali, non tempi obbligatori per ogni elemento. Conservare le trasformazioni fluide già apprezzate; migliorare orchestrazione e stabilità. Preferire posizione, opacità e trasformazione. Evitare spostamenti causati da caricamenti o cambi di dimensione non previsti.

Non cambiare contemporaneamente scala, blur, rotazione e colore su ogni clic. Non far respirare continuamente card e diagrammi mentre si legge. Non introdurre attese decorative prima di rendere disponibile un comando.

Movimento ridotto: sostituire traslazioni e morph estesi con aggiornamenti immediati o dissolvenze brevi. La comprensione non deve dipendere dall'animazione.

### Feedback aptico
Comportamento già presente nel codice, da consolidare tramite useHaptics e le utility condivise. Resta opzionale e subordinato al supporto della piattaforma. Usarlo in modo selettivo per conferme, errori significativi o interazioni specifiche; non ad ogni tap. Verificare disattivazione e fallback silenzioso. Non promettere una vibrazione uniforme su tutti i browser e dispositivi. Il feedback visivo resta completo.

## 8. Componenti condivisi

Un solo sistema di pulsanti, campi, selettori, menu, dialoghi, toast, stati vuoti e skeleton.

### Pulsanti
- Primario: ottanio pieno e testo bianco.
- Secondario: superficie o fondo tinto, bordo quando necessario.
- Discreto: testo e icona, per azioni subordinate.
- Pericoloso: trattamento semantico dedicato.
- Traslucido: variante limitata alla card atmosferica, non quarto stile generico.

Un'azione dominante per contesto. Label concrete: Continua, Salva evento, Aggiungi impegni. Non usare abbreviazioni decorative o simboli come unico nome.

### Input e pannelli
Campi squadrati con label persistente, stato focus visibile e errore vicino al campo. Non usare il placeholder come unica istruzione. Selettori segmentati rettangolari.
Pannelli mobile e dialoghi desktop appartengono alla stessa famiglia visiva; non ereditare capsule e grandi raggi da componenti preesistenti.
Chiusura, ritorno, focus, scorrimento e tastiera devono funzionare senza perdere dati. Non resettare una bozza per un cambio di tema, vista o animazione.

### Stati
Definire per ogni componente normale, hover dove applicabile, focus, premuto, selezionato, caricamento, errore, vuoto e indisponibile. Loading e indisponibile non devono sembrare la stessa cosa. Non usare opacità bassa per informazioni necessarie.

## 9. Navigazione principale

Quattro destinazioni con etichette persistenti: Home, Piano, Studio, Core. Conservare inizialmente quest'ordine; non cambiarlo soltanto per la composizione.

- Home: orientamento della giornata e ripresa.
- Piano: quando studiare e quali impegni affrontare.
- Studio: materiali, percorsi, lezioni, esercizi e interrogazione.
- Core: profilo di apprendimento, risultati e andamento personale.

### Presentazione adattiva proposta
- Sotto 768 px: dock inferiore flottante, rettangolare, unico.
- Da 768 a 1199 px: rail laterale compatta con etichette.
- Da 1200 px: sidebar con etichette e spazio appropriato.

Le soglie devono essere verificate con il contenuto. Dock mobile opaco o quasi opaco, bordo e ombra controllati; Core non è un cerchio staccato. Selezione attraverso colore, indicatore geometrico e stato accessibile.

Riservare lo spazio del dock, inclusa safe area. Gestire tastiera e pannelli senza coprire campi o azioni. Non far sparire la navigazione durante il normale scorrimento.
Nelle sessioni immersive di lezione o interrogazione può essere sostituita dai comandi della sessione, con uscita chiara e ritorno al contesto precedente.
Preservare stato, posizione e comportamento Indietro. La navigazione principale contiene destinazioni, non un pulsante di generazione mescolato alle sezioni.

## 10. Home

Il saluto resta un elemento distintivo. Gerarchia:
1. riprendere il percorso;
2. prossimo impegno rilevante;
3. strumenti rapidi e informazioni secondarie.

Non mostrare contemporaneamente tutti i dati di Core. La card protagonista conserva atmosfera e matericità. Azioni rapide coerenti con il sistema condiviso, non una raccolta di stili diversi.

Stati vuoti utili e brevi. Non inventare attività, serie, risultati o percentuali per rendere la dashboard più ricca.

## 11. Studio: percorso e prerequisiti

Direzione concordata: sostituire la sola presentazione a moduli statici con una mappa di percorso. I moduli restano unità organizzative; cambia la rappresentazione e si introducono dipendenze reali, con lavoro funzionale dedicato.

### Vista Percorso
- Alberatura verticale lungo una spina sottile, inizialmente 1 px.
- Moduli come nodi principali squadrati, con titolo e avanzamento.
- Lezioni come rami orizzontali brevi, con titolo e stato.
- Lezione attiva identificata da quattro piccoli segmenti o parentesi geometriche, accento di marca e azione Continua.
- Il richiamo si anima brevemente alla selezione e poi resta fermo.
- Nessun effetto laser continuo.

Una lezione può avere più prerequisiti e connessioni tra moduli: la spina è una guida, non una falsa rappresentazione di tutte le dipendenze. Nella vista iniziale mostrare l'organizzazione e il percorso consigliato. Alla selezione evidenziare i prerequisiti diretti e attenuare il resto; non disegnare tutti i collegamenti con la stessa enfasi.

Su telefono: spina vicino al margine, rami corti e titoli ampi. Non richiedere pan e zoom per raggiungere normalmente una lezione. Espandere i moduli senza perdere orientamento. Nei percorsi lunghi mantenere accesso rapido alla lezione corrente.

### Alternativa Elenco
Toggle testuale rettangolare: Percorso / Elenco. Non usare Topologia come etichetta principale né affidarsi al simbolo ☍.
La vista Elenco conserva prerequisiti, stati, azioni e selezione. Il cambio vista non perde posizione o progresso. La mappa non deve essere l'unico accesso ai contenuti.

### Significato delle dipendenze
Separare:
- stato della lezione: non iniziata, in corso, completata;
- prerequisiti: disponibili, da affrontare, non valutati;
- padronanza: solo se esiste una misura definita e supportata.

Completamento non equivale automaticamente a comprensione. Non mostrare una competenza come acquisita soltanto perché la lezione è stata aperta.
Proposta iniziale: prerequisiti consigliati, accompagnati da una ragione comprensibile e accesso al contenuto precedente. Nessun blocco rigido implicito.
Le dipendenze prodotte dall'AI devono avere validazione e possibilità di correzione. Non introdurre cicli o collegamenti inventati per arricchire la mappa. I criteri di generazione e padronanza richiedono una specifica funzionale separata.

## 12. Lezioni: scene didattiche

Conservare inizialmente il modello per passaggi. Progettare una sequenza di scene coinvolgenti, non una versione desaturata del libro e non un carosello di paragrafi identici.

### Tipi di scena
- Concetto chiave: frase protagonista, colore locale, figura o composizione pertinente.
- Spiegazione: card squadrata e materica, diagramma o contenuto visuale integrato.
- Esempio: scena riconoscibile che rende concreto il concetto.
- Interazione breve: un'azione che aiuta a distinguere, collegare, ordinare o prevedere.
- Esercizio: risposta e feedback esplicativo.
- Sintesi: relazione tra i concetti, senza dichiarare risultati non verificati.

Usare varietà funzionale. Non obbligare ogni concetto ad avere un'interazione e non inserire clic per rivelare ogni frase. Il testo può restare necessario e sostanzioso.

### Diagrammi animati e microinterazioni
Esempi di comportamento:
- strutture di una cellula evidenziate progressivamente, con label persistenti;
- catena causa-effetto costruita per passaggi;
- confronto prima/dopo controllato dallo studente;
- previsione breve seguita da spiegazione;
- collegamento tra due concetti con feedback sul perché.

Il contenuto deve restare comprensibile dopo l'animazione. Prevedere controllo o ripetizione quando l'ordine è didatticamente rilevante e un equivalente statico con movimento ridotto. Label leggibili, elementi selezionabili da tastiera e alternativa all'eventuale trascinamento.

Non generare animazioni arbitrarie per ciascuna lezione. Partire dalla biblioteca di otto widget già implementata e dal suo contratto JSON validato; uniformarne superficie, label, colori, controlli e movimento. Aggiungere diagrammi e interazioni mancanti come componenti riutilizzabili. Non sostituire il catalogo con codice arbitrario generato dall'AI. Le estensioni della pipeline e la validazione dei nuovi contenuti sono un lavoro funzionale separato dal cambio degli stili.

### Struttura della sessione
Intestazione discreta: corso/lezione, avanzamento, ritorno e uscita. Corpo con dimensione adattata al tipo di scena; non tutto bloccato nello stesso piccolo contenitore desktop. Comandi principali in posizione prevedibile e mai sopra il testo.

Le spiegazioni estese restano allineate a sinistra; concetti brevi possono essere centrati. Non limitare arbitrariamente le righe per far entrare tutto senza scroll. Mantenere risposte e posizione quando si torna indietro.

Tutor contestuale accessibile senza cancellare la scena: pannello affiancato quando lo spazio lo consente, pannello dedicato su mobile con rientro alla stessa posizione. Non riempire la scena di comandi secondari.

### Formule, tabelle e figure
Preservare KaTeX e l'output accessibile MathML insieme all'HTML. Formule lunghe e tabelle in contenitori locali scorrevoli se necessario; non ridurre tutta la lezione a un carattere minuscolo.
Figure ingrandibili quando utile, con descrizioni. Se manca un elemento essenziale, comunicarlo e offrire un recupero anziché lasciare una spiegazione incompleta.

## 13. Esercizi e interrogazione

Ridisegnare le schermate di ingresso osservate: gerarchia, scelte, icone, card e comandi devono appartenere a Erga. Non concludere da questo audit che tutta la logica interna sia da riscrivere.

Gli strumenti appartengono al Banco di Studio. La palestra scientifica è già implementata e va inclusa nel redesign, conservando guardia per la famiglia di materia, input numerico con virgola decimale, suggerimenti, soluzione, punteggio e tutor. Non reintrodurre una sezione Pratica autonoma.

Esercizi: domanda, risposta, conferma e spiegazione del risultato. Stati distinguibili anche senza colore. Non far avanzare automaticamente prima che il feedback possa essere letto. Conservare la specificità delle diverse tipologie di domanda.

Interrogazione: configurazione essenziale, poi spazio alla conversazione. Stato del microfono e della sessione esplicito; comandi per pausa, fine e ritorno comprensibili. Non simulare ascolto o registrazione prima dei permessi e dell'attivazione reale. Trascrizione o alternativa testuale quando supportate.

Usare lo stesso linguaggio di avanzamento e feedback delle lezioni. Vietati grandi cerchi decorativi e card capsule introdotti come nuovo stile locale.

## 14. Piano

Calendario coerente con tema giorno/notte e geometria squadrata. Eliminare il nero hardcoded in modalità giorno e i grandi raggi. Griglia discreta, giorno corrente riconoscibile, eventi identificabili per testo oltre al colore. Colore materia localizzato negli eventi.

Su telefono privilegiare la leggibilità dei prossimi impegni e della vista selezionata: una griglia mensile compressa non deve essere l'unico modo di capire cosa fare. Gli eventi hanno dettagli accessibili senza affidarsi all'hover.

Pannello aggiunta manuale coerente: titolo, tipo, materia, data ed eventuale collegamento al corso. Orari soltanto quando servono. Data di una verifica, scadenza di un compito e sessione di studio sono concetti distinti.

### Aggiunta in linguaggio naturale — evoluzione funzionale
Ingresso Aggiungi impegni, con opzioni manuale e descrizione libera. L'utente può inserire più compiti/verifiche in un unico messaggio.
Flusso: descrizione → proposta multipla modificabile → aggiunta unica → possibilità di annullare.
Mostrare date esplicite, tipo, materia ed eventuale corso prima del salvataggio. Chiedere chiarimenti sulle ambiguità sostanziali; non inventare orari, corsi o scadenze. Gestire possibili duplicati senza cancellare dati esistenti.

Registrare una verifica non equivale ad accettare un piano di studio. La proposta di sessioni collegate al percorso è un passo separato, da confermare.
Questo flusso richiede contratto dati, gestione degli errori e integrazione AI/backend; non deve essere simulato con una risposta finta durante il redesign.

## 15. Core

Core è il centro personale dell'evoluzione dello studente, con accesso frequente dalla navigazione principale. Non confonderlo con le impostazioni dell'account.

Visione di prodotto:
- esagono cognitivo e sua evoluzione;
- preferenze e routine;
- voti scolastici;
- attività di studio;
- risultati di apprendimento e miglioramenti nel tempo.

Queste capacità non sono tutte già disponibili. Implementare prima la coerenza della schermata esistente; introdurre le altre soltanto con dati e logiche reali.

Organizzare la gerarchia con una sintesi utile e approfondimenti, evitando una parete di grafici equivalenti. Distinguere attività, risultati nelle esercitazioni, voti scolastici e profilo cognitivo. Mostrare periodo, unità e disponibilità dei dati. Nessuna falsa precisione dell'esagono e nessun punteggio unico di miglioramento senza definizione.

Le variazioni dell'esagono devono essere spiegabili. Il semplice aumento delle ore non dimostra un aumento delle capacità, né il rapporto ore/voti dimostra causalità.

Grafici: palette controllata, label leggibili, linee distinguibili, riepilogo testuale e accesso ai dati quando necessario. Evitare tooltip disponibili solo con mouse. Colori delle serie separati dai colori di stato e di marca.

## 16. Landing e confini del prodotto

La landing può esprimere più energia: titoli grandi, composizioni geometriche, contrasti e transizioni più visibili. Deve usare la stessa identità, senza trasferire la sua densità di movimento alla lettura.

Preservare l'isolamento previsto per gli stili marketing nel repository. Il sistema dell'app non deve rompersi per modifiche alla landing, né viceversa. Condividere intenzioni e token compatibili senza introdurre override globali indiscriminati.

Non aggiungere testimonianze, efficacia, prezzi, metriche o risultati inventati.

## 17. Accessibilità e verifica

Obiettivo operativo: WCAG 2.2 AA, con verifiche effettive e senza dichiarazioni di conformità non dimostrate.
- Contrasto del testo ordinario almeno 4,5:1; testo grande secondo definizione almeno 3:1.
- Controlli e indicatori essenziali percepibili; focus visibile e non coperto.
- Funzionamento da tastiera, ordine coerente, label e struttura semantica.
- Dialoghi con gestione del focus e ritorno all'elemento di origine.
- Zoom e spaziatura personalizzata senza perdita di contenuto.
- A 320 CSS px evitare scorrimento orizzontale dell'intera pagina; eccezioni locali per contenuti realmente bidimensionali.
- Movimento ridotto e alternativa alle interazioni basate soltanto su trascinamento.
- Nessuna informazione comunicata soltanto da colore, animazione o aptica.

La spaziatura definita dal criterio W3C è una condizione da tollerare quando personalizzata, non un insieme di valori predefiniti obbligatori. Le misure tipografiche di questo documento sono proposte progettuali, non garanzie di apprendimento.

### Criteri di accettazione del redesign
1. Home, Piano, Studio e Core usano gli stessi token e componenti.
2. Nessuna grande card arrotondata o pillola residua fuori dalle eccezioni semantiche documentate.
3. Calendario corretto nei due temi.
4. Card corso atmosferica e pulsante leggibile in tutte le varianti materia.
5. Transizioni fluide e comprensibili senza movimento continuo.
6. Lezione testuale lunga, formula, tabella e figura leggibili su telefono e desktop.
7. Navigazione e footer non coprono contenuti o campi.
8. Vista Elenco resta utilizzabile anche senza animazioni o mappa.
9. Bozze, risposte, progresso e contesto non si perdono per il redesign.
10. Nessun dato fittizio presentato come reale e nessuna nuova funzionalità simulata.

Verificare almeno larghezze 320, 390, 768 e 1280 CSS px, giorno/notte, testo ingrandito, tastiera e movimento ridotto. Questi sono campioni minimi, non una lista esaustiva di dispositivi.

## 18. Regole per gli agenti di implementazione

Non procedere con un unico prompt che riscrive tutta l'applicazione. Sequenza raccomandata:
1. Audit dei componenti e degli stili esistenti; mappatura ai token condivisi.
2. Fondazioni: palette, tipografia, geometria, componenti e movimento.
3. Navigazione e Home, con verifica visiva.
4. Studio esistente e lezioni, conservando logiche e dati.
5. Ingressi esercizi/interrogazione e Piano esistente.
6. Core esistente e landing, rispettando i confini degli stili.
7. Evoluzioni funzionali separate: mappa con prerequisiti, componenti didattici interattivi e generazione, aggiunta AI degli impegni, metriche future di Core.

Integrare nella prima fase anche l'allineamento della Matrice delle Materie e della Minilezione 2.0, dei token in .impeccable/design.json e delle regole grafiche presenti in AGENTS.md. Il test noGreen.test.ts codifica il precedente monocromo e vieta classi teal: rivedere quella policy in accordo alla nuova identità, conservando i controlli di regressione utili. Non aggirare il test con colori nascosti o rimuovere indiscriminatamente la suite.

Per i percorsi mantenere la compatibilità v1/v2. I futuri blocchi-formula, marginalia e checkpoint sono specifiche di interazione da integrare con il contratto dati reale; non inventare campi client che il motore non produce. Le forme per famiglia possono variare dentro il sistema: formula ed esempio scientifico, citazione letteraria, relazione temporale storica, confronto filosofico, dialogo linguistico, traduzione latina e opera d'arte. Una linea guida unica non significa appiattire queste differenze.

Prima di ogni intervento verificare il codice effettivo: i nomi citati nella ricerca sono riferimenti, non garanzia che il ramo non sia cambiato. Preferire migrazione progressiva e componenti condivisi; rimuovere gli stili superseduti senza aggiungere una nuova stratificazione di override.

Ogni consegna deve indicare cosa è cambiato, schermate verificate, comportamenti preservati, limiti e funzionalità non ancora implementate. Test proporzionati alla modifica; controlli visivi indispensabili per il redesign. Non modificare backend o distribuire servizi in deroga ad AGENTS.md: preparare gli eventuali prompt Lovable richiesti dal progetto.

I prompt Arena dettagliati saranno deliverable successivi basati su questo documento e sullo stato aggiornato del repository.

## 19. Riferimenti e limiti dell'analisi

Decisioni: conversazione di progettazione con il proprietario del prodotto.
Audit: repository Carellix17/erga-2028 e schermate osservate di erga-learning.app. Campione lezione: La guerra dei cent'anni, lezione 7, primi due passaggi, giorno, desktop 1280 × 720. Non è una verifica completa di tutte le lezioni, formule, stati o dispositivi.

Fonti:
- [Mistral](https://mistral.ai/): riferimento visivo iniziale.
- [GOV.UK — layout](https://design-system.service.gov.uk/styles/layout/): gestione della lunghezza delle righe.
- [W3C — contrasto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum): soglie del contrasto testuale.
- [W3C — text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing): tolleranza alle personalizzazioni.
- [W3C — reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow): adattamento e scorrimento.
- [W3C — headings](https://www.w3.org/WAI/tutorials/page-structure/headings/): gerarchia semantica.
- [KaTeX — opzioni](https://katex.org/docs/options): rendering matematico e MathML.
- [Nielsen Norman Group — progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): strumenti secondari e gestione della complessità.

Le applicazioni specifiche a Erga sono giudizi progettuali; non sono risultati di test di apprendimento sugli studenti. Le ricerche preparatorie separate conservano il contesto della navigazione e delle lezioni.

