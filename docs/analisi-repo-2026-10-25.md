# Analisi della repository — 25 ottobre 2026

Visita di salute completa all'apertura del ciclo di lavoro con l'agente Arena.

Due risultati concreti:

1. **un test rosso pubblicato su `main` è stato riparato** (la CTA primaria usa
   ora un gettone d'ombra, ma il test cercava ancora la vecchia stringa scritta
   a mano);
2. questo documento, con lo stato misurato del progetto e i punti aperti,
   compresa **un'azione richiesta su Lovable** (§7.1).

Nessuna modifica al funzionamento visibile dell'app: cambiano solo un test e la
documentazione.

---

## 1. In una frase

Erga è verde: **724 test su 724, tipi corretti, compilazione di produzione
riuscita**. Restano aperti i documenti non allineati alla grafica v4 (§7.2), il
peso dell'app su telefono (§7.3) e il deploy di due Edge Function già modificate
su `main` (§7.1).

---

## 2. Cosa ho fatto

1. Ho scaricato il codice dal ramo `main` (commit `5446b4e`, PR #86
   «swiss-cognitive-grid»).
2. Ho letto le regole di lavoro: `AGENTS.md`, `PRODUCT.md`, `DESIGN.md` v4.0,
   `HANDOFF.md`, `docs/external-agent-prompt.md` e il catalogo skill
   `.agents/skills/README.md`.
3. Ho installato le librerie ed eseguito la visita completa: test automatici,
   controllo dei tipi, compilazione di produzione, analisi degli avvisi di stile.
4. Ho verificato che il **push su GitHub funziona** (prova a secco): l'ambiente è
   già collegato all'account `Carellix17`, quindi **non servono chiavi in chat**.
5. Ho preparato in parallelo il riallineamento dei test alla v4. Nel frattempo lo
   stesso lavoro è stato pubblicato su `main` da un'altra sessione (PR #88 e
   #89): ho dato **precedenza alla versione già pubblicata** e ho scartato la mia
   duplicazione (§6.1).
6. Sull'unione ho trovato **un test rosso** e l'ho riparato (§6.2).

---

## 3. Lo stato di salute — misurato oggi sullo stato unito

| Controllo | Esito | Cosa significa in parole povere |
|---|---|---|
| Test automatici | ✅ **724 su 724** (82 file) | La rete di sicurezza è completa e verde |
| Test riparati oggi | ✅ **1** (era rosso su `main`) | Il controllo sulla CTA primaria difende di nuovo la grafica vera |
| Controllo tipi (TypeScript) | ✅ **0 errori** | Il codice è internamente coerente |
| Compilazione di produzione | ✅ riuscita in ~21 s | L'app è pubblicabile così com'è |
| Avvisi di stile (ESLint) | 🟡 **92** (70 errori, 22 avvisi) in 37 file | Debito storico; 0 nei file toccati oggi |
| Push su GitHub | ✅ verificato | L'agente pubblica da solo |

> `DESIGN.md` v4 dichiarava che build e lockfile **non** erano stati verificati
> per problemi di rete nell'ambiente precedente. Oggi la build è verificata e
> `pdf-lib` risulta presente nel lockfile ufficiale `bun.lock` (§7.6).

### Dimensioni del progetto (25 ottobre 2026)

| Voce | Quantità |
|---|---|
| File in `src/` | 348 |
| Righe di codice TypeScript/TSX | 46.464 |
| Componenti React | 155 (di cui 51 primitive `ui/`) |
| Pagine | 19 |
| Hook | 29 |
| Test | 82 file, 724 test |
| Edge Function (backend) | 31 |
| Tabelle nel database | 24 (+ 3 funzioni SQL) |
| Migrazioni SQL | 60 |
| Lingue | italiano e inglese (~490 testi) |

### Peso dell'app compilata

| Blocco | Peso | Compresso (gzip) |
|---|---|---|
| Area app (`Index`) | 1.322 kB | 381 kB |
| Landing / vendor | 812 kB | 246 kB |
| Secondo blocco `index` | 435 kB | 180 kB |
| CSS principale | 191 kB | 33 kB |

