import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Hexagon, SlidersHorizontal, Brain, Loader2, RotateCcw, Check } from "lucide-react";
import { useCognitiveProfile, type CognitiveProfile } from "@/hooks/useCognitiveProfile";
import { CognitiveRadar } from "./CognitiveRadar";
import { useToast } from "@/hooks/use-toast";

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
type Scores = Record<ScoreKey, number>;

const DEFAULT_SCORES: Scores = {
  log_score: 50,
  mem_score: 50,
  foc_score: 50,
  voc_score: 50,
  ans_score: 50,
  app_score: 50,
};

const scoresOf = (p: CognitiveProfile | null): Scores =>
  p
    ? {
        log_score: p.log_score,
        mem_score: p.mem_score,
        foc_score: p.foc_score,
        voc_score: p.voc_score,
        ans_score: p.ans_score,
        app_score: p.app_score,
      }
    : { ...DEFAULT_SCORES };

interface Props {
  /** Apre il questionario iniziale (gestito dalla schermata principale). */
  onOpenDiagnostic: () => void;
}

export function CognitiveHexagonEditor({ onOpenDiagnostic }: Props) {
  const { profile, isLoaded, save } = useCognitiveProfile();
  const { toast } = useToast();

  const [calibrating, setCalibrating] = useState(false);
  const [draft, setDraft] = useState<Scores>(DEFAULT_SCORES);
  const [saving, setSaving] = useState(false);

  const shown = calibrating ? draft : scoresOf(profile);

  const radarData = useMemo(
    () => DIMENSIONS.map((d) => ({ label: d.label, value: shown[d.key] })),
    [shown],
  );

  if (!isLoaded) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Caricamento Esagono Cognitivo">
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
      </div>
    );
  }

  // All'apertura della calibrazione si parte sempre dai valori attuali.
  const startCalibration = () => {
    setDraft(scoresOf(profile));
    setCalibrating(true);
  };

  const cancelCalibration = () => {
    setCalibrating(false);
    setDraft(scoresOf(profile));
  };

  const setScore = (key: ScoreKey, value: number) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    // La funzione cloud riscrive l'intera riga: inviamo anche i dati anagrafici
    // esistenti per non perderli durante il salvataggio manuale dei punteggi.
    const ok = await save({
      nome: profile?.nome ?? undefined,
      eta: profile?.eta ?? undefined,
      istituto: profile?.istituto ?? undefined,
      ...draft,
    });
    setSaving(false);
    if (ok) {
      setCalibrating(false);
      toast({ title: "Esagono aggiornato", description: "Le tue nuove impostazioni guideranno le prossime lezioni." });
    } else {
      toast({ title: "Salvataggio non riuscito", description: "Riprova tra poco.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Grafico + valori */}
      <div className="rounded-card bg-card border border-outline-variant/60 shadow-level-1 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Hexagon className="w-5 h-5 text-foreground" aria-hidden="true" />
          <h2 className="title-medium font-display text-foreground">Esagono Cognitivo</h2>
        </div>

        {profile ? (
          <>
            <LiveRadar data={radarData} />
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {DIMENSIONS.map((d) => (
                <div
                  key={d.key}
                  className="rounded-button bg-surface-container-high py-2 text-center"
                >
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {d.label}
                  </div>
                  <div className="text-base font-bold text-foreground tabular-nums">{shown[d.key]}</div>
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

        {!calibrating && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {profile && (
              <Button
                onClick={startCalibration}
                variant="outline"
                className="w-full rounded-button h-12 border border-outline-variant/60 bg-card hover:bg-surface-container-high shadow-level-1"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" aria-hidden="true" />
                Aggiusta parametri
              </Button>
            )}
            <Button
              onClick={onOpenDiagnostic}
              variant={profile ? "outline" : "default"}
              className="w-full rounded-button h-12 border border-outline-variant/60 bg-card hover:bg-surface-container-high shadow-level-1"
            >
              <Brain className="w-4 h-4 mr-2 text-foreground" aria-hidden="true" />
              {profile ? "Rifai il test" : "Calcola il tuo Esagono"}
            </Button>
          </div>
        )}
      </div>

      {/* Pannello di calibrazione manuale */}
      {calibrating && (
        <div
          className="rounded-card bg-card border border-outline-variant/60 shadow-level-1 p-5 space-y-5 animate-fade-up"
          role="group"
          aria-label="Calibrazione manuale dell'Esagono Cognitivo"
        >
          <div>
            <h3 className="title-medium font-display text-foreground">Aggiusta i parametri</h3>
            <p className="body-small text-muted-foreground">
              Muovi i cursori se senti che un valore non ti rappresenta. Il grafico si aggiorna in tempo reale.
            </p>
          </div>

          <div className="space-y-5">
            {DIMENSIONS.map((d) => (
              <div key={d.key}>
                <div className="flex items-baseline justify-between mb-2">
                  <span id={`slider-label-${d.key}`} className="label-large font-semibold text-foreground">
                    {d.label}
                  </span>
                  <span className="label-large text-muted-foreground tabular-nums" aria-hidden="true">
                    {draft[d.key]}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[draft[d.key]]}
                  onValueChange={(v) => setScore(d.key, v[0] ?? draft[d.key])}
                  thumbProps={{
                    "aria-labelledby": `slider-label-${d.key}`,
                    "aria-valuetext": `${draft[d.key]} su 100`,
                  }}
                  className="py-1"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={cancelCalibration}
              variant="outline"
              disabled={saving}
              className="flex-1 h-12 rounded-button"
            >
              <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
              Annulla
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 h-12 rounded-button">
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="w-4 h-4 mr-2" aria-hidden="true" />
              )}
              Salva parametri
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Radar con anteprima live durante la calibrazione. */
function LiveRadar({ data }: { data: { label: string; value: number }[] }) {
  const byLabel = Object.fromEntries(data.map((d) => [d.label, d.value]));
  const fake = {
    log_score: byLabel["Logica"] ?? 50,
    mem_score: byLabel["Memoria"] ?? 50,
    foc_score: byLabel["Focus"] ?? 50,
    voc_score: byLabel["Lessico"] ?? 50,
    ans_score: byLabel["Calma"] ?? 50,
    app_score: byLabel["Pratica"] ?? 50,
  } as Pick<CognitiveProfile, "log_score" | "mem_score" | "foc_score" | "voc_score" | "ans_score" | "app_score">;
  return <CognitiveRadar profile={fake} />;
}
