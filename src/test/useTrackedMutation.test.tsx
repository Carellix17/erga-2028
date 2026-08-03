import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SaveStatusProvider, useSaveStatus } from "@/contexts/SaveStatusContext";
import { useTrackedMutation } from "@/hooks/useTrackedMutation";

/**
 * 🧪 P19c — Collaudo dei bulloni universali: il CONTRATTO vero del wrapper
 * è che il contesto di onMutate scorra fino a onSuccess e che lo stato
 * globale arrivi a "saved" — in qualunque versione di react-query giri.
 */

let received: { data?: string; ctxTag?: string } = {};

function Probe() {
  const mutation = useTrackedMutation<string, Error, string, { tag: string }>({
    mutationFn: async (v) => `out-${v}`,
    onMutate: async (vars) => ({ tag: vars }),
    onSuccess: (data, _vars, ctx) => {
      received = { data, ctxTag: ctx?.tag };
    },
  });
  const { status } = useSaveStatus();
  return (
    <div>
      <span data-testid="stato">{status}</span>
      <button onClick={() => mutation.mutate("ciao")}>vai</button>
    </div>
  );
}

function mounted() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SaveStatusProvider>
        <Probe />
      </SaveStatusProvider>
    </QueryClientProvider>,
  );
}

describe("useTrackedMutation (P19c, bulloni universali)", () => {
  it("onMutate → contesto → onSuccess arriva intatto, e lo stato globale va a 'saved'", async () => {
    received = {};
    mounted();
    fireEvent.click(screen.getByText("vai"));

    await waitFor(() => expect(received.data).toBe("out-ciao"));
    expect(received.ctxTag).toBe("ciao");
    await waitFor(() => expect(screen.getByTestId("stato").textContent).toBe("saved"));
  });

  it("senza onMutate del chiamante, la mutazione funziona lo stesso (contesto undefined tollerato)", async () => {
    let ok = "";
    function Bare() {
      const m = useTrackedMutation<string, Error, string, { tag: string }>({
        mutationFn: async () => "fatto",
        onSuccess: (d) => { ok = d; },
      });
      return <button onClick={() => m.mutate("x")}>vai-bare</button>;
    }
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <SaveStatusProvider>
          <Bare />
        </SaveStatusProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByText("vai-bare"));
    await waitFor(() => expect(ok).toBe("fatto"));
  });
});
