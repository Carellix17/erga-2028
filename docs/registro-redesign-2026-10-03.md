# Registro del redesign — Erga

**Aperto:** 3 ottobre 2026 · **Aggiornato:** 5 ottobre 2026 (V2-01 pilota)
**Fonte di verità grafica:** `DESIGN.md` versione 2.1 «Carta contemporanea» (integrata il 5 ottobre 2026, commit di V2-00).
**Runtime:** il pilota V2-01 è nel repository: **Home, lezione (lettore), shell e navigazione sono in veste 2.1**; il resto (strumenti, Piano, Core, impostazioni, landing/accesso) mostra ancora stili v1 ripuntati sui token — si migra nelle tappe del rollout.
**Base di partenza sequenza 1:** commit `f54e237` (stato del repository verificato dalla specifica v1: Pratica assorbita da Studio, palestra scientifica, otto widget, motori per materia).

Questo è l'**unico registro** dei lavori del redesign: stato dei pacchetti, cosa esiste già, punti aperti.
Chi lavora a un pacchetto aggiorna qui lo stato.

**Cronologia delle direzioni (per non confondere le fonti):**

1. **Bisturi Editoriale** — prima veste, sostituita il 3 ottobre 2026 (le sue scelte restano vietate: rosso lacca, Playfair/Inter/Roboto Mono, ossidiana obbligatoria, immagini sempre in bianco e nero, «mirino laser»).
2. **Versione 1.1 «Ottanio»** — specifica del 3 ottobre 2026, eseguita nei pacchetti D0–D3. **Chiusa come storica** il 5 ottobre: è ancora la veste visibile nel runtime, ma le sue prescrizioni (angoli squadrati, raggio 0, ottanio, Ubuntu Sans obbligatorio, «non introdurre altro accento») **non guidano più i lavori**.
3. **Bozza 2.0** — discussa solo in conversazione col proprietario il 5 ottobre, **mai presente nel repository**: non c'è nulla da archiviare nei file; è assorbita e sostituita dalla 2.1.
4. **Versione 2.1 «Carta contemporanea»** — specifica del proprietario del 5 ottobre 2026, allegata e integrata **verbatim** in `DESIGN.md`. È la direzione **corrente**.

I vecchi pacchetti D4–D13 della sequenza 1 (righe qui sotto) **non si eseguono**: la loro sequenza è stata sostituita dal piano V2. Le evoluzioni funzionali che contenevano restano lavoro futuro separato.

---

## 1. Le decisioni vincolanti (dal proprietario, 5 ottobre 2026 — DESIGN.md 2.1)

