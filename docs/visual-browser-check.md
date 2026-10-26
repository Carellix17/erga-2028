# Verifica visiva isolata

Esegui `npm run visual:check` (oppure `bun run visual:check`) per aprire una sessione Chromium headless e controllare Home e Studio in tre viewport: smartphone (390×844), tablet (820×1180) e desktop (1440×900). Il server Vite usa una porta loopback effimera, senza riutilizzare un server di sviluppo già attivo.

Il runner:

- avvia Vite con `vite.visual.config.ts`, una configurazione separata che **non carica** il `vite.config.ts` di prodotto, il plugin Lovable MCP o il service worker;
- monta i componenti React reali di Home, Studio e `UploadSheet`, con dati locali deterministici e mock di auth, database e funzioni Edge; il contenitore e la navigazione sono fixture isolate che riproducono solo il flusso necessario, non l'intera app né `Index`;
- blocca ogni richiesta del browser fuori dall’origine locale della fixture e fallisce se viene tentato accesso a un servizio esterno;
- controlla overflow orizzontale, wordmark/saluto, lista verticale e raggiungibilità dell’ultima attività; verifica inoltre CTA Studio e bottom sheet mobile rispetto al pannello materiali incorporato;
- scrive screenshot e `report.json` in `artifacts/visual-browser/`, directory esclusa da Git.

Nessuna sessione personale, credenziale o account viene usata. Il fixture non è registrato nell’app né incluso nella build di produzione; serve solo a visualizzare i componenti con dati di prova. La logica di backend/cloud non viene esercitata.
