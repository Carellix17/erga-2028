import { describe, it, expect } from "vitest";
import {
  buildLanguageLessonPrompt,
  buildLatinLessonPrompt,
  LINGUE_SYSTEM_MESSAGE,
  LATINO_SYSTEM_MESSAGE,
  LANGUAGE_PLAN_GUIDANCE,
  LATIN_PLAN_GUIDANCE,
  isLanguageFamily,
} from "../../supabase/functions/_shared/languages";
import {
  buildLessonPromptForFamily,
  familySystemMessage,
  lessonTemperature,
  buildPlanFamilyGuidance,
  finalTestFamilyLine,
} from "../../supabase/functions/_shared/humanities";

// 🗣️ PERCORSI 2.0 — collaudo del motore delle lingue: isole di conversazione
// + grammatica in profondità per le lingue vive; latino senza conversazione,
// si impara leggendo e traducendo. Instradato dal guardaroba (humanities.ts).

const base = {
  title: "Le passé composé",
  profileContext: "\nProfilo: MEM in costruzione.",
  pageRangeInfo: "\nQuesta lezione copre le pagine 40-47.",
  figureInstructions: "",
  studyContent: "MATERIALE: ausiliare avoir/être, participio passato…",
};

describe("🗣️ l'instradamento nel guardaroba", () => {
  it("lingue e latino hanno il loro vestito", () => {
    expect(buildLessonPromptForFamily("lingue", base)).toBe(buildLanguageLessonPrompt(base));
    expect(buildLessonPromptForFamily("latino", base)).toBe(buildLatinLessonPrompt(base));
  });

  it("i messaggi di sistema seguono la stessa mappa", () => {
    expect(familySystemMessage("lingue")).toBe(LINGUE_SYSTEM_MESSAGE);
    expect(familySystemMessage("latino")).toBe(LATINO_SYSTEM_MESSAGE);
  });

  it("la temperatura: i dialoghi tengono voce (0,4), il latino resta preciso (0,35)", () => {
    expect(lessonTemperature("lingue")).toBe(0.4);
    expect(lessonTemperature("latino")).toBe(0.35);
  });

  it("isLanguageFamily riconosce le due famiglie", () => {
    expect(isLanguageFamily("lingue")).toBe(true);
    expect(isLanguageFamily("latino")).toBe(true);
    expect(isLanguageFamily("letteratura")).toBe(false);
    expect(isLanguageFamily("scientifiche")).toBe(false);
    expect(isLanguageFamily(null)).toBe(false);
  });
});

describe("🗣️ il vestito delle lingue vive", () => {
  const p = buildLanguageLessonPrompt(base);

  it("il patto: isole di conversazione E grammatica in profondità", () => {
    expect(p).toContain("ISOLE DI CONVERSAZIONE");
    expect(p).toContain("GRAMMATICA IN PROFONDITÀ");
    expect(p).toContain("solo a parlare");
  });

  it("la lingua: esempi e dialoghi SEMPRE nella lingua studiata", () => {
    expect(p).toContain("SEMPRE nella lingua studiata");
    expect(p).toContain("traduzione a fronte");
  });

  it("la lezione-concetto: regola, forme con tabelle, contrasti, errori, pratica", () => {
    for (const t of ["LA REGOLA IN PILLOLE", "COME SI FORMA", "I CONTRASTI CON L'ITALIANO", "GLI ERRORI TIPICI", "IN PRATICA", "LA SINTESI"]) {
      expect(p).toContain(t);
    }
    expect(p).toContain("TABELLE Markdown");
    expect(p).toContain("falsi amici");
    expect(p).toContain("la mappa dei tempi");
  });

  it("l'isola: situazione, dialogo modello, frase per frase, salvagente, taschino", () => {
    for (const t of ["SE IL TITOLO È UNA SITUAZIONE", "LA SITUAZIONE", "IL DIALOGO MODELLO", "FRASE PER FRASE", "SE RESTI BLOCCATO", "LE INSIDIE", "IL TUO TURNO", "IL TASCHINO"]) {
      expect(p).toContain(t);
    }
    expect(p).toContain("8-14 battute");
    expect(p).toContain("**Nome:** battuta");
  });

  it("la qualità: lingua autentica, esempi con glossa, termini definiti", () => {
    expect(p).toContain("autentica e attuale");
    expect(p).toContain("traduzione o glossa");
  });

  it("gli esercizi: uno sulla lingua in uso e uno sulla regola", () => {
    expect(p).toContain("Almeno UNA sulla lingua in uso");
    expect(p).toContain("regola grammaticale");
    expect(p).toContain('"explanation"');
  });
});

