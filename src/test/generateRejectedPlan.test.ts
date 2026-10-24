import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import * as material from "../../supabase/functions/_shared/studyMaterial";
import { extractJsonRobust } from "../../supabase/functions/_shared/lessonPayload";

function generationHandler(aiResponse: string | Error, overrides: Record<string, unknown> = {}) {
  const updates: Record<string, unknown>[] = [];
  const deleteLessons = vi.fn();
  const context = { id: "ctx", user_id: "user", processing_status: "completed", generation_status: "idle", content: "Foto personale senza argomenti di studio.", file_name: "Foto", ...overrides };
  const supabase = { from: (table: string) => {
    const query = {
      select: () => query, eq: () => query,
      single: async () => ({ data: table === "study_contexts" ? context : null }),
      maybeSingle: async () => ({ data: table === "study_contexts" ? context : null }),
      update: (value: Record<string, unknown>) => { if (table === "study_contexts") updates.push(value); return query; },
      delete: () => { deleteLessons(); return query; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
    };
    return query;
  } };
  const jobs: Promise<unknown>[] = [];
  const callAIText = vi.fn(async () => { if (aiResponse instanceof Error) throw aiResponse; return aiResponse; });
  let handler: (req: Request) => Promise<Response>;
  const source = readFileSync("supabase/functions/generate-lessons/index.ts", "utf8").replace(/^import[\s\S]*?from ["'][^"']+["'];\r?\n/gm, "");
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const deps = {
    serve: (fn: typeof handler) => { handler = fn; }, withCors: (fn: typeof handler) => fn,
    validateAuth: async () => ({ userId: "user", supabase }),
    errorResponse: (error: string, status = 500) => Response.json({ error }, { status }),
    fetchCognitiveProfile: async () => null, buildCognitivePromptAddon: () => "",
    normalizeLanguage: () => "it", languageDirective: () => "Italiano",
    detectSubject: async () => ({ family: "umanistiche", subject: "altro", confidence: 50, source: "test" }),
    maxPageNumber: () => 0, isLongDocument: () => false, buildPlanFamilyGuidance: () => "",
    callAIText, extractJsonRobust, ...material,
    EdgeRuntime: { waitUntil: (job: Promise<unknown>) => jobs.push(job) },
  };
  new Function(...Object.keys(deps), js)(...Object.values(deps));
  return {
    updates, deleteLessons, callAIText,
    run: async () => {
      const response = await handler(new Request("https://test.local", { method: "POST", body: JSON.stringify({ contextId: "ctx" }) }));
      await Promise.all(jobs);
      return response;
    },
  };
}

describe("generazione del percorso con materiale rifiutato", () => {
  it("un indice [] annulla il job prima di cancellare o sovrascrivere lezioni precedenti", async () => {
    const test = generationHandler("[]");
    expect((await test.run()).status).toBe(202);
    expect(test.updates[test.updates.length - 1]).toEqual(material.rejectedGenerationState());
    expect(test.deleteLessons).not.toHaveBeenCalled();
    expect(test.callAIText).toHaveBeenCalledTimes(1);
  });

  it("un rifiuto già salvato restituisce 422 senza riavviare l'AI", async () => {
    const test = generationHandler("[]", material.rejectedGenerationState());
    expect((await test.run()).status).toBe(422);
    expect(test.callAIText).not.toHaveBeenCalled();
  });

  it("l'aggiunta di materiale nuovo permette una nuova valutazione", async () => {
    const test = generationHandler("[]", { ...material.rejectedGenerationState(), new_material_pending: true });
    expect((await test.run()).status).toBe(202);
    expect(test.callAIText).toHaveBeenCalledTimes(1);
  });

  it("un errore temporaneo chiude il job ma conserva la possibilità di riprovare", async () => {
    const test = generationHandler(new Error("Provider temporaneamente indisponibile"));
    await test.run();
    const last = test.updates[test.updates.length - 1];
    expect(last).toMatchObject({ generation_status: "failed", generation_progress: {}, generation_started_at: null });
    expect(material.isStudyMaterialRejected(last)).toBe(false);
    expect(test.deleteLessons).not.toHaveBeenCalled();
  });
});
