import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  AudioLines,
  BookOpen,
  Brain,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  PencilLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import {
  completeOAuthSignIn,
  oauthCallbackUrl,
  safeNextPath,
} from "@/lib/auth";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { SeoHead } from "@/components/SeoHead";

// 🌿 P41 — Sign in a DUE COLONNE: form a sinistra, hero dello studio a destra
// (nascosta sotto md). Logica auth intatta (Supabase reale + broker Lovable):
// qui aggiungiamo validazione client, errore inline, stato di caricamento con
// spinner e pannello "Password dimenticata?" (resetPasswordForEmail).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 💠 Campo "vetro": il contenitore porta bordo e focus, l'input è trasparente. */
function GlassField({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-primary/70 focus-within:bg-primary/5">
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

const glassInputClass =
  "h-12 w-full bg-transparent pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Pannello "Password dimenticata?"
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  // Utente già loggato → dritto in app, senza rivedere il login.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(nextPath, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, nextPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validazione PRIMA della chiamata: nessun ping a Supabase con campi vuoti
    // o email malformata.
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setFormError(t("login.errRequired"));
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setFormError(t("login.errEmail"));
      return;
    }
    setFormError(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (error) {
        setFormError(
          error.message === "Invalid login credentials"
            ? t("login.invalidCreds")
            : error.message,
        );
        toast({
          title: t("login.errorTitle"),
          description:
            error.message === "Invalid login credentials"
              ? t("login.invalidCreds")
              : error.message,
          variant: "destructive",
        });
        setIsSubmitting(false);
      }
      // Successo: isSubmitting resta true — il redirect arriva dal cambio di
      // stato auth e nel frattempo i pulsanti restano bloccati (niente doppi invii).
    } catch (error: unknown) {
      setFormError(
        error instanceof Error ? error.message : t("login.errorTitle"),
      );
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = forgotEmail.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setFormError(t("login.errEmail"));
      return;
    }
    setFormError(null);
    setForgotSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        // Stesso dominio dell'app (autorizzato in Supabase): il link atterra
        // su /cambia-password, che scambia il codice con una sessione.
        redirectTo: `${window.location.origin}/cambia-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (error: unknown) {
      toast({
        title: t("login.errorTitle"),
        description:
          error instanceof Error ? error.message : t("login.errorTitle"),
        variant: "destructive",
      });
    } finally {
      setForgotSending(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "apple" | "microsoft") => {
    setIsSubmitting(true);
    const providerLabel = provider === "google" ? "Google" : provider === "apple" ? "Apple" : "Microsoft";

    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        // Callback dedicata che ATTENDE la sessione prima di navigare:
        // niente più atterraggio diretto su /app con hash dei token.
        redirect_uri: oauthCallbackUrl(nextPath),
        extraParams: provider === "google" ? { prompt: "select_account" } : undefined,
      });

      // Applica i token se il broker li ha restituiti direttamente
      // (flusso popup/postMessage in anteprima Lovable). Se il browser
      // è stato girato (redirect), la sessione arriva su /auth/callback.
      await completeOAuthSignIn(result);
      if (result.redirected) {
        return; // Browser will redirect
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
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Accedi — Erga"
        description="Accedi al tuo account Erga per riprendere i tuoi percorsi di studio, lezioni ed esercizi."
        path="/login"
      />
      <div className="mx-auto grid min-h-screen w-full max-w-6xl md:grid-cols-2">
        {/* ─────────── Colonna SINISTRA: il form ─────────── */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
          <div className="mx-auto w-full max-w-md animate-fade-up">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary-foreground" strokeWidth={1.75} />
                </div>
                <span className="font-display text-lg font-bold tracking-tight">Erga</span>
              </div>
              <LanguageSwitcher />
            </div>

            {showForgot ? (
              /* ── Pannello "Password dimenticata?" ── */
              <div>
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotSent(false); setFormError(null); }}
                  className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {t("login.forgotBack")}
                </button>
                <h1 className="font-display text-2xl font-bold tracking-tight">
                  {t("login.forgotTitle")}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t("login.forgotHint")}
                </p>

                {forgotSent ? (
                  <div
                    role="status"
                    className="mt-6 flex items-start gap-2.5 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
                  >
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{t("login.forgotSent")}</span>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="mt-6 space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="text-sm font-medium">
                        {t("login.email")}
                      </Label>
                      <GlassField icon={Mail}>
                        <input
                          id="forgot-email"
                          type="email"
                          autoComplete="email"
                          placeholder={t("login.emailPlaceholder")}
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className={glassInputClass}
                        />
                      </GlassField>
                    </div>
                    <Button
                      type="submit"
                      className="h-12 w-full rounded-full text-base"
                      disabled={forgotSending}
                    >
                      {forgotSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                      {t("login.forgotSend")}
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              /* ── Form di accesso ── */
              <>
                <h1 className="font-display text-3xl font-bold tracking-tight">
                  {t("login.title")}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">{t("login.welcome")}</p>

                {formError && (
                  <div
                    role="alert"
                    className="mt-5 flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">
                      {t("login.email")}
                    </Label>
                    <GlassField icon={Mail}>
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder={t("login.emailPlaceholder")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={glassInputClass}
                      />
                    </GlassField>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium">
                      {t("login.password")}
                    </Label>
                    <GlassField icon={Lock}>
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${glassInputClass} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </GlassField>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                        className="text-xs font-semibold text-primary transition-colors hover:underline"
                      >
                        {t("login.forgot")}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    {t("login.submit")}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    {t("login.noAccount")}{" "}
                    <Link to="/registrati" className="font-medium text-primary hover:underline">
                      {t("login.goSignup")}
                    </Link>
                  </p>

                  <div className="relative my-2">
                    <Separator className="bg-border/40" />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background px-3 py-0.5 text-xs text-muted-foreground">
                      {t("login.or")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full rounded-full border-border/60 transition-colors hover:bg-secondary"
                      onClick={() => handleOAuthSignIn("google")}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      )}
                      {t("login.google")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full rounded-full border-border/60 transition-colors hover:bg-secondary"
                      onClick={() => handleOAuthSignIn("apple")}
                      disabled={isSubmitting}
                    >
                      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      {t("login.apple")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full rounded-full border-border/60 transition-colors hover:bg-secondary"
                      onClick={() => handleOAuthSignIn("microsoft")}
                      disabled={isSubmitting}
                    >
                      <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M11.4 0H0v11.4h11.4V0zm12.6 0H12.6v11.4H24V0zM11.4 12.6H0V24h11.4V12.6zm12.6 0H12.6V24H24V12.6z" />
                      </svg>
                      {t("login.microsoft")}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        {/* ─────────── Colonna DESTRA: hero dello studio (solo ≥ md) ─────────── */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0A0A0C] p-10 text-white/90 md:flex lg:p-14">
          {/* Geometrie decorative — SVG inline, nessuna dipendenza esterna */}
          <svg className="absolute inset-0 h-full w-full text-white" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="330" cy="120" r="90" opacity="0.07" />
              <circle cx="330" cy="120" r="55" opacity="0.05" />
              <path d="M-40 480 L200 300 L440 520" opacity="0.06" />
              <path d="M-40 530 L200 350 L440 570" opacity="0.04" />
              <rect x="40" y="60" width="120" height="120" rx="24" opacity="0.05" />
              <circle cx="120" cy="500" r="70" opacity="0.05" />
            </g>
            <circle cx="330" cy="120" r="3" fill="currentColor" opacity="0.2" />
            <circle cx="120" cy="500" r="3" fill="currentColor" opacity="0.15" />
          </svg>

          <div className="relative flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5">
              <Brain className="h-4 w-4 text-white/80" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <span className="font-display text-sm font-bold tracking-[0.14em] text-white/70">ERGA</span>
          </div>

          <div className="relative max-w-md">
            <h2 className="font-radja text-4xl leading-tight lg:text-5xl">
              {t("login.heroTitle")}
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/60">
              {t("login.heroBody")}
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {[
                { icon: BookOpen, label: t("login.heroChip1") },
                { icon: PencilLine, label: t("login.heroChip2") },
                { icon: AudioLines, label: t("login.heroChip3") },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/75"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <p className="relative text-[11px] uppercase tracking-[0.18em] text-white/35">
            Erga · beta gratuita
          </p>
        </div>
      </div>
    </div>
  );
}
