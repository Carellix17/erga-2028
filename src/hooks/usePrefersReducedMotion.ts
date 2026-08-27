import { useEffect, useState } from "react";

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const check = () => {
      const htmlReduced = document.documentElement.classList.contains("reduce-motion");
      setReduced(mql.matches || htmlReduced);
    };
    check();
    mql.addEventListener?.("change", check);
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mql.removeEventListener?.("change", check);
      observer.disconnect();
    };
  }, []);
  return reduced;
}
