# Pubblicazione della correzione Studio

Prompt da copiare in Lovable dopo il merge della pull request:

```text
Sincronizza il progetto Erga con l'ultimo main GitHub contenente la correzione del blocco di Studio per materiale non studiabile. Leggi HANDOFF.md.

Il backend resta Lovable Cloud. Pubblica soltanto le Edge Function extract-pdf e generate-lessons, includendo la nuova dipendenza locale supabase/functions/_shared/studyMaterial.ts. Non creare migrazioni, non modificare schema, permessi, segreti, provider AI o altre funzioni.

Il rifiuto definitivo usa gli stati già esistenti: generation_status=failed, generation_progress={}, generation_started_at=null e generation_error con il codice [UNSUITABLE_STUDY_MATERIAL]. L'estrazione non utilizzabile imposta anche processing_status=failed. Non cancellare file, contesti, lezioni precedenti o progressi dello studente.

Verifica con un account di test:
1. Apri un percorso valido già presente, poi carica un'immagine priva di contenuti didattici e avvia il percorso. Quando rilevata, la pipeline deve chiudersi e mostrare «Generazione impossibile», senza richiedere di rigenerare lo stesso materiale.
2. Dalla schermata di errore apri il selettore del percorso in alto e torna al corso precedente: lezioni e avanzamento devono essere disponibili.
3. Ricarica Studio: nessun loader o riavvio automatico sul materiale rifiutato.
4. Carica una pagina leggibile di appunti o un diagramma didattico: la generazione deve restare funzionante. Un batch contenente anche una foto non studiabile deve fermarsi interamente.
5. Un errore temporaneo del provider deve restare distinto dal rifiuto del materiale e consentire un nuovo tentativo manuale. Una rigenerazione rifiutata non deve cancellare le lezioni già esistenti.
6. Verifica Studio a 375, 768, 1024 e 1440 px, giorno/notte e tastiera: messaggio leggibile, selettore utilizzabile, nessun overflow.

Completa la pubblicazione frontend con Update. Conferma separatamente l'esito delle due funzioni, dell'Update e delle verifiche. Non dichiarare la correzione online se uno di questi passaggi non è riuscito.
```

Il riconoscimento del contenuto resta affidato al modello AI esistente: i test locali verificano la gestione del suo esito, non garantiscono una classificazione infallibile. Non è stato eseguito alcun deploy da questa sessione.
