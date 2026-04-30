import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import {
  Loader2,
  Save,
  Building2,
  Phone,
  MapPin,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  AlertTriangle,
  Users,
} from "lucide-react";
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

type MwanRole = "generator" | "receiver" | "transporter";

interface CompanyProfile {
  id: string;
  name: string;
  city: string;
  contactPhone: string;
  commercialRegistration?: string;
  license_number?: string;
  license_status?: "pending" | "approved" | "rejected" | "expired";
  company_category_id?: string;
  category_name_ar?: string;
  category_name_en?: string;
  accepted_terms_at?: string;
  createdAt: string;
  roles?: MwanRole[];
}

function LicenseStatusBadge({ status }: { status?: string }) {
  const { t } = useT();
  if (!status) return null;

  const configs: Record<string, { icon: typeof ShieldCheck; cls: string; key: string }> = {
    approved:  { icon: ShieldCheck, cls: "text-emerald-700 bg-emerald-50 border-emerald-200", key: "profile.license.approved" },
    pending:   { icon: Clock,       cls: "text-amber-700 bg-amber-50 border-amber-200",     key: "profile.license.pending"  },
    rejected:  { icon: ShieldX,     cls: "text-red-700 bg-red-50 border-red-200",           key: "profile.license.rejected" },
    expired:   { icon: ShieldAlert, cls: "text-orange-700 bg-orange-50 border-orange-200",  key: "profile.license.expired"  },
  };
  const cfg = configs[status];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {t(cfg.key)}
    </span>
  );
}

