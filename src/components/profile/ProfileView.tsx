import { useState, useEffect, useCallback, useRef } from"react";
import { useAuth } from"@/contexts/AuthContext";
import { supabase } from"@/integrations/supabase/client";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Label } from"@/components/ui/label";
import { Slider } from"@/components/ui/slider";
import { Skeleton } from"@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from"@/components/ui/radio-group";
import { Save, User, GraduationCap, BookOpen, Loader2, CheckCircle2, Camera, UserCircle2, Target, Brain, Hexagon } from "lucide-react";
import { useToast } from"@/hooks/use-toast";
import { cn } from"@/lib/utils";
import { NotificationsCard } from"./NotificationsCard";
// Theme fisso: light-only.
import { useCognitiveProfile } from"@/hooks/useCognitiveProfile";
import { CognitiveRadar } from"./CognitiveRadar";
import { Button as UiButton } from"@/components/ui/button";
import { ScheduleConfigSheet } from"./ScheduleConfigSheet";
import { CalendarClock } from"lucide-react";
import { useProfileData, INSTITUTES as PROFILE_INSTITUTES, SCHOOLS as PROFILE_SCHOOLS, SUBJECTS as PROFILE_SUBJECTS } from"@/hooks/useProfileData";
import { Link } from"react-router-dom";

const INSTITUTES = PROFILE_INSTITUTES;
const SCHOOLS = PROFILE_SCHOOLS;
const SUBJECTS = PROFILE_SUBJECTS;

interface ProfileViewProps {
 onOpenCognitive?: () => void;
}

