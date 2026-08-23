import { useState, useEffect, useRef } from "react";
import {
  User, GraduationCap, Loader2, CheckCircle2, Camera, UserCircle2, Trash2,
} from "lucide-react";
import { SettingsHeader, SettingsPage } from "@/components/settings/SettingsHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useProfileData, INSTITUTES, SCHOOLS } from "@/hooks/useProfileData";
import { NotificationsCard } from "@/components/profile/NotificationsCard";

export default function SettingsAccount() {
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const {
    fileInputRef,
    firstName, setFirstName,
    lastName, setLastName,
    nickname, setNickname,
    age, setAge,
    school, setSchool,
    avatarPreview, isUploadingAvatar, avatarUrl,
    institute, setInstitute,
    isLoading, isSaving, saved, dirty, setDirty,
    handleAvatarChange, handleSave,
  } = useProfileData();

  // Autosave: salva automaticamente dopo 800ms di inattività quando ci sono modifiche
  const saveTimeoutRef = useRef<number | null>(null);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if (isLoading) return;
    // Evita di salvare al primo caricamento
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      return;
    }
    if (!dirty || isSaving) return;
    if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    // debounce
    saveTimeoutRef.current = window.setTimeout(() => {
      handleSave();
    }, 800);
    return () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [firstName, lastName, nickname, age, school, institute, avatarUrl, dirty, isLoading, isSaving, handleSave]);

  // Quando l'avatar viene caricato, segna dirty così parte l'autosave (oppure salva subito)
  // handleAvatarChange aggiorna avatarUrl; l'effetto sopra gestirà il salvataggio

  return (
    <SettingsPage>
      <SettingsHeader title="Generale" subtitle="I tuoi dati personali e preferenze" />
      <main className="px-4 sm:px-6 py-6 pb-32 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-6 animate-fade-up">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-24 w-24 rounded-[2rem] mx-auto" />
            <Skeleton className="h-56 rounded-card" />
            <Skeleton className="h-44 rounded-card" />
          </div>
        ) : (
          <>
            {/* Avatar */}
            <div className="flex flex-col items-center gap-4 py-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label="Cambia foto profilo"
                className="w-24 h-24 rounded-[2rem] overflow-hidden bg-primary-container flex items-center justify-center shadow-level-2 transition-all duration-200 ease-m3-emphasized active:scale-95 relative group"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Foto profilo utente" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle2 className="w-12 h-12 text-foreground" />
                )}
                <div className="absolute inset-0 bg-foreground/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {isUploadingAvatar
                    ? <Loader2 className="w-6 h-6 text-background animate-spin" />
                    : <Camera className="w-6 h-6 text-background" />}
                </div>
              </button>
              <p className="body-small text-muted-foreground">Tocca la foto per cambiarla</p>
            </div>

            {/* Dati personali */}
            <section className="erga-settings-panel rounded-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-5 h-5 text-foreground" />
                <h2 className="title-medium font-display text-foreground">Dati personali</h2>
                <div className="ml-auto flex items-center gap-1.5">
                  {isSaving ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvataggio…
                    </span>
                  ) : saved ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Salvato
                    </span>
                  ) : dirty ? (
                    <span className="text-xs text-muted-foreground">Salvataggio automatico…</span>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="label-medium text-muted-foreground">Nome</Label>
                  <Input value={firstName} onChange={(e) => { setFirstName(e.target.value); setDirty(true); }} placeholder="Mario" className="rounded-button h-12 bg-card border border-outline-variant/60" />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-medium text-muted-foreground">Cognome</Label>
                  <Input value={lastName} onChange={(e) => { setLastName(e.target.value); setDirty(true); }} placeholder="Rossi" className="rounded-button h-12 bg-card border border-outline-variant/60" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="label-medium text-muted-foreground">Nickname <span className="text-primary">(usato dal chatbot)</span></Label>
                <Input value={nickname} onChange={(e) => { setNickname(e.target.value); setDirty(true); }} placeholder="Il tuo soprannome" className="rounded-button h-12 bg-card border border-outline-variant/60" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="label-medium text-muted-foreground">Età</Label>
                  <Input type="number" value={age} onChange={(e) => { setAge(e.target.value); setDirty(true); }} placeholder="16" min={13} max={30} className="rounded-button h-12 bg-card border border-outline-variant/60" />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-medium text-muted-foreground">Scuola</Label>
                  <div className="h-12 rounded-card bg-card border border-outline-variant/60 flex items-center px-3">
                    <select
                      value={school}
                      onChange={(e) => { setSchool(e.target.value); setDirty(true); }}
                      aria-label="Scuola"
                      className="bg-transparent w-full body-medium text-foreground outline-none"
                    >
                      {SCHOOLS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <p className="body-small text-muted-foreground">Le modifiche vengono salvate automaticamente.</p>
            </section>

            {/* Tipo di istituto */}
            <section className="erga-settings-panel rounded-card p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-5 h-5 text-foreground" />
                <h2 className="title-medium font-display text-foreground">Tipo di istituto</h2>
              </div>
              <RadioGroup value={institute} onValueChange={(v) => { setInstitute(v); setDirty(true); }} className="space-y-1">
                {INSTITUTES.map((inst) => (
                  <label key={inst.value} className="erga-list-item flex items-center gap-3 rounded-button p-3 cursor-pointer transition-all duration-300 ease-m3-emphasized">
                    <RadioGroupItem value={inst.value} />
                    <span className="body-large text-foreground">{inst.label}</span>
                  </label>
                ))}
              </RadioGroup>
            </section>

            {/* Notifiche */}
            <NotificationsCard />

            {/* Zona pericolosa */}
            <section className="rounded-card border border-destructive/30 bg-error-container/40 p-5 space-y-3">
              <h2 className="title-medium font-display text-foreground">Elimina account</h2>
              <p className="body-small text-muted-foreground">
                L'eliminazione rimuove definitivamente i tuoi dati, i percorsi e le lezioni. L'azione non può essere annullata.
              </p>
              <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="w-full h-12 rounded-button text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-2" />
                Elimina il mio account
              </Button>
            </section>
          </>
        )}
      </main>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="rounded-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il tuo account?</AlertDialogTitle>
            <AlertDialogDescription>
              Tutti i tuoi dati verranno cancellati in modo permanente. Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-dialog">Annulla</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-button bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                toast({
                  title: "Non ancora disponibile",
                  description: "L'eliminazione dell'account sarà attiva a breve.",
                });
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsPage>
  );
}
