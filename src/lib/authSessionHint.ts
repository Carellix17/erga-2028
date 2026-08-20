import { safeStorage } from "./safeStorage";

/**
 * Indizio *sincrono*: su questo device esiste una sessione Supabase salvata?
 *
 * Serve alla landing per decidere in un tick, senza aspettare la rete:
 * - visitatore anonimo  → marketing subito, l'hero è l'LCP
 * - utente che rientra  → splash brevissimo, così non vede la pagina
 *                          pubblica lampeggiare prima del redirect a /app
 *
 * Non è una verifica di validità del token e non deve diventarlo: l'unica
 * fonte di verità resta AuthContext. La chiave non è hardcodata perché
 * supabase-js la deriva dal project ref (`sb-<ref>-auth-token`).
 */
export function hasStoredSessionHint(): boolean {
  try {
    for (let i = 0; i < safeStorage.length; i += 1) {
      const key = safeStorage.key(i);
      if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
      const raw = safeStorage.getItem(key);
      if (raw && raw !== "null" && raw.length > 2) return true;
    }
  } catch {
    /* storage inaccessibile → trattiamo il visitatore come anonimo */
  }
  return false;
}
