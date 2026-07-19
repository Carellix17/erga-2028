import { useState } from "react";
import { Target, Minus, Plus, Loader2, ChevronDown } from "lucide-react";
import type { UserSubject } from "@/hooks/useUserSubjects";
import { resolveSubjectColor } from "@/lib/subjectColors";
import { useProfileGoalsQuery, useSaveSubjectGoals } from "@/hooks/useProfileGoals";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GoalsCardProps {
  subjects: UserSubject[];
}

const GOAL_MIN = 6;
const GOAL_MAX = 10;

/**
 * Scheda "Obiettivi di voto": mostra per ogni materia il livello attuale e
 * l'obiettivo, modificabile con -/+. Il piano AI usa questi obiettivi per
 * bilanciare le sessioni.
 */
export function GoalsCard({ subjects }: GoalsCardProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const goalsQuery = useProfileGoalsQuery(currentUser);
  const saveGoals = useSaveSubjectGoals(currentUser);
  const [expanded, setExpanded] = useState(false);
  const [savingSubject, setSavingSubject] = useState<string | null>(null);

  if (subjects.length === 0) return null;

  const levels = goalsQuery.data?.subjectLevels ?? {};
  const goals = goalsQuery.data?.subjectGoals ?? {};

  const changeGoal = async (subjectName: string, delta: number) => {
    const current = goals[subjectName] ?? 8;
    const next = Math.min(GOAL_MAX, Math.max(GOAL_MIN, current + delta));
    if (next === current) return;
    setSavingSubject(subjectName);
    try {
      await saveGoals.mutateAsync({ ...goals, [subjectName]: next });
    } catch (err) {
      toast({
        title: "Errore",
        description: err instanceof Error ? err.message : "Salvataggio non riuscito",
        variant: "destructive",
      });
    } finally {
      setSavingSubject(null);
    }
  };

  const visibleSubjects = expanded ? subjects : subjects.slice(0, 3);
  const hiddenCount = subjects.length - visibleSubjects.length;

  return (
    <div className="m3-card-elevated rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h2 className="title-medium font-display font-semibold">Obiettivi di voto</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">guidano il piano AI</span>
      </div>

      <div className="space-y-2.5">
        {visibleSubjects.map((s) => {
          const col = resolveSubjectColor(s.name, s.color);
          const level = levels[s.name];
          const goal = goals[s.name] ?? 8;
          const isSaving = savingSubject === s.name;
          return (
            <div key={s.id} className="flex items-center gap-3">
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", col.solid)} />
              <div className="flex-1 min-w-0 flex items-baseline gap-2">
                <span className="text-sm font-medium truncate">{s.name}</span>
                {level !== undefined && (
                  <span className="text-[11px] text-muted-foreground shrink-0">livello {level}</span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-3" />
                ) : (
                  <>
                    <button
                      onClick={() => changeGoal(s.name, -1)}
                      disabled={goal <= GOAL_MIN}
                      aria-label={`Abbassa obiettivo di ${s.name}`}
                      className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center disabled:opacity-30 hover:bg-surface-container-high transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className={cn("w-8 text-center text-sm font-bold", col.text)}>{goal}</span>
                    <button
                      onClick={() => changeGoal(s.name, +1)}
                      disabled={goal >= GOAL_MAX}
                      aria-label={`Alza obiettivo di ${s.name}`}
                      className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center disabled:opacity-30 hover:bg-surface-container-high transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Mostra altre {hiddenCount} materie
        </button>
      )}
    </div>
  );
}
