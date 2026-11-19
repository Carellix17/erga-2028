/** Blocco locale di 24 ore dopo un tentativo sotto i 14 anni. Solo un orario, niente data di nascita. */
export const AGE_BLOCK_KEY = "erga.ageGate.blockedUntil";
export const AGE_BLOCK_MS = 24 * 60 * 60 * 1000;

export interface AgeBlockStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function ageBlockActive(storage: AgeBlockStorage, now: number): boolean {
  try {
    const raw = storage.getItem(AGE_BLOCK_KEY);
    if (!raw || !/^\d+$/.test(raw)) return false;
    return Number(raw) > now;
  } catch {
    return false;
  }
}

export function rememberAgeBlock(storage: AgeBlockStorage, now: number): void {
  try {
    storage.setItem(AGE_BLOCK_KEY, String(now + AGE_BLOCK_MS));
  } catch {
    /* Se il browser rifiuta la memoria, la schermata di blocco resta comunque in questa visita. */
  }
}
