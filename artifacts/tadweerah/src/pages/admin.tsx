import { useState, Fragment } from "react";
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
  BarChart3,
  Download,
  Banknote,
  TrendingUp,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n";
import { fmtSAR, fmtDate } from "@/lib/format";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface AdminReportSummary {
  total: number;
  completed: number;
  active: number;
  estimated_amount_sum: string;
  vat_amount_sum: string;
  total_amount_sum: string;
}

interface AdminReportRow {
  deal_id: string;
  created_at: string;
  status: string;
  estimated_amount: string;
  vat_amount: string | null;
  total_amount: string | null;
  seller_name: string | null;
  seller_city: string | null;
  buyer_name: string | null;
  buyer_city: string | null;
  material: string | null;
  subcategory_ar: string | null;
  subcategory_en: string | null;
  quantity: string | null;
  unit: string | null;
  city: string | null;
  transport_decision: string | null;
  tr_status: string | null;
  tr_manifest_ref: string | null;
}

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
  contactPhone?: string | null;
  commercial_registration: string | null;
  created_at: string;
}

interface AdminStats {
  totalCompanies: number;
  totalMembers: number;
  totalInvites: number;
  totalListings: number;
  activeListings: number;
  totalOffers: number;
  totalDeals: number;
  totalTRs: number;
  companiesByStatus: Record<string, number>;
  dealsByStatus: Record<string, number>;
  transportReqsByStatus: Record<string, number>;
}

interface AdminCompanyDetails extends AdminCompany {
  owner_email: string | null;
  roles: string[];
  capabilities: string[];
  members: { user_id: string; role: string; email: string | null; created_at: string }[];
  invitations: { email: string; role: string; status: string; created_at: string }[];
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

interface AdminTransportQuote {
  id: string;
  transport_request_id: string;
  transporter_company_id: string;
  transporter_name: string | null;
  price_total: string;
  truck_count: number;
  truck_type: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  pickup_city: string | null;
  delivery_city: string | null;
  waste_description: string | null;
  tr_status: string | null;
  tr_manifest_ref: string | null;
}

interface AdminIssue {
  id: string;
  user_id: string;
  company_id: string | null;
  subject: string | null;
  message: string;
  phone: string | null;
  user_name: string | null;
  user_email: string | null;
  status: string;
  admin_note: string | null;
  closed_at: string | null;
  created_at: string;
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
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem("tdw_admin_key") ?? "");
  const [tab, setTab] = useState<"deals" | "companies" | "transport" | "reports" | "issues">("companies");

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
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<AdminCompanyDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  /* Transport requests state */
  const [transportReqs, setTransportReqs] = useState<PendingTransportRequest[] | null>(null);
  const [transportLoading, setTransportLoading] = useState(false);
  const [transportError, setTransportError] = useState<string | null>(null);

