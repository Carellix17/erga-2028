import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { buildCognitivePromptAddon } from "../../supabase/functions/_shared/cognitive";
import { assertAiAgeAllowed } from "../../supabase/functions/_shared/ageAccess";
import {
  PARENT_ACK_TEXT_VERSION,
  acceptOnboardingEta,
  calendarDateInRome,
  completedYears,
  decideAgeSubmission,
  planJustCreatedSocialDeletion,
} from "../../supabase/functions/_shared/ageCheck";
import { AGE_BLOCK_KEY, AGE_BLOCK_MS, ageBlockActive, rememberAgeBlock } from "@/lib/ageBlock";

const TODAY = "2026-11-19";
const NOW = "2026-11-19T10:00:00.000Z";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
}

function db(rows: Record<string, Record<string, unknown> | null | "error">) {
  return {
    from(table: string) {
      return {
        select() {
          return {
            eq() {
              return { maybeSingle: async () => answer(table) };
            },
            ilike() {
              return { maybeSingle: async () => answer(`${table}#email`) };
            },
          };
        },
      };
    },
  };

  function answer(key: string) {
    const row = rows[key];
    if (row === "error") return { data: null, error: { message: "db" } };
    return { data: row ?? null, error: null };
  }
}

describe("anni compiuti", () => {
  it("compie 14 anni oggi", () => {
    expect(completedYears("2012-11-19", TODAY)).toBe(14);
    const decision = decideAgeSubmission({
      birthDate: "2012-11-19",
      parentAck: true,
      today: TODAY,
      legacyUnder14: false,
      nowIso: NOW,
    });
    expect(decision.outcome).toBe("save");
    if (decision.outcome !== "save") return;
    expect(decision.row.is_14_plus).toBe(true);
    expect(decision.row.is_under_18).toBe(true);
    expect(decision.row.parent_ack_text_version).toBe(PARENT_ACK_TEXT_VERSION);
    expect(decision.row).not.toHaveProperty("birthDate");
    expect(JSON.stringify(decision.row)).not.toContain("2012-11-19");
  });

  it("ha 13 anni e 364 giorni", () => {
    expect(completedYears("2012-11-20", TODAY)).toBe(13);
    const decision = decideAgeSubmission({
      birthDate: "2012-11-20",
      parentAck: true,
      today: TODAY,
      legacyUnder14: false,
      nowIso: NOW,
    });
    expect(decision).toEqual({ outcome: "blocked_under_14" });
  });

  it("compie 18 anni oggi e il giorno prima ne ha 17", () => {
    expect(completedYears("2008-11-19", TODAY)).toBe(18);
    const adult = decideAgeSubmission({
      birthDate: "2008-11-19",
      parentAck: true,
      today: TODAY,
      legacyUnder14: false,
      nowIso: NOW,
    });
    expect(adult.outcome).toBe("save");
    if (adult.outcome !== "save") return;
    expect(adult.row.is_under_18).toBe(false);
    expect(adult.row.parent_ack).toBeNull();
    expect(adult.row.parent_ack_at).toBeNull();
    expect(adult.row.parent_ack_text_version).toBeNull();

    expect(completedYears("2008-11-20", TODAY)).toBe(17);
    const almost = decideAgeSubmission({
      birthDate: "2008-11-20",
      parentAck: false,
      today: TODAY,
      legacyUnder14: false,
      nowIso: NOW,
    });
    expect(almost).toEqual({ outcome: "needs_parent_ack" });
  });

  it("usa il calendario di Roma, non la mezzanotte UTC", () => {
    expect(calendarDateInRome(new Date("2026-11-19T22:30:00.000Z"))).toBe("2026-11-19");
    expect(calendarDateInRome(new Date("2026-11-19T23:30:00.000Z"))).toBe("2026-11-20");
  });

  it("rifiuta una data impossibile e un valore di onboarding sotto i 14", () => {
    expect(completedYears("2012-02-31", TODAY)).toBeNull();
    expect(acceptOnboardingEta(13)).toBeNull();
    expect(acceptOnboardingEta(8)).toBeNull();
    expect(acceptOnboardingEta(14)).toBe(14);
    const legacy = decideAgeSubmission({
      birthDate: "2000-01-01",
      parentAck: true,
      today: TODAY,
      legacyUnder14: true,
      nowIso: NOW,
    });
    expect(legacy).toEqual({ outcome: "legacy_block" });
  });
});

