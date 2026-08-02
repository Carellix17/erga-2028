import { describe, it, expect } from "vitest";
import {
  getStableSubjectColor, getSubjectColorByKey, resolveSubjectColor, SUBJECT_PALETTE,
} from "@/lib/subjectColors";

describe("getSubjectColorByKey", () => {
  it("trova il colore per chiave valida", () => {
    expect(getSubjectColorByKey("matematica")?.key).toBe("matematica");
  });
  it("chiave inesistente o vuota -> null", () => {
    expect(getSubjectColorByKey("non-esiste")).toBeNull();
    expect(getSubjectColorByKey(null)).toBeNull();
    expect(getSubjectColorByKey("")).toBeNull();
  });
});

describe("resolveSubjectColor (automatico + personalizzato)", () => {
  it("senza scelta utente usa il colore automatico", () => {
    expect(resolveSubjectColor("Matematica").key).toBe("matematica");
    expect(resolveSubjectColor("Matematica", null).key).toBe("matematica");
  });
  it("la scelta utente vince sull'automatico", () => {
    const custom = resolveSubjectColor("Matematica", "storia");
    expect(custom.key).toBe("storia");
  });
  it("chiave salvata non valida -> torna all'automatico", () => {
    expect(resolveSubjectColor("Matematica", "chiave-rotta").key).toBe("matematica");
  });
  it("il colore automatico e' stabile nel tempo per nomi sconosciuti", () => {
    expect(getStableSubjectColor("Diritto Penale II").key).toBe(getStableSubjectColor("Diritto Penale II").key);
  });
  it("la palette contiene colori con tutte le classi necessarie", () => {
    for (const c of SUBJECT_PALETTE) {
      expect(c.solid).toMatch(/^bg-/);
      expect(c.badge).toMatch(/^bg-/);
      expect(c.border).toMatch(/^border-/);
    }
  });
});
