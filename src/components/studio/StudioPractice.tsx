import { ArrowUp, AudioLines, ChevronLeft, PencilLine } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * StudioPractice — accessi rapidi alla pratica dalla Home Studio.
 *
 * PracticeLaunchers (P39): DUE card affiancate a tutta larghezza (griglia
 * 2 colonne) per Esercizi e Interrogazione, con le STESSE icone della Home
 * (PencilLine / AudioLines) e l'accento cromatico del corso attivo
 * (variabile CSS --subject-accent, già collegata da useSubjectAccent).
 * La Chat non è più una card: vive nella PromptBar qui sotto.
 *
 * PromptBar (P39): barra di input a pillola per parlare subito con l'AI.
 * Con testo (Enter o freccia) apre la Chat e semina il messaggio; vuota,
 * apre semplicemente la Chat. Il wrapper porta pb-32: resta sempre sopra
 * la barra di navigazione fissa.
 *
 * SubViewHeader: intestazione con "Torna a Studio" che compare in cima
 * a ogni sottovista; nelle viste immersive (Esercizi/Interrogazione) è
 * l'unico modo di uscire, perché la barra di navigazione è nascosta.
 */

export interface PracticeLaunchersProps {
  onOpenEsercizi: () => void;
  onOpenInterrogazione: () => void;
  className?: string;
}

function LauncherCard({
  label,
  subtitle,
  icon: Icon,
  onClick,
}: {
  label: string;
  subtitle: string;
  icon: typeof PencilLine;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Apri ${label}`}
      className="interactive-card flex min-h-[92px] flex-col items-start gap-2 rounded-2xl border border-subject-accent/25 bg-card p-3.5 text-left shadow-tactile transition-all duration-200 ease-m3-standard hover:border-subject-accent/50 hover:shadow-[0_0_28px_-10px_var(--subject-accent)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-subject-accent text-subject-accent-foreground shadow-[0_0_16px_-4px_var(--subject-accent)]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight text-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

export function PracticeLaunchers({ onOpenEsercizi, onOpenInterrogazione, className }: PracticeLaunchersProps) {
  return (
    <div className={cn("grid w-full grid-cols-2 gap-3 px-4 pt-3 animate-fade-up", className)}>
      <LauncherCard label="Esercizi" subtitle="Quiz e flashcard" icon={PencilLine} onClick={onOpenEsercizi} />
      <LauncherCard label="Interrogazione" subtitle="Simulazione orale" icon={AudioLines} onClick={onOpenInterrogazione} />
    </div>
  );
}

export interface PromptBarProps {
  /** Testo (non vuoto) digitato nella barra: apre la Chat e lo invia. */
  onSend: (text: string) => void;
  /** Tap su barra vuota: apre la Chat senza messaggi. */
  onOpen: () => void;
  className?: string;
}

export function PromptBar({ onSend, onOpen, className }: PromptBarProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim(); // sanitize: niente invii di soli spazi
    setValue("");
    if (text) onSend(text);
    else onOpen();
  };

  return (
    <form
      className={cn("px-4 pt-3 pb-32", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#16161A] py-2 pl-5 pr-2 shadow-tactile transition-colors duration-200 focus-within:border-white/20">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Chiedi qualcosa a Erga..."
          aria-label="Chiedi qualcosa a Erga"
          className="min-w-0 flex-1 bg-transparent text-sm text-white/90 outline-none placeholder:text-white/45"
        />
        <button
          type="submit"
          aria-label="Invia alla Chat"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white/90 transition-all duration-200 hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>
    </form>
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
