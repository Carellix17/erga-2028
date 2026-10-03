# La Matrice delle Materie — Erga insegna materia per materia

**Data:** 3 ottobre 2026
**Per chi:** Chiara (spiegazione in parole semplici)
**Cosa contiene:** le decisioni definitive su come nascono i NUOVI percorsi di studio per famiglia di materia: struttura, viste, lezioni, esercizi, cervelli AI. È la fonte di verità per tutti i lavori futuri sul motore dei percorsi.
**Cosa NON contiene:** nessun codice. Le implementazioni arrivano a pacchetti, ognuno testato e spinto separatamente. I percorsi già creati NON vengono toccati.

---

## 1. In una frase

Un libro di matematica non si spiega come uno di storia: da oggi ogni famiglia di materia ha il suo **cervello AI**, la sua **mappa**, il suo **formato di lezione** e i suoi **esercizi** — e il percorso viene progettato intorno al profilo cognitivo dello studente fin dall'inizio.

---

## 2. Perché (il problema del vestito unico)

Oggi tutte le lezioni nascono dallo stesso stampo (6–8 slide da 30–50 parole, stesso tono, stesse regole per Dante e per la derivata). Le criticità rilevate nell'analisi del 3 ottobre (`docs/analisi-minilezioni-2026-10-03.md`) restano valide: il piano è cieco rispetto allo studente, i quiz non vengono verificati, il costo non si misura. Questa matrice le risolve e ci mette sopra la differenziazione per materia.

---

## 3. Le regole fisse (valgono per tutte le materie)

1. **Compatibilità v1/v2** — i percorsi esistenti restano "v1" e funzionano come ora. Solo i nuovi nascono "v2". Il lettore sa mostrare entrambi.
2. **Il profilo progetta** — l'Esagono cognitivo e i livelli guidano già la STRUTTURA (numero di lezioni, lunghezza, ritmo, mix esercizi), non solo la scrittura.
3. **I widget li costruiamo noi** — le simulazioni interattive sono componenti scritti a mano da noi (nessun costo API): l'AI si limita a sceglierli e configurarli con un piccolo JSON dentro la lezione.
4. **Le formule impaginate** — le materie scientifiche usano la composizione matematica vera (KaTeX), non testo piatto.
5. **Registro dei costi** — ogni chiamata AI annota token, modello ed esito: sapremo quanto costa ogni percorso (base per il futuro Pro).
6. **Sicurezza** — la chiave OpenRouter vive SOLO nei segreti di Lovable Cloud, mai nel repository.
7. **Disegno tecnico è escluso** per ora (troppo costoso/complesso oggi; il futuro "tutor con ricerche e video" resta nel cassetto).

---

## 4. La Matrice

| Famiglia | Materie | Cervello | Il percorso (vista) | La lezione | Esercizi & extra |
|---|---|---|---|---|---|
| 🔬 **Scientifiche** | Matematica, Fisica, Chimica | DeepSeek V4 Flash (OpenRouter) | Grafo a moduli tematici | Formule in primo piano, esempi svolti passo-passo, simulazioni interattive | Esercizi a fine modulo + sezione dedicata con generatore interattivo e chat socratica |
| 📖 **Letteratura** | Italiano, Letteratura | Gemini | Grafo: corrente al centro → autori → modulo dell'autore | Vita, pensiero, stile, opere spiegate; card più lunghe ma ariose; immagini OCR dal PDF | Analisi testi e domande sul pensiero; tutto varia col profilo |
| ⏳ **Storiche** | Storia, Geografia | Gemini | Timeline-mappa: ogni punto = un modulo; zoom senza cambiare pagina; collegamenti visibili anche tra moduli diversi | Conversazionale, raccontata; date ancorate alla timeline (si ricordano posizionandole) | Ricostruzione causa-effetto; date in ripasso |
| 🤔 **Filosofia** | Filosofia | Gemini | Grafo: autore/tema al centro → opere e concetti | Conversazionale ma centrata sul ragionamento: tesi → obiezione → replica, molti esempi | Domande aperte, confronti tra autori |
| 🗣 **Lingue vive** | Inglese, Spagnolo, Francese, Tedesco… | Gemini | Grafo semplice | Tre tipi di lezione: **concetto** (grammatica), **pratica** (esercizi), **conversazione** (voce, correzione frase per frase, stile SuperFluent) | Meno streak, più realtà; correzione prima dell'invio |
| 📜 **Latino** | Latino | Gemini | Grafo semplice | Come le lingue MA senza conversazione parlata: grammatica, traduzione guidata, lessico | Traduzione con chat socratica |
| 💼 **Sociali** | Economia, Psicologia | Gemini | Moduli tematici | Casi di studio veri + esperimenti celebri narrati + "metodo vs mito" | Widget (offerta/domanda), casi da analizzare, discussioni |
| 💻 **Informatica** | Informatica | Gemini | Moduli per concetto | Metodo PRIMM: codice eseguibile vero, "indovina cosa fa", "modificalo" | Rimetti in ordine le righe, scrivi il tuo |
| 🎨 **Storia dell'arte** | Storia dell'arte | Gemini | Grafo-mappa: periodo al centro → luoghi → opere | Sempre con l'opera davanti agli occhi (OCR dal PDF + immagini enciclopediche); tablet-first, telefono a card sovrapposte | Riconoscimento opere, confronto, contesto |
| 📐 **Disegno tecnico** | — | — | — | ❌ Escluso per ora | — |

