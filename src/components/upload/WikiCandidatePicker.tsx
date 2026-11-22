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
    <div className="space-y-2">
      {candidates.length === 0 ? (
        <p className="py-2 text-base text-muted-foreground" role="status">
          Nessuna voce trovata su Wikipedia. Prova altre parole, oppure usa il manuale AI qui sotto.
        </p>
      ) : (
        <>
          <p className="text-base text-muted-foreground" role="status">Scegli una voce per creare il materiale.</p>
          {candidates.map((c) => (
            <button
              key={c.title}
              type="button"
              onClick={() => onPick(c.title)}
              disabled={disabled}
              className="flex w-full items-start gap-3 px-4 py-3 text-left"
            >
              {c.thumb ? (
                <img src={c.thumb} alt="" className="material-surface size-11 shrink-0 object-cover" />
              ) : (
                <Globe className="mt-1 size-5 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="break-words text-base leading-snug">{c.title}</p>
                {c.description && (
                  <p className="body-small text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>
                )}
              </div>
              {pickingTitle === c.title && (
                <Loader2 className="mt-1 size-4 shrink-0 animate-spin" aria-hidden="true" />
              )}
            </button>
          ))}
        </>
      )}
      <button
        type="button"
        onClick={onManualAI}
        disabled={disabled}
        className="w-full px-4 py-3 text-center text-sm"
      >
        Usa il manuale AI
      </button>
    </div>
  );
}
