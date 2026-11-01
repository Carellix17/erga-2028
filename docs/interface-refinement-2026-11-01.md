# Erga — revisione dell’interfaccia, 1 novembre 2026

Base: `main` al commit `87f3304`. Direzione richiesta: conservare geometria squadrata, carta, vermiglio e tipografia; eliminare pulsanti neo brutalisti e navigazione flottante; riorganizzare Piano; correggere Studio e rendere più coerenti animazioni e feedback aptico.

## Evidenze e limiti

La landing pubblica è stata aperta e osservata nel Browser. L’accesso sicuro alle schermate autenticate non si è concluso. L’anteprima di sviluppo non era raggiungibile dal browser remoto; l’apertura di file locali è stata rifiutata dalla sua policy e non è stata aggirata. Questa è una revisione del codice con test del DOM e build, **non un audit visivo completo dell’area autenticata**. Non sono disponibili screenshot verificati delle nuove schermate; nessuna conformità WCAG completa è dichiarata.

Le domande su priorità del Piano, bug specifici di Studio e diffusione aptica non hanno ricevuto risposte. Per procedere sono stati assunti: agenda di oggi e prossime scadenze come vista iniziale; mantenimento del lettore immersivo già presente in main; feedback diffuso ma breve con un controllo per ridurlo o disattivarlo.

## Percorso esaminato

| Passo | Stato riscontrato nel codice | Modifica |
|---|---|---|
| 1. Navigazione principale | Dock mobile con margini esterni e indicatore che misura/animava larghezza; sidebar da 256 px | Barra attaccata al bordo con safe area interna, quattro destinazioni, indicatore CSS a larghezza fissa; sidebar da 224 px e marchio esistente |
| 2. Piano all’apertura | Agenda nascosta; mese dominante; padding annidati e scroll della lista fisso a 620 px | Agenda immediata nel flusso della pagina, filtri Oggi/Tutti i prossimi; calendario secondario da aprire sotto xl |
| 3. Scelta di un giorno | Celle non interattive da tastiera/tocco; riordino al semplice hover | Pulsanti con nomi completi, stato selezionato e giorno corrente; filtro solo su scelta esplicita; navigazione tra mesi |
| 4. Gestione degli impegni | Azioni piccole e visibili soprattutto all’hover; generazione disponibile soltanto dopo un’aggiunta nella sessione | Modifica/elimina con target da 44 px e nome dell’evento; generazione dipendente dai dati salvati, con stato disabilitato e spiegazione quando mancano impegni |
| 5. Materiali in Studio | Pannello nascosto sotto lg senza comando diretto; colonna troppo ingombrante a 1024 px | Comando Materiali e lettura con stato accessibile; divisione 3/7 solo da xl |
| 6. Lettura di una lezione | Dialogo dichiarato ma privo di focus trap; safe area senza regole CSS; animazioni ampie con attesa 250 ms | Portale e gestione focus/scroll Radix già in dipendenza, ritorno al controllo iniziale, safe area definite; passaggio direzionale di 8 px, uscita 120 ms e ingresso 180 ms |
| 7. Tutor della lezione | Campo e invio privi di nome accessibile; controlli di dimensione ridotta | Etichette accessibili e invio 44 px; campo da 16 px e larghezza riducibile |
| 8. Feedback e preferenze | Aptica solo in alcuni componenti, impulsi da 10 ms, nessun controllo utente; preferenze JS non uniformi | Feedback condiviso anche nei pannelli portalled, priorità dei segnali semantici e protezione dai doppioni; livelli Disattivato/Leggero/Standard/Deciso; MotionPreferences per CSS e Framer |

## Scelte conservate

Palette, font, contenuti autentici, progressi, memoria delle lezioni, esercizi, assistente, flussi di caricamento e contratti backend rimangono le fonti del prodotto. La lettura a schermo intero resta la modalità corrente: la descrizione precedente del lettore incorporato in DESIGN.md era divergente da main. La prop `embedded` ora produce effettivamente una regione nel flusso, ma non viene attivata nel normale percorso Studio.

Nessuna nuova dipendenza, migrazione o pubblicazione di Edge Function. Il file MCP rigenerato automaticamente dalla build è escluso dalle modifiche.

## Movimento e feedback aptico

| Elemento | Scopo | Comportamento |
|---|---|---|
| Indicatore navigazione | Continuità tra destinazioni | Una transizione interrompibile di sola traslazione, 180 ms, curva condivisa |
| Agenda | Rendere leggibile il cambio filtro | Breve ingresso 180 ms; nessuno spostamento al passaggio del mouse |
| Lezione | Distinguere avanti e indietro | Uscita 120 ms, ingresso 180 ms, spostamento di 8 px; passaggi immediati con movimento ridotto |
| Pulsanti | Confermare la pressione | Colore/opacità, senza ombre rigide o spostamenti diagonali |
| Aptica | Confermare azioni e risultati | Standard 20 ms per selezioni, 36 ms per navigazione esplicita; ritmi distinti per conferme, avvisi ed errori |

I livelli aptici modificano durata e ritmo, non l’ampiezza del motore. Sono necessarie disponibilità di `navigator.vibrate`, attivazione dell’utente e supporto del dispositivo/browser. Fonte tecnica: [W3C Vibration API](https://www.w3.org/TR/vibration/). Nessuna sensazione fisica è verificabile tramite i test automatici.

## Verifica

- Suite completa: **91 file, 767 test superati** (inclusi regressioni sul lettore, focus, ritorno alla Home, ripresa, eventi, selezione date e aptica).
- TypeScript: superato.
- Build di produzione Vite e service worker PWA: superata. Warning di dimensione di alcuni bundle presenti; non è stata introdotta una nuova libreria.
- ESLint sui file modificati: nessun errore; tre avvertenze preesistenti (dipendenze hook in StudioView ed export per Fast Refresh nel componente Button).
- Detector Impeccable: il bordo di lettura da 4 px è stato ridotto a un separatore da 1 px. Il rilievo sul font editoriale è incompatibile con il brief confermato e non richiede cambiare Instrument Serif.
- `git diff --check`: superato.

La suite verifica il comportamento nel DOM; restano da verificare visivamente 375/390/768/1024/1440 px, giorno/notte, zoom, overflow, contrasto, tastiera mobile, tutor aperto sopra il lettore e sensazione aptica sul telefono.

`.impeccable/design.json` risultava già più vecchio di DESIGN.md: non viene rigenerato incidentalmente. Il riallineamento può essere svolto separatamente; la fonte di questa revisione è DESIGN.md v4.1.

## Pubblicazione

Le modifiche sono proposte in un ramo separato. Dopo la revisione visiva e il merge, usare **Update in Lovable** e verificare l’app pubblicata. Nessuna modifica è dichiarata online da questa sessione.
