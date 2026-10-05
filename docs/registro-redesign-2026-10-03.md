# Registro del redesign — Erga

**Aperto:** 3 ottobre 2026 · **Aggiornato:** 5 ottobre 2026 (V2-00)
**Fonte di verità grafica:** `DESIGN.md` versione 2.1 «Carta contemporanea» (integrata il 5 ottobre 2026, commit di V2-00).
**Runtime:** l'app mostra ancora la **veste 1** (pacchetti D1–D3 della sequenza storica). Nessuna schermata è stata ancora migrata alla 2.1.
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
| **V2-01 — Pilota** | Home completa + **una lezione rappresentativa esistente** col minimo sistema condiviso (token 2.1, Lora/Inter, materiali, dock/rail/sidebar, identità corso), **incluso un caso matematico/interattivo**. Dati reali nella UI; fixture sintetiche solo in prove isolate dichiarate. **Viste reali telefono/desktop, giorno/notte** — non mockup HTML. | ⬜ **prossimo passo, da valutare dal proprietario prima del rollout** |
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

## 4. Il runtime oggi (dichiarazione onesta, post V2-00)

L'app mostra ancora la **veste 1** (D1–D3), cioè: palette ottanio `#087F83` giorno/notte `#101717`, raggio 0 (tranne cerchi semantici), Ubuntu Sans (interfaccia) + Montserrat (lettura), dock rettangolare D2, card tokenizzate D3. **Cambiare la documentazione non ha ridisegnato l'app.**

- D1/D2/D3 sono nel repository spinto; la pubblicazione su Lovable (Update, solo frontend) **non è mai stata confermata dal proprietario**.
- **V2-00 non richiede alcun Update Lovable**: ha toccato solo documentazione e strumenti (`DESIGN.md`, `.impeccable/design.json`, `AGENTS.md`, `docs/`).
- **Font 2.1 non caricati:** Lora e Inter non sono nel bundle; il pilota V2-01 li aggiunge (o verifica equivalenti già presenti) prima di usarli.
- `theme-color`, saluto e token di marca restano v1 finché il pilota non li sostituisce.

**Verifiche eseguite in V2-00 (5 ottobre 2026):** YAML del frontmatter di `DESIGN.md` valido (39 colori, 8 ruoli tipografici, 7 raggi, 10 spacing, 7 componenti); `context.mjs` legge la 2.1 senza errori; `design.json` valido e letto dal detector (14 segnalazioni, **tutte in `src/index.css`**: 7 Montserrat, 5 colori, 2 raggi — è il gap v1→v2.1 atteso, concentrato nel file dei token, si chiude in V2-01); suite **625 pass / 13 fail pre-esistenti** identica alla baseline D3; `noGreen` verde; `tsc --noEmit` OK; `vite build` OK. Controlli **non** eseguiti: verifica visiva in app e screenshot (nessuna schermata è cambiata; il runtime resta veste 1).

## 5. Inventario dei test di stile v1 e piano di migrazione

Questi test **difendono la veste 1 e oggi sono corretti**: si migrano alle rispettive tappe, **nessuna cancellazione per nascondere errori**. Baseline post-D3: **625 pass / 13 fail pre-esistenti** (AppHeader 13 + haptics 1), tsc OK, build OK.

| Test / suite | Che cosa impone (v1) | Quando migra |
|---|---|---|
| `src/test/noGreen.test.ts` | Ruoli colore v1: marca ottanio solo via token di tema; materia confinata ai suoi token; feedback semantico solo nei validatori (allowlist 6 file); vietati hex/hue verdi liberi. **La policy dei ruoli sopravvive alla 2.1** (i valori cambiano, i ruoli no): si aggiornano i token di marca nel pilota. | V2-01 (token marca) |
| `src/test/appShellDesignSystem.test.ts` | Dock D2 squadrato: `bg-brand`, safe-area, Core incluso, rail/sidebar. | V2-01 + tappa 1 |
| `src/test/homeCleanSurfaces.test.ts` | 4 test P36 riscritti in D2: `border-border`, niente `rounded-full`, CTA `color-mix` 12/24%, `font-display` 3xl. | V2-01 |
| `src/test/HomeView.test.tsx` | Ordine §10 v1 (saluto → corso → Piano → Strumenti) + grammatica squadrata. L'ordine si riversa nella 2.1 (§9); la grammatica cambia. | V2-01 |
| `src/test/creamNotWhite.test.ts` | Superfici carta v1. | V2-01 / tappa 1 |
| `src/test/darkModeChatMobile.test.ts` | Drawer notturno v1. | Tappa 3 (lettore+strumenti) |
| Registro §7 (archivio: 4bis/4ter/4quater) | Valori citati D1/D2/D3 (ottanio, raggio 0, Ubuntu Sans). Restano come documento del runtime attuale. | consultazione; si chiudono a pilota concluso |

**`noGreen` — policy conservata (revisione D1):** il colore di marca solo via token di tema; materia confinata ai suoi token (`--pastel-*`, palette del Piano); feedback semantico solo nei componenti che validano risposte (allowlist invariata, 6 file). Vietati: classi Tailwind verdi/teal, hex bosco/teal liberi, hue HSL 60–189 fuori tema, theme-color verdi. Il commento WCAG 1.4.1 corretto in D1 resta valido: il colore non è mai l'unico veicolo (testo e struttura ci sono sempre).

## 6. Punti ancora aperti (proposte da validare nel pilota, non decisioni)

- **Contraddizione operativa reale:** DESIGN.md 2.1 §10 vuole rail 768–1023 e sidebar da **1024**; D2 ha implementato sidebar a **≥1200** (xl). La 2.1 stessa demanda («soglie da verificare sul contenuto»): si decide in V2-01 sulle schermate reali.
- Lora e Inter: caricamento o equivalenti già presenti; pesi esatti (400/500 + 400/500/600) e resa su contenuti reali.
- Saturazione delle superfici materia, grana, resa notturna delle copertine: validazione visiva nel pilota.
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
