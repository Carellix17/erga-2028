import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PlanTier } from "@/components/subscription/SubscriptionBadge";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const ENV: "sandbox" | "live" = clientToken?.startsWith("test_") ? "sandbox" : "live";

interface SubscriptionState {
  tier: PlanTier;
  isPro: boolean;
  isBetaTester: boolean;
  hasActiveSubscription: boolean;
  loading: boolean;
}

/**
 * Determina il tier dell'utente:
 * - "beta": è un beta tester (accesso Pro a vita come riconoscimento)
 * - "pro": ha un abbonamento attivo
 * - "free": nessun abbonamento attivo
 */
export function useSubscription(): SubscriptionState {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [state, setState] = useState<SubscriptionState>({
    tier: "free",
    isPro: false,
    isBetaTester: false,
    hasActiveSubscription: false,
    loading: true,
  });

  useEffect(() => {
    if (!userId) {
      setState({ tier: "free", isPro: false, isBetaTester: false, hasActiveSubscription: false, loading: false });
      return;
    }

    let cancelled = false;

    async function load() {
      const [profileRes, subRes] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("is_beta_tester")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("subscriptions")
          .select("status, current_period_end")
          .eq("user_id", userId)
          .eq("environment", ENV)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const isBetaTester = !!profileRes.data?.is_beta_tester;

      const sub = subRes.data;
      const hasActiveSubscription =
        !!sub &&
        ["active", "trialing"].includes(sub.status) &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

      const isPro = isBetaTester || hasActiveSubscription;
      const tier: PlanTier = isBetaTester ? "beta" : hasActiveSubscription ? "pro" : "free";

      setState({ tier, isPro, isBetaTester, hasActiveSubscription, loading: false });
    }

    load();

    // Realtime: aggiorna quando cambia l'abbonamento
    const channel = supabase
      .channel(`sub-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return state;
}
