import { describe, it, expect } from "vitest";
import {
  buildSocraticMessages,
  SOCRATIC_SYSTEM_MESSAGE,
} from "../../supabase/functions/_shared/socraticTutor";

// 🤔 PERCORSI 2.0 — collaudo del tutor socratico: costruisce bene la
// conversazione e le regole vietano di rivelare la risposta.

const exercise = {
  text: "Un'auto accelera a $2\\,m/s^2$ per $4\\,s$: quale velocità raggiunge?",
  answerUnit: "m/s",
  steps: ["v = a \\cdot t", "v = 2 \\cdot 4 = 8\\,m/s"],
};

describe("🤔 buildSocraticMessages — la conversazione ben costruita", () => {
  it("struttura: system (regole + esercizio) + storia + turno corrente", () => {
    const msgs = buildSocraticMessages(
      { exercise, history: [{ role: "user", content: "Non so da dove partire" }], studentAnswer: "42" },
      "LINGUA: italiano.",
    );
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toContain("LINGUA: italiano.");
    expect(msgs[0].content).toContain("accelera a");
    expect(msgs[0].content).toContain("8"); // la soluzione di riferimento c'è…
    expect(msgs[0].content).toContain("NON rivelarla"); // …ma col divieto esplicito
    expect(msgs[1]).toEqual({ role: "user", content: "Non so da dove partire" });
    expect(msgs[msgs.length - 1].role).toBe("user");
    expect(msgs[msgs.length - 1].content).toContain('"42"');
  });

  it("storia lunga: solo gli ultimi 10 scambi entrano nel contesto", () => {
    const history = Array.from({ length: 25 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `messaggio ${i}`,
    }));
    const msgs = buildSocraticMessages({ exercise, history }, "L");
    // system + 10 storia + 1 turno corrente
    expect(msgs).toHaveLength(12);
    expect(msgs[1].content).toBe("messaggio 15"); // i primi 15 scartati
  });

  it("modalità verifica quando lo studente ha già risposto correttamente", () => {
    const msgs = buildSocraticMessages({ exercise, history: [], solved: true }, "L");
    expect(msgs[msgs.length - 1].content).toContain("già risposto CORRETTAMENTE");
  });

  it("senza tentativo: si parte da quello che sa", () => {
    const msgs = buildSocraticMessages({ exercise, history: [] }, "L");
    expect(msgs[msgs.length - 1].content).toContain("senza aver provato");
  });

  it("contenuti lunghi vengono potato (storia ed esercizio)", () => {
    const msgs = buildSocraticMessages(
      {
        exercise: { ...exercise, text: "x".repeat(5000) },
        history: [{ role: "user", content: "y".repeat(4000) }],
      },
      "L",
    );
    expect(msgs[0].content.length).toBeLessThan(20000);
    expect(msgs[1].content.length).toBeLessThanOrEqual(1500);
  });
});

describe("🤔 le regole del socratismo", () => {
  it("il divieto fondamentale è esplicito e ripetuto", () => {
    expect(SOCRATIC_SYSTEM_MESSAGE).toContain("Non dare MAI il risultato numerico finale");
    expect(SOCRATIC_SYSTEM_MESSAGE).toContain("mai l'esito finale");
  });

  it("una cosa sola per turno: 2-4 frasi e UNA domanda", () => {
    expect(SOCRATIC_SYSTEM_MESSAGE).toContain("2-4 frasi");
    expect(SOCRATIC_SYSTEM_MESSAGE).toContain("UNA domanda");
  });

  it("la scala di aiuto è definita e limitata", () => {
    expect(SOCRATIC_SYSTEM_MESSAGE).toContain("domanda di orientamento");
    expect(SOCRATIC_SYSTEM_MESSAGE).toContain("IMPOSTAZIONE del calcolo");
    expect(SOCRATIC_SYSTEM_MESSAGE).toContain("il conto resta allo studente");
  });

  it("tono asciutto: niente complimenti enfatici, niente emoji", () => {
    expect(SOCRATIC_SYSTEM_MESSAGE).toContain("zero enfasi");
    expect(SOCRATIC_SYSTEM_MESSAGE).toContain("zero emoji");
  });
});