La soglia di avviso di Vite è 500 kB: tre blocchi la superano (§7.3).

---

## 4. Cos'è Erga (in breve)

Piattaforma di studio per studenti delle superiori che trasforma i materiali
reali della classe (PDF, documenti, foto, fonti web) in un percorso personale:
lezioni, esercizi, simulazioni di interrogazione, piano di studio collegato a
verifiche e impegni, sessioni Focus e profilo cognitivo a sei misure.

### Le "stanze" dell'app

| Stanza | Cosa fa |
|---|---|
| **Home** | percorso prioritario da riprendere (8/12) + telemetria cognitiva (4/12), piano del giorno, strumenti rapidi |
| **Studio** | materiali a sinistra (4/12), percorso e lettore a destra (8/12); lezioni, esercizi, figure, assistente |
| **Piano** | calendario di studio, verifiche, impegni, proposte dell'AI |
| **Core** | profilo cognitivo (esagono), materie, routine settimanale |
| Fuori dalle schede | Chat, Pratica, Interrogazione, Palestra scientifica, Focus e statistiche, Profilo, Impostazioni |

### Stack tecnico

React 18 + Vite 5 + TypeScript 5 + Tailwind 3 + shadcn/ui; React Query con cache
persistita; i18next; Framer Motion; PWA (service worker Workbox); backend
Lovable Cloud (tecnologia Supabase): Postgres, Auth, Storage, 31 Edge Function in
Deno; pagamenti Paddle; AI tramite catena di fallback in
`supabase/functions/_shared/ai.ts`.

---

## 5. Fonte visiva autorevole

`DESIGN.md` **v4.0 «Swiss Cognitive Grid + Tactile Studio»** (17 ottobre 2026):
canvas pietra `#F4F2EC`, celle `#FAF8F3`, foglio `#FFFDF9`; Ubuntu Sans per UI e
corpo, Instrument Serif solo per la lettura editoriale, Ubuntu Sans Mono per le
misure; griglia continua 1px, controlli 2px, pannelli al massimo 4px; superfici
piatte con ombra rigida 2px solo sull'azione primaria; vermiglio decorativo
`#E63B11` e CTA `#C82F0A` (≈5,35:1 con testo carta); tema giorno/notte.

I riferimenti alla v3 «Squared & Earthy», alla v2.1 «Carta contemporanea» e al
pilota V2-01 presenti nei documenti storici **non prevalgono** su `DESIGN.md`.

---

## 6. L'intervento di oggi

### 6.1 Il riallineamento dei test era già stato pubblicato

I test che difendevano la grafica v3 (geometria 4/8/12px, Playfair Display +
Inter, CTA Olive Drab, grana su tutte le card Home, velo satinato, ciambella di
avanzamento, Home senza profilo cognitivo) sono già stati riallineati alla v4
dalle PR **#88** e **#89**, pubblicate mentre questa analisi era in corso.

Le due versioni erano equivalenti. In sede di unione è stata mantenuta quella già
su `main`, per non duplicare il lavoro e perché è coerente con le altre modifiche
della PR #89 (per esempio il gettone d'ombra della CTA).

Stato dei guardrail visivi oggi verificato sul codice:

| Ambito | Regola v4 difesa dai test |
|---|---|
| Geometria | celle 0px, controlli 2px, pannelli e dialoghi 4px, cerchi reali `9999px` |
| Colore | canvas `#F4F2EC`, celle `#FAF8F3`, foglio `#FFFDF9`, inchiostro `#11120D`, CTA `#C82F0A`, cognitivo `#1D4E5F` |
| Notte | canvas `#0A0A08`, superfici `#1A1A15`/`#262623`, testo `#FFFBF4` |
| Caratteri | Ubuntu Sans (UI e corpo), Instrument Serif (solo lettura editoriale), Ubuntu Sans Mono (misure) |
| Superfici | piatte: ombre di sistema spente, grana neutralizzata, nessun blur in Home |
| Azione primaria | ombra rigida 2px in inchiostro, pressione che riduce lo stacco |
| Home | griglia continua 12 colonne, celle `min-w-0`, avanzamento lineare accessibile, telemetria cognitiva con sei misure autentiche e stato vuoto onesto |

