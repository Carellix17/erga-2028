import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPlanCard } from "@/components/settings/SettingsPlanCard";
import type { PlanTier } from "@/components/subscription/SubscriptionBadge";

// Il tier varia per test: la fabbrica del mock legge la variabile.
let mockTier: PlanTier = "free";
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: mockTier,
    isPro: mockTier === "pro",
    isBetaTester: mockTier === "beta",
    hasActiveSubscription: mockTier === "pro",
    loading: false,
  }),
}));
vi.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => ({ triggerLight: vi.fn() }),
}));

/**
 * La carta del piano nelle Impostazioni (decisione del proprietario,
 * 6 ottobre 2026): il piano esce dalla barra di stato e vive qui, in una
 * carta grande come le card dei corsi. «Passa a Pro» per i free apre per
 * ora un empty state onesto: siamo in rollout beta, nessun acquisto.
 */
describe("SettingsPlanCard", () => {
  beforeEach(() => {
    mockTier = "free";
  });

  it("utente free: nome del piano in serif, nota e azione Passa a Pro", () => {
    render(
      <MemoryRouter>
        <SettingsPlanCard />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Free" })).toHaveClass("font-display");
    expect(screen.getByText("Il tuo piano")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /passa a pro/i }),
    ).toBeInTheDocument();
  });

  it("Passa a Pro apre l'empty state del rollout beta (nessun flusso di pagamento)", () => {
    render(
      <MemoryRouter>
        <SettingsPlanCard />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /passa a pro/i }));

    expect(screen.getByText("Siamo ancora in rollout beta")).toBeInTheDocument();
    expect(screen.getByText(/nessun acquisto è possibile/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ho capito" })).toBeInTheDocument();
  });

  it("utente pro: mostra il piano attivo senza azione di upgrade", () => {
    mockTier = "pro";
    render(
      <MemoryRouter>
        <SettingsPlanCard />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /passa a pro/i })).not.toBeInTheDocument();
  });

  it("utente beta: riconosce l'accesso Pro senza azione di upgrade", () => {
    mockTier = "beta";
    render(
      <MemoryRouter>
        <SettingsPlanCard />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Beta" })).toBeInTheDocument();
    expect(screen.getByText(/grazie per il beta test/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /passa a pro/i })).not.toBeInTheDocument();
  });

  it("usa il token cedro del design system, non una tinta libera", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const css = fs.readFileSync(path.join(process.cwd(), "src/index.css"), "utf8");
    const card = fs.readFileSync(
      path.join(process.cwd(), "src/components/settings/SettingsPlanCard.tsx"),
      "utf8",
    );
    // il campo è il token documentato in DESIGN.md 2.1 §4 (#DCE879)
    expect(css).toContain("--cedro: 67 71% 69%");
    expect(card).toContain("hsl(var(--cedro))");
    // e la carta usa la grana condivisa, come le copertine
    expect(card).toContain("cover-grain");
  });
});
