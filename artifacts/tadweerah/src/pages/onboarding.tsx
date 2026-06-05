import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth, useSignUp } from "@clerk/react";
import { Link, useLocation, Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, useGetMe } from "@workspace/api-client-react";
import {
  CheckSquare, Square, Loader2, ChevronRight, ChevronLeft,
  Plus, Trash2, ChevronDown, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { useDirtyFormWarning } from "@/hooks/use-dirty-form-warning";

/* ── Types ── */
interface CompanyCategoryOption { id: string; key: string; name_ar: string; name_en: string; }
interface CompanyActionOption {
  id: string; key: string; name_ar: string; name_en: string;
  description_ar: string | null; description_en: string | null;
}
interface LicenseEntry {
  id: string;
  number: string;
  issuer: "mwan" | "municipality" | "other";
  expiryDate: string;
  activityKeys: string[];
}

type OuterStep = "company" | "account" | "verify-email";
type CompanySubStep = 1 | 2 | 3 | 4;

function uid() { return Math.random().toString(36).slice(2); }
function emptyLicense(actKeys: string[] = []): LicenseEntry {
  return { id: uid(), number: "", issuer: "mwan", expiryDate: "", activityKeys: actKeys };
}

/* ══════════════════════════════════════════════════════════════════════════
   Step indicator — defined OUTSIDE the page to prevent remounting
══════════════════════════════════════════════════════════════════════════ */
interface StepIndicatorProps {
  labels: string[];
  activeIndex: number;
}
function StepIndicator({ labels, activeIndex }: StepIndicatorProps) {
  return (
    <div className="mb-6 flex items-center gap-1.5 overflow-x-auto text-sm">
      {labels.map((label, i) => {
        const isActive = i === activeIndex;
        const isDone = i < activeIndex;
        return (
          <span key={i} className="flex shrink-0 items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground rtl:rotate-180" />}
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              isActive ? "bg-primary text-primary-foreground"
              : isDone ? "bg-primary/30 text-primary"
              : "bg-muted text-muted-foreground"
            }`}>{i + 1}</span>
            <span className={`font-medium transition-colors hidden sm:inline ${
              isActive ? "text-foreground"
              : isDone ? "text-primary/70"
              : "text-muted-foreground/60"
            }`}>{label}</span>
          </span>
        );
      })}
    </div>
  );
}

const DRAFT_KEY = "tadweerah_onboarding_draft";
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ══════════════════════════════════════════════════════════════════════════
   Main page
══════════════════════════════════════════════════════════════════════════ */
export function OnboardingPage() {
  const { t, lang } = useT();
  const { isSignedIn, getToken } = useAuth();
  const { signUp } = useSignUp();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: me, isLoading: meLoading } = useGetMe();
  const draft = loadDraft();

  /* ── Step state ── */
  const [outerStep, setOuterStep] = useState<OuterStep>(draft?.outerStep ?? "company");
  const [companySubStep, setCompanySubStep] = useState<CompanySubStep>(draft?.companySubStep ?? 1);
  const autoSubmitRef = useRef(false);

  /* ── Company fields ── */
  const [name, setName] = useState(draft?.name ?? "");
  const [city, setCity] = useState(draft?.city ?? "");
  const [contactPhone, setPhone] = useState(draft?.contactPhone ?? "");
  const [commercialRegistration, setCr] = useState(draft?.commercialRegistration ?? "");
  const [companyCategoryId, setCompanyCategoryId] = useState(draft?.companyCategoryId ?? "");
  const [companyCategoryOther, setCompanyCategoryOther] = useState(draft?.companyCategoryOther ?? "");

  /* ── Activities ── */
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set(draft?.selectedActionIds ?? []));
  const [otherActionDesc, setOtherActionDesc] = useState(draft?.otherActionDesc ?? "");

  /* ── Roles ── */
  const [selectedRoles, setSelectedRoles] = useState<Set<"generator" | "receiver" | "transporter">>(new Set(draft?.selectedRoles ?? ["generator"]));

  /* ── Licenses ── */
  const [multiLicense, setMultiLicense] = useState(draft?.multiLicense ?? false);
  const [licenses, setLicenses] = useState<LicenseEntry[]>(draft?.licenses ?? [emptyLicense()]);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      outerStep, companySubStep, name, city, contactPhone, commercialRegistration,
      companyCategoryId, companyCategoryOther,
      selectedActionIds: Array.from(selectedActionIds),
      otherActionDesc,
      selectedRoles: Array.from(selectedRoles),
      multiLicense, licenses
    }));
  }, [outerStep, companySubStep, name, city, contactPhone, commercialRegistration, companyCategoryId, companyCategoryOther, selectedActionIds, otherActionDesc, selectedRoles, multiLicense, licenses]);

  /* ── Terms ── */
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  /* ── Account (signed-out) ── */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");

  /* ── UI state ── */
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = outerStep === "company" && (name.trim() !== "" || city.trim() !== "" || commercialRegistration.trim() !== "");
  useDirtyFormWarning(isDirty);

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

  useEffect(() => {
    if (isSignedIn && autoSubmitRef.current) {
      autoSubmitRef.current = false;
      void submitCompany();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  /* ── Recover pending Clerk sign-up attempt on mount/refresh ── */
  useEffect(() => {
    if (
      outerStep === "company" &&
      signUp?.status === "missing_requirements" &&
      Array.isArray(signUp.unverifiedFields) &&
      signUp.unverifiedFields.includes("email_address")
    ) {
      if (signUp.emailAddress) setEmail(signUp.emailAddress);
      setOuterStep("verify-email");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signUp?.status]);

  if (!meLoading && isSignedIn && me?.company) return <Redirect to="/dashboard" />;

  /* ── Helpers ── */
  const toggleAction = (id: string, key: string) => {
    setSelectedActionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
    setError(null);
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

  const updateLicense = (id: string, patch: Partial<Omit<LicenseEntry, "id">>) =>
    setLicenses(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));

  const addLicense = () => {
    const selectedKeys = Array.from(selectedActionIds)
      .map(aid => actions.find(a => a.id === aid)?.key ?? "")
      .filter(Boolean);
    setLicenses(ls => [...ls, emptyLicense(selectedKeys)]);
  };

  const removeLicense = (id: string) => setLicenses(ls => ls.filter(l => l.id !== id));

  const toggleLicenseActivity = (licenseId: string, actKey: string) => {
    setLicenses(ls => ls.map(l => {
      if (l.id !== licenseId) return l;
      const has = l.activityKeys.includes(actKey);
      return { ...l, activityKeys: has ? l.activityKeys.filter(k => k !== actKey) : [...l.activityKeys, actKey] };
    }));
  };

  /* ── Per-step validators (run only on Next press) ── */
  const validateStep1 = (): string | null => {
    if (!name.trim()) return `${t("onboarding.form.name")} مطلوب`;
    if (!city.trim()) return `${t("onboarding.form.city")} مطلوبة`;
    const phoneVal = contactPhone.trim();
    if (!phoneVal) return t("onboarding.form.phone.required");
    const phoneClean = phoneVal.replace(/[\s\-().+]/g, "");
    if (!/^\d{7,15}$/.test(phoneClean)) return t("onboarding.form.phone.invalid");
    if (!commercialRegistration.trim()) return t("onboarding.form.cr.required");
    if (categories.find(c => c.id === companyCategoryId)?.key === "other" && !companyCategoryOther.trim())
      return lang === "ar" ? "يرجى كتابة تصنيف الشركة" : "Please describe your company category";
    return null;
  };

  const validateStep2 = (): string | null => {
    if (selectedActionIds.size === 0) return t("onboarding.form.actions.required");
    const otherAction = actions.find(a => a.key === "other");
    if (otherAction && selectedActionIds.has(otherAction.id) && !otherActionDesc.trim())
      return t("onboarding.form.actions.other_required");
    return null;
  };

  const validateStep3 = (): string | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const lic of licenses) {
      if (!lic.expiryDate.trim()) continue;
      const expiry = new Date(lic.expiryDate);
      if (isNaN(expiry.getTime())) continue;
      expiry.setHours(0, 0, 0, 0);
      if (expiry < today) return t("license.expiry.expired");
    }
    return null;
  };

  /* ── Payload builder ── */
  const buildLicensesPayload = () => {
    const filled = licenses.filter(l => l.number.trim());
    if (filled.length === 0) return null;
    return filled.map(l => ({
      number: l.number.trim(),
      issuer: l.issuer,
      expiryDate: l.expiryDate.trim() || undefined,
      activityKeys: l.activityKeys,
    }));
  };

  /* ── API submit ── */
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
        ...(categories.find(c => c.id === companyCategoryId)?.key === "other" && companyCategoryOther.trim() ? { company_category_other: companyCategoryOther.trim() } : {}),
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
      localStorage.removeItem(DRAFT_KEY);
      setLocation("/dashboard");
    } catch {
      setError(t("onboarding.error.generic"));
    } finally {
      setIsPending(false);
    }
  };

  /* ── Sub-step navigation ── */
  const goNextSubStep = () => {
    setError(null);
    if (companySubStep === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setCompanySubStep(2);
    } else if (companySubStep === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      setCompanySubStep(3);
    } else if (companySubStep === 3) {
      const err = validateStep3();
      if (err) { setError(err); return; }
      setCompanySubStep(4);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBackSubStep = () => {
    setError(null);
    if (companySubStep > 1) setCompanySubStep((companySubStep - 1) as CompanySubStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Step 4 submit ── */
  const handleStep4Submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) { setError(t("onboarding.terms.required")); return; }
    if (isSignedIn) {
      await submitCompany();
    } else {
      setError(null);
      setOuterStep("account");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  /* ── Account creation ── */
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
        setOuterStep("verify-email");
      }
    } catch (err: unknown) {
      const clerkErr = (err as { errors?: { message: string }[] }).errors?.[0];
      setError(clerkErr?.message ?? t("onboarding.error.generic"));
    } finally {
      setIsPending(false);
    }
  };

  /* ── Email verification ── */
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

  /* ── Resend verification code ── */
  const [resendSent, setResendSent] = useState(false);
  const handleResendCode = async () => {
    setError(null);
    setIsPending(true);
    try {
      await signUp.verifications.sendEmailCode();
      setResendSent(true);
      setTimeout(() => setResendSent(false), 4000);
    } catch (err: unknown) {
      const clerkErr = (err as { errors?: { message: string }[] }).errors?.[0];
      setError(clerkErr?.message ?? t("onboarding.error.generic"));
    } finally {
      setIsPending(false);
    }
  };

  /* ── Derived ── */
  const selectedActivityKeys = Array.from(selectedActionIds)
    .map(id => actions.find(a => a.id === id)?.key ?? "")
    .filter(Boolean);

  const companyStepLabels = [
    t("onboarding.step.basic_info"),
    t("onboarding.step.activity"),
    t("onboarding.step.licenses_step"),
    t("onboarding.step.confirm"),
  ];
  const outerStepLabels = [
    t("onboarding.step.company"),
    t("onboarding.step.account"),
    t("onboarding.step.verify"),
  ];
  const outerStepIdx = outerStep === "account" ? 1 : 2;

  /* ══════════════════════════════════════════════════════════════
     COMPANY PHASE (sub-steps 1–4)
  ══════════════════════════════════════════════════════════════ */
  if (outerStep === "company" || isSignedIn) {
    return (
      <AppLayout showSignOut={isSignedIn} width="wide" title={t("onboarding.title")} subtitle={t("onboarding.subtitle")}>
        <StepIndicator labels={companyStepLabels} activeIndex={companySubStep - 1} />

        <form
          onSubmit={companySubStep === 4 ? handleStep4Submit : e => { e.preventDefault(); goNextSubStep(); }}
          noValidate
        >
          {/* ─── Sub-step 1: Basic Info ─────────────────────────── */}
          {companySubStep === 1 && (
            <div className="mx-auto max-w-2xl space-y-4">
              {/* B2B notice */}
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <span className="shrink-0">⚠</span>
                {t("onboarding.form.b2b_notice")}
              </div>

              <Card className="border-card-border bg-card">
                <CardContent className="space-y-5 p-6">
                  {/* Company name */}
                  <div className="space-y-2">
                    <Label htmlFor="ob-name">{t("onboarding.form.name")} *</Label>
                    <Input
                      id="ob-name"
                      name="company-name"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      minLength={2}
                      maxLength={120}
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>

                  {/* City + Mobile */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ob-city">{t("onboarding.form.city")} *</Label>
                      <Input
                        id="ob-city"
                        name="company-city"
                        autoComplete="off"
                        minLength={2}
                        maxLength={80}
                        value={city}
                        onChange={e => setCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ob-phone">{t("onboarding.form.phone")} *</Label>
                      <Input
                        id="ob-phone"
                        name="company-phone"
                        type="tel"
                        autoComplete="off"
                        inputMode="tel"
                        placeholder="05xxxxxxxx"
                        dir="ltr"
                        minLength={9}
                        maxLength={15}
                        value={contactPhone}
                        onChange={e => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Commercial Registration — REQUIRED */}
                  <div className="space-y-2">
                    <Label htmlFor="ob-cr">{t("onboarding.form.cr")} *</Label>
                    <Input
                      id="ob-cr"
                      name="company-cr"
                      autoComplete="off"
                      maxLength={40}
                      value={commercialRegistration}
                      onChange={e => setCr(e.target.value)}
                    />
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      {t("onboarding.form.cr.hint")}
                    </p>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="ob-category">{t("onboarding.form.category")}</Label>
                    <div className="relative">
                      <select
                        id="ob-category"
                        value={companyCategoryId}
                        onChange={e => { setCompanyCategoryId(e.target.value); setCompanyCategoryOther(""); }}
                        className="w-full h-9 appearance-none rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">{t("onboarding.form.category.placeholder")}</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{lang === "ar" ? cat.name_ar : cat.name_en}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    {/* Free-text when the DB "other" category is selected — required */}
                    {categories.find(c => c.id === companyCategoryId)?.key === "other" && (
                      <Input
                        id="ob-category-other"
                        name="company-category-other"
                        autoComplete="off"
                        maxLength={100}
                        placeholder={lang === "ar" ? "اكتب تصنيف شركتك... *" : "Describe your company category... *"}
                        value={companyCategoryOther}
                        onChange={e => setCompanyCategoryOther(e.target.value)}
                        className="mt-2 border-primary/50 focus:ring-primary"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ─── Sub-step 2: Activities + Roles ────────────────── */}
          {companySubStep === 2 && (
            <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">

              {/* ── Column 1: Activities ─────────────────────────────── */}
              <div>
                <h3 className="mb-1 text-sm font-semibold text-foreground">{t("onboarding.form.actions")} *</h3>
                <p className="mb-3 text-xs text-muted-foreground">{t("onboarding.form.actions.hint")}</p>
                {lookupLoading ? (
                  <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
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
                              {desc && <div className="mt-0.5 text-xs leading-snug text-muted-foreground line-clamp-2">{desc}</div>}
                            </div>
                          </button>
                          {isOther && selected && (
                            <div className="border-t border-border px-3 pb-3 pt-2">
                              <Input
                                name="other-action-desc"
                                autoComplete="off"
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

              {/* ── Column 2: Roles ──────────────────────────────────── */}
              <fieldset className="flex flex-col">
                <legend className="mb-1 block text-sm font-semibold text-foreground">{t("onboarding.form.roles")} *</legend>
                <p className="mb-3 text-xs text-muted-foreground">{t("onboarding.form.roles.hint")}</p>
                <div className="flex flex-col gap-2">
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
                          <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{t(`onboarding.form.roles.${role}.desc`)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

            </div>
          )}

          {/* ─── Sub-step 3: Licenses ───────────────────────────── */}
          {companySubStep === 3 && (
            <div className="mx-auto max-w-2xl">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">{t("onboarding.form.license_number")}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("license.hint")}</p>
              </div>
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
                  onClick={() => setMultiLicense(true)}
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
                            name={`lic-num-${lic.id}`}
                            dir="ltr"
                            autoComplete="off"
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
                      {multiLicense && selectedActivityKeys.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs">{t("license.linked_activities")}</Label>
                          <div className="flex flex-wrap gap-2">
                            {actions.filter(a => selectedActionIds.has(a.id)).map(a => {
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
          )}

          {/* ─── Sub-step 4: Summary + Terms ───────────────────── */}
          {companySubStep === 4 && (
            <div className="mx-auto max-w-2xl space-y-5">
              <Card className="border-card-border bg-card">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                    {lang === "ar" ? "ملخص التسجيل" : "Registration Summary"}
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{t("onboarding.form.name")}</dt>
                      <dd className="font-medium text-end">{name || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{t("onboarding.form.city")}</dt>
                      <dd className="font-medium text-end">{city || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{lang === "ar" ? "الأنشطة" : "Activities"}</dt>
                      <dd className="font-medium text-end">
                        {selectedActionIds.size > 0
                          ? Array.from(selectedActionIds).map(id => {
                            const a = actions.find(x => x.id === id);
                            return a ? (lang === "ar" ? a.name_ar : a.name_en) : "";
                          }).filter(Boolean).join("، ")
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{lang === "ar" ? "الأدوار" : "Roles"}</dt>
                      <dd className="font-medium text-end">
                        {Array.from(selectedRoles).map(r => t(`role.${r}`)).join("، ") || "—"}
                      </dd>
                    </div>
                    {licenses.some(l => l.number.trim()) && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">{lang === "ar" ? "رقم الرخصة" : "License #"}</dt>
                        <dd className="font-medium text-end dir-ltr">
                          {licenses.filter(l => l.number.trim()).map(l => l.number).join(", ")}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
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
                    <button
                      type="button"
                      className="text-primary underline underline-offset-2 hover:text-primary/80"
                      onClick={e => { e.stopPropagation(); setShowTermsModal(true); }}
                    >
                      {t("onboarding.terms.link")}
                    </button>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ─── Error ──────────────────────────────────────────── */}
          {error && (
            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* ─── Navigation ─────────────────────────────────────── */}
          <div className={`mt-6 flex gap-3 ${companySubStep !== 2 ? "mx-auto max-w-2xl" : ""}`}>
            {companySubStep > 1 && (
              <Button type="button" variant="outline" className="gap-1.5" onClick={goBackSubStep}>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                {t("onboarding.nav.back")}
              </Button>
            )}
            <Button
              type="submit"
              size="lg"
              className="flex-1 gap-2"
              disabled={companySubStep === 4 ? (!acceptedTerms || isPending) : isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {companySubStep === 4
                ? (isSignedIn
                    ? (isPending ? t("onboarding.form.saving") : t("onboarding.form.submit"))
                    : t("onboarding.nav.next_account"))
                : t("onboarding.nav.next")}
              {companySubStep < 4 && <ChevronRight className="h-4 w-4 rtl:rotate-180" />}
            </Button>
          </div>
        </form>

        {/* ─── Terms Modal ─────────────────────────────────── */}
        <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("terms.title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm text-foreground">
              {([1, 2, 3, 4, 5] as const).map(n => (
                <section key={n} className="space-y-1">
                  <h3 className="font-semibold text-foreground">{t(`terms.section${n}.title` as any)}</h3>
                  <p className="text-muted-foreground leading-relaxed">{t(`terms.section${n}.body` as any)}</p>
                </section>
              ))}
              <div className="border-t border-border pt-3 space-y-0.5">
                <p className="text-xs text-muted-foreground">{t("terms.lastUpdated")}</p>
                <p className="text-xs">
                  <a href="mailto:info@tadweerah.com" className="text-primary hover:underline">
                    {t("terms.support")}
                  </a>
                </p>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <DialogClose asChild>
                <Button type="button">
                  {lang === "ar" ? "فهمت، أغلق" : "Got it, close"}
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

      </AppLayout>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     ACCOUNT CREATION
  ══════════════════════════════════════════════════════════════ */
  if (outerStep === "account") {
    return (
      <AppLayout width="narrow" title={t("onboarding.account.title")} subtitle={t("onboarding.account.subtitle")}>
        <StepIndicator labels={outerStepLabels} activeIndex={outerStepIdx} />
        <form onSubmit={handleAccountCreate} className="mx-auto max-w-sm space-y-6">
          <div className="space-y-2">
            <Label htmlFor="acc-email">{t("onboarding.account.email")} *</Label>
            <Input id="acc-email" type="email" required autoComplete="email" inputMode="email" dir="ltr"
              value={email} onChange={e => { setEmail(e.target.value); setError(null); }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-password">{t("onboarding.account.password")} *</Label>
            <div className="relative">
              <Input id="acc-password" type={showPassword ? "text" : "password"} required minLength={8}
                autoComplete="new-password" dir="ltr" className="pr-10"
                value={password} onChange={e => { setPassword(e.target.value); setError(null); }} />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t("onboarding.account.password.hint")}</p>
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("onboarding.account.submit")}
          </Button>
          <button type="button"
            onClick={() => { setOuterStep("company"); setCompanySubStep(4); setError(null); }}
            className="w-full text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
            {t("onboarding.account.back")}
          </button>
        </form>
      </AppLayout>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     EMAIL VERIFICATION
  ══════════════════════════════════════════════════════════════ */
  return (
    <AppLayout width="narrow" title={t("onboarding.verify.title")} subtitle={t("onboarding.verify.subtitle")}>
      <StepIndicator labels={outerStepLabels} activeIndex={outerStepIdx} />
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
        {resendSent ? (
          <p className="text-center text-sm text-primary">{t("onboarding.verify.resend.sent")}</p>
        ) : (
          <button type="button" onClick={handleResendCode} disabled={isPending}
            className="w-full text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50">
            {t("onboarding.verify.resend")}
          </button>
        )}
        <button type="button" onClick={() => { setOuterStep("account"); setError(null); }}
          className="w-full text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground">
          {t("onboarding.verify.back")}
        </button>
      </form>
    </AppLayout>
  );
}
