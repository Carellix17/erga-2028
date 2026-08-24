import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera, UserCircle2, LogOut, Crown, Zap, Brain, Loader2, KeyRound,
  Settings as SettingsIcon, Mail, Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileData } from "@/hooks/useProfileData";
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

export function AccountSettings() {
  const { currentEmail, isGoogleUser, logout } = useAuth();
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

  const {
    fileInputRef,
    firstName, setFirstName,
    lastName, setLastName,
    nickname, setNickname,
    avatarPreview,
    isUploadingAvatar,
    isLoading,
    isSaving,
    dirty, setDirty,
    handleAvatarChange, handleSave,
  } = useProfileData();

  // Autosave: come nelle Impostazioni → Generale, salva dopo 800ms di inattività.
  const saveTimeoutRef = useRef<number | null>(null);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if (isLoading) return;
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      return;
    }
    if (!dirty || isSaving) return;
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      handleSave();
    }, 800);
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [firstName, lastName, nickname, dirty, isLoading, isSaving, handleSave]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Caricamento account">
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-16 rounded-card" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Identità e dati principali */}
      <section
        className="rounded-card bg-card border border-outline-variant/60 shadow-level-1 p-5 space-y-5"
        aria-labelledby="core-account-title"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="core-account-title" className="title-medium font-display text-foreground">
            Account
          </h2>
          {/* Stato salvataggio: discreto, in linea con l'indicatore globale */}
          <span className="label-small text-muted-foreground inline-flex items-center gap-1" aria-live="polite">
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Salvataggio…
              </>
            ) : dirty ? (
              "Modifiche in sospeso"
            ) : (
              <>
                <Check className="w-3 h-3" aria-hidden="true" /> Salvato
              </>
            )}
          </span>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              aria-label="Cambia foto profilo"
              className="w-20 h-20 rounded-media overflow-hidden bg-primary-container flex items-center justify-center shadow-level-1 transition-all duration-200 ease-m3-emphasized active:scale-95 relative group"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Foto profilo utente" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-10 h-10 text-primary" aria-hidden="true" />
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
          <div className="min-w-0">
            <p className="title-medium font-display font-bold text-foreground truncate">
              {nickname || firstName || "Il tuo profilo"}
            </p>
            {/* Piano abbonamento */}
            <button
              onClick={() => setShowSubscription(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-container text-primary text-xs font-semibold hover:opacity-90 transition-opacity min-h-[32px]"
            >
              <TierIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {tierMeta[tier].label}
            </button>
          </div>
        </div>

        {/* Nome e nickname */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="core-first-name" className="label-medium text-muted-foreground">Nome</Label>
            <Input
              id="core-first-name"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                setDirty(true);
              }}
              placeholder="Mario"
              className="rounded-button h-12 mt-1.5 bg-card border border-outline-variant/60"
            />
          </div>
          <div>
            <Label htmlFor="core-last-name" className="label-medium text-muted-foreground">Cognome</Label>
            <Input
              id="core-last-name"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setDirty(true);
              }}
              placeholder="Rossi"
              className="rounded-button h-12 mt-1.5 bg-card border border-outline-variant/60"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="core-nickname" className="label-medium text-muted-foreground">
            Nickname <span className="text-primary">(usato dal chatbot)</span>
          </Label>
          <Input
            id="core-nickname"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setDirty(true);
            }}
            placeholder="Il tuo soprannome"
            className="rounded-button h-12 mt-1.5 bg-card border border-outline-variant/60"
          />
        </div>

        {/* Email (sola lettura: si cambia dalle impostazioni di sicurezza) */}
        <div>
          <Label htmlFor="core-email" className="label-medium text-muted-foreground">Email</Label>
          <div className="relative mt-1.5">
            <Mail
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="core-email"
              readOnly
              value={currentEmail ?? "—"}
              className="w-full h-12 rounded-button bg-surface-container-high border border-outline-variant/60 pl-9 pr-3 text-foreground cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-describedby="core-email-note"
            />
          </div>
          <p id="core-email-note" className="text-[11px] text-muted-foreground mt-1.5">
            {isGoogleUser
              ? "Account collegato a Google."
              : "L'email identifica il tuo account."}
          </p>
        </div>
      </section>

      {/* Sicurezza e impostazioni */}
      <section className="rounded-card bg-card border border-outline-variant/60 shadow-level-1 divide-y divide-outline-variant/40 overflow-hidden">
        <button
          onClick={() => navigate("/cambia-password")}
          className="w-full flex items-center gap-3 px-5 py-4 min-h-[56px] text-left hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <KeyRound className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="flex-1">
            <span className="block label-large font-semibold text-foreground">Cambia password</span>
            <span className="block body-small text-muted-foreground">Scegline una nuova in sicurezza</span>
          </span>
        </button>
        <button
          onClick={() => navigate("/app/impostazioni")}
          className="w-full flex items-center gap-3 px-5 py-4 min-h-[56px] text-left hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <SettingsIcon className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="flex-1">
            <span className="block label-large font-semibold text-foreground">Tutte le impostazioni</span>
            <span className="block body-small text-muted-foreground">Aspetto, accessibilità, lingua e termini</span>
          </span>
        </button>
        <button
          onClick={() => setConfirmLogout(true)}
          className="w-full flex items-center gap-3 px-5 py-4 min-h-[56px] text-left hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <LogOut className="w-5 h-5 text-destructive shrink-0" aria-hidden="true" />
          <span className="flex-1">
            <span className="block label-large font-semibold text-destructive">Esci dall'account</span>
            <span className="block body-small text-muted-foreground">Dovrai accedere di nuovo</span>
          </span>
        </button>
      </section>

      <SubscriptionSheet open={showSubscription} onOpenChange={setShowSubscription} currentTier={tier} />

      {/* Conferma logout */}
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
    </div>
  );
}
