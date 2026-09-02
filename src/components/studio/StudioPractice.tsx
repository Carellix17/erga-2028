import { ChevronLeft, Dumbbell, MessageCircle, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PraticaSubTab } from "@/components/pratica/PraticaView";

/**
 * StudioPractice — accessi dedicati alle tre modalità di pratica (P37).
 *
 * PracticeLaunchers: tre pulsanti INDIPENDENTI (niente schede condivise)
 * posti sotto la card del percorso attivo. Ogni pulsante apre una
 * sottovista esclusiva gestita da StudioView.
 *
 * SubViewHeader: intestazione con "Torna a Studio" che compare in cima
 * a ogni sottovista; nelle viste immersive (Esercizi/Interrogazione) è
 * l'unico modo di uscire, perché la barra di navigazione è nascosta.
 */

export interface PracticeLaunchersProps {
  onOpen: (subView: PraticaSubTab) => void;
  className?: string;
}

const LAUNCHERS: { id: PraticaSubTab; label: string; icon: typeof Dumbbell }[] = [
  { id: "esercizi", label: "Esercizi", icon: Dumbbell },
  { id: "interrogazione", label: "Interrogazione", icon: Mic },
  { id: "chat", label: "Chat", icon: MessageCircle },
];

export function PracticeLaunchers({ onOpen, className }: PracticeLaunchersProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-2 px-4 pt-3 animate-fade-up", className)}>
      {LAUNCHERS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onOpen(id)}
          aria-label={`Apri ${label}`}
          className="interactive-card flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border/50 bg-card px-2 py-3 shadow-tactile transition-all duration-200 ease-m3-standard hover:border-primary/30 hover:bg-surface-container-low active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
          </span>
          <span className="text-xs font-semibold leading-tight text-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
}

export interface SubViewHeaderProps {
  title: string;
  onBack: () => void;
  courseTitle?: string | null;
  backLabel?: string;
}

export function SubViewHeader({ title, onBack, courseTitle, backLabel = "Torna a Studio" }: SubViewHeaderProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-b border-border/40",
        "px-4 py-2",
      )}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </button>
      <div className="min-w-0 text-right">
        <p className="truncate text-sm font-bold text-foreground">{title}</p>
        {courseTitle && (
          <p className="truncate text-xs text-muted-foreground">{courseTitle}</p>
        )}
      </div>
    </div>
  );
}

export interface BranchTopBarProps {
  courseTitle: string | null;
  moduleIndex: number;
  moduleTitle: string;
  onBack: () => void;
}

/**
 * P38 — Livello 2 (percorso a ramo): la card del corso si compatta in questa
 * barra STICKY in alto (≤56px: py-2 + h-9 + bordo). Mostra il nome del corso
 * e del modulo, con l'unico modo d'uscita: la pill glassy "Ritorna ai moduli".
 * Sostituisce l'intestazione interna di ModulePath (hideHeader).
 */
export function BranchTopBar({ courseTitle, moduleIndex, moduleTitle, onBack }: BranchTopBarProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-border/40 bg-background/80 px-4 py-2 backdrop-blur-md transition-all duration-300 ease-in-out">
      <div className="flex h-9 items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Ritorna ai moduli"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/10 px-3.5 text-sm font-semibold text-foreground backdrop-blur-md transition-all duration-200 hover:bg-foreground/15 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Ritorna ai moduli
        </button>
        <div className="min-w-0 text-right">
          <p className="label-small truncate text-muted-foreground">
            {courseTitle ? `${courseTitle} · ` : ""}Modulo {moduleIndex + 1}
          </p>
          <p className="truncate text-sm font-bold leading-tight text-foreground">{moduleTitle}</p>
        </div>
      </div>
    </div>
  );
}
