import type { LessonReadingLogRow } from "./types";
import { normalizeSubjectName, type SubjectType } from "./subjectType";

export type ReadingSpeedSample = Pick<
  LessonReadingLogRow,
  "active_seconds" | "base_estimate_min" | "completed_at" | "subject" | "subject_type"
>;

export interface SpeedExplanation {
  subject: string;
  factor: number;
  n: number;
}

export interface SpeedFactorEstimate {
  factor: number;
  n: number;
  explanation: SpeedExplanation;
}

const MIN_ACTIVE_SECONDS = 60;
const MIN_VALID_RATIO = 0.25;
const MAX_VALID_RATIO = 4;
const MIN_FACTOR = 0.5;
const MAX_FACTOR = 2;
const SUBJECT_SAMPLE_LIMIT = 10;
const TYPE_SAMPLE_LIMIT = 20;
const TYPE_PRIOR_WEIGHT = 5;

/** Raw elapsed-vs-estimated ratio for one reading log. */
export function ratio(sample: Pick<ReadingSpeedSample, "active_seconds" | "base_estimate_min">): number {
  return (sample.active_seconds / 60) / sample.base_estimate_min;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function asOfTimestamp(asOf: Date | string | undefined): number | null {
  if (asOf === undefined) return null;
  const parsed = asOf instanceof Date ? asOf.getTime() : Date.parse(asOf);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortedValidSamples(
  samples: readonly ReadingSpeedSample[],
  asOf: Date | string | undefined,
): Array<{ sample: ReadingSpeedSample; ratio: number; completedAt: number; index: number }> {
  const cutoff = asOfTimestamp(asOf);
  const valid: Array<{ sample: ReadingSpeedSample; ratio: number; completedAt: number; index: number }> = [];

  samples.forEach((sample, index) => {
    if (sample.active_seconds < MIN_ACTIVE_SECONDS) return;

    const sampleRatio = ratio(sample);
    if (
      !Number.isFinite(sampleRatio) ||
      sampleRatio < MIN_VALID_RATIO ||
      sampleRatio > MAX_VALID_RATIO
    ) {
      return;
    }

    const completedAt = timestamp(sample.completed_at);
    if (cutoff !== null && completedAt > cutoff) return;

    valid.push({
      sample,
      ratio: Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, sampleRatio)),
      completedAt,
      index,
    });
  });

  return valid.sort((a, b) => a.completedAt - b.completedAt || a.index - b.index);
}

/**
 * Estimates a subject's speed from its latest valid logs and a type-level prior.
 * `asOf`, when supplied, excludes future-dated logs; no wall-clock time is read.
 */
export function calculateSpeedFactor(
  subject: string,
  type: SubjectType,
  samples: readonly ReadingSpeedSample[],
  asOf?: Date | string,
): SpeedFactorEstimate {
  const normalizedSubject = normalizeSubjectName(subject);
  const validSamples = sortedValidSamples(samples, asOf);

  const allSubjectSamples = validSamples
    .filter(({ sample }) => normalizeSubjectName(sample.subject ?? "") === normalizedSubject);
  const subjectSamples = allSubjectSamples.slice(-SUBJECT_SAMPLE_LIMIT);
  const n = allSubjectSamples.length;
  const subjectFactor = median(subjectSamples.map(({ ratio: value }) => value)) ?? 1;

  const typeSamples = validSamples
    .filter(({ sample }) =>
      sample.subject_type === type &&
      sample.subject !== null &&
      normalizeSubjectName(sample.subject) !== normalizedSubject
    )
    .slice(-TYPE_SAMPLE_LIMIT);
  const typeFactor = median(typeSamples.map(({ ratio: value }) => value)) ?? 1;
  const factor = (n * subjectFactor + TYPE_PRIOR_WEIGHT * typeFactor) / (n + TYPE_PRIOR_WEIGHT);

  return {
    factor,
    n,
    explanation: {
      subject,
      factor: Math.round(factor * 10) / 10,
      n,
    },
  };
}

/** Alias for callers that prefer the shorter name. */
export const speedFactor = calculateSpeedFactor;

/** Free plans keep the baseline; Pro plans apply the personalized speed factor. */
export function estimateMinutes(base: number, factor: number, isPro: boolean): number {
  return isPro ? Math.ceil(base * factor) : base;
}
