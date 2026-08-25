import { Button } from "@/components/ui/button";
import { Hexagon, Brain } from "lucide-react";
import { useCognitiveProfile } from "@/hooks/useCognitiveProfile";
import { CognitiveRadar } from "./CognitiveRadar";
import { CoreCard } from "./CoreCard";
import { HexagonSkeleton } from "./HexagonSkeleton";

// Le 6 dimensioni del modello Erga (stessi nomi usati da test diagnostico,
// radar e funzione cloud cognitive-profile: NON rinominare senza aggiornare il backend).
const DIMENSIONS: { key: ScoreKey; label: string }[] = [
  { key: "log_score", label: "Logica" },
  { key: "mem_score", label: "Memoria" },
  { key: "foc_score", label: "Focus" },
  { key: "voc_score", label: "Lessico" },
  { key: "ans_score", label: "Calma" },
  { key: "app_score", label: "Pratica" },
];

type ScoreKey = "log_score" | "mem_score" | "foc_score" | "voc_score" | "ans_score" | "app_score";

interface Props {
  /** Apre il questionario iniziale (gestito dalla schermata principale). */
  onOpenDiagnostic: () => void;
}

/**
 * Esagono Cognitivo: sola lettura.
 * I punteggi si aggiornano solo rifacendo il test diagnostico.
 */
export function CognitiveHexagonEditor({ onOpenDiagnostic }: Props) {
  const { profile, isLoaded } = useCognitiveProfile();

  if (!isLoaded) {
    return <HexagonSkeleton />;
  }

  return (
    <CoreCard id="esagono" icon={Hexagon} title="Esagono Cognitivo">
      <div className="space-y-4">
        {profile ? (
          <>
            <CognitiveRadar profile={profile} />
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {DIMENSIONS.map((d) => (
                <div
                  key={d.key}
                  className="rounded-button bg-surface-container-high py-2 text-center"
                >
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {d.label}
                  </div>
                  <div className="text-base font-bold text-foreground tabular-nums">
                    {profile[d.key]}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-6 text-center space-y-2">
            <Brain className="w-8 h-8 mx-auto text-muted-foreground" aria-hidden="true" />
            <p className="body-medium text-muted-foreground">
              Non hai ancora calcolato il tuo Esagono Cognitivo.
            </p>
            <p className="body-small text-muted-foreground">
              Due minuti di domande per capire come studi: Erga userà il risultato per adattare le lezioni a te.
            </p>
          </div>
        )}

        <Button
          onClick={onOpenDiagnostic}
          variant={profile ? "outline" : "default"}
          className="w-full rounded-button h-12"
        >
          <Brain className="w-4 h-4 mr-2" aria-hidden="true" />
          {profile ? "Rifai il test" : "Calcola il tuo Esagono"}
        </Button>
      </div>
    </CoreCard>
  );
}
