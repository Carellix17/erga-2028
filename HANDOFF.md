# HANDOFF

Questo file serve come guida di riferimento per il coding agent che lavora allo sviluppo di Erga. Contiene le informazioni tecniche fondamentali per orientarsi nel progetto, comprendere la struttura esistente e prendere decisioni coerenti con l'architettura attuale.

## Studio — arresto per materiale non studiabile (17 ottobre 2026)

- `supabase/functions/_shared/studyMaterial.ts` definisce il codice persistente `[UNSUITABLE_STUDY_MATERIAL]`, il messaggio comprensibile e lo stato terminale. Usa le colonne e lo stato `failed` esistenti: nessuna migrazione.
- `extract-pdf` chiede alla vision di rifiutare immagini prive di concetti didattici. Al primo batch rifiutato interrompe l'intero tentativo; testo insufficiente da immagini/PDF chiude anche la generazione e ne azzera avanzamento, lock di modulo e timestamp. Opere d'arte, mappe, diagrammi e formule restano ammessi come materiale didattico anche senza testo.
- `generate-lessons` può ricevere `[]` come rifiuto del materiale. Si ferma **prima** della cancellazione delle lezioni esistenti. Non riavvia l'AI su un rifiuto già salvato finché non viene aggiunto materiale nuovo (`new_material_pending`). I fallimenti in background cancellano sempre avanzamento e timestamp del job.
- `StudioView` mostra «Generazione impossibile» e «Carica altri materiali» senza invito a rigenerare. Il selettore corsi resta accessibile anche senza lezioni o dopo errori di elaborazione. Riconosce anche i vecchi messaggi di estrazione insufficiente; le lezioni già presenti restano accessibili se una rigenerazione viene rifiutata. Lo stato locale di avvio è legato al singolo contesto per non bloccare altri corsi.
- `UploadSheet` interrompe il polling al rifiuto, chiude il caricamento unico e aggiorna la cache di Studio. Gli errori temporanei del provider restano riprovabili; il codice interno non viene mostrato nel messaggio di rifiuto.
- Test nuovi: `studyMaterial`, `extractUnsuitableMaterial`, `generateRejectedPlan`, `studioGenerationFailure`. Gli handler backend reali sono eseguiti con dipendenze simulate, senza chiamate AI o database live.
- Verifica locale: 43 test pertinenti superati (17 nuovi); `tsc --noEmit -p tsconfig.app.json`, build Vite/PWA e ESLint dei file frontend modificati superati (0 errori, 2 avvisi Hook già presenti). Detector Impeccable: nessun rilievo. Verifica visiva responsive non completata: Chromium non era installato e il download del browser è fallito; i controlli UI locali usano React Testing Library/jsdom.
- **Aggiornamento 25 ottobre 2026 — la suite è verde.** I 20 test che fallivano su `5446b4e` (guardrail ancora riferiti al design v3 dopo la migrazione v4) sono stati riallineati dalle PR #88 e #89; la suite `pdfSelection`, che non si caricava perché `src/test/setup.ts` usava `window` in ambiente Node, torna a eseguire i suoi 3 test grazie alla guardia `typeof window !== "undefined"`. Il guardrail della CTA primaria, rimasto rosso dopo che l'ombra rigida è diventata il gettone `shadow-primary-action`, è stato riparato dalla PR #90. Misurato su `290f2f1`: **84 file di test, 728 test superati**, `tsc --noEmit` 0 errori, build di produzione riuscita.
- Pubblicazione ancora da eseguire tramite Lovable: deploy di **extract-pdf** e **generate-lessons** con il nuovo helper, poi **Update** frontend. Prompt completo e controlli di accettazione in `docs/LOVABLE_STUDIO_MATERIAL_REJECTION.md`. Nessuna migrazione o pubblicazione diretta è stata eseguita.

Il rilevamento semantico usa l'AI e non è infallibile; i test locali coprono la gestione degli esiti simulati. Il design corrente resta quello di `DESIGN.md` v4.0: la sezione v3 qui sotto è documentazione storica.

## Stato UI — design system v4.0 (corrente)

