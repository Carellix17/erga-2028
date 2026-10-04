# Registro del redesign — Erga

**Aperto:** 3 ottobre 2026 · **Fonte di verità grafica:** `DESIGN.md` versione 1.1 (integrato nel pacchetto D0)
**Base di partenza:** commit `f54e237` (stato del repository verificato dalla specifica: Pratica assorbita da Studio, palestra scientifica, otto widget, motori per materia).

Questo è l'**unico registro** dei lavori del redesign: stato dei pacchetti, cosa esiste già, punti aperti.
Chi lavora a un pacchetto aggiorna qui lo stato. La migrazione dell'interfaccia **non è iniziata**: l'app oggi mostra ancora la veste precedente.

---

## 1. Le decisioni vincolanti (dal proprietario)

- **Angoli squadrati** (raggio 0) per l'intero prodotto; cerchi solo nel contenuto (avatar, radio nativi, esagono cognitivo, grafici).
- **Atmosfera astratta e matericità**: composizioni di luce e colore per le card dei corsi, superfici e ombre con profondità controllata.
- **Ubuntu Sans del saluto**: da conservare.
- **Palette ottanio** (`#087F83` e famiglia): base proposta della prima implementazione, non identità definitivamente approvata.
- **Navigazione unificata**: quattro destinazioni con etichette persistenti (Home, Piano, Studio, Core); dock flottante su telefono, rail/sidebar su schermi ampi.
- **Lezioni coinvolgenti**: diagrammi animati e piccole interazioni; varietà funzionale, non carosello di paragrafi identici.

**Non guidano questo redesign** (scelte della veste precedente, da non reintrodurre): rosso lacca, Playfair/Inter/Roboto Mono, ossidiana obbligatoria, immagini sempre in bianco e nero, "mirino laser".

## 2. Stato dei pacchetti

