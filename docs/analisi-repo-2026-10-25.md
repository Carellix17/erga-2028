# Analisi della repository — 25 ottobre 2026

Visita di salute completa all'apertura del ciclo di lavoro con l'agente Arena,
più il primo intervento: **riallineamento dei test al design system v4.0**.
Nessuna modifica al funzionamento visibile dell'app: cambiano solo i test e la
documentazione.

---

## 1. In una frase

Erga sta bene: **si compila, i tipi sono corretti e oggi tutti i 703 test
passano** (prima ne fallivano 20 e altri 3 non venivano nemmeno eseguiti).
Resta un punto tecnico importante da chiudere con Lovable: **la libreria
`pdf-lib` è dichiarata ma assente dai lockfile** (§7.1).

---

## 2. Cosa ho fatto

1. Ho scaricato il codice dal ramo `main` (commit `5446b4e`, PR #86
   «swiss-cognitive-grid» già unita).
2. Ho letto le regole di lavoro: `AGENTS.md`, `PRODUCT.md`, `DESIGN.md` v4.0,
   `HANDOFF.md`, `docs/external-agent-prompt.md` e il catalogo skill
   `.agents/skills/README.md`.
3. Ho installato le librerie ed eseguito la visita completa: test automatici,
   controllo dei tipi, compilazione di produzione, analisi degli avvisi di stile.
4. Ho verificato che il **push su GitHub funziona** (prova tecnica a secco):
   l'ambiente è già collegato all'account `Carellix17`, non servono chiavi in chat.
5. Ho riparato i test rimasti indietro rispetto alla grafica v4 (§6).

---

## 3. Lo stato di salute — risultati

| Controllo | Prima | Dopo | Cosa significa in parole povere |
|---|---|---|---|
| Test automatici | ⚠️ 680 su 700 (8 file rossi) | ✅ **703 su 703** (77 file) | La rete di sicurezza è di nuovo completa |
| Test mai eseguiti | ❌ 3 (file PDF non caricato) | ✅ **3 eseguiti e verdi** | La selezione delle pagine PDF ora è davvero protetta |
| Controllo tipi (TypeScript) | ✅ 0 errori | ✅ 0 errori | Il codice è internamente coerente |
| Compilazione di produzione | ✅ riuscita (~16 s) | ✅ riuscita (~16 s) | L'app è pubblicabile così com'è |
| Avvisi di stile (ESLint) | 🟡 92 in 37 file | 🟡 92 (0 nei file toccati oggi) | Debito storico, non blocca nulla |
| Push su GitHub | ✅ verificato | ✅ verificato | L'agente pubblica da solo |

> Nota: `DESIGN.md` v4 dichiarava che build e lockfile **non** erano stati
> verificati per problemi di rete nell'ambiente precedente. La build è ora
> verificata davvero; sul lockfile resta il punto §7.1.

### Dimensioni del progetto (25 ottobre 2026)

| Voce | Quantità |
|---|---|
| File in `src/` | 342 |
| Righe di codice TypeScript/TSX | ~46.000 |
| Componenti React | 155 (di cui 51 primitive `ui/`) |
| Hook | 29 |
| Pagine/route | 12 pagine + 7 route di impostazioni |
| Edge Function (backend) | 31 |
| Tabelle nel database | 24 (+ 3 funzioni SQL) |
| Migrazioni SQL | 60 |
| Test | 77 file, 703 test |
| Lingue | italiano e inglese (~490 testi) |
| Peso dell'app compilata | 1,3 MB il blocco principale (377 KB compresso) |

---

## 4. Cos'è Erga (in breve)

Piattaforma di studio per studenti delle superiori che trasforma i materiali
reali della classe (PDF, documenti, foto, fonti web) in un percorso personale:
lezioni, esercizi, simulazioni di interrogazione, piano di studio collegato a
verifiche e impegni, sessioni Focus e profilo cognitivo a sei misure.

### Le "stanze" dell'app

| Stanza | Cosa fa |
|---|---|
| **Home** |_percorso prioritario da riprendere (8/12) + telemetria cognitiva (4/12), piano del giorno, strumenti rapidi |
| **Studio** | materiali a sinistra (4/12), percorso e lettore a destra (8/12); lezioni, esercizi, figure, assistente |
| **Piano** | calendario di studio, verifiche, impegni, proposte dell'AI |
| **Core** | profilo cognitivo (esagono), materie, routine settimanale |
| Fuori dalle schede | Chat, Pratica, Interrogazione, Palestra scientifica, Focus e statistiche, Profilo, Impostazioni |

### Stack tecnico

React 18 + Vite 5 + TypeScript 5 + Tailwind 3 + shadcn/ui; React Query con
cache persistita; i18next; Framer Motion; PWA (service worker Workbox);
backend Lovable Cloud (tecnologia Supabase): Postgres, Auth, Storage, 31 Edge
Function in Deno; pagamenti Paddle; AI tramite catena di fallback in
`supabase/functions/_shared/ai.ts`.

