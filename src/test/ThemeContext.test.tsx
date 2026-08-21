import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";

function ThemeControls() {
  const { resolved, setTheme } = useTheme();
  return (
    <div>
      <span>{resolved}</span>
      <button onClick={() => setTheme("light")}>Light</button>
      <button onClick={() => setTheme("dark")}>Dark</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.removeItem("erga-theme");
    document.documentElement.classList.remove("dark");
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
  });

  it("aggiorna classe e theme-color in Light e Dark mode", async () => {
    render(<ThemeProvider><ThemeControls /></ThemeProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Dark" }));
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#05090A");

    fireEvent.click(screen.getByRole("button", { name: "Light" }));
    await waitFor(() => expect(document.documentElement).not.toHaveClass("dark"));
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute("content", "#fafafa");
  });
});
