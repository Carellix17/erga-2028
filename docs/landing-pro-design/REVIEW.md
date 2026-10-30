# Landing Erga — Pro Design
Obiettivo confermato: favorire la registrazione alla beta, evolvendo il marchio esistente.

## Analisi e interventi
| Area | Riscontro | Intervento |
|---|---|---|
| Navigazione | Sul sito pubblico il marchio e i collegamenti appaiono quasi bianchi sulla carta chiara. | Testo semantico e logo che eredita il colore del contesto; navigazione sticky con menu mobile. |
| Prima schermata | Sul sito pubblico righe rosse attraversano tutta la superficie. Il messaggio iniziale è astratto e la simulazione inclinata. | Superficie piatta, titolo concreto, anteprima frontale e percorso materiale/lezioni/piano. Le righe del sito pubblico non sono riprodotte nel ramo main analizzato. |
| Dimostrazione | Scelta materia e passaggi già funzionanti; tab senza navigazione a frecce. | Funzioni conservate, schede collegate al pannello, frecce/Home/End e focus coerente. |
| Esagono | Dimostrazione ricca ma alta riserva di spazio e diagramma poco contrastato. | Rimossa l'altezza minima fino a 1500px; punti e poligono con colore cognitivo; simulazione dichiarata. |
| Casi d'uso | Tre card uguali con cornici decorative ripetute. | Righe editoriali con esempi concreti e flussi leggibili. |
| Beta | Gratuita, Pro non ancora in vendita. | Informazioni conservate; nessun prezzo, risultato o testimonianza inventati. |
| FAQ e footer | Risposte già collegate ai pulsanti, accessi e link legali presenti. | Composizione più ordinata, separatori, tipografia coerente e invito finale alla registrazione. |
| Movimento | Reveal che nascondono le sezioni e molte animazioni annidate. | Una sola entrata del blocco hero da uno stato leggibile, feedback dei controlli e reduced motion. |

## Verifiche
- Suite completa: **85 file, 732 test superati**.
- Test landing dopo gli ultimi interventi: **9/9 superati**.
- TypeScript e build di produzione superati dopo gli ultimi interventi.
- ESLint dei file TypeScript modificati: nessun errore; warning preesistente Fast Refresh per l'esportazione di utilità da HexagonPlay.
- Detector Impeccable: nessuna segnalazione.
- Browser: anteprima desktop e mobile; passaggio Percorso funzionante e menu mobile aperto da tastiera. Nessun overflow rilevato nelle larghezze iframe 375/390/768/1024/1440 (il viewport interno esclude la scrollbar).
- Il browser segnala errori della propria estensione; non sono errori dell'app.
- Non è stata eseguita una certificazione WCAG né una misurazione Lighthouse. I mock restano esempi HTML, non screenshot autenticati dell'app.

## Pubblicazione
Questa modifica riguarda il frontend. Per pubblicarla: revisionare e unire la PR, quindi usare **Update** in Lovable. Non richiede migrazioni o pubblicazione di Edge Function.

Il sidecar storico .impeccable/design.json non è allineato con DESIGN.md: in questa modifica prevalgono i token e le specifiche di DESIGN.md. Non è stato modificato il design system globale.
