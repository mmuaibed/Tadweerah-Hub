import { useState } from "react";
import { useSignIn } from "@clerk/react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

export function SignInPage() {
  const { t } = useT();
  // Clerk v6 API: useSignIn returns { signIn, errors, fetchStatus }
  const { signIn } = useSignIn();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const { error: signInError } = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message ?? t("signin.error.generic"));
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize();
        navigate("/dashboard");
      } else {
        setError(t("signin.error.incomplete"));
      }
    } catch (err: unknown) {
      const clerkErr = (err as { errors?: { message: string }[] }).errors?.[0];
      setError(clerkErr?.message ?? t("signin.error.generic"));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AppLayout width="narrow">
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold text-foreground">{t("action.signin")}</h1>
            <p className="text-sm text-muted-foreground">{t("signin.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Input
                id="si-password"
                type="password"
                required
                autoComplete="current-password"
                dir="ltr"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("action.signin")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t("signin.no_account")}{" "}
            <a
              href="/onboarding/company"
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              {t("signin.create_company")}
            </a>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
