import { fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RoomClarify } from "@/components/shared/RoomClarify";

type FakeAnimation = {
  playState: "running" | "finished" | "idle";
  cancelled: boolean;
  cancel: () => void;
  onfinish: (() => void) | null;
};

function installAnimate() {
  const calls: Keyframe[][] = [];
  const originals = {
    animate: HTMLElement.prototype.animate,
    getAnimations: HTMLElement.prototype.getAnimations,
  };

  HTMLElement.prototype.animate = function (keyframes: Keyframe[] | PropertyIndexedKeyframes | null) {
    const frames = Array.isArray(keyframes) ? keyframes : [];
    calls.push(frames);
    const animation: FakeAnimation = {
      playState: "running",
      cancelled: false,
      cancel() {
        this.cancelled = true;
        this.playState = "idle";
      },
      onfinish: null,
    };
    const host = this as HTMLElement & { __anims?: FakeAnimation[] };
    host.__anims = [...(host.__anims ?? []), animation];
    this.getAnimations = () =>
      (host.__anims ?? []).filter((item) => item.playState === "running") as unknown as Animation[];
    return animation as unknown as Animation;
  } as typeof HTMLElement.prototype.animate;

  return {
    calls,
    restore() {
      HTMLElement.prototype.animate = originals.animate;
      HTMLElement.prototype.getAnimations = originals.getAnimations;
    },
  };
}

function Harness() {
  const [screen, setScreen] = useState("home");
  return (
    <>
      <button type="button" onClick={() => setScreen("studio")}>Studio</button>
      <RoomClarify screenKey={screen}>
        <p>{screen}</p>
      </RoomClarify>
    </>
  );
}

describe("RoomClarify", () => {
  afterEach(() => {
    document.documentElement.classList.remove("reduce-motion");
  });

  it("parte velato e toglie il filter quando l'animazione finisce", () => {
    const motion = installAnimate();
    const view = render(<RoomClarify screenKey="home"><p>Home</p></RoomClarify>);
    const frame = view.container.firstElementChild as HTMLElement;

    expect(motion.calls).toHaveLength(1);
    expect(motion.calls[0][0]).toMatchObject({ opacity: 0.62, filter: "blur(8px)" });

    const running = frame.getAnimations()[0] as unknown as FakeAnimation;
    running.onfinish?.();

    expect(running.cancelled).toBe(true);
    expect(frame.style.filter).toBe("");
    expect(frame.style.opacity).toBe("");
    motion.restore();
  });

  it("se il cambio arriva a metà, riparte dalla sfocatura attuale e non dal velo pieno", () => {
    const motion = installAnimate();
    const view = render(<Harness />);
    const frame = view.container.querySelector("p")?.parentElement as HTMLElement;
    frame.style.opacity = "0.8";
    frame.style.filter = "blur(3px)";

    fireEvent.click(view.getByRole("button", { name: "Studio" }));

    expect(motion.calls).toHaveLength(2);
    expect(motion.calls[1][0]).toMatchObject({ opacity: 0.8, filter: "blur(3px)" });
    motion.restore();
  });

  it("con il movimento ridotto la stanza è già nitida", () => {
    const motion = installAnimate();
    document.documentElement.classList.add("reduce-motion");
    const view = render(<RoomClarify screenKey="home"><p>Home</p></RoomClarify>);
    const frame = view.container.firstElementChild as HTMLElement;

    expect(motion.calls).toHaveLength(0);
    expect(frame.style.filter).toBe("");
    motion.restore();
  });

  it("non vela la stanza se la lezione si apre insieme all'ingresso", () => {
    const motion = installAnimate();
    const view = render(
      <RoomClarify screenKey="studio" disabled>
        <p>Lezione</p>
      </RoomClarify>,
    );
    expect(motion.calls).toHaveLength(0);
    expect((view.container.firstElementChild as HTMLElement).style.filter).toBe("");
    motion.restore();
  });
});
