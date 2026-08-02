import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader } from "https://esm.sh/jose@5.9.6";

// ============================================================
// CORS con lista dei domini autorizzati (allowlist)
// ------------------------------------------------------------
// Prima: "Access-Control-Allow-Origin: *" => QUALUNQUE sito web poteva
// leggere le risposte delle nostre API dal browser di un visitatore.
// Ora rispondiamo solo a richieste provenienti da:
//   - il dominio ufficiale dell'app (produzione)
//   - gli ambienti di anteprima Lovable (*.lovable.app / *.lovableproject.com)
//   - localhost / 127.0.0.1 (sviluppo in locale)
//   - capacitor://localhost (eventuale futura app nativa)
// Le chiamate server-to-server (webhook Paddle, client MCP, script)
// non inviano l'header Origin e NON sono influenzate dal CORS.
// ============================================================

const PRIMARY_ORIGIN = "https://erga-demo.lovable.app";

const ALLOWED_ORIGINS_EXACT = new Set([
  PRIMARY_ORIGIN,
  "capacitor://localhost", // iOS (Capacitor)
]);

const ALLOWED_HOST_SUFFIXES = [".lovable.app", ".lovableproject.com"];
const ALLOWED_LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

/**
 * Restituisce l'origine se e' autorizzata a chiamare le API, altrimenti null.
 */
export function resolveAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  if (ALLOWED_ORIGINS_EXACT.has(origin)) return origin;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname;
    if (ALLOWED_LOCAL_HOSTNAMES.has(host)) return origin;
    if (ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) return origin;
    return null;
  } catch {
    return null;
  }
}

const ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

/**
 * Header CORS completi per un'origine: se l'origine non e' autorizzata,
 * l'header Access-Control-Allow-Origin non viene incluso (il browser
 * blocchera' la richiesta).
 */
export function corsHeadersFor(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    Vary: "Origin",
  };
  const allowed = resolveAllowedOrigin(origin);
  if (allowed) headers["Access-Control-Allow-Origin"] = allowed;
  return headers;
}

/**
 * withCors avvolge l'handler di una Edge Function e:
 *  1. risponde automaticamente alle richieste preflight OPTIONS;
 *  2. applica gli header CORS corretti a OGNI risposta (ok o errore),
 *     eliminando un eventuale "*" residuo.
 * Uso:  serve(withCors(async (req) => { ... }))
 */
export function withCors(
  handler: (req: Request) => Promise<Response> | Response,
) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeadersFor(origin) });
    }
    const res = await handler(req);
    res.headers.delete("Access-Control-Allow-Origin");
    const allowed = resolveAllowedOrigin(origin);
    if (allowed) res.headers.set("Access-Control-Allow-Origin", allowed);
    res.headers.append("Vary", "Origin");
    return res;
  };
}

export interface AuthResult {
  userId: string;
  isAuthenticated: boolean;
  userEmail?: string;
  // deno-lint-ignore no-explicit-any
  supabase: any;
}

// Cache the remote JWKS resolver in module scope (per isolate).
// jose handles HTTP caching + key rotation automatically.
let jwksResolver: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwksResolver) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    jwksResolver = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
    );
  }
  return jwksResolver;
}

interface JwtPayload {
  sub?: string;
  email?: string;
  exp?: number;
}

/**
 * Verify a Supabase JWT locally using the JWKS public keys.
 * This avoids GoTrue server calls (which can fail with session_not_found
 * even when the JWT itself is still valid and unexpired).
 */
async function verifyJwtLocally(token: string): Promise<JwtPayload | null> {
  try {
    const header = decodeProtectedHeader(token);
    // Legacy HS256 tokens cannot be verified with JWKS — fall back to caller
    if (header.alg === "HS256") return null;
    const { payload } = await jwtVerify(token, getJwks());
    return payload as JwtPayload;
  } catch (e) {
    console.error("Local JWT verify failed:", (e as Error).message);
    return null;
  }
}

/**
 * Validates the request and returns authenticated user information.
 * Requires a valid JWT token in the Authorization header.
 */
export async function validateAuth(
  req: Request,
  _requestBody?: { userId?: string }
): Promise<AuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");

    // Skip if it's just the anon key (not a user token)
    if (token !== supabaseAnonKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // 1) Try LOCAL JWKS verification first (fast + does not depend on
      //    the GoTrue session existing). This is what fixes the
      //    "session_not_found" 403s we were seeing in auth logs.
      const payload = await verifyJwtLocally(token);
      if (payload?.sub) {
        return {
          userId: payload.sub,
          userEmail: payload.email,
          isAuthenticated: true,
          supabase: supabaseAdmin,
        };
      }

      // 2) Fallback: legacy HS256 tokens or missing JWKS — ask GoTrue.
      try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && data?.user) {
          return {
            userId: data.user.id,
            userEmail: data.user.email ?? undefined,
            isAuthenticated: true,
            supabase: supabaseAdmin,
          };
        }
        console.error("auth.getUser fallback failed:", error?.message);
      } catch (e) {
        console.error("auth.getUser threw:", (e as Error).message);
      }
    }
  }

  throw new Error("Missing authentication");
}

/**
 * Create unauthorized response.
 * Nota: gli header CORS vengono aggiunti dal wrapper withCors che
 * avvolge ogni handler, quindi qui serve solo il Content-Type.
 */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Create error response - always returns generic messages to clients
 */
export function errorResponse(message: string, status = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Create success response
 */
export function successResponse(data: unknown): Response {
  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } }
  );
}
