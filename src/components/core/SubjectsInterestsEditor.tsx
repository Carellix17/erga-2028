import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookOpen, Heart, Plus, X } from "lucide-react";
import {
  useUserSubjects, useAddUserSubject, useDeleteUserSubject, useUpdateSubjectColor,
} from "@/hooks/useUserSubjects";
import { SUBJECT_PALETTE, resolveSubjectColor } from "@/lib/subjectColors";
import { useUserData } from "@/hooks/useUserData";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CoreCard } from "./CoreCard";
import { SubjectsSkeleton } from "./SubjectsSkeleton";

// Suggerimenti rapidi per gli interessi: solo chips da un tocco, mai campi obbligatori.
const INTEREST_SUGGESTIONS = [
  "Scacchi",
  "Droni",
  "Economia",
  "Fotografia",
  "Videogiochi",
  "Calcio",
  "Musica",
  "Astronomia",
  "Lettura",
  "Cucina",
];

/** Stile condiviso dei tag del Core: Badge minimale + piccola "x" di rimozione. */
const TAG_CLASS = "h-9 gap-1 py-0 pl-3 pr-1 text-[13px] font-semibold";
const TAG_REMOVE_CLASS = cn(
  "-mr-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill",
  "text-muted-foreground transition-colors duration-200",
  "hover:bg-foreground/10 hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

interface AddTagInputProps {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
  ariaLabel: string;
  addButtonLabel: string;
  disabled?: boolean;
}

function AddTagInput({ value, onChange, onAdd, placeholder, ariaLabel, addButtonLabel, disabled }: AddTagInputProps) {
  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-11 rounded-button border-border bg-card"
      />
      <Button
        onClick={onAdd}
        disabled={disabled || !value.trim()}
        size="icon"
        aria-label={addButtonLabel}
        className="h-11 w-11 shrink-0 rounded-button"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

export function SubjectsInterestsEditor() {
  const { toast } = useToast();

  // ── Materie (tabella user_subjects) ──
  const subjects = useUserSubjects();
  const addSubject = useAddUserSubject();
  const delSubject = useDeleteUserSubject();
  const updateColor = useUpdateSubjectColor();
  const [newSubject, setNewSubject] = useState("");

  // ── Interessi (archivio personale nel cloud, chiave "interests") ──
  const { data: interests, updateData: updateInterests, isLoaded: interestsLoaded } = useUserData<string[]>("interests", []);
  const [newInterest, setNewInterest] = useState("");

  const handleAddSubject = async () => {
    const n = newSubject.trim();
    if (!n) return;
    try {
      await addSubject.mutateAsync(n);
      setNewSubject("");
    } catch (e) {
      toast({
        title: "Errore",
        description: (e as Error)?.message ?? "Impossibile aggiungere la materia.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    try {
      await delSubject.mutateAsync(id);
    } catch {
      toast({ title: "Errore", description: `Impossibile rimuovere ${name}.`, variant: "destructive" });
    }
  };

  const addInterest = (raw?: string) => {
    const n = (raw ?? newInterest).trim().replace(/^#/, "");
    if (!n) return;
    const next = interests.some((i) => i.toLowerCase() === n.toLowerCase())
      ? interests
      : [...interests, n.slice(0, 40)];
    updateInterests(next);
    setNewInterest("");
  };

  const removeInterest = (tag: string) => updateInterests(interests.filter((i) => i !== tag));

  const remainingSuggestions = INTEREST_SUGGESTIONS.filter(
    (s) => !interests.some((i) => i.toLowerCase() === s.toLowerCase()),
  ).slice(0, 5);

  // Skeleton solo per caricamento iniziale — non per azioni rapide come aggiungere un tag
  const isInitialLoading = subjects.isLoading || !interestsLoaded;

  const showSubjectsSkeleton = useDelayedLoading(isInitialLoading, 100);
  if (showSubjectsSkeleton) {
    return <SubjectsSkeleton />;
  }
  if (isInitialLoading) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* ── Materie ── */}
      <CoreCard
        id="materie"
        icon={BookOpen}
        title="Materie preferite"
        description="Le materie che studi davvero: Erga le usa per organizzare i tuoi materiali e i colori dei corsi."
      >
        <div className="space-y-4">
          <AddTagInput
            value={newSubject}
            onChange={setNewSubject}
            onAdd={handleAddSubject}
            placeholder="Es. Matematica"
            ariaLabel="Aggiungi materia"
            addButtonLabel="Aggiungi la materia"
            disabled={addSubject.isPending}
          />

          {subjects.data?.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Materie aggiunte">
              {subjects.data.map((s) => {
                const col = resolveSubjectColor(s.name, s.color);
                return (
                  <li key={s.id} className="animate-scale-in">
                    <Badge variant="secondary" className={TAG_CLASS}>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            className="flex min-w-0 items-center gap-1.5 rounded-pill text-left transition-opacity duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Cambia colore di ${s.name}`}
                            title="Cambia colore"
                          >
                            <span
                              className={cn("h-2.5 w-2.5 shrink-0 rounded-full", col.solid)}
                              aria-hidden="true"
                            />
                            <span className="max-w-[9rem] truncate">{s.name}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-3" align="start">
                          <p className="text-xs font-semibold mb-2">Colore di {s.name}</p>
                          <div className="grid grid-cols-7 gap-1.5 mb-2">
                            {SUBJECT_PALETTE.map((c) => (
                              <button
                                key={c.key}
                                onClick={() => updateColor.mutate({ id: s.id, color: c.key })}
                                aria-label={c.label}
                                className={cn(
                                  "w-6 h-6 rounded-full transition-transform hover:scale-110",
                                  c.solid,
                                  (s.color === c.key || (!s.color && col.key === c.key)) &&
                                    "ring-2 ring-offset-2 ring-foreground",
                                )}
                              />
                            ))}
                          </div>
                          {s.color && (
                            <button
                              onClick={() => updateColor.mutate({ id: s.id, color: null })}
                              className="text-xs text-muted-foreground hover:text-foreground transition"
                            >
                              Torna al colore automatico
                            </button>
                          )}
                        </PopoverContent>
                      </Popover>

                      <button
                        onClick={() => handleDeleteSubject(s.id, s.name)}
                        className={TAG_REMOVE_CLASS}
                        aria-label={`Rimuovi ${s.name}`}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="body-small text-muted-foreground">
              Nessuna materia aggiunta. Aggiungi quelle del tuo programma per ritrovarle subito nei corsi.
            </p>
          )}
        </div>
      </CoreCard>

      {/* ── Interessi ── */}
      <CoreCard
        id="interessi"
        icon={Heart}
        title="Interessi & hobby"
        description="Le tue passioni, salvate nel tuo profilo Erga. Premi Invio per aggiungere."
      >
        <div className="space-y-4">
          <AddTagInput
            value={newInterest}
            onChange={setNewInterest}
            onAdd={() => addInterest()}
            placeholder="Es. Scacchi, droni, economia…"
            ariaLabel="Aggiungi interesse"
            addButtonLabel="Aggiungi l'interesse"
          />

          {interests.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Interessi aggiunti">
              {interests.map((tag) => (
                <li key={tag} className="animate-scale-in">
                  <Badge variant="secondary" className={TAG_CLASS}>
                    <span className="max-w-[10rem] truncate">{tag}</span>
                    <button
                      onClick={() => removeInterest(tag)}
                      className={TAG_REMOVE_CLASS}
                      aria-label={`Rimuovi ${tag}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="body-small text-muted-foreground">
              Nessun interesse ancora. Racconta cosa ti appassiona fuori da scuola.
            </p>
          )}

          {remainingSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-small text-muted-foreground">Suggerimenti:</span>
              {remainingSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => addInterest(s)}
                  className="min-h-9 rounded-pill border border-dashed border-border px-3 text-[13px] text-muted-foreground transition-colors duration-200 hover:border-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </CoreCard>
    </div>
  );
}
