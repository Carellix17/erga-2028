import { describe, it, expect } from "vitest";
import {
  extractJsonRobust,
  normalizeLessonPayload,
  repairLatexControlChars,
  JSON_FAIL_MESSAGE,
} from "../../supabase/functions/_shared/lessonPayload";

/**
 * 🧺 P1 + P3 — Il cesto della lezione: riparatore JSON LaTeX-aware e cerniera
 * del contenuto. Questi test riproducono i DUE sintomi segnalati dal
 * proprietario: «errore nell'estrarre file JSON» (risposta rotta dalle
 * formule) e «lezione vuota marcata come generata».
 */

describe("extractJsonRobust — il riparatore", () => {
  it("parsa un JSON pulito", () => {
    expect(extractJsonRobust('{"a": 1}')).toEqual({ a: 1 });
  });

  it("tolge i recinti ```json", () => {
    expect(extractJsonRobust('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });

  it("estrae l'oggetto anche con prosa intorno", () => {
    const raw = 'Certo! Ecco la lezione:\n{"a": 1}\nSpero sia utile!';
    expect(extractJsonRobust(raw)).toEqual({ a: 1 });
  });

  it("sopravvive a GRAFFE NELLA PROSA PRIMA del JSON (la prima { non è il root)", () => {
    const raw = 'Come per {a + b} nel testo, ecco la lezione:\n{"concept": "X", "explanation_parts": []}\nFine.';
    expect(extractJsonRobust(raw)).toEqual({ concept: "X", explanation_parts: [] });
  });

  it("accetta a-capo VERI (non escaped) dentro le stringhe", () => {
    // I modelli spezzano spesso le stringhe con newline letterali: JSON invalido
    // per spec, ma il riparatore li riconverte in \n.
    const raw = '{\n  "a": "prima riga\nseconda riga"\n}';
    const out = extractJsonRobust(raw) as { a: string };
    expect(out.a).toBe("prima riga\nseconda riga");
  });

  it("usa la fetta BILANCIATA, non la greedy (graffe nella prosa dopo il JSON)", () => {
    // La regex greedy prenderebbe dalla prima { all'ULTIMA } (prosa inclusa) e fallirebbe.
    const raw = 'Ecco: {"a": {"b": 1}} e poi testo con } graffa strana {';
    expect(extractJsonRobust(raw)).toEqual({ a: { b: 1 } });
  });

  it(" salva le formule LaTeX con escape INVALIDI (\\sqrt rompeva il parse)", () => {
    // \s non è un escape JSON valido: prima → «Impossibile estrarre JSON».
    const raw = '{"explanation_parts": [{"part_title": "Formula", "content": "Il $$\\sqrt{b^2 - 4ac}$$ è il radicale."}]}';
    const out = extractJsonRobust(raw) as { explanation_parts: { content: string }[] };
    expect(out.explanation_parts[0].content).toContain("\\sqrt{b^2 - 4ac}");
  });

  it("salva gli array troncati a metà (titoli delle lezioni)", () => {
    const raw = '[{"title": "La membrana"}, {"title": "Il nucleo"}, {"title": "I mitocondri';
    const out = extractJsonRobust(raw) as unknown[];
    expect(out).toHaveLength(2);
    expect((out[0] as { title: string }).title).toBe("La membrana");
  });

  it("chiude le parentesi penzolanti di un oggetto troncato", () => {
    const raw = '{"concept": "La cellula", "explanation_parts": [{"part_title": "A", "content": "Il citoplasma contiene organuli."';
    const out = extractJsonRobust(raw) as { concept: string };
    expect(out.concept).toBe("La cellula");
  });

  it("lancia l'errore giusto quando non c'è proprio niente da salvare", () => {
    expect(() => extractJsonRobust("Mi dispiace, non riesco a creare la lezione.")).toThrowError(JSON_FAIL_MESSAGE);
  });
});

describe("repairLatexControlChars — le formule sopravvissute per sbaglio", () => {
  it("\\frac era un form-feed valido: torna il comando LaTeX", () => {
    // "\frac{a}{b}" dentro una stringa JSON: \f è un escape VALIDO (form-feed),
    // il parse riusciva ma la formula arrivava mutilata (formfeed + "rac{a}{b}").
    const parsed = JSON.parse('{"c": "il rapporto \\frac{a}{b}"}') as { c: string };
    expect(repairLatexControlChars(parsed.c)).toBe("il rapporto \\frac{a}{b}");
  });

  it("i comandi \\beta (backspace), \\rho (CR) e \\times (tab) tornano LaTeX", () => {
    const parsed = JSON.parse('{"c": "\\beta e \\rho, poi \\times 3"}') as { c: string };
    expect(repairLatexControlChars(parsed.c)).toBe("\\beta e \\rho, poi \\times 3");
  });

  it("i veri a-capo (paragrafi) NON si toccano", () => {
    const parsed = JSON.parse('{"c": "primo paragrafo\\n\\nsecondo paragrafo"}') as { c: string };
    expect(repairLatexControlChars(parsed.c)).toBe("primo paragrafo\n\nsecondo paragrafo");
  });
});

describe("normalizeLessonPayload — la cerniera (P1)", () => {
  const part = (t: string, c: string) => ({ part_title: t, content: c });
  // Frase di sostanza: da sola deve superare la soglia dei 120 caratteri.
  const SS = "Il citoplasma è il gel interno della cellula e contiene gli organuli che svolgono le funzioni vitali della cellula stessa, dal metabolismo alla sintesi proteica.".repeat(2);

  it("accetta una lezione vera e serializza le parti come fa il lettore", () => {
    const out = normalizeLessonPayload({
      concept: "La cellula",
      explanation_parts: [part("🎯 Inizio", SS), part("📚 Definizione", SS)],
      example: "Un esempio concreto.",
      exercises: [{ type: "true_false", statement: "…", correct: true }],
    });
    expect(out).not.toBeNull();
    expect(out!.explanationParts).toHaveLength(2);
    expect(JSON.parse(out!.explanation)[0].part_title).toBe("🎯 Inizio");
    expect(out!.exercises).toHaveLength(1);
  });

  it("respinge il payload senza explanation_parts (la lezione vuota di P1)", () => {
    expect(normalizeLessonPayload({ concept: "X", example: "Y", exercises: [] })).toBeNull();
  });

  it("respinge le parti tutte vuote", () => {
    expect(normalizeLessonPayload({ explanation_parts: [part("A", "  "), part("B", "")] })).toBeNull();
  });

  it("respinge il contenuto complessivo troppo esile (frase isolata)", () => {
    expect(normalizeLessonPayload({ explanation_parts: [part("A", "breve")] })).toBeNull();
  });

  it("accetta il formato legacy: spiegazione a testo di sostanza", () => {
    const long = "La cellula è l'unità fondamentale della vita. ".repeat(5);
    const out = normalizeLessonPayload({ explanation: long });
    expect(out).not.toBeNull();
    expect(out!.explanationParts).toBeNull();
    expect(out!.explanation).toBe(long.trim());
  });

  it("respinge anche il legacy se troppo corto", () => {
    expect(normalizeLessonPayload({ explanation: "troppo corto" })).toBeNull();
  });

  it("esercizi mancanti → array vuoto, ma la lezione resta valida", () => {
    const out = normalizeLessonPayload({ explanation_parts: [part("A", SS)] });
    expect(out).not.toBeNull();
    expect(out!.exercises).toEqual([]);
  });

  it("ripara le formule anche dentro le opzioni degli esercizi", () => {
    // "\times 3" dentro una stringa JSON arriva come tab + "imes 3": la cerniera lo riporta LaTeX.
    const raw = `{"explanation_parts": [{"part_title": "A", "content": "${SS}"}], "exercises": [{"type": "multiple_choice", "options": ["\\times 3", "3"]}]}`;
    const parsed = extractJsonRobust(raw) as { exercises: { options: string[] }[] };
    const out = normalizeLessonPayload(parsed);
    expect(out).not.toBeNull();
    expect(out!.exercises[0]).toMatchObject({ options: ["\\times 3", "3"] } as object);
  });

  it("null per input non-oggetto (array, stringa, null)", () => {
    expect(normalizeLessonPayload([1, 2])).toBeNull();
    expect(normalizeLessonPayload("testo")).toBeNull();
    expect(normalizeLessonPayload(null)).toBeNull();
  });
});
