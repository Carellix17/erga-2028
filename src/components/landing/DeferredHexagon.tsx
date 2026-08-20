import { lazy, Suspense, useEffect, useRef, useState } from "react";

const LazyHexagonPlay = lazy(() =>
  import("./HexagonPlay").then((module) => ({ default: module.HexagonPlay })),
);

function HexagonPlaceholder() {
  return (
    <div className="lp-hex-placeholder" role="status" aria-label="Caricamento dell’Esagono cognitivo">
      <div>
        <span />
        <span />
        <span />
      </div>
      <div className="shape" aria-hidden />
    </div>
  );
}

export function DeferredHexagon() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: "600px 0px" },
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="lp-deferred-hexagon">
      {shouldLoad ? (
        <Suspense fallback={<HexagonPlaceholder />}>
          <LazyHexagonPlay />
        </Suspense>
      ) : (
        <HexagonPlaceholder />
      )}
    </div>
  );
}
