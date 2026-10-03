/**
 * 🤔 PERCORSI 2.0 — IL TUTOR SOCRATICO (logica pura).
 *
 * La chat della palestra scientifica NON è un'AI servizievole: non dà la
 * risposta, fa la domanda giusta. Questo modulo costruisce i messaggi per
 * la chiamata AI a partire dall'esercizio, dalla cronologia e dall'ultimo
 * tentativo dello studente. Modulo PURO: collaudabile da vitest.
 */

export interface SocraticTurn {
  role: "user" | "assistant";
  content: string;
}

export interface SocraticExerciseContext {
  text: string;
  answerUnit?: string;
  steps?: string[];
}

export interface SocraticInput {
  exercise: SocraticExerciseContext;
  /** Cronologia della chat (già validata dal chiamante). */
  history: SocraticTurn[];
  /** Ultimo tentativo di risposta dello studente (se c'è). */
  studentAnswer?: string;
  /** True se lo studente ha già indovinato (modalità verifica). */
  solved?: boolean;
}

export const SOCRATIC_SYSTEM_MESSAGE = `Sei il tutor socratico di una palestra di esercizi scientifici per le superiori. Accompagni UNO studente su UNO specifico esercizio.

LEGGE FONDAMENTALE — MAI RIVELARE:
- Non dare MAI il risultato numerico finale, neanche "per conferma".
- Non eseguire MAI l'ultimo passaggio di calcolo al posto dello studente.
- Se lo studente chiede la soluzione, offri il passo SUCCESSIVO, non la fine.

METODO (una cosa sola per turno):
- Risposta breve: 2-4 frasi, ENDA con UNA domanda.
- Prima DIAGNOSTICA l'errore dall'estremo dello studente: unità sbagliata? formula sbagliata? algebra? segno? ordine di grandezza assurdo? Dì cosa sospetti e verifica con una domanda.
- Scala di aiuto (una sola alla volta, senza ripeterti):
  1. domanda di orientamento ("quali grandezze ti sono date e cosa cerchi?")
  2. richiamo della formula o del principio (in LaTeX $…$), senza applicarlo
  3. IMPOSTAZIONE del calcolo (scriverla con i simboli, senza i numeri) — il conto resta allo studente
- Se lo studente è bloccato e disperato, puoi verificare un SUO passaggio intermedio ("il tuo 9,8 va bene per la gravità?") ma mai l'esito finale.

TONO: asciutto, rispettoso, zero enfasi, zero emoji, zero "bravissimo!". Un errore è informazione ("bene, questo tentativo esclude X: quindi il problema sta in Y").

CONFINI:
- Usa SOLO i dati dell'esercizio: non inventare valori.
- Formule in LaTeX $…$.
- Se la domanda dello studente è fuori dall'esercizio, riporta il focus con gentilezza e una domanda.`;

export interface SocraticAiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Storia al vento: teniamo solo gli ultimi 10 scambi, ognuno potato. */
function trimHistory(history: SocraticTurn[]): SocraticTurn[] {
  return history.slice(-10).map((t) => ({
    role: t.role,
    content: String(t.content || "").slice(0, 1500),
  }));
}

/**
 * Costruisce i messaggi per la chiamata AI:
 *   [system: direttiva lingua + regole socratiche + esercizio (e soluzione
 *    di riferimento, che il tutor NON rivela)] + [cronologia] + [contesto
 *    del turno: tentativo dello studente / richiesta di aiuto]
 */
export function buildSocraticMessages(
  input: SocraticInput,
  languageDirectiveText: string,
): SocraticAiMessage[] {
  const ex = input.exercise;
  const exerciseBlock = [
    `ESERCIZIO (il tuo unico territorio):`,
    `"""`,
    String(ex.text || "").slice(0, 2000),
    `"""`,
    ex.answerUnit ? `Unità della risposta attesa: ${ex.answerUnit}.` : "",
    Array.isArray(ex.steps) && ex.steps.length > 0
      ? [
          "SOLUZIONE DI RIFERIMENTO (solo per te: NON rivelarla mai, usala per diagnosticare):",
          ...ex.steps.slice(0, 8).map((s, i) => `${i + 1}. ${String(s).slice(0, 400)}`),
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: SocraticAiMessage[] = [
    { role: "system", content: `${languageDirectiveText}\n\n${SOCRATIC_SYSTEM_MESSAGE}\n\n${exerciseBlock}` },
  ];

  for (const t of trimHistory(input.history)) {
    messages.push({ role: t.role, content: t.content });
  }

  const mode = input.solved
    ? `Lo studente ha già risposto CORRETTAMENTE. Sei in modalità verifica: fagli giustificare un passaggio della sua soluzione, oppure proponi una micro-variante dell'esercizio (un dato che cambia) senza risolverla tu.`
    : input.studentAnswer !== undefined && input.studentAnswer.trim() !== ""
      ? `Ultimo tentativo dello studente: "${input.studentAnswer.trim().slice(0, 200)}". Diagnostica da qui.`
      : `Lo studente chiede aiuto senza aver provato. Fallo partire da quello che sa.`;

  messages.push({
    role: "user",
    content: `${mode}\n(Rispondi in 2-4 frasi e concludi con UNA domanda.)`,
  });

  return messages;
}
