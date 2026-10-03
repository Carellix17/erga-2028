/**
 * 🧭 PERCORSI 2.0 — IL RILEVATORE DI MATERIA + LE REGOLE SCIENTIFICHE.
 *
 * Un libro di matematica non si spiega come uno di storia: prima di generare
 * un percorso bisogna sapere CHE materia è. Questo modulo riconosce la
 * famiglia didattica del materiale in due modi:
 *
 *   1. EURISTICA (costo zero): parole chiave nel nome del file e in un
 *      campione del testo. Se il segnale è forte, si fa a meno dell'AI.
 *   2. RILEVATORE AI (una sola chiamata leggera): quando l'euristica non
 *      basta. Se anche l'AI fallisce, si ricade sull'euristica o su
 *      "generale" — il percorso NON si blocca mai per colpa del rilevatore.
 *
 * Contiene anche LE REGOLE DI SCRITTA SCIENTIFICHE (il "vestito" di
 * matematica/fisica/chimica: formule LaTeX in primo piano, anatomia della
 * formula, esempio svolto passo-passo) usate da generate-lessons quando la
 * famiglia è "scientifiche".
 *
 * Modulo PURO (zero Deno): collaudabile dai test vitest come pagemap.ts.
 */

export type SubjectFamily =
  | "scientifiche"
  | "letteratura"
  | "storiche"
  | "filosofia"
  | "lingue"
  | "latino"
  | "sociali"
  | "informatica"
  | "arte"
  | "generale";

export const SUBJECT_FAMILIES: SubjectFamily[] = [
  "scientifiche",
  "letteratura",
  "storiche",
  "filosofia",
  "lingue",
  "latino",
  "sociali",
  "informatica",
  "arte",
  "generale",
];

export interface SubjectDetection {
  family: SubjectFamily;
  /** Materia specifica, es. "Matematica", "Storia". */
  subject: string;
  /** Sicurezza 0-100. */
  confidence: number;
  /** Da dove arriva il verdetto: parole chiave o AI. */
  source: "heuristic" | "ai";
}

/** Le famiglie che usano il cervello scientifico (DeepSeek). */
export function isScientificFamily(family: string | null | undefined): boolean {
  return family === "scientifiche";
}

// ── 1. EURISTICA ────────────────────────────────────────────────────────────

/**
 * Parole chiave per famiglia (nome file + campione, minuscole, IT/EN).
 * Volutamente corte: l'euristica deve solo riconoscere i casi CHIARI; i casi
 * dubbi passano al rilevatore AI.
 */
const FAMILY_KEYWORDS: Partial<Record<Exclude<SubjectFamily, "generale">, string[]>> = {
  scientifiche: [
    "matematica", "math", "fisica", "physics", "chimica", "chemistry",
    "geometria", "algebra", "trigonometria", "calcolo", "derivate", "integrali",
    "parabola", "equazioni", "vettori", "cinematica", "dinamica", "meccanica",
    "termodinamica", "ottica", "elettrostatica", "stechiometria", "molecole",
    "atomo", "acidi", "reazioni",
  ],
  letteratura: ["letteratura", "italiano", "poetica", "narrativa", "critica letteraria", "promessi sposi", "divina commedia"],
  storiche: ["storia", "history", "medioevo", "risorgimento", "rivoluzione francese", "geografia", "impero romano", "guerra mondiale"],
  filosofia: ["filosofia", "philosophy", "plato", "platone", "kant", "nietzsche", "aristotele", "ontologia", "epistemologia", "etica"],
  lingue: ["inglese", "english", "spagnolo", "francese", "tedesco", "grammar", "español", "français"],
  latino: ["latino", "latin", "declinazioni", "verbi deponenti", "cicerone", "seneca", "ovidio"],
  sociali: ["economia", "economics", "psicologia", "psychology", "microeconomia", "macroeconomia", "comportamento"],
  informatica: ["informatica", "programming", "javascript", "python", "algoritmi", "coding", "programmazione"],
  arte: ["storia dell'arte", "romanico", "gotico", "rinascimento", "barocco", "dipinti", "scultura"],
};

/** Conta i segnali per ogni famiglia su un testo minuscolo. */
function countFamilySignals(text: string): Map<string, number> {
  const scores = new Map<string, number>();
  for (const [family, keywords] of Object.entries(FAMILY_KEYWORDS)) {
    let hits = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) hits++;
    }
    if (hits > 0) scores.set(family, hits);
  }
  return scores;
}

