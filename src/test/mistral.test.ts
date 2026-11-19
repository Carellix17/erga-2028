import { readFileSync } from "fs";
import { describe, expect, it, vi } from "vitest";
import {
  MISTRAL_CHAT_COMPLETIONS_URL,
  MISTRAL_GA_MODELS,
  MISTRAL_PUBLIC_PREVIEW_MODELS,
  classifyMistralModel,
  dispatchMistral,
  mistralUsageInsert,
  planMistralCall,
  type MistralCallPlan,
} from "../../supabase/functions/_shared/mistral";

const KEY = "test-mistral-key-not-real";
const USER_ID = "123e4567-e89b-12d3-a456-426614174000";

function httpHostnames(source: string): string[] {
  const hosts: string[] = [];
  for (const match of source.matchAll(/https?:\/\/[^\s"'`<>)]+/g)) {
    try {
      hosts.push(new URL(match[0]).hostname);
    } catch {
      hosts.push("invalid");
    }
  }
  return hosts;
}

const LESSON = [
  {
    role: "system",
    content: [
      "PERSONALIZZAZIONE COGNITIVA (Esagono dello studente — Giulia)",
      `user_id: ${USER_ID}`,
      "cognitive_profiles.eta: 15",
      'first_name: "Giulia"',
      "Spiega in modo chiaro.",
    ].join("\n"),
  },
  {
    role: "user",
    content: `Lo studente si chiama "Giulia". Chiamalo per nome quando interagisci.
Scrivi a giulia.rossi@liceo.it
età: 15
Spiega la mitosi.`,
  },
];

function readyPlan(overrides: Partial<Parameters<typeof planMistralCall>[0]> = {}): MistralCallPlan {
  return planMistralCall({
    providerEnv: "mistral",
    apiKey: KEY,
    modelEnv: undefined,
    fn: "chat",
    messages: [{ role: "user", content: "Spiega la mitosi." }],
    ...overrides,
  });
}

describe("flag Mistral spento", () => {
  it.each([undefined, "", "   ", "gemini", "GEMINI", "on", "true", "1"])(
    "con provider %s non prepara né esegue una chiamata",
    async (providerEnv) => {
      const plan = planMistralCall({
        providerEnv,
        apiKey: KEY,
        modelEnv: "mistral-small-2603",
        fn: "chat",
        messages: LESSON,
      });
      expect(plan.call).toBe(false);
      if (!plan.call) expect(plan.reason).toBe("flag-off");
      const fetchImpl = vi.fn();
      await expect(dispatchMistral(plan, KEY, fetchImpl)).resolves.toBeNull();
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("con il flag acceso ma senza chiave non chiama", async () => {
    for (const apiKey of [undefined, "", "   "]) {
      const plan = planMistralCall({
        providerEnv: "mistral",
        apiKey,
        modelEnv: undefined,
        fn: "generate-lessons",
        messages: LESSON,
      });
      expect(plan.call).toBe(false);
      if (!plan.call) expect(plan.reason).toBe("no-key");
      const fetchImpl = vi.fn();
      await dispatchMistral(plan, apiKey ?? "", fetchImpl);
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });
});

describe("lista chiusa dei modelli", () => {
  it("accetta solo i due id GA fissi", () => {
    expect(MISTRAL_GA_MODELS).toEqual(["mistral-small-2603", "ministral-8b-2512"]);
    expect(classifyMistralModel("mistral-small-2603").status).toBe("allowed");
    expect(classifyMistralModel("  Ministral-8B-2512  ").status).toBe("allowed");
  });

  it("rifiuta labs-, gli alias -latest e i Public Preview, anche se arrivano dall'ambiente", () => {
    const refused = [
      ["labs-mistral-small-creative", "labs"],
      ["labs-devstral-small-2512", "labs"],
      ["LABS-leanstral-2603", "labs"],
      ["mistral-small-latest", "latest"],
      ["ministral-8b-latest", "latest"],
      ["mistral-ocr-latest", "latest"],
      ["deepseek-v4-1-flash-1017", "public-preview"],
      ["voxtral-mini-tts-3-0", "public-preview"],
      ["voxtral-small-transcribe-3-0", "public-preview"],
      ["mistral-large-4", "not-allowlisted"],
      ["ministral-3b-2512", "not-allowlisted"],
      ["mistral-medium-3-5", "not-allowlisted"],
    ] as const;

    for (const [modelEnv, rejection] of refused) {
      const classified = classifyMistralModel(modelEnv);
      expect(classified.status).toBe("rejected");
      if (classified.status === "rejected") expect(classified.rejection).toBe(rejection);
      const plan = planMistralCall({
        providerEnv: "mistral",
        apiKey: KEY,
        modelEnv,
        fn: "chat",
        messages: LESSON,
      });
      expect(plan.call).toBe(false);
      if (!plan.call) {
        expect(plan.reason).toBe("model-rejected");
        expect(plan.rejection).toBe(rejection);
      }
    }
  });

  it("conosce i Public Preview documentati il 19/11/2026", () => {
    expect(MISTRAL_PUBLIC_PREVIEW_MODELS).toContain("deepseek-v4-1-flash-1017");
    expect(MISTRAL_PUBLIC_PREVIEW_MODELS).toContain("voxtral-mini-transcribe-realtime-3-0");
  });

  it("senza MISTRAL_MODEL usa Small 4, e Ministral 8B per gli esercizi", () => {
    const chat = readyPlan({ fn: "chat" });
    const exercises = readyPlan({ fn: "generate-exercises" });
    expect(chat.call && chat.model).toBe("mistral-small-2603");
    expect(exercises.call && exercises.model).toBe("ministral-8b-2512");
  });

  it("un id ammesso in MISTRAL_MODEL sostituisce il default della funzione", () => {
    const plan = readyPlan({ fn: "generate-exercises", modelEnv: "mistral-small-2603" });
    expect(plan.call && plan.model).toBe("mistral-small-2603");
  });

  it("lascia la palestra scientifica sulla catena attuale", () => {
    for (const fn of ["scientific-gym", "scientific-gym-socratic"]) {
      const plan = readyPlan({ fn });
      expect(plan.call).toBe(false);
      if (!plan.call) expect(plan.reason).toBe("out-of-scope");
    }
  });
});

describe("endpoint UE e corpo della richiesta", () => {
  it("punta solo a api.eu.mistral.ai e non mette la chiave nell'URL o nel corpo", async () => {
    const plan = readyPlan({ temperature: 0.2, maxTokens: 300, stream: true });
    expect(plan.call).toBe(true);
    if (!plan.call) return;
    expect(plan.url).toBe("https://api.eu.mistral.ai/v1/chat/completions");
    expect(plan.url).toBe(MISTRAL_CHAT_COMPLETIONS_URL);
    expect(plan.url.includes(KEY)).toBe(false);
    expect(JSON.stringify(plan.body).includes(KEY)).toBe(false);
    expect(plan.body.stream).toBe(true);
    expect(plan.body.temperature).toBe(0.2);
    expect(plan.body.max_tokens).toBe(300);

    const fetchImpl = vi.fn(async (url: string, init: { method: string; headers: Record<string, string>; body: string }) => {
      void url;
      void init;
      return new Response("{}", { status: 200 });
    });
    await dispatchMistral(plan, KEY, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.eu.mistral.ai/v1/chat/completions");
    expect(url.includes("?")).toBe(false);
    expect(url.includes(KEY)).toBe(false);
    expect(init.body.includes(KEY)).toBe(false);
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(init.body).model).toBe("mistral-small-2603");
  });

  it("nel sorgente ogni URL Mistral ha l'host europeo, confrontato per intero", () => {
    const files = [
      "supabase/functions/_shared/mistral.ts",
      "supabase/functions/_shared/ai.ts",
    ];
    let sawEu = false;
    for (const file of files) {
      for (const host of httpHostnames(readFileSync(file, "utf8"))) {
        const registrable = host.split(".").slice(-2).join(".");
        if (registrable !== "mistral.ai") continue;
        expect(host).toBe("api.eu.mistral.ai");
        sawEu = true;
      }
    }
    expect(sawEu).toBe(true);
  });

  it("manda solo il testo necessario: niente nome, email, user id o età accanto all'id", () => {
    const plan = readyPlan({ messages: LESSON, fn: "lesson-chat" });
    expect(plan.call).toBe(true);
    if (!plan.call) return;
    const body = JSON.stringify(plan.body);
    expect(body).toContain("Spiega la mitosi");
    expect(body).toContain("Spiega in modo chiaro");
    expect(body).not.toContain("Giulia");
    expect(body).not.toContain("giulia.rossi@liceo.it");
    expect(body).not.toContain("@");
    expect(body).not.toContain(USER_ID);
    expect(body).not.toContain("user_id");
    expect(body).not.toContain("userId");
    expect(body).not.toContain("cognitive_profiles");
    expect(body).not.toContain("eta");
    expect(body).not.toContain("età");
    expect(body).not.toContain("15");
    expect(body).not.toContain(KEY);
  });

  it("tiene l'età in un testo di studio se non c'è un id utente", () => {
    const plan = readyPlan({
      messages: [{ role: "user", content: "L'età moderna inizia nel Quattrocento. Riassumi." }],
    });
    expect(plan.call).toBe(true);
    if (!plan.call) return;
    expect(plan.body.messages[0].content).toContain("età moderna");
  });

  it("toglie le immagini e non inoltra il base64", () => {
    const plan = readyPlan({
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Che formula è questa?" },
          { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
        ],
      }],
    });
    expect(plan.call).toBe(true);
    if (!plan.call) return;
    const body = JSON.stringify(plan.body);
    expect(body).toContain("Che formula è questa?");
    expect(body).not.toContain("image_url");
    expect(body).not.toContain("base64");
  });

  it("rifiuta la chiamata se la chiave finisce nel testo", async () => {
    const plan = readyPlan({
      messages: [{ role: "user", content: `La chiave è ${KEY}` }],
    });
    const fetchImpl = vi.fn();
    await expect(dispatchMistral(plan, KEY, fetchImpl)).rejects.toThrow("mistral-request-refused");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("registro costi", () => {
  it("scrive provider mistral sui campi già presenti, senza colonne nuove", () => {
    const row = mistralUsageInsert("ministral-8b-2512", {
      usage: {
        prompt_tokens: 20,
        completion_tokens: 8,
        total_tokens: 28,
        prompt_tokens_details: { cached_tokens: 12 },
      },
    });
    expect(row).toEqual({
      provider: "mistral",
      model: "ministral-8b-2512",
      prompt_tokens: 20,
      completion_tokens: 8,
      total_tokens: 28,
    });
    expect(Object.keys(row).sort()).toEqual([
      "completion_tokens",
      "model",
      "prompt_tokens",
      "provider",
      "total_tokens",
    ]);
  });
});
