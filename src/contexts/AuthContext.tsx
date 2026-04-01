import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: string | null;
  isLoading: boolean;
  isGoogleUser: boolean;
  session: Session | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSession(session);
    });

    syncSession().finally(() => {
      if (mounted) setTimeout(() => setIsLoading(false), 100);
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
  const currentUser = session?.user?.email ?? null;
  const isGoogleUser = session?.user?.app_metadata?.provider === "google";

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, currentUser, isLoading, isGoogleUser, session, logout }}
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
