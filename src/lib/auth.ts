import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Schema di validazione della password (minimo 8 caratteri)
export const passwordSchema = z
  .string()
  .min(8, "La password deve avere almeno 8 caratteri")
  .max(64, "La password deve avere massimo 64 caratteri");

export const DEFAULT_AFTER_LOGIN_PATH = "/app";

/**
 * Normalizza un'email per i confronti: trim + lowercase.
 * Le email di Google/GitHub sono case-insensitive; un confronto grezzo tra
 * `User@Domain.it` e `user@domain.it` farebbe fallire il recupero dei dati
 * legacy salvati sotto email.
 */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Valida un percorso interno (`next`) proveniente dall'URL.
 * - Accetta solo path che iniziano con "/" (esclude "//evil.com" e URL assoluti).
 * - Se mancante o non valido torna al percorso post-login predefinito.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_AFTER_LOGIN_PATH;
  if (!raw.startsWith("/")) return DEFAULT_AFTER_LOGIN_PATH;
  if (raw.startsWith("//")) return DEFAULT_AFTER_LOGIN_PATH;
  // Path assoluti come "/app/impostazioni" sono ok; blocchiamo i ".." che
  // tenterebbero di uscire dall'app.
  if (raw.split("/").includes("..")) return DEFAULT_AFTER_LOGIN_PATH;
  return raw;
}

/**
 * Costruisce l'URI a cui fare tornare il browser al termine dell'OAuth.
 * Usa una rotta dedicata (`/auth/callback`) che attende esplicitamente la
 * sessione prima di navigare, invece di atterrare direttamente sulla rotta
 * protetta (che potrebbe fare il "redirect al login" prima che la sessione
 * sia scritta nello storage).
 */
export function oauthCallbackUrl(nextPath: string, origin?: string): string {
  const base = origin ?? window.location.origin;
  const next = safeNextPath(nextPath);
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}

export interface LovableOAuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LovableOAuthResult {
  tokens?: LovableOAuthTokens;
  error?: Error | null;
  redirected?: boolean;
}

/**
 * Completa il login OAuth del broker Lovable in modo univoco per tutta l'app:
 * - se il broker ha già girato il browser (redirect) → nulla da fare;
 * - se il broker è tornato con i token (popup/preview via postMessage) →
 *   la sessione viene scritta nel client Supabase;
 * - ogni errore viene propagato al chiamante che può mostrarlo all'utente.
 *
 * Prima esisteva solo in `Login.tsx`: `Registrati.tsx` e `DemoFlow.tsx`
 * scartavano i token, lasciando l'utente "loggato a metà" (soprattutto in
 * anteprima Lovable, dove il flusso è via popup + postMessage).
 */
export async function completeOAuthSignIn(
  result: LovableOAuthResult,
  client: SupabaseClient = supabase,
): Promise<void> {
  if (result.error) throw result.error;
  if (result.redirected) return;
  if (!result.tokens?.access_token || !result.tokens?.refresh_token) {
    throw new Error("Nessun token ricevuto dal provider OAuth. Riprova.");
  }
  try {
    await client.auth.setSession({
      access_token: result.tokens.access_token,
      refresh_token: result.tokens.refresh_token,
    });
  } catch (error) {
    console.error("OAuth: impostazione sessione fallita", error);
    throw error instanceof Error
      ? error
      : new Error("Impossibile completare l'accesso. Riprova.");
  }
}
