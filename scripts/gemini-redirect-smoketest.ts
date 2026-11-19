/**
 * Confronto manuale gemini-2.5-flash vs gemini-3.5-flash-lite.
 *
 * Dati solo sintetici: un prompt didattico, un PNG generato, un PDF di 3 pagine.
 * La chiave si legge SOLO da GEMINI_TEST_API_KEY. Se manca, esce con codice 0.
 * Non legge .env, non stampa la chiave, non usa materiale vero.
 *
 *   GEMINI_TEST_API_KEY=... node scripts/gemini-redirect-smoketest.ts
 *   GEMINI_TEST_API_KEY=... deno run --allow-net --allow-env scripts/gemini-redirect-smoketest.ts
 *
 * Node 22 legge il TypeScript così com'è. Il corpo delle richieste 3.x è
 * costruito con le stesse funzioni delle Edge Function (`gemini.ts`).
 */

import {
  GEMINI_MODEL_DEFAULT,
  GEMINI_MODEL_ROLLBACK,
  geminiChatSampling,
  geminiNativeGenerationConfig,
} from "../supabase/functions/_shared/gemini.ts";
import { extractUsageTokens } from "../supabase/functions/_shared/usage.ts";

const OPENAI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const NATIVE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const PDF_PAGES = [
  "Pagina 1. La fotosintesi trasforma la luce in glucosio.",
  "Pagina 2. La clorofilla riflette il verde e assorbe il blu e il rosso.",
  "Pagina 3. Senza luce la pianta consuma le riserve e non cresce.",
];
const DIDACTIC_PROMPT =
  "Spiega in due frasi, per uno studente di prima superiore, perche le piante sono verdi.";
const IMAGE_PROMPT = "Descrivi in una frase questa immagine sintetica di un quadrato a quattro colori.";
const PDF_PROMPT =
  "Trascrivi il testo di ogni pagina di questo PDF sintetico. Tieni l'ordine e non aggiungere commenti.";

type Kind = "text" | "image" | "pdf";
type Endpoint = "openai" | "native";

interface SmokeCase {
  endpoint: Endpoint;
  kind: Kind;
  fn: string;
}

const CASES: SmokeCase[] = [
  { endpoint: "openai", kind: "text", fn: "chat" },
  { endpoint: "openai", kind: "image", fn: "extract-pdf" },
  { endpoint: "openai", kind: "pdf", fn: "extract-pdf" },
  { endpoint: "native", kind: "text", fn: "chat" },
  { endpoint: "native", kind: "image", fn: "extract-pdf" },
  { endpoint: "native", kind: "pdf", fn: "extract-pdf" },
];

function readTestKey(): string {
  const denoEnv = (globalThis as { Deno?: { env: { get(name: string): string | undefined } } }).Deno;
  const fromDeno = denoEnv?.env.get("GEMINI_TEST_API_KEY");
  const fromNode = typeof process !== "undefined" ? process.env.GEMINI_TEST_API_KEY : undefined;
  return (fromDeno || fromNode || "").trim();
}

