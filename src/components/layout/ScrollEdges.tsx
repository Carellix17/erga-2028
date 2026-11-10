import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Circa 15% più lento: abbastanza da sentirsi, poco da ostacolare. */
export const WHEEL_RESISTANCE = 0.85;
const WHEEL_LINE_PX = 16;

export function resistedDelta(delta: number, deltaMode: number, pagePx: number): number {
  const pixels =
    deltaMode === WheelEvent.DOM_DELTA_LINE
      ? delta * WHEEL_LINE_PX
      : deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? delta * pagePx
        : delta;
  return pixels * WHEEL_RESISTANCE;
}

function boxScrollsOnAxis(el: HTMLElement, axis: "x" | "y"): boolean {
  const style = getComputedStyle(el);
  if (axis === "y") {
    const overflow = style.overflowY;
    return (overflow === "auto" || overflow === "scroll") && el.scrollHeight > el.clientHeight + 1;
  }
  const overflow = style.overflowX;
  return (overflow === "auto" || overflow === "scroll") && el.scrollWidth > el.clientWidth + 1;
}

/** True when the wheel would land in a box that already scrolls on that axis. */
export function isNestedScrollable(target: EventTarget | null, boundary: Node | null, axis: "x" | "y"): boolean {
  const start = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  let node: Element | null = start;
  while (node && node !== boundary) {
    if (
      node instanceof HTMLElement &&
      node !== document.body &&
      node !== document.documentElement &&
      boxScrollsOnAxis(node, axis)
    ) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

function elementOwnsScroll(el: HTMLElement | null): el is HTMLElement {
  if (!el) return false;
  const overflow = getComputedStyle(el).overflowY;
  return overflow === "auto" || overflow === "scroll";
}

function headerInsetPx(root: HTMLElement | null): number {
  const header = root?.querySelector("header");
  if (!header) return 0;
  if (getComputedStyle(header).position === "absolute") return 0;
  return Math.round(header.getBoundingClientRect().height);
}

interface ScrollEdgesProps {
  enabled: boolean;
  /** Nessuna barra: le fasce partono dai bordi della finestra. */
  bare: boolean;
  className?: string;
  children: ReactNode;
}

export function ScrollEdges({ enabled, bare, className, children }: ScrollEdgesProps) {
  const reducedMotion = usePrefersReducedMotion();
  const topSentinel = useRef<HTMLDivElement>(null);
  const bottomSentinel = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const top = topSentinel.current;
    const bottom = bottomSentinel.current;
    if (!top || !bottom) return;

    let observer: IntersectionObserver | null = null;
    const connect = () => {
      observer?.disconnect();
      const rootEl = document.getElementById("app-scroll-view");
      const root = elementOwnsScroll(rootEl) ? rootEl : null;
      // Un pixel in meno: a riposo la sentinella resta visibile, e il bagliore
      // compare al primo scatto sotto la barra.
      const inset = Math.max(0, headerInsetPx(rootEl) - 1);
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const clipped = !entry.isIntersecting;
            if (entry.target === top) setShowTop((current) => (current === clipped ? current : clipped));
            if (entry.target === bottom) setShowBottom((current) => (current === clipped ? current : clipped));
          }
        },
        { root, rootMargin: `-${inset}px 0px 0px 0px`, threshold: 0 },
      );
      observer.observe(top);
      observer.observe(bottom);
    };

    connect();
    const wide = window.matchMedia("(min-width: 768px)");
    wide.addEventListener("change", connect);
    return () => {
      wide.removeEventListener("change", connect);
      observer?.disconnect();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || reducedMotion) return;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || event.defaultPrevented) return;
      const column = document.getElementById("app-scroll-view");
      if (!column || !(event.target instanceof Node) || !column.contains(event.target)) return;
      const owner = elementOwnsScroll(column) ? column : null;
      const verticalNested = event.deltaY !== 0 && isNestedScrollable(event.target, owner, "y");
      const horizontalNested = event.deltaX !== 0 && isNestedScrollable(event.target, owner, "x");
      if (verticalNested || horizontalNested) return;

      const pageY = owner?.clientHeight || window.innerHeight;
      const pageX = owner?.clientWidth || window.innerWidth;
      const top = resistedDelta(event.deltaY, event.deltaMode, pageY);
      const left = resistedDelta(event.deltaX, event.deltaMode, pageX);
      if (top === 0 && left === 0) return;

      event.preventDefault();
      if (owner) {
        owner.scrollTop += top;
        owner.scrollLeft += left;
        return;
      }
      window.scrollBy({ top, left, behavior: "instant" as ScrollBehavior });
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [enabled, reducedMotion]);

  return (
    <>
      {enabled && (
        <div
          className={cn("scroll-edge-top", bare && "is-bare", showTop && "is-visible")}
          aria-hidden="true"
        />
      )}
      <main className={className}>
        {enabled && <div ref={topSentinel} className="scroll-edge-sentinel" aria-hidden="true" />}
        {children}
        {enabled && <div ref={bottomSentinel} className="scroll-edge-sentinel" aria-hidden="true" />}
      </main>
      {enabled && (
        <div
          className={cn("scroll-edge-bottom", bare && "is-bare", showBottom && "is-visible")}
          aria-hidden="true"
        />
      )}
    </>
  );
}
