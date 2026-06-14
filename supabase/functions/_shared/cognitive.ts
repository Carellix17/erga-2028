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
  const rules: string[] = [];

  // LOG — Logica e Sintesi
  if (p.log_score >= 75) {
    rules.push("L'utente ha ELEVATE capacità logico-analitiche. Spiega i concetti sfruttando una forte scomposizione dei problemi, analisi sistemica dei processi e nessi causa-effetto espliciti. Non semplificare eccessivamente.");
  } else if (p.log_score < 40) {
    rules.push("L'utente ha capacità logico-sintetiche ridotte. Procedi a piccoli passi, evita scomposizioni complesse o astrazioni in più livelli, e ricapitola spesso il filo del ragionamento.");
  }

  // MEM — Memoria a Lungo Termine
  if (p.mem_score < 40) {
    rules.push("L'utente ha una memoria a lungo termine ridotta. Evita blocchi nozionistici o elenchi mnemonici. Struttura la lezione usando esclusivamente tabelle comparative, schemi cronologici e nessi causali evidenti, con ripetizioni distanziate dei concetti chiave.");
  } else if (p.mem_score >= 75) {
    rules.push("L'utente ha una memoria a lungo termine eccellente. Puoi introdurre molti dettagli, date, formule e terminologia tecnica precisa senza timore di sovraccarico.");
  }

  // FOC — Focus e Autonomia
  if (p.foc_score < 40) {
    rules.push("L'utente ha bassa soglia di attenzione. Mantieni paragrafi brevi (max 3-4 frasi), titoletti frequenti, e prevedi micro-pause concettuali (esempi, schemi) ogni 80-100 parole per non disperdere il focus.");
  } else if (p.foc_score >= 75) {
    rules.push("L'utente ha focus elevato e autonomia di studio. Puoi proporre blocchi di approfondimento più estesi e ragionamenti continuativi senza temere cali d'attenzione.");
  }

  // VOC — Competenza Lessicale / Esposizione
  if (p.voc_score < 40) {
    rules.push("L'utente ha competenza lessicale limitata. Usa un linguaggio semplice, definisci ogni termine tecnico al primo uso e proponi negli esercizi formule espositive guidate per allenare l'esposizione orale.");
  } else if (p.voc_score >= 75) {
    rules.push("L'utente ha ottima competenza lessicale ed espositiva. Puoi alzare il registro, usare connettivi logici complessi e proporre domande aperte che richiedano un'esposizione articolata.");
  }

  // ANS — Gestione Stress / Ansia
  if (p.ans_score < 50) {
    rules.push("L'utente soffre d'ansia da prestazione. Calibra il tono usando feedback empatico, costruttivo e supportivo, evitando correzioni aggressive. Inquadra gli errori come opportunità di apprendimento, non come fallimenti.");
  } else if (p.ans_score >= 80) {
    rules.push("L'utente gestisce bene lo stress. Puoi proporre sfide stimolanti e feedback diretti, senza necessità di addolcire i giudizi.");
  }

  // APP — Applicazione Pratica
  if (p.app_score < 40) {
    rules.push("L'utente ha difficoltà nell'applicazione pratica delle regole. Fornisci sempre 2-3 esempi svolti passo-passo prima di proporre un esercizio, e privilegia esercizi guidati rispetto a problemi aperti.");
  } else if (p.app_score >= 75) {
    rules.push("L'utente eccelle nell'applicazione pratica. Riduci la teoria al minimo indispensabile e proponi subito problemi non banali con varianti rispetto all'esempio canonico.");
  }

  if (rules.length === 0) return "";

  const header = `\n════════════════════════════════════════\nPERSONALIZZAZIONE COGNITIVA (Esagono dello studente${p.nome ? ` — ${p.nome}` : ""})\n════════════════════════════════════════\nPunteggi 0-100: LOG=${p.log_score} MEM=${p.mem_score} FOC=${p.foc_score} VOC=${p.voc_score} ANS=${p.ans_score} APP=${p.app_score}\nRegole tassative da rispettare nella generazione:`;
  const body = rules.map((r, i) => `${i + 1}. ${r}`).join("\n");
  return `${header}\n${body}\n`;
}