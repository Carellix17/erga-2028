import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SettingsHeaderProps {
  title: string;
  subtitle?: string;
}

export function SettingsHeader({ title, subtitle }: SettingsHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-outline-variant/60 transition-all duration-300 ease-m3-emphasized">
      <div className="flex items-center gap-3 h-16 px-4 sm:px-6 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Indietro"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/app"))}
          className="rounded-full shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="title-large font-display font-bold text-foreground truncate">{title}</h1>
          {subtitle && <p className="body-small text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

export function SettingsPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}