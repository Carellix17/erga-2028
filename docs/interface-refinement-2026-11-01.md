# Erga — revisione dell’interfaccia, 1 novembre 2026

Base: `main` al commit `87f3304`. Direzione richiesta: conservare geometria squadrata, carta, vermiglio e tipografia; eliminare pulsanti neo brutalisti e navigazione flottante; riorganizzare Piano; correggere Studio e rendere più coerenti animazioni e feedback aptico.

## Evidenze e limiti

La landing pubblica e, dopo l’accesso manuale dell’utente, Home, Piano, agenda, Studio, moduli e lettore autenticati sono stati osservati nel Browser a **1363 × 936 CSS px**. Sono state verificate apertura e chiusura della lezione senza completare attività o modificare gli impegni. La versione pubblicata conserva ancora i controlli precedenti alla PR: queste osservazioni confermano i problemi di partenza, non verificano visivamente il nuovo codice. L’anteprima di sviluppo non era raggiungibile dal browser remoto; l’apertura di file locali è stata rifiutata dalla sua policy e non è stata aggirata. Il Browser cloud non espone una API documentata per ridimensionare il viewport. Dopo autorizzazione dell’utente, il rendering della PR è stato verificato in Chromium locale con dati dimostrativi e backend isolato a **375×812, 390×844, 768×1024, 1024×768 e 1440×900**. Nessuna conformità WCAG completa è dichiarata.

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

## Riscontro sul prodotto autenticato

1. **Home — utilizzabile sul desktop osservato.** Percorso, progressi, strumenti e piano del giorno risultano raggiungibili. Persistono il forte stacco delle CTA e molto spazio tra il radar e gli strumenti.
2. **Piano — priorità da correggere.** All’apertura compare il mese; l’agenda richiede il toggle a icone. Dopo l’apertura, la lista ha uno scorrimento interno rigido e i controlli modifica/elimina dipendono dall’hover. Il comando di generazione non appare benché siano presenti impegni salvati.
3. **Studio e moduli — navigazione funzionante, densità da rifinire.** Materiali e percorso occupano colonne affiancate sul desktop; la hero dei moduli rimane fissa durante la consultazione. Le CTA mantengono l’ombra rigida e alcuni comandi usano ancora il tutto maiuscolo.
4. **Lettore — apertura e ritorno funzionanti, disposizione precedente confermata.** Nella versione pubblicata il footer occupa tutta la larghezza, con tutor a sinistra e Continua molto esteso; il testo ha una colonna più stretta. La PR già allinea i comandi alla colonna di lettura e aggiunge la gestione del focus mancante nella schermata osservata.
5. **Mobile e tablet — verificati in Chromium locale con dati dimostrativi.** Home, Piano, calendario aperto, Studio, materiali, upload mobile, lettore e tutor sono stati provati alle larghezze dichiarate. Sono state acquisite le schermate effettivamente renderizzate; nessuna immagine ritagliata viene presentata come simulazione di dispositivo.

Le catture del prodotto autenticato sono usate internamente come evidenza; dati e materiali dell’account non vengono caricati nel repository pubblico.

## Correzioni emerse dalla verifica responsive

- **Esc nel tutor:** la prima verifica nel browser ha riprodotto la chiusura contemporanea di tutor e lezione. Il lettore ora rispetta l’evento già gestito da Radix: il primo Esc chiude soltanto il tutor, il secondo la lezione. La regressione è coperta anche da un test con il tutor reale montato nel DOM.
- **Allineamento su tablet/desktop:** lettura e footer ora riservano la stessa larghezza alle barre di scorrimento native. Le colonne restano allineate anche a 768 px.
- **Target tattili:** chiusura dei pannelli, selettori Caricamento/Gestisci e pulsante del piano nella Home hanno altezza e area minima da 44 px.
- **Menu dei materiali:** PDF, foto e web compaiono senza attese decorative; le descrizioni lunghe vanno a capo. Il movimento ridotto azzera anche i ritardi delle animazioni.
- **Tutor su telefono:** l’intestazione lascia spazio alla chiusura, il testo usa 16 px, il pannello usa dvh e si aggancia all’altezza visibile tramite il gancio tastiera già esistente. La tastiera fisica del telefono resta da provare sul dispositivo.

