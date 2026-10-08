# Analisi della creazione delle lezioni — 7 ottobre 2026

> Analisi SOLA LETTURA: nessun codice è stato toccato. Lista dei problemi in ordine di gravità, da approvare prima di qualsiasi intervento.
> Ho letto tutta la catena: upload (PDF, foto, ricerca web) → estrazione testo → generazione titoli → generazione lezioni → figure → lettore.

## Stato dei fix (aggiornato dopo l'approvazione)

**Batch 1 — FATTO (7 ottobre 2026, sintomi a e b + blocchi permanenti):**
- ✅ **P1** — `normalizeLessonPayload` (nuovo `_shared/lessonPayload.ts`): una lezione senza contenuto vero non viene mai salvata come "generata"; update verificato + ricontrollo sul DB dopo il salvataggio.
- ✅ **P2** — modulo caldo e fabbrica moduli: 2 tentativi per lezione e si CONTINUA con le altre (prima: `break` al primo errore → 1 lezione su 4).
- ✅ **P3a/P3d** — `extractJsonRobust`: estrazione bilanciata (root-aware: array ≠ oggetti), riparazione degli escape LaTeX (`\sqrt` non rompe più il parse; `\frac`, `\beta`, `\times` non arrivano più mutilati), recupero array troncati, chiusura parentesi a stack LIFO. 20 unit test.
- ✅ **P3b** — `finish_reason` controllato: Gemini fa un secondo giro con più token; DeepSeek troncato → paracadute Gemini.
- ✅ **P3c** — verificati live i 465 modelli OpenRouter: `deepseek-v4-flash:free` NON esiste → gradino morto rimosso (ogni lezione scientifica partiva con un 404).
- ✅ **P4** — spazzino: stati "generating" e lucchetti modulo più vecchi di 10 minuti = lavori morti → si riparte invece di bloccare il percorso per sempre.
- ✅ **P16** — variabile morta rimossa (già nel codice riscritto).

