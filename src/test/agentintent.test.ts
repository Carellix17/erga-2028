import { describe, it, expect } from "vitest";
import { detectActionIntent, parseForcedAction } from "../../supabase/functions/_shared/agentintent";

describe("detectActionIntent — il fiuto del Piano B", () => {
  it("abbaia per richieste diario con verbo + sostantivo", () => {
    expect(detectActionIntent("mettimi in diario una verifica di storia per domani")).toBe(true);
    expect(detectActionIntent("aggiungi un evento al calendario")).toBe(true);
    expect(detectActionIntent("ricordami il compito di matematica")).toBe(true);
    expect(detectActionIntent("programma un ripasso di biologia")).toBe(true);
    expect(detectActionIntent("segna l'obiettivo per la verifica")).toBe(true);
  });

  it("abbaia anche senza verbo, se c'è sostantivo + data ravvicinata", () => {
    expect(detectActionIntent("ho una verifica di storia per domani")).toBe(true);
    expect(detectActionIntent("interrogazione lunedì prossimo")).toBe(true);
    expect(detectActionIntent("esame il 23/07")).toBe(true);
  });

  it("sta zitto per le normali domande di studio", () => {
    expect(detectActionIntent("spiegami il fissismo")).toBe(false);
    expect(detectActionIntent("che cos'è una verifica delle ipotesi?")).toBe(false);
    expect(detectActionIntent("fammi un riassunto")).toBe(false);
    expect(detectActionIntent("")).toBe(false);
  });
});

describe("parseForcedAction — la cernita che non si fida", () => {
  const TODAY = "2026-07-21";
  const TOMORROW = "2026-07-22";

  it("un JSON pulito passa così com'è (e la verifica nasce 'scritta' di default)", () => {
    const out = parseForcedAction(
      '{"action":"add_event","title":"Verifica di storia","date":"2026-07-23","event_type":"test","subject":"Storia"}',
      TODAY,
    );
    expect(out).toEqual({
      action: "add_event",
      title: "Verifica di storia",
      date: "2026-07-23",
      event_type: "test",
      subject: "Storia",
      eval_type: "scritta",
    });
  });

  it("P8: eval_type e goal passano la cernita; quelli rotti si buttano", () => {
    const ok = parseForcedAction(
      '{"action":"add_event","title":"Interrogazione di storia","date":"2026-07-23","eval_type":"interrogazione","goal":8}',
      TODAY,
    );
    expect(ok?.eval_type).toBe("interrogazione");
    expect(ok?.event_type).toBe("test");
    expect(ok?.goal).toBe(8);

    const broken = parseForcedAction(
      '{"action":"add_event","title":"Verifica","event_type":"test","eval_type":"esame_di_stato","goal":42}',
      TODAY,
    );
    expect(broken?.eval_type).toBe("scritta"); // rotta → toppe: verifica classica
    expect(broken?.goal).toBeUndefined();      // 42 non è un voto: via
  });

  it("P8: 'compito' e assignment sono la stessa cosa, da entrambi i lati", () => {
    const a = parseForcedAction('{"action":"add_event","title":"Compito di mate","eval_type":"compito"}', TODAY);
    expect(a?.event_type).toBe("assignment");
    const b = parseForcedAction('{"action":"add_event","title":"Compito di mate","event_type":"assignment"}', TODAY);
    expect(b?.eval_type).toBe("compito");
  });

  it("trova il JSON anche se l'AI lo infiocchetta con ```json e chiacchiere", () => {
    const out = parseForcedAction(
      'Ecco a te:\n```json\n{"action":"add_event","title":"Ripasso","date":"2026-07-22","subject":"Storia"}\n```\nSpero sia utile!',
      TODAY,
    );
    expect(out?.action).toBe("add_event");
    expect(out?.title).toBe("Ripasso");
    expect(out?.event_type).toBe("study"); // mancava: toppe della macchina
  });

  it('{"action":"none"} e azioni fuori whitelist → niente carta', () => {
    expect(parseForcedAction('{"action":"none"}', TODAY)).toBeNull();
    expect(parseForcedAction('{"action":"goto_quiz"}', TODAY)).toBeNull();
    expect(parseForcedAction('{"action":"delete_everything"}', TODAY)).toBeNull();
  });

  it("spazzatura totale → null, non un disastro", () => {
    expect(parseForcedAction("Mi dispiace, non posso aiutarti.", TODAY)).toBeNull();
    expect(parseForcedAction("{json rotto", TODAY)).toBeNull();
    expect(parseForcedAction("", TODAY)).toBeNull();
  });

  it("data mancante o rotta → domani (calcolato, non inventato)", () => {
    const noDate = parseForcedAction('{"action":"add_event","title":"Verifica"}', TODAY);
    expect(noDate?.date).toBe(TOMORROW);
    const badDate = parseForcedAction('{"action":"add_event","title":"Verifica","date":"dopodomani"}', TODAY);
    expect(badDate?.date).toBe(TOMORROW);
  });

  it("i ripassi senza prefisso ricevono il cappello 'Ripasso: '", () => {
    const out = parseForcedAction(
      '{"action":"propose_review","title":"storia romana"}',
      TODAY,
    );
    expect(out?.title).toBe("Ripasso: storia romana");
    const already = parseForcedAction('{"action":"propose_review","title":"Ripasso: storia"}', TODAY);
    expect(already?.title).toBe("Ripasso: storia");
  });

  it("gli obiettivi puntano sempre alle verifiche (event_type=test)", () => {
    const out = parseForcedAction('{"action":"add_goal","title":"Promessi Sposi","event_type":"study"}', TODAY);
    expect(out?.event_type).toBe("test");
  });

  it("titoli chilometrici vengono potati a 120 caratteri", () => {
    const long = "x".repeat(300);
    const out = parseForcedAction(`{"action":"add_event","title":"${long}"}`, TODAY);
    expect(out?.title).toHaveLength(120);
  });
});
