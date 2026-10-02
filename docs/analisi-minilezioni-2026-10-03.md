# Le mini-lezioni di Erga — analisi completa e onesta

**Data:** 3 ottobre 2026
**Per chi:** Chiara (spiegazione in parole semplici)
**Cosa contiene:** come funzionano oggi le mini-lezioni, cosa va bene, cosa non va, e cinque strade possibili per "rivoluzionarle".
**Cosa NON contiene:** nessun cambio di codice. Questa è un'analisi, si tocca il codice solo dopo che decidiamo insieme la direzione.

---

## 1. In una frase

Una mini-lezione di Erga è **un mazzetto di slide costruite dall'intelligenza artificiale a partire da un tuo PDF**, da leggere una alla volta su uno schermo intero, con in fondo qualche domanda quiz e un assistente AI a cui chiedere "non ho capito".

Non è un corso. È più simile a **un mazzo di flashcard narrate**: una micro-idea per schermata, avanzamento a colpi di "Continua".

---

## 2. Il viaggio completo, passo passo

### 🗂️ Passo 0 — Il "contesto di studio" (study_context)
Quando carichi materiale (PDF, foto, appunti), Erga crea un **contesto**: una cartella che contiene la fonte, il materiale estratto e tutte le lezioni che verranno generate da quella fonte. Tutto il resto vive dentro questa cartella. Se cancelli il contesto, cancelli a cascata lezioni, figure e progressi.

### 🗺️ Passo 1 — Prima si disegna la mappa, poi si costruiscono le case
Quando chiedi di generare, il server (*edge function* `generate-lessons`) **non** scrive subito le lezioni. Prima fa una cosa furba: chiede all'AI **_quante_** lezioni servono e **_cosa_** copre ciascuna — titolo, concetto chiave, e le pagine del PDF da cui pesca (`page_start` / `page_end`).

Il numero di lezioni non è deciso da te: lo decide una **stima automatica** sulla mole del documento. Le regole nel codice sono:

| Documento | Minimo di lezioni | Massimo |
|---|---|---|
| Piccolo (≤ 5 pagine di PDF) | 8 | ~10 |
| Normale | 12 | fino a 40 per documenti enormi |

Per i documenti lunghi entra in scena il "**cartografo**": invece di passare all'AI tutto il testo (troppo lungo per il suo "tetto" di memoria), il server costruisce una **mappa pagina per pagina** e un estratto dell'inizio. Se il cartografo sbaglia, l'ultimo capitolo del libro può restare fuori dalle lezioni.

### 🏭 Passo 2 — La fabbrica lavora a "vagoni" (moduli) da 4 lezioni
Le lezioni non si generano tutte insieme: si generano **a blocchi di 4** (i "moduli", come i vagoni di un treno). Quando ne apri una di un vagone non ancora costruito, si sveglia la fabbrica, costruisce tutte e 4 e ti mostra una **sala d'attesa** con la barra di avanzamento.

Mentre il vagone è in costruzione, **solo la prima lezione del vagone è apribile**: le altre restano "chiuse" anche se l'AI le ha già finite. È una scelta precisa (evitare che tu finisca il vagone prima che sia completo), ma significa che qualche volta aspetti davanti a una porta chiusa mentre il lavoro è già fatto.

⚠️ **Regola d'oro da non dimenticare:** il numero 4 è scritto in due posti (client e server). Se un giorno si cambia da una parte sola, il treno deraglia. C'è già un commento nel codice che lo dice.

### 📖 Passo 3 — Le lezioni si aprono a schermo intero, una slide alla volta
Questa è la parte che usi di più, ed è tutta dentro **un unico file da 894 righe** (`FullscreenLesson.tsx`).

Ogni lezione viene "spezzata" in passi nell'ordine:
1. **Concetto chiave** (una schermata, in grande)
2. **Slide di teoria** (6–8, ognuna 30–50 parole, con box colorati del tipo "💡 Insight" o "⚠️ Attenzione")
3. **Esempio pratico**
4. **Esercizi** (3–4 quiz, subito dopo la teoria)
5. **Sintesi** finale