### 6.2 Il test rosso riparato oggi

`src/test/appShellDesignSystem.test.ts`, controllo
«mantiene CTA vermiglia con ombra rigida 2px e testo carta».

- **Cosa cercava:** la classe scritta a mano `shadow-[2px_2px_0px_#11120D]` nel
  componente `Button`.
- **Cosa fa oggi il codice:** la PR #89 ha trasformato quell'ombra in un gettone
  del sistema — `shadow-primary-action` in Tailwind, che punta a
  `--shadow-primary-action: 2px 2px 0 #11120D` in `src/index.css`. È un
  miglioramento: lo stesso stacco 2px è ora condiviso da CTA, `PathHero` e
  `ModulePath` invece di essere ripetuto a mano.
- **Effetto:** il test falliva su `main` (`1 failed | 723 passed`).
- **Riparazione:** il controllo ora difende il **gettone** (classe nel
  componente, mappatura in `tailwind.config.ts`, valore in `index.css`), vieta il
  ritorno del valore inline e verifica che in pressione l'ombra sparisca
  (`active:shadow-none`). Nessuna modifica al prodotto.

### 6.3 Nota sul lockfile

`bun.lock` contiene `pdf-lib` (5 riferimenti): il punto segnalato da `DESIGN.md`
v4 è quindi chiuso. Resta §7.6 sul secondo lockfile.

---

## 7. Punti aperti (in ordine di importanza)

### 7.1 Due Edge Function modificate su `main` da deployare in Lovable ⚠️

Le PR #88 e #89 hanno cambiato il backend:

| File | Stato |
|---|---|
| `supabase/functions/_shared/studyMaterial.ts` | **nuovo** (codice condiviso: rifiuto terminale per materiale non studiabile) |
| `supabase/functions/extract-pdf/index.ts` | modificato |
| `supabase/functions/generate-lessons/index.ts` | modificato |

Nessuna migrazione SQL nuova. Il codice condiviso `_shared/` viene incorporato
nelle funzioni che lo importano, quindi il deploy delle due funzioni copre anche
quello.

**Se il deploy non è già stato fatto dalla sessione precedente, il comportamento
reale dell'app differisce da ciò che c'è nel repository.** Prompt pronto per
Lovable:

```
Sincronizza il repository (branch main) e deploya queste Edge Function, che
importano il nuovo modulo condiviso supabase/functions/_shared/studyMaterial.ts:
1. extract-pdf
2. generate-lessons
Nessuna migrazione SQL da applicare. Non rigenerare i tipi TypeScript: non ci
sono nuove tabelle o colonne.
```

### 7.2 Documenti disallineati rispetto a `DESIGN.md` v4

- `HANDOFF.md` indica ancora come fonte autorevole la **v3.0 «Squared &
  Earthy»** (righe 19, 21 e 407), con palette e caratteri superati.
- `docs/external-agent-prompt.md` (riga 47) prescrive ancora **«Material Design 3
  Expressive: colori vibranti, angoli arrotondati, animazioni spring»**, cioè
  l'opposto della grammatica squadrata v4.

Sono i primi file che un assistente legge: finché restano così, il prossimo
intervento rischia di ripartire dalla grafica sbagliata.

### 7.3 Peso dell'app su telefono

Tre blocchi superano la soglia di avviso di 500 kB (area app 1.322 kB, landing
812 kB, blocco `index` 435 kB). Il caricamento differito delle route esiste già
(`lazy` in `App.tsx`); si può spezzettare meglio separando lettore PDF, KaTeX,
Recharts e Framer Motion. `AGENTS.md` mette le prestazioni prima della coerenza
visiva, e il telefono è il dispositivo principale degli studenti.

### 7.4 Debito di stile (ESLint): 92 segnalazioni in 37 file

