import type { WidgetSpec } from "@/lib/widgets";
import { ParabolaWidget } from "./ParabolaWidget";
import { LineWidget } from "./LineWidget";
import { ProjectileWidget } from "./ProjectileWidget";
import { InclinedPlaneWidget } from "./InclinedPlaneWidget";
import { PhWidget } from "./PhWidget";
import { GasWidget } from "./GasWidget";
import { MarketWidget } from "./MarketWidget";
import { CodeRunnerWidget } from "./CodeRunnerWidget";

/**
 * 🎛️ IL CENTRALINO: dato il bigliettino (già validato da sanitizeWidgetSpec),
 * monta il widget giusto. Tipo non previsto → niente (la slide resta pulita).
 */
export function LessonWidget({ spec }: { spec: WidgetSpec }) {
  switch (spec.type) {
    case "parabola":
      return <ParabolaWidget spec={spec} />;
    case "retta":
      return <LineWidget spec={spec} />;
    case "proiettile":
      return <ProjectileWidget spec={spec} />;
    case "piano-inclinato":
      return <InclinedPlaneWidget spec={spec} />;
    case "ph":
      return <PhWidget spec={spec} />;
    case "gas":
      return <GasWidget spec={spec} />;
    case "mercato":
      return <MarketWidget spec={spec} />;
    case "codice":
      return <CodeRunnerWidget spec={spec} />;
    default:
      return null;
  }
}
