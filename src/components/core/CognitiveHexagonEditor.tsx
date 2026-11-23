import { useDelayedLoading } from "@/hooks/useDelayedLoading";
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

  const showHexSkeleton = useDelayedLoading(!isLoaded, 100);
  if (showHexSkeleton) {
    return <HexagonSkeleton />;
  }
  if (!isLoaded) {
    return null;
  }

  return (
    <CoreCard id="esagono" icon={Hexagon} title="Esagono Cognitivo">
      <div className="space-y-4">
        {profile ? (
          <>
            <CognitiveRadar appearance="core" profile={profile} />
            <div className="grid grid-cols-3 gap-3">
              {DIMENSIONS.map((d) => (
                <div
                  key={d.key}
                  className="core-surface core-radius border px-2 py-3 text-center"
                >
                  <div className="font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[#D8CFBC]">
                    {d.label}
                  </div>
                  <div className="text-base font-semibold tabular-nums text-white">
                    {profile[d.key]}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-2 py-6 text-center">
            <Brain className="mx-auto h-8 w-8 text-[#dadbdf]" aria-hidden="true" />
            <p className="body-medium text-[#dadbdf]">
              Non hai ancora calcolato il tuo Esagono Cognitivo.
            </p>
            <p className="body-small text-[#dadbdf]">
              Due minuti di domande per capire come studi: Erga userà il risultato per adattare le lezioni a te.
            </p>
          </div>
        )}

        <Button
          onClick={onOpenDiagnostic}
          className="core-ivory core-radius h-12 w-full font-semibold"
        >
          <Brain className="w-4 h-4 mr-2" aria-hidden="true" />
          {profile ? "Rifai il test" : "Calcola il tuo Esagono"}
        </Button>
      </div>
    </CoreCard>
  );
}
