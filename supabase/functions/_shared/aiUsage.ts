/**
 * Traccia fire-and-forget di ogni tentativo di chiamata AI su public.ai_usage.
 *
 * Regole:
 *  - non blocca mai il chiamante (nessun await sul risultato)
 *  - non lancia mai: ogni errore di log viene ignorato
 *  - scrive una riga per OGNI tentativo, sia riuscito sia fallito
 */

export interface AiUsageRow {
  fn?: string | null;
  provider?: string | null;
  model?: string | null;
  ok: boolean;
  status?: number | null;
  userId?: string | null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function logAiUsage(row: AiUsageRow): void {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return;

    const userId =
      row.userId && UUID_RE.test(row.userId) ? row.userId : null;

    fetch(`${url}/rest/v1/ai_usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId,
        fn: row.fn ?? null,
        provider: row.provider ?? null,
        model: row.model ?? null,
        ok: row.ok,
        status: row.status ?? null,
      }),
    })
      .then(() => {})
      .catch(() => {});
  } catch {
    // il logging non deve mai interferire con la chiamata AI
  }
}
