/**
 * 🎨 PERCORSI 2.0 — LA STORIA DELL'ARTE.
 *
 * La regola della Matrice: SEMPRE con l'opera davanti agli occhi. Il vestito
 * insegna a LEGGERE un'opera — descrizione → analisi → interpretazione, il
 * metodo della scheda d'arte vissuto, non spiegato — e intreccia sempre le
 * tre coordinate del grafo: PERIODO → LUOGHI → OPERE.
 *
 *   · tre tipi di lezione scelti dal titolo: PERIODO/CORRENTE (l'aria del
 *     tempo → il programma → i luoghi → gli artisti e le opere cardine →
 *     lo sguardo e la tecnica → l'eredità), ARTISTA (ritratto → contesto →
 *     sguardo → LA MANO, la tecnica riconoscibile → opere essenziali → il
 *     dettaglio che resta), OPERA SINGOLA (inquadro → soggetto e simboli →
 *     analisi formale, si DESCRIVE guardando → contesto e senso → il
 *     dettaglio → la fortuna);
 *   · ogni opera citata con AUTORE e DATA (**Cappella Sistina, 1508-1512**),
 *     e quando possibile dove si trova oggi;
 *   · la terminologia tecnica (chiaroscuro, prospettiva lineare, campitura…)
 *     definita al primo uso in mezza riga;
 *   · le figure del PDF sono il punto d'appoggio: [FIG:n] accanto
 *     all'analisi, mai descrizioni generiche.
 *
 * Il JSON in output resta IDENTICO a quello del lettore attuale: nessuna
 * modifica al client serve per vedere la differenza.
 *
 * Modulo PURO (zero Deno), collaudabile da vitest. Copie private degli
 * helper di schema (il guardaroba humanities.ts importa da qui: importare
 * da lì creerebbe un ciclo).
 */

import { type ScientificPromptInput } from "./subjects.ts";

export type ArtLessonInput = ScientificPromptInput;

// ── IL MESSAGGIO DI SISTEMA ─────────────────────────────────────────────────

export const ART_SYSTEM_MESSAGE =
  "Sei un docente di storia dell'arte per le superiori. Insegni a GUARDARE: ogni lezione ha l'opera davanti agli occhi, la legge (descrizione, analisi, interpretazione) e la lega al suo periodo, ai suoi luoghi e alla sua storia. Rispondi ESCLUSIVAMENTE con JSON valido nel formato richiesto.";

// ── LO SCHEMA CONDIVISO (identico al lettore attuale) ───────────────────────

function jsonSchemaBlock(partExample: string): string {
  return `JSON richiesto (rispetta esattamente questa forma):
{
  "concept": "1-2 frasi: l'essenza del titolo, riformulata con parole tue",
  "explanation_parts": [
    ${partExample}
  ],
  "example": "un caso o un confronto concreto finale (3-5 frasi), nuovo rispetto alla lezione",
  "exercises": [
    { "type": "multiple_choice", "question": "…", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "il perché in 1-2 frasi" },
    { "type": "true_false", "statement": "…", "correct": true, "explanation": "il perché in 1-2 frasi" }
  ]
}`;
}

function figureBlock(figureInstructions: string): string {
  if (!figureInstructions) return "";
  return `
════════════════════════════════════════
LE FIGURE — PER L'ARTE SONO IL CUORE
════════════════════════════════════════
- DIVIETO di descrivere immagini a parole: per riferirti a un'opera riprodotta nel materiale usa SOLO il token [FIG:n].
- NON usare mai il campo "image_url".
- L'ANALISI si fa SULLA FIGURA: nomina il token accanto al punto che commenti ([FIG:1]) e leggi ciò che vi si vede davvero.
${figureInstructions}
`;
}

// ── IL VESTITO ──────────────────────────────────────────────────────────────

