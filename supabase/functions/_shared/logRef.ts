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

/**
 * Diagnosi da mettere in un log al posto dell'oggetto errore.
 * Escono solo un codice breve, il nome della classe e lo status HTTP.
 * message e details restano fuori: possono citare email o testo del fornitore.
 */
export function logErrorDiag(error: unknown): { code: string; name?: string; status?: number } {
  if (typeof error !== "object" || error === null) return { code: "unknown" };
  const obj = error as { code?: unknown; name?: unknown; status?: unknown; statusCode?: unknown };
  const code = typeof obj.code === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(obj.code) ? obj.code : "unknown";
  const name = typeof obj.name === "string" && /^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(obj.name) ? obj.name : undefined;
  const statusRaw = typeof obj.status === "number" ? obj.status : obj.statusCode;
  const status = typeof statusRaw === "number" && statusRaw >= 100 && statusRaw <= 599 ? statusRaw : undefined;
  const out: { code: string; name?: string; status?: number } = { code };
  if (name) out.name = name;
  if (status !== undefined) out.status = status;
  return out;
}
