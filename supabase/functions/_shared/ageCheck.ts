/**
 * Controllo dell'età minima (14 anni).
 *
 * La data di nascita arriva solo nel corpo della richiesta, serve a calcolare
 * gli anni compiuti e poi si scarta. Non entra in nessun oggetto da salvare,
 * non va nei log e non ha una colonna.
 *
 * Il giorno del controllo è quello di Roma: il beta è per studenti in Italia
 * e il compleanno si compie a mezzanotte italiana, non a UTC.
 */

export const MIN_AGE = 14;
export const ADULT_AGE = 18;
export const PARENT_ACK_TEXT_VERSION = "v1-2026-11-19";

/** Finestra in cui un account social appena nato può essere cancellato. */
export const JUST_CREATED_ACCOUNT_MS = 15 * 60 * 1000;

export const PARENT_ACK_LABEL =
  "Ho almeno 14 anni e i miei genitori sono d'accordo che io usi Erga.";

export interface AgeCheckRow {
  is_14_plus: true;
  is_under_18: boolean;
  age_checked_on: string;
  parent_ack: true | null;
  parent_ack_at: string | null;
  parent_ack_text_version: string | null;
}

export type AgeSubmitDecision =
  | { outcome: "invalid" }
  | { outcome: "legacy_block" }
  | { outcome: "blocked_under_14" }
  | { outcome: "needs_parent_ack" }
  | { outcome: "save"; row: AgeCheckRow };

export function calendarDateInRome(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

/** Anni compiuti fra due date YYYY-MM-DD. Null se la data non esiste o è assurda. */
export function completedYears(birthDate: string, today: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return null;
  }
  const [year, month, day] = birthDate.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export function showsParentCheckbox(years: number | null): boolean {
  return years !== null && years >= MIN_AGE && years < ADULT_AGE;
}

/** Eta dell'onboarding: il menu parte da 14 e il server rifiuta il resto. */
export function acceptOnboardingEta(eta: unknown): number | null {
  if (typeof eta !== "number" || !Number.isInteger(eta)) return null;
  if (eta < MIN_AGE || eta > 99) return null;
  return eta;
}

function storedInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  return null;
}

/** Account già presenti con età o eta sotto i 14 (oggi, nel menu, è 13). */
export function isLegacyUnder14(age: unknown, eta: unknown): boolean {
  const storedAge = storedInteger(age);
  const storedEta = storedInteger(eta);
  return (storedAge !== null && storedAge < MIN_AGE) || (storedEta !== null && storedEta < MIN_AGE);
}

export function decideAgeSubmission(input: {
  birthDate: unknown;
  parentAck: unknown;
  today: string;
  legacyUnder14: boolean;
  nowIso: string;
}): AgeSubmitDecision {
  if (input.legacyUnder14) return { outcome: "legacy_block" };
  if (typeof input.birthDate !== "string") return { outcome: "invalid" };
  const years = completedYears(input.birthDate, input.today);
  if (years === null) return { outcome: "invalid" };
  if (years < MIN_AGE) return { outcome: "blocked_under_14" };
  const under18 = years < ADULT_AGE;
  if (under18 && input.parentAck !== true) return { outcome: "needs_parent_ack" };
  return {
    outcome: "save",
    row: {
      is_14_plus: true,
      is_under_18: under18,
      age_checked_on: input.today,
      parent_ack: under18 ? true : null,
      parent_ack_at: under18 ? input.nowIso : null,
      parent_ack_text_version: under18 ? PARENT_ACK_TEXT_VERSION : null,
    },
  };
}

export type AiAccessCode =
  | "ok"
  | "legacy_under_14"
  | "age_check_missing"
  | "parent_ack_missing";

export function aiAccessDecision(input: {
  gate: { is_14_plus?: unknown; is_under_18?: unknown; parent_ack?: unknown } | null;
  legacyUnder14: boolean;
}): { allowed: boolean; code: AiAccessCode } {
  if (input.legacyUnder14) return { allowed: false, code: "legacy_under_14" };
  if (!input.gate || input.gate.is_14_plus !== true) {
    return { allowed: false, code: "age_check_missing" };
  }
  if (input.gate.is_under_18 === true && input.gate.parent_ack !== true) {
    return { allowed: false, code: "parent_ack_missing" };
  }
  return { allowed: true, code: "ok" };
}

export type SocialDeletionPlan =
  | { execute: true; scope: "self_only" }
  | {
      execute: false;
      reason: "existing_account" | "not_social" | "already_checked" | "legacy_profile" | "unknown_created_at";
    };

/**
 * Progetto della cancellazione immediata, solo per l'account social appena
 * creato in questa sessione. Non cancella nulla: la chiamata vera è una
 * decisione a parte del CEO. Gli account già esistenti (eta o age sotto 14)
 * non rientrano mai, anche se la data di creazione fosse recente.
 */
export function planJustCreatedSocialDeletion(input: {
  provider: string | null;
  accountCreatedAt: string | null;
  now: Date;
  legacyUnder14: boolean;
  hasAgeCheck: boolean;
}): SocialDeletionPlan {
  if (input.legacyUnder14) return { execute: false, reason: "legacy_profile" };
  if (input.hasAgeCheck) return { execute: false, reason: "already_checked" };
  const provider = (input.provider ?? "").toLowerCase();
  const social = provider === "google" || provider === "apple" || provider === "azure" || provider === "microsoft";
  if (!social) return { execute: false, reason: "not_social" };
  if (!input.accountCreatedAt) return { execute: false, reason: "unknown_created_at" };
  const created = Date.parse(input.accountCreatedAt);
  if (!Number.isFinite(created)) return { execute: false, reason: "unknown_created_at" };
  const elapsed = input.now.getTime() - created;
  if (elapsed < 0 || elapsed > JUST_CREATED_ACCOUNT_MS) {
    return { execute: false, reason: "existing_account" };
  }
  return { execute: true, scope: "self_only" };
}
