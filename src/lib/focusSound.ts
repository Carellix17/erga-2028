let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || typeof window.AudioContext !== "function") return null;
  try {
    audioContext ??= new window.AudioContext();
    return audioContext;
  } catch {
    return null;
  }
}

/** Called directly from the user's Start gesture so later tones can play. */
export function unlockFocusSound(): void {
  const context = getAudioContext();
  if (!context || context.state === "running") return;
  void context.resume().catch(() => undefined);
}

/** A short, quiet two-note chime. Callers enforce visibility and sound settings. */
export function playFocusSound(): void {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume().catch(() => undefined);

  try {
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    gain.connect(context.destination);

    const first = context.createOscillator();
    first.type = "sine";
    first.frequency.setValueAtTime(880, now);
    first.connect(gain);
    first.start(now);
    first.stop(now + 0.12);

    const second = context.createOscillator();
    second.type = "sine";
    second.frequency.setValueAtTime(1174.66, now + 0.11);
    second.connect(gain);
    second.start(now + 0.11);
    second.stop(now + 0.25);
  } catch {
    // Audio is an enhancement; browser policy or hardware must not stop the timer.
  }
}
