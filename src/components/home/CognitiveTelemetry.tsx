import { CognitiveRadar } from "@/components/core/CognitiveRadar";
import type { CognitiveProfile } from "@/hooks/useCognitiveProfile";

export function CognitiveTelemetry({ profile }: { profile: CognitiveProfile | null }) {
  return (
    <section className="min-w-0" aria-labelledby="cognitive-telemetry-title">
      <h2 id="cognitive-telemetry-title" className="text-base font-semibold leading-tight sm:text-lg">
        Il tuo esagono
      </h2>
      {profile ? (
        <div aria-hidden="true" className="mx-auto mt-1 w-full max-w-[13rem]">
          <CognitiveRadar profile={profile} showLabels={false} className="h-36" />
        </div>
      ) : (
        <p className="mt-3 break-words text-sm leading-snug text-muted-foreground">
          Il profilo cognitivo non è disponibile in questo momento.
        </p>
      )}
    </section>
  );
}
