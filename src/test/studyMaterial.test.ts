import { describe, expect, it } from "vitest";
import { isStudyMaterialRejected, isUnsuitableMaterialError, rejectedGenerationState, UNSUITABLE_MATERIAL_ERROR } from "../../supabase/functions/_shared/studyMaterial";

describe("rifiuto definitivo del materiale", () => {
  it("riconosce il rifiuto in analisi e nella generazione, anche dopo la riapertura", () => {
    expect(isStudyMaterialRejected({ processing_status: "failed", error_message: UNSUITABLE_MATERIAL_ERROR })).toBe(true);
    expect(isStudyMaterialRejected(JSON.parse(JSON.stringify(rejectedGenerationState())))).toBe(true);
  });

  it("riconosce gli errori di estrazione già salvati prima della correzione", () => {
    expect(isStudyMaterialRejected({ processing_status: "failed", error_message: "Impossibile estrarre contenuto sufficiente dalle immagini. Prova con foto più nitide." })).toBe(true);
    expect(isUnsuitableMaterialError("Impossibile estrarre testo sufficiente dal PDF. Il file potrebbe essere un'immagine o protetto.")).toBe(true);
  });

  it("non trasforma errori temporanei o stati superati in rifiuti", () => {
    expect(isStudyMaterialRejected({ generation_status: "failed", generation_error: "Servizio AI temporaneamente occupato" })).toBe(false);
    expect(isStudyMaterialRejected({ processing_status: "completed", error_message: UNSUITABLE_MATERIAL_ERROR })).toBe(false);
    expect(isStudyMaterialRejected(null)).toBe(false);
  });

  it("azzera avanzamento, timestamp e lavori di modulo senza cancellare lezioni", () => {
    const state = rejectedGenerationState();
    expect(state.generation_status).toBe("failed");
    expect(state.generation_progress).toEqual({});
    expect(state.generation_started_at).toBeNull();
    expect(isUnsuitableMaterialError(state.generation_error)).toBe(true);
    expect(state).not.toHaveProperty("lessons");
  });
});