- **Direzione «carta contemporanea»**, riferimento all'atmosfera delle due immagini Granola: **non** una copia di logo, spirale, illustrazioni, testi, asset, sfondi o impaginazioni. Né una traduzione in «UI beige con pillole nere», né glassmorphism diffuso.
- **Quattro materiali con ruoli stabili:** fondo avorio · carta opaca (lettura, campi, composer, calendario, grafici) · copertina colorata (colore materia + composizione astratta + grana) · velo satinato **locale alle copertine**. Continua/Riprendi/Scegli sono satinati a pillola sulle copertine anche quando primari; nel resto del prodotto le azioni primarie sono **inchiostro**.
- **Tipografia:** Lora 400/500 (titoli) + Inter 400/500/600 (lettura, interfaccia) come **proposta iniziale da validare**; KaTeX preservato.
- **Geometria come gerarchia:** raggi 8 (dettagli) · 16 (controlli) · 24 (card) · 32 (fogli protagonisti, sheet) · 24 (dock) · pill (azioni).
- **Identità del corso stabile tra le viste** (Home, Studio, selettore, modulo, lezione; colori personali e fallback inclusi; un'unica risoluzione corso→materia→palette).
- **Movimento con matrice:** durate per trigger, continuità nelle transizioni corso→percorso→modulo→lezione, **movimento ridotto definito per ciascun pattern**.
- **I colori materia esistenti sono dati:** identificatori conservati, resa di superficie adattata nel registro condiviso; gli accenti 2.1 (cedro, rosa carta, pervinca, albicocca, azzurro polvere) servono le composizioni, non diventano pulsanti.
- **Validazione su vere schermate e veri flussi:** un mockup è dichiarato tale, non prova del prodotto.
- **V2-00 non è il rollout globale**; V2-01 (pilota) parte solo dopo decisione del proprietario; niente copia in blocco dei vecchi pacchetti come nuovi incarichi.
- **Nessun cambiamento** a backend, autenticazione, dati, pagamenti; nessuna migrazione o deploy Lovable. Le skill del progetto si usano senza lasciare che sostituiscano la direzione approvata.

**Superate (archivio v1, 3 ottobre):** angoli squadrati/raggio 0; saluto Ubuntu Sans da conservare; palette ottanio `#087F83` come base proposta; navigazione a barretta `bg-brand`; «non introdurre altro accento».

## 2. Stato dei lavori

### Sequenza 1 — versione 1 (STORICA, 3 ottobre 2026: chiusa)

| Pacchetto | Contenuto | Stato |
|---|---|---|
| **D0 — Identità e documentazione** | DESIGN.md 1.1 integrato, `design.json` schema 2, AGENTS/Matrice/Minilezione riconciliate | ✅ fatto, 3 ottobre (`e139f67` + fix `bfd6b62`) — **archiviato da V2-00** |
| **D1 — Fondamenta** | Token runtime v1 (ottanio, raggio 0), grammatica componenti, revisione `noGreen.test.ts` | ✅ runtime consegnato (`5e9e689` + fix `c4df732`) — **visibile ancora oggi** |
| **D2 — Navigazione e Home** | Dock rettangolare + rail 768–1199 + sidebar ≥1200; Home ordine §10 v1 | ✅ runtime consegnato (`c9b5860`) — **visibile ancora oggi**; anteprima `docs/anteprima-navigazione-home-d2.html` |
| **D3 — Studio e card** | Migrazione literal→token su selettore/percorso/moduli/lezioni; transizioni audited | ✅ runtime consegnato (`eb23855`) — **visibile ancora oggi** |
| **D4–D13 — resta della sequenza 1** | Esercizi/Piano, Core/landing, evoluzioni funzionali… | ❌ **mai avviati, superati** dal piano V2 (5 ottobre) |

### Sequenza 2 — versione 2 (ATTUALE, 5 ottobre 2026)

| Tappa | Contenuto | Stato |
|---|---|---|
| **V2-00 — Allineare le fonti** | DESIGN.md 2.1 integrato verbatim (frontmatter token di destinazione + nota d'integrazione), `design.json` rigenerato, AGENTS.md/Matrice/Minilezione riconciliate solo nella parte grafica, registro aggiornato, inventario test di stile col piano di migrazione. **Nessun file in `src/` toccato; nessun Update Lovable necessario** (documentazione). | ✅ **fatto, 5 ottobre 2026** |
| **V2-01 — Pilota** | Home completa + lettore lezione col minimo sistema condiviso (token 2.1, Lora/Inter, materiali, dock/rail/sidebar, identità corso centralizzata con contrasto garantito), formule KaTeX verificate. Dati reali nella UI. Preview live apribile. | ✅ **consegnato 5 ottobre 2026 — in attesa di valutazione del proprietario prima del rollout** |
| **Rollout — 6 tappe** | 1 sistema+shell · 2 Studio/card/selettore/transizioni · 3 lettore+widget+strumenti · 4 Piano/Core/impostazioni · 5 landing/accesso · 6… | ⬜ dopo la valutazione del pilota (piano completo in DESIGN.md 2.1 §18) |
| **Evoluzioni funzionali** | Prerequisiti consigliati, scene didattiche v2, impegni in linguaggio naturale, metriche Core | ⬜ incarichi separati, mai nel redesign visivo |

**Regola di advancement (invariata):** niente riscrittura totale in un colpo solo; migrazione progressiva, componenti condivisi, rimozione degli stili soppiantati senza stratificare override.

## 3. Cosa esiste già nel prodotto (verificato nel repository al commit `f54e237`; invariato)

Presenza nel codice **non** significa pubblicato online: i deploy passano da Lovable.

- **Otto widget didattici** costruiti a mano (parabola, retta, proiettile, piano inclinato, pH, gas, mercato offerta/domanda, esecutore di codice in Web Worker) con catalogo JSON condiviso validato e clampato — uniformarli prima di aggiungerne altri.
- **Feedback aptico** già presente (`useHaptics` e utility condivise): consolidarlo, non ricrearlo.
- **Palestra scientifica** (matematica/fisica/chimica): esercizi numerici con tolleranza e virgola decimale, suggerimenti progressivi, soluzione passo-passo, tutor socratico.
- **Strumenti in Studio** (la sezione Pratica non esiste più): chat, esercizi, interrogazione e palestra come strumenti del Banco, raggiungibili anche dalla Home.
- **Motori per materia** (fiume del backend): scientifico (DeepSeek V4 Flash via OpenRouter + formule + widget), letteratura, storia/geografia, filosofia, lingue vive, latino, storia dell'arte; sociali e informatica rinviati a più tardi.
- **KaTeX** con output MathML accessibile; **i18n** it/en; colori materie e routine (informano, non decorano); vetrina marketing isolata (`--lp-*`); fondamenta dati v1/v2 (compatibilità dei percorsi v1 da mantenere).

## 4. Il runtime oggi (dichiarazione onesta, post V2-01 + V2-02)

**Veste 2.1 nel pilota:** Home (saluto serif compatto, copertina corso con composizione astratta + satinato, piano del giorno su carta, strumenti rapidi), lettore lezione (titoli Lora, lettura Inter 18px, esempio/callout con accento materia, azione primaria inchiostro), shell e navigazione (dock arrotondato, rail 768–1023, sidebar ≥1024), token globali (tavolo avorio #F6F3EB / notte #22211F, carta #FFFEF9 / #2D2C29, inchiostro #252623, raggi 8/16/24/32/pill, Lora+Inter caricati).

**Ancora v1 (ripuntata sui token, da migrare nelle tappe):** strumenti del Banco (chat/esercizi/interrogazione/palestra), Piano, Core, impostazioni, profilo, landing/accesso (Radja al Login), onboarding. La selezione `brand-*` e i chip `primary/10 + brand-deep` sono ora inchiostro per propagazione dei token.

- V2-00/V2-01 sono nel repository; la pubblicazione su Lovable (Update, solo frontend) **non è mai stata confermata dal proprietario** — il pilota si valuta nella preview o dopo un Update.
- Verifica visiva: il pilota è apribile in preview (server di sviluppo); **nessuno screenshot è stato verificato dall'agente** (nessun browser nel suo ambiente). La qualità visiva la valuta il proprietario.

**Verifiche eseguite in V2-00 (5 ottobre 2026):** YAML del frontmatter di `DESIGN.md` valido (39 colori, 8 ruoli tipografici, 7 raggi, 10 spacing, 7 componenti); `context.mjs` legge la 2.1 senza errori; `design.json` valido e letto dal detector (14 segnalazioni, **tutte in `src/index.css`**: 7 Montserrat, 5 colori, 2 raggi — è il gap v1→v2.1 atteso, concentrato nel file dei token, si chiude in V2-01); suite **625 pass / 13 fail pre-esistenti** identica alla baseline D3; `noGreen` verde; `tsc --noEmit` OK; `vite build` OK. Controlli **non** eseguiti: verifica visiva in app e screenshot (nessuna schermata è cambiata; il runtime resta veste 1).

### V2-01 — cosa è entrato nel runtime (5 ottobre 2026)

**Sistema condiviso (minimo indispensabile):**
- **Token 2.1 in `index.css`/`tailwind.config.ts`** (stessi nomi, nuovi valori): tavolo avorio `#F6F3EB` / notte `#22211F`, carta `#FFFEF9` / `#2D2C29`, inchiostro `#252623` / notte `#F4F1E7`, line `#DEDCD2`/`#4B4842`, control-line `#888B7A`/`#918B80`; raggi 8/16/24/32 + nav 24 + pill 999 (aggiunti `--radius-hero/nav`); ombre corte (foglio/protagonista/overlay) senza aloni; motion + `--motion-path 360ms` e curva di casa `cubic-bezier(0.22,1,0.36,1)`. **Marca e selezione = inchiostro** (`--brand/-deep/-tint` ripuntati; l'ottanio #087F83 non esiste più nel tema). `theme-color` → `#22211F`/`#F6F3EB`.
- **Font:** link Google → **Lora + Inter variable 400–700**; `font-display/serif` = Lora, `sans/body/reading` = Inter; Ubuntu Sans, Montserrat e Zalando Sans eliminati dai ruoli (Radja resta self-hosted al solo Login). Pastelli materia **vivificati** (erano in monocromo grigio dal P24) giorno+notte; fix `pastel-bosco/oliva` mai mappate in Tailwind.
- **`src/lib/courseIdentity.ts` (nuovo):** UNICO punto corso→materia→palette. Famiglia light/deep assegnata alla materia (non tutte le copertine uguali), **campo con contrasto ≥ 4,5:1 garantito iterativamente**, layout 0–2 stabile per corso, personalizzazioni (`customKey`) e fallback inclusi, variabili `--contrast-ink` per il testo.
- **`CourseCardBackground` riscritto:** campo pieno + 2–3 forme nette per variante (orbita/orizzonte/spigolo) + **grana condivisa** (feTurbulence 5%, `cover-grain`). Niente più orb sfocati, né cover Wikipedia sfocate, né gradienti.
- **Velo satinato `.btn-satin`:** carta 80% giorno / 85% notte, blur locale 10px, testo opaco, bordo discreto, focus separato, fallback carta piena (`@supports` / reduced-transparency / high-contrast). Solo su Continua/Riprendi/Scegli delle copertine.

**Home:** saluto serif compatto 32/40/48px (Lora 500, due righe accessibili); `CourseHeroCard` riscritto (copertina raggio 32, anello progresso, titolo Lora, CTA satinata a pillola; stato vuoto breve su carta); piano del giorno su carta quieta (chip 14px, «Vedi tutto» sobrio); strumenti rapidi come card; skeleton allineato.

**Lezione (lettore):** concetto = titolo di scena Lora 500; spiegazione Inter 18px lh 1.65 su carta con filetto; esempio e callout con accento materia (`subject-callout` riallineato: tinta 9% + bordo 30%); esercizi su carta; primario inchiostro a pillola; **KaTeX/MathML intatto** con scroll locale per formule/tabelle larghe (`.katex-display`, `.prose table`). Nessun contratto v2, nessuna nuova chiamata backend: logica step/quiz/figure/ripresa invariata.

**Shell e navigazione:** dock mobile **arrotondato** (radius-nav 24, carta opaca, ombra overlay, safe area), selezione **inchiostro senza barrette**; rail 768–1023; **sidebar da 1024** (decisione del pilota sulla contraddizione D2 ≥1200 vs 2.1 §10 ≥1024); via `bg-dot-grid` (tavolo piatto); rimossi il **sistema aura/halo** (P26/P27), la pagina dev `/aura-lab` e i token glass P34 (nessun consumatore rimasto).

**Condivisione minima con Studio (autorizzata dall'incarico):** `CourseCard` e `PathHero` usano il nuovo sistema copertina (stessa identità del corso tra viste) con CTA satinata su CourseCard; rimossi gli orb decorativi e `data-auto-contrast` dalle copertine (l'inchiostro ora è esplicito per famiglia; lo script autoContrast resta per StudioPractice fino alla tappa 2).

**Verifiche eseguite:** suite **631 pass / 13 fail pre-esistenti** (AppHeader 12 + haptics 1; baseline 625→631 per i nuovi test); `tsc` OK; `vite build` OK; detector 16 segnalazioni tutte in `index.css` (10 = Inter segnalato come font comune: **scelta deliberata della specifica 2.1 §5**; 4 colori e 2 raggi letterali in zone legacy/vetrina → tappa 5); **nuova suite `courseIdentity.test.ts`**: contrasto ≥ 4,5:1 per ogni materia, personalizzazione e fallback, sui campi E sui compositi satinati giorno/notte; test aggiornati senza cancellazioni (appShell 10, homeCleanSurfaces 10, HomeHeader 7, HomeView, creamNotWhite panna #F4F1E7, ThemeContext, pathHeroPicker, courseCardBackground 5).

**Controlli NON eseguiti (dichiarati):** nessuna verifica visiva con browser/screenshot (ambiente senza browser): 320/390/768/1280, zoom 200%, tastiera/focus reale, movimento ridotto reale e resa dei font vanno valutati dal proprietario nella preview; nessun flusso con dati reali alterato (nessuna risposta inviata, nessuna lezione completata, nessun impegno toccato).

### V2-02 — grana della carta sulla Home (6 ottobre 2026)

**Incarico:** matericità della carta soltanto — layout, font, palette, raggi, ombre, navigazione e comportamento invariati. Grana finissima e irregolare ispirata alle reference Granola, **senza** i puntini chiari grandi e il retino decorativo (non implementati, come richiesto). Ambito: solo Home.

**Texture (riuso, non nuovo rumore):** la grana riusa **la stessa texture delle copertine V2-01** (SVG `feTurbulence` fractalNoise, `baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'`, 160×160, data-URI inline locale e statico) — così «una sola texture condivisa» come chiede la §Grana di DESIGN.md e senza sovrapporre due rumori diversi. Nessun asset Granola ritagliato; statistiche misurate sulle due reference (senza visione, via analisi numerica): la grana fine ha std ≈ 1–2/255 nelle zone piatte e vive nella banda 0,3–0,5 cicli/px, coerente con la frequenza 0,9 del tile esistente. Scala fissa `--grain-scale: 160px`: telefono e desktop vedono la stessa grana, mai stirata sul contenitore.

**Implementazione:** la grana è **sempre un background-image**, mai pseudo-elementi né z-index: dipinta sotto testo e controlli per costruzione, non può intercettare click né entrare nell'albero accessibile, e nessun contenitore con contenuto riceve opacity. L'intensità della carta è **cotta nel canale alpha del tile** (`feFuncA slope`): giorno `0.02` (velo ~2%, quota «fondo avorio / carta di accoglienza» della §Grana), notte `0.012` (più quieta, scelta esplicita per tema — nessuna inversione automatica). Blend `multiply` giorno / `screen` notte come le copertine, dichiarato nel token `--grain-blend`. La primitiva `.paper-grain` si spegne con `prefers-reduced-transparency` e in `html.high-contrast`. **Copertine invariate:** 5%/7% via token (`--grain-alpha-cover`), già al limite alto della banda 3–5% — non alzate per non far competere il velo col testo; ora però condividono `--grain-tile`/`--grain-scale`/`--grain-blend` (resa identica, sorgente unica).

**Dove è attiva:** fondo della Home = `#app-scroll-view` in `AppLayout` con gate `isHome && "paper-grain"` (su desktop è la content-card avorio, su mobile il contenitore trasparente che copre il tavolo visibile — le altre schede restano lisce); superfici carta = `DailyTimeline` (entrambe le sezioni), pulsanti di `QuickToolsGrid`, stato vuoto di `CourseHeroCard`, card di errore di `HomeView`, tre card dello skeleton. **Mai** sullo stato attivo della copertina (avrebbe doppia grana), sul dock/navigazione, su Studio, lezioni, formule, campi, composer, calendario, grafici. Il satinato di Riprendi/Continua è intatto (stesse regole `.btn-satin` di V2-01: nessuna grana aggiunta, nessun blur in più, nessuna ombra nuova).

**Verifiche eseguite:**
- **Suite: 638 pass / 13 fail pre-esistenti** (baseline 631 → +7 del nuovo `paperGrain.test.ts`; i 13 fallimenti sono gli stessi AppHeader 12 + haptics 1). `noGreen` verde. Test esistenti aggiornati senza cancellazioni (solo wording in `appShellDesignSystem` sul tavolo).
- **`tsc -b`: 1 errore PREESISTENTE a `72f0975`** (dimostrato con stash su HEAD pulito): `StudioPractice.tsx:152` passa ancora le props pre-V2-01 (`coverUrl`/`subjectColor`/`variant`) al `CourseCardBackground` riscritto. Fuori dall'ambito V2-02 (Studio, non grafica): da sistemare nella tappa Studio. Nessun errore nuovo introdotto.
- **`vite build` OK** (104 voci precache, sw generato). **Detector: 16 segnalazioni, identiche alla baseline V2-01** (tutte preesistenti in `index.css`); la grana non ne aggiunge.
- **Confronto prima/dopo della Home reale** (novità di questa tappa): browser headless Chromium+Playwright sull'app servita da vite, con sessione sintetica e **fixture dichiarate** (`/home/user/verify-tools/shots.mjs`: intercettazione LOCALE delle chiamate Supabase — auth, REST, edge function del profilo cognitivo — e websocket realtime chiuso localmente; **nessun dato del proprietario letto o modificato, nessun backend toccato**). Stessi dati, viewport (390×844 e 1440×900), tema (giorno/notte), zoom 200% (deviceScaleFactor 2) e posizione di scroll (240px) fra le due run. Screenshot in `/home/user/screenshots/{prima,dopo}`, ritagli affiancati in `/home/user/screenshots/confronto`.
- **Misure numeriche** (PNG lossless, analisi su canale grigio): grana presente e sottile in tutte le condizioni — Δ std giorno desktop 0,49/255, notte 0,35 (rapporto ~0,7 = notte più quieta), telefono ~0,5, zoom 200% 0,49; direzione coerente coi blend (giorno scurisce p1 −1,0 / p99 0,0; notte schiarisce p1 0,0 / p99 2,0); **pixel dei glifi praticamente identici** (|Δ| medio 0,185/255 sui bordi dei caratteri: la grana sta sotto il testo); FFT del fondo senza righe spettrali alle frequenze del tile → **nessuna giunta visibile**; nessuna ripetizione percepibile (rumore aperiodico).

**Limiti dichiarati:** l'agente non ha visione — le misure numeriche confermano presenza, sottigliezza, direzione e assenza di giunte, ma **il giudizio estetico (grana invisibile? patina grigia? troppo visibile?) resta al proprietario** sui ritagli affiancati e sulla preview; le schermate usano fixture dichiarate, non i dati reali del proprietario (nessun account disponibile, nessuna registrazione voluta: sarebbe una scrittura sul backend); i valori 2%/1,2% sono la partenza calibrata numerica della specifica, non un sostituto dell'occhio.

**Nota Evoluzionismo (incoerenza registrata, NON corretta — vedi §6):** verificato eseguendo i due sistemi: in Home `resolveCourseCover("Evoluzionismo")` non trova keyword (`"evoluzione"` non è contenuta in `"evoluzionismo"`) e cade nel fallback hash-stabile → materia **geografia → oliva** (famiglia deep, campo #2E3028). In Studio il modulo (`StudioView` → `ModuleHeaderCard`) passa `subjectColor` al `CourseCardBackground` con le **props pre-V2-01** che il componente riscritto ignora: la copertina del modulo usa il default (`storia`, campo #392E28), non l'identità del corso — l'azzurro osservato dal proprietario arriva quindi da una terza via di risoluzione (es. chip/pastel per materia salvata), conferma che **tre sistemi convivono** (hash del nome, keyword legacy, materia salvata). Da allineare nella tappa dedicata, come da incarico. *Aggiornamento V2-02b: il commit altrui `51c3e77` ha corretto la chiamata in StudioPractice (`courseName={courseTitle || moduleTitle}`): il tipo ora torna a essere `storia`-default→identità del corso, non più rosso-default. L'incoerenza cromatica Home/Studio resta aperta (hash vs keyword/salvata) e resta rinviata alla tappa allineamento.*

### V2-02b — calibrazione della grana (6 ottobre 2026)

**Incarico:** alzare la matericità della Home agendo SOLO sull'intensità della grana V2-02 (asset, scala e architettura invariati; niente secondo rumore, niente puntini, niente modifiche a layout/typography/copertine). Base richiesta: tavolo ~4–5% giorno / 2,5–3% notte; fogli ~2,5–3,5% giorno / 1,5–2% notte, da calibrare sul composito reale. Basi: HEAD `51c3e77` (integra i commit altrui successivi a `b2161c8`: pulsanti Home `rounded-pill`, fix `StudioPractice:152`, mock `useSubscription` nei test AppHeader — preservati).

**Cosa misura davvero slope (verifica richiesta):** il parametro `feFuncA slope` moltiplica l'alfa del rumore, ma la visibilità dipende dal composito: `multiply` scurisce ≈ linearmente (Δmedio ≈ −30×slope/255), mentre `screen` di notte schiarisce ~×1,8 il multiply a parità di slope (misurato: +1,2÷3/255 a slope 0,028–0,04 = patina chiara incombente). Le percentuali nominali non provano nulla: calibrazione fatta misurando il Δ pixel su screenshot del composito reale (browser headless, fixture dichiarate) con tile candidato iniettato a runtime.

**Implementazione:** due ruoli condivisi sullo STESSO tile sorgente e sulla stessa scala (160px): `--grain-table-tile` (tavolo: **4,8% giorno / 2,5% notte**) e `--grain-paper-tile` (foglio: **3% giorno / 1,6% notte**), classe `.table-grain` per il fondo (gate `isHome` in AppLayout) e `.paper-grain` per i fogli (componenti Home, invariati). Fallback `prefers-reduced-transparency` e `html.high-contrast` estesi a entrambe le classi. Copertine, satinato, dock, layout: intatti.

**Misure prima/dopo** (visibilità assoluta no-grana→versione, finestre dentro i bounding box DOM di tavolo/fogli, screenshot 390/1440 giorno/notte, zoom 100 e 200 — fixture isolate in `verify-tools/{calib,zoff,shots,rects,interactions}.mjs`, nessun dato del proprietario toccato):

| | V2-02 (prima) | V2-02b (dopo) |
|---|---|---|
| Tavolo giorno Δstd / Δmedio | 0,49 / −0,58 | **0,58 / −1,50** (−0,6%: nessuno scurimento) |
| Foglio giorno | 0,49 / −0,58 | **0,34–0,36 / −0,95** |
| Tavolo notte | 0,21–0,35 / +0,97 | **0,65–0,66 / +0,9÷1,9** (schiarimento ≤2/255) |
| Foglio notte | 0,34–0,36 / +0,97 | **0,44–0,45 / +1,2** |

Zoom 200% = zoom 100% (Δ identici: scala stabile, texture mai stirata). Rapporto di fase x/y mod 160: 1,14–1,22 (nessuna giunta/ripetizione percepibile). Glifi: |Δ| 0,32–0,36/255 (grana dietro il testo). Interazioni verificate: gate per-tab (Studio senza grana, ritorno Home con grana), dock senza grana, «Vedi tutto» 3→4 righe, nessun layer grana sotto il puntatore. Contrasto testo: invariato per costruzione (il velo sta sotto il background-color degli elementi con testo).

**Verifiche:** suite **650 pass / 2 fail pre-esistenti** (baseline 51c3e77: 649/2, stessi AppHeader 1 + haptics 1; +1 controllo nel test grana riscritto per relazioni ruolo/tema, non per valori copiati); **`tsc -b` 0 errori** (il fix altrui ha chiuso l'errore preesistente segnalato in V2-02); `vite build` OK (104 precache); detector 16 segnalazioni invariati (tutte preesistenti in `index.css`).

**Limiti dichiarati:** l'agente non ha visione — le misure confermano percezione misurabile (Δstd raddoppiato sul tavolo), direzione coerente, niente patina numerica, ma **la validazione estetica è di Codex sul sito dopo l'Update** (come da incarico). Ritagli affiancati in `screenshots/confronto-v2-02b/` (tavolo/foglio, giorno/notte, anche a 3 colonne no-grana/V2-02/V2-02b). La notte è la condazione più sensibile (lo screen schiarisce): se Codex vede patina chiara sul tavolo notturno, il primo giro di calibrazione è `--grain-table-tile` notte da 0.025 → 0.02.

**Flusso di pubblicazione:** commit su `main` via Git (nessun reset/force). Nessun Publish/Update eseguito da Arena: l'Update dell'editor Lovable è di Codex, autorizzato dal proprietario.

### Questioni minori (6 ottobre 2026, post V2-02b — decisioni del proprietario)

**Navbar mobile:** torna **la pillola allungata con lo slider superfluido** (la forma di `e4077d5`, pre-D2), con i colori attuali: dock a pillola `rounded-pill` in carta opaca, sotto-pillola `layoutId="activeTabBackground"` (molla 400/30) in **inchiostro** con contenuto su carta; rail/sidebar desktop invariate. Il test di appShell difende ora questa decisione (che aggiorna la prescrizione V2-01 «dock raggio 24»).

**Barra di stato:** niente più **serie** né **piano** nei controlli (via `useHomeDashboard` e il bottone abbonamento dall'header). Nota: la pagina del ritmo (`/app/ritmo`) resta raggiungibile solo via URL — nessuna voce la apre ora; da decidere se riportarla altrove (es. Piano o Core).

**Wordmark + piano sulla Home del telefono:** «Erga» (Lora, `<p>` non cliccabile) torna sulla Home — era sparito nella riscrittura V2-01, ed è il motivo del test AppHeader rosso da allora (ora verde) — con accanto, sullo stesso livello e solo da telefono (`md:hidden`), il **tasto del piano** (Free/Pro/Beta) che porta alle Impostazioni. Su desktop e nelle altre sezioni il tasto non esiste.

**Carta del piano nelle Impostazioni** (`SettingsPlanCard`, in cima a SettingsIndex): parla la lingua delle copertine dei corsi — campo **cedro** (nuovo token `--cedro: 67 71% 69%` = #DCE879, accento documentato in DESIGN.md 2.1 §4), forme nette, grana condivisa `cover-grain`, raggio protagonista 32, nome del piano in serif Lora. Per gli utenti **Free**: «Passa a Pro» apre per ora un **empty state onesto** («siamo ancora in rollout beta, nessun acquisto possibile»); Beta/Pro mostrano il riconoscimento/il piano attivo senza azione. i18n it+en (`settings.plan.*`).

**Fix `useSubscription` (bug reale scoperto dalla verifica):** il canale realtime aveva nome fisso `sub-${userId}`: con due consumatori sulla stessa pagina (header + carta, o header + impostazioni account) supabase-js riusa il canale già sottoscritto e rifiuta nuove callback → ErrorBoundary. Nominato univoco per istanza. Bug latente già dall'introduzione del bottone piano nell'header (commit altrui).

**Verifiche:** suite **657/657 — tutta verde, anche i 2 fail preesistenti risolti** (wordmark assente → test ora difende la nuova riga Erga+piano; haptics SettingsIndex → mock `useSubscription`); test nuovi `settingsPlanCard.test.tsx` (5) e AppHeader riscritto sulla nuova barra; `tsc -b` 0 errori; build OK; detector 0 segnalazioni sui file toccati. Verifica in browser headless (fixture dichiarate, intercettazione locale, nessun dato toccato): pillola 85×56px che scivola tra le voci (misurata 25→195px Home→Studio), tasto piano nascosto su desktop (`offsetParent` null), carta con campo rgb(219,232,120) e titolo Lora, empty state apribile, notte compilata. Screenshot in `screenshots/minori/`. Nessuna modifica backend; Paddle/non toccati.



### Correzioni del proprietario (6 ottobre 2026, sera — colore percorso, contrasti, navbar)

**Copertina del percorso: Home = Studio.** PathHero (hero inline e hero nel portale) e CourseCard del selettore risolvevano la copertina dal `file_name` GREZZO, mentre la Home passa il nome pulito (`cleanCourseName`): il rilevamento materia non cambia, ma la **variante di composizione nasce dall'hash del nome** → le due card mostravano composizioni (e quindi percezione di colore) diverse. Ora tutte le risoluzioni passano il nome pulito: campo, famiglia e variante identiche nelle due viste (verificato in browser: rgb(42,48,43), deep, layout 2 su Home e Studio).

**Contrasti sulla copertina di Studio (segnalati con screenshot dal proprietario).** Tre difetti reali in PathHero, tutti corretti:
1. **currentColor ereditato dalla pagina**: binario e fill della barra, veli dei pulsanti Continua/Cambia corso, tasti ⋯ e ✕ usavano l'inchiostro del TEMA invece di quello della copertina — sulle copertine profonde in chiaro erano inchiostro su campo scuro, invisibili (fill misurato #242522 su #2A302B = 1,05:1 nell'allegato). La radice di `heroInner` ora porta `text-contrast`: tutto ciò che usa currentColor eredita l'inchiostro della famiglia (panna, 13:1 sul deep).
2. **Opacità composta**: `opacity-70/75/80` impilate su `text-contrast-secondary` (già alpha 0,8) portavano «PERCORSO ATTUALE» e «3 di 22 lezioni» a ~2,8:1 sulle forme della composizione. Rimosse le opacità in eccesso: il token da solo regge ≥ 4,66:1 anche sopra le forme.
3. **Binario della barra al 15%** di currentColor, quasi invisibile (1,79:1) → portato al 38% (≈3:1, componente non testuale).

Misure dopo: «Continua» 10,5:1, titolo 13,4:1, etichetta attiva della nav 12,7:1. Audit WCAG computato su Home/Studio/Piano/Core/Impostazioni in chiaro e notte: 0 fail reali (i 2 segnalati dall'audit erano falsi positivi da fondo proprio del bottone, verificati: `btn-satin` 8,4:1, «Passa a Pro» 15:1).

**Navbar: spessore e pillola.** SPESSORE restaurato com'era prima della veste squadrata (`ad9289d`): binario `h-[4.5rem]` (74px misurati, erano 70), voci min-h 60px. La sotto-pillola passa da `bg-primary` (inchiostro quasi nero) a **`bg-secondary`** — la «carta quieta» #ECE9DF di giorno, #393732 di notte: più scura della barra ma non nera, com'era prima — con contenuto attivo in inchiostro (12,7:1 giorno, ~10:1 notte) e ring del badge Core allineato.

**Il salto della pillola: capito e risolto (due cause).** (1) Il ripristino dello scroll per scheda viveva in un `useEffect` DOPO il paint e, con `html{scroll-behavior:smooth}`, la `scrollTo` diventava un'animazione: la finestra scorreva mentre la molla scorreva. Ora `changeTab` ripristina SINCRONO (prima del re-render) e `setAppScrollTop` chiede `behavior:"instant"` (lo stesso trucco già usato da ModulesOverview). (2) La sotto-pillola `layoutId` di framer-motion proietta in coordinate documento: un cambio di scroll durante il volo la faceva partire da posizioni stantie. Riscritta come UNA sola sotto-pillola animata su **x/larghezza misurate** della voce attiva (molla invariata 400/30, ResizeObserver per i cambi di larghezza): deterministicamente immune allo scroll. Trace per-frame su entrambi gli scenari (scroll fermo → cambio scheda; ritorno alla scheda con scroll da ripristinare): la Y della pillola resta 765 in ogni fotogramma, zero salti verticali.

**Verifiche:** suite **657/657** (l'errore non gestito `list.scrollTo` in `pathHeroPicker.repro` preesiste su fc5893b, verificato su HEAD); `tsc -b` 0; eslint 0 errori sui file toccati (fixato un `as any` preesistente in PathHero); build OK, 105 precache. Screenshot in `screenshots/correzioni/`. File toccati: BottomNav, PathHero, CourseCard, Index, appScroll, appShellDesignSystem.test, registro. Nessuna modifica backend.

### Correzioni del proprietario (7 ottobre 2026 — impostazioni senza «ricaricata», velo dei doc, tasto di caricamento sempre visibile)

**Sincronizzato il repository con la base del piano Pro del proprietario** (`0c04d05..533f423`, 8 commit altrui): checkout Paddle completo (SubscriptionSheet, `usePaddleCheckout`, `lib/paddle`, edge functions `get-paddle-price`/`customer-portal`/`payments-webhook`, migrazione drizzle 0004, PaymentTestModeBanner, «Passa a Pro · 4,99 €/mese» sulla carta del piano). Nessun conflitto: le modifiche qui sotto partono da 533f423.

**Impostazioni: la pagina non «si ricarica» più.** `/app/impostazioni/*` erano route TOP-LEVEL: entrare smontava l'intera app (`Index`) e uscire la rimontava da zero — scheda attiva e scroll persi, skeleton al ritorno: percepita come un reload (verificato: nessun reload vero del browser, era tutto remount). Ora le pagine impostazioni sono **route figlie di `/app`** e `Index` le renderizza via `<Outlet />` restando MONTATA: l'uscita ripristina la stanza dov'era (memoria dello scroll continuata via listener con capture). Verificato in browser: stessa scheda (Studio), **scroll restaurato al px (57→57)**, nessuno skeleton, marker JS sopravvissuto.

**Velo dei doc di Chat/Esercizi/Interrogazione = velo del doc di caricamento.** Il bottom sheet degli strumenti (`SheetDrawer`) usava `bg-black/50 backdrop-blur-md` (nero pieno al 50%, vetro pesante); ora usa **`bg-scrim/40 backdrop-blur-sm`**, identico al doc «I tuoi materiali» — misurato identico in chiaro e notte: rgba(0,0,0,0.4) + blur(4px).

**Doc di caricamento: il tasto principale si vede SEMPRE (due bug veri).**
1. **Catena flex rotta** (il colpevole principale): il pannello «Caricamento» era `display:block` e il `Tabs` interno, con `h-full`, si dimensionava sul CONTENUTO invece che sullo spazio disponibile: con 2+ file la lista sforava il `max-h` del foglio e la CTA finiva sotto lo schermo, clippata da `overflow-hidden` (misurato: CTA a bottom=1169 su viewport 844 = invisibile). Il pannello ora è `flex flex-col` con `min-h-0` e il Tabs interno usa solo `flex-1 min-h-0`: la lista scorre DENTRO e la CTA resta agganciata al fondo (bottom=806 con 4 file).
2. **Tastiera virtuale**: su telefono, con l'input del nome percorso a fuoco (2+ file) o la ricerca web, la finestra di layout non cambia e il foglio restava sepolto sotto i tasti. Nuovo hook **`useKeyboardInset`** (legge `window.visualViewport`): il foglio si alza di `inset` px e si restringe all'altezza visibile. Verificato simulando la tastiera (viewport 500px): `bottom: 344px`, `maxHeight: 500px`, **CTA a 462px = sopra la tastiera**. In più `max-h-[85vh]` → **`85dvh`** (barra URL del browser).

**Fix di un test rotto dal nuovo codice:** `haptics.test` falliva su 533f423 perché `SettingsPlanCard` ora usa `usePaddleCheckout` → `useAuth` senza provider: aggiunto il mock accanto a quello di `useSubscription` (stesso pattern, assert intatti).

**Verifiche:** suite **663/663** (657 + 6 nuovi in `uploadSheetAndSettings.test.tsx`: catena flex, dvh, aggancio tastiera con unit test dell'hook, route annidate, Outlet + ripristino scroll); `tsc -b` 0; eslint 0 sui file toccati; build OK 105 precache. Screenshot in `screenshots/correzioni2/`. File toccati: App, Index, StudioPractice (SheetDrawer), UploadSheet, useKeyboardInset (nuovo), test studioViews/uploadSheetAndSettings/haptics, registro. Nessuna modifica al codice del piano Pro del proprietario. Nessuna modifica backend.

## 4-bis. Caricamento unico: UN solo loading dall'upload al percorso (7 ottobre 2026)

**Richiesta del proprietario:** «Tremila caricamenti» → uno. L'utente carica il materiale, preme il tasto e vede **UN solo stato di caricamento** che copre internamente tutti i processi (compressione foto, caricamento, analisi, generazione). Quanti passaggi fa davvero l'app non interessa: non si mostrano diciotto caricamenti uno dietro l'altro.

**Cosa è entrato nel runtime:**
- **`UnifiedPipelineLoader.tsx` (nuovo):** portale `fixed inset-0 z-[95]` sopra tutto (anche sopra il doc di caricamento, che resta aperto dietro e si chiude da solo alla fine). UNA barra a pillola `bg-primary` che avanza **senza mai tornare indietro**, una caption per fase («Carico il materiale…» → «Analizzo il contenuto…» → «Creo le lezioni…»), e dopo 15 secondi compare «Continua in background» per chi non vuole aspettare.
- **`UploadSheet.tsx`:** i tre gesti (foto / ricerca web / PDF) ora lanciano `runUnifiedPipeline` — compressione foto silenziosa, poi le fasi material→analysis→generation in un'unica barriera visiva. Il tasto di caricamento È il tasto che prepara il percorso: nessun bottone intermedio «Genera percorso» chiesto all'utente. La generazione usa la stessa guardia Free (limite 10 corsi/settimana, stesso messaggio di Studio); appena il materiale esiste l'app scivola già su Studio dietro il velo, così alla fine l'utente si ritrova sul percorso senza passaggi ulteriori.
- **Bug vero trovato dai test browser e corretto:** il doc di Radix mette `pointer-events: none` sul `body` e il velo del loader lo ereditava → il velo DIPINGEVA sopra tutto ma il tasto «Continua in background» non era cliccabile. Fix: `pointer-events-auto` sul velo (con test che lo difende).

**Verifiche (browser, 2 run con fixture mock):** con 2 foto selezionate → 0 spinner prima del click; dopo il click **una sola schermata** (15 campioni), barra monotona 38→100%, 3 caption di fase; finale: velo e doc chiusi, tab Studio attiva, toast «Percorso pronto! 🎉», zero vecchi toast. Skip: nascosto prima dei 15s, compare dopo; post-skip velo e doc chiusi, app in Studio, generazione che prosegue dietro le quinte. Suite **668/668** (5 test nuovi); `tsc -b` 0; eslint 0; build 105 precache. Screenshot in `screenshots/pipeline-unica/`. Backend non toccato.

## 5. Inventario dei test di stile v1 e piano di migrazione

Questi test **difendono la veste 1 e oggi sono corretti**: si migrano alle rispettive tappe, **nessuna cancellazione per nascondere errori**. Baseline post-D3: **625 pass / 13 fail pre-esistenti** (AppHeader 13 + haptics 1), tsc OK, build OK.

| Test / suite | Che cosa impone (v1) | Quando migra |
|---|---|---|
| `src/test/noGreen.test.ts` | Ruoli colore v1: marca ottanio solo via token di tema; materia confinata ai suoi token; feedback semantico solo nei validatori (allowlist 6 file); vietati hex/hue verdi liberi. **La policy dei ruoli sopravvive alla 2.1** (i valori cambiano, i ruoli no): si aggiornano i token di marca nel pilota. | ✅ migrati in V2-01 (brand = inchiostro; policy ruoli invariata) |
| `src/test/appShellDesignSystem.test.ts` | Dock D2 squadrato: `bg-brand`, safe-area, Core incluso, rail/sidebar. | ✅ migrati in V2-01 (dock arrotondato, selezione inchiostro) |
| `src/test/homeCleanSurfaces.test.ts` | 4 test P36 riscritti in D2: `border-border`, niente `rounded-full`, CTA `color-mix` 12/24%, `font-display` 3xl. | ✅ migrati in V2-01 (riscritti alle prescrizioni 2.1) |
| `src/test/HomeView.test.tsx` | Ordine §10 v1 (saluto → corso → Piano → Strumenti) + grammatica squadrata. L'ordine si riversa nella 2.1 (§9); la grammatica cambia. | ✅ migrati in V2-01 (riscritti alle prescrizioni 2.1) |
| `src/test/creamNotWhite.test.ts` | Superfici carta v1. | V2-01 / tappa 1 |
| `src/test/darkModeChatMobile.test.ts` | Drawer notturno v1. | Tappa 3 (lettore+strumenti) |
| Registro §7 (archivio: 4bis/4ter/4quater) | Valori citati D1/D2/D3 (ottanio, raggio 0, Ubuntu Sans). Restano come documento del runtime attuale. | consultazione; §7 archivio aggiornato col pilota |

**`noGreen` — policy conservata (revisione D1):** il colore di marca solo via token di tema; materia confinata ai suoi token (`--pastel-*`, palette del Piano); feedback semantico solo nei componenti che validano risposte (allowlist invariata, 6 file). Vietati: classi Tailwind verdi/teal, hex bosco/teal liberi, hue HSL 60–189 fuori tema, theme-color verdi. Il commento WCAG 1.4.1 corretto in D1 resta valido: il colore non è mai l'unico veicolo (testo e struttura ci sono sempre).

## 6. Punti ancora aperti (proposte da validare nel pilota, non decisioni)

- ~~Soglie navigazione~~ **deciso in V2-01:** rail 768–1023, sidebar ≥1024 come da 2.1 §10 (da confermare visivamente dal proprietario).
- ~~Lora e Inter~~ **caricati in V2-01** (variable 400–700); resa su contenuti reali da confermare visivamente.
- Saturazione delle superfici materia, grana, resa notturna delle copertine: validazione visiva nel pilota.
- **Incoerenza Evoluzionismo (registrata in V2-02, da allineare — nessuna migrazione cromatica fatto in quella tappa):** lo stesso corso appare **oliva in Home** (`courseIdentity` → fallback hash-stabile → geografia) e con altra tinta in **Studio**, dove il modulo chiama ancora `CourseCardBackground` con le props pre-V2-01 (ignorate dal componente riscritto → copertina default) e le chip passano per il sistema keyword/pastel legacy. Allineamento da progettare nella tappa Studio: un solo resolver (`courseIdentity`), migrazione delle chiamate residue, decisione su keyword mancanti (es. «evoluzionismo» vicino a «evoluzione»).
- Saluto della Home: font serif (Lora) e misura «compact» — da verificare accanto alle copertine.
- Prerequisiti **consigliati** con possibilità di proseguire: nessun blocco rigido senza decisione di prodotto.
- Etichette del toggle del corso: **Percorso/Elenco** (non «Topologia», non il simbolo ☍).

## 7. Archivio della versione 1 — cosa è entrato nel runtime (3 ottobre 2026)

*Questi dettagli descrivono la veste che l'app mostra ancora oggi. Restano come documento del runtime finché il rollout 2.1 non la sostituisce, tappa per tappa.*

### D1 — Fondamenta (`5e9e689` + fix `c4df732`)

**Token (nessuna seconda collezione: stessi nomi, nuovi valori):** `--primary`/`--ring` a ottanio `#087F83` con testo/focus bianco (notte compresa); famiglia di marca `--brand`/`--brand-deep` (testo `#07585C` giorno, `#8ECFD0` notte)/`--brand-tint` (`#E8F2F0`); notte `#101717`/`#141D1D`/`#1B2828` con testo `#F2F0EF`, secondario `#B8C6C3`, bordo `#3D5351`; `--border` giorno `#D6D5D0`; semantici tornati colore (`--destructive` rosso, `--success` verde, `--warning` ambra — solo esito); ombre a tre livelli; radius tutti a 0 tranne `--radius-full`; `theme-color` a `#101717`.

**Componenti condivisi:** Button (size «pill» squadrata; variant link/fab/elevated su `text-brand-deep`), Input/Select/Tabs/Dialog/Sheet/Menu/Toast/Skeleton/Alert/Card sulla grammatica a variabili, focus ring, target 44px, label. PillToggle e Progress squadrati. Avatar, Switch, Radio, Checkbox mantengono il cerchio.

**Tipografia:** INTERFACCIA = Ubuntu Sans; LETTURA = `font-reading` (Montserrat, da validare) su concept/spiegazioni/esempio in `FullscreenLesson`; saluto Ubuntu Sans; KaTeX intatto; nessun nuovo font caricato.

**Migrazione consumer:** 64 `text-primary` → `text-brand-deep` in 33 file (contrasto 4,23:1 del tono pieno); `bg-primary`/`border-primary` sul token d'azione. Suite dopo D1: 619/18 pre-esistenti.

### D2 — Navigazione e Home (`c9b5860`)

- **BottomNav riscritto:** quattro destinazioni (Home · Piano · Studio · Core), dock flottante rettangolare unico <768 (opaco, `shadow-level-3`, safe area, Core incluso); rail 768–1199; sidebar ≥1200. Selezione = `brand-deep` + barretta `bg-brand` + `aria-current`; i18n `nav.ariaPrimary`.
- **AppLayout:** content-card `rounded-card`, riserva dock `calc(5.5rem + safe-area)`.
- **HomeView ordine §10 v1:** saluto → card corso → Piano del giorno → Strumenti rapidi.
- **CourseHeroCard:** `border-border`, CTA `color-mix` 12%/24%, stato vuoto opaco, titolo `font-display`.
- **Test:** dock D2 in `appShellDesignSystem`; 4 test P36 di `homeCleanSurfaces` riscritti; test ordine in `HomeView.test`. Suite 625/13.

### D3 — Studio e continuità (`eb23855`)

- **Migrazione literal→token:** selettore corsi, PathHero, ModulesOverview, ModulePath, FullscreenLesson (card solide senza backdrop-blur), FinalTest, ModuleGenerationScreen, GenerationProgress, CourseCardSkeleton, StudioView (CTA tokenizzata, era `bg-[#121214]`), StudioPractice senza glow.
- **Transizioni audited:** morph corso→percorso invariato (layoutId per-corso, guardia doppi clic); ingresso card saltato con movimento ridotto; timer cambio corso tracciati in ref e puliti allo smontaggio.
- **Suite:** 625/13 invariata; tsc/build/detector OK (residui: type ramp 15px ecc., inventariati).

### Inventario geometria v1 residua (superato dalla 2.1: il raggio torna, con la scala 8/16/24/32)

I `rounded-full` fuori dai componenti condivisi (57 file, molti legittimi), i radius espliciti hardcoded (48 usi), Radja (Login/HomeHeader), il sottotitolo Zalando Sans Extended e le voci M3 ereditate: inventario vivo **assorbito dalla migrazione 2.1** (il pilota decide sopravvivenza o ritiro di ciascuno).

## 8. Note operative

- `PRODUCT.md` non è stato modificato per adattarlo alla grafica (regola D0, confermata in V2-00).
- Nessuna modifica a backend, dati, autenticazione o pagamenti; nessuna migrazione né deploy richiesti da V2-00.
- **V2-00 = solo allineamento fonti.** Il prodotto ridisegnato esiste solo dopo V2-01 e il rollout, verificati su schermate reali.
- I prompt Arena dettagliati per V2-01+ saranno deliverable successive basate su `DESIGN.md` 2.1 e su questo registro.
