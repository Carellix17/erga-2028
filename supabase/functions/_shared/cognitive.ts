// Helper to fetch a user's cognitive profile and build a dynamic
// personalization addon for the system prompt. Used by generate-lessons
// and generate-exercises (in-context learning / super-personalization).

export interface CognitiveScores {
  nome: string | null;
  eta: number | null;
  istituto: string | null;
  log_score: number;
  mem_score: number;
  foc_score: number;
  voc_score: number;
  ans_score: number;
  app_score: number;
}

// deno-lint-ignore no-explicit-any
export async function fetchCognitiveProfile(supabase: any, userId: string): Promise<CognitiveScores | null> {
  try {
    const { data } = await supabase
      .from("cognitive_profiles")
      .select("nome, eta, istituto, log_score, mem_score, foc_score, voc_score, ans_score, app_score")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as CognitiveScores) || null;
  } catch (_e) {
    return null;
  }
}

/**
 * Build a personalization addon string to append to the system prompt.
 * Each rule is conditional on the user's cognitive scores (0-100).
 */
export function buildCognitivePromptAddon(p: CognitiveScores | null): string {
  if (!p) return "";

  type Level = "critico" | "basso" | "medio" | "buono" | "eccellente";
  const bandFor = (score: number): Level => {
    if (score <= 20) return "critico";
    if (score <= 40) return "basso";
    if (score <= 60) return "medio";
    if (score <= 80) return "buono";
    return "eccellente";
  };

  const RULES: Record<string, Record<Level, string>> = {
    LOG: {
      critico: "Capacità logico-analitiche molto ridotte. Un solo concetto per frase, zero astrazioni, ogni passaggio esplicitato e ricapitolato subito dopo.",
      basso: "Capacità logiche fragili. Procedi a piccoli passi, evita scomposizioni in più livelli e ricapitola il filo del ragionamento a fine paragrafo.",
      medio: "Capacità logiche nella media. Alterna spiegazioni discorsive a brevi schemi causa-effetto; introduci gradualmente le astrazioni con esempi concreti.",
      buono: "Buone capacità logiche. Puoi usare scomposizioni in sotto-problemi e collegamenti sistemici, mantenendo comunque un ancoraggio a esempi concreti.",
      eccellente: "Capacità logico-analitiche eccellenti. Sfrutta scomposizione sistemica, analisi dei processi e nessi causa-effetto espliciti senza semplificazioni superflue.",
    },
    MEM: {
      critico: "Memoria a lungo termine molto ridotta. Vietati elenchi mnemonici e blocchi nozionistici; usa esclusivamente tabelle comparative, schemi visivi e forti ripetizioni distanziate.",
      basso: "Memoria a lungo termine sotto la media. Preferisci schemi, mappe concettuali e ancore visive; ripeti i concetti chiave in punti diversi della lezione.",
      medio: "Memoria nella media. Bilancia narrazione ed elementi nozionistici; introduci al massimo 3-4 dati numerici o date per blocco.",
      buono: "Buona memoria. Puoi introdurre dettagli, date e terminologia tecnica, purché organizzati in strutture coerenti (tabelle, timeline).",
      eccellente: "Memoria eccellente. Puoi usare terminologia tecnica precisa, molti dettagli e riferimenti puntuali senza timore di sovraccarico.",
    },
    FOC: {
      critico: "Soglia di attenzione molto bassa. Paragrafi da 2-3 frasi al massimo, titoletti ogni 60-80 parole, micro-pause visive continue.",
      basso: "Attenzione fragile. Paragrafi brevi (max 3-4 frasi), titoletti frequenti, micro-pause concettuali (esempi, schemi) ogni 80-100 parole.",
      medio: "Attenzione nella media. Alterna blocchi discorsivi (5-6 frasi) a schemi/esempi; evita monologhi lunghi.",
      buono: "Buona capacità di focus. Puoi proporre blocchi di 8-10 frasi e ragionamenti continuativi, con qualche pausa strutturale.",
      eccellente: "Focus e autonomia elevati. Puoi proporre approfondimenti estesi e ragionamenti continuativi senza temere cali d'attenzione.",
    },
    VOC: {
      critico: "Competenza lessicale molto limitata. Linguaggio elementare, definisci in linea ogni termine oltre il vocabolario di base, evita subordinate complesse.",
      basso: "Lessico limitato. Linguaggio semplice, definisci ogni termine tecnico al primo uso, proponi negli esercizi formule espositive guidate.",
      medio: "Lessico nella media. Usa registro standard, spiega i termini tecnici specifici della disciplina al primo uso.",
      buono: "Buona competenza lessicale. Puoi usare terminologia disciplinare precisa e connettivi logici articolati.",
      eccellente: "Competenza lessicale eccellente. Alza il registro, usa connettivi logici complessi e proponi domande aperte che richiedono esposizione articolata.",
    },
    ANS: {
      critico: "Ansia da prestazione molto elevata. Tono estremamente empatico e rassicurante; nessun linguaggio giudicante; riformula ogni errore come tappa normale del percorso.",
      basso: "Sensibilità all'ansia. Feedback empatico, costruttivo e supportivo; evita correzioni aggressive; inquadra gli errori come opportunità.",
      medio: "Gestione dello stress nella media. Feedback bilanciato: chiaro sui punti da migliorare ma sempre incoraggiante.",
      buono: "Buona gestione dello stress. Puoi essere diretto nei feedback, mantenendo un tono professionale.",
      eccellente: "Ottima gestione dello stress. Puoi proporre sfide stimolanti e feedback diretti senza necessità di addolcire i giudizi.",
    },
    APP: {
      critico: "Applicazione pratica molto debole. Fornisci sempre 3+ esempi svolti passo-passo prima di ogni esercizio; usa esclusivamente esercizi guidati con tracce esplicite.",
      basso: "Applicazione pratica debole. Fornisci 2-3 esempi svolti passo-passo prima di ogni esercizio; privilegia esercizi guidati a problemi aperti.",
      medio: "Applicazione pratica nella media. Un esempio svolto seguito da un esercizio simile con lieve variante.",
      buono: "Buona applicazione pratica. Un esempio essenziale seguito da esercizi con varianti non banali.",
      eccellente: "Applicazione pratica eccellente. Riduci la teoria al minimo indispensabile e proponi subito problemi non banali con varianti rispetto all'esempio canonico.",
    },
  };

  const dims: Array<[keyof typeof RULES, number, string]> = [
    ["LOG", p.log_score, "Logica"],
    ["MEM", p.mem_score, "Memoria"],
    ["FOC", p.foc_score, "Focus"],
    ["VOC", p.voc_score, "Lessico"],
    ["ANS", p.ans_score, "Ansia"],
    ["APP", p.app_score, "Applicazione"],
  ];

  const body = dims
    .map(([code, score, label], i) => {
      const level = bandFor(score);
      return `${i + 1}. [${code} ${score}/100 · ${level}] ${label}: ${RULES[code][level]}`;
    })
    .join("\n");

  // Rilevamento profili "paradossali" — coppie teoricamente correlate.
  const pairs: Array<[string, number, string, number, string]> = [
    ["LOG", p.log_score, "APP", p.app_score, "ragionamento teorico vs applicazione pratica"],
    ["MEM", p.mem_score, "APP", p.app_score, "memoria nozionistica vs uso operativo"],
    ["VOC", p.voc_score, "LOG", p.log_score, "esposizione verbale vs struttura logica"],
  ];
  const paradoxes = pairs
    .filter(([, a, , b]) => Math.abs(a - b) > 50)
    .map(([ca, sa, cb, sb, desc]) =>
      `⚠️ Profilo paradossale (${ca}=${sa} vs ${cb}=${sb}, ${desc}): non dare per scontato che il punteggio più alto implichi anche il più basso. Verifica esplicitamente la dimensione debole con esempi mirati e domande di controllo.`
    );

  const header = `\n════════════════════════════════════════\nPERSONALIZZAZIONE COGNITIVA (Esagono dello studente${p.nome ? ` — ${p.nome}` : ""})\n════════════════════════════════════════\nPunteggi 0-100: LOG=${p.log_score} MEM=${p.mem_score} FOC=${p.foc_score} VOC=${p.voc_score} ANS=${p.ans_score} APP=${p.app_score}\nRegole tassative da rispettare nella generazione:`;

  const notes = paradoxes.length > 0 ? `\nNote aggiuntive:\n${paradoxes.map((n) => `- ${n}`).join("\n")}` : "";

  return `${header}\n${body}\n${notes}\n`;
}