| Pacchetto | Contenuto | Stato |
|---|---|---|
| **D0 — Identità e documentazione** | DESIGN.md 1.1 integrato (frontmatter token del sistema di destinazione), `.impeccable/design.json` allineato (schema 2), AGENTS.md / Matrice / Minilezione riconciliate, questo registro | ✅ **fatto, 3 ottobre 2026** |
| **D1 — Fondamenta** | Token nel runtime (palette ottanio giorno/notte, raggio 0, ombre §6, ruoli tipografici interfaccia/lettura, token di marca), grammatica dei componenti condivisi, revisione di `noGreen.test.ts` | ✅ **runtime consegnato 3 ottobre 2026** (verifica visiva in app da confermare; geometria locale residua inventariata qui sotto) |
| **D2 — Navigazione e Home** | Dock flottante rettangolare unico (Core incluso) + rail 768–1199 + sidebar ≥1200; Home con gerarchia §10 (riprendi → prossimo impegno → strumenti) | ✅ **consegnato 3 ottobre 2026** (verifica visiva in app da confermare; anteprima verificabile: `docs/anteprima-navigazione-home-d2.html`) |
| **D3 — Studio e continuità delle card** | Grammatica condivisa su card corso, selettore, intestazioni modulo, lezioni e Banco; transizioni audited (movimento ridotto sull'ingresso card, cleanup timer cambio corso) | ✅ **consegnato 3 ottobre 2026** (mappa con prerequisiti e scene didattiche restano evoluzioni funzionali separate, vedi §2 D6+) |
| **D4 — Esercizi, interrogazione e Piano** | Ingressi degli strumenti del Banco; calendario squadrato coerente nei due temi | ⬜ |
| **D5 — Core e landing** | Coerenza della schermata Core esistente; landing nella stessa identità, confini degli stili marketing preservati | ⬜ |
| **D6+ — Evoluzioni funzionali separate** | Mappa con dipendenze reali e loro generazione/validazione; nuovi componenti didattici interattivi; aggiunta di impegni in linguaggio naturale (contratto dati + AI/backend); metriche future di Core | ⬜ incarichi separati, mai nel redesign visivo |

**Regola di advancement:** niente riscrittura totale in un colpo solo; migrazione progressiva per pacchetti, componenti condivisi, rimozione degli stili soppiantati senza stratificare override.

## 3. Cosa esiste già nel prodotto (verificato nel repository al commit `f54e237`)

Presenza nel codice **non** significa pubblicato online: i deploy passano da Lovable.

- **Otto widget didattici** costruiti a mano (parabola, retta, proiettile, piano inclinato, pH, gas, mercato offerta/domanda, esecutore di codice in Web Worker) con catalogo JSON condiviso validato e clampato — uniformarli prima di aggiungerne altri.
- **Feedback aptico** già presente (`useHaptics` e utility condivise): consolidarlo, non ricrearlo.
- **Palestra scientifica** (matematica/fisica/chimica): esercizi numerici con tolleranza e virgola decimale, suggerimenti progressivi, soluzione passo-passo, tutor socratico.
- **Strumenti in Studio** (la sezione Pratica non esiste più): chat, esercizi, interrogazione e palestra come strumenti del Banco, raggiungibili anche dalla Home.
- **Motori per materia** (fiume del backend): scientifico (DeepSeek V4 Flash via OpenRouter + formule + widget), letteratura, storia/geografia, filosofia, lingue vive, latino, storia dell'arte; sociali e informatica rinviati a più tardi.
- **KaTeX** con output MathML accessibile; **i18n** it/en; colori materie e routine (informano, non decorano); vetrina marketing isolata (`--lp-*`); fondamenta dati v1/v2 (compatibilità dei percorsi v1 da mantenere).

## 4. Controlli di stile

**`src/test/noGreen.test.ts` — revisionato in D1 (era "precedente monocromo").** La nuova policy difende i ruoli colore: marca ottanio solo via token di tema; materia confinata ai suoi token (`--pastel-*`, palette del Piano — per questo `#0d9488` non è in lista); feedback semantico solo nei componenti che validano risposte (allowlist invariata, 6 file). Restano vietati: classi Tailwind verdi/teal, hex bosco e teal liberi, hue HSL 60–189 con saturazione fuori dal tema, theme-color verdi. Il commento che presentava verde/rosso come coppia obbligatoria WCAG è corretto: il criterio 1.4.1 chiede che il colore non sia l'unico veicolo, e il feedback ha anche testo e struttura. Il test è rimasto attivo e verde durante tutta la migrazione.

- Token CSS della veste precedente non ancora migrati (avorio hero, pillola di navigazione, pastelli materia in versione mono): vedi inventario D1 qui sotto; oggetto dei pacchetti D2–D5.

## 4bis. D1 — cosa è entrato nel runtime (3 ottobre 2026)

**Token (nessuna seconda collezione: stessi nomi, nuovi valori):** `--primary` e `--ring` a ottanio `#087F83` con testo/focus bianco (notte compresa, come da §4); famiglia di marca nuova `--brand` / `--brand-deep` (testo di marca: `#07585C` di giorno, accento chiaro `#8ECFD0` di notte) / `--brand-tint` (`#E8F2F0`), esposti a Tailwind come `brand.DEFAULT/deep/tint`; `--secondary`/`--accent` a tinta di marca con testo profondo; notte spostata su `#101717` / `#141D1D` / `#1B2828` con testo `#F2F0EF`, secondario `#B8C6C3`, bordo `#3D5351`; `--border` giorno `#D6D5D0`; semantici tornati colore (`--destructive` rosso, `--success` verde, `--warning` ambra — solo esito, mai tinta); ombre ai tre livelli del §6 (ordinaria/protagonista/overlay, notte ridotta); radius tutti a 0 tranne `--radius-full`; `--motion-*` e `--ease-out` invariati (già nei range del §7); `.force-light` della vetrina allineato; `theme-color` a `#101717`.

**Componenti condivisi:** Button (size "pill" ora squadrata; variant link/fab/elevated usano `text-brand-deep`), Input/Select/Tabs/Dialog/Sheet/Menu/Toast/Skeleton/Alert/Card già sulla grammatica a variabili → raggio 0 automatico mantenendo Radix, focus ring, target 44px e label; PillToggle (selettore segmentato) e Progress squadrati. Avatar, Switch, Radio e Checkbox mantengono il cerchio (eccezione semantica documentata §3).

**Tipografia:** ruolo INTERFACCIA = Ubuntu Sans (body, sans/display/body del config); ruolo LETTURA = `font-reading` (Montserrat, da validare su contenuti reali) applicato a concept/spiegazioni/esempio in `FullscreenLesson`; saluto della Home invariato (Ubuntu Sans); KaTeX intatto; nessun nuovo font caricato.

**Migrazione consumer:** 64 `text-primary` → `text-brand-deep` in 33 file (il tono pieno `#087F83` non si usa per testo ordinario su carta: 4,23:1); `bg-primary` e `border-primary` restano sul token d'azione.

**Detector Impeccable:** legge il DESIGN.md 1.1 e segnala i residui come inventario vivo (es. `text-[11px]` in PillToggle, `text-[0.9375rem]`/15px nel lettore lezioni — il ramp D1 non ha il 15px; si risolve in D3 col pacchetto lezioni). Suite dopo D1: **619 pass / 18 fail**, tutti pre-esistenti (AppHeader, superfici Home vecchia veste, haptics) e attesi fino a D2; il test HomeView delle capsule, già rotto, è stato riallineato alla grammatica squadrata.

### Inventario della geometria locale residua (da migrare in D2+, NON eliminata)

- `rounded-full` fuori dai componenti condivisi: **57 file** (molti legittimi — avatar, pallini di stato, esagono; altri da vagare: es. `PathHero` 20, `EserciziView` 21, `Login` 9, `ModulePath` 14). Tailwind lo lascia a 9999px di proposito.
- Radius espliciti hardcoded: **48 usi** (`rounded-[18px]` ×12, `rounded-3xl` ×9, `rounded-[24px]` ×7, `rounded-[20px]` ×6…).
- Font locali: Radja (`Login`, `HomeHeader` — voce focale, decisione in D2/D5), sottotitolo Home in Zalando Sans Expanded.
- Voci M3 ereditate: varianti Button `fab*`/`tonal`/`elevated` e contenitori `surface-container-*` (funzionanti, da ritirare quando le sezioni migrano).
- Pillola di navigazione (`BottomNav`/`--nav-surface`) e card avorio `--surface-cream`: si ridisegnano in D2.
- Pastelli materia ancora in versione mono (`--pastel-*`): la loro vivificazione è affare della sezione corsi (D3), con i colori materia vivi già documentati in `DESIGN.md`/`design.json`.

## 4ter. D2 — cosa è cambiato (3 ottobre 2026)

- **Navigazione unificata** (`BottomNav.tsx` riscritto): quattro destinazioni etichettate Home · Piano · Studio · Core nello stesso ordine su ogni formato. Telefono: UN dock flottante rettangolare (opaco, `shadow-level-3`, safe area, Core incluso — niente più cerchio separato); 768–1199: rail sospesa compatta (icone + etichette); ≥1200: sidebar (brand esteso, menu che scorre da solo). Selezione = testo `brand-deep` + barretta geometrica `bg-brand` (animata con layoutId, poi ferma) + `aria-current`. La nav non sparisce con lo scroll; le sessioni immersive continuano a usare `hideChrome`.
- **Shell** (`AppLayout.tsx`): content-card squadrata (`rounded-card`), spazio del dock riservato dal contenuto con `calc(5.5rem + safe-area)`.
- **Home** (`HomeView.tsx`): ordine §10 — saluto → card corso (ripresa) → Piano del giorno → Strumenti rapidi. Strumenti e ripresa invariati nelle destinazioni (Studio/lezioni, nessuna Pratica autonoma).
- **Card corso** (`CourseHeroCard.tsx`): bordi tokenizzati (`border-border`), CTA semiopaca al 12% (più solida, §6), stato vuoto su superficie opaca (niente glass), composizione astratta per materia invariata (già conforme), titolo in Ubuntu Sans (`font-display` D1). `QuickToolsGrid`/`DailyTimeline`: bordi `#FFFBF4` → token.
- **Test**: dock D2 in `appShellDesignSystem`; i 4 test P36 di `homeCleanSurfaces` riscritti alle attese D2 (erano pre-esistenti falliti su una veste mai completata); nuovo test ordine §10 in `HomeView.test`. Suite: **625 pass / 13 fail** (solo AppHeader 13 + haptics 1, pre-esistenti, header non toccato da D2).
- **Anteprima verificabile**: `docs/anteprima-navigazione-home-d2.html` — dock/rail/sidebar, card per materia scura/chiara, stato vuoto, giorno/notte. Non è uno screenshot del prodotto.

## 4quater. D3 — cosa è cambiato (3 ottobre 2026)

**Struttura invariata, veste migrata** (nessun override sopra le vecchie card: le classi locali sono state sostituite). Cantieri Aperti e Banco degli Strumenti restano distinti; chat/esercizi/interrogazione nel Banco, palestra solo per famiglia scientifica; la lezione si continua senza passare dagli strumenti (percorso diretto invariato).

- **Migrazione stili** (literal → token della grammatica D1/D2): selettore corsi (`rounded-[20px]`→`rounded-card`, menu `rounded-md`, dialog rinomina `rounded-dialog`, drawer `rounded-t-dialog`); PathHero (bottoni rinomina `rounded-button`, progresso `rounded-sm`); ModulesOverview (pillola flottante → solida squadrata senza blur, progressi `rounded-sm`); ModulePath (banner `rounded-card`, progressi allineati a `progress.tsx`); lezioni FullscreenLesson (card concetto/esempio/esercizio `rounded-card` e **solide senza backdrop-blur** — §6: il blur non serve a leggere; badge, segmenti e punti di progresso squadrati); FinalTest, ModuleGenerationScreen, GenerationProgress, CourseCardSkeleton; StudioView (CTA di generazione **tokenizzata**: era `bg-[#121214]` hardcodato, ora ottanio `bg-primary`).
- **Bagliori ritirati** (§4): la card del Banco e l'icona del tool non hanno più le ombre-lume `var(--subject-accent)`; hover = `shadow-card-active`.
- **Transizioni audited senza riscritture**: il morph corso→percorso (layoutId per-corso) già preservava scroll e identità dell'oggetto, con guardia ai doppi clic — invariato. Due migliorie mirate: l'ingresso delle card nel portale (delay 0,25s) ora è **saltato con movimento ridotto** (prima solo il layout morph lo rispettava); i timer del cambio corso (60/650ms) sono **tracciati in ref e puliti allo smontaggio** (uscita rapida a metà volo non lascia più timer pendenti né il body bloccato).
- **Verifiche**: suite 625 pass / 13 fail pre-esistenti (AppHeader 13 + haptics 1), tsc OK, build OK, detector OK (residui = type ramp 15px ecc., in inventario). Flussi coperti dai test esistenti (studioViews 11, darkModeChatMobile 5) più la suite P50.

### Inventario residuo D3+ (type ramp e geometrie residue)
- Dimensioni tipografiche letterali nelle superfici Studio/lezioni (`text-[15px]`, `text-[10.5px]`, `text-[0.9375rem]`): il ramp D1 non ha il passo 15px; si decide col pacchetto lezioni.
- `rounded-full` superstite in studio: cerchi legittimi (orbs della composizione, avatar, icone circolari, cerchi di stato) — verificato a campione.

## 5. Punti ancora aperti (proposte da validare, non decisioni)

- Valori completi della palette ottanio (giorno e notte) e contrasti su trasparenze, hover, disabled, focus.
- Ubuntu Sans anche per il testo didattico, dopo confronto su contenuti reali.
- Breakpoint di presentazione della navigazione (<768 dock · 768–1199 rail · ≥1200 sidebar).
- Prerequisiti **consigliati** con possibilità di proseguire: nessun blocco rigido senza decisione di prodotto.
- Intensità delle ombre e durate delle transizioni: da verificare nel prodotto.
- Etichette del toggle del corso: **Percorso/Elenco** (non "Topologia", non il simbolo ☍).

## 6. Note operative

- `PRODUCT.md` non è stato modificato per adattarlo alla grafica (regola del pacchetto D0).
- Nessuna modifica a backend, dati, autenticazione o pagamenti; nessuna migrazione né deploy richiesto da D0.
- I prompt Arena dettagliati per i pacchetti D1+ saranno deliverable successive basati su `DESIGN.md` e su questo registro.