**Nota:** la Geografia è collocata con la Storia (mappa + luoghi) — confermato il 3 ottobre.

---

## 5. La biblioteca dei widget (costruita a mano)

L'AI NON genera codice: sceglie un widget dalla biblioteca e lo configura (es. `{"widget":"parabola","a":1,"b":-2,"c":0}`). Stesso effetto di ChatGPT, ma sicuro, veloce e uguale su tutti i telefoni.

Prima squadra (cresce nel tempo):
1. **Parabola / equazione di secondo grado** — cursori su a, b, c
2. **Retta e funzione lineare** — pendenza e intercetta
3. **Moto del proiettile** — velocità, angolo, gravità
4. **Forze su piano inclinato** — angolo, massa, attrito
5. **Equilibrio chimico / pH** — concentrazioni
6. **Leggi dei gas** — pressione, volume, temperatura
7. **Offerta e domanda** (economia) — spostamento delle curve
8. **Esecutore di codice** (informatica) — JavaScript in bolla isolata

---

## 6. I cervelli (routing dei modelli, con paracadute)

| Chiamata | Primo cervello | Se cade | Ultima spiaggia |
|---|---|---|---|
| Matematica, Fisica, Chimica (lezioni, esercizi, simulazioni-config) | `deepseek/deepseek-v4-flash:free` (OpenRouter) | `deepseek/deepseek-v4-flash` a pagamento (centesimi a percorso) | catena Gemini esistente |
| Tutto il resto (progettazione, umanistiche, lingue, sociali, arte, test) | Gemini 2.5 Flash | gpt-4o-mini → Llama 3.3 70B → gateway Lovable | — |

- **Verifica all'attivazione:** il suffisso `:free` di DeepSeek V4 Flash va confermato con una chiamata di prova quando si aggiunge la chiave su Lovable; il modello stesso è verificato (uscito aprile 2026, GA luglio 2026, contesto 1M).
- **Limiti del gratuito:** i modelli `:free` su OpenRouter hanno tetti giornalieri di richieste; la catena di paracadute li rende innocui.
- **Chiave:** da aggiungere come segreto in Lovable Cloud al momento dell'implementazione (mai nel repo).

---

## 7. Il contesto visivo (Bisturi Editoriale — scelte confermate)

Il nuovo design system dell'app è deciso e la Minilezione ne è la prima applicazione concreta:

