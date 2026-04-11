import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";
import ergaLogo from "@/assets/erga-logo.png";

interface AppHeaderProps {
  onUploadClick: () => void;
  hasFiles: boolean;
}

export function AppHeader({ onUploadClick, hasFiles }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-2xl border-b border-outline-variant/20 transition-all duration-400 ease-m3-emphasized">
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 animate-fade-up">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center rotate-3 hover:rotate-0 hover:scale-110 active:scale-95 transition-all duration-500 ease-m3-emphasized">
            <img src={ergaLogo} alt="Erga logo" className="w-10 h-10 object-contain drop-shadow-md" />
          </div>
          <div>
            <span className="font-display font-bold text-xl text-foreground tracking-tight">
              Erga
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <Button
            variant={hasFiles ? "tonal" : "default"}
            size="sm"
            onClick={onUploadClick}
            className="gap-2"
          >
            <FileUp className="w-4 h-4" />
            {hasFiles ? "File" : "Carica"}
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
