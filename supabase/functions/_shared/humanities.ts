/**
 * 📖 PERCORSI 2.0 — IL MOTORE UMANISTICO.
 *
 * Un libro di letteratura non si spiega come uno di algebra: le famiglie
 * umanistiche hanno ciascuna il suo vestito didattico, con la stessa
 * filosofia del vestito scientifico (subjects.ts) ma lo scopo opposto —
 * non formule in primo piano, bensì RACCONTO, CITAZIONI e RAGIONAMENTO:
 *
 *   · letteratura — card ariose, ritratto/contesto/pensiero/voce/opere,
 *     citazioni testuali commentate;
 *   · storiche (storia + geografia) — narrazione, date INCISE in grassetto
 *     e ancorate a timeline, causa→effetto esplicito;
 *   · filosofia — struttura dialettica tesi → obiezione → replica,
 *     esempi concreti, lessico definito al primo uso.
 *
 * Il JSON in output resta IDENTICO a quello del lettore attuale
 * (concept, explanation_parts, example, exercises): nessuna modifica
 * al client serve per vedere la differenza.
 *
 * Modulo PURO (zero Deno): collaudabile da vitest come subjects.ts.
 */

import {
  isScientificFamily,
  buildScientificLessonPrompt,
  SCIENTIFIC_SYSTEM_MESSAGE,
  type ScientificPromptInput,
} from "./subjects.ts";

export type FamilyLessonInput = ScientificPromptInput;

// ── I MESSAGGI DI SISTEMA ───────────────────────────────────────────────────

export const LITERATURE_SYSTEM_MESSAGE =
  "Sei un docente di letteratura per le superiori. Scrivi lezioni che si leggono come un racconto critico: card ariose (120-220 parole), citazioni testuali precise in blockquote, contesto e pensiero degli autori, giudizi motivati sullo stile. Mai schede da enciclopedia, mai enfasi da social. Rispondi ESCLUSIVAMENTE con JSON valido nel formato richiesto.";

export const HISTORY_SYSTEM_MESSAGE =
  "Sei un docente di storia (e geografia) per le superiori. Le tue lezioni sono RACCONTI: eventi che si vedono accadere, date in grassetto ancorate a timeline, ogni evento col suo perché e la sua conseguenza. Personaggi con nome e ruolo, mai cognomi in fila. Rispondi ESCLUSIVAMENTE con JSON valido nel formato richiesto.";

export const PHILOSOPHY_SYSTEM_MESSAGE =
  "Sei un docente di filosofia per le superiori. Le tue lezioni sono ragionamenti dialogici: tesi esposta con le sue ragioni, obiezione reale, replica o revisione. Ogni concetto astratto porta almeno un esempio terreno; il lessico tecnico è definito al primo uso. Tono conversazionale, mai accademico. Rispondi ESCLUSIVAMENTE con JSON valido nel formato richiesto.";

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
LE FIGURE
════════════════════════════════════════
- DIVIETO di descrivere immagini a parole: per riferirti a un elemento visivo del materiale usa SOLO il token [FIG:n].
- NON usare mai il campo "image_url".
${figureInstructions}
`;
}

// ── 1) LETTERATURA ──────────────────────────────────────────────────────────

export function buildLiteratureLessonPrompt(input: FamilyLessonInput): string {
  return `Sei un DOCENTE DI LETTERATURA. Il tuo compito NON è riassumere il materiale: RIELABORI i concetti con parole tue, in una lezione che si legge come un racconto critico. Mai copiare frasi letterali (max 7 parole consecutive identiche) — le CITAZIONI di versi e frasi sono l'unica eccezione, e vanno riportate precise.
${input.profileContext}${input.pageRangeInfo}

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido. NON aggiungere testo prima o dopo il JSON.

TITOLO LEZIONE: "${input.title}"
REGOLA DI FOCUS: la lezione tratta SOLO l'argomento del titolo, in profondità.

════════════════════════════════════════
1) IL FORMATO — CARD ARIOSA
════════════════════════════════════════
- 5-7 slide. Ogni slide sviluppa UN tema compiuto in 120-220 parole, paragrafi brevi separati da una riga vuota (\\n\\n).
- I "part_title" sono sobri: un'emoji pertinente all'inizio è ammessa, mai obbligatoria; massimo 6 parole.
- Vietate le schede da enciclopedia (date e titoli in fila) e vietata l'enfasi da social: si racconta, si spiega PERCHÉ conta.
- **Grassetto** solo su nomi, opere e parole-pivot (3-5 per slide): chi legge solo i bold deve cogliere il filo.