- **Posizionamento:** il Bisturi Editoriale — motore cognitivo d'élite che seziona il materiale e stampa un'edizione critica. Niente zerbino-AI, niente gamification infantile, tono secco con ironia intellettuale.
- **Colori:** ossidiana profonda `#0D0D0E`; Rosso Lacca `#C83228` con rigore millimetrico (logo, azione primaria, punto "sei qui", tagli critici); colori materia solo come filetti 1–2px e micro-badge mono (regola 90/10).
- **Tipografia:** Playfair Display (titoli) / Inter (lettura) / Roboto Mono (telemetria: `MOD_02 // 18 MIN // 62% INCISO`).
- **Iconografia:** incisioni e litografie da Wikipedia Commons, bianco/nero ad alto contrasto a riposo, colore all'attivazione. Solo per Corso e Moduli, mai sulle singole lezioni.
- **Studio:** due blocchi (Cantieri Aperti + Banco degli Strumenti); selettore corsi a dorsi d'archivio (fisarmonica desktop, swipe mobile); Grafo del corso verticale con toggle Topologia/Elenco.
- **Pratica non esiste più (3 ottobre):** chat, esercizi, interrogazione e palestra scientifica sono strumenti del Banco di Studio, apribili dalle card di accesso (pillole della Home incluse).
- **Punti ancora aperti:** Tavolo (Home), Minilezione (in definizione, priorità), Piano, Pratica, modalità chiara "Carta da Incisione", formattazione titoli sui dorsi.

---

## 8. Fonti della ricerca (3 ottobre 2026)

- **SuperFluent** (stile per le lingue): recensione esperta — https://www.thinkinitalian.com/app-review/superfluent · analisi 2025 — https://smartlearnai.org/listing/superfluent-review-2025/ · esperienze utenti — https://www.reddit.com/r/languagelearning/comments/1oa23la/
- **DeepSeek V4 Flash su OpenRouter:** https://openrouter.ai/deepseek/deepseek-v4-flash · https://openrouter.ai/deepseek/deepseek-v4-flash-0731 · modelli free verificati — https://apidog.com/blog/free-ai-models/
- **Economia (casi di studio e simulazioni):** https://teachers.institute/pedagogy-of-social-science/innovative-teaching-strategies-economics/
- **Psicologia (esperimenti, casi, etica):** https://newsela.com/blog/read/high-school-psych · https://www.edutopia.org/article/benefits-high-school-psychology-class/
- **Informatica (PRIMM):** https://www.raspberrypi.org/app/uploads/2021/11/Teaching-programming-in-schools-pedagogy-review-Raspberry-Pi-Foundation.pdf

---

## 9. La roadmap (due fiumi che si incontrano)

