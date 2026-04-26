import { supabase } from "@/integrations/supabase/client";

const TRANSIENT_STATUSES = new Set([429, 502, 503, 504]);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function edgeFetch<T = unknown>(
  fnName: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`;
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  };

  // Retry transient edge-runtime saturation (503/504) and rate-limits (429)
  // with exponential backoff: 250ms → 500ms → 1s → 2s.
  const maxAttempts = 4;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      let parsed: unknown = null;
      try { parsed = await res.json(); } catch { /* ignore */ }

      if (!res.ok) {
        if (TRANSIENT_STATUSES.has(res.status) && attempt < maxAttempts) {
          await sleep(250 * Math.pow(2, attempt - 1));
          continue;
        }
        const msg = (parsed && typeof parsed === "object" && "error" in parsed && typeof (parsed as { error?: unknown }).error === "string")
          ? (parsed as { error: string }).error
          : `Errore ${res.status}`;
        throw new Error(msg);
      }

      return parsed as T;
    } catch (err) {
      lastErr = err;
      // Network failure (e.g. "Failed to fetch") → retry too
      const isNetwork = err instanceof TypeError;
      if (isNetwork && attempt < maxAttempts) {
        await sleep(250 * Math.pow(2, attempt - 1));
        continue;
      }
      if (attempt >= maxAttempts) throw err;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Errore sconosciuto");
}