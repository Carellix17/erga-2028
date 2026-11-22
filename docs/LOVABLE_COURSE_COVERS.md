# Prompt per rimuovere le copertine dei percorsi in Lovable

Sincronizza Erga con il ramo `main` di GitHub dopo l'integrazione della modifica che ripristina le card avorio. Usa le funzioni presenti nel ramo sincronizzato.

1. Distribuisci su Lovable Cloud `supabase/functions/generate-lessons/index.ts` e `supabase/functions/get-lessons/index.ts` dal ramo sincronizzato. Verifica che `generate-lessons` continui a salvare `subject_family` e `subject` con il rilevatore didattico preesistente. `listContexts` deve continuare a restituire solo i percorsi dell'utente autenticato. Entrambe le funzioni devono essere indipendenti da `course_cover`.
2. Conserva lo schema, le policy di accesso, i permessi e tutti i dati esistenti. Se `public.study_contexts.course_cover` è presente, lascia la colonna e i valori memorizzati, ormai inutilizzati. Se è assente, lascia lo schema attuale.
3. Con un account di prova, crea un percorso da materiale sulla tavola periodica e verifica che le lezioni vengano generate e che i campi didattici siano valorizzati. Controlla che i percorsi nuovi ed esistenti si aprano correttamente. Verifica che Home, percorso attivo di Studio e selettore mostrino card avorio (`#FFFBF4`), con angoli da 24 px e senza copertine. Apri «Crea nuovo percorso» e verifica che il pop-up mostri le tre opzioni di caricamento e ricerca del redesign già integrato.

Quando il backend è pronto, usa **Update** in Lovable per pubblicare il frontend.
