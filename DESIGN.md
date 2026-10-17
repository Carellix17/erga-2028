---
name: Erga
description: 'Swiss Cognitive Grid + Tactile Studio — design system v4.0'
colors:
  canvas: '#F4F2EC'
  surface-primary: '#FAF8F3'
  surface-secondary: '#EAE6DC'
  paper: '#FFFDF9'
  sheet: '#FFFDF9'
  ink: '#11120D'
  ink-muted: '#4A4942'
  muted-foreground: '#52514A'
  steel: '#68665E'
  line: '#D6D1C4'
  control-line: '#11120D'
  accent-decorative: '#E63B11'
  primary: '#C82F0A'
  primary-deep: '#AC2607'
  primary-foreground: '#FFFDF9'
  cognitive: '#1D4E5F'
typography:
  interface: 'Ubuntu Sans, system-ui, sans-serif'
  body: 'Ubuntu Sans, system-ui, sans-serif'
  editorial: 'Instrument Serif, Georgia, serif'
  mono: 'Ubuntu Sans Mono, ui-monospace, monospace'
rounded:
  card: '0px'
  hero: '0px'
  sheet: '0px'
  control: '2px'
  button: '2px'
  dialog: '4px'
  full: '9999px'
spacing:
  base: '4px'
  cell: '24px'
  cell-large: '32px'
---

# Erga — DESIGN SYSTEM v4.0

**Swiss Cognitive Grid + Tactile Studio · 17 ottobre 2026**

Questo documento sostituisce il sistema v3 «Squared & Earthy» ed è la fonte visiva per il lavoro successivo. `PRODUCT.md` prevale sulle decisioni di prodotto. I valori eseguibili sono in `src/index.css` e `tailwind.config.ts`; i nomi legacy restano alias di compatibilità. Il sidecar `.impeccable/design.json` è storico e non è stato riallineato in questa revisione.

## Direzione

Una superficie di lavoro scolastica precisa: griglia continua, carta calda, testo leggibile e azioni riconoscibili. La Home mette davanti il percorso reale e il profilo cognitivo; Studio affianca materiali, controlli e lettura. Usare contenuti e progressi reali, stati vuoti espliciti e indicazioni trasparenti sul lavoro AI, secondo `PRODUCT.md`.

## Colore e superfici

| Ruolo / token CSS | Giorno | Uso |
|---|---|---|
| `--canvas` | `#F4F2EC` | Fondo pietra |
| `--surface-primary` | `#FAF8F3` | Celle e pannelli operativi |
| `--paper`, `--sheet` | `#FFFDF9` | Foglio di lettura |
| `--surface-secondary` | `#EAE6DC` | Superfici secondarie e stati |
| `--ink` | `#11120D` | Testo principale |
| `--ink-muted`, `--text-secondary` | `#4A4942` | Testo secondario |
| `--muted-foreground` | `#52514A` | Testo attenuato UI |
| `--steel` | `#68665E` | Metadati attenuati |
| `--line` | `#D6D1C4` | Separatori della griglia |
| `--control-line` | `#11120D` | Confine dei controlli |
| `--accent-primary` | `#E63B11` | Vermiglio decorativo |
| `--primary` | `#C82F0A` | CTA con testo carta |
| `--primary-deep` | `#AC2607` | Hover CTA |
| `--cognitive` | `#1D4E5F` | Dati cognitivi, progressi ed enfasi didattica |

Il vermiglio decorativo e la CTA hanno ruoli diversi. `#FFFDF9` su `#C82F0A` dà circa **5,35:1**, sufficiente per testo normale AA; questo calcolo della coppia non certifica l'accessibilità di tutte le schermate. Il bordo di griglia separa contenuti; i controlli usano un bordo più forte. I colori materia e routine esistenti conservano i loro ruoli semantici e non sostituiscono il colore dell'azione principale.

Il tema notte conserva gli override `.dark` in CSS: canvas `#0A0A08`, superficie/foglio `#1A1A15`, superficie secondaria `#262623`, testo `#FFFBF4`, secondario e contorno controlli `#D8CFBC`, linea `#3A382E`, cognitivo `#8ABCCC`. CTA e hover rimangono `#C82F0A` e `#AC2607`, con testo `#FFFDF9`. Usare i token semantici per ereditare il tema, evitando colori giorno fissi nelle viste.

## Tipografia

| Ruolo | Famiglia | Applicazione |
|---|---|---|
| UI e corpo | Ubuntu Sans | Navigazione, titoli dell'app, corsi, form, spiegazioni |
| Lettura editoriale | Instrument Serif | Concetto e intestazioni delle parti dentro `.lesson-paper` |
| Misure e azioni | Ubuntu Sans Mono | Punteggi, percentuali, numeri di pagina, metadati numerici e CTA primaria del componente Button |

`font-display` e l'alias legacy `font-serif` risolvono a Ubuntu Sans; per i titoli didattici usare `font-editorial` o le regole della carta lezione. Instrument Serif non si estende indiscriminatamente a tutti i titoli dell'app.

