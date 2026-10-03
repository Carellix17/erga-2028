import { describe, it, expect } from "vitest";
import {
  buildLiteratureLessonPrompt,
  buildHistoryLessonPrompt,
  buildPhilosophyLessonPrompt,
  buildLessonPromptForFamily,
  familySystemMessage,
  lessonTemperature,
  buildPlanFamilyGuidance,
  finalTestFamilyLine,
  isHumanitiesFamily,
  LITERATURE_SYSTEM_MESSAGE,
  HISTORY_SYSTEM_MESSAGE,
  PHILOSOPHY_SYSTEM_MESSAGE,
} from "../../supabase/functions/_shared/humanities";
import { buildScientificLessonPrompt, SCIENTIFIC_SYSTEM_MESSAGE } from "../../supabase/functions/_shared/subjects";

// 📖 PERCORSI 2.0 — collaudo del motore umanistico: tre vestiti distinti,
// l'instradatore che sceglie quello giusto (o lo stampo classico), e il
// piano di studi che nasce già con la forma della materia.

const base = {
  title: "Giovanni Verga",
  profileContext: "\nProfilo: VOC buono.",
  pageRangeInfo: "\nQuesta lezione copre le pagine 12-18.",
  figureInstructions: "",
  studyContent: "MATERIALE: i Malavoglia, verismo…",
};

describe("📖 l'instradatore", () => {
  it("ogni famiglia umanistica ha il suo vestito", () => {
    const lit = buildLessonPromptForFamily("letteratura", base);
    expect(lit).toContain("DOCENTE DI LETTERATURA");
    const sto = buildLessonPromptForFamily("storiche", base);
    expect(sto).toContain("DOCENTE DI STORIA");
    const fil = buildLessonPromptForFamily("filosofia", base);
    expect(fil).toContain("DOCENTE DI FILOSOFIA");
    const sci = buildLessonPromptForFamily("scientifiche", base);
    expect(sci).toBe(buildScientificLessonPrompt(base));
  });

  it("le famiglie senza vestito tornano allo stampo classico (null)", () => {
    for (const fam of ["lingue", "latino", "sociali", "informatica", "arte", "generale", null, undefined, "futurismo"]) {
      expect(buildLessonPromptForFamily(fam, base)).toBeNull();
    }
  });

  it("i messaggi di sistema seguono la stessa mappa", () => {
    expect(familySystemMessage("letteratura")).toBe(LITERATURE_SYSTEM_MESSAGE);
    expect(familySystemMessage("storiche")).toBe(HISTORY_SYSTEM_MESSAGE);
    expect(familySystemMessage("filosofia")).toBe(PHILOSOPHY_SYSTEM_MESSAGE);
    expect(familySystemMessage("scientifiche")).toBe(SCIENTIFIC_SYSTEM_MESSAGE);
    expect(familySystemMessage("lingue")).toBeNull();
    expect(familySystemMessage(null)).toBeNull();
  });

  it("la temperatura: il racconto respira un filo di più (0,45), il resto 0,35", () => {
    expect(lessonTemperature("letteratura")).toBe(0.45);
    expect(lessonTemperature("storiche")).toBe(0.45);
    expect(lessonTemperature("filosofia")).toBe(0.45);
    expect(lessonTemperature("scientifiche")).toBe(0.35);
    expect(lessonTemperature("lingue")).toBe(0.35);
    expect(lessonTemperature(null)).toBe(0.35);
  });

  it("isHumanitiesFamily riconosce le tre famiglie", () => {
    expect(isHumanitiesFamily("letteratura")).toBe(true);
    expect(isHumanitiesFamily("storiche")).toBe(true);
    expect(isHumanitiesFamily("filosofia")).toBe(true);
    expect(isHumanitiesFamily("scientifiche")).toBe(false);
    expect(isHumanitiesFamily(null)).toBe(false);
  });
});

describe("📖 il vestito della letteratura", () => {
  const p = buildLiteratureLessonPrompt(base);

  it("card ariose: 120-220 parole, 5-7 slide, mai scheda da enciclopedia", () => {
    expect(p).toContain("120-220 parole");
    expect(p).toContain("5-7 slide");
    expect(p).toContain("enciclopedia");
  });

  it("la struttura dell'autore: ritratto, contesto, pensiero, voce, opere", () => {
    for (const t of ["IL RITRATTO", "IL CONTESTO", "PENSIERO E TEMI", "LA VOCE", "LE OPERE", "IL DETTAGLIO CHE RESTA"]) {
      expect(p).toContain(t);
    }
    // e le alternative per opera e corrente
    expect(p).toContain("Se è un'OPERA");
    expect(p).toContain("Se è una CORRENTE");
  });

  it("le citazioni: almeno DUE testuali in blockquote, e commentate", () => {
    expect(p).toContain("Almeno DUE citazioni");
    expect(p).toContain("> «…verso o frase…»");
  });

  it("gli esercizi: uno su una citazione e uno su pensiero o stile", () => {
    expect(p).toContain("Almeno UNA su una citazione");
    expect(p).toContain("pensiero o stile");
    expect(p).toContain('"explanation"');
  });
});

