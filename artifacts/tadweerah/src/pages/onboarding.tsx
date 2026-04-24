import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { CheckSquare, Square, Loader2 } from "lucide-react";
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

export function OnboardingPage() {
  const { t, lang } = useT();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [contactPhone, setPhone] = useState("");
  const [commercialRegistration, setCr] = useState("");
  const [companyCategoryId, setCompanyCategoryId] = useState("");
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set());
  const [otherActionDesc, setOtherActionDesc] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const toggleAction = (id: string) => {
    setSelectedActionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
  };

  const otherAction = actions.find((a) => a.key === "other");
  const hasOtherSelected = otherAction ? selectedActionIds.has(otherAction.id) : false;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedActionIds.size === 0) {
      setError(t("onboarding.form.actions.required"));
      return;
    }
    if (hasOtherSelected && !otherActionDesc.trim()) {
      setError(t("onboarding.form.actions.other_required"));
      return;
    }
    if (!acceptedTerms) {
      setError(t("onboarding.terms.required"));
      return;
    }

    setIsPending(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        city: city.trim(),
        contactPhone: contactPhone.trim(),
        ...(commercialRegistration.trim() ? { commercialRegistration: commercialRegistration.trim() } : {}),
        ...(companyCategoryId ? { company_category_id: companyCategoryId } : {}),
        action_ids: Array.from(selectedActionIds),
        accepted_terms: true,
        ...(licenseNumber.trim() ? { license_number: licenseNumber.trim() } : {}),
      };

      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  return (
    <AppLayout
      showSignOut
      width="narrow"
      title={t("onboarding.title")}
      subtitle={t("onboarding.subtitle")}
    >
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Section 1: Basic info ── */}
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
            </div>

            {/* Company category */}
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

        {/* ── Section 2: Actions multi-select ── */}
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

          {/* "Other" description field */}
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

        {/* ── Section 3: License (always optional) ── */}
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

        {/* ── Section 4: Terms ── */}
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