**Revisione completa del batch 1 (richiesta dal proprietario, stesso giorno):**- 🐛 **Trovato e corretto un difetto nel fix stesso**: la rimozione del gradino `:free` (P3c) era andata persa (due modifiche parallele allo stesso file si erano sovrascritte) — il commento diceva "rimosso" ma la catena lo conteneva ancora. Corretto e verificato con grep + test.
- 🔧 **Riparatore rafforzato**: due protocolli separati (root array ≠ root oggetto) — la prosa con graffe prima del JSON non condanna più l'estrazione (`{a+b}… ecco: {…}`), e l'array troncato non restituisce più il primo item come root. +2 test (suite 690).
- 🔧 **ai.ts**: il secondo giro con più token non parte se il budget è già al tetto (risparmio di una chiamata inutile).
- ✅ **Smoke test avversariale** (6 casi con payload da modello vero): lezione LaTeX pesante → formule intatte (\sqrt, \frac, \Delta); titoli con prosa; lezione troncata a metà esercizio → recuperata; lezione vuota → respinta; widget nel contenuto → parsato; graffe in prosa → ignorate.
- 📋 **Limiti noti e accettati**: lo spazzino P4 usa 10 minuti (allineato all'attesa massima del client); un lavoro LEGITTIMO più lungo di 10 minuti verrebbe considerato morto (il tetto del runtime ~150s lo rende praticamente impossibile); la pulizia dei recinti ``` è globale (comportamento preesistente, non peggiorato).

**Batch 2 — FATTO (7 ottobre 2026, sintomo c: lezioni-mostre e pagine intere come immagini):**
- ✅ **P5** — tetto massimo ai ritagli in `extract-lesson-figures`: un riquadro che copre più del **60% dell'area della pagina** viene rifiutato (prima c'era solo il tetto minimo del 5%: una pagina intera passava e diventava un'immagine). Le mezze pagina e i diagrammi grandi passano; le foto caricate dallo studente non passano da quel controllo e restano intere per definizione.
- ✅ **P5-bis** — la promessa delle figure al generatore allineata a ciò che la caccia estrae DAVVERO (tolte «formule» e «riquadri grafici» dall'elenco promesso: la caccia non li estrae).
- ✅ **P6** — tetti scritti nel prompt scientifico («MASSIMO 4 formule in mostra», nel messaggio di sistema e nella sezione formule) **+ verifica a posteriori**: nuovo `scienceShapeIssues` (puro, in `subjects.ts`) conta formule in mostra e parole; se la lezione sfora (>6 formule $$ o >800 parole) viene **rifatta una volta** col promemoria severo; se sfora ancora si accetta e resta nei log. 6 test nuovi.
- ✅ **Bug trovato nella revisione di oggi e corretto**: lo spazzino P4, nel percorso `generateModule`, non azzerava lo stato "generating" stantio → la fabbrica dei moduli, dentro il ciclo, lo scambiava per una rigenerazione in corso e **si fermava dopo la prima lezione** (l'utente col percorso bloccato si ritrovava 1 lezione: il sintomo a di nuovo). Ora lo stato viene azzerato prima di alzare la saracinesca.
- 🧹 Pulizia preesistente: 14 escape inutili (backslash-virgoletta in template literal) in `subjects.ts`, mai lintati prima perché il file non era mai stato toccato.

**Da fare (prossimi batch, su approvazione):** P7-P14 (elaborazione morta, allegati senza pagine, click ignorato in silenzio, sovrapposizione modulo caldo, retry su POST non idempotenti, PDF scansionati troncati, caccia figure troppo carica), P15, P17-P19.

---

## Come funziona la catena, in due parole

1. **Carichi il materiale** → si crea un "percorso" (study_contexts) con stato `pending`.
2. **Estrazione**: un lavoro in background (extract-pdf) tira fuori il testo: i PDF col testo vero (marcatori `=== PAGINA N ===`), i PDF scansionati con l'AI che "legge" le immagini, le foto con l'AI che trascrive, la ricerca web da Wikipedia.
3. **Generazione percorso** (generate-lessons): l'AI legge il testo e decide i titoli delle lezioni (con pagine di riferimento e moduli da 4). Poi, in un unico lavoro in background, genera subito le **prime 4 lezioni** ("primo modulo caldo").
4. **Lettura**: apri una lezione; se non è ancora generata, viene generata al volo. Le figure `[FIG:n]` diventano ritagli veri dal PDF: il telefono disegna le pagine, un'AI-vista trova i riquadri, il telefono li ritaglia e li salva.

---

## I tuoi tre sintomi, spiegati

| Sintomo | Cosa succede davvero |
|---|---|
| **(a) Solo la prima lezione, e vuota** | Due difietti insieme: **P1** (la lezione viene marcata "generata" anche se l'AI ha risposto con un JSON senza contenuto → lezione vuota per sempre) e **P2** (il ciclo che genera le prime 4 si spegne in silenzio alla prima lezione fallita → le altre 3 restano indietro, ma il percorso viene dichiarato "completo" lo stesso). |
| **(b) "Errore nell'estrarre file JSON"** | È il messaggio reale «Impossibile estrarre JSON dalla risposta AI»: la risposta dell'AI arriva rotta e il "riparatore" di JSON non riesce a salvarla (**P3**). Cause più probabili: le formule LaTeX dentro il JSON (escape sbagliato), la risposta tagliata dal limite di token (mai controllato), e il cervello DeepSeek per le materie scientifiche (**P3c**). |
| **(c) Lezioni enormi, decine di formule, pagine intere come immagini** | **P5**: un ritaglio può coprire l'intera pagina (c'è il controllo "minimo 5%" ma manca il controllo "massimo"); **P6**: il prompt scientifico chiede formule dappertutto senza tetto e nessuno verifica il numero di parole/slide dopo la generazione; più le vecchie lezioni v1, nate senza regole di slide, che restano enormi (e non le tocchiamo). |

---

## I problemi, in ordine di gravità

### 🔴 Gravità 1 — Bloccanti (sono quelli che vedi tu)

**P1 — La lezione vuota viene spacciata per generata.**
`generate-lessons/index.ts`, funzione che genera una lezione: l'aggiornamento sul database scrive `is_generated: true` **senza controllare che ci sia davvero qualcosa dentro** (spiegazione, parti, esercizi). Se l'AI risponde con un JSON valido ma con i campi mancanti, vuoti o con nomi sbagliati (es. in italiano, o "riparato" da P3), la lezione viene salvata **vuota e marcata pronta**: il cliente non la rigenera più perché crede sia fatta. In più l'esito dell'aggiornamento non viene nemmeno controllato (se fallisce in silenzio, stessa cosa). → sintomo (a).

**P2 — Il "primo modulo caldo" si spegne in silenzio.**
Il ciclo che genera le prime 4 lezioni si interrompe alla **prima lezione fallita**: niente secondo tentativo, niente avviso. Poi lo stato del percorso viene comunque messo "completed" e parte la notifica "percorso pronto". Risultato: 1 lezione su 4 (per giunta vuota, vedi P1) e un percorso dichiarato completo. → sintomo (a), "invece delle prime quattro".

**P3 — «Impossibile estrarre JSON» = risposta AI rotta, e nessuno se ne accorge.**
Il "riparatore" di JSON fa quello che può: quando riesce a chiudere le parentesi può produrre un oggetto **valido ma senza contenuto** (→ lezione vuota, P1); quando non riesce, lancia l'errore che vedi tu. → sintomo (b). Le cause concrete della risposta rotta, in ordine di probabilità:
- **a) Formule LaTeX dentro il JSON**: dentro una stringa JSON i backslash delle formule (`\frac{...}`) andrebbero raddoppiati; i modelli li sbagliano spesso, e `\f`, `\s`, `\p` sono escape **invalidi** → parse fallito. Colpisce proprio le materie scientifiche.
- **b) Risposta tagliata**: limite di 7000 token a lezione e **il "finish_reason" non è mai controllato in tutto il codice** (verificato): un output troncato a metà finisce dritto nel riparatore.
- **c) DeepSeek per le scientifiche**: la catena prova prima `deepseek-v4-flash:free` — che **non risulta esistere** su OpenRouter (da confermare sui log ai_usage, ma i modelli :free accertati sono altri) → ogni lezione scientifica parte con un errore 404 prima di passare al gradino a pagamento. E se il modello "ragiona" prima di rispondere, il budget di token se lo mangia il ragionamento e la risposta arriva tagliata.
- **d) Estrazione ingorda**: la ricerca del JSON va dalla prima `{` all'ultima `}` del testo: qualsiasi testo con graffe prima o dopo lo rompe.

