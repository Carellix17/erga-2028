/**
 * Riferimento da scrivere nei log al posto di un identificativo.
 * Escono solo i primi 8 caratteri di un UUID. Un user_id legacy
 * (l'indirizzo email) e qualsiasi altro valore non escono.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function logRef(id: string | null | undefined): string {
  if (!id) return "n/a";
  const value = id.trim();
  if (!UUID_RE.test(value)) return "n/a";
  return value.slice(0, 8);
}
