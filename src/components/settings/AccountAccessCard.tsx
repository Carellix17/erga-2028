import { useState } from "react";
import { Brain, Crown, KeyRound, LogOut, Mail, ShieldCheck, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionSheet } from "@/components/subscription/SubscriptionSheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Accesso e sicurezza.
 *
 * Questa scheda viveva dentro il Core; il Core ora contiene solo Esagono,
 * Materie e Routine, quindi email, cambio password e uscita sono state spostate
 * qui (Impostazioni → Generale) per non perdere l'unico punto di accesso a
 * queste funzioni.
 */
export function AccountAccessCard() {
  const { currentEmail, isGoogleUser, logout } = useAuth();
  const { tier } = useSubscription();
  const navigate = useNavigate();

  const [showSubscription, setShowSubscription] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const tierMeta = {
    free: { icon: Zap, label: "Free" },
    beta: { icon: Brain, label: "Beta" },
    pro: { icon: Crown, label: "Pro" },
  } as const;
  const TierIcon = tierMeta[tier].icon;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <section className="erga-settings-panel space-y-3 rounded-[24px] p-6" aria-labelledby="settings-access-title">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-5 h-5 text-foreground" aria-hidden="true" />
        <h2 id="settings-access-title" className="title-medium font-display text-foreground">
          Accesso e sicurezza
        </h2>
      </div>

      {/* Email dell'account (sola lettura) */}
      <div className="py-1">
        <div className="flex items-center gap-2.5">
          <Mail className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="label-small text-muted-foreground">Email dell'account</p>
            <p className="body-medium truncate text-foreground">{currentEmail ?? "Email non disponibile"}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSubscription(true)}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-[24px] px-3 text-sm"
          >
            <TierIcon className="w-3.5 h-3.5" aria-hidden="true" />
            {tierMeta[tier].label}
          </button>
        </div>
        <p className="body-small mt-2 text-muted-foreground">
          {isGoogleUser
            ? "Account collegato a Google: non serve una password di Erga."
            : "L'email identifica il tuo account e non si può cambiare da qui."}
        </p>
      </div>

      {/* Cambia password */}
      <button
        type="button"
        onClick={() => navigate("/cambia-password")}
        className="erga-list-item flex min-h-14 w-full items-center gap-3 rounded-[24px] px-3 text-left"
      >
        <KeyRound className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block body-medium font-semibold text-foreground">Cambia password</span>
          <span className="block body-small text-muted-foreground">Scegline una nuova in sicurezza</span>
        </span>
      </button>

      {/* Esci dall'account */}
      <button
        type="button"
        onClick={() => setConfirmLogout(true)}
        className="settings-danger flex min-h-14 w-full items-center gap-3 rounded-[24px] px-3 text-left"
      >
        <LogOut className="w-5 h-5 shrink-0 text-destructive" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block body-medium font-semibold text-destructive">Esci dall'account</span>
          <span className="block body-small text-muted-foreground">Dovrai accedere di nuovo</span>
        </span>
      </button>

      <SubscriptionSheet open={showSubscription} onOpenChange={setShowSubscription} currentTier={tier} />

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent className="rounded-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Uscire dall'account?</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler uscire? Dovrai effettuare di nuovo l'accesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-dialog">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="rounded-dialog">
              Esci
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
