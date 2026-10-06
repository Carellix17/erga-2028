import { useState } from "react";
import { Crown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useHaptics } from "@/hooks/useHaptics";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { openCustomerPortal } from "@/lib/paddle";
import { toast } from "sonner";

/**
 * SettingsPlanCard — la carta del piano nelle Impostazioni (decisione del
 * proprietario, 6 ottobre 2026).
 *
 * Parla la lingua delle card dei corsi: campo colorato (cedro, DESIGN.md
 * 2.1 §4) con una forma netta e la grana condivisa, raggio protagonista,
 * nome del piano in serif Lora. Sotto, una riga di stato; per gli utenti
 * Free l'azione «Passa a Pro» — che apre il pagamento di Erga Pro.
 *
 * La carta non dipende dal tema, come le copertine: il campo è cedro con
 * inchiostro #252623 anche di notte (contrasto ≈ 12:1, verificato dalla
 * famiglia light di courseIdentity).
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
      <article className="relative w-full overflow-hidden rounded-hero border border-border shadow-level-3">
        {/* 1) CAMPO — cedro (DESIGN.md 2.1 §4), come il campo materia delle copertine. */}
        <div className="absolute inset-0" style={{ backgroundColor: "hsl(var(--cedro))" }} />

        {/* 2) FORME — poche e nette, grammatica delle copertine dei corsi. */}
        <div
          className="absolute -right-[18%] -top-[46%] aspect-square w-[68%] rounded-full"
          style={{ backgroundColor: "hsl(var(--ink) / 0.08)" }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-[16%] left-[7%] aspect-square w-[7%] min-w-[14px] rounded-full"
          style={{ backgroundColor: "hsl(var(--ink) / 0.16)" }}
          aria-hidden="true"
        />

        {/* 3) GRANA — la stessa, condivisa, sotto il contenuto. */}
        <div className="cover-grain absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 p-5 text-left sm:p-6">
          <p
            className="text-[13px] font-medium leading-none tracking-[0.08em]"
            style={{ color: "hsl(var(--ink) / 0.72)" }}
          >
            {t("settings.plan.eyebrow")}
          </p>
          <h2
            className="mt-1.5 break-words font-display text-[1.75rem] font-medium leading-[1.12] tracking-[-0.01em] sm:text-3xl"
            style={{ color: "hsl(var(--ink))" }}
          >
            {planName}
          </h2>
          <p className="mt-1 text-sm leading-snug" style={{ color: "hsl(var(--ink) / 0.72)" }}>
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
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-primary text-[15px] font-semibold text-primary-foreground transition-transform duration-150 ease-m3-emphasized active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              className="mt-5 flex h-12 w-full items-center justify-center rounded-pill border border-foreground/30 text-[15px] font-semibold transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ color: "hsl(var(--ink))" }}
            >
              Gestisci abbonamento
            </button>
          )}
        </div>
      </article>

    </section>
  );
}
