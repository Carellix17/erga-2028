import { describe, expect, it } from "vitest";
import { detectSubjectFromText } from "@/lib/subjectDetector";
import { COURSE_IMAGE_MAP, getCourseImage, type CourseImageKey } from "@/lib/courseImages";
import { resolveCourseCover } from "@/lib/courseIdentity";

const samples: Record<CourseImageKey, string> = {
  letteratura_e_grammatica: "Dante e le figure retoriche nel sonetto",
  matematica: "Derivata e integrale di una funzione",
  fisica: "Cinematica, velocità e accelerazione",
  informatica: "Algoritmi e codice sorgente in Python",
  storia: "La guerra mondiale nel ventesimo secolo",
  scienze: "Il DNA nelle cellule e la genetica",
  chimica: "pH, tavola periodica e legami chimici",
  filosofia: "Platone, Socrate ed etica",
  geografia: "Cartografia, idrografia e paesaggio",
  diritto_e_economia: "Costituzione, codice civile e mercato",
  lingua_straniera: "Inglése: grammatica e present perfect",
};

describe("Rilevamento della materia per la copertina", () => {
  it.each(Object.entries(samples))("riconosce %s dal testo", (subject, content) => {
    const result = detectSubjectFromText(content);
    expect(result.detectedSubject).toBe(subject);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.mainKeywords.length).toBeGreaterThan(0);
    expect(result.backgroundImage).toBe(COURSE_IMAGE_MAP[subject as CourseImageKey]);
    expect(result.backgroundImage).toMatch(/\.png$/);
  });

  it.each(["", "nota senza indizi", "appunto collegato al webdesign", "matematica e storia"])(
    "usa il fondo alternativo quando il testo è vuoto, ambiguo o sconosciuto (%s)",
    (content) => {
      expect(detectSubjectFromText(content)).toEqual({
        detectedSubject: null, confidence: 0, mainKeywords: [], backgroundImage: null,
      });
    },
  );

  it("riconosce locuzioni, sigle e parole accentate anche con separatori", () => {
    expect(detectSubjectFromText("TAVOLA-PERIODICA, pH")
      .mainKeywords).toEqual(["tavola periodica", "ph"]);
    expect(detectSubjectFromText("Probabilita").detectedSubject).toBe("matematica");
    expect(detectSubjectFromText("romanzo romanzo romanzo").confidence)
      .toBe(detectSubjectFromText("romanzo").confidence);
    expect(getCourseImage(" Diritto ed Economia ")).toBe(COURSE_IMAGE_MAP.diritto_e_economia);
    expect(getCourseImage("grammatica")).toBe(COURSE_IMAGE_MAP.letteratura_e_grammatica);
    expect(getCourseImage("constructor")).toBeNull();
  });

  it("risolve la copertina per materia salvata, titolo o metadati precedenti", () => {
    expect(resolveCourseCover("Storia.pdf", "chimica").backgroundImage).toBe(COURSE_IMAGE_MAP.chimica);
    expect(resolveCourseCover("Geografia fisica.pdf", null, "Scienze").backgroundImage).toBe(COURSE_IMAGE_MAP.geografia);
    expect(resolveCourseCover("Appunti.pdf", null, "Fisica").backgroundImage).toBe(COURSE_IMAGE_MAP.fisica);
    expect(resolveCourseCover("Appunti.pdf").backgroundImage).toBeNull();
    expect(resolveCourseCover("Storia dell'arte.pdf", "arte").backgroundImage).toBeNull();
  });
});
