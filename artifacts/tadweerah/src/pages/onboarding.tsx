import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth, useSignUp } from "@clerk/react";
import { Link, useLocation, Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, useGetMe } from "@workspace/api-client-react";
import { CheckSquare, Square, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

interface CompanyCategoryOption {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
}

interface CompanyActionOption {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  requires_license: boolean;
}

type OnboardingStep = "company" | "account" | "verify-email";

export function OnboardingPage() {
  const { t, lang } = useT();
  const { isSignedIn, getToken } = useAuth();
  // Clerk v6 API: useSignUp returns { signUp, errors, fetchStatus }
  const { signUp } = useSignUp();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Redirect signed-in users who already have a company
  const { data: me, isLoading: meLoading } = useGetMe();

  // Step: only relevant for signed-out flow
  const [step, setStep] = useState<OnboardingStep>("company");

  // After sign-up + setActive(), this ref triggers auto-submit of company data
  const autoSubmitRef = useRef(false);

  // ── Company form fields ──
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [contactPhone, setPhone] = useState("");
  const [commercialRegistration, setCr] = useState("");
  const [companyCategoryId, setCompanyCategoryId] = useState("");
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<"generator" | "receiver" | "transporter">>(new Set(["generator"]));
  const [otherActionDesc, setOtherActionDesc] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // ── Account fields (signed-out flow only) ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  // ── UI state ──
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Lookup data ──
  const [categories, setCategories] = useState<CompanyCategoryOption[]>([]);
  const [actions, setActions] = useState<CompanyActionOption[]>([]);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLookupLoading(true);
    setLookupError(false);

    Promise.all([
      fetch("/api/lookup/company-categories").then((r) => {
        if (!r.ok) throw new Error("categories fetch failed");
        return r.json();
      }),
      fetch("/api/lookup/company-actions").then((r) => {
        if (!r.ok) throw new Error("actions fetch failed");
        return r.json();
      }),
    ])
      .then(([cats, acts]) => {
        if (cancelled) return;
        if (Array.isArray(cats)) setCategories(cats as CompanyCategoryOption[]);
        if (Array.isArray(acts)) setActions(acts as CompanyActionOption[]);
      })
      .catch(() => {
        if (!cancelled) setLookupError(true);
      })
      .finally(() => {
        if (!cancelled) setLookupLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // After setActive() is called during sign-up, isSignedIn transitions to true.
  // We detect this and auto-submit the company data.
  useEffect(() => {
    if (isSignedIn && autoSubmitRef.current) {
      autoSubmitRef.current = false;
      void submitCompany();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // ── Redirect signed-in users who already have a company ──
  if (!meLoading && isSignedIn && me?.company) {
    return <Redirect to="/dashboard" />;
  }

  // ── Helpers ──
  const toggleAction = (id: string) => {
    setSelectedActionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
  };

  const toggleRole = (role: "generator" | "receiver" | "transporter") => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const otherAction = actions.find((a) => a.key === "other");
  const hasOtherSelected = otherAction ? selectedActionIds.has(otherAction.id) : false;

  // ── Validation for company step ──
  const validateCompanyData = (): string | null => {
    if (!name.trim()) return t("onboarding.form.name") + " " + t("onboarding.terms.required");
    if (!city.trim()) return t("onboarding.form.city") + " " + t("onboarding.terms.required");
    if (selectedActionIds.size === 0) return t("onboarding.form.actions.required");
    if (hasOtherSelected && !otherActionDesc.trim()) return t("onboarding.form.actions.other_required");
    if (!acceptedTerms) return t("onboarding.terms.required");
    const phoneVal = contactPhone.trim();
    if (!phoneVal) return t("onboarding.form.phone.required");
    const phoneClean = phoneVal.replace(/[\s\-().+]/g, "");
    if (!/^\d{7,15}$/.test(phoneClean)) return t("onboarding.form.phone.invalid");
    return null;
  };

  // ── Submit company to API ──
  const submitCompany = async () => {
    setError(null);
    setIsPending(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        city: city.trim(),
        contactPhone: contactPhone.trim(),
        ...(commercialRegistration.trim() ? { commercialRegistration: commercialRegistration.trim() } : {}),
        ...(companyCategoryId ? { company_category_id: companyCategoryId } : {}),
        action_ids: Array.from(selectedActionIds),
        roles: Array.from(selectedRoles),
        accepted_terms: true,
        ...(licenseNumber.trim() ? { license_number: licenseNumber.trim() } : {}),
      };

      const authToken = await getToken();
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data as { message?: string }).message ?? t("onboarding.error.generic");
        setError(msg);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setLocation("/dashboard");
    } catch {
      setError(t("onboarding.error.generic"));
    } finally {
      setIsPending(false);
    }
  };

  // ── Signed-in user: direct company form submit ──
  const handleSignedInSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateCompanyData();
    if (err) { setError(err); return; }
    await submitCompany();
  };

  // ── Signed-out: move from company step to account step ──
  const handleCompanyNext = (e: FormEvent) => {
    e.preventDefault();
    const err = validateCompanyData();
    if (err) { setError(err); return; }
    setError(null);
    setStep("account");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Signed-out: create Clerk account ──
  const handleAccountCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      setError(t("onboarding.account.password.hint"));
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      // Clerk v6: create() returns { error }; status is on signUp itself
      const { error: signUpError } = await signUp.create({
        emailAddress: email.trim(),
        password,
      });
      if (signUpError) {
        setError(signUpError.message ?? t("onboarding.error.generic"));
        return;
      }
      if (signUp.status === "complete") {
        autoSubmitRef.current = true;
        await signUp.finalize();
        // useEffect watches isSignedIn → will call submitCompany()
      } else {
        // Email verification required
        await signUp.verifications.sendEmailCode();
        setStep("verify-email");
      }
    } catch (err: unknown) {
      const clerkErr = (err as { errors?: { message: string }[] }).errors?.[0];
      setError(clerkErr?.message ?? t("onboarding.error.generic"));
    } finally {
      setIsPending(false);
    }
  };

  // ── Signed-out: verify email code ──
  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      // Clerk v6: verifyEmailCode returns { error }; status is on signUp itself
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: verifyCode.trim() });
      if (verifyError) {
        setError(verifyError.message ?? t("onboarding.error.generic"));
        return;
      }
      if (signUp.status === "complete") {
        autoSubmitRef.current = true;
        await signUp.finalize();
        // useEffect watches isSignedIn → will call submitCompany()
      } else {
        setError(t("onboarding.error.generic"));
      }
    } catch (err: unknown) {
      const clerkErr = (err as { errors?: { message: string }[] }).errors?.[0];
      setError(clerkErr?.message ?? t("onboarding.error.generic"));
    } finally {
      setIsPending(false);
    }
  };

  // ── Step indicator (for signed-out flow) ──
  const stepIndicator = !isSignedIn ? (
    <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
      {(["company", "account", "verify-email"] as const).map((s, i) => {
        const labels = [t("onboarding.step.company"), t("onboarding.step.account"), t("onboarding.step.verify")];
        const isActive = step === s;
        const isDone =
          (s === "company" && (step === "account" || step === "verify-email")) ||
          (s === "account" && step === "verify-email");
        return (
          <span key={s} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 rtl:rotate-180" />}
            <span
              className={`font-medium transition-colors ${
                isActive
                  ? "text-primary"
                  : isDone
                  ? "text-primary/60"
                  : "text-muted-foreground/50"
              }`}
            >
              {labels[i]}
            </span>
          </span>
        );
      })}
    </div>
  ) : null;

  // ── Company form fields JSX (shared between signed-in and signed-out step 1) ──
  const companyFields = (
    <>
      {/* Section 1: Basic info */}
      <Card className="border-card-border bg-card">
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t("onboarding.form.name")} *</Label>
            <Input
              id="name"
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">{t("onboarding.form.city")} *</Label>
              <Input
                id="city"
                required
                minLength={2}
                maxLength={80}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("onboarding.form.phone")} *</Label>
              <Input
                id="phone"
                type="tel"
                required
                minLength={6}
                maxLength={20}
                value={contactPhone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr">{t("onboarding.form.cr")}</Label>
            <Input
              id="cr"
              maxLength={40}
              value={commercialRegistration}
              onChange={(e) => setCr(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("onboarding.mwan.cr_hint")}</p>
          </div>

          {categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="category">{t("onboarding.form.category")}</Label>
              <select
                id="category"
                value={companyCategoryId}
                onChange={(e) => setCompanyCategoryId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t("onboarding.form.category.placeholder")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {lang === "ar" ? cat.name_ar : cat.name_en}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 1b: MWAN Roles */}
      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-foreground">
          {t("onboarding.form.roles")} *
        </legend>
        <p className="mb-3 text-xs text-muted-foreground">{t("onboarding.form.roles.hint")}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["generator", "receiver", "transporter"] as const).map((role) => {
            const selected = selectedRoles.has(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={`flex items-start gap-3 rounded-lg border p-3 text-start transition-colors ${
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span className={`mt-0.5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`}>
                  {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </span>
                <div>
                  <div className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>
                    {t(`role.${role}`)}
                  </div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {t(`onboarding.form.roles.${role}.desc`)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Section 2: Actions */}
      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-foreground">
          {t("onboarding.form.actions")} *
        </legend>
        <p className="mb-3 text-xs text-muted-foreground">{t("onboarding.form.actions.hint")}</p>
        {lookupLoading ? (
          <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin me-2" />
            {t("onboarding.form.actions.loading")}
          </div>
        ) : lookupError ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 py-6 text-sm text-destructive">
            <span>{t("onboarding.form.actions.error")}</span>
            <button
              type="button"
              className="text-xs underline underline-offset-2"
              onClick={() => window.location.reload()}
            >
              {t("common.retry")}
            </button>
          </div>
        ) : actions.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">
            {t("onboarding.form.actions.empty")}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {actions.map((action) => {
              const selected = selectedActionIds.has(action.id);
              const label = lang === "ar" ? action.name_ar : action.name_en;
              const desc = lang === "ar" ? action.description_ar : action.description_en;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => toggleAction(action.id)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-start transition-colors ${
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span className={`mt-0.5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`}>
                    {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  </span>
                  <div>
                    <div className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>
                      {label}
                    </div>
                    {desc && (
                      <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {hasOtherSelected && (
          <div className="mt-3 space-y-1">
            <Label htmlFor="other_desc">{t("onboarding.form.actions.other_desc")} *</Label>
            <Input
              id="other_desc"
              required
              maxLength={200}
              placeholder={t("onboarding.form.actions.other_placeholder")}
              value={otherActionDesc}
              onChange={(e) => setOtherActionDesc(e.target.value)}
            />
          </div>
        )}
      </fieldset>

      {/* Section 3: License */}
      <div className="space-y-2">
        <Label htmlFor="license">{t("onboarding.form.license_number")}</Label>
        <Input
          id="license"
          maxLength={60}
          dir="ltr"
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t("onboarding.form.license_section.hint")}</p>
      </div>

      {/* Section 4: Terms */}
      <div className="rounded-lg border border-border bg-card p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => { setAcceptedTerms(e.target.checked); setError(null); }}
            className="mt-0.5 h-4 w-4 rounded border-input accent-primary shrink-0"
          />
          <span className="text-sm text-foreground leading-relaxed">
            {t("onboarding.terms.label")}{" "}
            <Link
              href="/terms"
              target="_blank"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
              onClick={(e) => e.stopPropagation()}
            >
              {t("onboarding.terms.link")}
            </Link>
          </span>
        </label>
      </div>
    </>
  );

  // ══════════════════════════════════════════════════
  // SIGNED-IN: direct company form (existing behavior)
  // ══════════════════════════════════════════════════
  if (isSignedIn) {
    return (
      <AppLayout
        showSignOut
        width="narrow"
        title={t("onboarding.title")}
        subtitle={t("onboarding.subtitle")}
      >
        <form onSubmit={handleSignedInSubmit} className="space-y-8">
          {companyFields}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full gap-2" disabled={isPending || !acceptedTerms}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? t("onboarding.form.saving") : t("onboarding.form.submit")}
          </Button>
        </form>
      </AppLayout>
    );
  }

  // ══════════════════════════════════════════════════
  // SIGNED-OUT: step 1 — company data
  // ══════════════════════════════════════════════════
  if (step === "company") {
    return (
      <AppLayout width="narrow" title={t("onboarding.title")} subtitle={t("onboarding.subtitle")}>
        {stepIndicator}
        <form onSubmit={handleCompanyNext} className="space-y-8">
          {companyFields}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full gap-2" disabled={!acceptedTerms}>
            {t("onboarding.company.next")}
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </form>
      </AppLayout>
    );
  }

  // ══════════════════════════════════════════════════
  // SIGNED-OUT: step 2 — create account
  // ══════════════════════════════════════════════════
  if (step === "account") {
    return (
      <AppLayout width="narrow" title={t("onboarding.account.title")} subtitle={t("onboarding.account.subtitle")}>
        {stepIndicator}
        <form onSubmit={handleAccountCreate} className="space-y-6 max-w-sm mx-auto">
          <div className="space-y-2">
            <Label htmlFor="acc-email">{t("onboarding.account.email")} *</Label>
            <Input
              id="acc-email"
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
            <Label htmlFor="acc-password">{t("onboarding.account.password")} *</Label>
            <Input
              id="acc-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              dir="ltr"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
            />
            <p className="text-xs text-muted-foreground">{t("onboarding.account.password.hint")}</p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isPending}
          >
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("onboarding.account.submit")}
          </Button>

          <button
            type="button"
            onClick={() => { setStep("company"); setError(null); }}
            className="w-full text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {t("onboarding.account.back")}
          </button>
        </form>
      </AppLayout>
    );
  }

  // ══════════════════════════════════════════════════
  // SIGNED-OUT: step 3 — email verification
  // ══════════════════════════════════════════════════
  return (
    <AppLayout width="narrow" title={t("onboarding.verify.title")} subtitle={t("onboarding.verify.subtitle")}>
      {stepIndicator}
      <form onSubmit={handleVerify} className="space-y-6 max-w-sm mx-auto">
        <div className="space-y-2">
          <Label htmlFor="verify-code">{t("onboarding.verify.code")} *</Label>
          <Input
            id="verify-code"
            type="text"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            placeholder="000000"
            value={verifyCode}
            onChange={(e) => { setVerifyCode(e.target.value); setError(null); }}
          />
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isPending}
        >
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t("onboarding.verify.submit")}
        </Button>

        <button
          type="button"
          onClick={() => { setStep("account"); setError(null); }}
          className="w-full text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {t("onboarding.verify.back")}
        </button>
      </form>
    </AppLayout>
  );
}
