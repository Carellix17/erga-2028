import type { ReactNode } from "react";
import { BottomNav, type Tab } from "@/components/layout/BottomNav";
import { AppHeader } from "@/components/layout/AppHeader";

interface AppLayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  headerTitle?: string | null;
  hideChrome?: boolean;
  children: ReactNode;
}

export function AppLayout({
  activeTab,
  onTabChange,
  headerTitle,
  hideChrome = false,
  children,
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-background bg-dot-grid md:flex-row">
      {!hideChrome && <BottomNav activeTab={activeTab} onTabChange={onTabChange} />}
      <div className="flex min-w-0 max-w-full flex-1 flex-col">
        {!hideChrome && <AppHeader title={headerTitle} />}
        <main className="mx-auto w-full max-w-lg overflow-visible px-4 pb-24 sm:px-6 md:max-w-2xl md:pb-6 lg:max-w-4xl">
          {children}
        </main>
      </div>
    </div>
  );
}