function exitWith(code: number): never {
  const deno = (globalThis as { Deno?: { exit(code: number): never } }).Deno;
  if (deno) deno.exit(code);
  process.exit(code);
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(buf: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  const signed = new Uint8Array(4 + data.length);
  signed.set(typeBytes, 0);
  signed.set(data, 4);
  view.setUint32(8 + data.length, crc32(signed));
  return chunk;
}

function storedZlib(data: Uint8Array): Uint8Array {
  const header = new Uint8Array(5);
  header[0] = 1;
  header[1] = data.length & 0xff;
  header[2] = (data.length >> 8) & 0xff;
  const nlen = data.length ^ 0xffff;
  header[3] = nlen & 0xff;
  header[4] = (nlen >> 8) & 0xff;
  const out = new Uint8Array(2 + header.length + data.length + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  out.set(header, 2);
  out.set(data, 7);
  new DataView(out.buffer).setUint32(out.length - 4, adler32(data));
  return out;
}

/** PNG 16×16 RGB, quattro quadranti. Nessun file esterno. */
export function buildSyntheticPng(size = 16): Uint8Array {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, size);
  view.setUint32(4, size);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = new Uint8Array(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 3;
      const left = x < size / 2;
      const top = y < size / 2;
      raw[i] = left ? 220 : 30;
      raw[i + 1] = top ? 40 : 170;
      raw[i + 2] = left === top ? 50 : 210;
    }
  }
  return concat([
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", storedZlib(raw)),
    pngChunk("IEND", new Uint8Array()),
  ]);
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** PDF testuale di poche pagine, font standard, niente librerie. */
export function buildSyntheticPdf(pages: string[]): Uint8Array {
  const encoder = new TextEncoder();
  const objects = new Map<number, string>();
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const kids: number[] = [];
  let nextId = 4;
  for (const pageText of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    kids.push(pageId);
    const stream = `BT /F1 16 Tf 72 720 Td (${escapePdfText(pageText)}) Tj ET`;
    const length = encoder.encode(stream).length;
    objects.set(contentId, `<< /Length ${length} >>\nstream\n${stream}\nendstream`);
    objects.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`,
    );
  }
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${kids.map((id) => `${id} 0 R`).join(" ")}] >>`,
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  const count = nextId - 1;
  for (let id = 1; id <= count; id++) {
    offsets[id] = encoder.encode(pdf).length;
    pdf += `${id} 0 obj\n${objects.get(id)}\nendobj\n`;
  }
  const xref = encoder.encode(pdf).length;
  pdf += `xref\n0 ${count + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= count; id++) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return encoder.encode(pdf);
}

function redact(text: string, key: string): string {
  return key ? text.split(key).join("[redacted]") : text;
}

function snippet(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > 90 ? `${oneLine.slice(0, 90)}…` : oneLine;
}

async function callApi(
  url: string,
  key: string,
  body: unknown,
  timeoutMs: number,
): Promise<{ status: number; elapsedMs: number; json: unknown; raw: string }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "x-goog-api-key": key,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await resp.text();
    let json: unknown = null;
    try {
      json = JSON.parse(raw);
    } catch {
      json = null;
    }
    return { status: resp.status, elapsedMs: Date.now() - started, json, raw };
  } finally {
    clearTimeout(timer);
  }
}

function responseText(endpoint: Endpoint, json: unknown): string {
  const root = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  if (!root) return "";
  if (endpoint === "openai") {
    const choices = root.choices as { message?: { content?: unknown } }[] | undefined;
    const content = choices?.[0]?.message?.content;
    return typeof content === "string" ? content : "";
  }
  const candidates = root.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined;
  return candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
}

function buildBody(
  smoke: SmokeCase,
  model: string,
  pngB64: string,
  pdfB64: string,
): { url: string; body: unknown; timeoutMs: number } {
  const temperature = smoke.kind === "text" ? 0.4 : 0;
  const sampling = geminiChatSampling("gemini", model, temperature, smoke.fn, null);
  const timeoutMs = smoke.kind === "pdf" ? 90000 : 45000;

  if (smoke.endpoint === "openai") {
    const content =
      smoke.kind === "text"
        ? DIDACTIC_PROMPT
        : [
            { type: "text", text: smoke.kind === "image" ? IMAGE_PROMPT : PDF_PROMPT },
            smoke.kind === "image"
              ? { type: "image_url", image_url: { url: `data:image/png;base64,${pngB64}` } }
              : {
                  type: "file",
                  file: {
                    filename: "sintetico.pdf",
                    file_data: `data:application/pdf;base64,${pdfB64}`,
                  },
                },
          ];
    return {
      url: OPENAI_URL,
      timeoutMs,
      body: {
        model,
        messages: [{ role: "user", content }],
        max_tokens: smoke.kind === "text" ? 200 : 400,
        ...sampling,
      },
    };
  }

  const prompt = smoke.kind === "text" ? DIDACTIC_PROMPT : smoke.kind === "image" ? IMAGE_PROMPT : PDF_PROMPT;
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (smoke.kind === "image") {
    parts.push({ inline_data: { mime_type: "image/png", data: pngB64 } });
  } else if (smoke.kind === "pdf") {
    parts.push({ inline_data: { mime_type: "application/pdf", data: pdfB64 } });
  }
  return {
    url: `${NATIVE_URL}/${model}:generateContent`,
    timeoutMs,
    body: {
      contents: [{ role: "user", parts }],
      generationConfig: geminiNativeGenerationConfig({
        model,
        maxOutputTokens: smoke.kind === "text" ? 200 : 400,
        temperature,
        fn: smoke.fn,
      }),
    },
  };
}

function formatCount(value: number | null): string {
  return value === null ? "-" : String(value);
}

export async function runGeminiRedirectSmokeTest(): Promise<number> {
  const key = readTestKey();
  if (!key) {
    console.log("GEMINI_TEST_API_KEY assente: smoketest saltato.");
    return 0;
  }

  const png = buildSyntheticPng();
  const pdf = buildSyntheticPdf(PDF_PAGES);
  const pngB64 = bytesToBase64(png);
  const pdfB64 = bytesToBase64(pdf);
  const models = [GEMINI_MODEL_ROLLBACK, GEMINI_MODEL_DEFAULT];
  let failures = 0;

  console.log(`Asset sintetici: PNG ${png.length} byte, PDF ${pdf.length} byte, ${PDF_PAGES.length} pagine.`);
  console.log("Confronto in sequenza. La temperatura parte solo verso 2.5; su 3.5 c'è il livello di pensiero.");

  for (const model of models) {
    for (const smoke of CASES) {
      const label = `${smoke.endpoint} ${smoke.kind} ${model}`;
      const request = buildBody(smoke, model, pngB64, pdfB64);
      try {
        const result = await callApi(request.url, key, request.body, request.timeoutMs);
        const tokens = extractUsageTokens(result.json);
        const text = responseText(smoke.endpoint, result.json);
        const ok = result.status >= 200 && result.status < 300 && text.trim().length > 0;
        if (!ok) failures += 1;
        const perPage =
          smoke.kind === "pdf" && tokens.promptTokens !== null
            ? ` pagine=${PDF_PAGES.length} token/pagina=${(tokens.promptTokens / PDF_PAGES.length).toFixed(1)}`
            : "";
        console.log(
          `[${ok ? "ok" : "fail"}] ${label} status=${result.status} ${result.elapsedMs}ms in=${formatCount(tokens.promptTokens)} out=${formatCount(tokens.completionTokens)} thinking=${formatCount(tokens.reasoningTokens)} cached=${formatCount(tokens.cachedTokens)} total=${formatCount(tokens.totalTokens)}${perPage}`,
        );
        if (ok) {
          console.log(`       ${snippet(text)}`);
        } else {
          console.log(`       ${snippet(redact(result.raw, key))}`);
        }
      } catch (error) {
        failures += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.log(`[fail] ${label} ${snippet(redact(message, key))}`);
      }
    }
  }

  if (failures > 0) {
    console.log(`Smoketest chiuso con ${failures} chiamate non riuscite.`);
    return 1;
  }
  console.log("Smoketest chiuso: tutte le chiamate hanno risposto.");
  return 0;
}

function runningAsScript(): boolean {
  const meta = import.meta as { main?: boolean };
  if (meta.main === true) return true;
  const entry = typeof process !== "undefined" ? process.argv[1] : "";
  if (!entry) return false;
  const file = entry.split(/[/\\]/).pop();
  return Boolean(file) && import.meta.url.endsWith(`/${file}`);
}

if (runningAsScript()) {
  runGeminiRedirectSmokeTest()
    .then((code) => exitWith(code))
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Smoketest interrotto: ${message}`);
      exitWith(1);
    });
}
