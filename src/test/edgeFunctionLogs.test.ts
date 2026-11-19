import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { logRef } from "../../supabase/functions/_shared/logRef";

/**
 * I log delle edge function non devono scrivere identificativi che sono,
 * o sono stati, un'email: `email`, `user.email`, `userEmail`, `userId` /
 * `user_id` / `legacyUserId` usati per intero.
 *
 * `logRef(userId)` è ammesso: emette solo i primi 8 caratteri di un UUID
 * e "n/a" per un'email. La stessa forma vale per contextId, topicContextId
 * e attachId. Il testo dentro le stringhe ("welcome email") non è un
 * identificatore e non fa fallire il test.
 *
 * Falliscono anche fileName, filePath, file.name, recipient, errBody
 * e `.slice(` / `.substring(` sul contenuto.
 */

const FUNCTIONS = join(__dirname, "..", "..", "supabase", "functions");

const LOG_CALL = /\bconsole\.(?:log|error|warn|info|debug)\s*\(/g;

const FORBIDDEN = [
  { name: ".email", re: /\.email\b/ },
  { name: "userEmail", re: /\buserEmail\b/ },
  { name: "email", re: /\bemail\b/ },
  { name: "userId", re: /\buserId\b/ },
  { name: "user_id", re: /\buser_id\b/ },
  { name: "legacyUserId", re: /\blegacyUserId\b/ },
  { name: "fileName", re: /\bfileName\b/ },
  { name: "filePath", re: /\bfilePath\b/ },
  { name: "file.name", re: /\bfile\.name\b/ },
  { name: "recipient", re: /\brecipient\b/ },
  { name: "errBody", re: /\berrBody\b/ },
  { name: ".slice", re: /\.slice\s*\(/ },
  { name: ".substring", re: /\.substring\s*\(/ },
] as const;

const SAFE_LOG_REF_ARG =
  /^\s*(?:userId|user_id|legacyUserId|contextId|topicContextId|attachId|lessonId|(?:[A-Za-z_$][\w$]*\.)+(?:id|context_id))\s*$/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (name.endsWith(".ts")) out.push(path);
  }
  return out;
}

function endOfCall(source: string, openParen: number): number {
  let i = openParen + 1;
  let paren = 1;
  type Mode = "code" | "sq" | "dq" | "tpl";
  const modes: Mode[] = ["code"];
  const braces: number[] = [];

  while (i < source.length) {
    const mode = modes[modes.length - 1];
    const c = source[i];

    if (mode === "sq" || mode === "dq") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"')) modes.pop();
      i++;
      continue;
    }

    if (mode === "tpl") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "`") {
        modes.pop();
        i++;
        continue;
      }
      if (c === "$" && source[i + 1] === "{") {
        modes.push("code");
        braces.push(1);
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (c === "/" && source[i + 1] === "/") {
      const nl = source.indexOf("\n", i);
      i = nl < 0 ? source.length : nl + 1;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end < 0 ? source.length : end + 2;
      continue;
    }
    if (c === "'") {
      modes.push("sq");
      i++;
      continue;
    }
    if (c === '"') {
      modes.push("dq");
      i++;
      continue;
    }
    if (c === "`") {
      modes.push("tpl");
      i++;
      continue;
    }
    if (braces.length > 0) {
      if (c === "{") {
        braces[braces.length - 1]++;
        i++;
        continue;
      }
      if (c === "}") {
        braces[braces.length - 1]--;
        if (braces[braces.length - 1] === 0) {
          braces.pop();
          modes.pop();
        }
        i++;
        continue;
      }
    }
    if (c === "(") {
      paren++;
      i++;
      continue;
    }
    if (c === ")") {
      paren--;
      if (paren === 0) return i;
      i++;
      continue;
    }
    i++;
  }
  return -1;
}

function stripSafeLogRef(args: string): string {
  let out = "";
  let i = 0;
  while (i < args.length) {
    const idx = args.indexOf("logRef(", i);
    if (idx < 0) {
      out += args.slice(i);
      break;
    }
    const prev = idx > 0 ? args[idx - 1] : "";
    if (prev && /[A-Za-z0-9_$]/.test(prev)) {
      out += args.slice(i, idx + 6);
      i = idx + 6;
      continue;
    }
    const open = idx + "logRef".length;
    const close = endOfCall(args, open);
    if (close < 0) {
      out += args.slice(i);
      break;
    }
    const arg = args.slice(open + 1, close);
    if (SAFE_LOG_REF_ARG.test(arg)) {
      out += args.slice(i, idx);
      i = close + 1;
      continue;
    }
    out += args.slice(i, close + 1);
    i = close + 1;
  }
  return out;
}

