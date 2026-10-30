import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export const APP_TABS = ["home", "piano", "studio", "core"] as const;
export type AppTab = (typeof APP_TABS)[number];

export interface NavigateToAppTabOptions {
  /** Internal/automatic changes replace; explicit user navigation can opt into a history entry. */
  replace?: boolean;
}

function isAppTab(value: string | null): value is AppTab {
  return value !== null && APP_TABS.some((tab) => tab === value);
}

/** URL-backed selection for the four primary application tabs. */
export function useAppTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab: AppTab = isAppTab(requestedTab) ? requestedTab : "home";

  // Invalid URLs still resolve to Home; normalize them without adding a
  // history entry so browser Back never lands on an unusable tab value.
  useEffect(() => {
    if (requestedTab === null || isAppTab(requestedTab)) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("tab");
    setSearchParams(nextParams, { replace: true });
  }, [requestedTab, searchParams, setSearchParams]);

  const navigateToTab = useCallback(
    (tab: AppTab, { replace = true }: NavigateToAppTabOptions = {}) => {
      const nextParams = new URLSearchParams(searchParams);
      if (tab === "home") nextParams.delete("tab");
      else nextParams.set("tab", tab);

      if (nextParams.toString() === searchParams.toString()) return;
      setSearchParams(nextParams, { replace });
    },
    [searchParams, setSearchParams],
  );

  const navigateFromDock = useCallback(
    (tab: AppTab) => navigateToTab(tab, { replace: false }),
    [navigateToTab],
  );

  return { activeTab, navigateToTab, navigateFromDock };
}
