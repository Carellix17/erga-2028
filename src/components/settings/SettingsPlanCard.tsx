import { useState } from "react";
import { Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/useHaptics";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { openCustomerPortal } from "@/lib/paddle";
import { toast } from "sonner";

/**
 * SettingsPlanCard — carta informativa del piano nelle Impostazioni.
 *
 * Usa la superficie standard del sistema v3 (Olive Drab/Bone e varianti
 * giorno-notte). Le azioni e il flusso di pagamento restano invariati.
 */
export function SettingsPlanCard() {
  const { t } = useTranslation();
  const { tier } = useSubscription();
  const { triggerLight } = useHaptics();
  const { openCheckout, loading } = usePaddleCheckout();
  const [portalLoading, setPortalLoading] = useState(false);

  const planName = tier === "beta" ? "Beta" : tier === "pro" ? "Pro" : "Free";
  const isFree = tier === "free";

  const noteKey =
    tier === "free"
      ? "settings.plan.freeNote"
      : tier === "beta"
        ? "settings.plan.betaNote"
        : "settings.plan.proNote";

  return (
    <section aria-label={t("settings.plan.eyebrow")}>
      <article className="w-full rounded-card border border-border bg-card text-card-foreground shadow-level-1">
        <div className="p-5 text-left sm:p-6">
          <p className="text-[13px] font-medium leading-none tracking-[0.08em] text-muted-foreground">
            {t("settings.plan.eyebrow")}
          </p>
          <h2 className="mt-1.5 break-words font-display text-[1.75rem] font-medium leading-[1.12] tracking-[-0.01em] text-foreground sm:text-3xl">
            {planName}
          </h2>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {t(noteKey)}
          </p>

          {isFree && (
            <button
              type="button"
              onClick={() => {
                triggerLight();
                openCheckout("pro_monthly").catch(() =>
                  toast.error("Impossibile aprire il pagamento. Riprova."),
                );
              }}
              disabled={loading}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-button bg-primary px-5 text-interface font-semibold text-primary-foreground transition-colors duration-150 ease-m3-emphasized hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <Crown className="h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
              {t("settings.plan.upgrade")} · 4,99 €/mese
            </button>
          )}

          {tier === "pro" && (
            <button
              type="button"
              disabled={portalLoading}
              onClick={async () => {
                setPortalLoading(true);
                try {
                  await openCustomerPortal();
                } catch {
                  toast.error("Impossibile aprire la gestione abbonamento. Riprova.");
                } finally {
                  setPortalLoading(false);
                }
              }}
              className="mt-5 flex h-11 w-full items-center justify-center rounded-button border border-border bg-secondary px-5 text-interface font-semibold text-secondary-foreground transition-colors duration-150 hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Gestisci abbonamento
            </button>
          )}
        </div>
      </article>

    </section>
  );
}
