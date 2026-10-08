import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withCors, validateAuth, errorResponse, successResponse } from "../_shared/auth.ts";
import { fetchCognitiveProfile, buildCognitivePromptAddon } from "../_shared/cognitive.ts";
import { normalizeLanguage, languageDirective } from "../_shared/language.ts";
import { buildModulePush, buildPathPush } from "../_shared/modulePush.ts";
import {
  detectSubject,
  isScientificFamily,
  scienceShapeIssues,
} from "../_shared/subjects.ts";
import { tryOpenRouterText } from "../_shared/openrouter.ts";
import {
  buildLessonPromptForFamily,
  familySystemMessage,
  lessonTemperature,
  buildPlanFamilyGuidance,
  finalTestFamilyLine,
} from "../_shared/humanities.ts";
import { extractJsonRobust, normalizeLessonPayload } from "../_shared/lessonPayload.ts";

const MAX_CONTEXT_CHARS = 80000;
const FREE_GENERATION_LIMIT = 5;
// 🏭 P10b: i percorsi sono divisi in MODULI da 4 lezioni (come in LessonsList/MODULE_SIZE).
const MODULE_SIZE = 4;
const LIMIT_REACHED_MESSAGE =
  "Hai raggiunto il limite di 5 lezioni gratuite per la beta. Per continuare a usare Erga senza limiti contattaci!";

// 🚧 P12 — RECINTO APERTO: il limite delle 5 lezioni gratuite è DISATTIVATO
// (richiesta del capo-cantiere: "elimina questo limite per ora"). Per
// riaccenderlo: BETA_LIMIT_ENABLED = true (qui e in get-lessons/getUsage).
// Il contatore generation_count continua a salire: serve per la statistica.
const BETA_LIMIT_ENABLED = false;

// 🕳️ P1 — LA CERNIERA: una lezione senza contenuto NON viene mai salvata come
// "generata". Questo messaggio passa al client (è nella lista safeMessages).
const EMPTY_AI_LESSON_MESSAGE =
  "La lezione è risultata vuota (risposta AI incompleta). Riprova tra poco.";

// ⏱️ P4 — LO SPAZZINO: un lavoro in background morto (tetto di tempo del
// runtime superato, deploy, blip di rete) non deve bloccare il percorso PER
// SEMPRE. Se lo stato "generating" o il lucchetto del modulo sono più vecchi
// di GENERATION_STALE_MS, lo stato è considerato morto e si riparte.
const GENERATION_STALE_MS = 10 * 60 * 1000;
function isStaleGeneration(ts: unknown): boolean {
  if (typeof ts !== "string" || !ts.trim()) return true;
  const t = Date.parse(ts);
  return !Number.isFinite(t) || Date.now() - t > GENERATION_STALE_MS;
}

// (extractJson è migrato in _shared/lessonPayload.ts come extractJsonRobust:
// riparatore LaTeX-aware, estrazione bilanciata e unit-testato — P1/P3)

import { callAIText } from "../_shared/ai.ts";
import {
  parsePages,
  buildPageOutline,
  sliceByPageRange,
  sampleAcrossPages,
  maxPageNumber,
  isLongDocument,
} from "../_shared/pagemap.ts";

// 🧭 Percorsi 2.0 — il sistema dello stampo classico (famiglie senza vestito proprio).
const FINANZ_SYSTEM_MESSAGE = "Sei un tutor didattico in stile carosello/Finanz. Genera lezioni a SLIDE CALIBRATE: 6-8 slide di teoria (ognuna 30-50 parole, MAI meno di 30, MAI più di 50) + 3-4 slide-quiz. Una slide = una micro-idea sviluppata con frasi complete. Ogni part_title inizia con un'emoji tematica. In OGNI slide includi almeno un BOX colorato con sintassi blockquote: '> 💡/⭐/🎯/⚡ ...' = box giallo (insight), '> 🛡️/⚠️/🔥/❗ ...' = box rosa (attenzione), '> 📊/🧭/🔎/📌/📐 ...' = box blu (dato/definizione). Usa **grassetto** sulle parole-pivot per favorire lo skimming. VIETATI muri di testo (>50 parole/slide) e slide vuote (<30 parole). Rispondi ESCLUSIVAMENTE con JSON valido. Vietato copiare frasi letterali dal materiale (max 7 parole consecutive identiche). Per le figure del PDF usa SOLO i token [FIG:n]; mai descrizioni testuali di immagini; mai il campo image_url.";

let REQUEST_LANGUAGE: "it" | "en" = "it";
async function callAI(messages: { role: string; content: string }[], temperature = 0.1, maxTokens = 4000): Promise<string> {
  const injected = [
    { role: "system", content: languageDirective(REQUEST_LANGUAGE) },
    ...messages,
  ];
  return callAIText(injected, temperature, maxTokens, "generate-lessons");
}

/**
 * Dall'elenco di file_path (immagini sorgente in archivio, separate da virgola)
 * ricava brevi descrizioni per i token [FIG:n]:
 *  - immagini Wikipedia: la descrizione vive nello slug del filename
 *    (es. "...wiki_img_0__statua_del_david.jpg" → "Statua del david")
 *  - foto caricate: etichetta generica "Foto caricata N".
 * L'ordine segue file_path: deve restare allineato con figure_index creato da
 * extract-lesson-figures (numerazione a prefisso).
 */
function parseSourceImages(filePath: unknown): { description: string }[] {
  const paths = String(filePath || "")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !p.toLowerCase().endsWith(".pdf"));
  return paths.slice(0, 6).map((p, i) => {
    const m = p.match(/img_\d+__([a-z0-9_]{3,80})\.[a-z0-9]+$/i);
    const desc = m ? m[1].replace(/_/g, " ") : `Foto caricata ${i + 1}`;
    return { description: desc.charAt(0).toUpperCase() + desc.slice(1) };
  });
}

