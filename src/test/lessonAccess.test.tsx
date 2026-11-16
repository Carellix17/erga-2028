import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FullscreenLessonGate } from "@/components/studio/FullscreenLesson";
import { fetchLessonFull, retryLessonQuery } from "@/hooks/useLessons";
import { EdgeFetchError } from "@/lib/edgeFetch";
import i18n from "@/i18n";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ currentUser: "student-1" }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: "test-token" } } })) } },
}));

const denied = "FREE_LESSON_LIMIT: Con il piano Free puoi aprire le prime 5 lezioni di ogni corso. Passa a Pro per sbloccarle tutte.";
const clients: QueryClient[] = [];

function openLesson(order = 5) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 2, throwOnError: true, retryDelay: 0 } } });
  clients.push(client);
  const onClose = vi.fn();
  render(<QueryClientProvider client={client}><FullscreenLessonGate
    meta={{ id: "lesson-6", title: "Legami chimici", lesson_order: order, is_generated: true }}
    contextId="course-1" lessonNumber={order + 1} totalLessons={10}
    onClose={onClose} onComplete={vi.fn()} isLastLesson={false}
  /></QueryClientProvider>);
  return { onClose };
}

beforeEach(async () => { await i18n.changeLanguage("it"); });
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.restoreAllMocks(); });

describe("lesson access limit recovery", () => {
  it("keeps the first five lessons readable through the existing server contract", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ lesson: { id: `lesson-${body.lessonIndex}`, lesson_order: body.lessonIndex } }), { status: 200 });
    });
    for (let index = 0; index < 5; index++) {
      expect(await fetchLessonFull("student-1", "course-1", index)).toMatchObject({ lesson_order: index });
    }
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("makes exactly one request for the sixth lesson, exposes no content and lets the student leave", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: denied }), { status: 402 }));
    const { onClose } = openLesson();
    await screen.findByRole("alert");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("button", { name: "Riprova" })).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/app/impostazioni/account");
    fireEvent.click(screen.getByRole("button", { name: "Torna al percorso" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not repeat access-denied prefetches", () => {
    expect(retryLessonQuery(0, new EdgeFetchError(denied, 402))).toBe(false);
    expect(retryLessonQuery(0, new EdgeFetchError("Not authorized", 403))).toBe(false);
    expect(retryLessonQuery(0, new Error("offline"))).toBe(true);
    expect(retryLessonQuery(1, new Error("offline"))).toBe(false);
  });

  it("keeps a manual retry available for other loading failures", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "Unavailable" }), { status: 404 }));
    openLesson(0);
    fireEvent.click(await screen.findByRole("button", { name: "Riprova" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});