Si avanza con il pulsante "Continua" in basso, si torna indietro con la freccia in alto, e c'è una barra di avanzamento a segmenti.

### 🖼️ Passo 4 — Le figure del PDF
Quando una slide contiene il segnaposto `[FIG:3]`, il browser (non il server!) scarica il PDF, lo "fotografa" pagina per pagina e chiede a una funzione di ritagliare la figura indicata, poi la mostra dentro la slide. È la parte più pesante e lenta di tutta l'app, ed è tutta a carico del tuo telefono/computer.

### 🎯 Passo 5 — Gli esercizi
Ci sono 4 tipi di esercizio scritti nel codice (scelta multipla, vero/falso, riempi lo spazio, risposta breve), **ma il generatore ne produce solo 2**: scelta multipla e vero/falso. Gli altri due dormono.

Nella scelta multipla l'app **non mescola** mai l'ordine delle opzioni. Nella "Pratica" (l'altra sezione dell'app) esiste invece un piccolo filtro intelligente che mescola le risposte e sistema gli esercizi scritti male: **nel percorso lezioni non viene mai usato**.

### 💬 Passo 6 — L'assistente dentro la lezione
In basso c'è un pannellino "chiedi all'AI". È legato al **passo in cui ti trovi**: ti spiega quello, non l'intera lezione. Lo storico della conversazione **non viene salvato**: se esci, sparisce.

### 🧭 Passo 7 — Dove eri rimasto
Solo una cosa viene salvata: **l'indice dell'ultima lezione aperta** (`lesson_progress`). Niente "lezione completata", niente voto, niente elenco di slide viste. Serve solo alla Home per il pulsante "continua da dove eri".

### 🏁 Passo 8 — Il test finale
Dopo l'ultima lezione si sblocca il test finale: `min(lezioni × 2, 10)` domande, in una volta sola, con un risultato in percentuale (promosso da 70 in su). **Il punteggio non viene salvato da nessuna parte**: lo vedi, lo chiudi, non resta traccia.

---

## 3. La mappa del codice (per orientarsi)

| Pezzo | File | Righe |
|---|---|---|
| La "fabbrica" delle lezioni (server) | `supabase/functions/generate-lessons/index.ts` | 1069 |
| Lettura lezioni + progresso (server) | `supabase/functions/get-lessons/index.ts` | 213 |
| Estrazione figure (server) | `supabase/functions/extract-lesson-figures/index.ts` | 545 |
| Assistente nella lezione (server) | `supabase/functions/lesson-chat/index.ts` | 101 |
| **Il lettore a schermo intero** | `src/components/studio/FullscreenLesson.tsx` | **894** |
| Percorso zig-zag dei moduli | `src/components/studio/ModulePath.tsx` | 627 |
| Elenco lezioni | `src/components/studio/LessonsList.tsx` | 508 (⚠️ mai usato) |
| Sala d'attesa generazione | `src/components/studio/ModuleGenerationScreen.tsx` | 150 |
| Test finale | `src/components/studio/FinalTest.tsx` | 166 |
| Galleria figure | `LessonFigureGallery.tsx` + `PdfCrop.tsx` | 62 + 118 |
| Esercizi (4 tipi) | `src/components/studio/exercises/*.tsx` | ~250 totali |
| Collegamento dati | `src/hooks/useLessons.ts` | 189 |
| Regole dei moduli | `src/lib/lessonModules.ts` | 79 |