/**
 * Verdetto a costo zero. Serve un segnale forte (2+ parole chiave) per
 * fidarsi; con un solo segnale si resta prudenti e si passa all'AI.
 */
export function detectSubjectHeuristic(fileName: string, sample: string): SubjectDetection | null {
  const haystack = `${fileName} ${sample}`.toLowerCase();
  const scores = countFamilySignals(haystack);
  if (scores.size === 0) return null;

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [bestFamily, bestHits] = sorted[0];

  if (bestHits >= 2) {
    return {
      family: bestFamily as SubjectFamily,
      subject: subjectLabelFor(bestFamily as SubjectFamily),
      confidence: 70,
      source: "heuristic",
    };
  }
  return null;
}

function subjectLabelFor(family: SubjectFamily): string {
  const labels: Record<SubjectFamily, string> = {
    scientifiche: "Scienze",
    letteratura: "Letteratura",
    storiche: "Storia",
    filosofia: "Filosofia",
    lingue: "Lingue straniere",
    latino: "Latino",
    sociali: "Scienze sociali",
    informatica: "Informatica",
    arte: "Storia dell'arte",
    generale: "Generale",
  };
  return labels[family];
}

// ── 2. RILEVATORE AI ────────────────────────────────────────────────────────

export function buildDetectorPrompt(fileName: string, sample: string): string {
  const familiesList = SUBJECT_FAMILIES.filter((f) => f !== "generale").join(", ");
  return `Sei un catalogatore di materiale scolastico italiano. Identifica la MATERIA del materiale seguente.

Rispondi SOLO con un oggetto JSON valido, niente altro:
{"family": "...", "subject": "...", "confidence": 0-100}

- "family" è UNO di: ${familiesList}, generale.
  (scientifiche = matematica, fisica, chimica · storiche = storia, geografia ·
  sociali = economia, psicologia · arte = storia dell'arte · lingue = lingue
  straniere vive · latino è a parte)
- "subject" è la materia specifica, in italiano (es. "Matematica", "Storia", "Inglese").
- "confidence" è la tua sicurezza, da 0 a 100. Se il materiale è misto o
  ambiguo, scegli la famiglia dominante e abbassa la confidence.

NOME DEL FILE: "${fileName || "non disponibile"}"

CAMPIONE DEL MATERIALE (inizio):
"""
${sample}
"""`;
}

/** Trasforma la risposta AI in un verdetto affidabile (o null se inutilizzabile). */
export function parseDetectorResult(raw: string): SubjectDetection | null {
  if (typeof raw !== "string" || !raw.trim()) return null;

  let parsed: unknown;
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  const familyRaw = typeof obj.family === "string" ? obj.family.trim().toLowerCase() : "";
  if (!SUBJECT_FAMILIES.includes(familyRaw as SubjectFamily)) return null;

  const subjectRaw = typeof obj.subject === "string" ? obj.subject.trim().slice(0, 60) : "";
  const confidence = typeof obj.confidence === "number" && Number.isFinite(obj.confidence)
    ? Math.max(0, Math.min(100, Math.round(obj.confidence)))
    : 50;

  return {
    family: familyRaw as SubjectFamily,
    subject: subjectRaw || subjectLabelFor(familyRaw as SubjectFamily),
    confidence,
    source: "ai",
  };
}

/** La chiamata AI del rilevatore, iniettata dal chiamante (così il modulo resta puro). */
export type DetectorAiCall = (prompt: string) => Promise<string>;

/**
 * Il rilevatore completo: euristica → AI → euristica → generale.
 * NON lancia mai e non blocca mai la generazione del percorso.
 */
export async function detectSubject(
  input: { fileName: string; sample: string; aiCall?: DetectorAiCall },
): Promise<SubjectDetection> {
  // 1) Parole chiave: se il segnale è forte, si salva una chiamata AI.
  const heuristic = detectSubjectHeuristic(input.fileName, input.sample);
  if (heuristic && isScientificFamily(heuristic.family)) return heuristic;

  // 2) Rilevatore AI (una sola chiamata leggera).
  if (input.aiCall) {
    try {
      const raw = await input.aiCall(buildDetectorPrompt(input.fileName, input.sample.slice(0, 3000)));
      const verdict = parseDetectorResult(raw);
      if (verdict) return verdict;
    } catch {
      // AI giù → si continua con le scappatoie, il percorso non si ferma.
    }
  }

  // 3) Scappatoia: euristica debole o niente → quello che c'è, altrimenti "generale".
  if (heuristic) return heuristic;
  return { family: "generale", subject: "Generale", confidence: 0, source: "heuristic" };
}

