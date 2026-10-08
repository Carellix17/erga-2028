import { describe, it, expect } from "vitest";
import { parseExplanationParts, FALLBACK_LABELS } from "../lib/lessonParts";

/**
 * 🧺 P18 — Il parser delle parti della lezione. Prima viveva nel lettore con
 * una cerniera strettissima (serviva parsed[0].part_title): un JSON valido ma
 * con forma imperfetta cadeva nell'euristica a righe e lo studente poteva
 * vedere il JSON grezzo. Ora anche le forme imperfette diventano parti vere.
 */

describe("parseExplanationParts", () => {
  it("JSON classico con part_title: invariato", () => {
    const explanation = JSON.stringify([
      { part_title: "🎯 Inizio", content: "Prima parte." },
      { part_title: "📚 Definizione", content: "Seconda parte." },
    ]);
    const parts = parseExplanationParts(explanation);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatchObject({ part_title: "🎯 Inizio", content: "Prima parte." });
  });

  it("oggetti SENZA part_title: titolo di riserva, contenuto salvo (P18)", () => {
    const explanation = JSON.stringify([
      { content: "Prima parte senza titolo." },
      { content: "Seconda parte senza titolo." },
    ]);
    const parts = parseExplanationParts(explanation);
    expect(parts).toHaveLength(2);
    expect(parts[0].part_title).toBe("Parte 1");
    expect(parts[0].content).toBe("Prima parte senza titolo.");
  });

  it("array di pure stringhe: ogni stringa diventa una parte (P18)", () => {
    const explanation = JSON.stringify(["Primo argomento.", "Secondo argomento."]);
    const parts = parseExplanationParts(explanation);
    expect(parts).toHaveLength(2);
    expect(parts[1]).toMatchObject({ part_title: "Parte 2", content: "Secondo argomento." });
  });

  it("le parti vuote non fanno numero", () => {
    const explanation = JSON.stringify([{ content: "  " }, { content: "Quella buona resta." }]);
    const parts = parseExplanationParts(explanation);
    expect(parts).toHaveLength(1);
    expect(parts[0].content).toBe("Quella buona resta.");
  });

  it("array vuoto o senza nulla di utile: euristica a righe (comportamento storico)", () => {
    const parts = parseExplanationParts("[]");
    // array vuoto → cade sull'euristica: una riga sola = una parte unica
    expect(parts).toHaveLength(1);
    expect(parts[0].content).toBe("[]");
  });

  it("testo semplice a righe: elenco puntato → parti (euristica invariata)", () => {
    const parts = parseExplanationParts("• Prima idea\n• Seconda idea\nchiusura");
    // (comportamento storico: le righe dopo l'ultimo punto si uniscono all'ultima parte)
    expect(parts).toHaveLength(2);
    expect(parts[0].part_title).toBe("Parte 1");
    expect(parts[0].content).toBe("Prima idea");
    expect(parts[1].content).toBe("Seconda idea\nchiusura");
  });

  it("etichette personalizzate (i18n della chiamante)", () => {
    const labels = { explanation: "Spiegazione", part: (n: number) => `Teil ${n}` };
    const parts = parseExplanationParts(JSON.stringify([{ content: "Inhalt." }]), labels);
    expect(parts[0].part_title).toBe("Teil 1");
  });

  it("FALLBACK_LABELS: valori neutri di serie", () => {
    expect(FALLBACK_LABELS.part(3)).toBe("Parte 3");
    expect(FALLBACK_LABELS.explanation).toBe("Spiegazione");
  });
});
