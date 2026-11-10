import { afterEach, describe, expect, it } from "vitest";
import { isNestedScrollable, resistedDelta, WHEEL_RESISTANCE } from "@/components/layout/ScrollEdges";

describe("scroll edges", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("slows a wheel delta by 15 percent and converts lines and pages to pixels", () => {
    expect(WHEEL_RESISTANCE).toBe(0.85);
    expect(resistedDelta(100, WheelEvent.DOM_DELTA_PIXEL, 800)).toBe(85);
    expect(resistedDelta(2, WheelEvent.DOM_DELTA_LINE, 800)).toBe(2 * 16 * 0.85);
    expect(resistedDelta(1, WheelEvent.DOM_DELTA_PAGE, 800)).toBe(680);
  });

  it("skips a wheel whose target sits in a nested scroller", () => {
    const owner = document.createElement("div");
    const nested = document.createElement("div");
    const child = document.createElement("button");
    nested.style.overflowY = "auto";
    Object.defineProperty(nested, "scrollHeight", { configurable: true, value: 400 });
    Object.defineProperty(nested, "clientHeight", { configurable: true, value: 120 });
    nested.append(child);
    owner.append(nested);
    document.body.append(owner);

    expect(isNestedScrollable(child, owner, "y")).toBe(true);
    expect(isNestedScrollable(child, owner, "x")).toBe(false);
    expect(isNestedScrollable(owner, owner, "y")).toBe(false);
  });
});