Totale: **circa 6.000 righe** dedicate alle mini-lezioni (2.000 sul server, 4.000 nell'app). Per dare la misura: è una delle parti più grandi di tutta l'app, ed è anche **la parte con meno test automatici**.

---

## 4. Cosa funziona bene (da non buttare)

1. **Il principio "una micro-idea per schermata"** è giusto e moderno: la teoria cognitiva dice che spezzare in unità piccole aiuta la memoria. Non è un caso che i reel e le flashcard funzionino.
2. **La generazione a moduli** è un'ottima idea di ingegneria: carichi il primo vagone mentre gli altri si costruiscono, invece di aspettare dieci minuti.
3. **La mappa prima della costruzione** (l'AI progetta i titoli e le pagine, poi scrive) dà un percorso coerente e non una sfilza di paragrafi casuali.
4. **Le lezioni sono cucite sul tuo materiale e su di te**: il prompt riceve la tua scuola, i tuoi livelli per materia e il tuo profilo cognitivo. Questa è roba che poche app fanno.
5. **Il segnaposto `[FIG:n]`** è elegante: l'AI non descrive le figure a parole, indica *quale* figura del tuo PDF usare e l'app la ritaglia davvero.
6. **Il lettore è già "leggero"**: chiede una lezione alla volta, non scarica tutto (la "corsia leggera P16").

---

## 5. I problemi, in ordine di gravità

### 🔴 Gravissimi — l'esperienza di lettura vera e propria

**P1. Il lettore è un binario senza stazioni: ~10 tocchi per lezione, con pause forzate.**
Ogni lezione è: concetto chiave + 6–8 slide di teoria + esempio + 3–4 quiz (uno per schermata) + sintesi = **13–15 schermate**. Ognuna richiede un tocco su "Continua", e tra una e l'altra c'è **una pausa fissa di 250 millisecondi** (l'animazione). Non puoi scorrere di seguito, non puoi vedere "tutto il capitolo", non puoi saltare alla sintesi. Chi studia seriamente ci mette più tempo a toccare lo schermo che a leggere.
→ *Costo di riparazione: medio-basso. È il singolo intervento con più effetto immediato.*

**P2. Nessuna memoria di cosa hai letto.**
L'unica cosa che si salva è "eri alla lezione 4". Se chiudi a metà lezione e riapri, ricominci dalla prima slide. Non c'è "hai già visto questa slide". Niente spunta, niente "completata". Ogni volta è la prima volta.

**P3. Il test finale è un vicolo cieco.**
10 domande, un punteggio, e **niente resta**. Non si salva l'esito, non si rivedono gli errori, non si capisce *cosa* hai sbagliato. È una verifica che non verifica niente.

### 🟠 Seri — la sostanza didattica

**P4. Il quiz è "a misura di scelta", non di testa.**
La scelta multipla **non mescola mai** le opzioni. L'AI tende a mettere la risposta giusta sempre nella stessa posizione e a scrivere l'opzione corretta più lunga delle altre. Risultato: si impara a indovinare per forma, non a ragionare. La cura esiste già nel codice (in Pratica) ma **non è collegata** al percorso lezioni.

**P5. Solo 2 tipi di esercizio su 4 possibili** (scelta multipla e vero/falso). Zero produzione attiva: nessuno ti chiede di scrivere una risposta, che è il tipo di esercizio che fa imparare davvero. Il codice per farlo è già lì, spento.

**P6. Nessun ripasso, nessuna ripetizione diluita.**
Non esiste modo di rivedere le lezioni 2, 5 e 9 il giorno prima dell'interrogazione. Gli esercizi sbagliati non tornano più. Per un'app che vuole far imparare (non solo "spiegare una volta"), è un buco grande: è la differenza tra un video e un allenamento.

**P7. Il tutor dentro la lezione è a fondo scala.**
Risponde solo sul passo corrente, non conosce la lezione intera né il tuo PDF, la conversazione non si salva, e ogni domanda è un "fresco inizio". È un gioiello sprecato: basterebbe poco per farne la parte più utile della lezione ("spiegamelo come se avessi 12 anni", "fammi un esempio della mia città").

**P8. Nessun suono, nessuna voce.**
Una mini-lezione è testo. Per un'app che fa studiare ragazzi e che punta molto sull'accessibilità, l'assenza della **lettura ad alta voce** è una mancanza che pesa (studenti con DSA, momenti in cui non puoi leggere, ripasso passivo).

**P9. La lezione non sa di essere finita — e nemmeno tu.**
Non c'è un "traguardo" celebrato, non c'è un riepilogo delle lezioni studiate, non c'è un legame tra lezioni e date/piano di studio. La Home conosce l'ultimo indice, ma nient'altro sa delle lezioni.

### 🟡 Medi — accessibilità, lingua, coerenza

**P10. La misura del testo si può ingrandire... tranne che dentro la lezione.**
In Impostazioni → Accessibilità esiste il cursore per ingrandire i caratteri, e funziona in tutta l'app (regola globale sull'`html`). Dentro il lettore però le misure sono fissate a mano (`text-[15px]`, `text-[14px]`): **il cursore lì non fa niente**. Proprio nella schermata dove si legge di più.

**P11. Il lettore non parla inglese.**
Il resto dell'app è tradotto, le mini-lezioni hanno **tutte le scritte in italiano dentro il codice** ("Continua", "Concetto chiave", "Esempio pratico", "Vero/Falso", "Perfetto! 🎉"…). Se un domani apri l'inglese, la lezione resta italiana.

**P12. Non si può uscire con ESC, e per i non vedenti è muto.**
Manca `role="dialog"`, manca il tasto ESC, e i messaggi di risposta ("Esatto!") non sono annunciati ai lettori di schermo (`aria-live`). Sulla carta stampata l'app è accessibile, qui no.

**P13. Il "riduci movimento" non è rispettato nei tempi del lettore.**
Le impostazioni globali spengono le animazioni, ma le pause forzate da 250 ms e il timer da 300 ms che invia la risposta al quiz (`MultipleChoice`) **restano**: chi ha disturbi dell'attenzione o ipersensibilità si becca comunque un'interfaccia a scatti.

**P14. Il modo in cui compare la slide è sempre lo stesso, e a volte sbaglia.**
L'app indovina se un blocco è "teoria" o "esempio" guardando se il titolo comincia con 📌 o 🔍. Se l'AI scrive un'emoji diversa, il colore e l'icona cambiano a caso. C'è persino una "durata 5 minuti" dichiarata nel codice ma **mai mostrata da nessuna parte**.

### 🟢 Igiene e manutenzione (non si vede, ma costa)

**P15. Pezzi morti che confondono.** `LessonsList.tsx` (508 righe) e `StudyTutorView.tsx` (306) **non sono più usati da nessuna schermata**: esistono solo per i test. Sono ~800 righe che sembrano vive e non lo sono. `contentRef` nel lettore è dichiarato e mai usato.

**P16. Il lettore è un unico file da 894 righe senza nessun test.**
Tutte le altre parti recenti hanno test (percorso moduli 16, Home, Piano). La parte che usi di più, no. Ogni futuro cambiamento qui è a mano libera.

**P17. Due strade diverse per la stessa cosa.** Le lezioni si leggono tramite le funzioni server (`get-lessons`), ma *si rinominano, rigenerano ed eliminano* scrivendo direttamente nel database dal browser. Due modi diversi di fare la stessa cosa = due punti di rottura diversi.

**P18. Quanto costa? Non si sa.** Esiste un registro delle chiamate all'AI (`ai_usage`), ma non c'è nessuna schermata che dica "le lezioni di questo mese sono costate X". Con 12–40 lezioni per documento, la generazione è l'operazione più costosa dell'app: va tenuta d'occhio.

**P19. Frasi inutili per l'AI.** "Non citare più di 7 parole identiche" e "non usare image_url", e la riparazione manuale del JSON: sono pezze appiccicate nel prompt nel tempo. Funzionano, ma sono fragili.

---

## 6. Le cinque strade per "rivoluzionare"

Non sono alternative secche: A e B sono la **base**, poi si sceglie il vestito.

### 🅐 FONDAMENTA — *obbligatoria* (nessun cambiamento visibile, tutto il resto in piedi)
Collegare l'esercizio intelligente (`exerciseQuality`) anche al percorso lezioni (mescola le risposte), far funzionare il cursore del testo grande dentro il lettore, ESC + dialogo + annunci ai lettori di schermo, tradurre le scritte, ripulire le 800 righe morte, scrivere i test del lettore, registrare "lezione completata" e "esito test finale".
**Effetto:** l'app di oggi diventa solida, corretta e accessibile. **Costo: basso-medio. Zero rischio estetico.**

### 🅑 IL PERCORSO — la lezione diventa un percorso, non un mazzo
1. **Scroll continuo** (o "scorri libero" opzionale) al posto dei 12 tocchi, con la barra di avanzamento vera e la possibilità di **tornare indietro e rileggere** senza resettare. 2. **Riprendi dalla slide esatta** dove eri. 3. **Sintesi sempre a portata** ("cos'è questa lezione in 20 parole"). 4. Fine lezione con **traguardo celebrato** e mappa del vagone completato.
**Effetto:** la differenza tra "un quiz" e "un'app dove ho studiato davvero". **Costo: medio.**

### 🅒 IL MAESTRO — allenamento e non solo spiegazione
Aggiungere **ripetizione diluita**: gli esercizi sbagliati tornano dopo 1 giorno, 3 giorni, 1 settimana; un "ripasso di 5 minuti" che pesca le lezioni vecchie; il **tutor** che conosce l'intera lezione e il PDF (e si ricorda le conversazioni); **leggimi la lezione ad alta voce**; esercizi di scrittura (riempi lo spazio / risposta breve) finalmente accesi.
**Effetto:** l'app smette di spiegare e comincia a **far imparare** — è il salto di categoria. **Costo: medio-alto.**

### 🅓 IL VESTITO — la lezione diventa bella da guardare
Slide con impaginazione più ricca (figure grandi a tutta larghezza, box colorati, timeline), transizioni piacevoli, modalità "notte", schermata di chiusura elegante.
**Effetto:** primo impatto più forte. **Costo: medio. Rischio: è makeup se A, B, C non sono fatti prima.**

### 🅔 LA SQUADRA — l'Apprendimento Invisibile applicato alle lezioni
Collegare le mini-lezioni al **Piano**: "il capitolo 3 lo fai martedì", e la lezione che sa quanti minuti hai (5 o 30) e si adatta. Le lezioni viste finiscono nelle **statistiche** e nel profilo cognitivo con i dati veri ("hai sbagliato 6 domande su 8 di chimica organica").
**Effetto:** le lezioni smettono di essere un'isola e diventano il cuore dell'app. **Costo: alto, ma è la visione.**

---

## 7. La mia raccomandazione

**Se dobbiamo fare una cosa sola che si veda: 🅐 + 🅑 (fondamenta + percorso).**
Sono due settimane di lavoro onesto, non hanno rischio estetico, e trasformano la sensazione di usare le lezioni da "quiz infinito a tocchi" a "percorso dove studio piano".

**Se dobbiamo fare la cosa che vale di più per chi studia: 🅐 + 🅒 (fondamenta + maestro).**
Il ripasso diluito e il tutor che conosce la lezione sono ciò che distingue Erga da un ripasso generato da ChatGPT. È la strada che merita di più, ma va costruita sopra le fondamenta.

**Cosa NON toccherei adesso:** l'estetica fine a sé stessa (🅓) e la riscrittura del motore di generazione. Il motore funziona; il problema non è *come nascono* le lezioni, è *come si vivono*.

---

## 8. La decisione da prendere (3 domande)

1. **Qual è la strada?** 🅐 + 🅑 (percorso) · 🅐 + 🅒 (maestro) · 🅐 + 🅑 + 🅒 (tutto, più lungo) · altro che hai in testa tu
2. **Che rapporto vuoi col vecchio lettore?** Lo trasformiamo pezzo per pezzo (sicuro, lento) oppure facciamo un lettore nuovo e il vecchio resta come "modalità classica" (più veloce, più rischioso)?
3. **Il test finale conta?** Se sì, decidiamo dove salvare l'esito (serve una piccola modifica al database: in quel caso ti preparo il **prompt pronto per Lovable**, come sempre).

---

*Documento di analisi. Nessuna riga di codice modificata. Le prossime mosse si concordano qui.*

---

## 9. Stato dei lavori — aggiornato al 3 ottobre 2026 (commit `d96ab9b`)

### ✅ Fatto: il pacchetto P50 «il lettore diventa tuo» (🅐 parziale + prima parte di 🅑

| Punto dell'analisi | Cosa è stato fatto |
|---|---|
| **P4** (risposte sempre al solito posto) | Nuovo `src/lib/lessonExercises.ts`: le opzioni vengono mescolate in modo **deterministico** (stesso esercizio → stesso ordine) con la risposta corretta rimappata. Attivo **anche** nel test finale. Mescolare non rompe niente: l'esercizio sbagliato o malformato torna intatto. |
| **P2** (nessuna memoria) | Nuovo `src/lib/lessonResume.ts`: la lezione **riprende dalla slide esatta** dove l'eri lasciata, con l'avviso «Ripresa dalla slide N · Ricomincia». Memoria sul dispositivo, scade dopo 30 giorni, nessuna modifica al database. |
| **P12** (niente ESC, muto ai lettori di schermo) | Il lettore è ora una finestra dichiarata (`role="dialog"`, `aria-modal`, nome della lezione), il fuoco entra dentro, **ESC chiude** — e se è aperto il pannello del tutor chiude *quello*, non la lezione. I feedback degli esercizi sono annunciati (`role="status"` + `aria-live`) e chi sbaglia sente anche **qual era** la risposta corretta. |
| **P13** (riduci-movimento ignorato) | Con «Riduci movimento» attivo sono saltate sia la pausa di 250 ms tra le slide sia i 300 ms dei quiz: il risultato arriva subito. |
| **P10** (testo non scalabile) | Le misure fisse in pixel del lettore (`15px`, `14px`) sono diventate `rem`: **il cursore dell'accessibilità ora funziona anche dentro la lezione**. |
| **P1** (parziale) | Ogni nuova slide parte **dall'alto** (lo `contentRef` dichiarato e mai usato ora serve davvero: prima si ereditava lo scroll della slide precedente). In più: feedback positivo mancante aggiunto a «Riempi lo spazio», il timer dell'animazione non sopravvive più alla chiusura, via il campo morto `duration`. |
| **P16** (nessun test) | **27 test nuovi** (il lettore ne aveva zero): avanzamento, avviso di ripartenza, memoria della slide, ESC (anche col tutor aperto), semantica di finestra, mescolamento e annunci vocali. |

**Misurato dopo il lavoro:** `tsc` 0 errori · `vite build` ok · detector `[]` sui file toccati · test **440 passati / 19 falliti** (i 19 sono **preesistenti**, vedi nota) · **0 nuovi fallimenti** introdotti.

> ⚠️ **Nota di salute (non è colpa di P50).** Sul ramo corrente gli ultimi aggiornamenti di Lovable (PR #83 e #84, Home «squadrata» e intestazione con pulsante abbonamento) hanno **rotto 14 test** che prima passavano: `AppHeader.test.tsx` (12), `HomeView.test.tsx` (1), `haptics.test.tsx` (1). Verificato su una copia pulita del ramo: il conteggio dei fallimenti è identico (19) con e senza P50. I 5 di `homeCleanSurfaces` restano quelli che avevi già deciso di lasciare stare.

### ⏳ Ancora da fare (in ordine di valore)

1. **🅑 Il percorso, seconda parte** — scroll continuo o meno tocchi, sintesi sempre a portata, traguardo di fine modulo, lezione che si ricorda di essere finita.
2. **P11 — lingua** — il lettore e gli esercizi hanno le scritte in italiano dentro il codice: serve una sezione di traduzioni dedicata (`lesson.*` in `it.json`/`en.json`).
3. **P3 + P9 — il test finale che conta** — salvare esito e data (richiede una piccola modifica al database → prompt pronto per Lovable), e dire alla Home cosa è stato studiato.
4. **P6/P7 — il maestro** (🅒) — ripasso diluito degli errori, tutor che conosce tutta la lezione, lettura ad alta voce, esercizi di scrittura accesi.
5. **P15 — pulizia** — `LessonsList.tsx` (508 righe) e `StudyTutorView.tsx` (306) non sono usati da nessuna schermata: vanno rimossi con i loro test.
6. **P18 — costi** — una schermata che dica quanto costano le generazioni (il registro `ai_usage` esiste già).
