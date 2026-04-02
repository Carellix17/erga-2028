import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export interface AuthResult {
  userId: string;
  isAuthenticated: boolean;
  userEmail?: string;
  // deno-lint-ignore no-explicit-any
  supabase: any;
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
      const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data, error } = await supabaseWithAuth.auth.getUser();

      if (!error && data?.user) {
        console.log(`Authenticated user: ${data.user.email || data.user.id}`);
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        return {
          userId: data.user.id,
          userEmail: data.user.email ?? undefined,
          isAuthenticated: true,
          supabase,
        };
      }
    }
  }

  throw new Error("Missing authentication");
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Create error response - always returns generic messages to clients
 */
export function errorResponse(message: string, status = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Create success response
 */
export function successResponse(data: unknown): Response {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
