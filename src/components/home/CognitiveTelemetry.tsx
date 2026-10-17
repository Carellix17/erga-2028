import { CognitiveRadar } from "@/components/core/CognitiveRadar";
import type { CognitiveProfile } from "@/hooks/useCognitiveProfile";

const dimensions = [
  ["log_score", "Logica"], ["mem_score", "Memoria"], ["foc_score", "Focus"],
  ["voc_score", "Lessico"], ["ans_score", "Calma"], ["app_score", "Pratica"],
] as const;

export function CognitiveTelemetry({ profile }: { profile: CognitiveProfile | null }) {
  return (
    <section aria-labelledby="cognitive-telemetry-title">
      <h2 id="cognitive-telemetry-title" className="text-xl font-semibold">Il tuo esagono</h2>
      {profile ? <>
        <div aria-hidden="true"><CognitiveRadar profile={profile} /></div>
        <dl className="grid grid-cols-2 gap-x-6 text-sm">
          {dimensions.map(([key, label]) => <div key={key} className="flex justify-between gap-2 border-t border-border py-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono font-semibold tabular-nums text-cognitive">{Math.round(profile[key])}<span className="font-sans font-normal text-muted-foreground">/100</span></dd>
          </div>)}
        </dl>
      </> : <p className="mt-4 text-base text-muted-foreground">Il profilo cognitivo non è disponibile in questo momento.</p>}
    </section>
  );
}