**P4 — Un lavoro in background che muore blocca il percorso PER SEMPRE.**
La generazione dei titoli + 4 lezioni, e la fabbrica dei moduli, girano in un lavoro in background con un **tetto di tempo del runtime** (default ~150 secondi, nessuna estensione configurata nel repo). Un modulo con 4 chiamate AI lunghe può superarlo: il lavoro viene ammazzato **senza pulizia** → lo stato resta "generating" per sempre (il percorso risponde "Generazione già in corso" a ogni tentativo, in eterno) oppure resta scritto "un modulo è in generazione" (errore 409 eterno). Il campo `startedAt` viene salvato ma **non è mai usato** come scadenza: manca uno "spazzino" che recuperi i lavori morti.

### 🟠 Gravità 2 — Alti (rovinano la qualità)

**P5 — Una "figura" può essere mezza pagina o tutta la pagina.**
Il controllo qualità dei ritagli ha il tetto **minimo** (niente sotto il 5% della pagina) ma **nessun tetto massimo**: se l'AI-vista restituisce un riquadro che copre il 90-100% della pagina, passa e lo studente si ritrova **pagine intere come immagini**. → sintomo (c). In più: il prompt della lezione promette all'AI "estraggo formule, tabelle, schemi", ma la lista di ciò che l'AI-vista può accettare **esclude le formule e i box di testo** → promessa non mantenuta, token senza figura (spariscono in silenzio) o figure non pertinenti.

**P6 — Le lezioni scientifiche sono enormi per costruzione.**
Il prompt scientifico dice "formule in primo piano, OGNI concetto quantitativo con la sua formula + l'anatomia dei simboli" **senza un tetto al numero di formule**; e le regole "6-8 slide da 30-60 parole" **non vengono verificate da nessuno dopo la generazione**. Se il modello esagera (i modelli economici esagerano), la lezione diventa un mostro di decine di formule e testo. → sintomo (c). Nota: anche le vecchie lezioni v1, nate senza regole di slide, restano enormi — e quelle non le tocchiamo, come deciso.

