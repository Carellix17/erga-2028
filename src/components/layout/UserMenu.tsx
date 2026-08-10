import { Brain, Crown, LogOut, Settings, User, Zap } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionSheet } from "@/components/subscription/SubscriptionSheet";
import { cn } from "@/lib/utils";

const tierMeta = {
  free: { icon: Zap, label: "Free" },
  beta: { icon: Brain, label: "Beta" },
  pro: { icon: Crown, label: "Pro" },
} as const;

// 🌲 P24 — il menu profilo accoglie anche abbonamento (badge) e impostazioni:
// l'header resta leggero, le funzioni non si perdono.
export function UserMenu() {
  const { currentEmail, logout } = useAuth();
  const navigate = useNavigate();
  const { tier } = useSubscription();
  const [showSubscription, setShowSubscription] = useState(false);
  const TierIcon = tierMeta[tier].icon;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (email: string) => {
    const name = email.split("@")[0];
    const parts = name.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="relative">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-level-1">
              <span className="label-medium">
                {currentEmail ? getInitials(currentEmail) : <User className="w-4 h-4" />}
              </span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-popover text-popover-foreground shadow-level-3 border border-border">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="title-small">Account</p>
              <p className="body-small text-muted-foreground break-all">
                {currentEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem onClick={() => setShowSubscription(true)} className="cursor-pointer rounded-lg">
            <span
              className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center",
                tier === "pro" ? "bg-warning-container text-warning" : "bg-primary-container text-primary"
              )}
            >
              <TierIcon className="w-3.5 h-3.5" />
            </span>
            <span className="flex-1">Abbonamento</span>
            <span className="label-small text-muted-foreground">{tierMeta[tier].label}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/app/impostazioni")} className="cursor-pointer rounded-lg">
            <Settings className="mr-2 h-4 w-4" />
            <span>Impostazioni</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer rounded-lg">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Esci</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SubscriptionSheet
        open={showSubscription}
        onOpenChange={setShowSubscription}
        currentTier={tier}
      />
    </>
  );
}
