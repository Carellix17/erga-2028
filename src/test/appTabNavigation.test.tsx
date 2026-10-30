import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAppTab } from "@/hooks/useAppTab";
import { useOverlayHistory } from "@/hooks/useOverlayHistory";

function TabHarness() {
  const { activeTab, navigateToTab, navigateFromDock } = useAppTab();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <BottomNav activeTab={activeTab} onTabChange={navigateFromDock} />
      <output data-testid="active-tab">{activeTab}</output>
      <output data-testid="current-url">{location.pathname}{location.search}</output>
      <button type="button" onClick={() => navigate(-1)}>Browser back</button>
      <button type="button" onClick={() => navigateToTab("core")}>Automatic Core change</button>
      <button type="button" onClick={() => navigateToTab("studio", { replace: false })}>
        User-started lesson in Studio
      </button>
    </>
  );
}

function renderTabHarness(initialPath = "/app") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TabHarness />
    </MemoryRouter>,
  );
}

function LessonHistoryHarness() {
  const { activeTab, navigateFromDock } = useAppTab();
  const location = useLocation();
  const navigate = useNavigate();
  const [lessonOpen, setLessonOpen] = useState(false);
  const [historyBackRequest, setHistoryBackRequest] = useState(0);
  const handledBackRequestRef = useRef(0);
  const handleHistoryBack = useCallback(
    () => setHistoryBackRequest((request) => request + 1),
    [],
  );
  const { pushEntry, closeEntry } = useOverlayHistory(handleHistoryBack);

  useEffect(() => {
    if (historyBackRequest === handledBackRequestRef.current) return;
    handledBackRequestRef.current = historyBackRequest;
    setLessonOpen(false);
  }, [historyBackRequest]);

  return (
    <>
      <BottomNav activeTab={activeTab} onTabChange={navigateFromDock} />
      <output data-testid="active-tab">{activeTab}</output>
      <output data-testid="current-url">{location.pathname}{location.search}</output>
      {lessonOpen && <div role="dialog" aria-label="Lesson reader">Lesson</div>}
      <button type="button" onClick={() => { pushEntry(); setLessonOpen(true); }}>
        Open Studio lesson
      </button>
      <button type="button" onClick={() => { closeEntry(); setLessonOpen(false); }}>
        Close lesson
      </button>
      <button type="button" onClick={() => navigate(-1)}>Browser back</button>
    </>
  );
}

function renderLessonHistoryHarness(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <LessonHistoryHarness />
    </MemoryRouter>,
  );
}

function clickDockTab(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("nav button")).find(
    (candidate) => candidate.textContent?.trim().endsWith(label),
  );
  if (!button) throw new Error(`Dock tab not found: ${label}`);
  fireEvent.click(button);
}

async function expectActiveTab(tab: string, href: string, container: HTMLElement) {
  await waitFor(() => {
    expect(screen.getByTestId("active-tab").textContent).toBe(tab);
    expect(screen.getByTestId("current-url").textContent).toBe(href);
  });
  const activeButtons = Array.from(container.querySelectorAll('nav button[aria-current="page"]'));
  expect(activeButtons.length).toBeGreaterThan(0);
  const label = tab === "piano" ? "Piano" : tab[0].toUpperCase() + tab.slice(1);
  expect(activeButtons.every((button) => button.textContent?.trim().endsWith(label))).toBe(true);
}

describe("URL-backed primary tab navigation", () => {
  it("dock navigation pushes entries: browser Back walks Studio → Core → Piano → Home", async () => {
    const { container } = renderTabHarness();
    await expectActiveTab("home", "/app", container);

    clickDockTab(container, "Piano");
    await expectActiveTab("piano", "/app?tab=piano", container);
    clickDockTab(container, "Core");
    await expectActiveTab("core", "/app?tab=core", container);
    clickDockTab(container, "Studio");
    await expectActiveTab("studio", "/app?tab=studio", container);

    fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
    await expectActiveTab("core", "/app?tab=core", container);
    fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
    await expectActiveTab("piano", "/app?tab=piano", container);
    fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
    await expectActiveTab("home", "/app", container);
  });

  it("direct links and a fresh mount restore every tab and its active dock item", async () => {
    const directLinks = [
      ["home", "/app?tab=home"],
      ["piano", "/app?tab=piano"],
      ["core", "/app?tab=core"],
      ["studio", "/app?tab=studio"],
    ] as const;

    for (const [tab, href] of directLinks) {
      const page = renderTabHarness(href);
      await expectActiveTab(tab, href, page.container);
      page.unmount(); // a reload reads the selected tab back from the URL
    }
  });

  it("automatic tab changes replace history, while a user-started lesson preserves its source tab", async () => {
    const { container } = renderTabHarness();
    clickDockTab(container, "Piano");
    await expectActiveTab("piano", "/app?tab=piano", container);

    fireEvent.click(screen.getByRole("button", { name: "Automatic Core change" }));
    await expectActiveTab("core", "/app?tab=core", container);
    fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
    await expectActiveTab("home", "/app", container);

    fireEvent.click(screen.getByRole("button", { name: "User-started lesson in Studio" }));
    await expectActiveTab("studio", "/app?tab=studio", container);
    fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
    await expectActiveTab("home", "/app", container);
  });

  it("Back closes a Studio lesson reader before leaving the Studio tab", async () => {
    const { container } = renderLessonHistoryHarness(["/app", "/app?tab=studio"]);
    await expectActiveTab("studio", "/app?tab=studio", container);

    fireEvent.click(screen.getByRole("button", { name: "Open Studio lesson" }));
    expect(screen.getByRole("dialog", { name: "Lesson reader" })).toBeInTheDocument();
    await expectActiveTab("studio", "/app?tab=studio", container);

    fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Lesson reader" })).toBeNull());
    await expectActiveTab("studio", "/app?tab=studio", container);

    fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
    await expectActiveTab("home", "/app", container);
  });

  it("closing the Studio lesson reader consumes its history entry", async () => {
    const { container } = renderLessonHistoryHarness(["/app", "/app?tab=studio"]);
    fireEvent.click(screen.getByRole("button", { name: "Open Studio lesson" }));
    expect(screen.getByRole("dialog", { name: "Lesson reader" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close lesson" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Lesson reader" })).toBeNull());
    await expectActiveTab("studio", "/app?tab=studio", container);

    fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
    await expectActiveTab("home", "/app", container);
  });
});
