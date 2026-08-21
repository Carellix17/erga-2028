import { AppHeader } from "@/components/layout/AppHeader";

interface SettingsHeaderProps {
  title: string;
  subtitle?: string;
}

export function SettingsHeader({ title, subtitle }: SettingsHeaderProps) {
  return <AppHeader title={title} subtitle={subtitle} showBack />;
}

export function SettingsPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-background">
      <div className="w-full flex-1">{children}</div>
    </div>
  );
}
