import { describe, it, expect } from "vitest";
import {
  extractImageTag,
  extractActions,
  parseSpecialEvent,
  cleanAssistantText,
} from "@/lib/chatProtocol";

describe("extractImageTag — la richiesta d'immagine", () => {
  it("trova il tag e ripulisce il testo", () => {
    const { cleanText, imageQuery } = extractImageTag(
      "Il David è alto 5 metri. [IMG: David Michelangelo]",
    );
    expect(imageQuery).toBe("David Michelangelo");
    expect(cleanText).toBe("Il David è alto 5 metri.");
    expect(cleanText).not.toContain("[IMG:");
  });

  it("senza tag lascia tutto com'è", () => {
    expect(extractImageTag("Solo testo.")).toEqual({
      cleanText: "Solo testo.",
      imageQuery: null,
    });
  });

  it("troppi tag: tiene la prima query e spazza via tutti i tag", () => {
    const { cleanText, imageQuery } = extractImageTag(
      "Roma [IMG: Colosseo] e Napoli [IMG: Vesuvio]!",
    );
    expect(imageQuery).toBe("Colosseo");
    expect(cleanText).toBe("Roma e Napoli!");
  });

  it("testo vuoto non esplode", () => {
    expect(extractImageTag("")).toEqual({ cleanText: "", imageQuery: null });
  });
});

describe("extractActions — le azioni dell'agente", () => {
  it("estrae il blocco e lo toglie dalla vista", () => {
    const text = "Certo, lo segno nel diario!\n```erga_actions\n[{\"action\":\"add_event\",\"title\":\"Ripasso storia\",\"date\":\"2026-07-25\",\"event_type\":\"study\",\"subject\":\"Storia\"}]\n```";
    const { cleanText, actions } = extractActions(text);
    expect(cleanText).toBe("Certo, lo segno nel diario!");
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual({
      kind: "add_event",
      title: "Ripasso storia",
      date: "2026-07-25",
      event_type: "study",
      subject: "Storia",
    });
  });

  it("più azioni nello stesso blocco", () => {
    const text = "```erga_actions\n[{\"action\":\"goto_quiz\"},{\"action\":\"propose_review\",\"title\":\"Verifica\"}]\n```";
    const { actions } = extractActions(text);
    expect(actions.map((a) => a.kind)).toEqual(["goto_quiz", "propose_review"]);
  });

  it("JSON rotto → nessuna azione ma testo pulito senza blocco", () => {
    const { cleanText, actions } = extractActions("Ok!\n```erga_actions\n[{rot15a\n```");
    expect(actions).toHaveLength(0);
    expect(cleanText).toBe("Ok!");
  });

  it("azione sconosciuta → ignorata (mai eseguire cose che non capiamo)", () => {
    const { actions } = extractActions("```erga_actions\n[{\"action\":\"delete_everything\"}]\n```");
    expect(actions).toHaveLength(0);
  });

  it("oggetto singolo invece di array → accettato", () => {
    const { actions } = extractActions("```erga_actions\n{\"action\":\"goto_lesson\",\"query\":\"Fotosintesi\"}\n```");
    expect(actions).toHaveLength(1);
    expect(actions[0].kind).toBe("goto_lesson");
  });
});

describe("parseSpecialEvent — i messaggi di servizio del tubo", () => {
  it("riconosce le fonti", () => {
    const event = parseSpecialEvent({
      sources: [{ file: "Storia.pdf", pageStart: 12, pageEnd: 13, excerpt: "Nel 1789…" }],
    });
    expect(event).toEqual({
      type: "sources",
      sources: [{ file: "Storia.pdf", pageStart: 12, pageEnd: 13, excerpt: "Nel 1789…" }],
    });
  });

  it("riconosce l'avviso di tubo rotto", () => {
    expect(parseSpecialEvent({ warning: "interrupted" })).toEqual({
      type: "warning",
      warning: "interrupted",
    });
  });

  it("i normali pezzetti di testo NON sono eventi speciali", () => {
    expect(parseSpecialEvent({ choices: [{ delta: { content: "ciao" } }] })).toBeNull();
    expect(parseSpecialEvent(null)).toBeNull();
    expect(parseSpecialEvent("stringa")).toBeNull();
  });

  it("fonti spurie vengono filtrate", () => {
    const event = parseSpecialEvent({ sources: [{ file: "ok.pdf", excerpt: "x" }, { nope: 1 }] });
    expect(event?.type).toBe("sources");
    if (event?.type === "sources") expect(event.sources).toHaveLength(1);
  });
});

describe("cleanAssistantText — la spugna definitiva", () => {
  it("toglie azioni E tag immagine in una passata sola", () => {
    const { cleanText, actions, imageQuery } = cleanAssistantText(
      "Ecco Napoleone! [IMG: Napoleon Bonaparte]\n```erga_actions\n[{\"action\":\"add_event\",\"title\":\"Studio\"}]\n```",
    );
    expect(cleanText).toBe("Ecco Napoleone!");
    expect(imageQuery).toBe("Napoleon Bonaparte");
    expect(actions).toHaveLength(1);
  });
});