**Fiume 1 — Il motore (backend):**
**Pacchetto 1 ✅ costruito il 3 ottobre (fondamenta dati: passaporto v1/v2 + materia nel DB, registro costi con token e durata, fix bug spunte alla rigenerazione, notifiche oneste)** → **Pacchetto 2a ✅ costruito il 3 ottobre (rilevatore di materia con euristica gratis + verifica AI; instradamento DeepSeek V4 Flash via OpenRouter per matematica/fisica/chimica con paracadute Gemini; regole di scrittura scientifiche: formule LaTeX in mostra con anatomia dei simboli, esempio svolto passo-passo, esercizi numerici con spiegazione; formule impaginate da KaTeX nel lettore — Markdown GFM invariato per chi non ha formule)** → **Pacchetto 2b ✅ costruito il 3 ottobre (biblioteca di 8 widget costruiti a mano — parabola, retta, proiettile, piano inclinato, pH, gas, offerta/domanda, esecutore di codice in Web Worker isolato con timeout — innestati nelle slide col blocco ```widget: l'AI configura col solo JSON, bigliettino validato e clampato dal catalogo condiviso; contratto spiegato nel prompt scientifico con test anti-divergenza)** → **Pacchetto 2c ✅ costruito il 3 ottobre (palestra scientifica: edge function scientific-gym con generazione di esercizi numerici drill+problemi — soluzione passo-passo, suggerimenti progressivi, verifica con tolleranza e virgola decimale italiana — e chat socratica che non rivela MAI la risposta ma diagnostica l'errore e fa la domanda giusta; sezione "Palestra" in Pratica visibile solo per matematica/fisica/chimica, con selezione del modulo; il punteggio alimenta l'Esagono, area Applicazione)** → **Pacchetto 3 ✅ costruito il 3 ottobre (motore umanistico: tre vestiti didattici — letteratura con card ariose 120-220 parole e citazioni commentate, storia/geografia con date incise in grassetto e timeline numerata causa→effetto, filosofia con struttura dialettica tesi→obiezione→replica ed esempi terreni; impronta di materia anche nel piano di studi — moduli per autori/correnti, cronologia, problemi — e nel test finale; schema JSON identico al lettore attuale, zero modifiche client; le viste a grafo arrivano col Fiume 2)** → **Pacchetto 3b ✅ costruito il 3 ottobre (motore lingue e latino in languages.ts, instradato dal guardaroba: lingue vive con lezioni-concetto di grammatica in profondità — regola → forme con tabelle → contrasti con l'italiano → errori tipici — e isole di conversazione — situazione → dialogo modello 8-14 battute → frase per frase → frasi-salvagente → taschino-frasario; latino SENZA conversazione, si impara leggendo: grammatica con tabelle ed etimo per parentela con l'italiano, autori con passo in blockquote e analisi frase per frase, traduzione lavorata, civiltà come lezione di storia; temperatura 0,4 per i dialoghi vivi; impronta di materia nel piano — grammatica e isole alternate, morfologia prima della lettura — e nel test finale; schema JSON identico al lettore, zero modifiche client; voce e correzione frase-per-frase = roba client, Fiume 2)** → **Pacchetto 3c ✅ costruito il 3 ottobre (motore storia dell'arte in art.ts, instradato dal guardaroba: SEMPRE con l'opera davanti agli occhi — tre tipi di lezione scelti dal titolo: periodo/corrente con aria del tempo → programma → luoghi → artisti e opere cardine → sguardo e tecnica → eredità; artista con ritratto → contesto → sguardo → LA MANO (tecnica riconoscibile) → opere essenziali; opera singola con inquadro → soggetto e iconografia → ANALISI FORMALE si descrive guardando davvero → contesto e senso → dettaglio → fortuna; ogni opera citata come **Titolo, autore, data** e dove si trova oggi; lessico tecnico definito al primo uso; figure [FIG:n] al centro dell'analisi con blocco dedicato; temperatura 0,45; impronta nel piano per periodi in ordine cronologico rigoroso, grafo periodo → luoghi → opere; test finale con attribuzione, lettura formale e confronti fra opere; schema JSON identico al lettore, zero modifiche client; le immagini enciclopediche e la veste tablet-first sono roba client, Fiume 2)** → sociali + informatica (prossimi — l'utente li ha rinviati a più tardi). **Il motore scientifico è COMPLETO (2a+2b+2c); con 3, 3b e 3c anche letteratura, storia/geografia, filosofia, lingue, latino e storia dell'arte hanno il loro motore.**

**Fiume 2 — Il design (frontend):**
**Minilezione** (una veste per famiglia, priorità) → Tavolo (Home) → Studio (Cantieri + Banco degli Strumenti) → Piano e Pratica → modalità chiara "Carta da Incisione".

Ogni pacchetto: costruito, testato, spinto su GitHub separatamente; quando tocca il cloud, prompt pronto per Lovable.

---

## 10. Cosa manca (domande aperte)

1. **Il file del tutor** — le caratteristiche del tutor "non zerbino" vanno allegate (promesso).
2. ~~Marginalia, quiz e navigazione della Minilezione~~ — ✅ deciso il 3 ottobre: vedi `docs/minilezione-v2-2026-10-03.md` (marginalia a colonna/linguetta, checkpoint in linea, un blocco alla volta, narrazione a blocchi + chat al seguito).
3. **Verifica `:free`** di DeepSeek V4 Flash dal vivo: la chiave OpenRouter è già nei segreti Lovable (`OPENROUTER_SEPTEMBER_2026`); il codice prova prima `deepseek/deepseek-v4-flash:free`, poi il gradino a pagamento, poi Gemini. Da confermare sui primi percorsi scientifici reali (registro ai_usage: provider "openrouter").

*Documento di design. Nessuna riga di codice modificata alla data odierna.*
