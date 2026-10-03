import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { ScientificGymView } from "../components/pratica/ScientificGymView";

// 🏋️ PERCORSI 2.0 — collaudo della Palestra scientifica: il cancello per
// le materie, il flusso di allenamento e la chat socratica (con il backend
// sostituito da risposte finte).

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: "tok" } } })),
      getUser: vi.fn(async () => ({ data: { user: { id: "u1" } } })),
    },
  },
}));

const EXERCISES = [
  {
    id: "ex-1", kind: "drill", topic: "Cinematica",
    text: "Un'auto accelera a $2\\,m/s^2$ per $4\\,s$: quale velocità raggiunge?",
    answerValue: 8, answerUnit: "m/s", tolerance: 0.05,
    steps: ["v = a \\cdot t", "v = 2 \\cdot 4 = 8\\,m/s"],
    hints: ["Quale formula lega v, a e t?"],
  },
  {
    id: "ex-2", kind: "problem", topic: "Dinamica",
    text: "Un blocco di $2\\,kg$ viene spinto con $10\\,N$: quale accelerazione?",
    answerValue: 5, answerUnit: "m/s²", tolerance: 0.05,
    steps: ["F = m \\cdot a", "a = 10/2 = 5\\,m/s²"],
    hints: ["Seconda legge di Newton"],
  },
];

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function installFetch(mock: FetchMock) {
  vi.stubGlobal("fetch", vi.fn(mock) as unknown as typeof fetch);
}

/** Route finto del backend: listContexts (get-lessons) + scientific-gym. */
function backendMock(opts: { family?: string; socraticReply?: string } = {}): FetchMock {
  return async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body || "{}"));
    if (url.includes("get-lessons") && body.action === "listContexts") {
      return new Response(JSON.stringify({
        contexts: [
          { id: "ctx-letter", subject_family: "letteratura", module_titles: ["I promessi sposi"] },
          { id: "ctx-sci-1", subject_family: "scientifiche", module_titles: ["Le forze"] },
          { id: "ctx-sci-2", subject_family: "scientifiche", module_titles: ["Le forze"] },
          { id: "ctx-sci-3", subject_family: "scientifiche", module_titles: ["Le forze"] },
          { id: "ctx-err", subject_family: "scientifiche", module_titles: null },
        ],
      }), { status: 200 });
    }
    if (url.includes("scientific-gym") && body.action === "generate") {
      return new Response(JSON.stringify({ exercises: EXERCISES }), { status: 200 });
    }
    if (url.includes("scientific-gym") && body.action === "socratic") {
      return new Response(JSON.stringify({ reply: opts.socraticReply ?? "Quali dati ti dà il testo?" }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };
}

function jsonOk(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200 });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("🏋️ il cancello: solo materie scientifiche", () => {
  it("percorso NON scientifico → messaggio e nessun allenamento", async () => {
    installFetch(backendMock({ family: "letteratura" }));
    const { queryByText, findByText } = render(
      <ScientificGymView contextId="ctx-letter" contextName="Promessi Sposi" />,
    );
    expect(await findByText(/solo per i percorsi di matematica/i)).toBeTruthy();
    expect(queryByText("Prepara l'allenamento")).toBeNull();
  });
});

