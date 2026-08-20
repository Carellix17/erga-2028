# Istruzioni di lavoro per Erga

Questo file raccoglie le regole che ogni assistente deve seguire quando lavora su Erga.
Le guide complete sono in `docs/skills/`.

## 1. Regole operative del progetto

- Il codice sorgente ufficiale è il ramo `main` del repository GitHub.
- Il backend è Lovable Cloud. Non eseguire direttamente migrazioni o deploy di Edge Function.
- Se una modifica richiede il database o una Edge Function, preparare per l'utente un prompt completo da copiare in Lovable.
- Dopo modifiche visibili al codice, ricordare all'utente di usare **Update** in Lovable.
- Spiegare sempre in italiano semplice: cosa cambia, perché cambia, cosa vede l'utente e cosa deve fare.
- Non dichiarare una modifica online finché non è stata realmente pubblicata o verificata.

## 2. Priorità obbligatorie

Quando due indicazioni entrano in conflitto, seguire questo ordine:

1. Sicurezza e protezione dei dati.
2. Accessibilità e funzionamento da tastiera.
3. Chiarezza del contenuto e facilità d'uso.
4. Prestazioni, soprattutto su telefono.
5. Coerenza con l'identità visiva di Erga.
6. Originalità estetica, animazioni, scroll narrativo e 3D.

Un effetto visivo non deve mai rendere l'app più difficile da usare, più lenta o meno accessibile.

## 3. Skill da applicare

### Frontend Design — sempre per lavori visivi

Leggere `docs/skills/frontend-design/SKILL.md` quando si creano o modificano pagine, componenti o stili.

Prima di scrivere codice definire:

- lo scopo della schermata;
- chi la usa;
- il tono visivo;
- i limiti tecnici;
- l'elemento distintivo che la rende riconoscibile.

Per Erga la direzione predefinita è **editoriale, minimale, autorevole ma vicina agli studenti**. Mantenere il marchio nero, bianco, rosso e rosa salvo richiesta esplicita. Evitare interfacce generiche da prodotto AI, decorazioni casuali e pattern copiati senza relazione con lo studio.

### Scroll Experience — solo quando migliora la storia

Leggere `docs/skills/scroll-experience/SKILL.md` per parallax, sezioni sticky, reveal o narrazioni guidate dallo scorrimento.

Regole Erga:

- lo scorrimento deve restare naturale;
- non bloccare, rallentare o sostituire lo scroll del browser;
- animare pochi momenti importanti;
- il contenuto deve rimanere disponibile anche senza animazioni;
- rispettare `prefers-reduced-motion`;
- semplificare gli effetti su telefono;
- usare prima CSS e API native; aggiungere librerie solo se portano un vantaggio misurabile.

### 3D Web Experience — solo con un beneficio reale

Leggere `docs/skills/3d-web-experience/SKILL.md` quando viene richiesto WebGL, Three.js, React Three Fiber, Spline o un elemento tridimensionale.

Prima di introdurre il 3D chiedersi: “Aiuta davvero lo studente a capire o usare il prodotto?”. Se un'immagine, SVG o animazione 2D comunica lo stesso concetto, preferire la soluzione più semplice.

Se il 3D è giustificato:

- caricarlo dopo il contenuto essenziale;
- mostrare uno stato di caricamento;
- fornire un'alternativa statica;
- ridurre qualità e movimento sui dispositivi meno potenti;
- evitare modelli oltre 5 MB, puntando a meno di 100.000 poligoni;
- sospenderlo quando non è visibile;
- testare consumo, fluidità e usabilità su telefono.

## 4. Requisiti minimi per il frontend

- Testo principale di almeno 16 px sul telefono.
- Contrasto minimo WCAG AA: 4,5:1 per il testo normale.
- Controlli facilmente toccabili, idealmente almeno 44 × 44 px.
- Focus visibile e ordine da tastiera coerente.
- HTML semantico e nomi accessibili per i pulsanti con sola icona.
- Nessuno scorrimento orizzontale involontario.
- Animazioni brevi e basate soprattutto su `transform` e `opacity`.
- Nessuna emoji usata come icona dell'interfaccia: usare Lucide o SVG coerenti.
- Evitare dipendenze nuove se CSS, React o le librerie già presenti bastano.

## 5. Controlli prima della consegna

Per una modifica frontend, quando possibile:

1. eseguire i test pertinenti e poi l'intera suite;
2. eseguire TypeScript e il controllo dei file modificati;
3. verificare la build di produzione;
4. controllare 375, 768, 1024 e 1440 px;
5. verificare assenza di overflow orizzontale e target troppo piccoli;
6. controllare accessibilità automatica e navigazione da tastiera;
7. spiegare in modo semplice modifiche, motivazioni, limiti e azioni richieste all'utente.