export function ProfileView({ onOpenCognitive }: ProfileViewProps = {}) {
 const { profile: cognitive } = useCognitiveProfile();
 const [scheduleOpen, setScheduleOpen] = useState(false);

 // Logica profilo condivisa con Impostazioni → Account
 const {
 fileInputRef,
 firstName, setFirstName,
 lastName, setLastName,
 nickname, setNickname,
 age, setAge,
 school, setSchool,
 avatarPreview, isUploadingAvatar,
 institute, setInstitute,
 subjectLevels, subjectGoals,
 isLoading, isSaving, saved, dirty, setDirty,
 handleAvatarChange, handleSave, handleLevelChange, handleGoalChange,
 } = useProfileData();

 const getLevelLabel = (level: number) => {
 if (level <= 3) return"Insufficiente";
 if (level <= 5) return"Sufficiente";
 if (level <= 7) return"Buono";
 if (level <= 9) return"Ottimo";
 return"Eccellente";
 };

 const getLevelColor = (level: number) => {
 if (level <= 3) return"text-destructive";
 if (level <= 5) return"text-warning";
 if (level <= 7) return"text-primary";
 return"text-success";
 };

 if (isLoading) {
 return (
 <div className="px-4 pt-6 pb-32 space-y-6 max-w-lg mx-auto animate-fade-up">
 <div className="flex flex-col items-center gap-4 py-4">
 <Skeleton className="w-24 h-24 rounded-[2rem]" />
 <Skeleton className="h-6 w-40 rounded-full" />
 <Skeleton className="h-4 w-56 rounded-full" />
 </div>
 <Skeleton className="h-44 rounded-2xl" />
 <Skeleton className="h-12 rounded-2xl" />
 <Skeleton className="h-52 rounded-2xl" />
 <Skeleton className="h-72 rounded-2xl" />
 </div>
 );
 }

 return (
 <div className="px-4 pt-6 pb-32 space-y-6 max-w-lg mx-auto animate-fade-up">
 {/* Avatar & Name Header */}
 <div className="flex flex-col items-center gap-4 py-4">
 <div className="relative">
 <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
 <button
 onClick={() => fileInputRef.current?.click()}
 disabled={isUploadingAvatar}
 className="w-24 h-24 rounded-[2rem] overflow-hidden bg-primary-container flex items-center justify-center shadow-level-2 transition-all duration-400 ease-m3-emphasized hover:scale-105 hover:shadow-level-3 active:scale-95 relative group"
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
 <h1 className="title-large font-display font-bold text-foreground">
 {nickname || firstName ||"Il tuo profilo"}
 </h1>
 <p className="body-medium text-muted-foreground">Personalizza la tua esperienza di studio</p>
 </div>
 </div>

 {/* Personal Info */}
 <div className="rounded-2xl bg-card border border-outline-variant/60 shadow-level-1 transition-shadow duration-300 ease-m3-emphasized hover:shadow-level-2 p-5 space-y-4">
 <div className="flex items-center gap-2 mb-1">
 <User className="w-5 h-5 text-foreground" />
 <h2 className="title-medium font-display text-foreground">Dati personali</h2>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="label-medium text-muted-foreground">Nome</Label>
 <Input value={firstName} onChange={(e) => { setFirstName(e.target.value); setDirty(true); }} placeholder="Mario" className="rounded-2xl h-11 bg-white border border-slate-200/70" />
 </div>
 <div className="space-y-1.5">
 <Label className="label-medium text-muted-foreground">Cognome</Label>
 <Input value={lastName} onChange={(e) => { setLastName(e.target.value); setDirty(true); }} placeholder="Rossi" className="rounded-2xl h-11 bg-white border border-slate-200/70" />
 </div>
 </div>
 <div className="space-y-1.5">
 <Label className="label-medium text-muted-foreground">Nickname <span className="text-primary">(usato dal chatbot)</span></Label>
 <Input value={nickname} onChange={(e) => { setNickname(e.target.value); setDirty(true); }} placeholder="Il tuo soprannome" className="rounded-2xl h-11 bg-white border border-slate-200/70" />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="label-medium text-muted-foreground">Età</Label>
 <Input type="number" value={age} onChange={(e) => { setAge(e.target.value); setDirty(true); }} placeholder="16" min={13} max={30} className="rounded-2xl h-11 bg-white border border-slate-200/70" />
 </div>
 <div className="space-y-1.5">
 <Label className="label-medium text-muted-foreground">Scuola</Label>
 <div className="h-11 rounded-2xl bg-white border border-slate-200/70 flex items-center px-3">
 <select value={school} onChange={(e) => { setSchool(e.target.value); setDirty(true); }} className="bg-transparent w-full body-medium outline-none">
 {SCHOOLS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
 </select>
 </div>
 </div>
 </div>
 </div>

 {/* Esagono Cognitivo */}
 <div className="rounded-2xl bg-card border border-outline-variant/60 shadow-level-1 transition-shadow duration-300 ease-m3-emphasized hover:shadow-level-2 p-5 space-y-4">
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
 <div key={label as string} className="rounded-xl bg-surface-container-high py-2 text-center">
 <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</div>
 <div className="text-base font-bold text-foreground tabular-nums">{val}</div>
 </div>
 ))}
 </div>
 </>
 ) : (
 <p className="body-small text-muted-foreground">
 Non hai ancora calcolato il tuo Esagono Cognitivo.
 </p>
 )}
 <UiButton
 onClick={onOpenCognitive}
 variant="outline"
 className="w-full rounded-2xl h-12 border border-outline-variant/60 bg-card hover:bg-surface-container-high shadow-level-1 transition-all duration-300"
 >
 <Brain className="w-4 h-4 mr-2 text-foreground" />
 {cognitive ?"Ricalcola il tuo Esagono Cognitivo" :"Calcola il tuo Esagono Cognitivo"}
 </UiButton>
 </div>

     {/* Configura Orari e Materie */}
     <UiButton
       onClick={() => setScheduleOpen(true)}
       variant="outline"
       className="w-full rounded-2xl h-12 bg-white border border-slate-200/70 hover:bg-slate-50 transition-all duration-300"
     >
       <CalendarClock className="w-4 h-4 mr-2 text-foreground" />
       Configura Orari e Materie
     </UiButton>

     <ScheduleConfigSheet open={scheduleOpen} onOpenChange={setScheduleOpen} />

 {/* Institute Section */}
 <div className="rounded-2xl bg-card border border-outline-variant/60 shadow-level-1 transition-shadow duration-300 ease-m3-emphasized hover:shadow-level-2 p-5 space-y-4">
 <div className="flex items-center gap-2 mb-1">
 <GraduationCap className="w-5 h-5 text-foreground" />
 <h2 className="title-medium font-display text-foreground">Tipo di istituto</h2>
 </div>
 <RadioGroup value={institute} onValueChange={(v) => { setInstitute(v); setDirty(true); }} className="space-y-1">
 {INSTITUTES.map((inst) => (
 <label
 key={inst.value}
 className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 ease-m3-emphasized hover:bg-foreground/[0.08] has-[data-state=checked]:bg-secondary-container"
 >
 <RadioGroupItem value={inst.value} />
 <span className="body-large text-foreground">{inst.label}</span>
 </label>
 ))}
 </RadioGroup>
 </div>

 {/* Appearance rimosso: app sempre in tema chiaro */}

 {/* Subject Levels & Goals Section */}
 <div className="rounded-2xl bg-card border border-outline-variant/60 shadow-level-1 transition-shadow duration-300 ease-m3-emphasized hover:shadow-level-2 p-5 space-y-6">
 <div className="flex items-center gap-2 mb-1">
 <BookOpen className="w-5 h-5 text-foreground" />
 <h2 className="title-medium font-display text-foreground">Voti e obiettivi</h2>
 </div>
 <p className="body-small text-muted-foreground -mt-2">Indica il tuo livello attuale e l'obiettivo che vuoi raggiungere in ogni materia</p>

 <div className="space-y-7">
 {SUBJECTS.map((subject) => {
 const level = subjectLevels[subject] || 6;
 const goal = subjectGoals[subject] ?? Math.max(level, 8);
 return (
 <div key={subject} className="space-y-3">
 <Label className="body-large text-foreground font-semibold">{subject}</Label>

 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <span className="label-medium text-muted-foreground flex items-center gap-1.5">
 <BookOpen className="w-3.5 h-3.5" /> Attuale
 </span>
 <span className={cn("label-large", getLevelColor(level))}>
 {level} — {getLevelLabel(level)}
 </span>
 </div>
 <Slider value={[level]} onValueChange={(v) => handleLevelChange(subject, v)} min={2} max={10} step={1} className="w-full" />
 </div>

 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <span className="label-medium text-muted-foreground flex items-center gap-1.5">
 <Target className="w-3.5 h-3.5" /> Obiettivo
 </span>
 <span className="label-large text-primary">{goal}</span>
 </div>
 <Slider value={[goal]} onValueChange={(v) => handleGoalChange(subject, v)} min={Math.max(2, level)} max={10} step={1} className="w-full" />
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Save Button */}
 <Button onClick={handleSave} disabled={isSaving} className="w-full h-14 bg-primary text-primary-foreground shadow-level-2" size="lg">
 {isSaving ? (
 <Loader2 className="w-5 h-5 animate-spin mr-2" />
 ) : saved ? (
 <CheckCircle2 className="w-5 h-5 mr-2" />
 ) : (
 <Save className="w-5 h-5 mr-2" />
 )}
 {isSaving ?"Salvataggio..." : saved ?"Salvato! ✨" :"Salva profilo"}
 </Button>

 {/* Notifiche push */}
 <NotificationsCard />

 {/* "Salvagente": appare solo se ci sono modifiche non salvate */}
 {dirty && (
 <div className="fixed z-40 inset-x-4 bottom-28 md:inset-x-auto md:right-8 md:bottom-8 md:w-96 animate-fade-up">
 <div className="rounded-2xl px-4 py-3 flex items-center gap-3 shadow-level-3 warning-container">
 <p className="flex-1 body-medium font-medium">Hai modifiche non salvate</p>
 <Button onClick={handleSave} disabled={isSaving} size="sm" className="rounded-full h-9 shrink-0">
 {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
 Salva
 </Button>
 </div>
 </div>
 )}
 </div>
 );
}
