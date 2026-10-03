/**
 * 🧭 PERCORSI 2.0 — di che materia è questo percorso? (lato client)
 *
 * Legge dal backend (get-lessons, azione listContexts) la famiglia di
 * materia e i titoli dei moduli del percorso attivo, con un piccolo cache
 * in memoria per non rifare la chiamata a ogni tab. Usato da PraticaView
 * per mostrare la Palestra solo per matematica, fisica e chimica.
 */

import { supabase } from "@/integrations/supabase/client";

export interface ContextSubjectInfo {
  subject_family: string | null;
  subject: string | null;
  module_titles: string[] | null;
}

const cache = new Map<string, ContextSubjectInfo>();

export async function fetchContextSubjectInfo(contextId: string): Promise<ContextSubjectInfo> {
  const hit = cache.get(contextId);
  if (hit) return hit;

  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { user } } = await supabase.auth.getUser();
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ userId: user?.id, action: "listContexts" }),
  });
  if (!response.ok) throw new Error("Impossibile leggere i percorsi");
  const data = await response.json();
  const ctx = (data.contexts as Array<Record<string, unknown>> | undefined)?.find((c) => c.id === contextId);
  const info: ContextSubjectInfo = {
    subject_family: (ctx?.subject_family as string | null) ?? null,
    subject: (ctx?.subject as string | null) ?? null,
    module_titles: Array.isArray(ctx?.module_titles) ? (ctx.module_titles as string[]) : null,
  };
  cache.set(contextId, info);
  return info;
}
