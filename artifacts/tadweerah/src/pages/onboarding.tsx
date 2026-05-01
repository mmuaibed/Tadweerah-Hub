import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth, useSignUp } from "@clerk/react";
import { Link, useLocation, Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, useGetMe } from "@workspace/api-client-react";
import {
  CheckSquare, Square, Loader2, ChevronRight,
  Plus, Trash2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

/* ── Types ── */
interface CompanyCategoryOption { id: string; key: string; name_ar: string; name_en: string; }
interface CompanyActionOption {
  id: string; key: string; name_ar: string; name_en: string;
  description_ar: string | null; description_en: string | null;
}
interface LicenseEntry {
  id: string;        // local React key
  number: string;
  issuer: "mwan" | "municipality" | "other";
  expiryDate: string;
  activityKeys: string[];
}

type OnboardingStep = "company" | "account" | "verify-email";

/* ── Helpers ── */
function uid() { return Math.random().toString(36).slice(2); }

function emptyLicense(actKeys: string[] = []): LicenseEntry {
  return { id: uid(), number: "", issuer: "mwan", expiryDate: "", activityKeys: actKeys };
}

/* ══════════════════════════════════════════════════════════════ */
export function OnboardingPage() {
  const { t, lang } = useT();
  const { isSignedIn, getToken } = useAuth();
  const { signUp } = useSignUp();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: me, isLoading: meLoading } = useGetMe();

  const [step, setStep] = useState<OnboardingStep>("company");
  const autoSubmitRef = useRef(false);

  /* ── Company fields ── */
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [contactPhone, setPhone] = useState("");
  const [commercialRegistration, setCr] = useState("");
  const [companyCategoryId, setCompanyCategoryId] = useState("");

  /* ── Activities (from API) ── */
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set());
  const [otherActionDesc, setOtherActionDesc] = useState("");

  /* ── Roles ── */
  const [selectedRoles, setSelectedRoles] = useState<Set<"generator" | "receiver" | "transporter">>(new Set(["generator"]));

  /* ── Licenses ── */
  const [multiLicense, setMultiLicense] = useState(false);
  const [licenses, setLicenses] = useState<LicenseEntry[]>([emptyLicense()]);

  /* ── Terms ── */
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  /* ── Account (signed-out) ── */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  /* ── UI state ── */
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Lookup data ── */
  const [categories, setCategories] = useState<CompanyCategoryOption[]>([]);
  const [actions, setActions] = useState<CompanyActionOption[]>([]);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLookupLoading(true);
    setLookupError(false);
    Promise.all([
      fetch("/api/lookup/company-categories").then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch("/api/lookup/company-actions").then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    ])
      .then(([cats, acts]) => {
        if (cancelled) return;
        if (Array.isArray(cats)) setCategories(cats as CompanyCategoryOption[]);
        if (Array.isArray(acts)) setActions(acts as CompanyActionOption[]);
      })
      .catch(() => { if (!cancelled) setLookupError(true); })
      .finally(() => { if (!cancelled) setLookupLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* After setActive() isSignedIn becomes true — auto-submit company */
  useEffect(() => {
    if (isSignedIn && autoSubmitRef.current) {
      autoSubmitRef.current = false;
      void submitCompany();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  /* ── Redirect signed-in users who already have a company ── */
  if (!meLoading && isSignedIn && me?.company) return <Redirect to="/dashboard" />;

  /* ── Helpers: toggle action / role / license ── */
  const toggleAction = (id: string, key: string) => {
    setSelectedActionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
    setError(null);
    // Keep license activity keys in sync (remove deselected activity)
    if (selectedActionIds.has(id)) {
      setLicenses(ls => ls.map(l => ({ ...l, activityKeys: l.activityKeys.filter(k => k !== key) })));
    }
  };

  const toggleRole = (role: "generator" | "receiver" | "transporter") => {
    setSelectedRoles(prev => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
  };

  const updateLicense = (id: string, patch: Partial<Omit<LicenseEntry, "id">>) => {
    setLicenses(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
  };

  const addLicense = () => {
    const selectedKeys = Array.from(selectedActionIds).map(actionId => {
      const a = actions.find(a => a.id === actionId);
      return a?.key ?? "";
    }).filter(Boolean);
    setLicenses(ls => [...ls, emptyLicense(selectedKeys)]);
  };

  const removeLicense = (id: string) => {
    setLicenses(ls => ls.filter(l => l.id !== id));
  };

  const toggleLicenseActivity = (licenseId: string, actKey: string) => {
    setLicenses(ls => ls.map(l => {
      if (l.id !== licenseId) return l;
      const has = l.activityKeys.includes(actKey);
      return { ...l, activityKeys: has ? l.activityKeys.filter(k => k !== actKey) : [...l.activityKeys, actKey] };
    }));
  };

  /* ── Validation ── */
  const validateCompanyData = (): string | null => {
    if (!name.trim()) return `${t("onboarding.form.name")} ${t("onboarding.terms.required")}`;
    if (!city.trim()) return `${t("onboarding.form.city")} ${t("onboarding.terms.required")}`;
    if (selectedActionIds.size === 0) return t("onboarding.form.actions.required");
    const otherAction = actions.find(a => a.key === "other");
    if (otherAction && selectedActionIds.has(otherAction.id) && !otherActionDesc.trim())
      return t("onboarding.form.actions.other_required");
    if (!acceptedTerms) return t("onboarding.terms.required");
    const phoneVal = contactPhone.trim();
    if (!phoneVal) return t("onboarding.form.phone.required");
    const phoneClean = phoneVal.replace(/[\s\-().+]/g, "");
    if (!/^\d{7,15}$/.test(phoneClean)) return t("onboarding.form.phone.invalid");
    return null;
  };

  /* ── Build licenses payload ── */
  const buildLicensesPayload = () => {
    const filledLicenses = licenses.filter(l => l.number.trim());
    if (filledLicenses.length === 0) return null;
    return filledLicenses.map(l => ({
      number: l.number.trim(),
      issuer: l.issuer,
      expiryDate: l.expiryDate.trim() || undefined,
      activityKeys: l.activityKeys,
    }));
  };

  /* ── API: create company ── */
  const submitCompany = async () => {
    setError(null);
    setIsPending(true);
    try {
      const licensesPayload = buildLicensesPayload();
      const body: Record<string, unknown> = {
        name: name.trim(),
        city: city.trim(),
        contactPhone: contactPhone.trim(),
        ...(commercialRegistration.trim() ? { commercialRegistration: commercialRegistration.trim() } : {}),
        ...(companyCategoryId ? { company_category_id: companyCategoryId } : {}),
        action_ids: Array.from(selectedActionIds),
        roles: Array.from(selectedRoles),
        accepted_terms: true,
        ...(licensesPayload ? { licenses: licensesPayload } : {}),
        ...(otherActionDesc.trim() ? { other_action_desc: otherActionDesc.trim() } : {}),
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
        setError((data as { message?: string }).message ?? t("onboarding.error.generic"));
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

  /* ── Signed-in: direct submit ── */
  const handleSignedInSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateCompanyData();
    if (err) { setError(err); return; }
    await submitCompany();
  };

  /* ── Signed-out: company → account ── */
  const handleCompanyNext = (e: FormEvent) => {
    e.preventDefault();
    const err = validateCompanyData();
    if (err) { setError(err); return; }
    setError(null);
    setStep("account");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Signed-out: create Clerk user ── */
  const handleAccountCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 8) { setError(t("onboarding.account.password.hint")); return; }
    setError(null);
    setIsPending(true);
    try {
      const { error: signUpError } = await signUp.create({ emailAddress: email.trim(), password });
      if (signUpError) { setError(signUpError.message ?? t("onboarding.error.generic")); return; }
      if (signUp.status === "complete") {
        autoSubmitRef.current = true;
        await signUp.finalize();
      } else {
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

  /* ── Signed-out: verify email ── */
  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: verifyCode.trim() });
      if (verifyError) { setError(verifyError.message ?? t("onboarding.error.generic")); return; }
      if (signUp.status === "complete") {
        autoSubmitRef.current = true;
        await signUp.finalize();
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

  /* ── Step indicator ── */
  const steps = isSignedIn
    ? [t("onboarding.step.company")]
    : [t("onboarding.step.company"), t("onboarding.step.account"), t("onboarding.step.verify")];
  const currentStepIdx = step === "company" ? 0 : step === "account" ? 1 : 2;

  const StepIndicator = () => (
    <div className="mb-6 flex items-center gap-2 overflow-x-auto text-sm">
      {steps.map((label, i) => {
        const isActive = i === currentStepIdx;
        const isDone = i < currentStepIdx;
        return (
          <span key={i} className="flex shrink-0 items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground rtl:rotate-180" />}
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/30 text-primary" : "bg-muted text-muted-foreground"
            }`}>{i + 1}</span>
            <span className={`font-medium transition-colors ${isActive ? "text-foreground" : isDone ? "text-primary/70" : "text-muted-foreground/60"}`}>
              {label}
            </span>
          </span>
        );
      })}
    </div>
  );

  /* ── Get selected activity keys ── */
  const selectedActivityKeys = Array.from(selectedActionIds)
    .map(id => actions.find(a => a.id === id)?.key ?? "")
    .filter(Boolean);

  /* ── Company form sections ── */
  const companyFields = (
    <div className="space-y-8">

      {/* Section 1: Basic Info */}
      <Card className="border-card-border bg-card">
        <CardContent className="space-y-5 p-6">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4">
            {t("onboarding.form.basic_info_title") || "المعلومات الأساسية"}
          </h3>
          <div className="space-y-2">
            <Label htmlFor="name">{t("onboarding.form.name")} *</Label>
            <Input id="name" required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">{t("onboarding.form.city")} *</Label>
              <Input id="city" required minLength={2} maxLength={80} value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("onboarding.form.phone")} *</Label>
              <Input id="phone" type="tel" required minLength={6} maxLength={20} value={contactPhone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cr">{t("onboarding.form.cr")}</Label>
            <Input id="cr" maxLength={40} value={commercialRegistration} onChange={e => setCr(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t("onboarding.mwan.cr_hint")}</p>
          </div>
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="category">{t("onboarding.form.category")}</Label>
              <div className="relative">
                <select
                  id="category"
                  value={companyCategoryId}
                  onChange={e => setCompanyCategoryId(e.target.value)}
                  className="w-full h-9 appearance-none rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t("onboarding.form.category.placeholder")}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{lang === "ar" ? cat.name_ar : cat.name_en}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Activities */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">{t("onboarding.form.actions")} *</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("onboarding.form.actions.hint")}</p>
        </div>
        {lookupLoading ? (
          <div className="flex h-16 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="me-2 h-4 w-4 animate-spin" /> {t("onboarding.form.actions.loading")}
          </div>
        ) : lookupError ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 py-6 text-sm text-destructive">
            <span>{t("onboarding.form.actions.error")}</span>
            <button type="button" className="text-xs underline" onClick={() => window.location.reload()}>{t("common.retry")}</button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {actions.map(action => {
              const selected = selectedActionIds.has(action.id);
              const label = lang === "ar" ? action.name_ar : action.name_en;
              const desc = lang === "ar" ? action.description_ar : action.description_en;
              const isOther = action.key === "other";
              return (
                <div key={action.id} className={`rounded-lg border transition-colors ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/40"}`}>
                  <button
                    type="button"
                    onClick={() => toggleAction(action.id, action.key)}
                    className="flex w-full items-start gap-3 p-3 text-start"
                  >
                    <span className={`mt-0.5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`}>
                      {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </span>
                    <div>
                      <div className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>{label}</div>
                      {desc && <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</div>}
                    </div>
                  </button>
                  {isOther && selected && (
                    <div className="border-t border-border px-3 pb-3 pt-2">
                      <Input
                        required
                        maxLength={200}
                        placeholder={t("onboarding.form.actions.other_placeholder")}
                        value={otherActionDesc}
                        onChange={e => setOtherActionDesc(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2b: Roles (MWAN) */}
      <fieldset>
        <legend className="mb-1 block text-sm font-semibold text-foreground">{t("onboarding.form.roles")} *</legend>
        <p className="mb-3 text-xs text-muted-foreground">{t("onboarding.form.roles.hint")}</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["generator", "receiver", "transporter"] as const).map(role => {
            const selected = selectedRoles.has(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={`flex items-start gap-3 rounded-lg border p-3 text-start transition-colors ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/40"}`}
              >
                <span className={`mt-0.5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`}>
                  {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                </span>
                <div>
                  <div className={`text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>{t(`role.${role}`)}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t(`onboarding.form.roles.${role}.desc`)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Section 3: Licenses */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">{t("onboarding.form.license_number")}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("license.hint")}</p>
        </div>

        {/* Single / Multiple toggle */}
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => { setMultiLicense(false); setLicenses([licenses[0] ?? emptyLicense()]); }}
            className={`rounded-full border px-4 py-1 text-sm font-medium transition-colors ${!multiLicense ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/50"}`}
          >
            {t("license.single_label")}
          </button>
          <button
            type="button"
            onClick={() => { setMultiLicense(true); }}
            className={`rounded-full border px-4 py-1 text-sm font-medium transition-colors ${multiLicense ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/50"}`}
          >
            {t("license.multi_label")}
          </button>
        </div>

        {multiLicense && (
          <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
            {t("license.multi_hint")}
          </p>
        )}

        <div className="space-y-3">
          {licenses.map((lic, idx) => (
            <Card key={lic.id} className="border-border bg-card">
              <CardContent className="space-y-4 p-4">
                {multiLicense && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {lang === "ar" ? `رخصة ${idx + 1}` : `License ${idx + 1}`}
                    </span>
                    {licenses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLicense(lic.id)}
                        className="flex items-center gap-1 text-xs text-destructive hover:underline"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("license.remove")}
                      </button>
                    )}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`lic-num-${lic.id}`}>{t("license.number")}</Label>
                    <Input
                      id={`lic-num-${lic.id}`}
                      dir="ltr"
                      maxLength={60}
                      placeholder="MWAN-XXXXX"
                      value={lic.number}
                      onChange={e => updateLicense(lic.id, { number: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`lic-issuer-${lic.id}`}>{t("license.issuer")}</Label>
                    <select
                      id={`lic-issuer-${lic.id}`}
                      value={lic.issuer}
                      onChange={e => updateLicense(lic.id, { issuer: e.target.value as LicenseEntry["issuer"] })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="mwan">{t("license.issuer.mwan")}</option>
                      <option value="municipality">{t("license.issuer.municipality")}</option>
                      <option value="other">{t("license.issuer.other")}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`lic-expiry-${lic.id}`}>{t("license.expiry")}</Label>
                  <Input
                    id={`lic-expiry-${lic.id}`}
                    type="date"
                    dir="ltr"
                    value={lic.expiryDate}
                    onChange={e => updateLicense(lic.id, { expiryDate: e.target.value })}
                  />
                </div>

                {/* Linked activities — only show if there are selected activities and multiLicense */}
                {multiLicense && selectedActivityKeys.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs">{t("license.linked_activities")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {actions
                        .filter(a => selectedActionIds.has(a.id))
                        .map(a => {
                          const linked = lic.activityKeys.includes(a.key);
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => toggleLicenseActivity(lic.id, a.key)}
                              className={`rounded-full border px-3 py-1 text-xs transition-colors ${linked ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/40"}`}
                            >
                              {lang === "ar" ? a.name_ar : a.name_en}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {multiLicense && (
          <button
            type="button"
            onClick={addLicense}
            className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-primary/40 px-4 py-2.5 text-sm text-primary hover:border-primary hover:bg-primary/5 transition-colors w-full justify-center"
          >
            <Plus className="h-4 w-4" />
            {t("license.add")}
          </button>
        )}
      </div>

      {/* Section 4: Terms */}
      <div className="rounded-lg border border-border bg-card p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={e => { setAcceptedTerms(e.target.checked); setError(null); }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
          />
          <span className="text-sm text-foreground leading-relaxed">
            {t("onboarding.terms.label")}{" "}
            <Link href="/terms" target="_blank"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
              onClick={e => e.stopPropagation()}
            >
              {t("onboarding.terms.link")}
            </Link>
          </span>
        </label>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     SIGNED-IN: direct form
  ══════════════════════════════════════════════════════════════ */
  if (isSignedIn) {
    return (
      <AppLayout showSignOut width="narrow" title={t("onboarding.title")} subtitle={t("onboarding.subtitle")}>
        <StepIndicator />
        <form onSubmit={handleSignedInSubmit} className="space-y-0">
          {companyFields}
          {error && (
            <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <Button type="submit" size="lg" className="mt-6 w-full gap-2" disabled={isPending || !acceptedTerms}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? t("onboarding.form.saving") : t("onboarding.form.submit")}
          </Button>
        </form>
      </AppLayout>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     SIGNED-OUT: step 1 — company data
  ══════════════════════════════════════════════════════════════ */
  if (step === "company") {
    return (
      <AppLayout width="narrow" title={t("onboarding.title")} subtitle={t("onboarding.subtitle")}>
        <StepIndicator />
        <form onSubmit={handleCompanyNext} className="space-y-0">
          {companyFields}
          {error && (
            <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <Button type="submit" size="lg" className="mt-6 w-full gap-2" disabled={!acceptedTerms}>
            {t("onboarding.company.next")}
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>
        </form>
      </AppLayout>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     SIGNED-OUT: step 2 — account creation
  ══════════════════════════════════════════════════════════════ */
  if (step === "account") {
    return (
      <AppLayout width="narrow" title={t("onboarding.account.title")} subtitle={t("onboarding.account.subtitle")}>
        <StepIndicator />
        <form onSubmit={handleAccountCreate} className="mx-auto max-w-sm space-y-6">
          <div className="space-y-2">
            <Label htmlFor="acc-email">{t("onboarding.account.email")} *</Label>
            <Input id="acc-email" type="email" required autoComplete="email" inputMode="email" dir="ltr"
              value={email} onChange={e => { setEmail(e.target.value); setError(null); }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-password">{t("onboarding.account.password")} *</Label>
            <Input id="acc-password" type="password" required minLength={8} autoComplete="new-password" dir="ltr"
              value={password} onChange={e => { setPassword(e.target.value); setError(null); }} />
            <p className="text-xs text-muted-foreground">{t("onboarding.account.password.hint")}</p>
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("onboarding.account.submit")}
          </Button>
          <button type="button" onClick={() => { setStep("company"); setError(null); }}
            className="w-full text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
            {t("onboarding.account.back")}
          </button>
        </form>
      </AppLayout>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     SIGNED-OUT: step 3 — email verification
  ══════════════════════════════════════════════════════════════ */
  return (
    <AppLayout width="narrow" title={t("onboarding.verify.title")} subtitle={t("onboarding.verify.subtitle")}>
      <StepIndicator />
      <form onSubmit={handleVerify} className="mx-auto max-w-sm space-y-6">
        <div className="space-y-2">
          <Label htmlFor="verify-code">{t("onboarding.verify.code")} *</Label>
          <Input id="verify-code" type="text" required inputMode="numeric" autoComplete="one-time-code"
            dir="ltr" placeholder="000000" value={verifyCode}
            onChange={e => { setVerifyCode(e.target.value); setError(null); }} />
        </div>
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t("onboarding.verify.submit")}
        </Button>
        <button type="button" onClick={() => { setStep("account"); setError(null); }}
          className="w-full text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
          {t("onboarding.verify.back")}
        </button>
      </form>
    </AppLayout>
  );
}