describe("rifiuto delle chiamate all'IA", () => {
  const userId = "11111111-1111-4111-8111-111111111111";

  it("rifiuta chi non ha ancora superato il controllo", async () => {
    const response = await assertAiAgeAllowed(db({}), userId);
    expect(response?.status).toBe(403);
    const body = await response?.json();
    expect(body.code).toBe("age_check_missing");
    expect(JSON.stringify(body)).not.toMatch(/birth|nascita|\d{4}-\d{2}-\d{2}/);
  });

  it("rifiuta un account già salvato con età o eta uguale a 13", async () => {
    const byAge = await assertAiAgeAllowed(db({
      user_profiles: { age: 13 },
      user_age_checks: { is_14_plus: true, is_under_18: false, parent_ack: null },
    }), userId);
    expect(byAge?.status).toBe(403);
    expect((await byAge?.json()).code).toBe("legacy_under_14");

    const byEta = await assertAiAgeAllowed(db({
      "cognitive_profiles#email": { eta: "13" },
    }), userId, "studente@example.com");
    expect(byEta?.status).toBe(403);
    expect((await byEta?.json()).code).toBe("legacy_under_14");
  });

  it("rifiuta chi ha tra 14 e 17 anni senza la casella", async () => {
    const response = await assertAiAgeAllowed(db({
      user_age_checks: { is_14_plus: true, is_under_18: true, parent_ack: null },
    }), userId);
    expect(response?.status).toBe(403);
    expect((await response?.json()).code).toBe("parent_ack_missing");
  });

  it("lascia passare chi ha almeno 18 anni e il controllo è registrato", async () => {
    const response = await assertAiAgeAllowed(db({
      user_age_checks: { is_14_plus: true, is_under_18: false, parent_ack: null },
      user_profiles: { age: 18 },
    }), userId);
    expect(response).toBeNull();
  });

  it("se il database non risponde, non chiama l'IA", async () => {
    const response = await assertAiAgeAllowed(db({ user_age_checks: "error" }), userId);
    expect(response?.status).toBe(500);
  });
});

describe("blocco locale e progetto di cancellazione", () => {
  it("dopo un rifiuto ricorda solo l'orario, per 24 ore", () => {
    const storage = memoryStorage();
    const now = Date.parse("2026-11-19T12:00:00.000Z");
    rememberAgeBlock(storage, now);
    expect(storage.data.get(AGE_BLOCK_KEY)).toBe(String(now + AGE_BLOCK_MS));
    expect(storage.data.get(AGE_BLOCK_KEY)).toMatch(/^\d+$/);
    expect(ageBlockActive(storage, now + AGE_BLOCK_MS - 1)).toBe(true);
    expect(ageBlockActive(storage, now + AGE_BLOCK_MS)).toBe(false);
  });

  it("la cancellazione progettata vale solo per l'account social appena creato", () => {
    const now = new Date("2026-11-19T12:00:00.000Z");
    const fresh = new Date(now.getTime() - 60_000).toISOString();
    expect(planJustCreatedSocialDeletion({
      provider: "google",
      accountCreatedAt: fresh,
      now,
      legacyUnder14: false,
      hasAgeCheck: false,
    })).toEqual({ execute: true, scope: "self_only" });

    expect(planJustCreatedSocialDeletion({
      provider: "apple",
      accountCreatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      now,
      legacyUnder14: false,
      hasAgeCheck: false,
    }).execute).toBe(false);

    expect(planJustCreatedSocialDeletion({
      provider: "google",
      accountCreatedAt: fresh,
      now,
      legacyUnder14: true,
      hasAgeCheck: false,
    })).toMatchObject({ execute: false, reason: "legacy_profile" });

    expect(planJustCreatedSocialDeletion({
      provider: "email",
      accountCreatedAt: fresh,
      now,
      legacyUnder14: false,
      hasAgeCheck: false,
    })).toMatchObject({ execute: false, reason: "not_social" });
  });
});

describe("il codice non manda l'età all'IA e non cancella account", () => {
  const root = join(__dirname, "..", "..");
  const read = (path: string) => readFileSync(join(root, path), "utf8");

  const aiFunctions = [
    "supabase/functions/chat/index.ts",
    "supabase/functions/lesson-chat/index.ts",
    "supabase/functions/study-tutor/index.ts",
    "supabase/functions/scientific-gym/index.ts",
    "supabase/functions/generate-exercises/index.ts",
    "supabase/functions/generate-lessons/index.ts",
    "supabase/functions/generate-lessons-demo/index.ts",
    "supabase/functions/generate-plan/index.ts",
    "supabase/functions/interrogazione/index.ts",
    "supabase/functions/web-search/index.ts",
    "supabase/functions/extract-pdf/index.ts",
    "supabase/functions/extract-lesson-figures/index.ts",
    "supabase/functions/text-to-speech/index.ts",
  ];

  it("ogni funzione che chiama l'IA controlla l'età", () => {
    for (const file of aiFunctions) {
      expect(read(file), file).toContain("assertAiAgeAllowed");
    }
  });

  it("la funzione del controllo non cancella utenti e non crea una colonna per la data", () => {
    const gate = read("supabase/functions/age-gate/index.ts");
    expect(gate).not.toMatch(/deleteUser|auth\.admin/);
    expect(gate).not.toMatch(/date_of_birth|birth_date/);
    const migration = read("supabase/migrations/20261119183000_user_age_checks.sql");
    expect(migration).not.toMatch(/date_of_birth|birth_date|DROP COLUMN/i);
    expect(migration).toContain("user_age_checks_select_own");
    expect(migration).not.toMatch(/FOR INSERT/);
  });

  it("il prompt cognitivo non contiene eta né l'id utente", () => {
    const source = read("supabase/functions/_shared/cognitive.ts");
    const selected = source.match(/\.select\("([^"]+)"\)/)?.[1] ?? "";
    expect(selected).not.toMatch(/\beta\b/);
    const prompt = buildCognitivePromptAddon({
      nome: null,
      istituto: null,
      eta: 13,
      log_score: 40,
      mem_score: 40,
      foc_score: 40,
      voc_score: 40,
      ans_score: 40,
      app_score: 40,
    } as never);
    expect(prompt).not.toContain("13");
    expect(prompt).not.toMatch(/user_id|userId/);
  });
});
