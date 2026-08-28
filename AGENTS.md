# Istruzioni di lavoro per Erga

Questo file raccoglie le regole che ogni assistente deve seguire quando lavora su Erga.
Tutte le skill utilizzabili sono riunite in `.agents/skills/`; il catalogo è `.agents/skills/README.md`.

Prima di prendere decisioni di prodotto, leggere `PRODUCT.md`: è la fonte persistente e confermata su utenti, scopo, posizionamento, vincoli ed evidenze disponibili.

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

Leggere `.agents/skills/frontend-design/SKILL.md` quando si creano o modificano pagine, componenti o stili.

Prima di scrivere codice definire:

- lo scopo della schermata;
- chi la usa;
- il tono visivo;
- i limiti tecnici;
- l'elemento distintivo che la rende riconoscibile.

Per Erga la direzione predefinita è **editoriale, minimale, autorevole ma vicina agli studenti**. Mantenere il marchio nero, bianco, rosso e rosa salvo richiesta esplicita. Evitare interfacce generiche da prodotto AI, decorazioni casuali e pattern copiati senza relazione con lo studio.

### UI/UX Pro Max — ricerca strutturata prima delle modifiche ampie

La skill completa è in `.agents/skills/ui-ux-pro-max/`. Per nuove pagine, redesign o revisioni ampie, iniziare dal generatore di design system e usare poi le ricerche UX/stack pertinenti. Non sostituire automaticamente i token e il marchio esistenti con i suggerimenti generici del database.

### Scroll Experience — solo quando migliora la storia

Leggere `.agents/skills/scroll-experience/SKILL.md` per parallax, sezioni sticky, reveal o narrazioni guidate dallo scorrimento.

Regole Erga:

- lo scorrimento deve restare naturale;
- non bloccare, rallentare o sostituire lo scroll del browser;
- animare pochi momenti importanti;
- il contenuto deve rimanere disponibile anche senza animazioni;
- rispettare `prefers-reduced-motion`;
- semplificare gli effetti su telefono;
- usare prima CSS e API native; aggiungere librerie solo se portano un vantaggio misurabile.

### 3D Web Experience — solo con un beneficio reale

Leggere `.agents/skills/3d-web-experience/SKILL.md` quando viene richiesto WebGL, Three.js, React Three Fiber, Spline o un elemento tridimensionale.

Prima di introdurre il 3D chiedersi: “Aiuta davvero lo studente a capire o usare il prodotto?”. Se un'immagine, SVG o animazione 2D comunica lo stesso concetto, preferire la soluzione più semplice.

Se il 3D è giustificato:

- caricarlo dopo il contenuto essenziale;
- mostrare uno stato di caricamento;
- fornire un'alternativa statica;
- ridurre qualità e movimento sui dispositivi meno potenti;
- evitare modelli oltre 5 MB, puntando a meno di 100.000 poligoni;
- sospenderlo quando non è visibile;
- testare consumo, fluidità e usabilità su telefono.

### Impeccable — progettazione e revisione UI

La skill principale è in `.agents/skills/impeccable/SKILL.md`. Per una sessione di lavoro visivo:

- eseguire una sola volta lo script di contesto indicato dalla skill;
- usare il comando/playbook Impeccable più vicino alla richiesta (shape, critique, audit, polish, harden, adapt, animate, optimize ecc.);
- rispettare `PRODUCT.md` e `.impeccable/config.json`;
- per Erga il percorso predefinito è **code-first**;
- dopo modifiche UI, eseguire il detector meccanico di Impeccable sui file cambiati quando possibile.

### Emil Kowalski Motion Skills — animazione con uno scopo

Le skill installate da `emilkowalski/skill` sono in `.agents/skills/`. Usare soprattutto:

- `animate` per implementare movimento;
- `review-animations` per revisionare una transizione;
- `find-animation-opportunities` e `improve-animations` per audit e piani;
- `emil-design-eng` per rifinitura e comportamento dei componenti;
- `ask-sonner` quando si lavora sui toast.

Ogni animazione deve comunicare gerarchia, feedback, continuità o cambiamento di stato. Evitare movimento decorativo continuo e rispettare sempre `prefers-reduced-motion`.

### Taste Skill — solo superfici marketing

`design-taste-frontend` è in `.agents/skills/design-taste-frontend/SKILL.md`.
Usarla per landing page, pagine marketing e redesign espressivi. Non applicarne automaticamente le regole a dashboard, calendari, tabelle o flussi operativi dell'app, dove chiarezza e convenzioni del prodotto hanno precedenza.

In caso di conflitto tra una skill esterna e le regole specifiche di Erga, prevalgono nell'ordine: `PRODUCT.md`, questo `AGENTS.md`, accessibilità e codice esistente.

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

## 6. Ambiente di sviluppo Base44

L'app gira in preview tramite `docker-compose.base44.yml` (frontend-only; il backend è Lovable Cloud / Supabase esterno, non va eseguito in compose).

- **Stack**: Vite 5 + React 18 + TypeScript, package manager Bun. Vite dev server in ascolto sulla porta 8080, mappata sulla porta host 3000.
- **Avvio**: `docker compose -f docker-compose.base44.yml up -d`. Il container esegue `bun install` poi `bunx vite --host 0.0.0.0 --port 8080`.
- **predev saltato**: l'hook `predev` (`bunx tsx scripts/generate-sitemap.ts`) fallisce in container Bun per un problema di risoluzione di `tsx`; il file `public/sitemap.xml` è già generato e committed, quindi si lancia Vite direttamente saltando l'hook.
- **Env**: le chiavi Supabase (publishable/anon) e i token payments (test/live) sono già committed in `.env` / `.env.development` / `.env.production` — non servono secret esterni per avviare l'app.
- **Host esterno**: Vite ha `allowedHosts: true` e `host: "::"`, quindi l'anteprima con hostname proxy funziona senza modifiche.
- **Verifica**: `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/` deve restituire l'HTML dell'app; i moduli sorgente sono serviti da `/src/...` (dev server, non bundle precompilato).
- **Live reload**: le modifiche al codice sorgente si riflettono automaticamente (Vite HMR); per modifiche a compose/env/dipendenze usare `reload_preview`.
