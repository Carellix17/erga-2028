import { describe, it, expect } from "vitest";
import {
  buildArtLessonPrompt,
  ART_SYSTEM_MESSAGE,
  ART_PLAN_GUIDANCE,
  ART_FINAL_TEST_LINE,
} from "../../supabase/functions/_shared/art";
import {
  buildLessonPromptForFamily,
  familySystemMessage,
  lessonTemperature,
  buildPlanFamilyGuidance,
  finalTestFamilyLine,
} from "../../supabase/functions/_shared/humanities";

// 🎨 PERCORSI 2.0 — collaudo del motore di storia dell'arte: sempre con
// l'opera davanti agli occhi, tre tipi di lezione (periodo, artista, opera),
// ogni opera con autore e data, impronta periodo → luoghi → opere nel piano.

const base = {
  title: "Il Rinascimento a Firenze",
  profileContext: "\nProfilo: VOC ottimo.",
  pageRangeInfo: "\nQuesta lezione copre le pagine 88-95.",
  figureInstructions: "",
  studyContent: "MATERIALE: Brunelleschi, la cupola, i Medici…",
};

describe("🎨 l'instradamento nel guardaroba", () => {
  it("l'arte ha il suo vestito", () => {
    expect(buildLessonPromptForFamily("arte", base)).toBe(buildArtLessonPrompt(base));
  });

  it("il messaggio di sistema segue la stessa mappa", () => {
    expect(familySystemMessage("arte")).toBe(ART_SYSTEM_MESSAGE);
  });

  it("la temperatura: anche l'arte racconta (0,45)", () => {
    expect(lessonTemperature("arte")).toBe(0.45);
  });
});

describe("🎨 il vestito della storia dell'arte", () => {
  const p = buildArtLessonPrompt(base);

  it("il patto: sempre con l'opera davanti agli occhi, si impara a guardare", () => {
    expect(p).toContain("sempre con l'opera davanti agli occhi");
    expect(p).toContain("imparare a GUARDARE");
    expect(p).toContain("non a memorizzare elenchi");
  });

  it("ogni opera con autore e data, e dove si trova oggi", () => {
    expect(p).toContain("**Titolo, autore, data**");
    expect(p).toContain("La Gioconda, Leonardo, 1503-1506");
    expect(p).toContain("oggi al Louvre");
    expect(p).toContain("l'opera è un evento");
  });

  it("il periodo: aria del tempo, programma, luoghi, artisti, tecnica, eredità", () => {
    for (const t of ["L'ARIA DEL TEMPO", "IL PROGRAMMA", "I LUOGHI", "GLI ARTISTI E LE OPERE CARDINE", "LO SGUARDO E LA TECNICA", "L'EREDITÀ", "LA MAPPA"]) {
      expect(p).toContain(t);
    }
    expect(p).toContain("come si RICONOSCE il periodo");
  });

  it("l'artista: ritratto, contesto, sguardo, LA MANO, opere essenziali, dettaglio", () => {
    for (const t of ["SE IL TITOLO È UN ARTISTA", "IL RITRATTO", "LO SGUARDO", "LA MANO", "LE OPERE ESSENZIALI", "IL DETTAGLIO CHE RESTA"]) {
      expect(p).toContain(t);
    }
    expect(p).toContain("impasto, pentimento, velatura");
  });

  it("l'opera singola: inquadro, soggetto, analisi formale, contesto, dettaglio, fortuna", () => {
    for (const t of ["SE IL TITOLO È UN'OPERA", "L'INQUADRO", "IL SOGGETTO", "L'ANALISI FORMALE", "IL CONTESTO E IL SENSO", "IL DETTAGLIO", "LA FORTUNA"]) {
      expect(p).toContain(t);
    }
    expect(p).toContain("si DESCRIVE guardando davvero");
    expect(p).toContain("l'iconografia spiegata");
  });

  it("la tecnica o tema ha la sua strada", () => {
    expect(p).toContain("SE IL TITOLO È UNA TECNICA O UN TEMA");
    expect(p).toContain("chi la porta al vertice");
  });

  it("il lessico tecnico definito al primo uso e il filo con la storia", () => {
    expect(p).toContain("definita al primo uso in mezza riga");
    expect(p).toContain("chiaroscuro, prospettiva lineare, campitura");
    expect(p).toContain("causa → effetto quando spiega l'arte");
  });

  it("i nomi si guadagnano il posto: mai elenchi senza racconto", () => {
    expect(p).toContain("GUADAGNARSI il posto");
  });

  it("gli esercizi: attribuzione e lettura dell'opera, il confronto è il meglio", () => {
    expect(p).toContain("ATTRIBUZIONE");
    expect(p).toContain("LETTURA DELL'OPERA");
    expect(p).toContain("Il confronto fra due opere è il formato migliore");
    expect(p).toContain('"explanation"');
  });
});

describe("🎨 compatibilità e passaggi", () => {
  it("il vestito chiede lo STESSO schema JSON del lettore", () => {
    const p = buildArtLessonPrompt(base);
    expect(p).toContain('"concept"');
    expect(p).toContain('"explanation_parts"');
    expect(p).toContain('"example"');
    expect(p).toContain('"exercises"');
    expect(p).toContain('"explanation"');
    expect(p).toContain("SOLO con un oggetto JSON valido");
  });

  it("profilo, pagine, titolo e materiale passano", () => {
    const p = buildArtLessonPrompt(base);
    expect(p).toContain("Il Rinascimento a Firenze");
    expect(p).toContain("pagine 88-95");
    expect(p).toContain("VOC ottimo");
    expect(p).toContain("Brunelleschi");
  });

  it("le figure sono il cuore: blocco arte-specifico quando previste", () => {
    const conFigura = buildArtLessonPrompt({ ...base, figureInstructions: "FIGURE DAL PDF: token [FIG:0]" });
    expect(conFigura).toContain("LE FIGURE — PER L'ARTE SONO IL CUORE");
    expect(conFigura).toContain("L'ANALISI si fa SULLA FIGURA");
    expect(conFigura).toContain("[FIG:0]");
    expect(buildArtLessonPrompt(base)).not.toContain("LE FIGURE");
  });
});

describe("🎨 l'impronta di materia nel piano e nel test finale", () => {
  it("il piano segue il grafo periodo → luoghi → opere, cronologia sacra", () => {
    const g = buildPlanFamilyGuidance("arte");
    expect(g).toBe(ART_PLAN_GUIDANCE);
    expect(g).toContain("per PERIODI");
    expect(g).toContain("Il primo Rinascimento (1420-1490)");
    expect(g).toContain("ordine cronologico rigoroso");
    expect(g).toContain("periodo → luoghi → opere");
  });

  it("il test finale: riconoscimento, attribuzione, lettura formale", () => {
    const line = finalTestFamilyLine("arte");
    expect(line).toBe(ART_FINAL_TEST_LINE);
    expect(line).toContain("riconoscimento");
    expect(line).toContain("attribuzione");
    expect(line).toContain("lettura formale");
  });
});
