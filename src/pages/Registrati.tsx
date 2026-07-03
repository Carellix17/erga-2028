import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function Registrati() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const isLengthValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = isLengthValid && passwordsMatch && email.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });

    if (error) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    } else {
      setRegistered(true);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-[#FCFCFC] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center animate-fade-up space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Controlla la tua email</h2>
          <p className="text-slate-500 text-sm">
            Abbiamo inviato un link di conferma a <strong>{email}</strong>. Clicca sul link per attivare il tuo account.
          </p>
          <Button variant="outline" onClick={() => navigate("/login")} className="mt-4">
            Torna al login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCFC] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-[420px] h-[420px] rounded-full bg-tertiary/8 blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-fade-up relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-black flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 text-center">
            Crea il tuo account
          </h1>
          <p className="text-slate-500 text-sm mt-1">Inizia a studiare con l'AI</p>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200/70 shadow-[0_8px_32px_0_rgba(15,23,42,0.04)] p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="la-tua@email.com"
                  className="pl-11 h-12 rounded-xl glass-subtle border-border/30 focus:border-primary/40 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  className="pl-11 pr-12 h-12 rounded-xl glass-subtle border-border/30 focus:border-primary/40 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className={cn("flex items-center gap-1 text-xs", isLengthValid ? "text-primary" : "text-muted-foreground")}>
                {isLengthValid && <Check className="w-3 h-3" />}
                <span>Minimo 8 caratteri</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Conferma password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  className="pl-11 h-12 rounded-xl glass-subtle border-border/30 focus:border-primary/40 transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {confirmPassword.length > 0 && (
                <div className={cn("flex items-center gap-1 text-xs", passwordsMatch ? "text-primary" : "text-destructive")}>
                  {passwordsMatch && <Check className="w-3 h-3" />}
                  <span>{passwordsMatch ? "Le password corrispondono" : "Le password non corrispondono"}</span>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-12 bg-black text-white hover:bg-stone-900 border-0 rounded-xl transition-all duration-300 font-semibold" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Registrazione..." : "Registrati"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Hai già un account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Accedi
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
