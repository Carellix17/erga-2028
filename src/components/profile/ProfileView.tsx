import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Camera, UserCircle2, Hexagon, LogOut, Settings, Crown, Zap, Brain, Loader2 } from "lucide-react";
import { useCognitiveProfile } from "@/hooks/useCognitiveProfile";
import { CognitiveRadar } from "@/components/core/CognitiveRadar";
import { useProfileData } from "@/hooks/useProfileData";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionSheet } from "@/components/subscription/SubscriptionSheet";
import { useNavigate } from "react-router-dom";
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

interface ProfileViewProps {
  onOpenCognitive?: () => void;
}

/**
 * ProfileView — la pagina profilo dello studente (ripristinata).
 *
 * In alto a destra: uscita e Impostazioni (proprio come prima). Sotto, i dati
 * reali dell'account (avatar, nome, piano) e l'Esagono Cognitivo con la sua
 * scheda riepilogativa. La modifica dei dati personali vive in Impostazioni →
 * Generale; qui l'avatar si può cambiare con un tocco.
 */
export function ProfileView({ onOpenCognitive }: ProfileViewProps = {}) {
  const { profile: cognitive } = useCognitiveProfile();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { tier } = useSubscription();
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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/app");
    }
  };

  // Solo avatar + nome visibile: la modifica dei dati è in Impostazioni → Generale
  const {
    fileInputRef,
    firstName,
    nickname,
    avatarPreview,
    isUploadingAvatar,
    isLoading,
    handleAvatarChange,
  } = useProfileData();

  if (isLoading) {
    return (
      <div className="px-4 pt-4 pb-12 space-y-6 max-w-lg mx-auto animate-fade-up">
        <div className="flex items-center justify-between">
          <Skeleton className="h-11 w-11 rounded-pill" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-11 w-11 rounded-pill" />
            <Skeleton className="h-11 w-11 rounded-pill" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 py-4">
          <Skeleton className="w-24 h-24 rounded-media" />
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-4 w-56 rounded-full" />
        </div>
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-12 space-y-6 max-w-lg mx-auto animate-fade-up">
      {/* Header: indietro a sinistra, uscita e Impostazioni in alto a destra */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Indietro"
          onClick={handleBack}
          className="h-11 w-11 shrink-0 rounded-pill"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Esci dall'account"
            onClick={() => setConfirmLogout(true)}
            className="h-11 w-11 shrink-0 rounded-pill text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Impostazioni"
            onClick={() => navigate("/app/impostazioni")}
            className="h-11 w-11 shrink-0 rounded-pill"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Avatar & Name Header + piccolo badge abbonamento sotto il nome */}
      <div className="flex flex-col items-center gap-4 pt-2 pb-4">
        <div className="relative">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            aria-label="Cambia foto profilo"
            className="w-24 h-24 rounded-media overflow-hidden bg-primary-container flex items-center justify-center shadow-level-2 transition-all duration-200 ease-m3-emphasized active:scale-95 relative group"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Foto profilo utente" className="w-full h-full object-cover" />
            ) : (
              <UserCircle2 className="w-12 h-12 text-primary" aria-hidden="true" />
            )}
            <div className="absolute inset-0 bg-foreground/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isUploadingAvatar ? (
                <Loader2 className="w-6 h-6 text-off-white animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="w-6 h-6 text-off-white" aria-hidden="true" />
              )}
            </div>
          </button>
        </div>
        <div className="text-center">
          <h1 className="title-large font-display font-bold text-foreground">
            {nickname || firstName || "Il tuo profilo"}
          </h1>
          <p className="body-medium text-muted-foreground">Personalizza la tua esperienza di studio</p>
          {/* Piccolo blocco piano abbonamento sotto il nome */}
          <button
            onClick={() => setShowSubscription(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-primary-container text-primary text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <TierIcon className="w-3.5 h-3.5" aria-hidden="true" />
            {tierMeta[tier].label}
          </button>
        </div>
      </div>

      {/* Esagono Cognitivo */}
      <div className="rounded-card bg-card border border-outline-variant/60 shadow-level-1 transition-colors duration-200 hover:bg-surface-container-low p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Hexagon className="w-5 h-5 text-foreground" aria-hidden="true" />
          <h2 className="title-medium font-display text-foreground">Esagono Cognitivo</h2>
        </div>
        {cognitive ? (
          <>
            <CognitiveRadar profile={cognitive} />
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {[
                ["Logica", cognitive.log_score],
                ["Memoria", cognitive.mem_score],
                ["Focus", cognitive.foc_score],
                ["Lessico", cognitive.voc_score],
                ["Calma", cognitive.ans_score],
                ["Pratica", cognitive.app_score],
              ].map(([label, val]) => (
                <div key={label as string} className="rounded-button bg-surface-container-high py-2 text-center">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
                  <div className="text-base font-bold text-foreground tabular-nums">{val}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="body-small text-muted-foreground">Non hai ancora calcolato il tuo Esagono Cognitivo.</p>
        )}
        <Button
          onClick={onOpenCognitive}
          variant="outline"
          className="w-full rounded-button h-12 border border-outline-variant/60 bg-card hover:bg-surface-container-high shadow-level-1 transition-all duration-300"
        >
          <Brain className="w-4 h-4 mr-2 text-foreground" aria-hidden="true" />
          {cognitive ? "Ricalcola il tuo Esagono Cognitivo" : "Calcola il tuo Esagono Cognitivo"}
        </Button>
      </div>

      <SubscriptionSheet open={showSubscription} onOpenChange={setShowSubscription} currentTier={tier} />

      {/* Conferma logout */}
      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent className="rounded-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Uscire dall'account?</AlertDialogTitle>
            <AlertDialogDescription>Sei sicuro di voler uscire? Dovrai effettuare di nuovo l'accesso.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-dialog">Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="rounded-dialog">
              Esci
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
