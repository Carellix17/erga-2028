# Redesign completo della landing Erga

## Obiettivo
Rendere la landing più breve, dinamica e riconoscibile, facendo capire subito che Erga trasforma il materiale reale dello studente in studio, pratica e pianificazione personalizzati. L’H1 “Ogni mente ha la sua geometria” resta invariato.

## Direzione visiva
- Editoriale, energica e autorevole, coerente con avorio, inchiostro, rosso e rosa Erga.
- Varianza 7, movimento 6, densità 3.
- Un unico racconto visivo continuo: materiale reale → percorso → settimana.
- Le schermate del prodotto restano la grafica principale; Canva non contiene asset Erga adatti e i riferimenti 21st.dev saranno adattati, non copiati.

## Interventi
1. **Primo schermo più netto**
   - Mantenere marchio, H1 e doppia azione principale/secondaria.
   - Accorciare e rendere più concreto il testo per “app per studiare”, verifiche e interrogazioni.
   - Spostare la scelta della materia fuori dal primo schermo, così non compete con la registrazione.
   - Rendere l’anteprima del telefono più viva con una trasformazione visiva tra PDF, foto e piano.

2. **Un solo racconto interattivo del prodotto**
   - Fondere la sequenza “MaterialJourney” e l’anteprima a schede in un’esperienza unica.
   - Usare tre momenti chiari: materiale, percorso, piano.
   - Mantenere esempi esplicitamente dichiarati come dimostrativi.
   - Eliminare card e micro-etichette ripetitive, numerazioni decorative e anteprime duplicate.

3. **Esagono come momento distintivo**
   - Conservare l’interazione esistente, semplificandone la presentazione e il carico visivo.
   - Rendere evidente il rapporto tra profilo cognitivo, lezione e piano.
   - Caricamento differito e alternativa stabile con movimento ridotto.

4. **Conversione e contenuti**
   - Unificare le azioni: “Inizia gratis” in navigazione e “Crea il profilo gratuito” nella pagina.
   - Sostituire sezioni ripetitive con tre casi d’uso più compatti e una sola presentazione trasparente della beta.
   - Rendere FAQ e titoli più descrittivi per le ricerche italiane, senza inventare risultati, testimonianze o prezzi.
   - Correggere navigazione interna e coerenza degli ancoraggi.

5. **SEO, accessibilità e prestazioni**
   - Allineare metadati e dominio canonico al dominio pubblico.
   - Aggiungere i dati strutturati dell’app oltre alle FAQ.
   - Rendere il focus sempre visibile, mantenere controlli da almeno 44 px e verificare la tastiera.
   - Rimuovere l’ascolto continuo dello scroll in React e usare primitive più leggere.
   - Ridurre animazioni ripetitive e peso iniziale, rispettando il movimento ridotto.

## Verifica
- Test della landing e controllo dei tipi.
- Controllo visivo a 375, 768, 1024 e 1440 px.
- Verifica di menu, scelta materia, anteprime, Esagono, FAQ e registrazione.
- Controllo overflow, focus da tastiera, errori console e detector visivo.
- Conferma finale della compilazione del progetto.
