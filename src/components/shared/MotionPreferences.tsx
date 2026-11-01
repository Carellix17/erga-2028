import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/** Apply both the OS preference and Erga's accessibility setting to JS motion. */
export function MotionPreferences({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  return <MotionConfig reducedMotion={reduced ? "always" : "user"}>{children}</MotionConfig>;
}
