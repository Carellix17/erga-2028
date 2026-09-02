import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { edgeFetch } from "@/lib/edgeFetch";
import { useToast } from "@/hooks/use-toast";

export const INSTITUTES = [
  { value: "liceo_scientifico", label: "Liceo Scientifico" },
  { value: "liceo_classico", label: "Liceo Classico" },
  { value: "liceo_linguistico", label: "Liceo Linguistico" },
  { value: "istituto_tecnico", label: "Istituto Tecnico" },
];

export const SCHOOLS = [{ value: "licei_cartesio", label: "Licei Cartesio" }];

export const SUBJECTS = [
  "Matematica", "Italiano", "Storia", "Inglese",
  "Fisica", "Scienze", "Filosofia", "Informatica",
];

export interface SubjectLevels { [subject: string]: number }
export interface SubjectGoals { [subject: string]: number }

export interface ProfilePayload {
  institute_type?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  age?: number | null;
  school?: string | null;
  avatar_url?: string | null;
  subject_levels?: Record<string, number> | null;
  subject_goals?: Record<string, number> | null;
}

/**
 * Logica condivisa del profilo utente (dati personali, avatar, voti/obiettivi).
 * Usata sia da ProfileView sia da Impostazioni → Account, così non esiste
 * codice duplicato per il caricamento e il salvataggio.
 */
export function useProfileData() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState<string>("");
  const [school, setSchool] = useState("licei_cartesio");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [institute, setInstitute] = useState("liceo_scientifico");

  const [subjectLevels, setSubjectLevels] = useState<SubjectLevels>(() => {
    const d: SubjectLevels = {};
    SUBJECTS.forEach((s) => (d[s] = 6));
    return d;
  });
  const [subjectGoals, setSubjectGoals] = useState<SubjectGoals>(() => {
    const d: SubjectGoals = {};
    SUBJECTS.forEach((s) => (d[s] = 8));
    return d;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Errore di lettura del profilo: niente più "silenzio" che sembra dati vuoti.
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!currentUser) return;
    setLoadError(null);
    try {
      const data = await edgeFetch<{ profile?: ProfilePayload | null }>(
        "user-profile",
        { userId: currentUser, action: "get" },
      );
      if (data.profile) {
        const p = data.profile;
        setInstitute(p.institute_type || "liceo_scientifico");
        setFirstName(p.first_name || "");
        setLastName(p.last_name || "");
        setNickname(p.nickname || "");
        setAge(p.age ? String(p.age) : "");
        setSchool(p.school || "licei_cartesio");
        setAvatarUrl(p.avatar_url || "");
        if (p.avatar_url) setAvatarPreview(p.avatar_url);
        if (p.subject_levels && Object.keys(p.subject_levels).length > 0) {
          setSubjectLevels((prev) => ({ ...prev, ...p.subject_levels }));
        }
        if (p.subject_goals && Object.keys(p.subject_goals).length > 0) {
          setSubjectGoals((prev) => ({ ...prev, ...p.subject_goals }));
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setLoadError(err instanceof Error ? err.message : "Impossibile caricare il profilo.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // Se l'utente chiude la pagina con modifiche non salvate, il browser avvisa
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Errore", description: "L'immagine deve essere inferiore a 2MB", variant: "destructive" });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const rawExt = (file.name.split(".").pop() || "jpg").toLowerCase();
      const ext = ["jpg", "jpeg", "png", "webp"].includes(rawExt)
        ? (rawExt === "jpeg" ? "jpg" : rawExt)
        : "jpg";
      const userId = session?.user?.id || currentUser.replace(/[^a-zA-Z0-9]/g, "_");
      const filePath = `${userId}/avatar.${ext}`;

      if (session) {
        const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
        if (uploadError) throw uploadError;
      } else {
        const authToken = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "uploadAvatar", fileData: base64, ext }),
        });
        if (!response.ok) throw new Error("Upload fallito");
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(urlWithCache);
      setAvatarPreview(urlWithCache);
      // Segna dirty così l'autosave in Generale può persistere, e salva subito anche dal profilo
      setDirty(true);
      // Salvataggio immediato dell'avatar (così non serve il pulsante Salva)
      try {
        const { data: { session: s2 } } = await supabase.auth.getSession();
        const authToken2 = s2?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken2}` },
            body: JSON.stringify({
              userId: currentUser, action: "save",
              institute_type: institute, subject_levels: subjectLevels, subject_goals: subjectGoals,
              first_name: firstName, last_name: lastName, nickname,
              age: age ? parseInt(age) : null, school, avatar_url: urlWithCache,
            }),
          }
        );
        setDirty(false);
      } catch { /* silenzioso: l'autosave ritenterà */ }
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast({ title: "Errore", description: "Impossibile caricare l'immagine", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    setSaved(false);
    try {
      await edgeFetch("user-profile", {
        userId: currentUser, action: "save",
        institute_type: institute, subject_levels: subjectLevels, subject_goals: subjectGoals,
        first_name: firstName, last_name: lastName, nickname,
        age: age ? parseInt(age) : null, school, avatar_url: avatarUrl,
      });
      setSaved(true);
      setDirty(false);
      toast({ title: "Profilo salvato! ✨", description: "I tuoi dati verranno usati per personalizzare l'esperienza." });
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Error saving profile:", err);
      toast({ title: "Errore", description: "Impossibile salvare il profilo.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLevelChange = (subject: string, value: number[]) => {
    setSubjectLevels((prev) => ({ ...prev, [subject]: value[0] }));
    setDirty(true);
  };

  const handleGoalChange = (subject: string, value: number[]) => {
    setSubjectGoals((prev) => ({ ...prev, [subject]: value[0] }));
    setDirty(true);
  };

  return {
    fileInputRef,
    firstName, setFirstName,
    lastName, setLastName,
    nickname, setNickname,
    age, setAge,
    school, setSchool,
    avatarUrl, avatarPreview, isUploadingAvatar,
    institute, setInstitute,
    subjectLevels, subjectGoals,
    isLoading, isSaving, saved, dirty, setDirty,
    loadError,
    handleAvatarChange, handleSave, handleLevelChange, handleGoalChange,
  };
}