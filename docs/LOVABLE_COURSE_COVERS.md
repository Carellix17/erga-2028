# Prompt da copiare in Lovable

Sincronizza il progetto Erga con il ramo `main` del repository GitHub che contiene la modifica alle copertine. Completa la configurazione su Lovable Cloud usando i file già presenti nel ramo.

1. Crea ed esegui una migrazione additiva per salvare i metadati della copertina in `public.study_contexts`.

   ```sql
   alter table public.study_contexts
     add column if not exists course_cover jsonb;
   ```

   La colonna è facoltativa e contiene, per esempio, `{"subject":"chimica","confidence":0.75}`. La chiave identifica il PNG in `src/assets/images/course-backgrounds/`. La build genera l'URL dell'immagine. Mantieni le policy RLS e i permessi esistenti della tabella.

2. Distribuisci le versioni di `generate-lessons` e `get-lessons` dal ramo sincronizzato, con il modulo condiviso `supabase/functions/_shared/courseSubject.ts`. Durante la generazione del percorso, `generate-lessons` analizza il testo estratto del contesto e salva `course_cover` insieme ai metadati didattici esistenti. L'azione `listContexts` di `get-lessons` restituisce i metadati solo per il proprietario. Mantieni i controlli di proprietà, gli stati di elaborazione e le regole di generazione esistenti.

3. Verifica con un utente di prova caricando un PDF dal nome generico, per esempio `Appunti.pdf`, con testo sulla tavola periodica, gli atomi e i legami covalenti. A generazione avviata, verifica che la riga abbia `course_cover.subject = 'chimica'` e una confidenza tra 0 e 1. Verifica la stessa foto nelle card di Studio e Home. Controlla anche un vecchio percorso con `course_cover` nullo e un secondo account che non possa leggere i metadati del primo.

Quando il backend è pronto, usa **Update** in Lovable per pubblicare il frontend.
