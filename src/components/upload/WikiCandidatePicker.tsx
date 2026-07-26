import { Globe, Loader2 } from "lucide-react";

// 🎯 P13 — IL PICKER DELLE VOCI: le carte-candidato mostrate dopo la ricerca
// su Wikipedia. Titolo + mini-descrizione + miniatura, così basta la roulette
// del "primo risultato": scegli TU la voce giusta (addio film del 1989 😄).

export interface WikiCandidate {
  title: string;
  description: string;
  thumb: string | null;
}

interface WikiCandidatePickerProps {
  candidates: WikiCandidate[];
  /** Titolo attualmente in creazione (mostra la rotellina su quella carta). */
  pickingTitle: string | null;
  /** Disabilita le carte mentre la creazione è in corso. */
  disabled: boolean;
  onPick: (title: string) => void;
  onManualAI: () => void;
}

export function WikiCandidatePicker({ candidates, pickingTitle, disabled, onPick, onManualAI }: WikiCandidatePickerProps) {
  return (
    <div className="space-y-2.5 animate-fade-up">
      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">
          Nessuna voce trovata su Wikipedia. Prova altre parole, oppure usa il manuale AI qui sotto.
        </p>
      ) : (
        <>
          <p className="body-small text-muted-foreground text-center">
            Ho trovato queste voci: <strong>toccala per creare il materiale</strong> 👇
          </p>
          {candidates.map((c) => (
            <button
              key={c.title}
              type="button"
              onClick={() => onPick(c.title)}
              disabled={disabled}
              className="w-full flex items-start gap-3 p-3 rounded-2xl bg-card border border-outline-variant/60 shadow-level-1 text-left transition-all hover:shadow-level-2 active:scale-[0.98] disabled:opacity-50 animate-cinematic-in"
            >
              {c.thumb ? (
                <img src={c.thumb} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 bg-surface-container" />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-secondary-container flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground leading-snug">{c.title}</p>
                {c.description && (
                  <p className="body-small text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>
                )}
              </div>
              {pickingTitle === c.title && (
                <Loader2 className="w-4 h-4 animate-spin shrink-0 mt-1 text-primary" />
              )}
            </button>
          ))}
        </>
      )}
      <button
        type="button"
        onClick={onManualAI}
        disabled={disabled}
        className="w-full text-center body-small text-muted-foreground underline underline-offset-4 py-1 hover:text-foreground transition-colors disabled:opacity-50"
      >
        Nessuna di queste: usa il manuale AI
      </button>
    </div>
  );
}