**P7 — Il materiale può restare "in elaborazione" per sempre.**
Dopo l'upload, l'estrazione viene lanciata "fuori mano" (fire-and-forget): se quella chiamata interna muore per un blip di rete, **nessuno riprova e nessuno pulisce** → "Il PDF è ancora in elaborazione" in eterno, e la nuova pipeline unica aspetta per niente.

**P8 — Un PDF allegato a un percorso esistente è un cittadino di serie B.**
La funzione che estrae il testo dai PDF è **duplicata**: quella in upload-pdf (usata per gli allegati) **non mette i marcatori di pagina** `=== PAGINA N ===` (quella vera li mette). Allegando un PDF a un percorso esistente: niente mappatura pagine, niente range, e di conseguenza **zero figure possibili** per quel materiale.

### 🟡 Gravità 3 — Medi

**P9 — Il lettore avanza su una lezione anche se la generazione è fallita.** Dal pulsante "Continua" la lezione successiva viene aperta comunque → si ritrova davanti la lezione vuota → rafforza la percezione "non è davvero una lezione".

**P10 — Click ignorato in silenzio.** Se c'è già una generazione in volo, la richiesta viene ignorata con solo un avviso in console: l'utente preme e non succede nulla, senza spiegazioni.

**P11 — Sovrapposizione non protetta durante il "primo modulo caldo".** Il lucchetto anti-accavallamento copre solo la fabbrica dei moduli: durante il riscaldamento delle prime 4, una generazione singola può partire in parallelo (doppio lavoro, doppio conteggio nel contatore d'uso).

**P12 — Ritentativi su azioni non ripetibili.** Il client ritenta i POST anche quando la richiesta è forse già arrivata al server (è la risposta ad andarsi persa): rischio di lezioni generate due volte e contatore doppiato.

**P13 — PDF scansionati troncati.** Il ripiego "l'AI legge le pagine" trascrive con un tetto di 20.000 token: un libro scansionato lungo viene troncato o rifiutato; il limite di dimensione del PDF inline (~20 MB) non è gestito.

**P14 — Caccia figure troppo carica.** Vengono caricati e salvati TUTTI i riquadli trovati (fino a 6 pagine × 3 figure) anche quando l'AI ne aveva promessi 3: costi extra e rischio di disallineamento tra il token `[FIG:n]` e la figura mostrata davvero.

### ⚪ Gravità 4 — Minori / pulizia

**P15 —** Nel flusso "allega file", su un percorso d'errore si legge una variabile non ancora dichiarata → errore mascherato dal generico "Errore durante il caricamento".
**P16 —** Variabile calcolata e mai usata (codice morto) nella generazione lezioni.
**P17 —** Controllo "massimo 20 immagini" mai attivo (il ciclo è già limitato a 20).
**P18 —** Il lettore, se la spiegazione non è il JSON atteso, può mostrare testo grezzo (JSON visibile allo studente).
**P19 —** Le foto HEIC di iPhone spesso non comprimibili dal browser → rifiutate a 8 MB con il messaggio "riprova a selezionarla" (che rifà lo stesso identico caricamento).

---

## Cosa invece funziona (per onestà)

- Il **paracadute Gemini** per le scientifiche esiste: se DeepSeek non risponde, la lezione nasce comunque.
- I **lucchetti 409** anti-sovrapposizione (fabbrica moduli / rigenera percorso) ci sono e funzionano — il problema è solo il lavoro morto che li blocca per sempre (P4).
- Il **rilevatore di materia** non blocca mai la generazione; l'**azzeramento dei range fantasma** sui testi senza pagine c'è; il **reset dei progressi** alla rigenerazione c'è.
- La catena AI a 4 provider con caduta automatica c'è; manca solo il controllo del troncamento (P3b).

---

## Prossimo passo (tuo)

Dimmi:
1. **La lista va bene?** C'è qualcosa da aggiungere o qualcosa secondo te non è un problema?
2. **Per quali problemi vuoi il fix, e con che priorità?** Il mio consiglio, se sei d'accordo: prima P1+P2+P3 (i tre sintomi tuoi), poi P4 (blocchi permanenti), poi P5+P6 (qualità delle lezioni), poi il resto.
3. Per P3c (DeepSeek) posso prima **guardare i log ai_usage** per confermare quale gradino della catena fallisce davvero, così il fix è mirato e non a spanne.