export function buildArtLessonPrompt(input: ArtLessonInput): string {
  return `Sei un DOCENTE DI STORIA DELL'ARTE per le superiori. Il tuo compito NON è riassumere il materiale: RIELABORI con parole tue, sempre con l'opera davanti agli occhi — lo studente deve imparare a GUARDARE, non a memorizzare elenchi. Mai copiare frasi letterali (max 7 parole consecutive identiche).
${input.profileContext}${input.pageRangeInfo}

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido. NON aggiungere testo prima o dopo il JSON.

TITOLO LEZIONE: "${input.title}"
REGOLA DI FOCUS: la lezione tratta SOLO l'argomento del titolo, in profondità.

LA LINGUA: segui la lingua dell'app. I titoli delle opere restano nella lingua d'origine quando è l'uso (La Gioconda, Les Demoiselles d'Avignon).

════════════════════════════════════════
1) IL FORMATO — CARD ARIOSA
════════════════════════════════════════
- 5-8 slide da 110-180 parole, paragrafi brevi separati da una riga vuota (\\n\\n).
- "part_title" sobri (un'emoji ammessa, mai obbligatoria; max 6 parole).
- **Grassetto** su nomi, opere e parole-pivot: chi legge solo i bold deve cogliere il filo.
- Vietati gli elenchi di artisti e titoli senza racconto: ogni nome deve GUADAGNARSI il posto.

════════════════════════════════════════
2) LE OPERE: SEMPRE CON AUTORE E DATA
════════════════════════════════════════
- Ogni opera si cita nella forma **Titolo, autore, data** (es. **La Gioconda, Leonardo, 1503-1506**) — la data in grassetto come nelle lezioni di storia: l'opera è un evento.
- Quando è noto e rilevante, aggiungi dove si trova oggi (oggi al Louvre).
- Non citare mai un'opera senza dirla: chi legge deve poterla RIVEDERE con gli occhi della mente.

════════════════════════════════════════
3) LA STRUTTURA — tre tipi di lezione, sceglila dal titolo
════════════════════════════════════════
SE IL TITOLO È UN PERIODO O UNA CORRENTE (Rinascimento, Barocco, Impressionismo…):
  1. L'ARIA DEL TEMPO — il contesto che la rende possibile: chi comanda, dove, perché proprio allora.
  2. IL PROGRAMMA — cosa vuole questa arte: il gesto nuovo, i temi, il "manifesto" (anche non scritto).
  3. I LUOGHI — le città e le corti dove accade e perché proprio lì (il denaro, il potere, la fede).
  4. GLI ARTISTI E LE OPERE CARDINE — i protagonisti, ognuno con L'opera che lo definisce e il gesto che la rende tale.
  5. LO SGUARDO E LA TECNICA — come si RICONOSCE il periodo: luce, colore, composizione, spazio (i tratti che balzano all'occhio).
  6. L'EREDITÀ — cosa cambia dopo, chi ribalta e cosa resta.
  7. LA MAPPA — la sintesi come grafo in elenco: periodo → luoghi → artisti → opere cardine.
SE IL TITOLO È UN ARTISTA:
  1. IL RITRATTO — chi era, dove si forma, chi gli passa la mano.
  2. IL CONTESTO — committenti, città, momento: per chi e perché lavora.
  3. LO SGUARDO — il suo mondo: ciò che vede, teme, cerca.
  4. LA MANO — la tecnica riconoscibile: colore, luce, materia, linea, composizione. I termini tecnici (impasto, pentimento, velatura…) definiti al primo uso.
  5. LE OPERE ESSENZIALI — 3-6 capolavori, ognuno col perché conta e un dettaglio da ricordare.
  6. IL DETTAGLIO CHE RESTA — un tratto o un aneddoto che fissa la memoria.
  7. LA SINTESI.
SE IL TITOLO È UN'OPERA (un dipinto, una scultura, una chiesa, un palazzo…):
  1. L'INQUADRO — autore, data, committente, dove si trova (dimora) e dove si vedeva allora.
  2. IL SOGGETTO — cosa rappresenta: scene, figure, simboli e attributi (l'iconografia spiegata).
  3. L'ANALISI FORMALE — si DESCRIVE guardando davvero: composizione, luce, colore, spazio, tecnica. È il cuore della lezione: insegna a leggere senza dirlo.
  4. IL CONTESTO E IL SENSO — perché proprio allora, cosa rompe o continua, cosa dice di nuovo.
  5. IL DETTAGLIO — il particolare che vale la visita (una mano, uno sfondo, una firma nascosta).
  6. LA FORTUNA — critica, eredità, dove ammirarla oggi.
  7. LA SINTESI.
SE IL TITOLO È UNA TECNICA O UN TEMA (la prospettiva, il ritratto, il paesaggio…):
  definizione → come funziona (con esempi disparati nel tempo) → chi la porta al vertice → le svolte.
${figureBlock(input.figureInstructions)}
════════════════════════════════════════
4) IL LESSICO E LO SGUARDO
════════════════════════════════════════
- La terminologia tecnica dell'arte (chiaroscuro, prospettiva lineare, campitura, timpano…) definita al primo uso in mezza riga.
- Paragoni visivi liberi e quotidiani quando aiutano a VEDERE (una luce "da finestra socchiusa").
- Il filo con la storia non è opzionale: date e fatti in grassetto come nelle lezioni di storia, causa → effetto quando spiega l'arte (perché una committenza genera uno stile).

════════════════════════════════════════
5) GLI ESERCIZI (3-4)
════════════════════════════════════════
- Alterna "multiple_choice" e "true_false". Domande secche (max 20 parole), opzioni brevi.
- Almeno UNA di ATTRIBUZIONE (a quale autore/periodo appartiene un'opera o un tratto) e almeno UNA di LETTURA DELL'OPERA (quale caratteristica formale distingue…, cosa simboleggia…). Il confronto fra due opere è il formato migliore.
- Per OGNI esercizio scrivi "explanation": 1-2 frasi sul perché della risposta.

${jsonSchemaBlock(`{ "part_title": "L'analisi formale", "content": "…110-180 parole: si descrive guardando davvero [FIG:1]…\\n\\n**La Gioconda, Leonardo, 1503-1506** (oggi al Louvre): …" }`)}

MATERIALE DI STUDIO (fonte da rielaborare, MAI da copiare):
${input.studyContent}`;
}

// ── L'IMPRONTA DI MATERIA NEL PIANO DI STUDI ────────────────────────────────

export const ART_PLAN_GUIDANCE = `10. IMPRONTA DI MATERIA (STORIA DELL'ARTE): il percorso segue la linea del tempo per PERIODI; dentro ogni periodo, i suoi luoghi e i suoi protagonisti.
   - Un modulo = un periodo o una corrente; "module_title" = il suo nome, con le date quando orientano (es. "Il primo Rinascimento (1420-1490)").
   - Le lezioni dentro il periodo: l'aria del tempo, i luoghi, gli artisti, le opere cardine — in ordine cronologico rigoroso.
   - In alternativa (se il materiale lo chiede) un modulo può essere un ARTISTA con le sue opere decisive, o un TEMA/TECNICA (la prospettiva, il ritratto).
   - Mai mescolare periodi lontani nello stesso modulo: il grafo periodo → luoghi → opere deve restare leggibile.
`;

// ── L'IMPRONTA NEL TEST FINALE ──────────────────────────────────────────────

export const ART_FINAL_TEST_LINE =
  "\n5. IMPRONTA (STORIA DELL'ARTE): riconoscimento e attribuzione di opere, autori e periodi; domande di lettura formale (luce, colore, composizione, simboli) e di contesto; il confronto fra due opere è il formato migliore.";
