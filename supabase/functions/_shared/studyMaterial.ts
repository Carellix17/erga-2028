/** Terminal refusal, stored in existing error fields (no schema change). */
export const UNSUITABLE_MATERIAL_CODE = "UNSUITABLE_STUDY_MATERIAL";
export const UNSUITABLE_MATERIAL_MESSAGE =
  "Impossibile generare un percorso di studio: i file non contengono materiale didattico utilizzabile. Carica appunti, pagine di un libro o immagini pertinenti e leggibili.";
export const UNSUITABLE_MATERIAL_ERROR = `[${UNSUITABLE_MATERIAL_CODE}] ${UNSUITABLE_MATERIAL_MESSAGE}`;

export function isUnsuitableMaterialError(message: unknown): boolean {
  return typeof message === "string" && (
    message.includes(`[${UNSUITABLE_MATERIAL_CODE}]`) ||
    // Compatibility with extraction failures saved before this fix.
    message.startsWith("Impossibile estrarre contenuto sufficiente dalle immagini.") ||
    message.startsWith("Impossibile estrarre testo sufficiente dal PDF.")
  );
}

export function isStudyMaterialRejected(context: {
  processing_status?: string | null;
  error_message?: string | null;
  generation_status?: string | null;
  generation_error?: string | null;
} | null | undefined): boolean {
  return !!context && (
    (context.processing_status === "failed" && isUnsuitableMaterialError(context.error_message)) ||
    (context.generation_status === "failed" && isUnsuitableMaterialError(context.generation_error))
  );
}

/** Use the existing allowed 'failed' status, but discard all running-job state. */
export function rejectedGenerationState() {
  return {
    generation_status: "failed" as const,
    generation_error: UNSUITABLE_MATERIAL_ERROR,
    generation_progress: {},
    generation_started_at: null,
  };
}
