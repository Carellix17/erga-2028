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
 * Card avorio, come Home. Le azioni e il flusso di pagamento restano invariati.
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
      <article className="erga-settings-panel w-full rounded-[24px] p-6 text-left">
          <p className="text-sm leading-none text-[#3a3f45]">
            {t("settings.plan.eyebrow")}
          </p>
          <h2 className="mt-2 break-words font-display text-[1.75rem] leading-[1.12] tracking-[-0.02em] text-[#0a0a0a] sm:text-3xl">
            {planName}
          </h2>
          <p className="mt-2 text-base leading-snug text-[#3a3f45]">
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
              className="settings-ink mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-[24px] px-5 text-base active:scale-[0.98] motion-reduce:transform-none disabled:pointer-events-none disabled:opacity-50"
            >
              <Crown className="h-4 w-4 shrink-0" strokeWidth={1.9} aria-hidden="true" />
              {t("settings.plan.upgrade")}, 4,99 €/mese
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
              className="mt-6 flex h-12 w-full items-center justify-center rounded-[24px] px-5 text-base active:scale-[0.98] motion-reduce:transform-none disabled:pointer-events-none disabled:opacity-50"
            >
              Gestisci abbonamento
            </button>
          )}
      </article>

    </section>
  );
}