export function CompanyProfilePage() {
  const { t, lang } = useT();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [categories, setCategories] = useState<CompanyCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [contactPhone, setPhone] = useState("");
  const [cr, setCr] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [categoryCategoryId, setCategoryId] = useState("");

  // ── Roles ──────────────────────────────────────────────────────────────────
  const [selectedRoles, setSelectedRoles] = useState<Set<MwanRole>>(new Set());
  const [rolesSaving, setRolesSaving] = useState(false);
  const [rolesSaved, setRolesSaved] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  const toggleRole = (role: MwanRole) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        if (next.size > 1) next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
    setRolesSaved(false);
  };

  const saveRoles = async () => {
    setRolesSaving(true);
    setRolesError(null);
    setRolesSaved(false);
    try {
      const token = await getToken();
      const res = await fetch("/api/companies/mine/roles", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ roles: Array.from(selectedRoles) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRolesError((data as { message?: string }).message ?? t("onboarding.error.generic"));
        return;
      }
      // Invalidate /me so dashboard reacts immediately
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      // Also invalidate the company query used by the dashboard
      await queryClient.invalidateQueries({ queryKey: ["company"] });
      setRolesSaved(true);
      setTimeout(() => setRolesSaved(false), 4000);
    } catch {
      setRolesError(t("onboarding.error.generic"));
    } finally {
      setRolesSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const [profileRes, catsRes] = await Promise.all([
          fetch("/api/companies/mine", { headers, credentials: "include" }),
          fetch("/api/lookup/company-categories"),
        ]);
        if (cancelled) return;

        if (profileRes.ok) {
          const data = await profileRes.json() as CompanyProfile;
          setProfile(data);
          setName(data.name);
          setCity(data.city);
          setPhone(data.contactPhone);
          setCr(data.commercialRegistration ?? "");
          setLicenseNumber(data.license_number ?? "");
          setCategoryId(data.company_category_id ?? "");
          if (data.roles && data.roles.length > 0) {
            setSelectedRoles(new Set(data.roles));
          }
        }
        if (catsRes.ok) {
          const cats = await catsRes.json() as CompanyCategoryOption[];
          if (Array.isArray(cats)) setCategories(cats);
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [getToken]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!name.trim() || name.trim().length < 2) {
      setError(t("onboarding.form.name") + " " + t("profile.error.required"));
      return;
    }
    if (!city.trim() || city.trim().length < 2) {
      setError(t("onboarding.form.city") + " " + t("profile.error.required"));
      return;
    }
    if (!contactPhone.trim() || contactPhone.trim().length < 6) {
      setError(t("onboarding.form.phone") + " " + t("profile.error.required"));
      return;
    }

    setIsPending(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/companies/mine", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim(),
          contactPhone: contactPhone.trim(),
          commercialRegistration: cr.trim() || null,
          license_number: licenseNumber.trim() || null,
          company_category_id: categoryCategoryId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { message?: string }).message ?? t("onboarding.error.generic"));
        return;
      }

      const updated = await res.json() as CompanyProfile;
      setProfile((prev) => prev ? { ...prev, ...updated } : updated);
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch {
      setError(t("onboarding.error.generic"));
    } finally {
      setIsPending(false);
    }
  };

  if (loading) {
    return (
      <AppLayout showSignOut>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showSignOut title={t("profile.title")} subtitle={t("profile.subtitle")}>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

        {/* License status badge */}
        {profile?.license_status && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{t("profile.license.status")}:</span>
            <LicenseStatusBadge status={profile.license_status} />
          </div>
        )}

        {/* MWAN compliance warning — shown when CR or license number is missing */}
        {profile && (!profile.commercialRegistration || !profile.license_number) && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-800">{t("profile.missing_compliance")}</p>
          </div>
        )}

        {/* Basic info */}
        <Card className="border-card-border bg-card">
          <CardContent className="space-y-5 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("profile.section.basic")}
            </p>

            <div className="space-y-2">
              <Label htmlFor="name">
                <Building2 className="inline h-3.5 w-3.5 me-1 text-muted-foreground" />
                {t("onboarding.form.name")} *
              </Label>
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
                <Label htmlFor="city">
                  <MapPin className="inline h-3.5 w-3.5 me-1 text-muted-foreground" />
                  {t("onboarding.form.city")} *
                </Label>
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
                <Label htmlFor="phone">
                  <Phone className="inline h-3.5 w-3.5 me-1 text-muted-foreground" />
                  {t("onboarding.form.phone")} *
                </Label>
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
              <Label htmlFor="cr">
                <FileText className="inline h-3.5 w-3.5 me-1 text-muted-foreground" />
                {t("onboarding.form.cr")}
              </Label>
              <Input
                id="cr"
                maxLength={40}
                value={cr}
                onChange={(e) => setCr(e.target.value)}
              />
            </div>

            {categories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="category">{t("onboarding.form.category")}</Label>
                <select
                  id="category"
                  value={categoryCategoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
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

        {/* License */}
        <Card className="border-card-border bg-card">
          <CardContent className="space-y-4 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("onboarding.form.license_section")}
            </p>
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
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {saved && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
            {t("profile.saved")}
          </div>
        )}

        <Button type="submit" size="lg" className="gap-2" disabled={isPending}>
          {isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> {t("profile.saving")}</>
          ) : (
            <><Save className="h-4 w-4" /> {t("profile.save")}</>
          )}
        </Button>
      </form>

      {/* ── Roles Section (separate save — calls PUT /companies/mine/roles) ──── */}
      <div className="max-w-2xl mt-6">
        <Card className="border-card-border bg-card">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("onboarding.form.roles")}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{t("onboarding.form.roles.hint")}</p>

            <div className="space-y-3">
              {(["generator", "receiver", "transporter"] as const).map((role) => {
                const checked = selectedRoles.has(role);
                return (
                  <label
                    key={role}
                    className={[
                      "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary/40",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-primary shrink-0"
                      checked={checked}
                      onChange={() => toggleRole(role)}
                    />
                    <div>
                      <p className="text-sm font-medium">{t(`role.${role}`)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t(`onboarding.form.roles.${role}.desc`)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {rolesError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {rolesError}
              </div>
            )}

            {rolesSaved && (
              <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
                {t("profile.roles_saved")}
              </div>
            )}

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => void saveRoles()}
              disabled={rolesSaving}
            >
              {rolesSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {t("profile.roles_save")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