La scala base usa 16 px per UI e corpo; il corpo lezione usa 17 px con interlinea 1,65. I titoli di sistema mantengono la scala 36/30/26 px; il contenuto adatta dimensioni e a capo allo spazio disponibile. I titoli di concetto e delle parti usano `clamp(1.75rem, 3vw, 2.5rem)` per mantenere la gerarchia dentro il corpo prose. I dati numerici usano cifre tabulari. La scala di spaziatura parte da 4 px; le celle principali hanno padding 24 px, 32 px dove disponibile.

## Geometria, bordi e interazione

- Celle, card corso, hero e griglia: raggio **0 px**, separatori **1 px**, senza spazi vuoti tra celle contigue.
- Pulsanti e input: raggio **2 px**. Pannelli e dialoghi: massimo **4 px**. Avatar, radio e indicatori realmente circolari conservano `rounded-full`.
- Superfici piatte, senza ombre morbide o vetro. L'azione primaria usa un'ombra rigida **2 px × 2 px**, con pressione che riduce lo stacco; il colore dell'ombra primaria è #11120D in entrambi i temi.
- Focus visibile: contorno semantico **2 px**, offset **2 px**. Privilegiare target di almeno **44 px**, nomi accessibili e ordine da tastiera coerente.
- Nessuna grana su `.paper-grain` e `.table-grain`: gli alias esistenti ora rendono superfici piatte. La vecchia firma a gradiente diventa una linea decorativa vermiglia di 2 px.

Il movimento deve comunicare stato o continuità. I token condivisi sono 120/180/240/300/360 ms; evitare animazioni decorative continue, rispettare `prefers-reduced-motion` e mantenere disponibili i contenuti senza animazione.

## Composizione delle viste

**Home.** `HomeView` usa una griglia continua a 12 colonne: percorso prioritario **8/12**, telemetria **4/12** da `lg` (1024 px); sotto questa soglia le celle si impilano. La card mostra titolo corso, lezione, progresso lineare e una CTA. Timeline e strumenti proseguono nel blocco inferiore. `CognitiveTelemetry` legge il profilo autentico, con radar e sei misure testuali: Logica, Memoria, Focus, Lessico, Calma e Pratica. Se il profilo manca, mostra un messaggio esplicito; non inventare punteggi.

**Studio.** `Index` compone materiali e controlli a sinistra (**4/12**) e percorso/lettore a destra (**8/12**) su desktop. Sotto `lg`, «Materiali e lettura» è una sezione collassabile con stato accessibile. Il pannello di caricamento esistente viene incorporato nel lato materiali; fuori da Studio continua a essere uno sheet. Il lettore incorporato conserva avanzamento, esercizi, figure, assistente e ripresa. Il foglio destro dispone di scorrimento interno su desktop e flusso naturale sulle larghezze inferiori.

**Taglio di lettura.** Calma porta l'interlinea di paragrafi ed elenchi a 1,85; Logica evidenzia grassetti e formule con il colore cognitivo. È uno stato locale di **presentazione**: non riscrive lezioni, non cambia richieste o generazione AI e non costituisce un nuovo profilo cognitivo.

**PDF.** Il selettore rende disponibili pagine numerate con checkbox, azioni Tutte/Nessuna, caricamento ed errore espliciti. Prima dell'upload, un sottoinsieme viene copiato in un nuovo PDF nel browser tramite import dinamico di `pdf-lib` **1.17.1**. La selezione vuota o non valida è respinta; nessuna selezione specifica o tutte le pagine valide conservano il file originale. Il file sul dispositivo non viene modificato. Il flusso esistente riceve il PDF risultante: nessuna modifica backend, migrazione o nuova Edge Function.

## Fonti e verifica

Fonti della specifica: brief approvato per v4, `PRODUCT.md`, `src/index.css`, `tailwind.config.ts`, `HomeView`, `CourseHeroCard`, `CognitiveTelemetry`, `Index`, `StudioView`, `FullscreenLesson`, `UploadSheet`, `PdfPagePicker` e `src/lib/pdfSelection.ts`. Le fonti Google Fonts sono dichiarate nell'HTML dell'app; la disponibilità effettiva dei font richiede una verifica nel browser.

La verifica disponibile per questa revisione comprende **337 parsing sintattici superati**. L'ambiente non ha consentito l'installazione delle dipendenze per problemi DNS: **build completa, controlli con dipendenze e verifica visiva nel browser non sono stati completati**. La nuova dipendenza PDF è dichiarata in `package.json`, ma non è stato possibile aggiornare il lockfile in questo ambiente. Non interpretare il parsing come prova di correttezza dei tipi, dei flussi o del rendering.

Prima della pubblicazione restano da verificare build e lockfile, giorno/notte, caricamento PDF completo e parziale, lettore, tastiera, contrasto effettivo, overflow e comportamento a 375/768/1024/1440 px. Il backend resta Lovable Cloud; ogni modifica visibile deve essere trasferita e pubblicata con **Update** in Lovable prima di dichiararla online.