La fonte visiva autorevole è `DESIGN.md` **v4.0 «Swiss Cognitive Grid + Tactile Studio»** (17 ottobre 2026; la composizione delle viste è stata raffinata il 25 ottobre con la PR #92). `PRODUCT.md` prevale sulle decisioni di prodotto, `AGENTS.md` sulle regole operative. I valori eseguibili sono in `src/index.css` e `tailwind.config.ts`; i nomi legacy restano alias di compatibilità. Il sidecar `.impeccable/design.json` è storico e non è stato riallineato.

Riferimenti correnti:

- **Palette giorno**: canvas pietra `#F4F2EC`, celle operative `#FAF8F3`, superficie secondaria `#EAE6DC`, foglio di lettura `#FFFDF9`, inchiostro `#11120D`, testo secondario `#4A4942`, metadati `#68665E`, linea di griglia `#D6D1C4`; vermiglio decorativo `#E63B11`, CTA `#C82F0A` con hover `#AC2607`, colore cognitivo `#1D4E5F`. Gli accenti per materia conservano i loro ruoli semantici e non sostituiscono il colore dell'azione principale.
- **Palette notte**: canvas `#0A0A08`, superfici `#1A1A15` e `#262623`, testo `#FFFBF4`, secondario e contorno dei controlli `#D8CFBC`, linea `#3A382E`, cognitivo `#8ABCCC`; CTA e hover restano `#C82F0A` e `#AC2607`.
- **Tipografia**: Ubuntu Sans per UI e corpo; Instrument Serif **solo** per i titoli di lettura dentro `.lesson-paper`; Ubuntu Sans Mono per misure, percentuali, numeri di pagina e CTA primaria. Gli alias legacy `font-display` e `font-serif` risolvono a Ubuntu Sans; il serif editoriale vive nel token dedicato `editorial`.
- **Geometria**: celle, card corso, hero e griglia a raggio **0px**; pulsanti e input **2px**; pannelli e dialoghi al massimo **4px**; `rounded-full` riservato ad avatar, radio e indicatori realmente circolari.
- **Superfici ed elevazione**: superfici piatte, senza ombre morbide né vetro; le ombre di sistema sono spente (`--shadow-level-*: none`). L'azione primaria usa il gettone `shadow-primary-action` → `--shadow-primary-action: 2px 2px 0 #11120D`, che si riduce in pressione (`active:translate-x-px active:translate-y-px active:shadow-none`). Lo stesso gettone è condiviso da `Button`, `PathHero` e `ModulePath`: non reintrodurre il valore inline `shadow-[2px_2px_0px_#11120D]`.
- **Grana e firma visiva**: `.paper-grain` e `.table-grain` rendono superfici piatte; il velo satinato `.btn-satin` resta confinato alle azioni sulle copertine dei corsi; la vecchia firma a gradiente è una linea vermiglia di 2px (`.erga-earthy-stripe`).
- **Movimento**: token condivisi 120/180/240/300/360 ms; nessuna animazione decorativa continua; `prefers-reduced-motion` rispettato e contenuto disponibile anche senza animazione.
- **Contrasto**: `#FFFDF9` su `#C82F0A` ≈ 5,35:1 (AA per testo normale) e `src/lib/autoContrast.ts` sceglie l'inchiostro con contrasto maggiore sullo sfondo effettivo. Il calcolo della singola coppia non certifica l'accessibilità di tutte le schermate.
- **Composizione Home** (raffinata dalla PR #92): card del percorso autonoma e compatta, con la stessa copertina astratta usata in Studio (`CourseCardBackground` + `courseCoverVars`) e testo in `text-contrast`; sotto, il radar cognitivo **senza card e senza misure numeriche**, affiancato dai soli accessi «Interrogazione» ed «Esercizi» senza intestazione visibile; poi il gruppo «Carica materiale» + «Chat»; il Piano del giorno chiude la pagina come lista verticale a colonna singola. Le sezioni **non** vanno racchiuse in un unico contenitore. `CognitiveTelemetry` legge il profilo autentico e, se manca, lo dichiara senza inventare punteggi.
- **Composizione Studio**: `Index` affianca materiali e controlli a sinistra (**4/12**) e percorso/lettore a destra (**8/12**) su desktop; sotto `lg` «Materiali e lettura» è una sezione collassabile con stato accessibile; «Crea nuovo percorso» sta in cima alla panoramica e su smartphone apre dal basso il flusso di caricamento esistente.
- **Taglio di lettura**: Calma porta l'interlinea di paragrafi ed elenchi a 1,85; Logica evidenzia grassetti e formule con il colore cognitivo. È uno stato locale di **presentazione**: non riscrive le lezioni e non cambia richieste o generazione AI.

Verifiche sullo stato corrente (25 ottobre 2026, commit `290f2f1`): **84 file di test e 728 test superati**, `tsc --noEmit` 0 errori, build di produzione riuscita in ~15 s. Restano da fare nel browser le verifiche elencate in `DESIGN.md` §«Fonti e verifica»: giorno/notte, caricamento PDF completo e parziale, lettore, tastiera, contrasto effettivo, overflow e comportamento a 375/768/1024/1440 px.

---

## Stato UI storico — migrazione al design system v3.0 (superata)

> **Documentazione storica.** Non deve guidare nuove modifiche: la fonte corrente è la sezione v4.0 qui sopra.

La fonte visiva era `DESIGN.md` v3.0 «Squared & Earthy». Le indicazioni v2.1 «Carta contemporanea» e «Squared & Sunset» rimaste nei documenti storici erano già superate all'epoca e non devono guidare nuove modifiche.

La migrazione aggiorna palette e token condivisi, componenti UI, navigazione, schermate Home/Studio/Piano/Core/Impostazioni e landing, mantenendo struttura, flussi, logica di business, dati e backend esistenti. I punti di riferimento sono:

- palette Smoky Black `#11120D`, Olive Drab `#565449`, Bone `#D8CFBC`, Floral White `#FFFBF4` e accenti per materia;
- temi giorno/notte, Playfair Display per i titoli e Inter per UI e lettura;
- raggi 4/8/12px e ombre flat basate sui token;
- satinato limitato alle azioni sulle copertine, grana decorativa contenuta ed Earthy Stripe come firma visiva;
- controlli responsive e accessibili, senza cambiare le funzioni reali dell'app.

Verifiche della migrazione (14 ottobre 2026): 76 file di test e 700 test superati, `tsc --noEmit` e build di produzione superati. ESLint sui file TS/TSX modificati: 0 errori e 8 avvisi non bloccanti su Fast Refresh e dipendenze React Hook.

---

## GOAL

**Erga** è una piattaforma educativa innovativa che combina intelligenza artificiale, analisi cognitiva e pianificazione del proprio tempo di studio per offrire un'esperienza di apprendimento **completamente personalizzata**. L'obiettivo principale è trasformare il modo in cui gli studenti studiano, adattandosi al loro stile cognitivo, ritmo di apprendimento e preferenze personali.

L'app si propone come **"la piattaforma educativa che si adatta a come pensi"**, offrendo:
- Un'esperienza **multi-piattaforma** (Web, iOS, Android tramite PWA)
- Un approccio **student-centric** basato su valutazione cognitiva
- Strumenti **intelligenti** che generano contenuti didattici su misura
- Un sistema **adattivo** che evolve con l'utente

---

## FEATURES

### 📱 **Feature di Base e Autenticazione**

#### 1. **Sistema di Autenticazione Completo**
- **Login/Logout**: Accesso tramite email e password con validazione client-side
- **Registrazione**: Creazione account con validazione form (password minimo 8 caratteri)
- **OAuth Multi-Provider**: Accesso tramite Google, Apple, Microsoft e Lovable
- **Reset Password**: Flusso completo di recupero password con email di reimpostazione
- **Session Management**: Gestione sessioni persistenti con token refresh automatico
- **Welcome Email**: Invio automatico email di benvenuto al primo accesso
- **Protected Routes**: Rotte protette che richiedono autenticazione

#### 2. **Landing Page Pubblica**
- **Pagina di marketing**: Presentazione dell'app con FAQ e schema.org
- **SEO Ottimizzato**: Meta tag, OpenGraph e JSON-LD per motori di ricerca
- **Design Responsivo**: Adattamento perfetto a tutti i dispositivi
- **Call-to-Action**: Pulsanti per registrazione e accesso

---

### 🏠 **Dashboard Principale (Home)**

#### 3. **Home Dashboard**
- **Saluto Personalizzato**: Messaggio di benvenuto con nome utente e stato
- **Card Corso Attivo**: Visualizzazione del corso corrente con:
  - Titolo e copertina del corso
  - Titolo e numero della lezione in corso
  - Percentuale di completamento
  - Pulsante "Riprendi" o "Inizia"
- **Stato di Generazione**: Indicazione quando le lezioni stanno venendo generate
- **Messaggio di Benvenuto Contestualizzato**: Adattato in base a:
  - Task pendenti
  - Attività completate
  - Presenza di lezioni da riprendere
  - Prossima valutazione

#### 4. **Timeline Giornaliera**
- **Task del Giorno**: Elenco dei compiti pianificati per la giornata
- **Filtro Intelligente**: Mostra solo i task non completati
- **Espansione Progressiva**: Visualizzazione iniziale di 3 task con opzione "Mostra tutti"
- **Avvio Sessione Focus**: Possibilità di avviare sessioni di studio direttamente dai task

#### 5. **Strumenti Rapidi (Quick Tools)**
- **Caricamento File**: Accesso diretto al caricamento documenti
- **Tutor AI**: Avvio chat con assistente intelligente
- **Esercizi**: Generazione esercizi personalizzati
- **Interrogazione**: Simulazione di interrogazione orale
- **Accesso Rapido**: Tutti gli strumenti accessibili con un tap

---

### 📚 **Area Studio**

#### 6. **Gestione Contesti di Studio**
- **Caricamento Materiali**: Upload di PDF, foto e appunti
- **Organizzazione Corsi**: Gestione multipla di contesti didattici
- **Selezionatore Corsi**: Interfaccia per scegliere tra i corsi caricati
- **Segnalibro Cloud**: Memorizzazione dell'ultimo corso visualizzato
- **Ricerca per Argomento**: Selezione contesto tramite ricerca

#### 7. **Generazione Automatica Lezioni**
- **Analisi AI**: Elaborazione automatica dei materiali caricati
- **Creazione Mini-Lezioni**: Suddivisione in lezioni brevi e gestibili
- **Struttura Modulare**: Organizzazione in moduli didattici
- **Stato di Generazione Realtime**: Monitoraggio progresso generazione
- **Pipeline Unificata**: Processo singolo per compressione, caricamento, analisi e generazione

#### 8. **Visualizzazione Lezioni**
- **Panoramica Moduli**: Vista d'insieme di tutti i moduli disponibili
- **Navigazione a Livelli**: 
  - Livello 1: Schede moduli con "Riprendi lezione"
  - Livello 2: Percorso a ramo del modulo
- **Percorso Progressivo**: Navigazione guidata attraverso i contenuti
- **Memoria Posizione**: Ogni stanza riapre dove era stata lasciata

#### 9. **Lettore Lezioni**
- **Rendering Markdown**: Visualizzazione formattata dei contenuti
- **Supporto LaTeX**: Rendering formule matematiche tramite KaTeX
- **Immagini e Grafici**: Gestione contenuti multimediali
- **Navigazione**: Avanti/indietro tra le lezioni
- **Progresso**: Indicazione percentuale completamento

---

### 📅 **Area Piano (Calendario Studio)**

#### 10. **Calendario Appuntamenti**
- **Visualizzazione Mensile**: Griglia calendario con conteggio eventi per giorno
- **Tipologie Eventi**: 
  - Sessioni di studio
  - Valutazioni (verifiche, compiti in classe)
  - Impegni extra-scolastici
- **Gestione Completa**: Aggiunta, modifica, eliminazione eventi
- **Drag & Drop**: Interfaccia intuitiva per pianificazione

#### 11. **Generazione Piano di Studio**
- **AI Planning**: Generazione automatica piano settimanale basato su:
  - Materie da studiare
  - Scadenze imminenti
  - Tempo disponibile
  - Stile cognitivo utente
- **Suggerimenti Intelligenti**: Proposte di sessioni di studio ottimali
- **Accettazione/Rifiuto**: Opzione di accettare o modificare il piano generato

#### 12. **Gestione Valutazioni**
- **Tipologie**: Verifiche scritte, orali, compiti
- **Calendario**: Pianificazione con date e orari
- **Notifiche**: Promemoria automatici
- **Storico**: Archivio valutazioni passate

---

### 🧠 **Area Core (Personalizzazione)**

#### 13. **Esagono Cognitivo**
- **6 Aree Cognitive**: 
  - **LOG (Logica)**: Capacità di ragionamento e collegamenti
  - **MEM (Memoria)**: Capacità di memorizzazione
  - **FOC (Focus)**: Capacità di concentrazione
  - **VOC (Lessico)**: Competenze linguistiche
  - **ANS (Calma)**: Gestione ansia e stress
  - **APP (Pratica)**: Abilità pratiche e applicazione
- **Questionario Iniziale**: 18 domande per profilazione
- **Punteggio 0-100**: Valutazione per ogni area
- **Visualizzazione Grafica**: Esagono interattivo con punteggi
- **Aggiornamento Dinamico**: Adattamento basato su performance

#### 14. **Materie e Interessi**
- **Selezione Materie**: Scelta delle materie scolastiche
- **Livelli di Competenza**: Valutazione 1-10 per ogni materia
- **Obiettivi Personali**: Definizione target di miglioramento
- **Preferenze**: Indicazione materie preferite
- **Categorie**: Organizzazione per ambiti (scientifico, umanistico, ecc.)

#### 15. **Planning Routine**
- **Pianificazione Settimanale**: Definizione orari studio
- **Slot Temporali**: Blocchi orari personalizzabili
- **Ripetizione**: Routine ricorrenti
- **Ottimizzazione**: Suggerimenti basati su ritmi circadiani

---

### 💬 **Chat e Assistenza AI**

#### 16. **Chat Intelligente**
- **Contestualizzazione**: Chat specifica per ogni contesto di studio
- **Storico Conversazioni**: Archivio delle chat precedenti
- **Categorizzazione**: Chat generali e chat per argomento
- **Suggerimenti Rapidi**: Azioni veloci suggerite dall'AI
- **Integrazione Contesti**: Accesso ai materiali caricati

#### 17. **Funzionalità Chat**
- **Messaggi Testuali**: Invio e ricezione messaggi
- **Allegati Immagini**: Supporto per immagini nei messaggi
- **Risposte Streaming**: Visualizzazione in tempo reale
- **Azioni Automatiche**: Esecuzione comandi (es: "apri esercizi")
- **Citazione Fonti**: Referenziazione materiali di studio

---

### 🎯 **Area Pratica**

#### 18. **Esercizi Personalizzati**
- **Generazione Automatica**: Creazione esercizi basati sui materiali caricati
- **Tipologie Esercizi**:
  - Scelta multipla
  - Vero/Falso
  - Completamento
  - Risposta breve
  - Abbinamento
  - Ordinamento
- **Selezionatore Lezioni**: Scelta specifica delle lezioni per generazione
- **Storico Esercizi**: Archivio sessioni precedenti
- **Statistiche Performance**: Analisi risultati e miglioramenti

#### 19. **Interrogazione Simulata**
- **Modalità**: 
  - **Strutturata**: Domande predefinite
  - **Libera**: Conversazione aperta
  - **Esposizione**: Presentazione orale
- **Riconoscimento Vocale**: Trascrizione automatica risposte
- **Valutazione Automatica**: Analisi qualità risposte
- **Report Finale**: Punteggio e considerazioni
- **Sintesi Vocale**: Lettura domande tramite TTS (Text-to-Speech)
- **Azure TTS**: Integrazione con Azure Cognitive Services

#### 20. **Palestra Scientifica** (Scientific Gym)
- **Esclusiva per Scientifiche**: Solo per matematica, fisica, chimica
- **Esercizi Numerici**: Problemi con soluzioni quantitative
- **Verifica Immediata**: Controllo automatico risposte
- **Suggerimenti Progressivi**: Hint graduali per guidare alla soluzione
- **Soluzione Passo-Passo**: Spiegazione dettagliata
- **Chat Socratica**: Assistente per discussione e approfondimento
- **Punteggio**: Tracciamento performance

---

### ⏱️ **Sistema Focus (Pomodoro)**

#### 21. **Timer Pomodoro**
- **Cicli di Studio**: 25 minuti focus + pause (5/15 minuti)
- **4 Cicli Completi**: Sessione completa con pausa lunga
- **Timer Visivo**: Interfaccia circolare con progresso
- **Controlli**: Play, Pausa, Riavvia, Concludi
- **Notifiche**: Avvisi acustici e visivi

#### 22. **Statistiche Focus**
- **Dashboard Ritmo**: Visualizzazione grafica delle sessioni
- **Tempo Totale**: Ore di studio accumulate
- **Sessioni Giornaliere**: Attività del giorno
- **Streak**: Serie giorni consecutivi di studio
- **Andamento**: Analisi trend settimanali/mensili
- **Distribuzione**: Grafici per materia e tipo attività

#### 23. **Gestione Sessioni**
- **Avvio Rapido**: Inizio sessione con un tap
- **Task Associato**: Collegamento a compiti specifici
- **Durata Personalizzata**: Adattamento tempo di studio
- **Estensione**: Prolungamento sessione
- **Registrazione Automatica**: Salvataggio sessioni completate

---

### 📤 **Upload e Gestione File**

#### 24. **Caricamento Materiali**
- **Formati Supportati**: PDF, immagini (JPEG, PNG, WebP, HEIC)
- **Drag & Drop**: Interfaccia intuitiva per upload
- **Compressione Automatica**: 
  - Immagini: Compressione fino a 8MB
  - HEIC: Conversione automatica in JPEG
  - Batch Processing: Elaborazione multipla file
- **Anteprime**: Visualizzazione anteprima immagini
- **Progresso**: Indicazione stato upload

#### 25. **Gestione Contesti**
- **Organizzazione**: Cartelle e categorizzazione
- **Eliminazione**: Rimozione file e contesti
- **Condivisione**: Opzione di condivisione materiali
- **Storico**: Archivio file caricati
- **Ricerca**: Funzione di ricerca tra i materiali

---

### 🎓 **Onboarding e Profilazione**

#### 26. **Onboarding Iniziale**
- **Flusso Guidato**: Introduzione passo-passo
- **Questionario Cognitivo**: 18 domande per profilazione
- **Raccolta Dati Anagrafici**: Nome, età, istituto
- **Configurazione Iniziale**: Preferenze di base
- **Esagono Cognitivo**: Prima valutazione

#### 27. **Profilazione Continua**
- **Aggiornamento Dinamico**: Adattamento basato su performance
- **Feedback Implicito**: Analisi comportamenti di studio
- **Miglioramento Progressivo**: Ottimizzazione esperienza

---

### ⚙️ **Impostazioni**

#### 28. **Impostazioni Account**
- **Dati Personali**: Modifica nome, cognome, nickname
- **Avatar**: Caricamento e gestione foto profilo
- **Età e Scuola**: Informazioni anagrafiche
- **Notifiche**: Configurazione avvisi
- **Eliminazione Account**: Opzione di cancellazione

#### 29. **Impostazioni Aspetto**
- **Tema**: Chiaro, Scuro, Automatico
- **Personalizzazione**: Colori e stili
- **Anteprime**: Visualizzazione opzioni tema

#### 30. **Impostazioni Accessibilità**
- **Dimensione Testo**: Normale, Grande, Molto Grande
- **Alto Contrasto**: Modalità per migliorare leggibilità
- **Riduci Animazioni**: Opzione per disabilitare movimenti
- **Lettura Vocale**: Attivazione TTS di default

#### 31. **Impostazioni Lingua**
- **Lingue Supportate**: Italiano, Inglese
- **Rilevamento Automatico**: Basato su preferenze browser
- **Cambio Dinamico**: Modifica senza riavvio

#### 32. **Termini e Condizioni**
- **Privacy Policy**: Informativa trattamento dati
- **Termini di Servizio**: Condizioni d'uso
- **Versioni**: Accesso a versioni precedenti

---

### 👤 **Profilo Utente**

#### 33. **Gestione Profilo**
- **Dati Personali**: Visualizzazione e modifica
- **Statistiche**: Riepilogo attività e progressi
- **Preferenze**: Impostazioni salvate
- **Avatar**: Immagine profilo personalizzabile
- **Cognitive Profile**: Visualizzazione esagono cognitivo

---

### 🔔 **Notifiche e Push**

#### 34. **Sistema Notifiche**
- **Web Push**: Notifiche browser native
- **Service Worker**: Gestione in background
- **Tipologie**: 
  - Promemoria sessioni studio
  - Nuovi messaggi chat
  - Eventi pianificati
  - Generazione completata
- **Personalizzazione**: Scelta quali notifiche ricevere

---

### 📊 **Analisi e Statistiche**

#### 35. **Dashboard Analitica**
- **Tempo Studio**: Ore accumulate per materia
- **Performance**: Risultati esercizi e interrogazioni
- **Progressi**: Avanzamento nei corsi
- **Andamento**: Trend temporali
- **Confronti**: Analisi comparativa tra materie

#### 36. **Tracciamento AI**
- **Utilizzo Modelli**: Monitoraggio token e costi
- **Performance Generazione**: Statistiche qualità contenuti
- **Ottimizzazione**: Adattamento basato su feedback

---

### 🌐 **Internazionalizzazione**

#### 37. **Supporto Multi-Lingua**
- **Lingue**: Italiano (predefinita), Inglese
- **i18next**: Framework di traduzione
- **Traduzioni Complete**: Tutte le interfacce localizzate
- **Formati Localizzati**: Date, numeri, valute
- **Rilevamento Automatico**: Basato su lingua browser

---

### 📱 **PWA (Progressive Web App)**

#### 38. **Funzionalità PWA**
- **Installazione**: Aggiunta a schermata home
- **Offline**: Accesso senza connessione
- **Service Worker**: Caching risorse
- **Aggiornamenti**: Notifiche nuove versioni
- **Icone**: Adattamento a diversi dispositivi
- **Manifest**: Configurazione completa

---

### 🎨 **Design System e UI**

#### 39. **Design Tokens**
- **Fonte visiva**: `DESIGN.md` **v4.0 «Swiss Cognitive Grid + Tactile Studio»**; è la fonte autorevole per palette, caratteri, superfici, geometria e movimento. I valori eseguibili stanno in `src/index.css` e `tailwind.config.ts`.
- **Palette giorno**: canvas pietra `#F4F2EC`, celle `#FAF8F3`, superficie secondaria `#EAE6DC`, foglio `#FFFDF9`, inchiostro `#11120D`, testo secondario `#4A4942`, metadati `#68665E`, linea `#D6D1C4`; vermiglio decorativo `#E63B11`, CTA `#C82F0A` (hover `#AC2607`), cognitivo `#1D4E5F` e accenti per materia.
- **Temi**: palette giorno/notte, con canvas notturno `#0A0A08`, superfici `#1A1A15`/`#262623`, testo `#FFFBF4` e cognitivo `#8ABCCC`; la CTA resta invariata nei due temi.
- **Tipografia**: Ubuntu Sans per UI e corpo, Instrument Serif **solo** per i titoli di lettura dentro `.lesson-paper`, Ubuntu Sans Mono per misure e CTA primaria. Gli alias legacy `font-display`/`font-serif` risolvono a Ubuntu Sans.
- **Superfici ed elevazione**: superfici piatte, senza ombre morbide né vetro (`--shadow-level-*: none`); l'azione primaria usa il gettone `shadow-primary-action` (2px × 2px in `#11120D`), che si riduce in pressione. Velo satinato `.btn-satin` limitato alle azioni sulle copertine.
- **Geometria**: raggi 0px per celle, card, hero e griglia; 2px per controlli; al massimo 4px per pannelli e dialoghi. Le forme circolari complete (`rounded-full`) sono riservate ad avatar, radio e indicatori realmente circolari.
- **Firma visiva**: linea vermiglia di 2px (`.erga-earthy-stripe`); `.paper-grain` e `.table-grain` sono alias piatti di compatibilità, senza grana.
- **Colori per materia**: accenti riconoscibili mantenuti e adattati per tema; non sostituiscono il colore dell'azione principale.

#### 40. **Componenti UI**
- **shadcn/ui**: Componenti accessibili e personalizzati.
- **Radix UI**: Primitive non stilizzate con supporto ai pattern accessibili.
- **Animazioni**: Framer Motion per transizioni funzionali, nel rispetto di `prefers-reduced-motion`.
- **Responsive**: layout per telefono, tablet e desktop; verificare overflow e target touch nelle modifiche.
- **Accessibilità**: mantenere contrasto, focus visibile, semantica e nomi accessibili; non dichiarare conformità globale senza un audit completo.
- **Tipografia**: Ubuntu Sans (UI e corpo), Instrument Serif (solo titoli di lettura in `.lesson-paper`), Ubuntu Sans Mono (misure e CTA primaria).

---

### 🔌 **Integrazioni Esterne**

#### 41. **Supabase Integration**
- **Database**: PostgreSQL con Drizzle ORM
- **Autenticazione**: OAuth, email/password, magic link
- **Storage**: Archiviazione file e immagini
- **Edge Functions**: Funzioni serverless
- **Realtime**: Aggiornamenti in tempo reale

#### 42. **Lovable Integration**
- **Cloud Auth**: Autenticazione tramite Lovable
- **MCP (Model Context Protocol)**: Integrazione AI
- **Preview**: Anteprime in tempo reale
- **Deploy**: Gestione distribuzione

#### 43. **Azure Cognitive Services**
- **Text-to-Speech**: Sintesi vocale
- **Speech Recognition**: Riconoscimento vocale
- **Integrazione Nativa**: API dirette

---

### 🛠️ **Feature Tecniche**

#### 44. **Gestione Stato**
- **TanStack Query**: Caching intelligente
- **Context API**: State management globale
- **Persistenza**: LocalStorage per dati offline
- **Sincronizzazione**: Sync automatico al ritorno online

#### 45. **Routing**
- **React Router DOM**: Navigazione dichiarativa
- **Lazy Loading**: Caricamento pigro pagine
- **Protected Routes**: Accesso condizionato
- **Nested Routes**: Gerarchia rotte annidate

#### 46. **Form e Validazione**
- **React Hook Form**: Gestione form performante
- **Zod**: Schema validation
- **Validazione Client**: Controlli prima dell'invio
- **Feedback Immediato**: Errori inline

#### 47. **Performance**
- **Code Splitting**: Suddivisione bundle
- **Lazy Loading**: Componenti caricati on-demand
- **Caching**: Ottimizzazione richieste
- **Compressione**: Immagini e risorse

---

## STACK

Erga è una piattaforma educativa moderna costruita su uno stack tecnologico completo e ben strutturato. Di seguito viene descritto in dettaglio ogni componente, dall'interfaccia utente fino all'infrastruttura cloud, organizzato per livelli logici.


### 🎨 **Livello di Presentazione (Frontend UI)**

#### Framework e Runtime
- **React 18.3.1**: Libreria principale per la costruzione dell'interfaccia utente, con supporto completo per componenti funzionali, hook e concurrent features
- **TypeScript 5.8.3**: Tipizzazione statica per tutto il codice frontend, garantendo sicurezza e manutenibilità
- **Vite 5.4.19**: Bundler ultra-veloce per lo sviluppo e la build di produzione, configurato con plugin React SWC per transpiling ottimizzato
- **PWA (Progressive Web App)**: Supporto nativo tramite `vite-plugin-pwa` e Workbox, con service worker (`sw.ts`) per caching, notifiche push e installazione offline

#### Styling e Design System
- **Tailwind CSS 3.4.17**: Framework utility-first per lo styling, con configurazione personalizzata che estende il design system di Erga
- **shadcn/ui**: Raccolta di componenti accessibili e personalizzabili, basati su Radix UI e costruiti con Tailwind
- **Radix UI**: Libreria di primitive UI non stilizzate (accordion, dialog, select, tabs, toast, tooltip, ecc.) che fornisce accessibilità e comportamenti standard out-of-the-box
- **Custom Design Tokens**: Sistema di token in `src/index.css` e `tailwind.config.ts`, allineato a `DESIGN.md` **v4.0 «Swiss Cognitive Grid + Tactile Studio»**, con:
  - Palette pietra/carta (canvas `#F4F2EC`, celle `#FAF8F3`, foglio `#FFFDF9`, inchiostro `#11120D`), vermiglio `#E63B11`, CTA `#C82F0A`, cognitivo `#1D4E5F`, accenti per materia e colori semantici di stato
  - Token giorno/notte per canvas, superfici, testo, bordi e controlli (notte: `#0A0A08`, `#1A1A15`, `#262623`, `#FFFBF4`)
  - Tipografia Ubuntu Sans / Instrument Serif / Ubuntu Sans Mono, raggi 0/2/4px, superfici piatte e ombra rigida `--shadow-primary-action` solo sull'azione primaria
  - Velo satinato `.btn-satin` limitato alle azioni sulle copertine; `.paper-grain` e `.table-grain` sono alias piatti; superfici Impostazioni opache
  - `autoContrast.ts` sceglie il testo con contrasto maggiore per lo sfondo effettivo

#### Componenti e Struttura UI
- **Componenti Organizzati**: La cartella `src/components/` contiene componenti raggruppati per dominio:
  - `auth/`: Componenti di autenticazione
  - `chat/`: Interfaccia di chat e conversazioni
  - `core/`: Componenti fondamentali riutilizzabili
  - `demo/`: Componenti per la modalità demo
  - `focus/`: Componenti per la funzionalità di focus studio
  - `home/`: Componenti della dashboard principale
  - `landing/`: Componenti della pagina pubblica
  - `layout/`: Layout e strutture di pagina
  - `onboarding/`: Componenti per il flusso di onboarding
  - `piano/`: Componenti per la pianificazione studio
  - `pratica/`: Componenti per esercizi e pratica
  - `profile/`: Componenti del profilo utente
  - `settings/`: Componenti delle impostazioni
  - `shared/`: Componenti condivisi (ErrorBoundary, SplashScreen, SeoHead)
  - `studio/`: Componenti per l'area di studio
  - `subscription/`: Componenti per la gestione abbonamenti
  - `ui/`: Componenti shadcn/ui personalizzati
  - `upload/`: Componenti per il caricamento file

#### Animazioni e Interazioni
- **Framer Motion 12.42.2**: Libreria per animazioni fluide e interazioni complesse
- **react-resizable-panels 2.1.9**: Pannelli ridimensionabili per layout flessibili
- **embla-carousel-react 8.6.0**: Carosello performante e accessibile
- **vaul 0.9.9**: Componenti per drawer accessibili


### 🧠 **Livello di Logica Applicativa**

#### State Management
- **TanStack Query 5.83.0** (React Query): Gestione centrale dello stato server-side con:
  - Caching intelligente con `query-sync-storage-persister` per persistenza in localStorage
  - Configurazione ottimizzata per query (staleTime: 5 minuti, gcTime: 30 minuti)
  - Gestione automatica del refetch e retry
  - Persistenza selettiva: solo le query del dominio "lessons" vengono dehydrate per 24 ore

#### Routing
- **React Router DOM 6.30.1**: Routing dichiarativo con:
  - Lazy loading delle pagine tramite `React.lazy()` e `Suspense`
  - Protected routes per aree autenticate
  - Gestione ottimizzata del code splitting

#### Form e Validazione
- **React Hook Form 7.61.1**: Gestione form performante con validazione integrata
- **Zod 4.4.3**: Schema validation per dati e form, usato insieme a `@hookform/resolvers`
- **input-otp 1.4.2**: Componenti per input OTP (One-Time Password)

#### Internazionalizzazione
- **i18next 26.3.4**: Sistema di traduzione completo con:
  - `react-i18next 17.0.8`: Integrazione React
  - `i18next-browser-languagedetector 8.2.1`: Rilevamento automatico lingua browser
  - Supporto per Italiano e Inglese (`src/i18n/locales/`)
  - Persistenza preferenze lingua in localStorage

#### Gestione Tema e Accessibilità
- **next-themes 0.3.0**: Gestione tema chiaro/scuro con persistenza
- **Context API**: Contesti personalizzati per:
  - `AuthContext`: Gestione autenticazione e sessione utente
  - `ThemeContext`: Gestione tema e preferenze visuali
  - `FocusContext`: Gestione stato di focus studio
  - `SaveStatusContext`: Gestione stato di salvataggio dati
  - `AccessibilityContext`: Gestione preferenze accessibilità

#### Utility e Hooks
- **Hooks Personalizzati** (`src/hooks/`): Oltre 30 hooks custom per:
  - Gestione dati utente (`useUserData`, `useProfileData`, `useUserSubjects`, `useUserRoutines`)
  - Gestione lezioni e studio (`useLessons`, `useLessonFigures`, `useLessonModules`, `useLessonParts`, `useLessonExercises`)
  - Gestione contesti studio (`useFileContexts`, `useStudyContexts`)
  - Gestione valutazioni cognitive (`useCognitiveProfile`, `useEvaluations`)
  - Gestione focus e statistiche (`useFocusStats`, `useStudyEvents`, `useStudyTutor`)
  - Gestione abbonamenti (`useSubscription`)
  - Gestione notifiche push (`usePushNotifications`)
  - Gestione immagini corsi (`useCourseImage`)
  - Gestione demo (`useDemoHandoff`)
  - Utility varie (`useDelayedLoading`, `useHaptics`, `useKeyboardInset`, `usePrefersReducedMotion`)

- **Lib Utility** (`src/lib/`): Funzioni e logiche di business:
  - `autoContrast.ts`: Sistema di contrasto automatico per testo su sfondi colorati
  - `courseIdentity.ts`: Gestione identità e colori dei corsi
  - `subjectColors.ts`: Mappatura colori per materia
  - `chatProtocol.ts`: Protocollo per gestione chat AI
  - `cognitiveQuestions.ts`: Domande per valutazione cognitiva
  - `cognitiveArchetype.ts`: Archetipi cognitivi
  - `exerciseQuality.ts`: Valutazione qualità esercizi
  - `focusStats.ts`: Calcolo statistiche focus
  - `homeDashboard.ts`: Logica dashboard principale
  - `imageCompression.ts`: Compressione immagini
  - `lessonExercises.ts`, `lessonModules.ts`, `lessonParts.ts`: Gestione struttura lezioni
  - `onboardingGate.ts`: Gestione gate onboarding
  - `paddle.ts`: Integrazione sistema pagamenti
  - `pdfPageRenderer.ts`: Rendering pagine PDF
  - `pianoPalette.ts`: Palette colori per piani studio
  - `routineLayout.ts`: Layout routine studio
  - `sourcePaths.ts`: Percorsi risorse
  - `weekPlanner.ts`: Pianificatore settimanale
  - `widgets.ts`: Gestione widget
  - `wikipediaImage.ts`: Recupero immagini Wikipedia


### 🔌 **Livello di Integrazione e API**

#### MCP (Model Context Protocol)
- **@lovable.dev/mcp-js 0.20.0**: Framework per integrazione con AI tramite Model Context Protocol
- **Definizione MCP** (`src/lib/mcp/index.ts`): Server MCP "erga-mcp" con tools per:
  - `list_study_contexts`: Elencare contesti studio dell'utente
  - `get_study_context`: Recuperare testo estratto da un contesto
  - `list_lessons`: Elencare mini-lezioni per un contesto
  - `get_lesson`: Recuperare una singola mini-lezione
- **Autenticazione MCP**: OAuth tramite Supabase Auth

#### Lovable Integration
- **@lovable.dev/cloud-auth-js 1.2.0**: Autenticazione tramite Lovable Cloud
- **lovable-tagger 1.1.13**: Plugin Vite per tagging componenti (solo in sviluppo)
- **Integrazione Lovable** (`src/integrations/lovable/index.ts`):
  - Autenticazione OAuth con provider: Google, Apple, Microsoft, Lovable
  - Gestione sessione automatica con Supabase
  - Supporto per preview in iframe (Lovable editor)


### 🗃️ **Livello Dati (Database e Storage)**

#### Database
- **Supabase**: Piattaforma backend-as-a-service basata su PostgreSQL
- **Drizzle ORM 0.45.2**: ORM leggero e type-safe per interazione con database
  - Configurazione in `drizzle.config.ts`
  - Schema auto-generato da database Supabase
  - Migrazioni gestite tramite `drizzle-kit 0.31.10`

#### Schema Database (principali tabelle)
- **ai_usage**: Tracciamento utilizzo AI (token, durata, modello, provider)
- **chat_conversations**: Conversazioni chat con utente, contesto, titolo
- **chat_messages**: Messaggi delle conversazioni
- **study_contexts**: Contesti di studio (materiali caricati dall'utente)
- **lessons**: Lezioni e mini-lezioni generate
- **evaluations**: Valutazioni cognitive e progressi
- **user_profiles**: Profili utente con preferenze e dati personali
- **user_subjects**: Materie associate all'utente
- **user_routines**: Routine e abitudini di studio
- **subscriptions**: Gestione abbonamenti e pagamenti
- **focus_sessions**: Sessioni di focus con statistiche
- **study_sessions_logs**: Log delle sessioni di studio
- **file_contexts**: Contesti file (PDF, documenti caricati)
- **exercise_jobs**: Lavori di generazione esercizi
- **quiz_results**: Risultati quiz e test

#### Storage
- **Supabase Storage**: Archiviazione file (PDF, immagini, risorse)
- **Local Storage**: Cache client-side per:
  - Persistenza query TanStack Query (24 ore per dominio "lessons")
  - Preferenze utente (tema, lingua)
  - Dati di sessione


### 🔐 **Livello Autenticazione e Sicurezza**

#### Autenticazione
- **Supabase Auth**: Sistema di autenticazione completo con:
  - OAuth providers (Google, Apple, Microsoft)
  - Email/password
  - Magic link
  - Gestione sessioni persistenti
  - Token refresh automatico
- **AuthContext** (`src/contexts/AuthContext.tsx`):
  - Gestione stato autenticazione
  - Invio email di benvenuto al primo accesso
  - Timeout di 2 secondi per lettura sessione iniziale
  - Gestione errori e loading state

#### Sicurezza
- **Protected Routes**: Componenti che richiedono autenticazione
- **Service Worker Guard**: Protezione contro registrazione service worker in iframe/preview
- **CORS e CSP**: Configurazioni di sicurezza lato server


### ☁️ **Livello Cloud e Infrastruttura**

#### Lovable Cloud
- **Piattaforma**: Lovable Cloud (gestibile solo tramite Lovable)
- **Deploy**: Edge functions e frontend tramite Lovable
- **Preview**: Supporto nativo per anteprime in tempo reale
- **Ambienti**: Sviluppo, staging e produzione gestiti tramite Lovable

#### Supabase Project
- **Project Reference**: Configurato tramite variabili d'ambiente (`VITE_SUPABASE_PROJECT_ID`)
- **Edge Functions**: Funzioni serverless per:
  - Invio email di benvenuto (`send-welcome-email`)
  - Elaborazione dati
  - Integrazione con servizi esterni
  - Generazione piani studio (`generate-plan`)
  - Generazione esercizi (`get-lessons`, `scientific-gym`)
  - Text-to-Speech (`text-to-speech`)
  - Gestione profilo cognitivo (`cognitive-profile`)
  - Gestione profilo utente (`user-profile`)
- **Configurazione**: `supabase/config.toml` per definizione progetto

#### Configurazione Ambiente
- **Variabili d'Ambiente**:
  - `VITE_SUPABASE_URL`: URL istanza Supabase
  - `VITE_SUPABASE_PUBLISHABLE_KEY`: Chiave pubblica Supabase
  - `VITE_SUPABASE_PROJECT_ID`: ID progetto Supabase
  - `LOVABLE_DB_MIGRATION_URL`: URL per migrazioni database
  - Variabili per pagamenti (Paddle)
  - Variabili per notifiche push

- **File di Configurazione**:
  - `.env.example`: Template variabili d'ambiente
  - `.env.development`: Configurazione sviluppo
  - `.env.production`: Configurazione produzione


### 🛠️ **Livello Build e Tooling**

#### Package Manager
- **Bun**: Runtime JavaScript/TypeScript usato come package manager e per esecuzione script

#### Linting e Formattazione
- **ESLint 9.32.0**: Linting con configurazione personalizzata
- **TypeScript ESLint 8.38.0**: Plugin TypeScript per ESLint
- **React Hooks ESLint 5.2.0**: Plugin per linting React hooks
- **React Refresh ESLint 0.4.20**: Plugin per linting React Fast Refresh

#### Testing
- **Vitest 3.2.4**: Framework testing unitario e di integrazione
- **@testing-library/react 16.0.0**: Utility per testing componenti React
- **@testing-library/jest-dom 6.6.0**: Matcher DOM per Jest
- **@testing-library/dom 10.4.1**: Utility testing DOM
- **jsdom 29.1.1**: Implementazione DOM per testing

#### Styling Tooling
- **PostCSS 8.5.6**: Processatore CSS con:
  - `autoprefixer 10.4.21`: Aggiunta prefissi vendor
  - `tailwindcss 3.4.17`: Plugin Tailwind
  - `@tailwindcss/typography 0.5.16`: Plugin tipografia Tailwind


### 📱 **Livello Piattaforma e Distribuzione**

#### Target Piattaforme
- **Web**: Applicazione web responsive con supporto PWA
- **iOS**: Supporto tramite Capacitor o wrapper nativo (da configurare)
- **Android**: Supporto tramite Capacitor o wrapper nativo (da configurare)

#### PWA (Progressive Web App)
- **Service Worker** (`src/sw.ts`):
  - Precaching risorse con Workbox
  - Gestione notifiche push
  - Cleanup cache obsolete
  - Gestione navigazione offline
- **Manifest**: Configurazione PWA in `vite.config.ts` con:
  - Nome: "Erga - Ridefinisci lo studio"
  - Tema: #0a0a0a (scuro)
  - Sfondo: #f5f5f5 (chiaro)
  - Icone: 192x192, 512x512
  - Lingua: Italiano
  - Display: Standalone

#### Notifiche Push
- **Web Push API**: Supporto nativo per notifiche browser
- **Service Worker**: Gestione event listener per:
  - `push`: Ricezione notifiche
  - `notificationclick`: Gestione click su notifica


### 📊 **Livello Analisi e Monitoraggio**

#### Tracciamento Utilizzo AI
- **Tabella `ai_usage`**: Registrazione dettagliata di:
  - Token di completamento e prompt
  - Durata elaborazione
  - Modello e provider utilizzati
  - Stato e esito operazioni
  - Associazione con utente

#### Statistiche Studio
- **Focus Stats**: Tracciamento tempo e qualità studio
- **Study Events**: Registrazione eventi di studio (inizio, fine, pause)
- **Evaluations**: Valutazione progressi e competenze acquisite


### 🎯 **Architettura Complessiva**

```
┌─────────────────────────────────────────────────────────────┐
│                      UTENTE (Browser/Mobile)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PWA (Service Worker)                         │
│  - Precaching (Workbox)                                        │
│  - Notifiche Push                                              │
│  - Gestione Offline                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Routing   │  │   State      │  │    UI Components     │  │
│  │ (React      │  │ (TanStack   │  │ (shadcn + Radix +    │  │
│  │  Router)    │  │  Query)     │  │  Tailwind)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Contexts   │  │   Hooks      │  │    i18n              │  │
│  │ (Auth,      │  │ (Custom)     │  │ (i18next)           │  │
│  │  Theme,     │  │             │  │                      │  │
│  │  Focus)     │  │             │  │                      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    INTEGRAZIONI                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  MCP Server  │  │  Lovable     │  │    Supabase Client   │  │
│  │ (AI Tools)   │  │  Auth        │  │ (Database, Storage,  │  │
│  └─────────────┘  └─────────────┘  │   Auth, Functions)    │  │
│                                      └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    LOVABLE CLOUD                                 │
│  - Hosting Frontend                                            │
│  - Edge Functions                                              │
│  - Gestione Deploy e Preview                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  PostgreSQL  │  │   Storage    │  │   Edge Functions     │  │
│  │ (Database)   │  │ (File)       │  │ (Serverless)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Auth (OAuth, Email, etc.)                 │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```


### 📁 **Struttura Cartelle Progetto**

```
erga-2028/
├── public/                    # Risorse statiche (font, icone, immagini)
├── src/
│   ├── App.tsx               # Componente radice applicazione
│   ├── main.tsx              # Entry point React
│   ├── sw.ts                 # Service Worker PWA
│   ├── index.css             # Stili globali e design tokens
│   ├── vite-env.d.ts          # Tipi Vite
│   │
│   ├── components/           # Componenti React
│   │   ├── ui/               # Componenti shadcn/ui
│   │   ├── auth/             # Componenti autenticazione
│   │   ├── chat/             # Componenti chat
│   │   ├── core/             # Componenti Core (Esagono, Materie, Routine)
│   │   ├── focus/            # Componenti Focus/Pomodoro
│   │   ├── home/             # Componenti Home Dashboard
│   │   ├── landing/          # Componenti pagina pubblica
│   │   ├── layout/           # Layout e navigazione
│   │   ├── onboarding/       # Componenti onboarding
│   │   ├── piano/            # Componenti calendario studio
│   │   ├── pratica/          # Componenti esercizi e interrogazioni
│   │   ├── profile/          # Componenti profilo
│   │   ├── settings/         # Componenti impostazioni
│   │   ├── shared/           # Componenti condivisi
│   │   ├── studio/           # Componenti area studio
│   │   ├── subscription/     # Componenti abbonamenti
│   │   └── upload/           # Componenti caricamento file
│   │
│   ├── contexts/             # React Contexts
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   ├── FocusContext.tsx
│   │   ├── SaveStatusContext.tsx
│   │   └── AccessibilityContext.tsx
│   │
│   ├── hooks/                # Custom hooks
│   │   ├── useLessons.ts
│   │   ├── useUserData.ts
│   │   ├── useCognitiveProfile.ts
│   │   ├── useEvaluations.ts
│   │   ├── useHomeDashboard.ts
│   │   ├── useStudyEvents.ts
│   │   ├── useStudyTutor.ts
│   │   ├── useSubjectAccent.ts
│   │   ├── useProfileData.ts
│   │   ├── useUserSubjects.ts
│   │   ├── useUserRoutines.ts
│   │   ├── useGenerationUsage.ts
│   │   ├── usePushNotifications.ts
│   │   ├── useFileContexts.ts
│   │   ├── useCognitiveProfile.ts
│   │   ├── useDelayedLoading.ts
│   │   ├── useHaptics.ts
│   │   ├── useKeyboardInset.ts
│   │   └── ... (30+ hooks)
│   │
│   ├── lib/                  # Librerie e utility
│   │   ├── mcp/              # MCP Server e tools
│   │   │   ├── index.ts
│   │   │   └── tools/
│   │   ├── autoContrast.ts
│   │   ├── courseIdentity.ts
│   │   ├── subjectColors.ts
│   │   ├── chatProtocol.ts
│   │   ├── cognitiveQuestions.ts
│   │   ├── cognitiveArchetype.ts
│   │   ├── edgeFetch.ts
│   │   ├── exerciseQuality.ts
│   │   ├── focusStats.ts
│   │   ├── homeDashboard.ts
│   │   ├── imageCompression.ts
│   │   ├── lessonExercises.ts
│   │   ├── lessonModules.ts
│   │   ├── lessonParts.ts
│   │   ├── auth.ts
│   │   ├── onboardingGate.ts
│   │   ├── paddle.ts
│   │   ├── pdfPageRenderer.ts
│   │   ├── pianoPalette.ts
│   │   ├── routineLayout.ts
│   │   ├── sourcePaths.ts
│   │   ├── subjectFamily.ts
│   │   ├── weekPlanner.ts
│   │   ├── widgets.ts
│   │   └── wikipediaImage.ts
│   │
│   ├── integrations/         # Integrazioni esterne
│   │   ├── supabase/
│   │   │   ├── client.ts     # Client Supabase
│   │   │   └── types.ts      # Tipi TypeScript auto-generati
│   │   └── lovable/
│   │       └── index.ts      # Integrazione Lovable Auth
│   │
│   ├── pages/                # Pagine applicazione
│   │   ├── Index.tsx         # Dashboard principale
│   │   ├── Landing.tsx       # Pagina pubblica
│   │   ├── Login.tsx         # Pagina login
│   │   ├── Registrati.tsx    # Pagina registrazione
│   │   ├── ChangePassword.tsx # Cambio password
│   │   ├── AuthCallback.tsx   # Callback OAuth
│   │   ├── OAuthConsent.tsx   # Consenso OAuth
│   │   ├── FocusStats.tsx    # Statistiche focus
│   │   ├── NotFound.tsx      # Pagina 404
│   │   ├── Profile.tsx       # Profilo utente
│   │   └── settings/         # Pagine impostazioni
│   │       ├── SettingsIndex.tsx
│   │       ├── SettingsAccount.tsx
│   │       ├── SettingsAppearance.tsx
│   │       ├── SettingsAccessibility.tsx
│   │       ├── SettingsLanguage.tsx
│   │       └── SettingsTerms.tsx
│   │
│   ├── i18n/                # Internazionalizzazione
│   │   ├── index.ts
│   │   └── locales/
│   │       ├── it.json
│   │       └── en.json
│   │
│   └── assets/               # Risorse locali
│
├── drizzle/                  # Configurazione Drizzle ORM
│   ├── config.ts
│   └── migrations/           # Migrazioni database
│
├── supabase/                 # Configurazione Supabase
│   ├── config.toml
│   ├── functions/           # Edge Functions
│   └── migrations/          # Migrazioni Supabase
│
├── scripts/                 # Script utilità
├── .lovable/                 # Configurazione Lovable
├── .github/                  # Configurazione GitHub
│
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── README.md
```


### 🔧 **Comandi Principali**

| Comando | Descrizione |
|---------|-------------|
| `bun install` | Installa dipendenze |
| `bun run dev` | Avvia server sviluppo (porta 8080) |
| `bun run build` | Build per produzione |
| `bun run build:dev` | Build per sviluppo |
| `bun run lint` | Esegue linting |
| `bun run test` | Esegue test |
| `bun run test:watch` | Esegue test in watch mode |
| `bun run preview` | Anteprima build |


### 📝 **Convenzioni e Best Practice**

1. **Code Splitting**: Utilizzo di `React.lazy()` per lazy loading delle pagine
2. **Type Safety**: Tutto il codice è tipizzato con TypeScript
3. **Accessibilità**: Componenti Radix UI garantiscono accessibilità out-of-the-box
4. **Performance**: TanStack Query con caching intelligente e refetch ottimizzato
5. **Design System**: Utilizzo coerente dei token definiti in `src/index.css` / `tailwind.config.ts` e `DESIGN.md` **v4.0 «Swiss Cognitive Grid + Tactile Studio»**.
6. **Error Handling**: ErrorBoundary per gestione errori a livello applicazione
7. **Loading States**: SplashScreen e stati di loading gestiti tramite Suspense
8. **PWA**: Service worker configurato per non registrarsi in iframe/preview


### 🚀 **Deploy e CI/CD**

- **Piattaforma**: Lovable Cloud (gestibile solo tramite Lovable)
- **Deploy**: Automatico tramite Lovable al push su main
- **Preview**: Generazione automatica anteprime per ogni commit
- **Migrazioni**: Gestite tramite Drizzle ORM e Supabase
- **Variabili d'Ambiente**: Configurate tramite Lovable e file `.env.*`

L'agente che lavora nel repository **non esegue** migrazioni né deploy: prepara per il proprietario un prompt da incollare in Lovable. Il prompt deve elencare **solo** i file e le funzioni realmente modificati o aggiunti, nella forma prevista da `AGENTS.md` e `docs/external-agent-prompt.md`:

```
Sincronizza il repository (branch main) e:
1. Applica queste migrazioni SQL (elenca i file in supabase/migrations/):
   - <nome_file>.sql
2. Deploya queste Edge Function:
   - <nome_funzione>
3. Rigenera i tipi TypeScript Supabase se ci sono nuove tabelle o colonne.
```

Se una modifica riguarda solo il frontend (`src/`), non serve alcun deploy: è sufficiente la sincronizzazione del repo e **Update** in Lovable per vedere il risultato. Un esempio completo e già pronto, con i controlli di accettazione, è in `docs/LOVABLE_STUDIO_MATERIAL_REJECTION.md`.


---

*Ultimo aggiornamento: 25 ottobre 2026 — documenti riallineati al design system v4.0 e allo stato reale della suite (728 test verdi)*
*Design System: v4.0 "Swiss Cognitive Grid + Tactile Studio" — fonte autorevole: `DESIGN.md`*