48 `no-explicit-any`, 20 `react-refresh/only-export-components`,
8 `ban-ts-comment`, 6 `no-var`, 3 `no-control-regex`, 2 `exhaustive-deps`,
2 `prefer-const`, 2 `no-useless-escape`, 1 `no-empty-object-type`.
Nessuna blocca la build; `tsconfig` è volutamente non stretto (`strict: false`,
`noImplicitAny: false`). I file toccati oggi sono puliti.

### 7.5 Proprietà morta nella cella corso

`HomeView` passa `eyebrowText` («Percorso attivo») a `CourseHeroCard`, ma il
componente v4 la dichiara nell'interfaccia e non la renderizza. `DESIGN.md` v4
descrive la card come «titolo corso, lezione, progresso lineare e una CTA»,
quindi l'etichetta aggiuntiva non è prevista. Da decidere: rimuovere la proprietà
morta o restituire l'etichetta alla grafica. **Nessuna modifica applicata**:
sarebbe un cambiamento visibile non richiesto.

### 7.6 Due lockfile, uno è vecchio

Il progetto ha sia `bun.lock` (testo, aggiornato: contiene `pdf-lib`) sia
`bun.lockb` (binario, legacy: non contiene né `pdf-lib` né `pdfjs-dist`). Bun usa
il primo; il secondo è un residuo che può confondere chi legge il repo. Da
valutare la rimozione, che però va fatta nell'ambiente Lovable (con `bun`).

### 7.7 `.impeccable/design.json` non riallineato

`DESIGN.md` v4 dichiara apertamente che il sidecar è storico e non aggiornato.
Finché resta così, gli strumenti Impeccable che lo leggono possono ragionare
sulla v3.

### 7.8 Verifiche che richiedono il browser

Restano da fare le verifiche elencate in `DESIGN.md` v4: giorno/notte, upload PDF
completo e parziale, lettore, navigazione da tastiera, contrasto effettivo,
overflow e comportamento a 375/768/1024/1440 px. L'ambiente Arena non raggiunge
il backend Lovable Cloud, quindi qui non sono riproducibili: vanno fatte
nell'anteprima di Lovable dopo **Update**.

---

## 8. Come lavorerò da qui in poi (regole confermate)

1. **Codice sorgente** → lo scrive l'agente direttamente nella repo.
2. **Database ed Edge Function** → nessuna esecuzione diretta: l'agente prepara un
   prompt completo da incollare in Lovable, elencando solo i file e le funzioni
   realmente coinvolti.
3. **Pubblicazione** → l'agente lavora sul ramo di sessione, apre una Pull Request
   e la unisce a `main` in autonomia (scelta del proprietario del 25 ottobre
   2026); poi ricorda di cliccare **Update** in Lovable quando la modifica è
   visibile.
4. **Spiegazioni** → sempre in italiano semplice: cosa cambia, perché, cosa vede
   l'utente, cosa deve fare.
5. **Skill** → `.agents/skills/` come linee guida, con le priorità di `AGENTS.md`:
   sicurezza → accessibilità → chiarezza → prestazioni → coerenza visiva →
   originalità.
6. **Niente segreti in chat** → l'ambiente è già collegato a GitHub; chiavi e
   token non vanno mai incollati nella conversazione.
7. **Lavoro parallelo** → prima di modificare file già toccati di recente,
   verificare lo stato di `main`: in questa sessione due interventi sullo stesso
   punto sono arrivati in parallelo (§6.1).

### Nota pratica per chi lavora in questo ambiente

L'installazione con `npm` (l'ambiente Arena non ha `bun`) genera
`package-lock.json` e tocca automaticamente `supabase/functions/mcp/index.ts`,
rigenerato da `@lovable.dev/mcp-js` con il numero di versione corrente. Entrambi
vanno scartati prima di pubblicare: il lockfile ufficiale è `bun.lock` e il file
MCP è generato da Lovable. Per lo stesso motivo la build va lanciata con
`npx vite build`, non con `npm run build`, che esegue anche la generazione della
sitemap e modifica `public/sitemap.xml`.
