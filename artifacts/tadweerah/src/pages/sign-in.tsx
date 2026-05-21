import { useState } from "react";
import { useSignIn } from "@clerk/react";
import { useLocation } from "wouter";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

type SignInStep = "credentials" | "forgot-email" | "forgot-code";

export function SignInPage() {
  const { t } = useT();
  const { signIn } = useSignIn();
  const [, navigate] = useLocation();

  const [step, setStep] = useState<SignInStep>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /* ── Clerk error helper ── */
  const clerkErrMsg = (e: unknown) => {
    const ce = (e as { errors?: { message: string }[] }).errors?.[0];
    return ce?.message ?? t("signin.error.generic");
  };

  /* ── Normal sign-in ── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const { error: createErr } = await signIn!.create({ identifier: email.trim(), password });
      if (createErr) { setError(createErr.message ?? t("signin.error.generic")); return; }

      if (signIn!.status === "complete") {
        const { error: finalErr } = await signIn!.finalize();
        if (finalErr) { setError(finalErr.message ?? t("signin.error.generic")); return; }
        navigate("/dashboard");
      } else {
        setError(t("signin.error.incomplete"));
      }
    } catch (err) {
      setError(clerkErrMsg(err));
    } finally {
      setIsPending(false);
    }
  };

  /* ── Forgot password: identify user then send reset code ── */
  const handleForgotSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const { error: createErr } = await signIn!.create({ identifier: resetEmail.trim() });
      if (createErr) { setError(createErr.message ?? t("signin.error.generic")); return; }

      const { error: sendErr } = await signIn!.resetPasswordEmailCode.sendCode();
      if (sendErr) { setError(sendErr.message ?? t("signin.error.generic")); return; }

      setStep("forgot-code");
    } catch (err) {
      setError(clerkErrMsg(err));
    } finally {
      setIsPending(false);
    }
  };

  /* ── Forgot password: verify code + set new password ── */
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError(t("onboarding.account.password.hint")); return; }
    setIsPending(true);
    try {
      const { error: verifyErr } = await signIn!.resetPasswordEmailCode.verifyCode({ code: resetCode.trim() });
      if (verifyErr) { setError(verifyErr.message ?? t("signin.error.generic")); return; }

      const { error: passErr } = await signIn!.resetPasswordEmailCode.submitPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });
      if (passErr) { setError(passErr.message ?? t("signin.error.generic")); return; }

      if (signIn!.status === "complete") {
        const { error: finalErr } = await signIn!.finalize();
        if (!finalErr) { navigate("/dashboard"); return; }
      }
      setSuccessMsg(t("signin.reset.success"));
      setTimeout(() => { setStep("credentials"); setSuccessMsg(null); }, 2000);
    } catch (err) {
      setError(clerkErrMsg(err));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AppLayout width="narrow">
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-[440px]">
          <div className="rounded-2xl border border-border/60 bg-card shadow-md shadow-black/5 px-8 py-10 space-y-8">

          {/* ── Normal sign-in ── */}
          {step === "credentials" && (
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  {t("signin.welcome")}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {t("signin.subtitle")}
                </p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="si-email">{t("signin.email")}</Label>
                  <Input
                    id="si-email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="si-password">{t("signin.password")}</Label>
                  <div className="relative">
                    <Input
                      id="si-password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      dir="ltr"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex justify-start">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => { setResetEmail(email); setError(null); setStep("forgot-email"); }}
                    >
                      {t("signin.forgot_password")}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full h-12 text-base font-semibold" disabled={isPending}>
                  {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("action.signin")}
                </Button>
              </form>

            </>
          )}

          {/* ── Forgot: enter email ── */}
          {step === "forgot-email" && (
            <>
              <div className="space-y-1 text-center">
                <h1 className="text-xl font-bold text-foreground">{t("signin.forgot_password")}</h1>
                <p className="text-sm text-muted-foreground">{t("signin.forgot.subtitle")}</p>
              </div>

              <form onSubmit={handleForgotSend} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">{t("signin.email")}</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    dir="ltr"
                    value={resetEmail}
                    onChange={(e) => { setResetEmail(e.target.value); setError(null); }}
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                  {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("signin.forgot.send_code")}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setError(null); }}
                  className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                  {t("signin.back_to_login")}
                </button>
              </form>
            </>
          )}

          {/* ── Forgot: enter code + new password ── */}
          {step === "forgot-code" && (
            <>
              <div className="space-y-1 text-center">
                <h1 className="text-xl font-bold text-foreground">{t("signin.reset.title")}</h1>
                <p className="text-sm text-muted-foreground">{t("signin.reset.subtitle")}</p>
              </div>

              <form onSubmit={handleForgotReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-code">{t("onboarding.verify.code")}</Label>
                  <Input
                    id="reset-code"
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    placeholder="000000"
                    value={resetCode}
                    onChange={(e) => { setResetCode(e.target.value); setError(null); }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">{t("signin.reset.new_password")}</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      dir="ltr"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewPassword(v => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("onboarding.account.password.hint")}</p>
                </div>

                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {successMsg && (
                  <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
                    {successMsg}
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                  {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("signin.reset.submit")}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStep("forgot-email"); setError(null); }}
                  className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                  {t("signin.back_to_login")}
                </button>
              </form>
            </>
          )}

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