describe("⏳ il vestito della storia", () => {
  const p = buildHistoryLessonPrompt(base);

  it("il racconto: 6-8 slide da 90-160 parole, personaggi con nome e ruolo", () => {
    expect(p).toContain("90-160 parole");
    expect(p).toContain("NOME e RUOLO");
    expect(p).toContain("cognomi in fila");
  });

  it("le date incise: grassetto, mai nude, timeline numerata", () => {
    expect(p).toContain("LE DATE INCISE");
    expect(p).toContain("mai data nuda");
    expect(p).toContain("TIMELINE numerata");
    expect(p).toContain("**476**");
  });

  it("causa → effetto esplicito, e la geografia ha la sua strada", () => {
    expect(p).toContain("CAUSA → EFFETTO");
    expect(p).toContain("questo porta a");
    expect(p).toContain("GEOGRAFICO");
  });

  it("la sintesi finale è la timeline della lezione", () => {
    expect(p).toContain("la timeline compatta della lezione");
  });

  it("esercizi: uno su causa-effetto, uno su date o personaggi", () => {
    expect(p).toContain("CAUSA-EFFETTO");
    expect(p).toContain("date o personaggi");
  });
});

describe("🤔 il vestito della filosofia", () => {
  const p = buildPhilosophyLessonPrompt(base);

  it("struttura dialettica: tesi → obiezione → replica, almeno due volte", () => {
    expect(p).toContain("STRUTTURA DIALETTICA");
    expect(p).toContain("la TESI");
    expect(p).toContain("l'OBIEZIONE");
    expect(p).toContain("la REPLICA");
    expect(p).toContain("almeno DUE volte");
  });

  it("esempi terreni e lessico definito al primo uso", () => {
    expect(p).toContain("esempio terreno");
    expect(p).toContain("mappa senza territorio");
    expect(p).toContain("al primo uso");
  });

  it("almeno una citazione e il filo finale della lezione", () => {
    expect(p).toContain("> «…»");
    expect(p).toContain("IL FILO");
  });

  it("esercizi dialettici: «cosa risponderebbe X a Y?»", () => {
    expect(p).toContain("cosa risponderebbe X a Y");
  });
});

describe("📖 compatibilità col lettore e passaggi", () => {
  it("tutti e tre i vestiti chiedono lo STESSO schema JSON del lettore", () => {
    for (const p of [
      buildLiteratureLessonPrompt(base),
      buildHistoryLessonPrompt(base),
      buildPhilosophyLessonPrompt(base),
    ]) {
      expect(p).toContain('"concept"');
      expect(p).toContain('"explanation_parts"');
      expect(p).toContain('"example"');
      expect(p).toContain('"exercises"');
      expect(p).toContain('"explanation"');
      expect(p).toContain("SOLO con un oggetto JSON valido");
    }
  });

  it("profilo, pagine, titolo e materiale passano in tutti i vestiti", () => {
    for (const p of [
      buildLiteratureLessonPrompt(base),
      buildHistoryLessonPrompt(base),
      buildPhilosophyLessonPrompt(base),
    ]) {
      expect(p).toContain("Giovanni Verga");
      expect(p).toContain("pagine 12-18");
      expect(p).toContain("VOC buono");
      expect(p).toContain("i Malavoglia");
    }
  });

  it("le figure entrano quando previste, e restano fuori altrimenti", () => {
    const conFigura = buildLiteratureLessonPrompt({ ...base, figureInstructions: "FIGURE DAL PDF: token [FIG:0]" });
    expect(conFigura).toContain("LE FIGURE");
    expect(conFigura).toContain("[FIG:0]");
    for (const build of [buildLiteratureLessonPrompt, buildHistoryLessonPrompt, buildPhilosophyLessonPrompt]) {
      expect(build(base)).not.toContain("LE FIGURE");
    }
  });
});

describe("📖 l'impronta di materia nel piano di studi", () => {
  it("letteratura: moduli per autori e correnti", () => {
    const g = buildPlanFamilyGuidance("letteratura");
    expect(g).toContain("AUTORI e CORRENTI");
    expect(g).toContain("module_title");
    expect(g).toContain("Giovanni Verga");
    expect(g).toContain("Il Futurismo");
  });

  it("storia: cronologia rigorosa, date nei titoli, geografia per regioni", () => {
    const g = buildPlanFamilyGuidance("storiche");
    expect(g).toContain("CRONOLOGIA");
    expect(g).toContain("235–284");
    expect(g).toContain("GEOGRAFICO");
  });

  it("filosofia: prima i problemi, poi le risposte", () => {
    const g = buildPlanFamilyGuidance("filosofia");
    expect(g).toContain("PROBLEMI di fondo");
    expect(g).toContain("obiezioni che ha affrontato");
  });

  it("scienze: progressione prerequisiti → concetto → applicazioni", () => {
    expect(buildPlanFamilyGuidance("scientifiche")).toContain("prerequisiti → concetto → applicazioni");
  });

  it("famiglie senza impronta: stringa vuota (il piano resta classico)", () => {
    for (const fam of ["lingue", "latino", "sociali", "informatica", "arte", "generale", null, undefined]) {
      expect(buildPlanFamilyGuidance(fam)).toBe("");
    }
  });
});

describe("📖 l'impronta nel test finale", () => {
  it("ogni famiglia ha la sua riga", () => {
    expect(finalTestFamilyLine("letteratura")).toContain("attribuzione");
    expect(finalTestFamilyLine("storiche")).toContain("causa-effetto");
    expect(finalTestFamilyLine("filosofia")).toContain("cosa risponderebbe X a Y");
    expect(finalTestFamilyLine("scientifiche")).toContain("applicazioni numeriche");
    expect(finalTestFamilyLine("arte")).toContain("riconoscimento");
  });

  it("famiglie generiche: nessuna riga extra", () => {
    expect(finalTestFamilyLine("lingue")).toBe("");
    expect(finalTestFamilyLine(null)).toBe("");
  });
});
