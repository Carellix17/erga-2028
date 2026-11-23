import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CognitiveRadar } from "@/components/core/CognitiveRadar";
import { roundPolygon } from "@/components/core/coreHexagon";

const profile = {
  log_score: 80,
  mem_score: 60,
  foc_score: 70,
  voc_score: 50,
  ans_score: 40,
  app_score: 65,
};

describe("esagono del Core", () => {
  it("smussa gli spigoli senza chiudere il poligono in un cerchio", () => {
    const path = roundPolygon(
      [
        [100, 0],
        [190, 40],
        [170, 130],
        [80, 150],
        [10, 90],
        [20, 30],
      ],
      8,
    );
    expect(path).toContain("Q ");
    expect(path.endsWith("Z")).toBe(true);
  });

  it("colora solo il profilo del Core in #48252F e lascia il radar precedente senza quel riempimento", () => {
    const core = render(<CognitiveRadar appearance="core" profile={profile} />);
    const shape = core.container.querySelector("[data-core-hexagon]");
    expect(shape?.getAttribute("fill")).toBe("#48252F");
    expect(shape?.getAttribute("d")).toContain("Q ");
    expect(core.container.querySelector("filter")).not.toBeNull();

    const home = render(<CognitiveRadar profile={profile} />);
    expect(home.container.querySelector("[data-core-hexagon]")).toBeNull();
  });
});
