import type { FocusEndReason, FocusPhase } from "@/lib/focusClock";

export type DeviationReason = "slower" | "faster";

export interface DeviationPromptSignal {
  id: string;
  userId: string | null;
  reason: DeviationReason;
  subject: string;
  plannedMin: number;
  actualMin: number;
  evaluationId: string | null;
  contextId: string | null;
  createdAt: number;
}

export interface FocusBoundaryEvent {
  id: string;
  sessionKey: string;
  kind: "pause" | "ended";
  phase: FocusPhase;
  at: number;
  reason?: FocusEndReason;
}

let pendingSignals: readonly DeviationPromptSignal[] = [];
const emittedSignalIds = new Set<string>();
const shownSignalIds = new Set<string>();
const listeners = new Set<() => void>();

export function getPendingDeviationSignals(): readonly DeviationPromptSignal[] {
  return pendingSignals;
}

export function subscribeToDeviationSignals(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitDeviationPromptSignal(signal: DeviationPromptSignal): void {
  if (!signal.id || emittedSignalIds.has(signal.id)) return;
  emittedSignalIds.add(signal.id);
  pendingSignals = [...pendingSignals, signal].slice(-20);
  listeners.forEach((listener) => listener());
}

export function markDeviationPromptSignalShown(signalId: string): boolean {
  if (shownSignalIds.has(signalId)) return false;
  shownSignalIds.add(signalId);
  return true;
}

export function wasDeviationPromptSignalShown(signalId: string): boolean {
  return shownSignalIds.has(signalId);
}

export function acknowledgeDeviationPromptSignal(signalId: string): void {
  const next = pendingSignals.filter((signal) => signal.id !== signalId);
  if (next.length === pendingSignals.length) return;
  pendingSignals = next;
  listeners.forEach((listener) => listener());
}