---

## 5. Fonte visiva autorevole

`DESIGN.md` **v4.0 «Swiss Cognitive Grid + Tactile Studio»** (17 ottobre 2026):
canvas pietra `#F4F2EC`, celle `#FAF8F3`, foglio `#FFFDF9`; Ubuntu Sans per UI e
corpo, Instrument Serif solo per la lettura editoriale, Ubuntu Sans Mono per le
misure; griglia continua 1px, controlli 2px, pannelli al massimo 4px; superfici
piatte con ombra rigida 2px solo sulla CTA; vermiglio decorativo `#E63B11` e CTA
`#C82F0A` (≈5,35:1 con testo carta); tema giorno/notte.

I riferimenti alla v3 «Squared & Earthy», alla v2.1 «Carta contemporanea» e al
pilota V2-01 presenti nei documenti storici **non prevalgono** su `DESIGN.md`.

---

## 6. L'intervento di oggi: test riallineati alla v4

Il codice era già migrato alla v4 (PR #86), ma **20 test continuavano a
difendere la v3**: colori, font, raggi e componenti che non esistono più. Un
test che guarda al passato è peggio di nessun test: rende rosso un progetto sano
e nasconde le regressioni vere.

| File | Cosa difendeva (v3) | Cosa difende ora (v4) |
|---|---|---|
| `src/test/setup.ts` | — (configurazione) | **Bug riparato**: usava `window` senza guardia, quindi i file con `@vitest-environment node` non si caricavano. `pdfSelection.test.ts` (3 test) non è mai stato eseguito. Ora la guardia `typeof window !== "undefined"` li ripristina |
| `appShellDesignSystem.test.ts` | geometria 4/8/12px, Playfair Display + Inter, CTA Olive Drab piatta, superfici v3 | geometria **0/2/4px**, **Ubuntu Sans / Instrument Serif / Ubuntu Sans Mono**, CTA vermiglia con **ombra rigida 2px** e pressione che riduce lo stacco, token giorno/notte v4 + alias esadecimali, firma vermiglia 2px, ombre di sistema spente |
| `creamNotWhite.test.ts` | Floral White `#FFFBF4` di giorno | carta **`#FFFDF9`** e inchiostro `#11120D`; aggiunto il controllo di contrasto della **CTA `#C82F0A`** (≥4,5:1) e della notte `#FFFBF4` su `#0A0A08` |
| `paperGrain.test.ts` | grana su tutte le card Home, copertina astratta nella cella corso | grana solo sulle **4 superfici Home dichiarate** e resa **piatta** dal CSS v4; cella corso senza grana né copertina; satinato confinato alle copertine |
| `homeCleanSurfaces.test.ts` | velo satinato sulla CTA, raggio 12px, ombra `level-3`, ciambella di avanzamento | celle **piatte**, CTA **solida** a larghezza piena su telefono, **barra lineare** con percentuale in mono tabulare, `progressbar` accessibile (min/max/now), ombre spente |
| `HomeHeader.test.tsx` | Lora + Inter da Google Fonts | **Ubuntu Sans, Ubuntu Sans Mono, Instrument Serif**; gli alias `display`/`serif` risolvono a Ubuntu Sans; il serif editoriale vive nel token dedicato; divieto esplicito di far rientrare Playfair/Inter/Lora/Montserrat |
| `settingsPlanCard.test.tsx` | superficie v3 | superficie v4 **`#FAF8F3`**, nessun satinato fuori dalle copertine |
| `HomeView.test.tsx` | anello di avanzamento (`img`), Home **senza** profilo cognitivo, `overflow-x-clip` | `progressbar` accessibile, **telemetria cognitiva in Home** con le sei misure autentiche e stato vuoto onesto (nessun punteggio inventato), griglia **12 colonne** con celle `min-w-0` e testi che vanno a capo invece di troncarsi |

Il test sulla telemetria cognitiva è stato **rovesciato di proposito**: la v3
nascondeva il profilo in Home, la v4 lo mette in evidenza (`DESIGN.md` v4,
composizione della Home). Il test ora difende anche la regola di `PRODUCT.md`
«mai inventare punteggi»: senza profilo compare il messaggio esplicito.

**Regola adottata:** nessun test è stato indebolito o cancellato. Ogni
asserzione v3 è stata sostituita con l'equivalente v4 verificato sul codice
reale, e dove la v4 introduce una garanzia nuova (contrasto della CTA,
`progressbar` accessibile, celle `min-w-0`) il controllo è stato aggiunto.

---

## 7. Punti aperti (in ordine di importanza)

### 7.1 `pdf-lib` assente dai lockfile — da chiudere con Lovable ⚠️

`package.json` dichiara `pdf-lib@1.17.1`, usata da `src/lib/pdfSelection.ts` e
`src/components/upload/PdfPagePicker.tsx` (selezione delle pagine prima
dell'upload). La libreria **non compare né in `bun.lock` né in `bun.lockb`**
(per confronto: `pdfjs-dist` c'è). Era già segnalato in `DESIGN.md` v4: il
lockfile non era stato aggiornato nell'ambiente precedente.

Rischi: una installazione con lockfile bloccato (`--frozen-lockfile`) può
fallire; in ogni caso il blocco della selezione pagine PDF resta fuori dalla
dipendenza ufficiale del progetto. Serve `bun install` nell'ambiente Lovable,
che qui non è disponibile (l'ambiente Arena ha `npm`, non `bun`).

### 7.2 Documenti disallineati rispetto a `DESIGN.md` v4

- `HANDOFF.md` (sezione «Stato UI») indica ancora come fonte la **v3.0
  «Squared & Earthy»**, con palette e font superati.
- `docs/external-agent-prompt.md` prescrive ancora **«Material Design 3
  Expressive: colori vibranti, angoli arrotondati, animazioni spring»**, cioè
  l'opposto della grammatica squadrata v4.

Sono istruzioni che un assistente legge prima di lavorare: vanno riallineate,
altrimenti il prossimo intervento riparte dalla grafica sbagliata.

### 7.3 Peso dell'app su telefono

Il blocco principale dell'area app pesa **1,3 MB (377 KB compresso)** e la
landing **812 KB (246 KB compresso)**: oltre la soglia di avviso dei 500 KB.
Il caricamento differito delle route esiste già (`lazy` in `App.tsx`); si può
spezzettare meglio (per esempio separare il lettore PDF, KaTeX, Recharts e
Framer Motion). Il telefono è il dispositivo principale degli studenti, quindi
`AGENTS.md` mette le prestazioni al quarto posto, prima della coerenza visiva.

### 7.4 Debito di stile (ESLint): 92 segnalazioni in 37 file

48 `no-explicit-any`, 20 `react-refresh/only-export-components`,
8 `ban-ts-comment`, 6 `no-var`, 3 `no-control-regex`, 2 `exhaustive-deps`,
2 `prefer-const`, 2 `no-useless-escape`, 1 `no-empty-object-type`.
Nessuna blocca la build; `tsconfig` è volutamente non stretto
(`strict: false`, `noImplicitAny: false`). I file toccati oggi sono puliti.

### 7.5 Proprietà morta nella cella corso

`HomeView` passa `eyebrowText` (il testo «Percorso attivo») a `CourseHeroCard`,
ma il componente v4 non la usa più: la prop è dichiarata nell'interfaccia e non
viene renderizzata. `DESIGN.md` v4 descrive la card come «titolo corso, lezione,
progresso lineare e una CTA», quindi l'etichetta in più non è prevista.
Da decidere: rimuovere la prop morta oppure restituire l'etichetta alla grafica.
**Nessuna modifica applicata**: sarebbe un cambiamento visibile non richiesto.

### 7.6 `.impeccable/design.json` non riallineato

`DESIGN.md` v4 dichiara apertamente che il sidecar è storico e non aggiornato.
Finché resta così, gli strumenti Impeccable che lo leggono possono ragionare
sulla v3.

### 7.7 Verifiche che richiedono il browser

Restano da fare le verifiche elencate in `DESIGN.md` v4: giorno/notte, upload
PDF completo e parziale, lettore, navigazione da tastiera, contrasto effettivo,
overflow e comportamento a 375/768/1024/1440 px. L'ambiente Arena non raggiunge
il backend Lovable Cloud, quindi qui non sono riproducibili: vanno fatte
nell'anteprima di Lovable dopo **Update**.

---

## 8. Come lavorerò da qui in poi (regole confermate)

1. **Codice sorgente** → lo scrive l'agente direttamente nella repo.
2. **Database ed Edge Function** → nessuna esecuzione diretta: l'agente prepara
   un prompt completo da incollare in Lovable, elencando solo i file e le
   funzioni realmente coinvolti.
3. **Pubblicazione** → l'agente lavora sul ramo di sessione, apre una Pull
   Request e la unisce a `main` in autonomia (scelta del proprietario del
   25 ottobre 2026); poi ricorda di cliccare **Update** in Lovable quando la
   modifica è visibile.
4. **Spiegazioni** → sempre in italiano semplice: cosa cambia, perché, cosa vede
   l'utente, cosa deve fare.
5. **Skill** → `.agents/skills/` come linee guida, con le priorità di
   `AGENTS.md`: sicurezza → accessibilità → chiarezza → prestazioni → coerenza
   visiva → originalità.
6. **Niente segreti in chat** → l'ambiente è già collegato a GitHub; chiavi e
   token non vanno mai incollati nella conversazione.

### Nota pratica per chi lavora in questo ambiente

L'installazione con `npm` (non `bun`) genera `package-lock.json` e tocca
automaticamente `supabase/functions/mcp/index.ts` (rigenerato da
`@lovable.dev/mcp-js` con il numero di versione corrente). Entrambi vanno
scartati prima di pubblicare: il lockfile ufficiale del progetto è `bun.lock` e
il file MCP è generato da Lovable.