// ── 3. LE REGOLE DI SCRITTA SCIENTIFICHE (il vestito di mat/fis/chim) ────────

export const SCIENTIFIC_SYSTEM_MESSAGE =
  "Sei un docente di materie scientifiche per le superiori. Generi lezioni a SLIDE (6-8 di teoria + 3-4 esercizi) con le FORMULE IN PRIMO PIANO: ogni formula in mostra va scritta in LaTeX con i delimitatori $$ su righe proprie (apertura $$, formula, chiusura $$); i simboli nella prosa con $…$ inline. Mai formule «in parole». Subito dopo ogni formula viene la sua ANATOMIA: cosa significa ogni simbolo e in che unità si misura. Almeno una slide contiene un ESEMPIO SVOLTO passo-passo con numeri concreti e unità di misura. Se un concetto lo richiede, puoi inserire UNA simulazione interattiva (blocco ```widget col solo JSON richiesto). Tono preciso e asciutto: niente aneddoti, niente aggettivi decorativi, niente prosa fumosa. Rispondi ESCLUSIVAMENTE con JSON valido nel formato richiesto.";

export interface ScientificPromptInput {
  title: string;
  profileContext: string;
  pageRangeInfo: string;
  figureInstructions: string;
  studyContent: string;
}

/** Il prompt della lezione per matematica, fisica e chimica. */
export function buildScientificLessonPrompt(input: ScientificPromptInput): string {
  return `Sei un DOCENTE DI MATERIE SCIENTIFICHE. Non riassumere il materiale: RIELABORA i concetti con parole tue, con rigore e chiarezza.
${input.profileContext}${input.pageRangeInfo}

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido. NON aggiungere testo prima o dopo il JSON. SOLO JSON puro.

TITOLO LEZIONE: "${input.title}"
REGOLA DI FOCUS: la lezione tratta SOLO l'argomento del titolo, in profondità.

════════════════════════════════════════
1) RIGORE SCIENTIFICO
════════════════════════════════════════
- Ogni affermazione deve essere corretta e verificabile nel materiale.
- Definisci ogni simbolo e ogni termine tecnico al primo uso.
- Vietati aneddoti gratuiti, aggettivi decorativi, prosa fumosa. La precisione prima di tutto.
- È TASSATIVAMENTE VIETATO copiare frasi letterali dal materiale (max 7 parole consecutive identiche).

════════════════════════════════════════
2) LE FORMULE IN PRIMO PIANO
════════════════════════════════════════
- Ogni concetto quantitativo viene presentato con la sua formula in MOSTRA (centrata, su righe per sé), con i delimitatori $$ su righe proprie:
  $$
  x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
  $$
- Subito dopo la formula, l'ANATOMIA: un elenco (o mini-tabella) che spiega OGNI simbolo con la sua unità di misura:
  - $a$, $b$, $c$ — i coefficienti dell'equazione (numeri reali)
  - $x$ — l'incognita che vogliamo risolvere
- Nella prosa usa il matematica inline $...$ per simboli ed espressioni brevi ($v$, $\\Delta t$, $E_k$, $m/s^2$).
- MAI scrivere una formula "in parole" quando la formula esiste.
- Se il concetto non ha formule (es. classificazioni), usa tabelle o elenchi strutturati.

════════════════════════════════════════
3) ARCHITETTURA A SLIDE (compatibile col lettore)
════════════════════════════════════════
- Genera 6-8 SLIDE DI TEORIA + 3-4 esercizi. Ogni slide è una micro-idea: 30-60 parole, frasi complete.
- Ogni "part_title" inizia con un'emoji pertinente (🎯 📚 🔬 📊 💡 🧭 ⚠️ 📐).
- Sequenza consigliata:
  1. 🎯 a cosa serve e perché è importante
  2. 📚 definizione del concetto + formula principale (con anatomia)
  3. 🔬 esempio svolto PASSO-PASSO (elenco numerato: ogni passo con operazione, risultato e unità di misura; esito finale in **grassetto**)
  4-5. 📊 approfondimenti, casi particolari, grafici/tabelle
  6. 💡 errore comune o trucco operativo (box "> ⚠️ …" o "> 📐 …")
  7-8. 🧭 sintesi finale (elenco numerato dei punti chiave)
- Separa i micro-paragrafi con una riga vuota (\\n\\n). Grassetto **solo** su termini-chiave e risultati.

════════════════════════════════════════
4) GLI ESERCIZI (3-4, dentro "exercises")
════════════════════════════════════════
- Almeno 2 di APPLICAZIONE NUMERICA: dati concreti presi dal contesto della lezione, opzioni numeriche con unità di misura (possono usare LaTeX inline $...$).
- Almeno 1 concettuale (perché/dove si applica/cosa succede se…).
- Alterna "multiple_choice" e "true_false". Opzioni brevi (max 6 parole).
- Per OGNI esercizio scrivi anche "explanation": 1-2 frasi che mostrano come si arriva alla risposta (verrà mostrata dopo la risposta).
- Le domande testano la COMPRENSIONE e l'APPLICAZIONE, non il riconoscimento di frasi del testo.

════════════════════════════════════════
5) IL WIDGET INTERATTIVO (massimo UNO per lezione)
════════════════════════════════════════
- Se (e solo se) un concetto si comprende meglio MANIPOLANDOLO, inserisci una simulazione interattiva già costruita, che lo studente controlla con i cursori.
- Per inserirla usa un blocco di codice con SOLO una riga JSON (niente testo fuori dal JSON):
\`\`\`widget
{"type": "parabola", "a": 1, "b": 0, "c": -3, "caption": "Sposta i coefficienti e osserva vertice e radici"}
\`\`\`
- "caption" è una frase brevissima (max 12 parole) nella lingua della lezione, che dice cosa osservare.
- Tipi disponibili (usa SOLO questi nomi, valori dentro gli intervalli):
  • parabola — y = ax² + bx + c. Parametri: a (-5..5), b (-10..10), c (-10..10). Per: equazioni di secondo grado, vertice, delta, radici.
  • retta — y = mx + q. Parametri: m (-5..5), q (-10..10). Per: proporzionalità, pendenza, intercette.
  • proiettile — moto parabolico. Parametri: v0 (1..50, m/s), angolo (5..85, gradi). Per: moto bidimensionale, gittata, altezza massima.
  • piano-inclinato — forze su un piano inclinato. Parametri: angolo (0..60, gradi), massa (0.1..20, kg), attrito (0..1). Per: componenti del peso, attrito.
  • ph — scala del pH. Parametro: ph (0..14). Per: acidità, basicità, concentrazione [H+].
  • gas — legge dei gas P·V = nRT. Parametri: n (0.1..5, mol), T (100..600, K), V (1..50, L). Per: pressione, volume, temperatura.
  • mercato — offerta e domanda. Parametri: domanda (1..20), offerta (1..20). Per: equilibrio di mercato (economia).
- Regole: UNO solo per lezione; collocalo nella slide GIUSTA (dopo la formula o l'esempio che illustra); scegli valori di partenza che mostrino un caso interessante; se nessun tipo è pertinente NON inserire nulla — la maggior parte delle lezioni va benissimo senza.

${input.figureInstructions ? `════════════════════════════════════════
6) FIGURE
════════════════════════════════════════
- DIVIETO ASSOLUTO di descrivere immagini a parole. Per riferirti a un elemento visivo del PDF usa SOLO il token [FIG:n].
- NON usare mai il campo "image_url".
${input.figureInstructions}
` : ""}
JSON richiesto (rispetta esattamente questa forma):
{
  "concept": "1-2 frasi: l'essenza del titolo, riformulata",
  "explanation_parts": [
    { "part_title": "🎯 …", "content": "…" },
    { "part_title": "📚 …", "content": "… formula in mostra con $$ su righe proprie, poi l'anatomia dei simboli …" },
    { "part_title": "🔬 Esempio svolto", "content": "1. …\\n2. …\\n3. **Risultato:** …" },
    { "part_title": "💡 …", "content": "…\\n\\n> ⚠️ …" },
    { "part_title": "🖐 Prova tu", "content": "Sposta i cursori e osserva cosa cambia:\\n\\n\`\`\`widget\\n{\"type\": \"parabola\", \"a\": 1, \"b\": 0, \"c\": -3, \"caption\": \"Osserva il vertice\"}\\n\`\`\`" },
    { "part_title": "🧭 In sintesi", "content": "1. **…**\\n2. **…**\\n3. **…**" }
  ],
  "example": "un caso concreto finale (3-5 frasi), nuovo rispetto alla lezione",
  "exercises": [
    { "type": "multiple_choice", "question": "…", "options": ["…", "…", "…", "…"], "correct_index": 0, "explanation": "come si arriva alla risposta" },
    { "type": "true_false", "statement": "…", "correct": true, "explanation": "perché è vero/falso" }
  ]
}

MATERIALE DI STUDIO (fonte da rielaborare, MAI da copiare):
${input.studyContent}`;
}