/** Codice dell'argomento, senza stringhe e senza commenti. Le `${...}` restano. */
function visibleCode(source: string): string {
  let out = "";
  let i = 0;
  type Mode = "code" | "sq" | "dq" | "tpl";
  const modes: Mode[] = ["code"];
  const braces: number[] = [];

  while (i < source.length) {
    const mode = modes[modes.length - 1];
    const c = source[i];

    if (mode === "sq" || mode === "dq") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"')) modes.pop();
      i++;
      continue;
    }

    if (mode === "tpl") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "`") {
        modes.pop();
        i++;
        continue;
      }
      if (c === "$" && source[i + 1] === "{") {
        modes.push("code");
        braces.push(1);
        i += 2;
        continue;
      }
      i++;
      continue;
    }

    if (c === "/" && source[i + 1] === "/") {
      const nl = source.indexOf("\n", i);
      i = nl < 0 ? source.length : nl + 1;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end < 0 ? source.length : end + 2;
      continue;
    }
    if (c === "'") {
      modes.push("sq");
      i++;
      continue;
    }
    if (c === '"') {
      modes.push("dq");
      i++;
      continue;
    }
    if (c === "`") {
      modes.push("tpl");
      i++;
      continue;
    }
    if (braces.length > 0 && (c === "{" || c === "}")) {
      if (c === "{") braces[braces.length - 1]++;
      else {
        braces[braces.length - 1]--;
        if (braces[braces.length - 1] === 0) {
          braces.pop();
          modes.pop();
        }
      }
      out += c;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

export function personalDataInLog(args: string): string | null {
  const code = visibleCode(stripSafeLogRef(args));
  for (const rule of FORBIDDEN) {
    if (rule.re.test(code)) return rule.name;
  }
  return null;
}

export function logViolations(source: string): { line: number; identifier: string }[] {
  const found: { line: number; identifier: string }[] = [];
  LOG_CALL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LOG_CALL.exec(source))) {
    const open = match.index + match[0].length - 1;
    const close = endOfCall(source, open);
    if (close < 0) continue;
    const identifier = personalDataInLog(source.slice(open + 1, close));
    if (identifier) {
      const line = source.slice(0, match.index).split("\n").length;
      found.push({ line, identifier });
    }
    LOG_CALL.lastIndex = close + 1;
  }
  return found;
}

describe("log delle edge function senza dati personali", () => {
  it("logRef tiene solo 8 caratteri di UUID e non fa uscire un'email", () => {
    expect(logRef("123e4567-e89b-12d3-a456-426614174000")).toBe("123e4567");
    expect(logRef(" 123E4567-E89B-12D3-A456-426614174000 ")).toBe("123E4567");
    expect(logRef("studente@scuola.it")).toBe("n/a");
    expect(logRef("studente@scuola.it".slice(0, 8))).toBe("n/a");
    expect(logRef("")).toBe("n/a");
    expect(logRef(null)).toBe("n/a");
    expect(logRef(undefined)).toBe("n/a");
  });

  it("ignora la parola email nelle stringhe e accetta logRef su un UUID", () => {
    expect(personalDataInLog("'Failed to check sent welcome email', { code: errorCode(lookupError) }")).toBeNull();
    expect(personalDataInLog("`Generate lessons for user ${logRef(userId)}`")).toBeNull();
    expect(personalDataInLog("`Authenticated user for upload: ${logRef(data.user.id)}`")).toBeNull();
    expect(personalDataInLog('"legacy row found by email for", logRef(userId)')).toBeNull();
  });

  it("segnala email, user.email, userEmail e uno user id che può essere un'email", () => {
    expect(personalDataInLog("email")).toBe("email");
    expect(personalDataInLog("data.user.email || data.user.id")).toBe(".email");
    expect(personalDataInLog("userEmail")).toBe("userEmail");
    expect(personalDataInLog("`user: ${userId} (legacy: ${legacyUserId})`")).toBe("userId");
    expect(personalDataInLog("`legacy: ${legacyUserId}`")).toBe("legacyUserId");
    expect(personalDataInLog("user_id")).toBe("user_id");
    expect(personalDataInLog("logRef(user.email)")).toBe(".email");
    expect(personalDataInLog("userId.slice(0, 8)")).toBe("userId");
  });

  it("segna file, destinatario, corpo errore e lo slice del contenuto", () => {
    expect(personalDataInLog("fileName")).toBe("fileName");
    expect(personalDataInLog("`Registering PDF upload: ${fileName}`")).toBe("fileName");
    expect(personalDataInLog("filePath")).toBe("filePath");
    expect(personalDataInLog("`uploaded: ${filePath}`")).toBe("filePath");
    expect(personalDataInLog("recipient")).toBe("recipient");
    expect(personalDataInLog("redactEmail(recipient)")).toBe("recipient");
    expect(personalDataInLog("errBody")).toBe("errBody");
    expect(personalDataInLog("errBody.substring(0, 200)")).toBe("errBody");
    expect(personalDataInLog("file.name")).toBe("file.name");
    expect(personalDataInLog("`Uploading ${file.name}`")).toBe("file.name");
    expect(personalDataInLog("content.slice(0, 500)")).toBe(".slice");
    expect(personalDataInLog("raw.slice(0, 400)")).toBe(".slice");
    expect(personalDataInLog("content.substring(0, 300)")).toBe(".substring");
  });

  it("accetta logRef(userId) e la stringa welcome email", () => {
    expect(personalDataInLog("`Generate lessons for user ${logRef(userId)}`")).toBeNull();
    expect(personalDataInLog("'Failed to check sent welcome email', { code: errorCode(lookupError) }")).toBeNull();
    expect(personalDataInLog("`context ${logRef(contextId)} topic ${logRef(topicContextId)} file ${logRef(attachId)}`")).toBeNull();
    expect(personalDataInLog('"AI lesson response length:", content.length')).toBeNull();
  });

  it("nessun console.log/error/warn/info/debug in supabase/functions scrive quegli identificatori", () => {
    const problems: string[] = [];
    for (const file of walk(FUNCTIONS)) {
      const source = readFileSync(file, "utf8");
      for (const hit of logViolations(source)) {
        const rel = file.slice(FUNCTIONS.length + 1);
        problems.push(`${rel}:${hit.line} (${hit.identifier})`);
      }
    }
    expect(problems).toEqual([]);
  });
});
