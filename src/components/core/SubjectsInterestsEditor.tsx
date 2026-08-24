import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookOpen, Plus, Trash2, Loader2, Sparkles, Heart } from "lucide-react";
import {
  useUserSubjects, useAddUserSubject, useDeleteUserSubject, useUpdateSubjectColor,
} from "@/hooks/useUserSubjects";
import { SUBJECT_PALETTE, resolveSubjectColor } from "@/lib/subjectColors";
import { useUserData } from "@/hooks/useUserData";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
        className="rounded-button h-11 bg-card border border-border"
      />
      <Button
        onClick={onAdd}
        disabled={disabled || !value.trim()}
        size="icon"
        aria-label={addButtonLabel}
        className="h-11 w-11 rounded-button shrink-0"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
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
  const { data: interests, updateData: updateInterests } = useUserData<string[]>("interests", []);
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

  return (
    <div className="space-y-4">
      {/* ── Materie ── */}
      <section
        className="rounded-card bg-card border border-outline-variant/60 shadow-level-1 p-5 space-y-4"
        aria-labelledby="core-materie-title"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-foreground" aria-hidden="true" />
          <h2 id="core-materie-title" className="title-medium font-display text-foreground">
            Materie preferite
          </h2>
        </div>
        <p className="body-small text-muted-foreground -mt-2">
          Le materie che studi davvero: Erga le usa per organizzare i tuoi materiali e i colori dei corsi.
        </p>

        <AddTagInput
          value={newSubject}
          onChange={setNewSubject}
          onAdd={handleAddSubject}
          placeholder="Es. Matematica"
          ariaLabel="Aggiungi materia"
          addButtonLabel="Aggiungi la materia"
          disabled={addSubject.isPending}
        />

        {subjects.isLoading ? (
          <p className="body-small text-muted-foreground">Caricamento…</p>
        ) : subjects.data?.length ? (
          <ul className="flex flex-wrap gap-2" aria-label="Materie aggiunte">
            {subjects.data.map((s) => {
              const col = resolveSubjectColor(s.name, s.color);
              return (
                <li
                  key={s.id}
                  className="inline-flex items-center gap-2 rounded-full bg-card border border-border pl-2.5 pr-1 py-1 text-sm animate-scale-in"
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="flex items-center gap-1.5 rounded-full pr-1 hover:opacity-80 transition min-h-[32px]"
                        aria-label={`Cambia colore di ${s.name}`}
                        title="Cambia colore"
                      >
                        <span
                          className={cn(
                            "w-3 h-3 rounded-full ring-2 ring-offset-1",
                            col.solid,
                            s.color ? "ring-border" : "ring-transparent",
                          )}
                          aria-hidden="true"
                        />
                        {s.name}
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
                    className="rounded-full p-1 hover:bg-muted transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                    aria-label={`Rimuovi ${s.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="body-small text-muted-foreground">
            Nessuna materia aggiunta. Aggiungi quelle del tuo programma per ritrovarle subito nei corsi.
          </p>
        )}
      </section>

      {/* ── Interessi ── */}
      <section
        className="rounded-card bg-card border border-outline-variant/60 shadow-level-1 p-5 space-y-4"
        aria-labelledby="core-interessi-title"
      >
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-foreground" aria-hidden="true" />
          <h2 id="core-interessi-title" className="title-medium font-display text-foreground">
            Interessi &amp; hobby
          </h2>
        </div>
        <p className="body-small text-muted-foreground -mt-2">
          Le tue passioni, salvate nel tuo profilo Erga. Premi Invio per aggiungere.
        </p>

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
              <li
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-container/70 border border-outline-variant/60 pl-3 pr-1 py-1 text-sm animate-scale-in"
              >
                <Sparkles className="w-3 h-3 text-primary" aria-hidden="true" />
                {tag}
                <button
                  onClick={() => removeInterest(tag)}
                  className="rounded-full p-1.5 hover:bg-muted transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                  aria-label={`Rimuovi ${tag}`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="body-small text-muted-foreground">
            Nessun interesse ancora. Racconta cosa ti appassiona fuori da scuola.
          </p>
        )}

        {remainingSuggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="label-small text-muted-foreground">Suggerimenti:</span>
            {remainingSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => addInterest(s)}
                className="px-3 py-1.5 rounded-full border border-dashed border-outline-variant text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors min-h-[36px]"
              >
                + {s}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