════════════════════════════════════════
2) LA STRUTTURA (adattala al titolo)
════════════════════════════════════════
Se la lezione è un AUTORE:
  1. IL RITRATTO — chi era: epoca, il gesto che lo rende necessario.
  2. IL CONTESTO — cosa eredita e cosa ribalta della tradizione.
  3. PENSIERO E TEMI — le idee portanti, in linguaggio chiaro.
  4. LA VOCE — come scrive: stile e scelte formali (termini tecnici definiti al primo uso).
  5. LE OPERE — le principali, ognuna con UNA frase su perché conta.
  6. IL DETTAGLIO CHE RESTA — un tratto o un aneddoto che fissa la memoria.
  7. IN SINTESI — 3-4 punti con parola chiave in grassetto.
Se è un'OPERA: contesto → nucleo/trama → temi → stile → fortuna.
Se è una CORRENTE o un TEMA: definizione → protagonisti → poetica → opere esemplari.

════════════════════════════════════════
3) LE CITAZIONI
════════════════════════════════════════
- Almeno DUE citazioni testuali significative, ognuna su una riga blockquote:
> «…verso o frase…» — Opera, riferimento
- La citazione serve solo se commentata: una frase su perché QUELLA frase è la chiave.
${figureBlock(input.figureInstructions)}
════════════════════════════════════════
4) GLI ESERCIZI (3-4)
════════════════════════════════════════
- Alterna "multiple_choice" e "true_false". Domande secche (max 20 parole), opzioni brevi (max 6 parole).
- Almeno UNA su una citazione (riconoscere autore, opera o contesto) e almeno UNA su pensiero o stile.
- Per OGNI esercizio scrivi "explanation": 1-2 frasi sul perché della risposta.

${jsonSchemaBlock(`{ "part_title": "Il ritratto", "content": "…120-220 parole…\\n\\n> «…citazione…» — Opera, riferimento\\n\\n…commento alla citazione…" }`)}

MATERIALE DI STUDIO (fonte da rielaborare, MAI da copiare salvo le citazioni):
${input.studyContent}`;
}

// ── 2) STORIECHE (STORIA + GEOGRAFIA) ───────────────────────────────────────

export function buildHistoryLessonPrompt(input: FamilyLessonInput): string {
  return `Sei un DOCENTE DI STORIA (o GEOGRAFIA). Il tuo compito NON è riassumere il materiale: RIELABORI i fatti con parole tue, in una lezione che si legge come un racconto — lo studente deve VEDERE accadere i fatti. Mai copiare frasi letterali (max 7 parole consecutive identiche).
${input.profileContext}${input.pageRangeInfo}

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido. NON aggiungere testo prima o dopo il JSON.

TITOLO LEZIONE: "${input.title}"
REGOLA DI FOCUS: la lezione tratta SOLO l'argomento del titolo, in profondità.

════════════════════════════════════════
1) IL FORMATO — IL RACCONTO
════════════════════════════════════════
- 6-8 slide da 90-160 parole: narrazione fluida, paragrafi brevi separati da una riga vuota (\\n\\n).
- "part_title" sobri (un'emoji ammessa, mai obbligatoria; max 6 parole).
- Chi agisce prende NOME e RUOLO in una frase: mai cognomi in fila, mai elenchi di date senza storia.

════════════════════════════════════════
2) LE DATE INCISE
════════════════════════════════════════
- Ogni data rilevante in **grassetto**, sempre agganciata all'evento (mai data nuda).
- Quando la lezione attraversa una sequenza, usa una TIMELINE numerata:
  1. **476** — cade l'Impero romano d'Occidente: Odoacre depone Romolo Augustolo.
  Le date si ricordano POSIZIZIONATE sulla linea del tempo, mai come elenco slegato.
- La slide finale è la SINTESI: la timeline compatta della lezione (3-5 tappe) in elenco numerato.

════════════════════════════════════════
3) CAUSA → EFFETTO (il cuore della lezione)
════════════════════════════════════════
- Ogni evento importante porta con sé il suo PERCHÉ e la sua CONSEGUENZA, almeno una frase ciascuno.
- I collegamenti fra episodi vanno resi espliciti: «questo porta a…», «il prezzo di… fu…».
- Se il materiale è GEOGRAFICO: organizza per regioni o fenomeni, con confronti (tabelle Markdown quando aiutano) e le carte come figure.
${figureBlock(input.figureInstructions)}
════════════════════════════════════════
4) GLI ESERCIZI (3-4)
════════════════════════════════════════
- Alterna "multiple_choice" e "true_false". Domande secche (max 20 parole), opzioni brevi.
- Almeno UNA su una relazione CAUSA-EFFETTO («quale conseguenza ebbe X?») e almeno UNA su date o personaggi.
- Per OGNI esercizio scrivi "explanation": 1-2 frasi sul perché della risposta.