Il profilo riproducibile è `VISUAL_PROFILE=interface-refinement node scripts/visual-check.mjs`; `VISUAL_FONTS_CSS` può indicare una cache CSS dei font del marchio. In questa verifica sono stati usati Ubuntu Sans, Ubuntu Sans Mono e Instrument Serif reali, acquisiti dalle dichiarazioni ufficiali Google Fonts e forniti localmente al browser. Nessuna richiesta verso servizi Erga è stata effettuata; la risposta del tutor è esplicitamente simulata.

La seconda e ultima verifica visiva comprende **51 registrazioni di controllo**, incluse le schermate giorno/notte a 390/768/1024 px e i controlli di movimento e dispatch aptico. Esito: nessun errore JavaScript, richiesta esterna inattesa, overflow orizzontale, controllo tagliato o target di altezza insufficiente nei casi provati. Sono state verificate selezione del giorno, apertura materiali/upload, allineamento del lettore, mantenimento del focus e comportamento di Esc. La sensazione aptica fisica non è verificabile in Chromium senza hardware.

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

- Suite completa: **91 file, 768 test superati** (inclusi regressioni sul lettore, focus, ritorno alla Home, ripresa, eventi, selezione date e aptica).
- TypeScript: superato.
- Build di produzione Vite e service worker PWA: superata. Warning di dimensione di alcuni bundle presenti; non è stata introdotta una nuova libreria.
- ESLint sui file modificati: nessun errore; tre avvertenze preesistenti (dipendenze hook in StudioView ed export per Fast Refresh nel componente Button).
- Detector Impeccable: il bordo di lettura da 4 px è stato ridotto a un separatore da 1 px. Il rilievo sul font editoriale è incompatibile con il brief confermato e non richiede cambiare Instrument Serif.
- `git diff --check`: superato.

La suite verifica il comportamento nel DOM e il profilo browser verifica i casi responsive sopra elencati. Restano la prova fisica di tastiera e aptica sul telefono, l’integrazione mobile autenticata sul sito pubblicato, zoom e un audit di contrasto/accessibilità completo. I test con dati dimostrativi non provano la correttezza delle risposte AI o dei servizi backend.

`.impeccable/design.json` risultava già più vecchio di DESIGN.md: non viene rigenerato incidentalmente. Il riallineamento può essere svolto separatamente; la fonte di questa revisione è DESIGN.md v4.1.

## Pubblicazione

Le modifiche sono proposte in un ramo separato. Dopo la revisione visiva e il merge, usare **Update in Lovable** e verificare l’app pubblicata. Nessuna modifica è dichiarata online da questa sessione.


## Aggiornamento richiesto: calendario e sessione giornaliera

Il brief successivo sostituisce la composizione agenda-prima: ora il mese resta aperto all’ingresso e le scadenze lo precedono. La PR #104 è stata resa pronta per la revisione; non è stata unita né pubblicata.

- Fascia di scadenze reali in ordine cronologico, con tre/quattro/cinque/sei/sette card per fascia di larghezza, numero dei giorni, materia, titolo e data. Scorrimento touch e frecce, nessuna rotazione automatica. Le copertine sono lo stesso componente di Studio: collegamento esplicito al percorso, altrimenti corrispondenza di materia, poi fallback sulla materia.
- Calendario mensile con date native accessibili; quantità di eventi su telefono, titoli sintetizzati da ellissi sulle celle più larghe. Toccando una data si apre la giornata intera. Le azioni di aggiunta e generazione sono subito sotto, rispettivamente vermiglie e cognitive.
- Sessione giornaliera dedicata a oggi o a qualunque data, con navigazione precedente/successivo/Oggi, URL persistente e ritorno al calendario. Verifiche, studio e impegni personali sono tutti presenti. I record privi di ora sono separati dalla griglia delle 24 ore; eventi allo stesso orario si impilano senza coprirsi. La prima posizione visibile corrisponde al primo evento con orario salvato.
- Il Piano funziona anche senza materiali. Da una giornata, il modulo aggiunta riceve quella data. La generazione rimane indisponibile senza materiali e impegni, con spiegazione; un errore di lettura del calendario offre Riprova. Corretto anche il giorno locale degli eventi «Altro», prima ricavato tagliando una data UTC.