describe("🏋️ il flusso di allenamento", () => {
  it("si genera la serie, si risponde bene e si avanza", async () => {
    installFetch(backendMock());
    const { getByText, findByText, getByLabelText, queryByText } = render(
      <ScientificGymView contextId="ctx-sci-1" contextName="Fisica" />,
    );

    // la scheda iniziale offre i moduli e il via
    fireEvent.click(await findByText("Prepara l'allenamento"));
    expect(await findByText(/Esercizio 1 di 2/)).toBeTruthy();
    expect(getByText("Cinematica")).toBeTruthy();

    // risposta giusta (8 m/s) → esito e Avanti
    fireEvent.change(getByLabelText(/la tua risposta/i), { target: { value: "8" } });
    fireEvent.click(getByText("Verifica"));
    expect(await findByText("Corretto.")).toBeTruthy();
    fireEvent.click(getByText("Avanti"));

    // secondo esercizio: problema
    expect(await findByText(/Esercizio 2 di 2/)).toBeTruthy();
    expect(getByText("Dinamica")).toBeTruthy();
    expect(queryByText("Corretto.")).toBeNull();
  });

  it("risposta sbagliata → suggerimento, soluzione e punteggio onesto", async () => {
    installFetch(backendMock());
    const { getByText, findByText, getByLabelText } = render(
      <ScientificGymView contextId="ctx-sci-2" contextName="Fisica" />,
    );
    fireEvent.click(await findByText("Prepara l'allenamento"));
    await findByText(/Esercizio 1 di 2/);

    // risposta sbagliata
    fireEvent.change(getByLabelText(/la tua risposta/i), { target: { value: "3" } });
    fireEvent.click(getByText("Verifica"));
    expect(await findByText("Non è così.")).toBeTruthy();

    // suggerimento progressivo
    fireEvent.click(getByText("Suggerimento"));
    expect(await findByText(/Quale formula lega/)).toBeTruthy();

    // soluzione passo-passo con il risultato finale
    fireEvent.click(getByText("Mostra la soluzione"));
    expect(await findByText("Soluzione", { exact: true })).toBeTruthy();
    expect(getByText(/→ 8 m\/s/)).toBeTruthy();

    // fine serie → risultato 0/2 al primo colpo (si è sbirciato)
    fireEvent.click(getByText("Avanti"));
    fireEvent.change(getByLabelText(/la tua risposta/i), { target: { value: "5" } });
    fireEvent.click(getByText("Verifica"));
    await findByText("Corretto.");
    fireEvent.click(getByText("Vedi risultato"));
    expect(await findByText("1/2")).toBeTruthy();
    expect(getByText(/1 su 2 risolti al primo colpo/i)).toBeTruthy();
  });

  it("la chat socratica: si apre, si scrive, il tutor risponde senza dare la soluzione", async () => {
    installFetch(backendMock({ socraticReply: "Hai usato 3: da dove viene quel numero? Riparti dai dati." }));
    const { getByText, findByText, getByLabelText, getByRole } = render(
      <ScientificGymView contextId="ctx-sci-3" contextName="Fisica" />,
    );
    fireEvent.click(await findByText("Prepara l'allenamento"));
    await findByText(/Esercizio 1 di 2/);

    // si apre dopo un errore
    fireEvent.change(getByLabelText(/la tua risposta/i), { target: { value: "3" } });
    fireEvent.click(getByText("Verifica"));
    await findByText("Non è così.");
    fireEvent.click(getByText("Chiedi al tutor"));

    const input = await findByText(/Partiamo da quello che sai/i) && getByLabelText(/scrivi al tutor/i);
    fireEvent.change(input, { target: { value: "ho fatto 2+1" } });
    fireEvent.click(getByRole("button", { name: "Invia" }));

    await waitFor(() => {
      expect(getByText(/da dove viene quel numero/i)).toBeTruthy();
    });
  });

  it("backend in difficoltà → messaggio d'errore e ritorno alla scheda iniziale", async () => {
    installFetch(async (input) => {
      const url = String(input);
      if (url.includes("get-lessons")) return jsonOk({ contexts: [{ id: "ctx-err", subject_family: "scientifiche", module_titles: null }] });
      return new Response(JSON.stringify({ error: "no" }), { status: 500 });
    });
    const { getByText, findByText } = render(
      <ScientificGymView contextId="ctx-err" contextName="Fisica" />,
    );
    fireEvent.click(await findByText("Prepara l'allenamento"));
    expect(await findByText(/non è riuscito a preparare/i)).toBeTruthy();
    expect(getByText("Prepara l'allenamento")).toBeTruthy();
  });
});
