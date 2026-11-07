export type ProFeature = "speed_learning" | "custom_pomodoro";

/** Returns whether a Pro-only planner feature is available to this tier. */
export function hasFeature(feature: ProFeature, isPro: boolean): boolean {
  switch (feature) {
    case "speed_learning":
    case "custom_pomodoro":
      return isPro;
  }
}
