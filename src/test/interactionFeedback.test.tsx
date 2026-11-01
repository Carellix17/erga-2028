import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { InteractionFeedback } from "@/components/shared/InteractionFeedback";
import { triggerHaptic, setHapticPreference } from "@/utils/haptics";

const vibrate = vi.fn(() => true);
let clock = 10000;
beforeEach(() => {
  clock += 1000;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  localStorage.clear();
  vibrate.mockClear();
  Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("shared interaction feedback", () => {
  it("covers nested icons and custom navigation controls with one pulse", () => {
    render(<><InteractionFeedback /><button data-haptic="medium"><span>Vai a Studio</span></button></>);
    fireEvent.click(screen.getByText("Vai a Studio"));
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(36);
  });
  it("does not replace semantic feedback or vibrate twice for one gesture", () => {
    render(<><InteractionFeedback /><button onClick={() => triggerHaptic("success")}>Conferma</button></>);
    fireEvent.click(screen.getByText("Conferma"));
    expect(vibrate).toHaveBeenCalledExactlyOnceWith([24, 50, 40]);
  });
  it("respects disabled controls, explicit opt-outs and the stored off preference", () => {
    render(<><InteractionFeedback /><button disabled>Bloccato</button><button data-haptic="off">Corrente</button><button>Attivo</button></>);
    fireEvent.click(screen.getByText("Bloccato"));
    fireEvent.click(screen.getByText("Corrente"));
    setHapticPreference("off");
    fireEvent.click(screen.getByText("Attivo"));
    expect(vibrate).not.toHaveBeenCalled();
  });
  it("uses firm timing and still reports unsupported hardware safely", () => {
    setHapticPreference("strong");
    expect(triggerHaptic("medium")).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(50);
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: undefined });
    expect(triggerHaptic("error")).toBe(false);
  });
  it("cleans up its listeners on unmount", () => {
    const mounted = render(<InteractionFeedback />);
    mounted.unmount();
    const button = document.createElement("button");
    document.body.append(button);
    fireEvent.click(button);
    expect(vibrate).not.toHaveBeenCalled();
    button.remove();
  });
});
