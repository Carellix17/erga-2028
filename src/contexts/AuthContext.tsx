import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

async function sendWelcomeEmail(userId: string, email: string, name?: string) {
  try {
    await supabase.functions.invoke("send-welcome-email", {
      body: { name },
    });
  } catch {
    // La welcome email non deve bloccare l'autenticazione o esporre dati nei log.
    console.error("Auth: invio welcome email fallito");
  }
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: string | null;
  currentEmail: string | null;
  isLoading: boolean;
  isGoogleUser: boolean;
  session: Session | null;
  /** Messaggio di eventuale errore nella lettura/ripristino della sessione. */
  authError: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // ⏱️ Nessuna attesa indefinita: se il cloud non risponde entro 2s, l'avvio
  // prosegue lo stesso (l'eventuale sessione arriverà da onAuthStateChange).
  const SESSION_TIMEOUT_MS = 2000;

  const syncSession = useCallback(async () => {
    try {
      const pending = supabase.auth.getSession();
      // Anche se scade il tempo, la lettura continua: quando arriva la
      // applichiamo comunque, così una sessione valida non va persa.
      pending
        .then(({ data }) => {
          setSession(data.session);
          setAuthError(null);
        })
        .catch(() => {});

      const result = await Promise.race([
        pending,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), SESSION_TIMEOUT_MS)),
      ]);
      if (result === null) {
        console.warn("Auth: lettura sessione oltre il tempo massimo, avvio sbloccato");
        return;
      }
      setSession(result.data.session);
      setAuthError(null);
    } catch (e) {
      console.error("Auth: lettura sessione fallita", e);
      setSession(null);
      setAuthError(e instanceof Error ? e.message : "Impossibile leggere la sessione.");
    }
  }, []);


  const welcomeSentForSession = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Solo assegnazione sincrona di stato: nessuna query qui dentro,
      // altrimenti si blocca il thread di autenticazione.
      if (!mounted) return;
      setSession(session);
      setIsLoading(false);

      // Invia la welcome email solo per un account appena creato. Il ref evita
      // duplicati nella pagina corrente; localStorage ricorda l'invio tra mount
      // e ricaricamenti, senza salvare email o altri dati personali.
      const user = session?.user;
      if (event !== "SIGNED_IN" || !user?.email) return;

      const now = Date.now();
      const createdAt = Date.parse(user.created_at);
      const accountAge = now - createdAt;
      if (!Number.isFinite(createdAt) || accountAge < 0 || accountAge > 10 * 60 * 1000) return;

      const welcomeStorageKey = `erga:welcome:${user.id}`;
      let alreadyWelcomed = false;
      try {
        alreadyWelcomed = localStorage.getItem(welcomeStorageKey) !== null;
      } catch {
        // Storage non disponibile: il ref conserva comunque la protezione in memoria.
      }
      if (alreadyWelcomed || welcomeSentForSession.current === user.id) return;

      welcomeSentForSession.current = user.id;
      const name = user.user_metadata?.name || user.user_metadata?.full_name;
      void sendWelcomeEmail(user.id, user.email, typeof name === "string" ? name : undefined);
      try {
        localStorage.setItem(welcomeStorageKey, "sent");
      } catch {
        // La welcome email non deve bloccare l'autenticazione se storage non è disponibile.
      }
    });

    syncSession().finally(() => {
      if (mounted) setIsLoading(false);
    });

    const handleAppResume = () => {
      if (document.visibilityState === "visible") {
        syncSession().catch(console.error);
      }
    };

    window.addEventListener("focus", handleAppResume);
    document.addEventListener("visibilitychange", handleAppResume);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", handleAppResume);
      document.removeEventListener("visibilitychange", handleAppResume);
    };
  }, [syncSession]);


  const isAuthenticated = !!session;
  const currentUser = session?.user?.id ?? null;
  const currentEmail = session?.user?.email ?? null;
  const isGoogleUser = session?.user?.app_metadata?.provider === "google";

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        currentEmail,
        isLoading,
        isGoogleUser,
        session,
        authError,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
