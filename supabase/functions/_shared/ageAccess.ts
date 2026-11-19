/**
 * Lettura server dell'esito età. Non riceve e non registra la data di nascita.
 * Se il database non risponde, l'accesso all'IA è rifiutato.
 */

import { aiAccessDecision, isLegacyUnder14 } from "./ageCheck.ts";

type Row = Record<string, unknown> | null;

interface MaybeSingle {
  maybeSingle(): Promise<{ data: Row; error: { message?: string } | null }>;
}

export interface AgeReadClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): MaybeSingle;
      ilike(column: string, value: string): MaybeSingle;
    };
  };
}

export interface AgeFacts {
  legacyUnder14: boolean;
  gate: { is_14_plus: boolean; is_under_18: boolean; parent_ack: boolean | null } | null;
}

const AGE_DENIED_MESSAGE = "Per usare Erga serve avere almeno 14 anni e aver completato il controllo dell'età.";

function literalIlike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => "\\" + match);
}

async function readRow(
  supabase: AgeReadClient,
  table: string,
  columns: string,
  userId: string,
  verifiedEmail: string | null,
): Promise<Row | "error"> {
  const own = await supabase.from(table).select(columns).eq("user_id", userId).maybeSingle();
  if (own.error) return "error";
  if (own.data || !verifiedEmail) return own.data;
  const legacy = await supabase
    .from(table)
    .select(columns)
    .ilike("user_id", literalIlike(verifiedEmail))
    .maybeSingle();
  if (legacy.error) return "error";
  return legacy.data;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function loadAgeFacts(
  supabase: AgeReadClient,
  userId: string,
  verifiedEmail?: string | null,
): Promise<AgeFacts | "error"> {
  const email = verifiedEmail?.trim().toLowerCase() || null;
  // La tabella esito usa l'uuid di auth. Un id legacy (email) non ha riga:
  // non è un errore di database, è un controllo non superato.
  const gateRow = isUuid(userId)
    ? await readRow(
      supabase,
      "user_age_checks",
      "is_14_plus, is_under_18, parent_ack",
      userId,
      null,
    )
    : null;
  const profile = await readRow(supabase, "user_profiles", "age", userId, email);
  const cognitive = await readRow(supabase, "cognitive_profiles", "eta", userId, email);
  if (gateRow === "error" || profile === "error" || cognitive === "error") return "error";

  const gate = gateRow
    ? {
        is_14_plus: gateRow.is_14_plus === true,
        is_under_18: gateRow.is_under_18 === true,
        parent_ack: gateRow.parent_ack === true ? true : null,
      }
    : null;

  return {
    legacyUnder14: isLegacyUnder14(profile?.age, cognitive?.eta),
    gate,
  };
}

/** Null se la chiamata all'IA può proseguire. Altrimenti la risposta da restituire. */
export async function assertAiAgeAllowed(
  supabase: AgeReadClient,
  userId: string,
  verifiedEmail?: string | null,
): Promise<Response | null> {
  const facts = await loadAgeFacts(supabase, userId, verifiedEmail);
  if (facts === "error") {
    return new Response(JSON.stringify({ error: "Controllo età non disponibile. Riprova." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const decision = aiAccessDecision({ gate: facts.gate, legacyUnder14: facts.legacyUnder14 });
  if (decision.allowed) return null;
  return new Response(JSON.stringify({ error: AGE_DENIED_MESSAGE, code: decision.code }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