describe("📜 il vestito del latino", () => {
  const p = buildLatinLessonPrompt(base);

  it("il patto: si impara leggendo, niente conversazione", () => {
    expect(p).toContain("LEGGENDO e TRADUCENDO");
    expect(p).toContain("niente conversazione");
    expect(p).toContain("la voce è quella degli autori");
  });

  it("le tabelle sono lo strumento principe", () => {
    expect(p).toContain("TABELLE Markdown sono lo strumento principe");
  });

  it("la lezione di grammatica: funzione, forme, etimo, insidie", () => {
    for (const t of ["LA FUNZIONE", "LE FORME", "L'ETIMO", "LE INSIDIE", "LA SINTESI"]) {
      expect(p).toContain(t);
    }
    expect(p).toContain("ricordare per parentela");
  });

  it("la lezione d'autore: contesto, passo, analisi, traduzione, perché conta", () => {
    for (const t of ["SE IL TITOLO È UN AUTORE", "IL CONTESTO", "IL PASSO", "FRASE PER FRASE", "LA TRADUZIONE", "PERCHÉ CONTA"]) {
      expect(p).toContain(t);
    }
    expect(p).toContain("mai parola per parola");
  });

  it("la civiltà si racconta come lezione di storia", () => {
    expect(p).toContain("SE IL TITOLO È CIVILTÀ");
    expect(p).toContain("come una lezione di storia");
    expect(p).toContain("causa → effetto");
  });

  it("il metodo: verbo al centro, struttura prima delle parole, connettivi", () => {
    expect(p).toContain("Il verbo al centro");
    expect(p).toContain("Prima la struttura della frase");
    expect(p).toContain("connettivi");
  });

  it("gli esercizi: uno su forme o brani del materiale", () => {
    expect(p).toContain("funzione di un caso");
    expect(p).toContain("morfologia o sintassi");
  });
});

describe("🗣️ compatibilità e passaggi", () => {
  it("entrambi i vestiti chiedono lo STESSO schema JSON del lettore", () => {
    for (const p of [buildLanguageLessonPrompt(base), buildLatinLessonPrompt(base)]) {
      expect(p).toContain('"concept"');
      expect(p).toContain('"explanation_parts"');
      expect(p).toContain('"example"');
      expect(p).toContain('"exercises"');
      expect(p).toContain('"explanation"');
      expect(p).toContain("SOLO con un oggetto JSON valido");
    }
  });

  it("profilo, pagine, titolo e materiale passano in entrambi", () => {
    for (const p of [buildLanguageLessonPrompt(base), buildLatinLessonPrompt(base)]) {
      expect(p).toContain("Le passé composé");
      expect(p).toContain("pagine 40-47");
      expect(p).toContain("MEM in costruzione");
      expect(p).toContain("avoir/être");
    }
  });

  it("le figure entrano quando previste, e restano fuori altrimenti", () => {
    const conFigura = buildLanguageLessonPrompt({ ...base, figureInstructions: "FIGURE DAL PDF: token [FIG:0]" });
    expect(conFigura).toContain("LE FIGURE");
    expect(conFigura).toContain("[FIG:0]");
    const conFiguraLat = buildLatinLessonPrompt({ ...base, figureInstructions: "token [FIG:2]" });
    expect(conFiguraLat).toContain("LE FIGURE");
    for (const build of [buildLanguageLessonPrompt, buildLatinLessonPrompt]) {
      expect(build(base)).not.toContain("LE FIGURE");
    }
  });
});

describe("🗣️ l'impronta di materia nel piano e nel test finale", () => {
  it("lingue: grammatica e isole alternate nel piano", () => {
    const g = buildPlanFamilyGuidance("lingue");
    expect(g).toBe(LANGUAGE_PLAN_GUIDANCE);
    expect(g).toContain("alterna GRAMMATICA e USO");
    expect(g).toContain("isole di conversazione");
    expect(g).toContain("Il presente indicativo");
  });

  it("latino: prima la morfologia, poi la lettura", () => {
    const g = buildPlanFamilyGuidance("latino");
    expect(g).toBe(LATIN_PLAN_GUIDANCE);
    expect(g).toContain("prima la morfologia");
    expect(g).toContain("La prima declinazione");
    expect(g).toContain("Fedro e la favola");
  });

  it("il test finale conosce le lingue", () => {
    expect(finalTestFamilyLine("lingue")).toContain("traduzioni");
    expect(finalTestFamilyLine("lingue")).toContain("dialogo");
    expect(finalTestFamilyLine("latino")).toContain("funzioni dei casi");
    expect(finalTestFamilyLine("latino")).toContain("brano latino");
  });
});
