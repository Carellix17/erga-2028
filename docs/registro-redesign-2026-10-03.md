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

**Nota Evoluzionismo (incoerenza registrata, NON corretta — vedi §6):** verificato eseguendo i due sistemi: in Home `resolveCourseCover("Evoluzionismo")` non trova keyword (`"evoluzione"` non è contenuta in `"evoluzionismo"`) e cade nel fallback hash-stabile → materia **geografia → oliva** (famiglia deep, campo #2E3028). In Studio il modulo (`StudioView` → `ModuleHeaderCard`) passa `subjectColor` al `CourseCardBackground` con le **props pre-V2-01** che il componente riscritto ignora: la copertina del modulo usa il default (`storia`, campo #392E28), non l'identità del corso — l'azzurro osservato dal proprietario arriva quindi da una terza via di risoluzione (es. chip/pastel per materia salvata), conferma che **tre sistemi convivono** (hash del nome, keyword legacy, materia salvata). Da allineare nella tappa dedicata, come da incarico.

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
