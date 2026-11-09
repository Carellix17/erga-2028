import { afterEach, describe, expect, it, vi } from "vitest";
import { setAppScrollTop } from "@/lib/appScroll";

describe("app scroll", () => {
  afterEach(() => {
    document.getElementById("app-scroll-view")?.remove();
    vi.restoreAllMocks();
  });

  it("puts the page at the top in one step, without a smooth scroll", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    setAppScrollTop(0);

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  });
});
