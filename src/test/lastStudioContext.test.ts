import { beforeEach, describe, expect, it } from "vitest";
import {
  isStudioBookmarkReady,
  readLastStudioContext,
  resolveStudioContextId,
  writeLastStudioContext,
} from "@/lib/lastStudioContext";

describe("segnalibro locale di Studio", () => {
  beforeEach(() => localStorage.clear());

  it("senza una lettura precedente non blocca un altro utente e non inventa un percorso", () => {
    writeLastStudioContext("ada", "corso-a");
    expect(readLastStudioContext("ada")).toEqual({ known: true, id: "corso-a" });
    expect(readLastStudioContext("bruno")).toEqual({ known: false, id: null });
    expect(readLastStudioContext(null)).toEqual({ known: false, id: null });
  });

  it("ricorda anche l'assenza di segnalibro, così il rientro non aspetta il cloud", () => {
    writeLastStudioContext("ada", null);
    expect(readLastStudioContext("ada")).toEqual({ known: true, id: null });
  });

  it("è pronto se il segnalibro è noto, oppure se esiste un solo percorso", () => {
    expect(isStudioBookmarkReady(false, 2)).toBe(false);
    expect(isStudioBookmarkReady(true, 2)).toBe(true);
    expect(isStudioBookmarkReady(false, 1)).toBe(true);
  });

  it("apre subito il percorso ricordato, e non lo sostituisce se lo studente ne ha scelto un altro", () => {
    const courseIds = ["ultimo-generato", "visto"];
    expect(resolveStudioContextId({
      rememberedId: "visto",
      bookmarkReady: true,
      courseIds,
    })).toBe("visto");
    expect(resolveStudioContextId({
      chosenId: "ultimo-generato",
      rememberedId: "visto",
      bookmarkReady: true,
      courseIds,
    })).toBe("ultimo-generato");
    expect(resolveStudioContextId({
      bookmarkReady: false,
      courseIds,
    })).toBeNull();
  });
});