La vista giornaliera segue la distinzione mese/giorno osservata nelle guide ufficiali di [Google Calendar](https://support.google.com/calendar/answer/6110849?co=GENIE.Platform%3DDesktop&hl=it) e [Fantastical](https://flexibits.com/fantastical-ios/help/calendar-views); la forma, la tipografia e le copertine restano quelle di Erga. Nessun nuovo servizio o calendario esterno viene collegato.

### Movimento

| Prima | Dopo | Motivo |
|---|---|---|
| Passaggio fra composizioni senza una giornata autonoma | Entrata direzionale di 8 px / 180 ms tra mese e giornata | Conservare la relazione fra data e programma |
| Lista di prossimi eventi verticale | Scorrimento orizzontale nativo con snap e frecce | Rendere raggiungibili tutte le scadenze anche senza trascinare |
| Cambio mese istantaneo | Cambio direzionale 180 ms, senza entrate annidate | Comunicare avanti/indietro |
| Attesa fissa prima dell’eliminazione | 180 ms, immediata con movimento ridotto | Allineare feedback visivo e risposta |

Solo transform e opacity per gli ingressi; colori/opacità per i controlli. Preferenze di sistema ed Erga rispettate. Le attivazioni da tastiera evitano gli spostamenti; il focus passa al titolo della giornata e ritorna alla data che l’ha aperta. Nessun contenuto attende uno stagger o un’animazione per essere disponibile.

### Verifica di questo aggiornamento

- **92 file / 773 test superati**. Le regressioni coprono apertura calendario, URL giornaliero, data preselezionata, giorni vuoti, navigazione, focus, callback di modifica/eliminazione, orari locali, convenzione legacy del mezzogiorno e identità delle copertine.
- Chromium locale isolato, dati dimostrativi, font reali, 375/390/768/1024/1440 px. Tema scuro a 390/768/1024 px, controlli di movimento normale e ridotto. Due passaggi: il primo ha evidenziato lo scorrimento iniziale errato della giornata e la spezzatura dei titoli stretti; correzioni e conferma completate.
- Nel passaggio conclusivo: **66 screenshot**, 72 record di verifica, nessuna segnalazione del profilo, errore JavaScript o richiesta esterna inattesa. Verificati numero delle card visibili, frecce, colori distinti e posizione delle azioni, calendario aperto, eventi personali e simultanei, inizio sul primo orario, ritorno del focus e transizioni a 180 ms.
- ESLint dei file modificati e controllo delle differenze senza errori. Il detector mantiene solo l’avvertenza sul font Instrument Serif, richiesto dall’identità confermata.
- TypeScript e build diretta Vite/PWA verificati. Lo script npm di prebuild richiede Bun, non installato in questo ambiente; il sito è stato compilato con il comando Vite del progetto. Non cambiano rotte o sitemap.

La griglia conserva gli orari di inizio disponibili e non attribuisce durate inesistenti. Il formato storico delle valutazioni non distingue una prova effettivamente a mezzogiorno da una senza orario: resta la convenzione già usata dal modulo. Restano da provare aptica e tastiera su telefono fisico, integrazione autenticata dopo pubblicazione e un audit completo di contrasto/accessibilità. Nessuna modifica al database o alle Edge Function, nessuna nuova dipendenza.
