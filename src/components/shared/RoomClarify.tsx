import { useLayoutEffect, useRef, useState, useEffect, type ReactNode } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { setAppScrollTop } from "@/lib/appScroll";
import { cn } from "@/lib/utils";

const VEIL_OPACITY = 0.62;
const VEIL_BLUR_PX = 8;
const DURATION_MS = 320;
const EASING = "cubic-bezier(0.2, 0, 0, 1)";

function usePrefersReducedTransparency() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-transparency: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);
  return reduced;
}

function blurPx(filter: string): number | null {
  const match = /blur\(([0-9.]+)px\)/.exec(filter);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : null;
}

function clearVeil(el: HTMLElement) {
  el.style.removeProperty("opacity");
  el.style.removeProperty("filter");
}

/**
 * Il contenuto sotto la barra parte velato e diventa nitido.
 * Il nodo resta montato: un cambio a metà prosegue dalla sfocatura attuale.
 * A fine corsa il filter viene tolto, altrimenti le finestre fixed restano
 * agganciate a questo riquadro (regola del palco).
 */
export function RoomClarify({
  screenKey,
  disabled = false,
  className,
  studio = false,
  children,
}: {
  screenKey: string;
  disabled?: boolean;
  className?: string;
  studio?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastKey = useRef<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const reducedTransparency = usePrefersReducedTransparency();
  const skip = disabled || reducedMotion || reducedTransparency;

  useLayoutEffect(() => {
    const el = ref.current;
    const keyChanged = lastKey.current !== screenKey;
    if (keyChanged) {
      setAppScrollTop(0);
      lastKey.current = screenKey;
    }
    if (!el) return;

    const animations = typeof el.getAnimations === "function" ? el.getAnimations({ subtree: false }) : [];
    const wasRunning = animations.some((animation) => animation.playState === "running");
    let fromOpacity = VEIL_OPACITY;
    let fromBlur = VEIL_BLUR_PX;
    if (wasRunning) {
      const computed = getComputedStyle(el);
      const opacity = Number.parseFloat(computed.opacity);
      const blur = blurPx(computed.filter);
      if (Number.isFinite(opacity)) fromOpacity = opacity;
      if (blur != null) fromBlur = blur;
    }
    for (const animation of animations) animation.cancel();

    if (skip || (!keyChanged && !wasRunning) || typeof el.animate !== "function") {
      clearVeil(el);
      return;
    }

    // Nessuno stile inline lasciato acceso: blur(0) terrebbe comunque
    // le finestre fixed dentro questo riquadro. fill "both" copre il primo
    // fotogramma; a fine corsa cancel toglie anche quello.
    const animation = el.animate(
      [
        { opacity: fromOpacity, filter: `blur(${fromBlur}px)` },
        { opacity: 1, filter: "blur(0px)" },
      ],
      { duration: DURATION_MS, easing: EASING, fill: "both" },
    );
    animation.onfinish = () => {
      animation.cancel();
      clearVeil(el);
    };
  }, [screenKey, skip]);

  return (
    <div ref={ref} className={cn(className)} data-studio={studio ? "" : undefined}>
      {children}
    </div>
  );
}
