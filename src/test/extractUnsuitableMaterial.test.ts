import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import * as material from "../../supabase/functions/_shared/studyMaterial";

// Execute the real Deno handler with local dependencies, without network or a live DB.
function imageHandler(visionResult: string | Error, imageCount = 1) {
  const updates: Record<string, unknown>[] = [];
  const context = { id: "ctx", user_id: "user", file_path: Array.from({ length: imageCount }, (_, i) => `image${i}.jpg`).join(",") };
  const query = {
    select: () => query, eq: () => query,
    single: async () => ({ data: context }),
    update: (value: Record<string, unknown>) => { updates.push(value); return query; },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
  };
  const supabase = { from: () => query, storage: { from: () => ({ download: async () => ({ data: { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer } }) }) } };
  const callVisionText = vi.fn(async () => { if (visionResult instanceof Error) throw visionResult; return visionResult; });
  let handler: (req: Request) => Promise<Response>;
  const source = readFileSync("supabase/functions/extract-pdf/index.ts", "utf8").replace(/^import .*;\r?\n/gm, "");
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const dependencies = {
    serve: (fn: typeof handler) => { handler = fn; },
    withCors: (fn: typeof handler) => fn,
    validateAuth: async () => ({ userId: "user", supabase }),
    createClient: () => supabase,
    successResponse: (body: unknown) => Response.json(body),
    errorResponse: (error: string, status = 400) => Response.json({ error }, { status }),
    Deno: { env: { get: () => "test" } },
    callVisionText,
    ...material,
  };
  new Function(...Object.keys(dependencies), js)(...Object.values(dependencies));
  return {
    updates, callVisionText,
    run: () => handler(new Request("https://test.local", { method: "POST", body: JSON.stringify({ action: "process-images", contextId: "ctx" }) })),
  };
}

describe("estrazione di immagini non studiabili", () => {
  it("chiude il tentativo al primo batch rifiutato e salva uno stato terminale pulito", async () => {
    const test = imageHandler(`[${material.UNSUITABLE_MATERIAL_CODE}]`, 6);
    const response = await test.run();
    expect(response.ok).toBe(false);
    expect(test.callVisionText).toHaveBeenCalledTimes(1); // no second batch, no retry
    expect(test.updates[test.updates.length - 1]).toEqual({ processing_status: "failed", error_message: material.UNSUITABLE_MATERIAL_ERROR, ...material.rejectedGenerationState() });
    expect(material.isStudyMaterialRejected(test.updates[test.updates.length - 1])).toBe(true);
  });

  it("chiude anche l'estrazione vuota senza suggerire una rigenerazione", async () => {
    const test = imageHandler("");
    await test.run();
    expect(test.updates[test.updates.length - 1]?.generation_progress).toEqual({});
    expect(test.updates[test.updates.length - 1]?.generation_error).toBe(material.UNSUITABLE_MATERIAL_ERROR);
  });

  it("conserva il flusso valido per diagrammi didattici", async () => {
    const text = "Diagramma della cellula: membrana, nucleo e citoplasma con organelli.";
    const test = imageHandler(text);
    expect((await test.run()).ok).toBe(true);
    expect(test.updates[test.updates.length - 1]).toMatchObject({ content: text, processing_status: "completed", error_message: null });
  });

  it("non classifica un errore di rete del provider come materiale improprio", async () => {
    const test = imageHandler(new Error("Network failure"));
    await test.run();
    expect(test.updates[test.updates.length - 1]).toMatchObject({ processing_status: "failed", error_message: "Errore nell'analisi delle immagini" });
    expect(material.isStudyMaterialRejected(test.updates[test.updates.length - 1])).toBe(false);
  });
});
