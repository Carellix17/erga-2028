import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast({
        title: "Errore di accesso",
        description: error.message === "Invalid login credentials"
          ? "Email o password non corretti"
          : error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
    // Navigation handled by auth state change
  };

  const handleOAuthSignIn = async (provider: "google" | "apple" | "azure") => {
    setIsSubmitting(true);
    const redirectUrl = import.meta.env.VITE_OAUTH_REDIRECT_URL || `${window.location.origin}/login`;
    const providerLabel = provider === "google" ? "Google" : provider === "apple" ? "Apple" : "Microsoft";

    try {
      if (provider === "azure") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "azure",
          options: { redirectTo: redirectUrl },
        });
        if (error) throw error;
      } else {
        const result = await lovable.auth.signInWithOAuth(provider, {
          redirect_uri: redirectUrl,
          extraParams: provider === "google" ? { prompt: "select_account" } : undefined,
        });
        if (result.error) throw result.error;
      }
    } catch (error: unknown) {
      toast({
        title: `Errore ${providerLabel}`,
        description:
          error instanceof Error
            ? error.message
            : `Impossibile collegarsi a ${providerLabel}`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="glass-orb glass-orb-primary w-[500px] h-[500px] -top-48 -right-48 animate-float" />
        <div className="glass-orb glass-orb-tertiary w-[400px] h-[400px] top-1/2 -left-40" style={{ animationDelay: '-3s', animationDuration: '14s' }} />
        <div className="glass-orb glass-orb-accent w-[300px] h-[300px] -bottom-24 right-1/4" style={{ animationDelay: '-6s', animationDuration: '16s' }} />
      </div>

      <div className="w-full max-w-sm animate-fade-up relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-[1.75rem] gradient-primary flex items-center justify-center mb-4 shadow-glass-xl animate-glow-pulse">
            <Sparkles className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-bold bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
            Erga
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Il tuo assistente di studio</p>
        </div>

        <div className="glass-card rounded-[1.75rem] p-6 shadow-glass-xl">
          <div className="text-center mb-6">
            <h2 className="text-xl font-heading font-semibold">Accedi</h2>
            <p className="text-sm text-muted-foreground mt-1">Email, Google, Apple o Microsoft</p>
          </div>

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
            </div>

            <Button type="submit" className="w-full h-12 gradient-primary text-white border-0 rounded-xl shadow-glass-md hover:shadow-glass-lg hover:scale-[1.02] transition-all duration-300 font-semibold" disabled={isSubmitting}>
              Accedi
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Non hai un account?{" "}
              <Link to="/registrati" className="text-primary font-medium hover:underline">
                Registrati
              </Link>
            </p>

            <div className="relative my-5">
              <Separator className="bg-border/30" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass-subtle px-3 py-0.5 rounded-full text-xs text-muted-foreground">oppure</span>
            </div>

            <div className="flex flex-col gap-3">
              <Button type="button" variant="outline" className="w-full h-12 rounded-xl glass-subtle border-border/30 hover:shadow-glass transition-all duration-300" onClick={() => handleOAuthSignIn("google")} disabled={isSubmitting}>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continua con Google
              </Button>

              <Button type="button" variant="outline" className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 border-0 transition-all duration-300 hover:scale-[1.02]" onClick={() => handleOAuthSignIn("apple")} disabled={isSubmitting}>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continua con Apple
              </Button>

              <Button type="button" variant="outline" className="w-full h-12 rounded-xl glass-subtle border-border/30 hover:shadow-glass transition-all duration-300" onClick={() => handleOAuthSignIn("azure")} disabled={isSubmitting}>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2" y="2" width="9" height="9" fill="#F25022" />
                  <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
                  <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
                  <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
                </svg>
                Continua con Microsoft
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
