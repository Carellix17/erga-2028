import { describe, it, expect } from "vitest";
import {
  getAccentForeground,
  getStableSubjectColor,
  getSubjectColorByKey,
  resolveSubjectColor,
  SUBJECT_PALETTE,
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
  it("la palette contiene colori con tutte le classi e gli accenti necessari", () => {
    for (const c of SUBJECT_PALETTE) {
      expect(c.solid).toMatch(/^bg-/);
      expect(c.badge).toMatch(/^bg-/);
      expect(c.border).toMatch(/^border-/);
      expect(c.accent).toMatch(/^hsl\(/); // accent = colore materia (hsl allineato ai pastelli)
    }
  });
});

describe("getAccentForeground", () => {
  it("sceglie un primo piano neutro ad alto contrasto per HEX e HSL", () => {
    expect(getAccentForeground("#f59e0b")).toBe("#111111");
    expect(getAccentForeground("#2563eb")).toBe("#ffffff");
    expect(getAccentForeground("hsl(45 100% 50%)")).toBe("#111111");
    expect(getAccentForeground("hsl(220 100% 20%)")).toBe("#ffffff");
  });

  it("usa il quasi-nero neutro per valori non validi", () => {
    expect(getAccentForeground("not-a-color")).toBe("#111111");
  });
});
