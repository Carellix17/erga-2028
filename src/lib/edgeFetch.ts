import { supabase } from "@/integrations/supabase/client";

export async function edgeFetch<T = unknown>(
  fnName: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    }
  );

  let parsed: unknown = null;
  try { parsed = await res.json(); } catch { /* ignore */ }

  if (!res.ok) {
    const msg = (parsed && typeof parsed === "object" && "error" in parsed && typeof (parsed as { error?: unknown }).error === "string")
      ? (parsed as { error: string }).error
      : `Errore ${res.status}`;
    throw new Error(msg);
  }

  return parsed as T;
}