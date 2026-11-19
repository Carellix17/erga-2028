# Prompt da copiare in Lovable

````text
Nel progetto Erga su Lovable Cloud completa il rilascio della rimozione della verifica dell'età usando la revisione di main che contiene questo documento. Il frontend e il codice delle funzioni sono già modificati nel repository.

Controlla prima che la revisione sia sincronizzata. Pubblica le versioni aggiornate di queste Edge Function: chat, cognitive-profile, extract-lesson-figures, extract-pdf, generate-exercises, generate-lessons-demo, generate-lessons, generate-plan, interrogazione, lesson-chat, scientific-gym, study-tutor, text-to-speech e web-search.

Nell'anteprima, verifica su un account senza esiti di verifica che l'app si apra, che il questionario salvi il profilo e che almeno chat e generazione lezioni funzionino. Verifica anche che la sessione resti obbligatoria per le funzioni riservate, che i dati di studio restino accessibili soltanto al proprietario e che la demo anonima mantenga il limite di utilizzo.

Coordina con me l'uso di Update per pubblicare il frontend. Quando la versione pubblicata non chiama più age-gate, rimuovi la Edge Function age-gate dall'ambiente Cloud, se presente. Controlla che l'endpoint non accetti più chiamate e che nessuna funzione pubblicata dipenda dalla tabella degli esiti o dalla colonna eta.

Crea e applica da Lovable una nuova migrazione SQL con queste istruzioni. Mantieni intatte le migrazioni precedenti. È autorizzata la cancellazione definitiva degli esiti e delle età nel profilo cognitivo.

BEGIN;
DROP TABLE IF EXISTS public.user_age_checks;
ALTER TABLE public.cognitive_profiles DROP COLUMN IF EXISTS eta;
COMMIT;

Usa la cancellazione senza CASCADE. Se ci sono dipendenze impreviste, fermati e indicami quali sono. Mantieni i record del profilo cognitivo, i punteggi, gli account, i materiali, i progressi e la colonna storica user_profiles.age.

Dopo la migrazione conferma che la tabella user_age_checks e la colonna cognitive_profiles.eta non esistono più, che age-gate non è più distribuita e che la lettura e il salvataggio dei profili funzionano per un account nuovo e uno esistente. Riporta le funzioni effettivamente pubblicate e l'identificativo della migrazione senza includere dati personali.
```
