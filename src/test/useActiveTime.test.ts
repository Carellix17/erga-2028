import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useActiveTime } from "@/hooks/useActiveTime";

function setVisibilityState(state: "visible" | "hidden"): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: state,
  });
}

function dispatchVisibilityChange(state: "visible" | "hidden"): void {
  setVisibilityState(state);
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("useActiveTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-02T12:00:00.000Z"));
    setVisibilityState("visible");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    setVisibilityState("visible");
  });

  it("counts only the 60 seconds spent visible", () => {
    const { result } = renderHook(() => useActiveTime(true));

    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.getSeconds()).toBe(60);

    act(() => {
      dispatchVisibilityChange("hidden");
      vi.advanceTimersByTime(60_000);
      dispatchVisibilityChange("visible");
    });

    expect(result.current.getSeconds()).toBe(60);
  });

  it("stops at 120 idle seconds and resumes from the next input", () => {
    const { result } = renderHook(() => useActiveTime(true));

    act(() => vi.advanceTimersByTime(300_000));
    expect(result.current.getSeconds()).toBe(120);

    act(() => document.dispatchEvent(new Event("pointerdown")));
    act(() => vi.advanceTimersByTime(30_000));
    expect(result.current.getSeconds()).toBe(150);
  });

  it("reset clears the accumulated time and starts a new active window", () => {
    const { result } = renderHook(() => useActiveTime(true));

    act(() => vi.advanceTimersByTime(25_000));
    act(() => result.current.reset());
    expect(result.current.getSeconds()).toBe(0);

    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.getSeconds()).toBe(5);
  });
});
