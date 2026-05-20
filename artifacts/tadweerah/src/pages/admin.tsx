import { useState } from "react";
import { useUser, useClerk } from "@clerk/react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Building2,
  FileText,
  Truck,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface AdminDeal {
  deal_id: string;
  status: string;
  manifest_ref: string | null;
  mwan_score: string;
  missing_count: number;
  is_mwan_ready: boolean;
  created_at: string;
}

interface AdminCompany {
  id: string;
  name: string;
  type: string | null;
  city: string | null;
  license_status: string | null;
  commercial_registration: string | null;
  created_at: string;
}

interface PendingTransportRequest {
  id: string;
  manifest_ref: string | null;
  status: string;
  transport_mode: string;
  ops_assigned_to: string | null;
  pickup_city: string | null;
  delivery_city: string | null;
  waste_description: string | null;
  planned_pickup_at: string | null;
  notes: string | null;
  created_at: string;
  deal_id: string;
  company_name: string | null;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const DEAL_STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  completed: "default",
  dispatched: "outline",
  payment_confirmed: "secondary",
  active: "secondary",
};

function licenseLabel(status: string | null, lang: string): { label: string; cls: string } {
  if (!status) return {
    label: lang === "ar" ? "غير مكتمل" : "Incomplete",
    cls: "bg-gray-100 text-gray-600",
  };
  const map: Record<string, { label: string; cls: string }> = {
    pending:  { label: lang === "ar" ? "قيد المراجعة" : "Under Review",  cls: "bg-amber-100 text-amber-800" },
    approved: { label: lang === "ar" ? "معتمد"         : "Approved",       cls: "bg-green-100 text-green-800" },
    rejected: { label: lang === "ar" ? "مرفوض"         : "Rejected",       cls: "bg-red-100 text-red-800" },
    expired:  { label: lang === "ar" ? "منتهي الصلاحية" : "Expired",       cls: "bg-orange-100 text-orange-800" },
  };
  return map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function AdminPage() {
  const { t, lang } = useT();
  const { user, isLoaded: userLoaded } = useUser();
  const { signOut } = useClerk();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem("tdw_admin_key") ?? "");
  const [tab, setTab] = useState<"deals" | "companies" | "transport">("companies");

  /* Deals state */
  const [deals, setDeals] = useState<AdminDeal[] | null>(null);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  /* Companies state */
  const [companies, setCompanies] = useState<AdminCompany[] | null>(null);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [licenseFilter, setLicenseFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({});

  /* Transport requests state */
  const [transportReqs, setTransportReqs] = useState<PendingTransportRequest[] | null>(null);
  const [transportLoading, setTransportLoading] = useState(false);
  const [transportError, setTransportError] = useState<string | null>(null);

  // Email allowlist guard — empty allowlist blocks everyone (no accidental open access)
  const allowlistRaw = (import.meta.env.VITE_TADWEERAH_ADMIN_EMAILS as string | undefined) ?? "";
  const allowlist = allowlistRaw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  const isEmailAllowed = !userLoaded || (allowlist.length > 0 && allowlist.includes(userEmail));

  if (userLoaded && !isEmailAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center" dir={dir}>
        <ShieldCheck className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">{t("admin.access.denied.title")}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{t("admin.access.denied.desc")}</p>
      </div>
    );
  }

  function logout() {
    sessionStorage.removeItem("tdw_admin_key");
    setAdminKey("");
    setDeals(null);
    setCompanies(null);
    void signOut({ redirectUrl: "/" });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async function callAdmin(path: string, options?: RequestInit): Promise<Response> {
    const key = adminKey.trim();
    if (!key) throw new Error(t("admin.error.no_key"));
    const res = await fetch(`/api/admin${path}`, {
      ...options,
      headers: {
        "X-Admin-Key": key,
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });
    if (res.status === 401) {
      sessionStorage.removeItem("tdw_admin_key");
      throw new Error(t("admin.error.unauthorized"));
    }
    if (res.status === 503) throw new Error(t("admin.error.not_configured"));
    return res;
  }

  async function fetchDeals() {
    setDealsLoading(true);
    setDealsError(null);
    try {
      const params = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await callAdmin(`/deals${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as AdminDeal[];
      sessionStorage.setItem("tdw_admin_key", adminKey.trim());
      setDeals(data);
    } catch (e) {
      setDealsError(e instanceof Error ? e.message : t("admin.error.generic"));
    } finally {
      setDealsLoading(false);
    }
  }

  async function fetchCompanies() {
    setCompaniesLoading(true);
    setCompaniesError(null);
    try {
      const params = licenseFilter ? `?licenseStatus=${encodeURIComponent(licenseFilter)}` : "";
      const res = await callAdmin(`/companies${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as AdminCompany[];
      sessionStorage.setItem("tdw_admin_key", adminKey.trim());
      setCompanies(data);
    } catch (e) {
      setCompaniesError(e instanceof Error ? e.message : t("admin.error.generic"));
    } finally {
      setCompaniesLoading(false);
    }
  }

  async function fetchPendingTransport() {
    setTransportLoading(true);
    setTransportError(null);
    try {
      const res = await callAdmin("/transport-requests/pending");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data: PendingTransportRequest[] };
      sessionStorage.setItem("tdw_admin_key", adminKey.trim());
      setTransportReqs(json.data);
    } catch (e) {
      setTransportError(e instanceof Error ? e.message : t("admin.error.generic"));
    } finally {
      setTransportLoading(false);
    }
  }

  async function updateLicenseStatus(companyId: string) {
    const newStatus = pendingStatus[companyId];
    if (!newStatus) return;
    setUpdatingId(companyId);
    try {
      const res = await callAdmin(`/companies/${companyId}/license`, {
        method: "PATCH",
        body: JSON.stringify({ license_status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCompanies((prev) =>
        prev
          ? prev.map((c) => (c.id === companyId ? { ...c, license_status: newStatus } : c))
          : prev,
      );
      setPendingStatus((prev) => {
        const next = { ...prev };
        delete next[companyId];
        return next;
      });
    } catch {
      /* silent — the row stays unchanged */
    } finally {
      setUpdatingId(null);
    }
  }

  const statusOptions = ["", "active", "payment_confirmed", "dispatched", "completed"];
  const licenseOptions = ["", "pending", "approved", "rejected", "expired"];
  const licenseTargetOptions = ["pending", "approved", "rejected", "expired"];

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8" dir={dir}>
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{t("admin.page.title")}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-muted-foreground">{t("admin.page.subtitle")}</p>
                {userLoaded && userEmail && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {lang === "ar" ? "مدير تدويرة" : "Tadweerah Admin"} · {userEmail}
                  </span>
                )}
              </div>
            </div>
          </div>
          {adminKey && (
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 me-2" />{t("admin.logout")}
            </Button>
          )}
        </div>

        {/* Admin Key */}
        <div className="rounded-xl border border-border bg-white p-4">
          <label className="text-xs font-medium text-foreground mb-1 block">{t("admin.key.label")}</label>
          <div className="flex gap-2 max-w-sm">
            <Input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder={t("admin.key.placeholder")}
              className="h-9"
              dir="ltr"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void (tab === "companies" ? fetchCompanies() : fetchDeals());
                }
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(["companies", "deals", "transport"] as const).map((t2) => (
            <button
              key={t2}
              onClick={() => setTab(t2)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t2
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t2 === "companies"
                ? <><Building2 className="h-4 w-4" />{t("admin.tab.companies")}</>
                : t2 === "deals"
                  ? <><FileText className="h-4 w-4" />{t("admin.tab.deals")}</>
                  : <><Truck className="h-4 w-4" />{lang === "ar" ? "طلبات النقل" : "Transport Requests"}</>
              }
            </button>
          ))}
        </div>

        {/* ── Companies Tab ──────────────────────────────────────────────────── */}
        {tab === "companies" && (
          <div className="space-y-4">
            {/* Companies filter + fetch */}
            <div className="rounded-xl border border-border bg-white p-4 flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  {t("admin.company.status_filter")}
                </label>
                <select
                  value={licenseFilter}
                  onChange={(e) => setLicenseFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {licenseOptions.map((s) => (
                    <option key={s} value={s}>
                      {s ? licenseLabel(s, lang).label : (lang === "ar" ? "جميع الحالات" : "All statuses")}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={() => void fetchCompanies()} disabled={companiesLoading}>
                {companiesLoading
                  ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("admin.loading")}</>
                  : <><RefreshCw className="h-4 w-4 me-2" />{t("admin.company.fetch")}</>
                }
              </Button>
            </div>

            {companiesError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />{companiesError}
              </div>
            )}

            {companies !== null && (
              <div className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">
                    {t("admin.company.count").replace("{n}", String(companies.length))}
                  </p>
                </div>
                {companies.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("admin.company.empty")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.company.name")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.company.type")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.company.cr")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.company.city")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.company.status")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.company.change_status")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {companies.map((c) => {
                          const { label, cls } = licenseLabel(c.license_status, lang);
                          const pending = pendingStatus[c.id];
                          const isUpdating = updatingId === c.id;
                          return (
                            <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-semibold text-foreground text-xs">{c.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{c.id.slice(0, 8)}…</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs text-muted-foreground">
                                  {c.type ? t(`company.type.${c.type}`) : "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-mono text-foreground" dir="ltr">
                                  {c.commercial_registration || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{c.city || "—"}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center rounded-full text-[10px] font-bold px-2 py-0.5 ${cls}`}>
                                  {label}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <select
                                    value={pending ?? ""}
                                    onChange={(e) => setPendingStatus((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                    className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                    disabled={isUpdating}
                                  >
                                    <option value="">{lang === "ar" ? "اختر..." : "Select..."}</option>
                                    {licenseTargetOptions.map((s) => (
                                      <option key={s} value={s}>{licenseLabel(s, lang).label}</option>
                                    ))}
                                  </select>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[11px] px-2"
                                    disabled={!pending || isUpdating}
                                    onClick={() => void updateLicenseStatus(c.id)}
                                  >
                                    {isUpdating
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : (lang === "ar" ? "تطبيق" : "Apply")
                                    }
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Deals Tab ──────────────────────────────────────────────────────── */}
        {tab === "deals" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-white p-4 flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">{t("admin.deal.status")}</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s ? t(`deal.status.${s}`) : t("admin.filter.all_statuses")}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={() => void fetchDeals()} disabled={dealsLoading}>
                {dealsLoading
                  ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("admin.loading")}</>
                  : <><RefreshCw className="h-4 w-4 me-2" />{t("admin.fetch_button")}</>
                }
              </Button>
            </div>

            {dealsError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />{dealsError}
              </div>
            )}

            {deals !== null && (
              <div className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {t("admin.deal.count").replace("{n}", String(deals.length))}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      {deals.filter((d) => d.is_mwan_ready).length} {t("admin.mwan.ready")}
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      {deals.filter((d) => !d.is_mwan_ready).length} {t("admin.mwan.incomplete")}
                    </span>
                  </div>
                </div>
                {deals.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t("admin.no_deals")}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.deal.id")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.deal.status")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.deal.manifest_ref")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.deal.mwan_score")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.deal.missing")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.deal.created_at")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {deals.map((d) => (
                          <tr key={d.deal_id} className={`hover:bg-muted/20 transition-colors ${d.is_mwan_ready ? "" : "bg-amber-50/20"}`}>
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-xs text-muted-foreground" dir="ltr">{d.deal_id.slice(0, 8)}…</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge variant={DEAL_STATUS_VARIANTS[d.status] ?? "outline"} className="text-[10px]">
                                {t(`deal.status.${d.status}`)}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5">
                              {d.manifest_ref
                                ? <span className="font-mono text-xs font-semibold text-primary" dir="ltr">{d.manifest_ref}</span>
                                : <span className="text-[11px] text-muted-foreground/60">—</span>
                              }
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                {d.is_mwan_ready
                                  ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                  : <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                }
                                <span className={`text-xs font-mono font-semibold ${d.is_mwan_ready ? "text-green-700" : "text-amber-700"}`} dir="ltr">
                                  {d.mwan_score}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              {d.missing_count > 0
                                ? <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5">{d.missing_count}</span>
                                : <span className="text-[11px] text-green-700 font-semibold">✓</span>
                              }
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(d.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Transport Requests Tab ─────────────────────────────────────────── */}
        {tab === "transport" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-white p-4 flex flex-wrap gap-3 items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {lang === "ar" ? "طلبات النقل المعلقة (platform-ops)" : "Pending Platform Transport Requests"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lang === "ar"
                    ? "الطلبات التي اختار فيها المنتج 'رتّب النقل لي' وتحتاج تنسيقًا"
                    : "Requests where the producer chose 'Arrange Transport for Me' and need coordination"}
                </p>
              </div>
              <Button onClick={() => void fetchPendingTransport()} disabled={transportLoading}>
                {transportLoading
                  ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("admin.loading")}</>
                  : <><RefreshCw className="h-4 w-4 me-2" />{lang === "ar" ? "تحميل الطلبات" : "Load Requests"}</>
                }
              </Button>
            </div>

            {transportError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />{transportError}
              </div>
            )}

            {transportReqs !== null && (
              <div className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">
                    {transportReqs.length > 0
                      ? (lang === "ar" ? `${transportReqs.length} طلب معلق` : `${transportReqs.length} pending requests`)
                      : (lang === "ar" ? "لا توجد طلبات معلقة" : "No pending requests")}
                  </p>
                </div>
                {transportReqs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {lang === "ar" ? "لا توجد طلبات نقل معلقة حاليًا." : "No pending transport requests at this time."}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {transportReqs.map((tr) => (
                      <div key={tr.id} className="px-4 py-4 flex flex-col gap-2 hover:bg-muted/10 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {tr.manifest_ref && (
                              <span className="font-mono text-xs font-bold text-primary" dir="ltr">{tr.manifest_ref}</span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">
                              <Truck className="h-3 w-3" />
                              {lang === "ar" ? "معلق" : "Pending"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{formatDate(tr.created_at)}</span>
                        </div>

                        {tr.company_name && (
                          <p className="text-sm font-medium text-foreground">{tr.company_name}</p>
                        )}

                        {(tr.pickup_city || tr.delivery_city) && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span dir="rtl">
                              {tr.pickup_city ?? "—"} → {tr.delivery_city ?? "—"}
                            </span>
                          </div>
                        )}

                        {tr.waste_description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{tr.waste_description}</p>
                        )}

                        {tr.planned_pickup_at && (
                          <p className="text-xs text-muted-foreground">
                            {lang === "ar" ? "موعد الاستلام المخطط: " : "Planned pickup: "}
                            {formatDate(tr.planned_pickup_at)}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 mt-0.5">
                          <span dir="ltr" className="font-mono">deal: {tr.deal_id.slice(0, 8)}…</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
