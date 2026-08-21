import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, UserCircle2, Hexagon, LogOut, Crown, Zap, Brain, Loader2 } from "lucide-react";
import { useCognitiveProfile } from "@/hooks/useCognitiveProfile";
import { CognitiveRadar } from "./CognitiveRadar";
import { Button as UiButton } from "@/components/ui/button";
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

  // Only avatar + display name needed on profile page (editing moved to Impostazioni → Generale)
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
      <div className="px-4 pt-6 pb-32 space-y-6 max-w-lg mx-auto animate-fade-up">
        <div className="flex justify-end">
          <Skeleton className="w-9 h-9 rounded-full" />
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
    <div className="px-4 pt-4 pb-32 space-y-6 max-w-lg mx-auto animate-fade-up">
      {/* L'Header globale gestisce le Impostazioni; qui resta soltanto l'uscita. */}
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Esci dall'account"
          onClick={() => setConfirmLogout(true)}
          className="h-10 w-10 shrink-0 rounded-pill text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
        </Button>
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
              <UserCircle2 className="w-12 h-12 text-primary" />
            )}
            <div className="absolute inset-0 bg-foreground/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isUploadingAvatar ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </button>
        </div>
        <div className="text-center">
          <h2 className="title-large font-display font-bold text-foreground">
            {nickname || firstName || "Il tuo profilo"}
          </h2>
          <p className="body-medium text-muted-foreground">Personalizza la tua esperienza di studio</p>
          {/* Piccolo blocco piano abbonamento sotto il nome */}
          <button
            onClick={() => setShowSubscription(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-container text-primary text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <TierIcon className="w-3.5 h-3.5" />
            {tierMeta[tier].label}
          </button>
        </div>
      </div>

      {/* Esagono Cognitivo */}
      <div className="rounded-card bg-card border border-outline-variant/60 shadow-level-1 transition-colors duration-200 hover:bg-surface-container-low p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Hexagon className="w-5 h-5 text-foreground" />
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
        <UiButton
          onClick={onOpenCognitive}
          variant="outline"
          className="w-full rounded-button h-12 border border-outline-variant/60 bg-card hover:bg-surface-container-high shadow-level-1 transition-all duration-300"
        >
          <Brain className="w-4 h-4 mr-2 text-foreground" />
          {cognitive ? "Ricalcola il tuo Esagono Cognitivo" : "Calcola il tuo Esagono Cognitivo"}
        </UiButton>
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
