import { cn } from "@/lib/utils";
import type { CognitiveHexagonScores } from "@/lib/cognitiveArchetype";

/**
 * CognitiveHexagonSvg — esagono cognitivo minimalista in SVG puro.
 * Geometria esatta: 6 vertici, uno per dimensione (Logica, Memoria, Focus,
 * Lessico, Calma, Pratica in senso orario partendo dall'alto). Il raggio di
 * ogni vertice è proporzionale al punteggio reale 0-100. Nessun dato →
 * contorno tratteggiato (profilo da calibrare).
 */

export interface CognitiveHexagonSvgProps {
  scores?: CognitiveHexagonScores | null;
  className?: string;
}

const SIZE = 100;
const CENTER = SIZE / 2;
const MAX_RADIUS = 42;
const MIN_RADIUS = 8;

/** Vertici di un esagono regolare di raggio dato, puntato in alto. */
function hexPoints(radius: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (-90 + i * 60) * (Math.PI / 180);
    const x = CENTER + radius * Math.cos(angle);
    const y = CENTER + radius * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(" ");
}

const OUTER_RING = hexPoints(MAX_RADIUS);
const MID_RING = hexPoints(MAX_RADIUS * 0.66);
const INNER_RING = hexPoints(MAX_RADIUS * 0.33);

function clampScore(value: number | undefined | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** Vertici del profilo: raggio proporzionale al punteggio di ogni dimensione. */
function profilePoints(scores: CognitiveHexagonScores): string {
  const radii: number[] = [
    scores.logic,
    scores.memory,
    scores.focus,
    scores.vocabulary,
    scores.calm,
    scores.practice,
  ].map((score) => MIN_RADIUS + (clampScore(score) / 100) * (MAX_RADIUS - MIN_RADIUS));

  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (-90 + i * 60) * (Math.PI / 180);
    const x = CENTER + radii[i] * Math.cos(angle);
    const y = CENTER + radii[i] * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(" ");
}

export function CognitiveHexagonSvg({ scores, className }: CognitiveHexagonSvgProps) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={cn("h-20 w-20 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      {/* Profilo non calibrato: solo il conterno tratteggiato */}
      {!scores && (
        <polygon
          points={OUTER_RING}
          fill="none"
          stroke="hsl(var(--outline-variant))"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
      )}

      {/* Griglia di riferimento: tre esagoni concentrici neutri */}
      {scores && (
        <>
          <polygon points={INNER_RING} fill="none" stroke="hsl(var(--outline-variant))" strokeWidth={0.75} opacity={0.7} />
          <polygon points={MID_RING} fill="none" stroke="hsl(var(--outline-variant))" strokeWidth={0.75} opacity={0.7} />
          <polygon points={OUTER_RING} fill="none" stroke="hsl(var(--outline-variant))" strokeWidth={1} />
          {/* Il profilo reale: accento primario del brand */}
          <polygon
            points={profilePoints(scores)}
            fill="hsl(var(--primary))"
            fillOpacity={0.14}
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