${jsonSchemaBlock(`{ "part_title": "La crisi", "content": "…90-160 parole con **date** in grassetto e nessi espliciti…\\n\\n1. **235** — inizia l'anarchia militare…\\n2. **284** — Diocleziano riorganizza l'impero…" }`)}

MATERIALE DI STUDIO (fonte da rielaborare, MAI da copiare):
${input.studyContent}`;
}

// ── 3) FILOSOFIA ────────────────────────────────────────────────────────────

export function buildPhilosophyLessonPrompt(input: FamilyLessonInput): string {
  return `Sei un DOCENTE DI FILOSOFIA. Il tuo compito NON è riassumere il materiale: RIELABORI il pensiero con parole tue, in una lezione che è un RAGIONAMENTO in atto — non un elenco di tesi. Mai copiare frasi letterali (max 7 parole consecutive identiche), salvo le citazioni testuali.
${input.profileContext}${input.pageRangeInfo}

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido. NON aggiungere testo prima o dopo il JSON.

TITOLO LEZIONE: "${input.title}"
REGOLA DI FOCUS: la lezione tratta SOLO l'argomento del titolo, in profondità.

════════════════════════════════════════
1) IL FORMATO — IL DIALOGO INTERIORE
════════════════════════════════════════
- 6-8 slide da 90-160 parole, paragrafi brevi separati da una riga vuota (\\n\\n).
- "part_title" sobri (un'emoji ammessa, mai obbligatoria; max 6 parole).
- Tono conversazionale: si ragiona CON lo studente, mai sopra la sua testa.

════════════════════════════════════════
2) LA STRUTTURA DIALETTICA
════════════════════════════════════════
- Quando presenti una tesi, falla DIALOGARE, almeno DUE volte nella lezione:
  · la TESI, esposta con le sue ragioni;
  · l'OBIEZIONE (reale o immaginata: «ma allora…»);
  · la REPLICA, o la revisione che ne nasce.
- La slide finale è IL FILO: la catena di ragionamento della lezione in 3-4 passi numerati.

════════════════════════════════════════
3) GLI ESEMPI E IL LESSICO
════════════════════════════════════════
- Ogni concetto astratto porta almeno UN esempio terreno (quotidiano, se possibile): un filosofo senza esempi è una mappa senza territorio.
- I termini tecnici (gnoseologia, trascendentale, entelechia…) definiti al primo uso in UNA frase, con l'etimo quando aiuta.
- Le opere: quando ne citi una, una parola sul titolo e sul gesto che compie (perché quel libro ha contato).
- Almeno UNA citazione testuale in blockquote:
> «…» — Opera, riferimento
${figureBlock(input.figureInstructions)}
════════════════════════════════════════
4) GLI ESERCIZI (3-4)
════════════════════════════════════════
- Alterna "multiple_choice" e "true_false". Domande secche (max 20 parole), opzioni brevi.
- Almeno UNA del tipo «cosa risponderebbe X a Y?» o «quale obiezione colpisce questa tesi?».
- Per OGNI esercizio scrivi "explanation": 1-2 frasi sul perché della risposta.

${jsonSchemaBlock(`{ "part_title": "La tesi", "content": "…90-160 parole: tesi con le sue ragioni…\\n\\n> «…citazione…» — Opera\\n\\n…un esempio terreno e il dialogo con l'obiezione…" }`)}