serve(withCors(async (req) => {
  try {
    const body = await req.json();
    const { action, lessonIndex, contextId } = body;
    REQUEST_LANGUAGE = normalizeLanguage(body.language);

    const auth = await validateAuth(req, body);
    const { userId, supabase, userEmail } = auth;

    // Fetch user profile for personalization
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("institute_type, subject_levels")
      .eq("user_id", userId)
      .maybeSingle();

    const instituteMap: Record<string, string> = {
      liceo_scientifico: "Liceo Scientifico", liceo_classico: "Liceo Classico",
      liceo_linguistico: "Liceo Linguistico", istituto_tecnico: "Istituto Tecnico",
    };
    let profileContext = "";
    if (userProfile) {
      profileContext = `\nLo studente frequenta un ${instituteMap[userProfile.institute_type] || userProfile.institute_type}.`;
      if (userProfile.subject_levels && typeof userProfile.subject_levels === "object") {
        const levels = userProfile.subject_levels as Record<string, number>;
        profileContext += " Livelli: " + Object.entries(levels).map(([s, l]) => `${s}: ${l}/10`).join(", ") + ".";
      }
      profileContext += "\nAdatta la difficoltà e gli esempi al livello dello studente.";
    }

    // Personalizzazione cognitiva (Esagono): regole dinamiche basate sui punteggi 0-100.
    const cognitive = await fetchCognitiveProfile(supabase, userId);
    const cognitiveAddon = buildCognitivePromptAddon(cognitive);
    profileContext += cognitiveAddon;

    const legacyUserId = userEmail && userEmail !== userId ? userEmail : null;

    console.log(`Generate lessons for user: ${userId} (legacy: ${legacyUserId}) (authenticated: ${auth.isAuthenticated})`);

    // 🧭 PERCORSI 2.0 — IL CENTRALINO DELLA LEZIONE: le materie scientifiche
    // passano da DeepSeek (OpenRouter, con gradino gratuito e gradino a
    // pagamento); tutte le altre dalla catena Gemini classica. Se DeepSeek
    // non risponde, il paracadute è la catena classica: la lezione nasce comunque.
    const callLessonAI = async (
      messages: { role: string; content: string }[],
      temperature: number,
      maxTokens: number,
      scientific: boolean,
    ): Promise<string> => {
      const injected = [
        { role: "system", content: languageDirective(REQUEST_LANGUAGE) },
        ...messages,
      ];
      if (scientific) {
        const viaDeep = await tryOpenRouterText({
          messages: injected,
          temperature,
          maxTokens,
          tag: "generate-lessons",
          userId,
        });
        if (viaDeep !== null) return viaDeep;
        console.warn("[2.0] Lezione scientifica servita dalla catena Gemini (paracadute)");
      }
      return callAIText(injected, temperature, maxTokens, "generate-lessons");
    };

    // 🏭 P10b IL TORNIO: la generazione del CONTENUTO di una lezione, estratta
    // dall'azione "generateLesson" e resa macchina riutilizzabile — così la
    // fabbrica dei moduli (e il primo modulo caldo) tornisce con lo stesso stampo.
    const generateOneLessonInternal = async (lessons: any): Promise<any> => {
      // Demo-check interno (serve per NON contare le demo nel limite beta).
      let lessonIsDemo = false;
      if (lessons.context_id) {
        const { data: ctxFlag } = await supabase
          .from("study_contexts")
          .select("is_demo")
          .eq("id", lessons.context_id)
          .maybeSingle();
        lessonIsDemo = !!ctxFlag?.is_demo;
      }
      // Extract page range from lesson record
      const pageStart = (lessons as Record<string, unknown>).page_start as number | null;
      const pageEnd = (lessons as Record<string, unknown>).page_end as number | null;
      // 🌐 P11b SORGENTE SENZA PAGINE: docHasPages diventa VERO solo se il
      // testo della fonte ha davvero i marcatori "=== PAGINA N ===". I range
      // inventati dall'AI su testi web/foto (senza marcatori) NON contano —
      // altrimenti la caccia-figure andrebbe in un PDF fantasma.
      let docHasPages = false;
      let pageRangeInfo = "";
      
      let studyContent = "";
      let contextFilePath = "";
      if (lessons.context_id) {
        // Try with UUID first, then legacy email
        let { data: context } = await supabase.from("study_contexts").select("content, file_name, file_path, processing_status, error_message").eq("id", lessons.context_id).eq("user_id", userId).single();
        if (!context && legacyUserId) {
          const { data: legacyCtx } = await supabase.from("study_contexts").select("content, file_name, file_path, processing_status, error_message").eq("id", lessons.context_id).eq("user_id", legacyUserId).single();
          context = legacyCtx;
        }
        if (context?.processing_status === "failed") {
          const contextError = (context as Record<string, unknown>).error_message;
          throw new Error(typeof contextError === "string" && contextError.trim()
            ? contextError
            : "Errore durante l'elaborazione del PDF. Ricarica il file e riprova.");
        }
        if (context?.processing_status !== "completed") throw new Error("Il PDF è ancora in elaborazione. Riprova tra qualche secondo.");
        contextFilePath = String((context as Record<string, unknown> | null)?.file_path || "");
        if (context?.content) {
          const fullContext = String(context.content);
          docHasPages = maxPageNumber(fullContext) > 0;
          // 🗺️ P6 — lo scaffale giusto: se la lezione ha un intervallo di
          // pagine e il documento ha i marcatori, all'AI mandiamo SOLO quelle
          // pagine (prima le mandavamo sempre l'inizio del libro: i capitoli
          // finali non erano nemmeno nel materiale!). Se la fetta viene vuota
          // si ricade sulla troncatura classica di sicurezza.
          if (docHasPages && pageStart != null && pageEnd != null) {
            const sliced = sliceByPageRange(fullContext, pageStart, pageEnd, MAX_CONTEXT_CHARS);
            if (sliced.length >= 200) {
              studyContent = `FILE: ${context.file_name}\n${sliced}`;
            }
          }
          if (!studyContent) {
            studyContent = `FILE: ${context.file_name}\n${fullContext}`.substring(0, MAX_CONTEXT_CHARS);
          }
        }
      } else {
        const { data: contexts } = await supabase.from("study_contexts").select("content, file_name").eq("user_id", userId);
        const { data: legacyCtxs } = legacyUserId ? await supabase.from("study_contexts").select("content, file_name").eq("user_id", legacyUserId) : { data: null };
        const allCtxs = [...(contexts || []), ...(legacyCtxs || [])];
        if (allCtxs.length) studyContent = allCtxs.map((c: { file_name: string; content: string }) => `FILE: ${c.file_name}\n${c.content}`).join("\n\n").substring(0, MAX_CONTEXT_CHARS);
      }
      if (!studyContent) throw new Error("Contenuto vuoto. Caricamento fallito?");

      // Il consiglio "concentrati sulle pagine X-Y" vale solo per fonti con marcatori reali.
      if (docHasPages && pageStart != null && pageEnd != null) {
        pageRangeInfo = `\nQuesta lezione copre le pagine ${pageStart}-${pageEnd} del PDF originale. Concentrati SOLO sul contenuto di queste pagine.`;
      }

      // ── NEW: figures are extracted on-demand by extract-lesson-figures, not embedded here ──
      // The lesson is generated with [FIG:n] tokens that the client replaces with <PdfCrop /> after
      // calling extract-lesson-figures(lessonId).
      const pagesCovered = docHasPages && pageStart != null && pageEnd != null ? (pageEnd - pageStart + 1) : 0;

      // Figure disponibili per i token [FIG:n]:
      //  (a) PDF → la caccia estrarrà ritagli reali dalle pagine della lezione
      //  (b) niente pagine (foto caricate / ricerca web Wikipedia) → immagini
      //      sorgente già in archivio, con descrizioni da dare IN PASTO all'AI
      //      così piazza ogni token vicino al concetto giusto.
      const sourceImages = pagesCovered === 0 ? parseSourceImages(contextFilePath).slice(0, 3) : [];
      const expectedFigures = pagesCovered > 0
        ? Math.min(3, Math.max(0, pagesCovered))
        : sourceImages.length;

      const figureRules = `

REGOLE OBBLIGATORIE PER LE FIGURE:
1. UNICITÀ ASSOLUTA: ogni token [FIG:N] deve apparire UNA SOLA VOLTA in tutta la lezione. MAI ripetere lo stesso indice in più parti.
2. DISTRIBUZIONE: se inserisci più figure, mettile in "explanation_parts" DIVERSE, distanziate fra loro (es. una alla parte 2 e una alla parte 4). MAI tutte nella stessa parte, MAI tutte all'inizio o tutte in fondo.
3. PERTINENZA RIGOROSA: inserisci [FIG:N] SOLO se la frase immediatamente precedente parla davvero di ciò che QUELLA specifica figura raffigura. Se non c'è un nesso logico chiaro col paragrafo, OMETTI il token — meglio nessuna figura che una figura fuori contesto.
4. Indici da usare: solo da [FIG:0] a [FIG:${expectedFigures - 1}], in ordine crescente, senza saltare numeri intermedi.
5. Posizionamento: token su una RIGA A SÉ dentro il "content", subito DOPO la frase pertinente.
   Esempio: "content": "Il bosco benedettino è strutturato a filari ordinati.\\n\\n[FIG:0]\\n\\nQuesta organizzazione…"
6. NON descrivere mai a parole il contenuto dell'immagine ("L'immagine mostra…", "Come si vede in figura…").
7. NON usare il campo "image_url".
8. Se nessuna figura è davvero pertinente al testo della lezione, ometti TUTTI i token. Le figure resteranno comunque accessibili altrove.`;

      let figureInstructions = "";
      if (pagesCovered > 0 && expectedFigures > 0) {
        figureInstructions = `\n\nFIGURE DAL PDF (token speciali):
Il sistema estrarrà automaticamente fino a ${expectedFigures} figure reali (foto, diagrammi, tabelle, schemi, grafici, mappe) dalle pagine ${pageStart}-${pageEnd} del PDF.` + figureRules;
      } else if (expectedFigures > 0) {
        const list = sourceImages.map((img, i) => `[FIG:${i}] → ${img.description}`).join("\n");
        figureInstructions = `\n\nIMMAGINI REALI DISPONIBILI (token speciali):
Questa lezione ha già ${expectedFigures} immagini reali allegate al materiale (foto caricate dallo studente o immagini prelevate dal web):
${list}
Usa ciascun token [FIG:N] SOLO dove il testo parla proprio di ciò che quell'immagine mostra (vedi elenco sopra).` + figureRules;
      }

      // 🧭 PERCORSI 2.0 — che famiglia di materia è questo percorso?
      // (null se il percorso è v1 senza materia rilevata, o se la migrazione
      // del passaporto non è ancora applicata: si genera come sempre, zero rischi)
      let subjectFamily: string | null = null;
      if (lessons.context_id) {
        const { data: ctxFam } = await supabase
          .from("study_contexts")
          .select("subject_family")
          .eq("id", lessons.context_id)
          .maybeSingle();
        subjectFamily = ((ctxFam as { subject_family?: string } | null) ?? null)?.subject_family ?? null;
      }
      const scientific = isScientificFamily(subjectFamily);

      const finanzPrompt = `Sei un TUTOR DIDATTICO esperto. Il tuo compito NON è riassumere o riproporre frasi del materiale: devi RIELABORARE e RISTRUTTURARE i concetti da zero, con parole tue, in una lezione didatticamente ottimale.
${profileContext}${pageRangeInfo}

IMPORTANTE: Rispondi SOLO con un oggetto JSON valido. NON aggiungere testo prima o dopo il JSON. SOLO JSON puro.

TITOLO LEZIONE: "${lessons.title}"
REGOLA DI FOCUS: la lezione tratta SOLO l'argomento del titolo. Spiega in profondità un unico nucleo tematico.

════════════════════════════════════════
1) FILTRO DI RIELABORAZIONE (NO COPY-PASTE)
════════════════════════════════════════
- È TASSATIVAMENTE VIETATO copiare frasi o paragrafi letterali dal materiale fornito. Nessuna sequenza di 8+ parole consecutive può coincidere col testo originale.
- Procedura obbligatoria: (a) leggi, (b) isola i concetti chiave, (c) stabilisci l'ordine logico ottimale di apprendimento (dal semplice al complesso, dal generale allo specifico), (d) RISCRIVI tutto da zero con prosa tua, chiara, incisiva, priva di gergo inutile.
- Vietate: ridondanze, retorica vuota, frasi-riempitivo, "come abbiamo detto", "in questo paragrafo vedremo".
- Mantieni terminologia tecnica corretta, ma definiscila al primo uso.

════════════════════════════════════════
2) ARCHITETTURA A SLIDE (STILE FINANZ — ULTRA-PARCELLIZZATA)
════════════════════════════════════════
Ogni elemento di "explanation_parts" è UNA SLIDE a tutto schermo che l'utente sblocca cliccando "Continua". REGOLA GEOMETRICA TASSATIVA:

- Genera 6-8 SLIDE DI TEORIA (più 3-4 slide-esercizio gestite a parte in "exercises", per un totale di 10-15 slide).
- Ogni slide è CALIBRATA: deve contenere fra 30 e 50 parole — non meno (slide vuote = output errato), non più (muro di testo = output errato). Frasi complete, fluide, didatticamente valide, mai monche.
- Una slide = una micro-idea sviluppata in 2-4 frasi compatte. VIETATO impilare due concetti distinti nella stessa slide: se serve più materiale, AGGIUNGI UNA SLIDE.
- Vietati i muri di testo, i paragrafi lunghi (>4 frasi), le digressioni, i preamboli ("come abbiamo detto", "in questo paragrafo vedremo").
- Spacca il concetto in step sequenziali: introduzione, definizione, pilastri, esempio, dato chiave, focus/box evidenziato, sintesi. Ritmo da carosello informativo.

Sequenza obbligatoria delle 6-8 slide di teoria (in quest'ordine logico). OGNI part_title DEVE iniziare con un'emoji pertinente al tema (🧠, 🛡️, 📊, 🎯, 📚, 🔬, 💡, 🧭, ⚖️, 🏛️, 🧪, 📜, 🌍, ⚡, 🔎, 📌, 🗺️ …):

  1. 🎯 GANCIO — frase d'impatto che mostra perché il concetto è rilevante (30-45 parole) con 2-3 **parole chiave** in grassetto. part_title inizia con "🎯 ".
  2-3. 📚 DEFINIZIONE / PRIMO PILASTRO — 1-2 slide che spiegano il nucleo in modo completo (30-50 parole l'una). Usa frasi piene, definisci i termini tecnici al primo uso.
  4-5. 🔬 ESEMPIO / DATO / DETTAGLIO — 1-2 slide con un caso concreto, un numero significativo, una micro-tabella o un elenco di 3 voci brevi. 30-50 parole.
  6. 💡 FOCUS / CURIOSITÀ (obbligatoria) — 1 slide-box con part_title che inizia con "💡 Lo sapevi che…", "🔎 Focus:", "📌 Nomenclatura:" o "⚡ Curiosità:". 30-50 parole, secco e memorabile.
  7-8. 🧭 SINTESI / TAKEAWAY — 1-2 slide finali (elenco numerato di 3-4 punti brevi con **lead bold**, oppure mini-tabella, oppure timeline a 3 tappe). part_title inizia con "🧭 In sintesi" o "🗺️ Mappa".

Conteggio parole: ogni slide di teoria 30-50 parole. Somma teoria 240-380 parole. Se una slide sfora, spostane una parte in una NUOVA slide; se è troppo corta, ARRICCHISCILA con un esempio o un dettaglio del PDF — mai lasciarla scarna.

BOX COLORATI OBBLIGATORI (stile Finanz). All'interno di OGNI slide di teoria devi inserire ALMENO un mini-box visivo per spezzare il blocco di testo e creare contrasto. Sintassi: una riga (o più righe consecutive) che inizia con \`> EMOJI \` viene renderizzata come box colorato. Il colore dipende dall'emoji iniziale:
  • \`> 💡 …\` / \`> ⭐ …\` / \`> 🎯 …\` / \`> ⚡ …\` → box GIALLO SOFT (insight, curiosità, takeaway).
  • \`> 🛡️ …\` / \`> ⚠️ …\` / \`> 🔥 …\` / \`> ❗ …\` → box ROSA SOFT (attenzione, rischio, errore comune, regola critica).
  • \`> 📊 …\` / \`> 🧭 …\` / \`> 🔎 …\` / \`> 📌 …\` / \`> 📐 …\` → box BLU SOFT (dato, metrica, definizione tecnica, riferimento).
Il box deve contenere 8-20 parole ad alto impatto, con almeno una **parola chiave** in grassetto. NON sprecare il box per ripetere la frase precedente: aggiungi un dettaglio, una formula, una regola memorabile.

════════════════════════════════════════
3) REGOLE DI FORMATTAZIONE ARIOSA
════════════════════════════════════════
- Separa SEMPRE i micro-paragrafi con una riga vuota (\\n\\n) per dare respiro visivo.
- Niente paragrafi >3 righe consecutive di prosa: spezza con elenco puntato, elenco numerato o emoji.
- Usa emoji pertinenti (1-2 per parte, non di più) come ancore visive, mai come decorazione gratuita.
- Usa **grassetto** con misura: solo termini-chiave e parole-pivot, non frasi intere.
- Apertura slide: il part_title DEVE sempre iniziare con un'emoji tematica seguita da uno spazio e poi dal titolo (max 5 parole).
- Skimming: distribuisci 3-5 grassetti per slide sulle parole-pivot, così che chi legge solo i bold capisca comunque il senso.

════════════════════════════════════════
4) INTEGRAZIONE NATIVA DI SCHEMI / TABELLE / TIMELINE
════════════════════════════════════════
Sei OBBLIGATO a individuare nel materiale i punti che si prestano a visualizzazione strutturata e a renderli con Markdown all'interno di "content", interrompendo la narrazione nel punto strategico per fissare la memoria visiva.

Quando convertire OBBLIGATORIAMENTE in struttura visiva:
  • Confronto fra due o più entità (teorie, autori, modelli, eventi, periodi) → **tabella Markdown GFM**.
  • Dati quantitativi, parametri, classificazioni → **tabella**.
  • Sequenze temporali (eventi storici, fasi di un processo) → **timeline** come elenco numerato con anno/fase in grassetto.
  • Procedure / algoritmi a passi → **elenco numerato a step** con verbo d'azione iniziale.
  • Tassonomie / gerarchie → **elenco puntato annidato**.

Sintassi tabella Markdown GFM (obbligatoria, mantieni le pipe):
\`\`\`
| Aspetto | Teoria A | Teoria B |
|---|---|---|
| Origine | … | … |
| Tesi    | … | … |
\`\`\`

Sintassi timeline (elenco numerato):
\`\`\`
1. **1789** — Scoppio della Rivoluzione …
2. **1799** — Colpo di stato di Brumaio …
\`\`\`

Regole: almeno UNA struttura visiva (tabella o timeline o elenco a step) deve comparire nella lezione se il materiale lo permette anche solo lontanamente. La sintesi finale è il punto naturale per uno schema riepilogativo.

════════════════════════════════════════
5) FIGURE DAL PDF
════════════════════════════════════════
- DIVIETO ASSOLUTO di descrivere immagini a parole ("L'immagine mostra…", "Come si vede in figura…", "La tabella illustra…").
- Per riferirti a un elemento visivo del PDF usa SOLO il token [FIG:n].
- NON usare mai il campo "image_url".
${figureInstructions}

════════════════════════════════════════
6) ALTRI CAMPI
════════════════════════════════════════
- "concept": 1-2 frasi che catturano l'essenza del titolo (riformulata, non copiata).
- "example": un caso concreto finale (3-5 frasi), nuovo, non ripreso letteralmente dal testo.
- "exercises": ESATTAMENTE 3 o 4 esercizi (= 3-4 SLIDE-QUIZ DI SBARRAMENTO mostrate consecutivamente subito dopo le slide di teoria, all'interno della stessa lezione). Alterna i tipi "multiple_choice" e "true_false". Domande secche, una sola idea per quiz, max 20 parole nella domanda/affermazione, opzioni brevissime (max 6 parole l'una). Le domande devono testare la COMPRENSIONE dei concetti delle slide precedenti, non il riconoscimento di una frase del testo. Almeno 1 domanda deve riguardare il blocco "FOCUS/CURIOSITÀ".

JSON richiesto (rispetta esattamente questa forma):
{
  "concept": "...",
  "explanation_parts": [
    { "part_title": "🎯 Perché ti riguarda", "content": "Il **principio X** governa ogni decisione operativa: capirlo significa anticipare gli errori più costosi. Senza questa lente, il resto del capitolo resta opaco.\\n\\n> ⚡ In 3 righe capisci **perché** tutto il resto ha senso." },
    { "part_title": "📚 Definizione", "content": "La **nozione chiave** indica il meccanismo per cui un sistema reagisce a uno stimolo mantenendo l'equilibrio interno. È un concetto **tecnico** ma quotidiano: la usi ogni volta che bilanci due forze contrapposte.\\n\\n> 📐 **Formula mentale:** stimolo → risposta → ritorno all'equilibrio." },
    { "part_title": "🏛️ Il primo pilastro", "content": "Il primo pilastro stabilisce che ogni **azione** produce una reazione misurabile. Tre elementi lo definiscono: l'origine dello stimolo, l'intensità e la durata della risposta. Senza uno dei tre, il modello non regge.\\n\\n> 🛡️ Mai confondere **intensità** e **durata**: sono indipendenti." },
    { "part_title": "🔬 Esempio concreto", "content": "Pensa a un termostato: rileva la temperatura, confronta col valore obiettivo e attiva la caldaia. È l'archetipo del meccanismo: **sensore**, **confronto**, **attuatore**.\\n\\n> 🔎 Lo stesso schema spiega anche la **glicemia** nel sangue." },
    { "part_title": "📊 Dato chiave", "content": "Tre componenti, sempre presenti, in ordine fisso:\\n\\n1. **Sensore** — misura la grandezza.\\n2. **Comparatore** — calcola lo scarto dall'obiettivo.\\n3. **Attuatore** — corregge la deviazione.\\n\\n> 📊 Se manca uno solo, il sistema **non si autoregola**." },
    { "part_title": "💡 Lo sapevi che…", "content": "Il termine **feedback** nasce in ingegneria nel 1909, ma oggi lo usiamo perfino in psicologia organizzativa. Il principio resta identico: un'informazione di ritorno che modifica il comportamento futuro del sistema.\\n\\n> 💡 Stesso nome, **stessa logica**, contesti diversissimi." },
    { "part_title": "🧭 In sintesi", "content": "1. **Definizione:** meccanismo di autoregolazione.\\n2. **Tre parti:** sensore, comparatore, attuatore.\\n3. **Esempio guida:** termostato.\\n\\n> 🧭 Se sai ripetere questi **tre punti**, hai capito la lezione." }
  ],
  "example": "...",
  "exercises": [
     { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct_index": 0 },
     { "type": "true_false", "statement": "...", "correct": true },
     { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct_index": 2 }
  ]
}

MATERIALE DI STUDIO (fonte da rielaborare, MAI da copiare):
${studyContent}`;

      // 🧭 PERCORSI 2.0 — il vestito giusto per la materia: le scientifiche
      // hanno regole proprie (formule LaTeX, anatomia, esempio svolto) e il
      // cervello DeepSeek; tutte le altre seguono il stampo classico.
      const familyPrompt = buildLessonPromptForFamily(subjectFamily, {
        title: String(lessons.title || ""),
        profileContext,
        pageRangeInfo,
        figureInstructions,
        studyContent,
      });
      const prompt = familyPrompt ?? finanzPrompt;

      const content = await callLessonAI(
        [
          { role: "system", content: familySystemMessage(subjectFamily) ?? FINANZ_SYSTEM_MESSAGE },
          { role: "user", content: prompt },
        ],
        lessonTemperature(subjectFamily),
        7000,
        scientific,
      );

      console.log("AI lesson response (first 300 chars):", content.substring(0, 300));
      const lessonData = extractJsonRobust(content);

      // 🕳️ P1 — LA CERNIERA: la risposta deve contenere una lezione VERA.
      // Se l'AI ha risposto con un JSON senza parti (o con parti vuote), NON
      // si salva niente: si lancia un errore esplicito, così il chiamante
      // ritenta (modulo caldo / fabbrica) o l'utente vede il messaggio giusto.
      let normalized = normalizeLessonPayload(lessonData);
      if (!normalized) throw new Error(EMPTY_AI_LESSON_MESSAGE);

      // 📏 P6 — LA VERIFICA A POSTERIORI (7 ottobre 2026): il prompt
      // scientifico impone un tetto a formule in mostra e lunghezza, ma
      // nessuno controllava che la risposta lo rispettasse — nascevano le
      // «lezioni-mostre». Se sfora, si rifà UNA volta col promemoria severo;
      // se sfora ancora, si accetta (best effort) e lo si lascia nei log.
      if (scientific && normalized.explanationParts) {
        const issues = scienceShapeIssues(normalized.explanationParts);
        if (issues.length > 0) {
          console.warn(`[P6] lezione scientifica fuori misura (${issues.join("; ")}): la rifaccio più asciutta`);
          try {
            const retryContent = await callLessonAI(
              [
                { role: "system", content: familySystemMessage(subjectFamily) ?? FINANZ_SYSTEM_MESSAGE },
                {
                  role: "user",
                  content: prompt + `\n\n⚠️ LIMITE TASSATIVO (la risposta precedente lo superava: ${issues.join("; ")}): MASSIMO 4 formule in mostra $$ in tutta la lezione, ogni altro simbolo inline $…$; 6-8 slide da 30-60 parole ciascuna. Riscrivi la lezione rispettando i limiti.`,
                },
              ],
              lessonTemperature(subjectFamily),
              7000,
              scientific,
            );
            const retryNorm = normalizeLessonPayload(extractJsonRobust(retryContent));
            if (retryNorm) normalized = retryNorm;
          } catch (retryErr) {
            console.warn("[P6] retry fuori misura fallito: tengo la prima versione:", retryErr);
          }
        }
      }

      let explanation = normalized.explanation;
      let explanationParts = (normalized.explanationParts ?? []) as Record<string, unknown>[];

      // 🧽 P6 — la spugna che cancella le "descrizioni a parole" delle figure
      // (vietate dal prompt: ci sono i token [FIG:n] per quello) ora pulisce
      // in DUE lingue: prima toglieva solo frasi italiane, quelle inglesi
      // ("The image shows…", "As shown in the figure…") le lasciava passare.
      const imageDescriptionPatternsIT = [
        /L['']immagine mostra[^.]*\./gi,
        /Qui c['']è (un'?|l['']?)immagine di[^.]*\./gi,
        /Come si vede (nella|dalla) figura[^.]*\./gi,
        /La (tabella|figura|immagine|schema) (illustra|mostra|rappresenta|seguente)[^.]*\./gi,
        /Nell['']immagine[^.]*\./gi,
        /La figura seguente[^.]*\./gi,
      ];
      const imageDescriptionPatternsEN = [
        /\b(The|This) (image|picture|figure|table|illustration|diagram) (shows|illustrates|depicts|represents)[^.]*\./gi,
        /\bIn the (image|picture|figure|illustration)[^.]*\./gi,
        /\bAs shown in (the )?(image|picture|figure|table|illustration)[^.]*\./gi,
        /\bThe following (figure|table|image|illustration)[^.]*\./gi,
      ];
      const sanitizeContent = (text: string): string => {
        let cleaned = text;
        for (const pattern of [...imageDescriptionPatternsIT, ...imageDescriptionPatternsEN]) {
          cleaned = cleaned.replace(pattern, "").trim();
        }
        return cleaned;
      };

      explanationParts = explanationParts.map((part) => {
        if (typeof part.content === "string") part.content = sanitizeContent(part.content);
        const { image_url: _u, image_description: _d, ...rest } = part as Record<string, unknown>;
        return rest;
      });

      // Enforce uniqueness of [FIG:N] markers across the lesson:
      // keep only the FIRST occurrence of each index, strip the rest.
      const seenFigs = new Set<number>();
      explanationParts = explanationParts.map((part) => {
        if (typeof part.content !== "string") return part;
        let content = part.content as string;
        content = content.replace(/\[FIG:(\d+)\]/g, (full, n) => {
          const idx = parseInt(n, 10);
          if (seenFigs.has(idx)) return ""; // duplicate → drop
          seenFigs.add(idx);
          return full;
        });
        // Tidy leftover blank lines from removed markers
        content = content.replace(/\n{3,}/g, "\n\n").trim();
        return { ...part, content };
      });

      if (explanationParts.length > 0) {
        explanation = JSON.stringify(explanationParts);
      }

      // 🕳️ P1: anche il salvataggio viene CONTROLLATO: se l'update fallisce,
      // la lezione non risulta "generata" per sbaglio.
      const { error: lessonSaveError } = await supabase.from("mini_lessons").update({
        concept: normalized.concept,
        explanation,
        example: normalized.example,
        exercises: normalized.exercises,
        is_generated: true,
      }).eq("id", lessons.id);
      if (lessonSaveError) throw new Error("Errore durante il salvataggio delle lezioni");

      // ── INCREMENTA il contatore (solo per lezioni "vere", non demo) ──
      if (!lessonIsDemo) {
        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("id, generation_count")
          .eq("user_id", userId)
          .maybeSingle();
        if (existingProfile) {
          await supabase
            .from("user_profiles")
            .update({ generation_count: (existingProfile.generation_count ?? 0) + 1 })
            .eq("id", existingProfile.id);
        } else {
          await supabase
            .from("user_profiles")
            .insert({ user_id: userId, generation_count: 1 });
        }
      }

      const { data: updated } = await supabase.from("mini_lessons").select("*").eq("id", lessons.id).single();
      // 🕳️ P1: verifica finale — sul database deve esserci DAVVERO contenuto.
      if (!updated || typeof updated.explanation !== "string" || !updated.explanation.trim()) {
        throw new Error(EMPTY_AI_LESSON_MESSAGE);
      }
      return updated;
    };

    // ── GENERATE A SINGLE LESSON ──
    if (action === "generateLesson" && lessonIndex !== undefined) {
      let lessonsQuery = supabase.from("mini_lessons").select("*").eq("user_id", userId).eq("lesson_order", lessonIndex);
      if (contextId) lessonsQuery = lessonsQuery.eq("context_id", contextId);

      let { data: lessons } = await lessonsQuery.maybeSingle();

      // Fallback: try legacy user_id (email)
      if (!lessons && legacyUserId) {
        let legacyQuery = supabase.from("mini_lessons").select("*").eq("user_id", legacyUserId).eq("lesson_order", lessonIndex);
        if (contextId) legacyQuery = legacyQuery.eq("context_id", contextId);
        const { data: legacyLesson } = await legacyQuery.maybeSingle();
        lessons = legacyLesson;
      }

      if (!lessons) throw new Error("Lezione non trovata");

      // ♻️ P12 (7 ottobre 2026) — IDEMPOTENZA: se la lezione è già generata
      // (con contenuto vero), si restituisce com'è. Un retry di rete del
      // client non deve rifare il lavoro AI (doppio costo, doppio conteggio
      // d'uso). La rigenerazione esplicita resta possibile: il client azzera
      // is_generated PRIMA di richiamare questa azione. Bonus: le vecchie
      // lezioni vuote (is_generated=true ma explanation vuota, il bug P1)
      // cadono nel flusso normale e si rigenerano da sole al primo tocco.

      // ── RATE LIMIT (BETA) ──
      // Verifica se la lezione appartiene a un contesto demo: in tal caso la
      // generazione è gratuita e NON conta nel limite (le demo sono di sola lettura
      // e già preparate dall'account admin).
      let lessonIsDemo = false;
      if (lessons.context_id) {
        const { data: ctxFlag } = await supabase
          .from("study_contexts")
          .select("is_demo")
          .eq("id", lessons.context_id)
          .maybeSingle();
        lessonIsDemo = !!ctxFlag?.is_demo;
      }

      // Se NON è demo → applica il limite gratuito
      if (!lessonIsDemo) {
        const { data: profileForLimit } = await supabase
          .from("user_profiles")
          .select("generation_count")
          .eq("user_id", userId)
          .maybeSingle();
        const currentCount = profileForLimit?.generation_count ?? 0;
        if (BETA_LIMIT_ENABLED && currentCount >= FREE_GENERATION_LIMIT) {
          return errorResponse(LIMIT_REACHED_MESSAGE, 403);
        }
      }
      

      // 🛡️ P10b: se il modulo di questa lezione è in fabbrica, non accavallare lavori.
      // 🚦 P11 (7 ottobre 2026): anche il PRIMO MODULO CALDO della generazione
      // del percorso è protetto: prima, una richiesta singola poteva partire
      // in parallelo alla nascita del percorso (doppio lavoro, doppio conteggio).
      if (lessons.context_id) {
        const { data: ctxJob } = await supabase
          .from("study_contexts")
          .select("generation_status, generation_started_at, generation_progress")
          .eq("id", lessons.context_id)
          .maybeSingle();
        const genStatus = (ctxJob as { generation_status?: string } | null)?.generation_status;
        const genStarted = (ctxJob as { generation_started_at?: unknown } | null)?.generation_started_at;
        if (genStatus === "generating" && !isStaleGeneration(genStarted)) {
          return errorResponse("Il percorso è ancora in costruzione. Ti avvisiamo noi quando è pronto! ⏳", 409);
        }
        const mg = ((ctxJob as any)?.generation_progress as any)?.moduleGeneration as { moduleIndex?: number; startedAt?: unknown } | undefined;
        if (mg && typeof mg.moduleIndex === "number" && Math.floor(lessonIndex / MODULE_SIZE) === mg.moduleIndex) {
          if (isStaleGeneration(mg.startedAt)) {
            // ⏱️ P4: fabbrica morta che teneva il modulo chiuso per sempre: si toglie il lucchetto.
            console.warn(`[P4] lucchetto modulo stantio su ${lessons.context_id}: lo rimuovo e genero la lezione`);
            const gpStale = { ...(((ctxJob as any)?.generation_progress ?? {}) as Record<string, unknown>) };
            delete gpStale.moduleGeneration;
            await supabase.from("study_contexts").update({ generation_progress: gpStale }).eq("id", lessons.context_id);
          } else {
            return errorResponse("Questo modulo è già in generazione. Ti avvisiamo noi con una notifica! ⏳", 409);
          }
        }
      }

      const updated = await generateOneLessonInternal(lessons);
      return successResponse({ success: true, lesson: updated });
    }

    // ── 🏭 P10b GENERATE MODULE: la fabbrica dei moduli ──
    // Crea IN BACKGROUND tutte le lezioni mancanti di un modulo (gruppi da
    // MODULE_SIZE) e avvisa con una push quando è pronto. Risponde subito 202,
    // così l'app può mostrare la schermata d'attesa con la barra di avanzamento.
    if (action === "generateModule") {
      if (!contextId) return errorResponse("contextId richiesto per la generazione del modulo", 400);
      const moduleIndex = typeof body.moduleIndex === "number"
        ? body.moduleIndex
        : Math.floor((typeof lessonIndex === "number" ? lessonIndex : 0) / MODULE_SIZE);

      const { data: ctx } = await supabase
        .from("study_contexts")
        .select("file_name, is_demo, generation_status, generation_started_at, generation_progress")
        .eq("id", contextId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!ctx) throw new Error("Contesto non trovato");

      // 🛡️ Cancelli della fabbrica: un cantiere alla volta per percorso.
      // ⏱️ P4: un cantiere STANTIO (lavoro morto) si riapre: il lucchetto non
      // può chiudere il percorso per sempre.
      if (ctx.generation_status === "generating" && !isStaleGeneration((ctx as { generation_started_at?: unknown }).generation_started_at)) {
        return errorResponse("Il percorso è ancora in costruzione. Ti avvisiamo noi quando è pronto! ⏳", 409);
      }
      if (ctx.generation_status === "generating") {
        console.warn(`[P4] percorso ${contextId} "generating" stantio: considero il lavoro morto e riparto`);
        // ⚠️ Il lavoro morto lasciava lo stato "generating" appeso: la
        // fabbrica, dentro il ciclo, lo leggerebbe come "è partita una
        // rigenera" e si FERMEREBBE dopo la prima lezione. Si azzera QUI,
        // prima di alzare la saracinesca del modulo.
        await supabase
          .from("study_contexts")
          .update({ generation_status: "idle" })
          .eq("id", contextId);
      }
      const gp = ((ctx as { generation_progress?: unknown }).generation_progress ?? {}) as Record<string, unknown>;
      const gpJob = gp.moduleGeneration as { startedAt?: unknown } | undefined;
      if (gpJob && !isStaleGeneration(gpJob.startedAt)) {
        // Doppio tocco o seconda scheda: il cantiere è già attivo. Non è un
        // errore — rispondiamo OK così l'app apre la sala d'attesa senza allarmi.
        // (comportamento voluto dal proprietario, 1025a7f; P4 lascia intatto
        // il caso fresco e sgombra solo i lucchetti stantii)
        return successResponse({ success: true, alreadyRunning: true, moduleGeneration: gp.moduleGeneration });
      }
      if (gpJob) {
        console.warn(`[P4] lucchetto modulo stantio su ${contextId}: lo sovrascrivo con il nuovo lavoro`);
      }

      // Le lezioni mancanti del modulo (quelle già pronte non si ritoccano).
      const moduleStart = moduleIndex * MODULE_SIZE;
      const moduleEnd = moduleStart + MODULE_SIZE - 1;
      const { data: missing } = await supabase
        .from("mini_lessons")
        .select("*")
        .eq("user_id", userId)
        .eq("context_id", contextId)
        .gte("lesson_order", moduleStart)
        .lte("lesson_order", moduleEnd)
        .eq("is_generated", false)
        .order("lesson_order");
      if (!missing || missing.length === 0) {
        return successResponse({ success: true, status: "already-generated", moduleIndex });
      }

      // Pre-check limite beta (i percorsi demo non consumano crediti).
      if (!ctx.is_demo) {
        const { data: prof } = await supabase.from("user_profiles").select("generation_count").eq("user_id", userId).maybeSingle();
        if (BETA_LIMIT_ENABLED && (prof?.generation_count ?? 0) >= FREE_GENERATION_LIMIT) {
          return errorResponse(LIMIT_REACHED_MESSAGE, 403);
        }
      }

      // Alzo la saracinesca: il cantiere vive su generation_progress.moduleGeneration
      // (il client lo legge col polling e anima la barra di avanzamento).
      const jobStartedAt = new Date().toISOString();
      await supabase.from("study_contexts").update({
        generation_progress: {
          ...gp,
          moduleGeneration: {
            moduleIndex,
            totalLessons: missing.length,
            generatedCount: 0,
            startedAt: jobStartedAt,
          },
        },
      }).eq("id", contextId);

      const backgroundModule = async () => {
        let done = 0;
        const finish = async () => {
          // Abbasso la saracinesca: tolgo moduleGeneration qualunque cosa sia
          // successo, così il client esce dalla schermata d'attesa.
          try {
            const { data: ctxNow } = await supabase.from("study_contexts").select("generation_progress").eq("id", contextId).maybeSingle();
            const gpNow = ((ctxNow as { generation_progress?: unknown } | null)?.generation_progress ?? {}) as Record<string, unknown>;
            delete gpNow.moduleGeneration;
            await supabase.from("study_contexts").update({ generation_progress: gpNow }).eq("id", contextId);
          } catch (cleanupErr) {
            console.error("[P10b] pulizia moduleGeneration fallita:", cleanupErr);
          }
        };
        try {
          for (const row of missing) {
            // Il contatore sale a ogni lezione tornita: controllo il limite a ogni giro.
            if (!ctx.is_demo) {
              const { data: prof } = await supabase.from("user_profiles").select("generation_count").eq("user_id", userId).maybeSingle();
              if (BETA_LIMIT_ENABLED && (prof?.generation_count ?? 0) >= FREE_GENERATION_LIMIT) {
                console.warn(`[P10b] limite beta raggiunto dentro il modulo ${moduleIndex}: stop a ${done}/${missing.length}`);
                break;
              }
            }
            // 🔁 P2: due tentativi per lezione, e una lezione fallita NON spegne
            // più la fabbrica: si passa alla successiva (ciò che è tornito resta
            // buono; il resto si rifà on demand).
            let lessonOk = false;
            for (let attempt = 1; attempt <= 2 && !lessonOk; attempt++) {
              try {
                await generateOneLessonInternal(row);
                lessonOk = true;
              } catch (lessonErr) {
                console.error(`[P2] lezione ${row.lesson_order} del modulo ${moduleIndex}, tentativo ${attempt} fallito:`, lessonErr);
              }
            }
            if (!lessonOk) {
              console.warn(`[P2] lezione ${row.lesson_order} del modulo ${moduleIndex} abbandonata dopo i tentativi: continuo con le altre`);
              continue;
            }
            done++;
            const { data: ctxTick } = await supabase.from("study_contexts").select("generation_progress, generation_status").eq("id", contextId).maybeSingle();
            // Se nel frattempo è partita una RIGENERA del percorso, la fabbrica
            // si ferma: il sentiero sta per essere ridisegnato da zero.
            if ((ctxTick as { generation_status?: string } | null)?.generation_status === "generating") {
              console.warn("[P10b] rigenera percorso rilevata a fabbrica attiva: stop");
              break;
            }
            const gpTick = ((ctxTick as { generation_progress?: unknown } | null)?.generation_progress ?? {}) as Record<string, unknown>;
            await supabase.from("study_contexts").update({
              generation_progress: {
                ...gpTick,
                moduleGeneration: { moduleIndex, totalLessons: missing.length, generatedCount: done, startedAt: jobStartedAt },
              },
            }).eq("id", contextId);
          }
          await finish();
          console.log(`[P10b] modulo ${moduleIndex} per contesto ${contextId}: ${done}/${missing.length} lezioni generate`);
          try {
            const { sendPushToUser } = await import("../_shared/push.ts");
            // 🔔 Pacchetto 1: la notifica dice COSA è successo davvero.
            const pushMsg = buildModulePush({
              done,
              total: missing.length,
              moduleIndex,
              fileName: ctx.file_name,
            });
            await sendPushToUser(supabase, userId, {
              ...pushMsg,
              url: "/?tab=studio",
              tag: `module-${contextId}-${moduleIndex}`,
            });
          } catch (e) { console.error("[push] notify module failed:", e); }
        } catch (moduleErr) {
          console.error(`[P10b] fabbrica del modulo ${moduleIndex} in errore:`, moduleErr);
          await finish();
          // 🔔 Pacchetto 1: prima questo ramo era MUTO — lo studente restava
          // ad aspettare una notifica che non arrivava mai. Ora avvisa.
          try {
            const { sendPushToUser } = await import("../_shared/push.ts");
            const pushMsg = buildModulePush({
              done,
              total: missing.length,
              moduleIndex,
              fileName: ctx.file_name,
            });
            await sendPushToUser(supabase, userId, {
              ...pushMsg,
              url: "/?tab=studio",
              tag: `module-${contextId}-${moduleIndex}`,
            });
          } catch (e) { console.error("[push] notify module failure failed:", e); }
        }
      };

      const moduleJob = backgroundModule();
      // @ts-ignore — EdgeRuntime è iniettato da Supabase Edge Runtime
      if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
        // @ts-ignore
        EdgeRuntime.waitUntil(moduleJob);
      }
      return new Response(
        JSON.stringify({ success: true, status: "generating-module", moduleIndex, totalLessons: missing.length }),
        { status: 202, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── GENERATE FINAL TEST ──
    if (action === "generateFinalTest") {
      let lessonsQuery = supabase.from("mini_lessons").select("title, concept").eq("user_id", userId).eq("is_generated", true).order("lesson_order");
      if (contextId) lessonsQuery = lessonsQuery.eq("context_id", contextId);

      const { data: allLessons } = await lessonsQuery;
      if (!allLessons || allLessons.length === 0) throw new Error("Nessuna lezione completata per generare il test finale.");

      const topicsSummary = allLessons.map((l: { title: string; concept: string }, i: number) => `${i + 1}. ${l.title}: ${l.concept}`).join("\n");

      // 🧭 Percorsi 2.0 — l'impronta della materia anche nel test finale.
      let finalTestFamily: string | null = null;
      if (contextId) {
        const { data: ctxFam } = await supabase
          .from("study_contexts")
          .select("subject_family")
          .eq("id", contextId)
          .maybeSingle();
        finalTestFamily = ((ctxFam as { subject_family?: string } | null) ?? null)?.subject_family ?? null;
      }
      const finalTestLine = finalTestFamilyLine(finalTestFamily);

      let studyContent = "";
      if (contextId) {
        const { data: ctx } = await supabase.from("study_contexts").select("content, file_name").eq("id", contextId).eq("user_id", userId).single();
        if (ctx?.content) {
          // 🗺️ P6 — il test finale deve coprire TUTTO il libro: un assaggino
          // per pagina, così entrano nel contesto anche le pagine finali.
          const fullCtx = String(ctx.content);
          const sampled = isLongDocument(fullCtx, MAX_CONTEXT_CHARS)
            ? sampleAcrossPages(fullCtx, MAX_CONTEXT_CHARS - 400)
            : sampleAcrossPages(fullCtx, MAX_CONTEXT_CHARS);
          studyContent = `FILE: ${ctx.file_name}\n${sampled}`;
        }
      } else {
        const { data: ctxs } = await supabase.from("study_contexts").select("content, file_name").eq("user_id", userId);
        if (ctxs) studyContent = ctxs.map((c: { file_name: string; content: string }) => `FILE: ${c.file_name}\n${c.content}`).join("\n\n").substring(0, MAX_CONTEXT_CHARS);
      }

      const finalTestPrompt = `Sei un tutor universitario esperto. Crea un TEST FINALE che valuti la comprensione di TUTTI gli argomenti.
${profileContext}

IMPORTANTE: Rispondi SOLO con un array JSON valido. SOLO JSON puro.

ARGOMENTI:
${topicsSummary}

REGOLE:
1. Esattamente ${Math.min(allLessons.length * 2, 10)} domande.
2. Copri TUTTI gli argomenti.
3. Domande DIVERSE da quelle delle lezioni.
4. Usa SOLO "multiple_choice" e "true_false" (NO short_answer, NO fill_blank). Alterna i due tipi.${finalTestLine}

JSON richiesto:
[
  { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correct_index": 0 },
  { "type": "true_false", "statement": "...", "correct": true }
]

MATERIALE:
${studyContent}`;

      const raw = await callAI([
        { role: "system", content: "Rispondi ESCLUSIVAMENTE con JSON valido. Solo l'array JSON richiesto." },
        { role: "user", content: finalTestPrompt }
      ], 0.2);

      console.log("AI final test response (first 300 chars):", raw.substring(0, 300));
      const exercises = extractJsonRobust(raw);
      if (!Array.isArray(exercises)) throw new Error("Formato test finale non valido");
      return successResponse({ success: true, exercises });
    }

    // ── GENERATE LESSON TITLES (STUDY PLAN) — ASYNC/BACKGROUND ──
    // Per non perdere il progresso se l'utente chiude l'app, il lavoro AI gira
    // in background con EdgeRuntime.waitUntil. Lo stato è persistito su
    // study_contexts.generation_status (idle | generating | completed | failed).
    if (!contextId) {
      return errorResponse("contextId richiesto per la generazione del percorso", 400);
    }

    const { data: ctxPre } = await supabase
      .from("study_contexts")
      .select("content, file_name, processing_status, error_message, generation_status, generation_started_at, generation_progress, is_demo")
      .eq("id", contextId)
      .eq("user_id", userId)
      .single();
    if (!ctxPre) throw new Error("Contesto non trovato");
    if (ctxPre.processing_status === "failed") {
      throw new Error(ctxPre.error_message || "Errore durante l'elaborazione del PDF. Ricarica il file e riprova.");
    }
    if (ctxPre.processing_status !== "completed") {
      throw new Error("Il PDF è ancora in elaborazione. Riprova tra qualche secondo.");
    }
    if (!ctxPre.content) throw new Error("Nessun contenuto disponibile per questo PDF.");

    // Idempotenza: se già in generazione, non avviare un nuovo job.
    // ⏱️ P4: a meno che lo stato non sia STANTIO (lavoro morto che prima
    // bloccava il percorso per sempre): si cade nel flusso normale, che
    // risegnerà "generating" con un timestamp fresco.
    if (ctxPre.generation_status === "generating" && !isStaleGeneration((ctxPre as { generation_started_at?: unknown }).generation_started_at)) {
      return new Response(
        JSON.stringify({ success: true, status: "generating", contextId, alreadyRunning: true }),
        { status: 202, headers: { "Content-Type": "application/json" } }
      );
    }
    if (ctxPre.generation_status === "generating") {
      console.warn(`[P4] percorso ${contextId} "generating" da troppo tempo: considero il lavoro morto e riparto da zero`);
    }

    // 🛡️ P10b: se la fabbrica sta tornendo un modulo, non resettare il sentiero
    // sotto i loro piedi (le righe che sta scrivendo sparirebbero a metà lavoro).
    // ⏱️ P4: anche qui, un lucchetto stantio non blocca più la rigenerazione.
    const preModuleJob = ((ctxPre.generation_progress ?? {}) as Record<string, unknown>).moduleGeneration as { startedAt?: unknown } | undefined;
    if (preModuleJob && !isStaleGeneration(preModuleJob.startedAt)) {
      return errorResponse("Un modulo è in preparazione. Attendi la notifica, poi potrai rigenerare il percorso. ⏳", 409);
    }
    if (preModuleJob) {
      console.warn(`[P4] percorso ${contextId}: lucchetto modulo stantio, la rigenerazione procede`);
    }

    // Segna subito lo stato come "generating" prima di rispondere
    await supabase.from("study_contexts").update({
      generation_status: "generating",
      generation_started_at: new Date().toISOString(),
      generation_progress: { step: "creating-index", generatedCount: 0, totalLessons: 0 },
      generation_error: null,
      new_material_pending: false, // 📦 P17: rigenerare = il materiale nuovo entra nelle lezioni
    }).eq("id", contextId);

    // 🗺️ P6 — lavoriamo sul contenuto COMPLETO (la troncatura serve solo per
    // i payload AI). Marcatori e lunghezza reali guidano la scala delle lezioni.
    const fullContent = String(ctxPre.content);

    // 🧭 PERCORSI 2.0 — IL RILEVATORE: di che materia stiamo parlando?
    // Prima le parole chiave (gratis), poi — solo se serve — una chiamata AI
    // leggera. Mai bloccante: se tutto fallisce, si genera come sempre.
    const detection = await detectSubject({
      fileName: String(ctxPre.file_name || ""),
      sample: fullContent.substring(0, 4000),
      aiCall: async (detectorPrompt: string) => {
        try {
          return await callAI([{ role: "user", content: detectorPrompt }], 0, 600);
        } catch {
          return "";
        }
      },
    });
    console.log(
      `[2.0] materia rilevata: ${detection.family} — ${detection.subject} ` +
        `(sicurezza ${detection.confidence}/100, fonte: ${detection.source})`,
    );
    // Passaporto: la materia si scrive sul percorso (non fatale se la colonna
    // manca — migrazione 20261003150000 — il percorso procede uguale).
    const { error: passportError } = await supabase
      .from("study_contexts")
      .update({ subject_family: detection.family, subject: detection.subject })
      .eq("id", contextId);
    if (passportError) {
      console.warn("[2.0] passaporto non aggiornato (migrazione applicata?):", passportError.message);
    }

    const combinedContent = `FILE: ${ctxPre.file_name}\n${fullContent}`.substring(0, MAX_CONTEXT_CHARS);

    // Stima la complessità del documento per scalare dinamicamente il numero di lezioni
    // (prima si contavano i marcatori nel testo TRONCATO: per i libri lunghi
    // l'ultima pagina sembrava molto prima della realtà).
    const _maxPdfPagePre = maxPageNumber(fullContent);
    const _charCount = fullContent.length;

    // 🗺️ IL CARTOGRAFO: documento lungo + marcatori → prima si disegna la
    // mappa pagina-per-pagina (compatta, una riga per pagina) e la si passa
    // all'AI insieme all'estratto integrale delle prime pagine. Una sola
    // chiamata extra per documento; i PDF corti seguono la strada classica.
    const _longDoc = isLongDocument(fullContent, MAX_CONTEXT_CHARS);
    let _outline = "";
    let _verbatimHead = "";
    if (_longDoc) {
      const pages = parsePages(fullContent);
      const perPage = Math.max(120, Math.min(240, Math.floor(50000 / Math.max(1, pages.length))));
      _outline = buildPageOutline(pages, perPage);
      _verbatimHead = fullContent.substring(0, 6000);
      console.log(`[cartografo] documento lungo: ${pages.length} pagine, mappa di ${_outline.length} caratteri`);
    }
    // Heuristica: ~1 lezione ogni ~2500 caratteri o ~1 lezione ogni 0.6 pagine, con bound dinamici
    const _byChars = Math.round(_charCount / 2500);
    const _byPages = _maxPdfPagePre > 0 ? Math.round(_maxPdfPagePre / 0.6) : 0;
    const _rawEstimate = Math.max(_byChars, _byPages, 8);
    const _minLessons = _maxPdfPagePre > 0 && _maxPdfPagePre <= 5 ? 8 : Math.min(12, _rawEstimate);
    const _maxLessons = Math.max(_minLessons + 2, Math.min(40, _rawEstimate + 4));

    const backgroundTitles = async () => {
      try {
        // 🗺️ P6 — due vesti dello stesso prompt: documento corto (testo
        // integrale, come da tradizione) oppure documento lungo (MAPPA del
        // cartografo + estratto integrale dell'inizio per calibrare i titoli).
        const mappingRule = _longDoc
          ? `8. MAPPING PAGINE (OBBLIGATORIO E CRITICO):
   - La MAPPA elenca le pagine come "P<numero>: anteprima". Usa SOLO numeri di pagina che compaiono nella mappa.
   - Per OGNI lezione indica "page_start" e "page_end" con numeri P presenti in mappa.
   - COPERTURA TOTALE OBBLIGATORIA: distribuisci le lezioni su TUTTO l'arco del documento: la prima parte dalle prime pagine di contenuto, L'ULTIMA pesca dalle pagine FINALI. Nessun capitolo finale può restare scoperto.
   - In media una lezione copre 2-8 pagine di mappa (manuali densi anche di più).
   - DIVIETO ASSOLUTO: NON impostare page_start=1 e page_end=1 per tutte le lezioni e NON ammassare le lezioni nella prima metà della mappa. Se lo fai, la richiesta verrà rigettata.`
          : `8. MAPPING PAGINE (OBBLIGATORIO E CRITICO):
   - Il testo è suddiviso in blocchi delimitati da marker "=== PAGINA N ===" che indicano l'inizio della pagina N del PDF originale.
   - Per OGNI lezione devi indicare "page_start" e "page_end" usando ESATTAMENTE i numeri N che appaiono in questi marker.
   - "page_start" = numero della prima pagina che contiene contenuto della lezione.
   - "page_end" = numero dell'ultima pagina che contiene contenuto della lezione (può essere uguale a page_start se sta tutto su una pagina; può estendersi su 2-4 pagine).
   - DIVIETO ASSOLUTO: NON impostare page_start=1 e page_end=1 per tutte le lezioni. Se lo fai, la richiesta verrà rigettata.
   - Le pagine devono essere DIVERSE e progressive tra lezioni successive (lezione 2 inizia dove finisce la lezione 1, o poco dopo).
   - Se davvero non riesci a stimarle, distribuisci le lezioni in modo proporzionale tra pagina 1 e l'ultimo marker presente.`;

        const documentSection = _longDoc
          ? `ESTRATTO INTEGRALE DELLE PRIME PAGINE (calibra stile, lessico e profondità dei titoli):
${_verbatimHead}

MAPPA DEL DOCUMENTO (una riga per pagina: "P<numero>: prime righe"):
${_outline}`
          : `TESTO DA ANALIZZARE:
${combinedContent}`;

        // 🧭 Percorsi 2.0 — l'impronta della materia: il piano nasce già con la
        // forma giusta per la famiglia (autori/correnti, cronologia, problemi).
        const planFamilyGuidance = buildPlanFamilyGuidance(detection.family);

        const titlesPrompt = `Analizza il materiale fornito e crea un piano di studi strutturato, PROPORZIONATO alla reale complessità del documento.

IMPORTANTE: Rispondi SOLO con un array JSON valido. SOLO JSON puro.${_longDoc ? "\n\n⚠️ DOCUMENTO LUNGO: non ricevi il testo integrale ma la MAPPA pagina-per-pagina più l'estratto integrale dell'inizio. Il piano DEVE coprire anche le pagine FINALI del documento." : ""}

REGOLE:
1. Ogni lezione copre UN SOLO concetto o argomento specifico. MAI raggruppare più concetti diversi nella stessa lezione.
2. SCALA DINAMICA (numero totale di lezioni proporzionale al materiale):
   - File brevi (2-5 pagine, materiale conciso) → 8-12 lezioni.
   - Capitoli o saggi di media complessità (6-20 pagine) → 12-22 lezioni.
   - Testi universitari densi, manuali, trattati (Diritto Romano, saggi di economia, capitoli lunghi) → puoi spingerti a 22-35+ lezioni se davvero il materiale lo richiede.
   - Per QUESTO documento il range CONSIGLIATO è ${_minLessons}-${_maxLessons} lezioni (pagine PDF stimate: ${_maxPdfPagePre || "n/d"}; caratteri: ${_charCount}). Resta in questo intervallo a meno che il contenuto non imponga chiaramente di più o di meno.
3. EQUILIBRIO E ASSENZA DI RIPETIZIONI: distribuisci gli argomenti in modo bilanciato lungo tutto il documento; non concentrare metà lezioni su un capitolo e ignorare il resto; non creare lezioni che ripetono lo stesso concetto con titoli diversi.
4. Se un argomento ha sotto-argomenti importanti, crea una lezione separata per ciascuno.
5. Segui l'ordine logico del documento.
6. Ignora indici, bibliografie, note a piè di pagina, ringraziamenti, copertine.
7. Ogni titolo deve essere specifico e descrivere chiaramente il singolo concetto trattato (no titoli generici tipo "Introduzione", "Parte 2").
${mappingRule}
9. TITOLI DEI MODULI (OBBLIGATORIO): il percorso è diviso in MODULI da 4 lezioni consecutive (l'ultimo può essere più corto). Per OGNI lezione indica anche "module_title": un nome breve del modulo tematico cui appartiene (2-5 parole, stile capitolo, es. "Le basi della cellula"). RAGGRUPPA le lezioni per AFFINITÀ tematica: le lezioni dello stesso modulo DEVONO avere LO STESSO module_title.
${planFamilyGuidance}
ESEMPIO: Se il materiale parla di "La cellula", NON creare una lezione "La cellula e le sue parti". Crea invece: "La membrana cellulare", "Il nucleo", "I mitocondri", "Il reticolo endoplasmatico", etc.

Output richiesto:
[{"title": "La membrana cellulare", "page_start": 1, "page_end": 3, "module_title": "Le basi della cellula"}, {"title": "Il nucleo e il DNA", "page_start": 4, "page_end": 6, "module_title": "Le basi della cellula"}]

${documentSection}`;

        const content = await callAI([
          { role: "system", content: "Rispondi ESCLUSIVAMENTE con JSON valido. Solo l'array JSON richiesto." },
          { role: "user", content: titlesPrompt }
        ], 0.1, 16000);

        console.log("AI titles response (first 300 chars):", content.substring(0, 300));
        const parsedTitles = extractJsonRobust(content);
        if (!Array.isArray(parsedTitles)) throw new Error("Formato titoli non valido");

        const titles = parsedTitles
          .map((t) => {
            if (typeof t === "string") return { title: t, page_start: null, page_end: null, module_title: null as string | null };
            if (t && typeof t === "object" && "title" in t && typeof (t as { title?: unknown }).title === "string") {
              const obj = t as { title: string; page_start?: number; page_end?: number; module_title?: string };
              return {
                title: obj.title,
                page_start: typeof obj.page_start === "number" ? obj.page_start : null,
                page_end: typeof obj.page_end === "number" ? obj.page_end : null,
                module_title: typeof obj.module_title === "string" ? obj.module_title : null,
              };
            }
            return null;
          })
          .filter((t): t is { title: string; page_start: number | null; page_end: number | null; module_title: string | null } => !!t && !!t.title);

        if (titles.length === 0) throw new Error("Non sono riuscito a creare un indice valido. Riprova.");

        // La pagina massima la sappiamo già dal documento COMPLETO (P6): la
        // distribuzione di emergenza arriva ora davvero fino all'ultima pagina.
        const maxPdfPage = _maxPdfPagePre;
        const uniqueRanges = new Set(titles.map((t) => `${t.page_start ?? "x"}-${t.page_end ?? "x"}`));
        const allMissing = titles.every((t) => t.page_start == null || t.page_end == null);
        const allCollapsed = titles.length > 1 && uniqueRanges.size === 1 && titles[0].page_start != null;
        if ((allMissing || allCollapsed) && maxPdfPage > 1 && titles.length > 0) {
          const span = Math.max(1, Math.floor(maxPdfPage / titles.length));
          titles.forEach((t, i) => {
            const start = Math.min(maxPdfPage, i * span + 1);
            const end = Math.min(maxPdfPage, i === titles.length - 1 ? maxPdfPage : (i + 1) * span);
            t.page_start = start;
            t.page_end = Math.max(start, end);
          });
        }

        // 🌐 P11b — SORGENTE SENZA PAGINE (ricerca web Wikipedia / foto caricate):
        // il testo non ha marcatori, quindi qualunque range scritto dall'AI è
        // falso. Azzeriamo TUTTI i range: questi percorsi pescheranno le figure
        // dalle immagini sorgente archiviate (come le foto), non da un PDF fantasma.
        if (maxPdfPage === 0) {
          titles.forEach((t) => { t.page_start = null; t.page_end = null; });
        }

        // 🏷️ P11d — TITOLI DEI MODULI: l'AI battezza i vagoni (nomi brevi tipo
        // capitoli). Per ogni gruppo da MODULE_SIZE prendiamo il primo module_title valido;
        // il client usera' un titolo derivato quando manca (percorsi vecchi).
        const moduleTitles: string[] = [];
        const _moduleTotal = Math.ceil(titles.length / MODULE_SIZE);
        for (let m = 0; m < _moduleTotal; m++) {
          const withTitle = titles.slice(m * MODULE_SIZE, m * MODULE_SIZE + MODULE_SIZE).find((t) => t.module_title && t.module_title.trim());
          moduleTitles.push(withTitle && withTitle.module_title ? withTitle.module_title.trim().slice(0, 80) : "");
        }

        const { error: deleteError } = await supabase
          .from("mini_lessons").delete()
          .eq("user_id", userId).eq("context_id", contextId);
        if (deleteError) throw new Error("Errore durante la pulizia delle vecchie lezioni");

        // 🧹 P10a TABULA RASA: rigenerando il percorso si azzera anche il contatore
        // dei progressi, altrimenti le nuove lezioni "eredita(va)no" i completamenti
        // del percorso vecchio (bug segnalato dall'utente).
        // 🧭 Pacchetto 1: si azzerano anche le SPUNTE (completed_lessons) e il
        // VOTO del test finale (final_test) — facevano riferimento a titoli e
        // contenuti del percorso precedente, ormai cancellati.
        const { error: progressResetError } = await supabase
          .from("lesson_progress")
          .update({ current_lesson_index: 0, completed_lessons: [], final_test: null })
          .eq("user_id", userId).eq("context_id", contextId);
        if (progressResetError) {
          // Non fatale: per un percorso appena caricato la riga può non esistere ancora.
          console.warn("[P10a] reset progressi non applicato (se la riga non esiste è normale):", progressResetError);
        }

        const lessonsToInsert = titles.map((t, i: number) => ({
          user_id: userId, context_id: contextId, title: t.title,
          lesson_order: i, is_generated: false, concept: "", explanation: "",
          page_start: t.page_start, page_end: t.page_end,
        }));
        const { error: insertError } = await supabase.from("mini_lessons").insert(lessonsToInsert);
        if (insertError) throw new Error("Errore durante il salvataggio delle lezioni");

        // 🏭 P10b PRIMO MODULO CALDO: tornisco subito le lezioni del primo
        // modulo, così chi apre il percorso nuovo trova l'inizio già pronto
        // (niente rotellina sul quadratino). Se qualcosa fallisce o scatta il
        // limite beta, mi fermo: il percorso resta valido e la fabbrica dei
        // moduli completerà il lavoro on demand.
        const warmCount = Math.min(MODULE_SIZE, titles.length);
        let warmDone = 0; // 🔔 Pacchetto 1: visibile anche alla notifica finale (verità sui fatti)
        if (warmCount > 0) {
          const { data: warmRows } = await supabase
            .from("mini_lessons").select("*")
            .eq("user_id", userId).eq("context_id", contextId)
            .gte("lesson_order", 0).lt("lesson_order", warmCount)
            .order("lesson_order");
          for (const warmRow of warmRows ?? []) {
            if (!ctxPre.is_demo) {
              const { data: prof } = await supabase.from("user_profiles").select("generation_count").eq("user_id", userId).maybeSingle();
              if (BETA_LIMIT_ENABLED && (prof?.generation_count ?? 0) >= FREE_GENERATION_LIMIT) {
                console.warn("[P10b] limite beta raggiunto durante il primo modulo caldo: stop");
                break;
              }
            }
            // 🔁 P2: due tentativi per lezione; una lezione fallita NON spegne
            // più il modulo caldo — si continua con le altre (prima: break al
            // primo errore, e il percorso nasceva con 1 lezione su 4).
            let warmOk = false;
            for (let attempt = 1; attempt <= 2 && !warmOk; attempt++) {
              try {
                await generateOneLessonInternal(warmRow);
                warmOk = true;
              } catch (warmErr) {
                console.error(`[P2] primo modulo caldo: lezione ${warmRow.lesson_order}, tentativo ${attempt} fallito:`, warmErr);
              }
            }
            if (!warmOk) {
              console.warn(`[P2] primo modulo caldo: lezione ${warmRow.lesson_order} abbandonata, continuo con le altre`);
              continue;
            }
            warmDone++;
            await supabase.from("study_contexts").update({
              generation_progress: { step: "generating-lessons", generatedCount: warmDone, totalLessons: warmCount },
            }).eq("id", contextId);
          }
          console.log(`[P10b] primo modulo caldo: ${warmDone}/${warmCount} lezioni pronte per contesto ${contextId}`);
        }

        await supabase.from("study_contexts").update({
          generation_status: "completed",
          generation_progress: { step: "complete", generatedCount: titles.length, totalLessons: titles.length },
          generation_error: null,
          module_titles: moduleTitles,
        }).eq("id", contextId);

        console.log(`✅ Background generation complete for context ${contextId}: ${titles.length} lessons (${warmDone}/${warmCount} già calde)`);
        try {
          const { sendPushToUser } = await import("../_shared/push.ts");
          await sendPushToUser(supabase, userId, {
            // 🔔 Pacchetto 1: "le prime lezioni sono già calde" solo se lo sono DAVVERO.
            ...buildPathPush({ warmDone, warmCount, fileName: ctxPre?.file_name }),
            url: "/?tab=studio",
            tag: `lessons-${contextId}`,
          });
        } catch (e) { console.error("[push] notify lessons failed:", e); }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Errore nella generazione delle lezioni";
        console.error(`❌ Background generation failed for context ${contextId}:`, msg);
        await supabase.from("study_contexts").update({
          generation_status: "failed",
          generation_error: msg,
        }).eq("id", contextId);
      }
    };

    // @ts-ignore — EdgeRuntime è iniettato da Supabase Edge Runtime
    if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
      // @ts-ignore
      EdgeRuntime.waitUntil(backgroundTitles());
    } else {
      // Fallback (test locali): non attendere
      backgroundTitles();
    }

    return new Response(
      JSON.stringify({ success: true, status: "generating", contextId }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const safeMessages = [
      "Lezione non trovata",
      LIMIT_REACHED_MESSAGE,
      "Il PDF è ancora in elaborazione. Riprova tra qualche secondo.",
      "Errore durante l'elaborazione del PDF. Ricarica il file e riprova.",
      "Impossibile estrarre testo sufficiente dal PDF. Il file potrebbe essere un'immagine o protetto.",
      "Contenuto vuoto. Caricamento fallito?",
      "Contesto non trovato",
      "Nessun contenuto disponibile per questo PDF.",
      "Nessuna lezione completata per generare il test finale.",
      "Formato titoli non valido",
      "Formato test finale non valido",
      "Non sono riuscito a creare un indice valido. Riprova.",
      "Impossibile estrarre JSON dalla risposta AI. Riprova.",
      "Errore durante la pulizia delle vecchie lezioni",
      "Errore durante il salvataggio delle lezioni",
      EMPTY_AI_LESSON_MESSAGE,
    ];
    const msg = error instanceof Error && safeMessages.includes(error.message)
      ? error.message
      : "Errore nella generazione delle lezioni. Riprova.";
    return errorResponse(msg);
  }
}));