  /* Transport quotes state */
  const [quotesData, setQuotesData] = useState<AdminTransportQuote[] | null>(null);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);

  /* Issues state */
  const [issuesList, setIssuesList] = useState<AdminIssue[] | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);
  const [issueStatusFilter, setIssueStatusFilter] = useState("");

  /* Reports state */
  const [reportRows, setReportRows] = useState<AdminReportRow[] | null>(null);
  const [reportSummary, setReportSummary] = useState<AdminReportSummary | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportCity, setReportCity] = useState("");
  const [reportCompanyId, setReportCompanyId] = useState("");
  const [reportExporting, setReportExporting] = useState(false);

  // Email allowlist guard
  if (!userLoaded) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!isSignedIn) {
    window.location.href = "/sign-in";
    return null;
  }

  const allowlistRaw = (import.meta.env.VITE_TADWEERAH_ADMIN_EMAILS as string | undefined) ?? "";
  const allowlist = allowlistRaw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const userEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  const isEmailAllowed = allowlist.length > 0 && allowlist.includes(userEmail);

  if (!isEmailAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center" dir={dir}>
        <ShieldCheck className="h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">{t("admin.access.denied.title")}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{t("admin.access.denied.desc")}</p>
        <Button variant="outline" className="mt-4" onClick={() => void signOut().then(() => { window.location.href = "/"; })}>
          {t("admin.logout")}
        </Button>
      </div>
    );
  }

  function logout() {
    sessionStorage.removeItem("tdw_admin_key");
    setAdminKey("");
    setDeals(null);
    setCompanies(null);
    void signOut().then(() => {
      window.location.href = "/";
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

  async function fetchStats() {
    setStatsLoading(true);
    try {
      const res = await callAdmin(`/stats?t=${Date.now()}`);
      if (res.ok) setStats(await res.json() as AdminStats);
    } catch {
      /* silent */
    } finally {
      setStatsLoading(false);
    }
  }

  async function fetchCompanies() {
    setCompaniesLoading(true);
    setCompaniesError(null);
    void fetchStats();
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

  async function toggleCompanyDetails(id: string) {
    if (expandedCompanyId === id) {
      setExpandedCompanyId(null);
      setExpandedDetails(null);
      return;
    }
    setExpandedCompanyId(id);
    setExpandedDetails(null);
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const res = await callAdmin(`/companies/${id}/details?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setExpandedDetails(await res.json() as AdminCompanyDetails);
    } catch (e) {
      setDetailsError(e instanceof Error ? e.message : t("admin.error.generic"));
    } finally {
      setDetailsLoading(false);
    }
  }

  function buildReportParams(format?: string): string {
    const p = new URLSearchParams();
    if (reportDateFrom) p.set("date_from", reportDateFrom);
    if (reportDateTo) p.set("date_to", reportDateTo);
    if (reportStatus) p.set("status", reportStatus);
    if (reportCity) p.set("city", reportCity);
    if (reportCompanyId.trim()) p.set("company_id", reportCompanyId.trim());
    if (format) p.set("format", format);
    return p.toString();
  }

  async function fetchReport() {
    setReportLoading(true);
    setReportError(null);
    try {
      const res = await callAdmin(`/reports/deals?${buildReportParams()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { summary: AdminReportSummary; rows: AdminReportRow[] };
      sessionStorage.setItem("tdw_admin_key", adminKey.trim());
      setReportSummary(data.summary);
      setReportRows(data.rows);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : t("admin.error.generic"));
    } finally {
      setReportLoading(false);
    }
  }

  async function exportReportCsv() {
    setReportExporting(true);
    try {
      const res = await callAdmin(`/reports/deals?${buildReportParams("csv")}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin-deals-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silent */
    } finally {
      setReportExporting(false);
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

  async function fetchTransportQuotes() {
    setQuotesLoading(true);
    setQuotesError(null);
    try {
      const res = await callAdmin("/transport-quotes");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { data: AdminTransportQuote[] };
      sessionStorage.setItem("tdw_admin_key", adminKey.trim());
      setQuotesData(json.data);
    } catch (e) {
      setQuotesError(e instanceof Error ? e.message : t("admin.error.generic"));
    } finally {
      setQuotesLoading(false);
    }
  }

  async function selectQuote(quoteId: string) {
    setUpdatingQuoteId(quoteId);
    try {
      const res = await callAdmin(`/transport-quotes/${quoteId}/select`, { method: "PATCH" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Only update this quote's status — no auto-rejection of competing quotes
      setQuotesData((prev) =>
        prev ? prev.map((q) => (q.id === quoteId ? { ...q, status: "selected" } : q)) : prev,
      );
    } catch {
      /* silent — reload will show correct state */
    } finally {
      setUpdatingQuoteId(null);
    }
  }

  async function underReviewQuote(quoteId: string) {
    setUpdatingQuoteId(quoteId);
    try {
      const res = await callAdmin(`/transport-quotes/${quoteId}/under_review`, { method: "PATCH" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setQuotesData((prev) =>
        prev ? prev.map((q) => (q.id === quoteId ? { ...q, status: "under_review" } : q)) : prev,
      );
    } catch {
      /* silent */
    } finally {
      setUpdatingQuoteId(null);
    }
  }

  async function fetchIssues() {
    setIssuesLoading(true);
    setIssuesError(null);
    try {
      const params = issueStatusFilter ? `?status=${encodeURIComponent(issueStatusFilter)}` : "";
      const res = await callAdmin(`/issue-reports${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as AdminIssue[];
      sessionStorage.setItem("tdw_admin_key", adminKey.trim());
      setIssuesList(data);
    } catch (e) {
      setIssuesError(e instanceof Error ? e.message : t("admin.error.generic"));
    } finally {
      setIssuesLoading(false);
    }
  }

  async function updateIssue(issueId: string, status: string) {
    setUpdatingIssueId(issueId);
    try {
      const res = await callAdmin(`/issue-reports/${issueId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setIssuesList((prev) =>
        prev ? prev.map((i) => (i.id === issueId ? { ...i, status } : i)) : prev,
      );
    } catch {
      /* silent — reload will show correct state */
    } finally {
      setUpdatingIssueId(null);
    }
  }

  async function rejectQuote(quoteId: string) {
    setUpdatingQuoteId(quoteId);
    try {
      const res = await callAdmin(`/transport-quotes/${quoteId}/reject`, { method: "PATCH" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setQuotesData((prev) =>
        prev ? prev.map((q) => (q.id === quoteId ? { ...q, status: "rejected" } : q)) : prev,
      );
    } catch {
      /* silent */
    } finally {
      setUpdatingQuoteId(null);
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
                    {t("admin.role.label")} · {userEmail}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 me-2" />{t("admin.logout")}
          </Button>
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
                  void fetchStats();
                  void (tab === "companies" ? fetchCompanies() : fetchDeals());
                }
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border">
          {(["companies", "deals", "transport", "reports", "issues"] as const).map((t2) => (
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
                  : t2 === "transport"
                    ? <><Truck className="h-4 w-4" />{t("admin.tab.transport")}</>
                    : t2 === "reports"
                      ? <><BarChart3 className="h-4 w-4" />{t("admin.tab.reports")}</>
                      : <><MessageSquare className="h-4 w-4" />{t("admin.tab.issues")}</>
              }
            </button>
          ))}
        </div>

        {/* ── Pilot Analytics Overview ───────────────────────────────────────── */}
        {stats && (
          <div className="space-y-3 mb-6">
            <h2 className="text-sm font-semibold text-foreground px-1">{t("admin.stats.title") || "Pilot Analytics Overview"}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="rounded-xl border border-border bg-white p-3 flex flex-col justify-center">
                <span className="text-xl font-bold text-foreground">{stats.totalCompanies}</span>
                <span className="text-[10px] text-muted-foreground">{t("admin.stats.total_companies") || "Total Companies"}</span>
              </div>
              <div className="rounded-xl border border-border bg-white p-3 flex flex-col justify-center">
                <span className="text-xl font-bold text-amber-600">{stats.companiesByStatus["pending"] || 0}</span>
                <span className="text-[10px] text-muted-foreground">{t("admin.stats.pending_companies") || "Pending Approvals"}</span>
              </div>
              <div className="rounded-xl border border-border bg-white p-3 flex flex-col justify-center">
                <span className="text-xl font-bold text-green-600">{stats.companiesByStatus["approved"] || 0}</span>
                <span className="text-[10px] text-muted-foreground">Approved Companies</span>
              </div>
              <div className="rounded-xl border border-border bg-white p-3 flex flex-col justify-center">
                <span className="text-xl font-bold text-foreground">{stats.totalListings}</span>
                <span className="text-[10px] text-muted-foreground">Total Listings</span>
              </div>
              <div className="rounded-xl border border-border bg-white p-3 flex flex-col justify-center">
                <span className="text-xl font-bold text-blue-600">{stats.activeListings}</span>
                <span className="text-[10px] text-muted-foreground">Active Listings</span>
              </div>
              <div className="rounded-xl border border-border bg-white p-3 flex flex-col justify-center">
                <span className="text-xl font-bold text-foreground">{stats.totalOffers}</span>
                <span className="text-[10px] text-muted-foreground">Total Offers</span>
              </div>
              <div className="rounded-xl border border-border bg-white p-3 flex flex-col justify-center">
                <span className="text-xl font-bold text-foreground">{stats.totalDeals}</span>
                <span className="text-[10px] text-muted-foreground">Total Deals</span>
              </div>
              <div className="rounded-xl border border-border bg-white p-3 flex flex-col justify-center">
                <span className="text-xl font-bold text-amber-600">{stats.dealsByStatus["active"] || 0}</span>
                <span className="text-[10px] text-muted-foreground">Active Deals</span>
              </div>
              <div className="rounded-xl border border-border bg-white p-3 flex flex-col justify-center">
                <span className="text-xl font-bold text-green-600">{stats.dealsByStatus["completed"] || 0}</span>
                <span className="text-[10px] text-muted-foreground">Completed Deals</span>
              </div>
              <div className="rounded-xl border border-border bg-white p-3 flex flex-col justify-center">
                <span className="text-xl font-bold text-foreground">{stats.totalTRs}</span>
                <span className="text-[10px] text-muted-foreground">Total Transports</span>
              </div>
              <div className="rounded-xl border border-border bg-white p-3 flex flex-col justify-center">
                <span className="text-xl font-bold text-amber-600">{stats.transportReqsByStatus["pending"] || 0}</span>
                <span className="text-[10px] text-muted-foreground">Pending Transports</span>
              </div>
            </div>
          </div>
        )}

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
                      {s ? licenseLabel(s, lang).label : t("admin.filter.all_statuses")}
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
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {companies.map((c) => {
                          const { label, cls } = licenseLabel(c.license_status, lang);
                          const pending = pendingStatus[c.id];
                          const isUpdating = updatingId === c.id;
                          return (
                            <Fragment key={c.id}>
                              <tr className="hover:bg-muted/20 transition-colors">
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
                                    <option value="">{t("admin.action.select")}</option>
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
                                      : t("admin.action.apply")
                                    }
                                  </Button>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-end">
                                <Button variant="ghost" size="sm" onClick={() => void toggleCompanyDetails(c.id)}>
                                  {expandedCompanyId === c.id ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                                </Button>
                              </td>
                            </tr>
                            {expandedCompanyId === c.id && (
                              <tr className="bg-muted/5 border-t-0">
                                <td colSpan={7} className="px-4 py-4">
                                  {detailsLoading ? (
                                    <div className="flex items-center justify-center p-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
                                  ) : detailsError ? (
                                    <div className="text-destructive text-sm p-4">{detailsError}</div>
                                  ) : expandedDetails ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                      <div className="space-y-3">
                                        <div>
                                          <p className="font-semibold text-foreground border-b pb-1 mb-2">بيانات الشركة</p>
                                          <p className="text-muted-foreground text-xs"><span className="text-foreground">المدينة:</span> {expandedDetails.city || "—"}</p>
                                          <p className="text-muted-foreground text-xs"><span className="text-foreground">رقم الهاتف:</span> <span dir="ltr">{expandedDetails.contactPhone || "—"}</span></p>
                                          <p className="text-muted-foreground text-xs"><span className="text-foreground">سجل تجاري:</span> <span dir="ltr">{expandedDetails.commercial_registration || "—"}</span></p>
                                          <p className="text-muted-foreground text-xs"><span className="text-foreground">تاريخ التسجيل:</span> <span dir="ltr">{fmtDate(expandedDetails.created_at, lang)}</span></p>
                                        </div>
                                        <div>
                                          <p className="font-semibold text-foreground border-b pb-1 mb-2">الأدوار والقدرات</p>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {expandedDetails.roles.map(r => <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>)}
                                            {expandedDetails.capabilities.map(cap => <Badge key={cap} variant="secondary" className="text-[10px]">{cap}</Badge>)}
                                            {expandedDetails.roles.length === 0 && expandedDetails.capabilities.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="space-y-3">
                                        <div>
                                          <p className="font-semibold text-foreground border-b pb-1 mb-2">الأعضاء والدعوات</p>
                                          <p className="text-muted-foreground text-xs mb-1"><span className="text-foreground">حساب المالك:</span> <span dir="ltr" className="font-mono">{expandedDetails.owner_email || "غير متوفر"}</span></p>
                                          <div className="max-h-32 overflow-y-auto space-y-1 mt-2 pr-2">
                                            {expandedDetails.members.map(m => (
                                              <div key={m.user_id} className="flex justify-between items-center bg-white p-1.5 rounded border text-xs">
                                                <span className="font-mono text-[11px]" dir="ltr">{m.email || "عضو"}</span>
                                                <Badge variant="outline" className="text-[9px] h-4">{m.role}</Badge>
                                              </div>
                                            ))}
                                            {expandedDetails.invitations.map(i => (
                                              <div key={i.email} className="flex justify-between items-center bg-muted/30 p-1.5 rounded border text-xs">
                                                <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">{i.email}</span>
                                                <div className="flex items-center gap-1">
                                                  <span className="text-[9px] text-amber-600">{i.status}</span>
                                                  <Badge variant="outline" className="text-[9px] h-4">{i.role}</Badge>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            )}
                          </Fragment>
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
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDate(d.created_at, lang)}</td>
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
                  {t("admin.transport.title")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("admin.transport.desc")}
                </p>
              </div>
              <Button onClick={() => void fetchPendingTransport()} disabled={transportLoading}>
                {transportLoading
                  ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("admin.loading")}</>
                  : <><RefreshCw className="h-4 w-4 me-2" />{t("admin.transport.load")}</>
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
                      ? t("admin.transport.count").replace("{n}", String(transportReqs.length))
                      : t("admin.transport.empty_count")}
                  </p>
                </div>
                {transportReqs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("admin.transport.empty")}
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
                              {t("admin.transport.status.pending")}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{fmtDate(tr.created_at, lang)}</span>
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
                            {t("admin.transport.planned_pickup")}
                            {fmtDate(tr.planned_pickup_at, lang)}
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

            {/* ── Quote Comparison Panel ───────────────────────────────────── */}
            <div className="rounded-xl border border-border bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("admin.quotes.title")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("admin.quotes.desc")}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void fetchTransportQuotes()}
                  disabled={quotesLoading}
                >
                  {quotesLoading
                    ? <><Loader2 className="h-3.5 w-3.5 me-1.5 animate-spin" />{t("admin.loading")}</>
                    : <><RefreshCw className="h-3.5 w-3.5 me-1.5" />{t("admin.quotes.load")}</>
                  }
                </Button>
              </div>

              {quotesError && (
                <div className="px-4 py-3 flex items-center gap-2 text-sm text-destructive border-b border-destructive/20 bg-destructive/5">
                  <AlertCircle className="h-4 w-4 shrink-0" />{quotesError}
                </div>
              )}

              {quotesData !== null && (
                quotesData.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("admin.quotes.empty")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.quotes.tr_id")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.quotes.company")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.quotes.price")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.quotes.trucks")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.quotes.status")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {quotesData.map((q) => {
                          const isUpdating = updatingQuoteId === q.id;
                          const isSelected = q.status === "selected";
                          const isRejected = q.status === "rejected";
                          const isUnderReview = q.status === "under_review";
                          return (
                            <tr key={q.id} className={`hover:bg-muted/20 transition-colors ${isSelected ? "bg-green-50/40" : isRejected ? "opacity-50" : ""}`}>
                              <td className="px-4 py-2.5">
                                <div className="space-y-0.5">
                                  <span className="font-mono text-xs text-muted-foreground" dir="ltr">{q.transport_request_id.slice(0, 8)}…</span>
                                  {(q.pickup_city || q.delivery_city) && (
                                    <p className="text-[10px] text-muted-foreground/60">
                                      {q.pickup_city ?? "—"} → {q.delivery_city ?? "—"}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="text-xs font-medium text-foreground">{q.transporter_name ?? "—"}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="text-xs font-semibold text-foreground">{fmtSAR(Number(q.price_total), lang)}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="text-xs text-muted-foreground">{q.truck_count}{q.truck_type ? ` × ${q.truck_type}` : ""}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                  isSelected    ? "bg-green-100 text-green-800 border-green-200" :
                                  isRejected    ? "bg-red-100 text-red-700 border-red-200" :
                                  isUnderReview ? "bg-blue-100 text-blue-800 border-blue-200" :
                                  "bg-yellow-100 text-yellow-800 border-yellow-200"
                                }`}>
                                  {t(`transport.quote.status.${q.status}`)}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                {!isRejected && (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {!isUnderReview && !isSelected && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[11px]"
                                        disabled={isUpdating}
                                        onClick={() => void underReviewQuote(q.id)}
                                      >
                                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : t("admin.quotes.under_review")}
                                      </Button>
                                    )}
                                    {!isSelected && (
                                      <Button
                                        size="sm"
                                        className="h-7 px-2 text-[11px]"
                                        disabled={isUpdating}
                                        onClick={() => void selectQuote(q.id)}
                                      >
                                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : t("admin.quotes.select")}
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                                      disabled={isUpdating}
                                      onClick={() => void rejectQuote(q.id)}
                                    >
                                      {t("admin.quotes.reject")}
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="px-4 py-2.5 border-t border-border bg-muted/10 space-y-1">
                      <p className="text-[10px] text-muted-foreground">
                        {t("admin.quotes.count").replace("{n}", String(quotesData.length))}
                      </p>
                      <p className="text-[10px] text-amber-700/80 italic">
                        ⚠ {t("admin.quotes.selection_note")}
                      </p>
                    </div>
                  </div>
                )
              )}

              {quotesData === null && !quotesLoading && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("admin.quotes.load")} ↑
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Reports Tab ───────────────────────────────────────────────────── */}
        {tab === "reports" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="rounded-xl border border-border bg-white p-4 flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">{t("reports.filter.date_from")}</label>
                <Input type="date" value={reportDateFrom} onChange={(e) => setReportDateFrom(e.target.value)} className="h-9 w-36 text-sm" dir="ltr" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">{t("reports.filter.date_to")}</label>
                <Input type="date" value={reportDateTo} onChange={(e) => setReportDateTo(e.target.value)} className="h-9 w-36 text-sm" dir="ltr" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">{t("reports.filter.status")}</label>
                <select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t("reports.filter.all_statuses")}</option>
                  {["active","payment_submitted","payment_confirmed","dispatched","receipt_pending","completed","expired","cancelled"].map((s) => (
                    <option key={s} value={s}>{t(`deal.status.${s}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">{t("reports.filter.city")}</label>
                <Input type="text" value={reportCity} onChange={(e) => setReportCity(e.target.value)} className="h-9 w-28 text-sm" placeholder="…" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">{t("admin.reports.filter.company_id")}</label>
                <Input type="text" value={reportCompanyId} onChange={(e) => setReportCompanyId(e.target.value)} className="h-9 w-40 text-sm font-mono" placeholder="uuid…" dir="ltr" />
              </div>
              <div className="flex gap-2 items-end">
                <Button onClick={() => void fetchReport()} disabled={reportLoading}>
                  {reportLoading
                    ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("admin.loading")}</>
                    : <><RefreshCw className="h-4 w-4 me-2" />{t("admin.reports.fetch")}</>
                  }
                </Button>
                {reportRows !== null && (
                  <Button variant="outline" onClick={() => void exportReportCsv()} disabled={reportExporting}>
                    {reportExporting
                      ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("reports.action.exporting")}</>
                      : <><Download className="h-4 w-4 me-2" />{t("admin.reports.export_csv")}</>
                    }
                  </Button>
                )}
              </div>
            </div>

            {reportError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />{reportError}
              </div>
            )}

            {/* Summary cards */}
            {reportSummary && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { icon: FileText,    label: t("reports.summary.total"),              value: String(reportSummary.total),              color: "bg-blue-100 text-blue-700" },
                  { icon: CheckCircle2,label: t("reports.summary.completed"),           value: String(reportSummary.completed),           color: "bg-green-100 text-green-700" },
                  { icon: Clock,       label: t("reports.summary.active"),              value: String(reportSummary.active),              color: "bg-amber-100 text-amber-700" },
                  { icon: TrendingUp,  label: t("reports.summary.amount_before_vat"),   value: fmtSAR(reportSummary.estimated_amount_sum, lang), color: "bg-primary/10 text-primary" },
                  { icon: Banknote,    label: t("reports.summary.vat_amount"),          value: fmtSAR(reportSummary.vat_amount_sum, lang),  color: "bg-orange-100 text-orange-700" },
                  { icon: BarChart3,   label: t("reports.summary.total_with_vat"),      value: fmtSAR(reportSummary.total_amount_sum, lang), color: "bg-purple-100 text-purple-700" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="rounded-xl border border-border bg-white p-3 flex items-center gap-2.5">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-foreground leading-none truncate">{value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Table */}
            {reportRows !== null && (
              <div className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">
                    {reportRows.length} {lang === "ar" ? "صفقة" : "deals"}
                  </p>
                </div>
                {reportRows.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t("admin.reports.empty")}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {[
                            t("reports.col.date"), t("reports.col.deal_id"),
                            t("reports.col.seller"), t("reports.col.buyer"),
                            t("reports.col.material"), t("reports.col.quantity"),
                            t("reports.col.city"), t("reports.col.status"),
                            t("reports.col.amount"), t("reports.col.vat"),
                            t("reports.col.total"), t("reports.col.transport"),
                          ].map((h) => (
                            <th key={h} className="px-3 py-2.5 text-start font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {reportRows.map((row) => {
                          const statusStyle: Record<string,string> = {
                            completed: "bg-green-100 text-green-800",
                            dispatched: "bg-blue-100 text-blue-800",
                            payment_confirmed: "bg-teal-100 text-teal-800",
                            payment_submitted: "bg-sky-100 text-sky-800",
                            active: "bg-amber-100 text-amber-800",
                            expired: "bg-gray-100 text-gray-500",
                            cancelled: "bg-red-100 text-red-700",
                          };
                          const matLabel = (lang === "ar" ? row.subcategory_ar : row.subcategory_en) ?? row.subcategory_ar ?? row.material ?? "—";
                          const trLabel = row.tr_status
                            ? (t(`reports.transport.${row.tr_status}`) || row.tr_status)
                            : row.transport_decision === "not_required"
                              ? t("reports.transport.not_required")
                              : "—";
                          return (
                            <tr key={row.deal_id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(row.created_at, lang)}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-mono text-muted-foreground" dir="ltr">
                                {row.tr_manifest_ref ?? `${row.deal_id.slice(0, 8)}…`}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">{row.seller_name ?? "—"}<br/><span className="text-muted-foreground">{row.seller_city ?? ""}</span></td>
                              <td className="px-3 py-2.5 whitespace-nowrap">{row.buyer_name ?? "—"}<br/><span className="text-muted-foreground">{row.buyer_city ?? ""}</span></td>
                              <td className="px-3 py-2.5 whitespace-nowrap">{matLabel}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-mono">{row.quantity && row.unit ? `${row.quantity} ${row.unit}` : "—"}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{row.city ?? "—"}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                                  {t(`deal.status.${row.status}`) || row.status}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-mono">{fmtSAR(row.estimated_amount, lang)}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-mono text-muted-foreground">{fmtSAR(row.vat_amount, lang)}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap font-mono font-semibold">{fmtSAR(row.total_amount, lang)}</td>
                              <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{trLabel}</td>
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

        {/* ── Issues Tab ─────────────────────────────────────────────────────── */}
        {tab === "issues" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={issueStatusFilter}
                onChange={(e) => setIssueStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t("admin.issues.filter.all")}</option>
                <option value="open">{t("admin.issues.status.open")}</option>
                <option value="in_review">{t("admin.issues.status.in_review")}</option>
                <option value="closed">{t("admin.issues.status.closed")}</option>
                <option value="resolved">{t("admin.issues.status.resolved")}</option>
              </select>
              <Button
                size="sm"
                onClick={() => void fetchIssues()}
                disabled={issuesLoading || !adminKey}
              >
                {issuesLoading
                  ? <Loader2 className="h-4 w-4 animate-spin me-1" />
                  : <RefreshCw className="h-4 w-4 me-1" />}
                {t("admin.issues.load")}
              </Button>
            </div>

            {/* Error */}
            {issuesError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />{issuesError}
              </div>
            )}

            {/* Table */}
            {issuesList !== null && (
              <div className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">
                    {t("admin.issues.count").replace("{n}", String(issuesList.length))}
                  </p>
                </div>
                {issuesList.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("admin.issues.empty")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.issues.col.date")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.issues.col.user")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.issues.col.subject")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.issues.col.message")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.issues.col.status")}</th>
                          <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.issues.col.actions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {issuesList.map((issue) => {
                          const isUpdating = updatingIssueId === issue.id;
                          const isOpen = issue.status === "open";
                          const isInReview = issue.status === "in_review";
                          const isClosed = issue.status === "closed" || issue.status === "resolved";
                          const statusStyle: Record<string, string> = {
                            open: "bg-yellow-100 text-yellow-800 border-yellow-200",
                            in_review: "bg-blue-100 text-blue-800 border-blue-200",
                            closed: "bg-gray-100 text-gray-600 border-gray-200",
                            resolved: "bg-green-100 text-green-800 border-green-200",
                          };
                          return (
                            <tr key={issue.id} className={`hover:bg-muted/20 transition-colors ${isClosed ? "opacity-60" : ""}`}>
                              <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                                {fmtDate(issue.created_at, lang)}
                              </td>
                              <td className="px-4 py-2.5">
                                <p className="text-xs font-medium">{issue.user_name ?? "—"}</p>
                                {issue.user_email && (
                                  <p className="text-[10px] text-muted-foreground" dir="ltr">{issue.user_email}</p>
                                )}
                                {issue.phone && (
                                  <p className="text-[10px] text-muted-foreground" dir="ltr">{issue.phone}</p>
                                )}
                              </td>
                              <td className="px-4 py-2.5 max-w-[140px]">
                                <p className="text-xs truncate text-foreground">{issue.subject ?? "—"}</p>
                              </td>
                              <td className="px-4 py-2.5 max-w-[240px]">
                                <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{issue.message}</p>
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle[issue.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                                  {t(`admin.issues.status.${issue.status}`) || issue.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                {!isClosed && (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {isOpen && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[11px]"
                                        disabled={isUpdating}
                                        onClick={() => void updateIssue(issue.id, "in_review")}
                                      >
                                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : t("admin.issues.mark_in_review")}
                                      </Button>
                                    )}
                                    {(isOpen || isInReview) && (
                                      <Button
                                        size="sm"
                                        className="h-7 px-2 text-[11px]"
                                        disabled={isUpdating}
                                        onClick={() => void updateIssue(issue.id, "closed")}
                                      >
                                        {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : t("admin.issues.mark_closed")}
                                      </Button>
                                    )}
                                  </div>
                                )}
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

            {issuesList === null && !issuesLoading && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("admin.issues.load")} ↑
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