MATERIALE DI STUDIO (fonte da rielaborare, MAI da copiare salvo le citazioni):
${input.studyContent}`;
}

// ── L'INSTRADATORE ──────────────────────────────────────────────────────────

export function isHumanitiesFamily(family: string | null | undefined): boolean {
  return family === "letteratura" || family === "storiche" || family === "filosofia";
}

/**
 * Il vestito giusto per la famiglia, o null se il percorso segue lo stampo
 * classico (famiglia ignota, generica, lingue, sociali, informatica, arte…).
 */
export function buildLessonPromptForFamily(
  family: string | null | undefined,
  input: FamilyLessonInput,
): string | null {
  if (isScientificFamily(family)) return buildScientificLessonPrompt(input);
  if (family === "letteratura") return buildLiteratureLessonPrompt(input);
  if (family === "storiche") return buildHistoryLessonPrompt(input);
  if (family === "filosofia") return buildPhilosophyLessonPrompt(input);
  return null;
}

/** Il messaggio di sistema della famiglia, o null per lo stampo classico. */
export function familySystemMessage(family: string | null | undefined): string | null {
  if (isScientificFamily(family)) return SCIENTIFIC_SYSTEM_MESSAGE;
  if (family === "letteratura") return LITERATURE_SYSTEM_MESSAGE;
  if (family === "storiche") return HISTORY_SYSTEM_MESSAGE;
  if (family === "filosofia") return PHILOSOPHY_SYSTEM_MESSAGE;
  return null;
}

/** La temperatura della lezione: il racconto respira un filo di più. */
export function lessonTemperature(family: string | null | undefined): number {
  return isHumanitiesFamily(family) ? 0.45 : 0.35;
}

// ── L'IMPRONTA DI MATERIA NEL PIANO DI STUDI ────────────────────────────────

/**
 * La regola 10 del prompt dei titoli: come organizzare MODULI e LEZIONI
 * secondo la materia. È ciò che domani disegnerà le viste a grafo
 * (corrente → autori per letteratura, timeline per storia, autore/tema per
 * filosofia): il piano nasce già con la forma giusta.
 */
export function buildPlanFamilyGuidance(family: string | null | undefined): string {
  switch (family) {
    case "letteratura":
      return `10. IMPRONTA DI MATERIA (LETTERATURA): organizza il percorso per AUTORI e CORRENTI, non seguendo i capitoli del libro.
   - Un modulo = un AUTORE (4 lezioni consigliate: l'autore e il suo tempo, il pensiero e i temi, la voce e lo stile, le opere essenziali) oppure una CORRENTE/PERIODO con i suoi autori.
   - "module_title" = il nome dell'autore o della corrente (es. "Giovanni Verga", "Il Futurismo").
   - Se il materiale è organizzato per opere o generi, adatta ma conserva il principio: il modulo è un'entità che si studia come unità.
`;
    case "storiche":
      return `10. IMPRONTA DI MATERIA (STORIA/GEOGRAFIA): il percorso segue la CRONOLOGIA.
   - Un modulo = un periodo o un fenomeno; le lezioni in ordine temporale rigoroso.
   - I titoli possono portare date o intervalli quando orientano (es. "La crisi del III secolo (235–284)").
   - Se il materiale è GEOGRAFICO: un modulo = una regione o un tema; le lezioni per aspetti (fisico, umano, economico).
`;
    case "filosofia":
      return `10. IMPRONTA DI MATERIA (FILOSOFIA): il percorso per AUTORI, SCUOLE e PROBLEMI.
   - Un modulo = un autore, una scuola o un problema; "module_title" = il suo nome.
   - Sequenza consigliata: prima i PROBLEMI di fondo (che domanda si pone questa filosofia), poi le risposte degli autori.
   - Dentro un autore: il problema che eredita, la sua risposta, le opere, le obiezioni che ha affrontato.
`;
    case "scientifiche":
      return `10. IMPRONTA DI MATERIA (SCIENZE): un modulo = un argomento tecnico coerente; le lezioni in progressione (prerequisiti → concetto → applicazioni), senza mescolare argomenti distanti nello stesso modulo.
`;
    default:
      return "";
  }
}

/** La riga d'impronta per il prompt del test finale ("" se generica). */
export function finalTestFamilyLine(family: string | null | undefined): string {
  switch (family) {
    case "scientifiche":
      return "\n5. IMPRONTA (SCIENZE): privilegia le applicazioni numeriche con unità di misura; le formule in LaTeX $…$.";
    case "letteratura":
      return "\n5. IMPRONTA (LETTERATURA): domande su attribuzione di opere e versi, contesto, pensiero e stile degli autori; almeno una domanda parte da una citazione.";
    case "storiche":
      return "\n5. IMPRONTA (STORIA/GEOGRAFIA): privilegia le relazioni causa-effetto e le conseguenze; includi date da collocare e personaggi col loro ruolo.";
    case "filosofia":
      return "\n5. IMPRONTA (FILOSOFIA): domande su tesi, obiezioni e confronti fra autori («cosa risponderebbe X a Y?»).";
    case "arte":
      return "\n5. IMPRONTA (STORIA DELL'ARTE): riconoscimento di opere, periodi e contesti.";
    default:
      return "";
  }
}
