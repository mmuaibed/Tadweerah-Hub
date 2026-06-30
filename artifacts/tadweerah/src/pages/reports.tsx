import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import {
  FileText,
  RefreshCw,
  Loader2,
  AlertCircle,
  Download,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
  Banknote,
  ShieldCheck,
  Leaf,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n";
import { fmtSAR, fmtDate, fmtNumber } from "@/lib/format";
import { dealRef } from "@/lib/listing-ref";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface ReportSummary {
  total: number;
  completed: number;
  active: number;
  estimated_amount_sum: string;
  vat_amount_sum: string;
  total_amount_sum: string;
}

interface DealReportRow {
  deal_id: string;
  listing_id: string;
  created_at: string;
  status: string;
  settlement_type: string;
  estimated_amount: string;
  final_amount: string | null;
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
  my_role: "seller" | "buyer";
}

interface ReportResponse {
  summary: ReportSummary;
  rows: DealReportRow[];
  count: number;
}

interface SustainabilityReportRow {
  allocation_id: string;
  finalized_at: string | null;
  status: string;
  source_type: string;
  commercial_ref: string;
  deal_id?: string;
  listing_id?: string;
  contract_id?: string;
  shipment_id?: string;
  my_role: "seller" | "buyer";
  counterparty_name: string | null;
  material_ar: string;
  material_en: string;
  quantity: string;
  unit: string;
  received_qty?: string;
  reportable_qty?: string;
  remaining_qty?: string;
  remaining_qty_data_risk?: boolean;
  allocation_coverage_pct?: string | null;
  pathways: Array<{
    pathway_id: string;
    pathway_name_ar: string;
    pathway_name_en: string;
    quantity: string;
    percentage: string;
  }>;
}

interface SustainabilityReportResponse {
  rows: SustainabilityReportRow[];
  pathways: Array<{ id: string; name_ar: string; name_en: string }>;
  count: number;
}


interface ContractReportSummary {
  total_final_weight: string;
  total_value_excluding_vat: string;
  total_vat_amount: string;
  grand_total_including_vat: string;
  number_of_shipments: number;
}

interface ContractShipmentRow {
  contract_ref: string;
  shipment_ref: string;
  status: string;
  closed_at: string | null;
  my_role?: string;
  seller_name: string | null;
  buyer_name: string | null;
  material: string;
  unit: string;
  weight_policy: string;
  source_weight: string;
  destination_weight: string;
  variance: string;
  final_weight: string;
  price_per_unit: string;
  value_excluding_vat: string;
  vat_amount: string;
  total_including_vat: string;
}

interface ContractReportResponse {
  summary: ContractReportSummary;
  rows: ContractShipmentRow[];
  count: number;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const ALL_STATUSES = [
  "active",
  "payment_submitted",
  "payment_confirmed",
  "dispatched",
  "receipt_pending",
  "completed",
  "expired",
  "cancelled",
] as const;


function transportLabel(row: DealReportRow, t: (k: string) => string): string {
  if (row.tr_status) return t(`reports.transport.${row.tr_status}`) ?? row.tr_status;
  if (row.transport_decision === "not_required") return t("reports.transport.not_required");
  return "—";
}

const DEAL_STATUS_STYLE: Record<string, string> = {
  completed:          "bg-green-100 text-green-800",
  dispatched:         "bg-blue-100 text-blue-800",
  payment_confirmed:  "bg-teal-100 text-teal-800",
  payment_submitted:  "bg-sky-100 text-sky-800",
  receipt_pending:    "bg-purple-100 text-purple-800",
  active:             "bg-amber-100 text-amber-800",
  expired:            "bg-gray-100 text-gray-500",
  cancelled:          "bg-red-100 text-red-700",
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export function ReportsPage() {
  const { t, lang } = useT();
  const { getToken } = useAuth();
  const dir = lang === "ar" ? "rtl" : "ltr";

  /* ── Tab State ── */
  const [tab, setTab] = useState<"deals" | "contracts" | "sustainability">("deals");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get("tab");
    if (urlTab === "deals" || urlTab === "contracts" || urlTab === "sustainability") {
      setTab(urlTab);
      if (urlTab === "contracts") setStatus("closed");
      if (urlTab === "sustainability") {
        // optionally trigger loadSustReport() but the user usually clicks the load button
      }
    }
  }, []);

  /* Filters */
  const [role, setRole] = useState<"all" | "seller" | "buyer">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");

  /* Data state */
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);


  /* Contract Filters */
  const [contractId, setContractId] = useState("");

  /* Contract Data state */
  const [contractReport, setContractReport] = useState<ContractReportResponse | null>(null);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);
  const [contractExporting, setContractExporting] = useState(false);

  /* Sustainability Data state */
  const [sustReport, setSustReport] = useState<SustainabilityReportResponse | null>(null);
  const [sustLoading, setSustLoading] = useState(false);
  const [sustError, setSustError] = useState<string | null>(null);
  const [sustExporting, setSustExporting] = useState(false);
  const [sustRefFilter, setSustRefFilter] = useState("");

  /* SIR-2D: Correction request state (reports.tsx) */
  const [corrReqRow, setCorrReqRow] = useState<SustainabilityReportRow | null>(null);
  const [corrReqReason, setCorrReqReason] = useState("");
  const [corrReqSubmitting, setCorrReqSubmitting] = useState(false);
  const [corrReqSuccess, setCorrReqSuccess] = useState(false);
  const [corrReqError, setCorrReqError] = useState<string | null>(null);

  async function submitCorrReq() {
    if (!corrReqRow || !corrReqReason.trim()) return;
    setCorrReqSubmitting(true);
    setCorrReqError(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/sustainability/correction-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ allocation_id: corrReqRow.allocation_id, reason: corrReqReason.trim() }),
      });
      if (res.status === 409) {
        setCorrReqError(lang === "ar" ? "يوجد طلب تصحيح معلّق بالفعل لهذا السجل" : "A pending correction request already exists for this record.");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any;
        throw new Error(err?.message ?? `HTTP ${res.status}`);
      }
      setCorrReqSuccess(true);
    } catch (e) {
      setCorrReqError(e instanceof Error ? e.message : "Failed to submit request");
    } finally {
      setCorrReqSubmitting(false);
    }
  }

  /* ── Build query string ── */
  function buildParams(extraFormat?: string): string {
    const p = new URLSearchParams();
    p.set("role", role);
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    if (status) p.set("status", status);
    if (city) p.set("city", city);
    if (extraFormat) p.set("format", extraFormat);
    return p.toString();
  }

  /* ── Load report ── */
  async function loadReport() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/reports/deals?${buildParams()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ReportResponse;
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  /* ── Export CSV ── */
  async function exportCsv() {
    setExporting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/reports/deals?${buildParams("csv")}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-deals-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silent */
    } finally {
      setExporting(false);
    }
  }

  /* ── Build query string for contracts ── */
  function buildContractParams(extraFormat?: string): string {
    const p = new URLSearchParams();
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    if (status) p.set("status", status);
    if (contractId) p.set("contract_id", contractId);
    if (extraFormat) p.set("format", extraFormat);
    return p.toString();
  }

  /* ── Load contract report ── */
  async function loadContractReport() {
    setContractLoading(true);
    setContractError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/reports/contract-shipments?${buildContractParams()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ContractReportResponse;
      setContractReport(data);
    } catch (e) {
      setContractError(e instanceof Error ? e.message : t("admin.error.generic"));
    } finally {
      setContractLoading(false);
    }
  }

  /* ── Export CSV for contracts ── */
  async function exportContractCsv() {
    setContractExporting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/reports/contract-shipments?${buildContractParams("csv")}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contract-shipments-report-${dateFrom || "all"}-${dateTo || "all"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silent */
    } finally {
      setContractExporting(false);
    }
  }

  /* ── Build query string for sustainability ── */
  function buildSustParams(extraFormat?: string): string {
    const p = new URLSearchParams();
    if (dateFrom) p.set("date_from", dateFrom);
    if (dateTo) p.set("date_to", dateTo);
    if (sustRefFilter) p.set("commercial_ref", sustRefFilter);
    if (extraFormat) p.set("format", extraFormat);
    return p.toString();
  }

  /* ── Load sustainability report ── */
  async function loadSustReport() {
    setSustLoading(true);
    setSustError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/reports/sustainability?${buildSustParams()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as SustainabilityReportResponse;
      setSustReport(data);
    } catch (e) {
      setSustError(e instanceof Error ? e.message : t("admin.error.generic"));
    } finally {
      setSustLoading(false);
    }
  }

  /* ── Export CSV for sustainability ── */
  async function exportSustCsv() {
    setSustExporting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/reports/sustainability?${buildSustParams("csv")}&lang=${lang}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sustainability-report-${dateFrom || "all"}-${dateTo || "all"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silent */
    } finally {
      setSustExporting(false);
    }
  }

  const summary = report?.summary;
  const rows = report?.rows ?? [];

  return (
    <AppLayout
      title={t("reports.deals.title")}
      subtitle={t("reports.deals.subtitle")}
      actions={
        tab === "deals" ? (
          report && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void exportCsv()}
              disabled={exporting}
            >
              {exporting
                ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("reports.action.exporting")}</>
                : <><Download className="h-4 w-4 me-2" />{t("reports.action.export_csv")}</>
              }
            </Button>
          )
        ) : tab === "contracts" ? (
          contractReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void exportContractCsv()}
              disabled={contractExporting}
            >
              {contractExporting
                ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("reports.action.exporting")}</>
                : <><Download className="h-4 w-4 me-2" />{lang === "ar" ? "تصدير ملف" : "Export File"}</>
              }
            </Button>
          )
        ) : (
          sustReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void exportSustCsv()}
              disabled={sustExporting}
            >
              {sustExporting
                ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("reports.action.exporting")}</>
                : <><Download className="h-4 w-4 me-2" />{lang === "ar" ? "تصدير CSV" : "Export CSV"}</>
              }
            </Button>
          )
        )
      }
    >
      <div className="space-y-5" dir={dir}>

        {/* ── Top Level Tabs ── */}
        <div className="flex gap-1 border-b border-border">
          {(["deals", "contracts", "sustainability"] as const).map((tName) => (
            <button
              key={tName}
              onClick={() => {
                setTab(tName);
                setStatus(tName === "contracts" ? "closed" : "");
                setDateFrom("");
                setDateTo("");
                setSustRefFilter("");
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === tName
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tName === "deals" ? (lang === "ar" ? "الصفقات" : "Marketplace Deals") : tName === "contracts" ? (lang === "ar" ? "العقود" : "Contracts") : (lang === "ar" ? "تقارير الاستدامة" : "Sustainability Reports")}
            </button>
          ))}
        </div>

        {tab === "deals" ? (
          <>
        {/* ── Role tabs ── */}
        <div className="flex gap-1 border-b border-border">
          {(["all", "seller", "buyer"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                role === r
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`reports.filter.role.${r}`)}
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{t("reports.filter.date_from")}</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-36 text-sm"
              dir="ltr"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{t("reports.filter.date_to")}</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-36 text-sm"
              dir="ltr"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{t("reports.filter.status")}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{t("reports.filter.all_statuses")}</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{t(`deal.status.${s}`)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">{t("reports.filter.city")}</label>
            <Input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9 w-28 text-sm"
              placeholder="…"
            />
          </div>
          <Button onClick={() => void loadReport()} disabled={loading}>
            {loading
              ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("reports.loading")}</>
              : <><RefreshCw className="h-4 w-4 me-2" />{t("reports.action.load")}</>
            }
          </Button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {/* ── Summary cards ── */}
        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard
              icon={FileText}
              label={t("reports.summary.total")}
              value={String(summary.total)}
              colorClass="bg-blue-100 text-blue-700"
            />
            <SummaryCard
              icon={CheckCircle2}
              label={t("reports.summary.completed")}
              value={String(summary.completed)}
              colorClass="bg-green-100 text-green-700"
            />
            <SummaryCard
              icon={Clock}
              label={t("reports.summary.active")}
              value={String(summary.active)}
              colorClass="bg-amber-100 text-amber-700"
            />
            <SummaryCard
              icon={TrendingUp}
              label={t("reports.summary.amount_before_vat")}
              value={fmtSAR(summary.estimated_amount_sum, lang)}
              colorClass="bg-primary/10 text-primary"
            />
            <SummaryCard
              icon={Banknote}
              label={t("reports.summary.vat_amount")}
              value={fmtSAR(summary.vat_amount_sum, lang)}
              colorClass="bg-orange-100 text-orange-700"
            />
            <SummaryCard
              icon={BarChart3}
              label={t("reports.summary.total_with_vat")}
              value={fmtSAR(summary.total_amount_sum, lang)}
              colorClass="bg-purple-100 text-purple-700"
            />
          </div>
        )}

        {/* ── Table ── */}
        {report !== null && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {rows.length} {lang === "ar" ? "صفقة" : "deals"}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                {lang === "ar" ? "بيانات شركتك فقط" : "Your company data only"}
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                {t("reports.empty")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <Th>{t("reports.col.date")}</Th>
                      <Th>{t("reports.col.deal_id")}</Th>
                      <Th>{t("reports.col.role")}</Th>
                      <Th>{t("reports.col.counterparty")}</Th>
                      <Th>{t("reports.col.material")}</Th>
                      <Th>{t("reports.col.quantity")}</Th>
                      <Th>{t("reports.col.city")}</Th>
                      <Th>{t("reports.col.status")}</Th>
                      <Th>{t("reports.col.amount")}</Th>
                      <Th>{t("reports.col.vat")}</Th>
                      <Th>{t("reports.col.total")}</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row) => {
                      const isSeller = row.my_role === "seller";
                      const counterparty = isSeller ? row.buyer_name : row.seller_name;
                      const statusStyle = DEAL_STATUS_STYLE[row.status] ?? "bg-gray-100 text-gray-600";
                      const materialLabel = row.subcategory_ar && row.subcategory_en
                        ? (lang === "ar" ? row.subcategory_ar : row.subcategory_en)
                        : (row.material ?? "—");
                      return (
                        <tr key={row.deal_id} className="hover:bg-muted/20 transition-colors">
                          <Td mono>{fmtDate(row.created_at, lang)}</Td>
                          <Td>
                            <div className="flex flex-col items-start gap-1">
                              <Link href={`/listings/${row.listing_id}?deal=${row.deal_id}&from=reports`} className="text-primary font-mono font-semibold hover:underline" dir="ltr">
                                {dealRef(row.deal_id, row.created_at)}
                              </Link>
                              {row.tr_manifest_ref && (
                                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded" dir="ltr">
                                  {row.tr_manifest_ref}
                                </span>
                              )}
                            </div>
                          </Td>
                          <Td>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isSeller ? "bg-blue-100 text-blue-800" : "bg-teal-100 text-teal-800"
                            }`}>
                              {t(`reports.role.${row.my_role}`)}
                            </span>
                          </Td>
                          <Td>{counterparty ?? "—"}</Td>
                          <Td>{materialLabel}</Td>
                          <Td mono>{row.quantity && row.unit ? `${fmtNumber(row.quantity)} ${row.unit}` : "—"}</Td>
                          <Td>{row.city ?? "—"}</Td>
                          <Td>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle}`}>
                              {t(`deal.status.${row.status}`) || row.status}
                            </span>
                          </Td>
                          <Td mono><span className="text-foreground/80">{fmtSAR(row.estimated_amount, lang)}</span></Td>
                          <Td mono dim><span className="text-[11px]">{fmtSAR(row.vat_amount, lang)}</span></Td>
                          <Td mono bold>
                            <span className="text-green-800 bg-green-100/50 px-2 py-1 rounded text-sm">
                              {fmtSAR(row.total_amount, lang)}
                            </span>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

          </>
        ) : tab === "contracts" ? (
          <>
            {/* ── Contracts Tab Content ── */}
            <div className="mb-2">
              <h2 className="text-lg font-bold text-foreground">
                {contractId
                  ? (lang === "ar" ? `تقرير شحنات العقد للفترة من ${dateFrom || "..."} إلى ${dateTo || "..."}` : `Contract Shipment Report for the period from ${dateFrom || "..."} to ${dateTo || "..."}`)
                  : (lang === "ar" ? `تقرير شحنات العقود للفترة من ${dateFrom || "..."} إلى ${dateTo || "..."}` : `Contract Shipments Report for the period from ${dateFrom || "..."} to ${dateTo || "..."}`)
                }
              </h2>
            </div>
            {/* ── Filters ── */}
            <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">{t("reports.filter.date_from")}</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 w-36 text-sm"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">{t("reports.filter.date_to")}</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 w-36 text-sm"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">{t("reports.filter.status")}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t("reports.filter.all_statuses")}</option>
                  {["planned", "dispatched", "received", "closed", "cancelled"].map((s) => {
                    const statusMapAr: Record<string, string> = { planned: "مخططة", dispatched: "مرسلة", received: "مستلمة", closed: "مغلقة", cancelled: "ملغاة" };
                    return <option key={s} value={s}>{lang === "ar" ? (statusMapAr[s] || s) : (s.charAt(0).toUpperCase() + s.slice(1))}</option>;
                  })}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  {lang === "ar" ? "رقم العقد" : "Contract Ref"}
                </label>
                <Input
                  type="text"
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  className="h-9 w-36 text-sm"
                  placeholder="TDW-CTR-..."
                  dir="ltr"
                />
              </div>
              <Button onClick={() => void loadContractReport()} disabled={contractLoading}>
                {contractLoading
                  ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("reports.loading")}</>
                  : <><RefreshCw className="h-4 w-4 me-2" />{t("reports.action.load")}</>
                }
              </Button>
              <div className="w-full mt-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {lang === "ar" ? "يتم احتساب الإجماليات المالية للشحنات المغلقة فقط." : "Financial totals are calculated for closed shipments only."}
                </p>
              </div>
            </div>

            {/* ── Error ── */}
            {contractError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />{contractError}
              </div>
            )}

            {/* ── Summary cards ── */}
            {contractReport?.summary && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <SummaryCard
                  icon={FileText}
                  label={status === "closed"
                    ? (lang === "ar" ? "عدد الشحنات المغلقة" : "Closed Shipments")
                    : (lang === "ar" ? "عدد الشحنات المعروضة" : "Displayed Shipments")
                  }
                  value={String(contractReport.summary.number_of_shipments)}
                  colorClass="bg-blue-100 text-blue-700"
                />
                <SummaryCard
                  icon={TrendingUp}
                  label={lang === "ar" ? "إجمالي الوزن المعتمد" : "Total Final Weight"}
                  value={contractReport.summary.total_final_weight}
                  colorClass="bg-indigo-100 text-indigo-700"
                />
                <SummaryCard
                  icon={BarChart3}
                  label={lang === "ar" ? "القيمة قبل الضريبة" : "Value Excl. VAT"}
                  value={fmtSAR(contractReport.summary.total_value_excluding_vat, lang)}
                  colorClass="bg-primary/10 text-primary"
                />
                <SummaryCard
                  icon={Banknote}
                  label={lang === "ar" ? "ضريبة القيمة المضافة" : "VAT Amount"}
                  value={fmtSAR(contractReport.summary.total_vat_amount, lang)}
                  colorClass="bg-orange-100 text-orange-700"
                />
                <SummaryCard
                  icon={CheckCircle2}
                  label={lang === "ar" ? "الإجمالي شامل الضريبة" : "Total Incl. VAT"}
                  value={fmtSAR(contractReport.summary.grand_total_including_vat, lang)}
                  colorClass="bg-green-100 text-green-700"
                />
              </div>
            )}

            {/* ── Table ── */}
            {contractReport !== null && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {contractReport.rows.length} {lang === "ar" ? "شحنة" : "shipments"}
                  </p>
                </div>

                {contractReport.rows.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("reports.empty")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <Th>{lang === "ar" ? "تاريخ الإغلاق" : "Closed Date"}</Th>
                          <Th>{lang === "ar" ? "رقم العقد" : "Contract Ref"}</Th>
                          <Th>{lang === "ar" ? "رقم الشحنة" : "Shipment Ref"}</Th>
                          <Th>{lang === "ar" ? "البائع" : "Seller"}</Th>
                          <Th>{lang === "ar" ? "المشتري" : "Buyer"}</Th>
                          <Th>{lang === "ar" ? "المادة" : "Material"}</Th>
                          <Th>{lang === "ar" ? "الحالة" : "Status"}</Th>
                          <Th>{lang === "ar" ? "سياسة الوزن" : "Policy"}</Th>
                          <Th>{lang === "ar" ? "وزن المصدر" : "Source Wt"}</Th>
                          <Th>{lang === "ar" ? "وزن الاستلام" : "Dest Wt"}</Th>
                          <Th>{lang === "ar" ? "فرق الوزن" : "Variance"}</Th>
                          <Th>{lang === "ar" ? "الوزن المعتمد" : "Final Wt"}</Th>
                          <Th>{lang === "ar" ? "السعر" : "Price"}</Th>
                          <Th>{lang === "ar" ? "القيمة قبل الضريبة" : "Value (Excl)"}</Th>
                          <Th>{lang === "ar" ? "الضريبة" : "VAT"}</Th>
                          <Th>{lang === "ar" ? "الإجمالي شامل الضريبة" : "Total (Incl)"}</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {contractReport.rows.map((row, i) => {
                          const statusStyle = DEAL_STATUS_STYLE[row.status] ?? "bg-gray-100 text-gray-600";
                          return (
                            <tr key={i} className="hover:bg-muted/20 transition-colors">
                              <Td mono>{row.closed_at ? fmtDate(row.closed_at, lang) : "—"}</Td>
                              <Td mono>{row.contract_ref}</Td>
                              <Td mono>{row.shipment_ref}</Td>
                              <Td>{row.seller_name ?? "—"}</Td>
                              <Td>{row.buyer_name ?? "—"}</Td>
                              <Td>{row.material}</Td>
                              <Td>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle}`}>
                                  {lang === "ar"
                                    ? ({ planned: "مخططة", dispatched: "مرسلة", received: "مستلمة", closed: "مغلقة", cancelled: "ملغاة" } as any)[row.status] || row.status
                                    : row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                                </span>
                              </Td>
                              <Td>
                                {lang === "ar"
                                  ? ({
                                      source_weight_only: "وزن المصدر",
                                      destination_weight_only: "وزن الاستلام",
                                      dual_source_final: "مزدوج — يعتمد وزن المصدر",
                                      dual_destination_final: "مزدوج — يعتمد وزن الاستلام",
                                      dual_higher_final: "مزدوج — يعتمد الأعلى",
                                    } as Record<string, string>)[row.weight_policy] || row.weight_policy
                                  : row.weight_policy.replace("_final", "").replace("_only", "").replace("dual_", "")}
                              </Td>
                              <Td mono>{row.source_weight}</Td>
                              <Td mono>{row.destination_weight}</Td>
                              <Td mono>{row.variance}</Td>
                              <Td mono bold><span className="text-primary">{row.final_weight}</span></Td>
                              <Td mono>{row.price_per_unit}</Td>
                              <Td mono><span className="text-foreground/80">{fmtSAR(row.value_excluding_vat, lang)}</span></Td>
                              <Td mono dim><span className="text-[11px]">{fmtSAR(row.vat_amount, lang)}</span></Td>
                              <Td mono bold>
                                <span className="text-green-800 bg-green-100/50 px-2 py-1 rounded text-sm">
                                  {fmtSAR(row.total_including_vat, lang)}
                                </span>
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* ── Sustainability Tab Content ── */}
            <div className="mb-2">
              <h2 className="text-lg font-bold text-foreground">
                {lang === "ar" ? `تقارير الاستدامة المعتمدة للفترة من ${dateFrom || "..."} إلى ${dateTo || "..."}` : `Finalized Sustainability Reports for the period from ${dateFrom || "..."} to ${dateTo || "..."}`}
              </h2>
            </div>
            {/* ── Filters ── */}
            <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">{t("reports.filter.date_from")}</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 w-36 text-sm"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">{t("reports.filter.date_to")}</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 w-36 text-sm"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  {lang === "ar" ? "المرجع التجاري" : "Commercial Ref"}
                </label>
                <Input
                  type="text"
                  value={sustRefFilter}
                  onChange={(e) => setSustRefFilter(e.target.value)}
                  className="h-9 w-36 text-sm"
                  placeholder="TDW-..."
                  dir="ltr"
                />
              </div>
              <Button onClick={() => void loadSustReport()} disabled={sustLoading}>
                {sustLoading
                  ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("reports.loading")}</>
                  : <><RefreshCw className="h-4 w-4 me-2" />{t("reports.action.load")}</>
                }
              </Button>
            </div>

            {/* ── Error ── */}
            {sustError && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />{sustError}
              </div>
            )}

            {/* ── Table ── */}
            {sustReport !== null && (
              <div className="rounded-xl border border-border bg-card overflow-hidden mt-4">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {sustReport.rows.length} {lang === "ar" ? "سجل استدامة معتمد" : "finalized sustainability records"}
                  </p>
                </div>

                {sustReport.rows.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("reports.empty")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <Th>{lang === "ar" ? "تاريخ الاعتماد" : "Finalized Date"}</Th>
                          <Th>{lang === "ar" ? "المصدر" : "Source"}</Th>
                          <Th>{lang === "ar" ? "المرجع التجاري" : "Commercial Ref"}</Th>
                          <Th>{lang === "ar" ? "دوري" : "My Role"}</Th>
                          <Th>{lang === "ar" ? "الطرف الآخر" : "Counterparty"}</Th>
                          <Th>{lang === "ar" ? "المادة" : "Material"}</Th>
                          <Th>{lang === "ar" ? "الكمية المستلمة" : "Received Quantity"}</Th>
                          <Th>{lang === "ar" ? "كمية الاستدامة المعتمدة للتقرير" : "Reportable Sustainability Quantity"}</Th>
                          {sustReport.pathways?.map(pw => (
                            <Th key={pw.id}>{lang === "ar" ? pw.name_ar : pw.name_en}</Th>
                          ))}
                          <Th>{lang === "ar" ? "الحالة" : "Status"}</Th>
                          <Th>{lang === "ar" ? "طلب تصحيح" : "Request Correction"}</Th>
                          <th className="w-10 px-4 py-3 border-b border-border bg-muted/30"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sustReport.rows.map((row, i) => {
                          const unitLabel = row.unit === "ton" ? (lang === "ar" ? "طن" : "ton") : row.unit === "kg" ? (lang === "ar" ? "كجم" : "kg") : row.unit;
                          return (
                            <tr key={i} className="hover:bg-muted/20 transition-colors">
                              <Td mono>{row.finalized_at ? fmtDate(row.finalized_at, lang) : "—"}</Td>
                              <Td>{row.source_type === "deal" ? (lang === "ar" ? "صفقة" : "Deal") : row.source_type === "contract_shipment" ? (lang === "ar" ? "شحنة" : "Shipment") : row.source_type}</Td>
                              <Td>
                                {row.source_type === "deal" && row.deal_id && row.listing_id ? (
                                  <Link href={`/listings/${row.listing_id}?deal=${row.deal_id}&returnTo=${encodeURIComponent("/reports?tab=sustainability")}`}>
                                    <a className="text-[11px] text-primary font-semibold hover:underline font-mono bg-primary/10 px-1.5 py-0.5 rounded transition-colors" dir="ltr" title={lang === "ar" ? "فتح صفقة" : "Open Deal"}>
                                      {row.commercial_ref}
                                    </a>
                                  </Link>
                                ) : row.source_type === "contract_shipment" && row.contract_id && row.shipment_id ? (
                                  <Link href={`/contracts/${row.contract_id}?shipment=${row.shipment_id}&returnTo=${encodeURIComponent("/reports?tab=sustainability")}#shipment-${row.shipment_id}`}>
                                    <a className="text-[11px] text-primary font-semibold hover:underline font-mono bg-primary/10 px-1.5 py-0.5 rounded transition-colors" dir="ltr" title={lang === "ar" ? "فتح الشحنة" : "Open Shipment"}>
                                      {row.commercial_ref}
                                    </a>
                                  </Link>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded" dir="ltr">
                                    {row.commercial_ref}
                                  </span>
                                )}
                              </Td>
                              <Td>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  row.my_role === "seller" ? "bg-blue-100 text-blue-800" : "bg-teal-100 text-teal-800"
                                }`}>
                                  {row.my_role === "seller" ? (lang === "ar" ? "البائع / المصدر" : "Seller / Source") : (lang === "ar" ? "المشتري / المعالج" : "Buyer / Processor")}
                                </span>
                              </Td>
                              <Td>{row.counterparty_name ?? "—"}</Td>
                              <Td>{lang === "ar" ? row.material_ar : row.material_en}</Td>
                              <Td mono>
                                <span className="text-muted-foreground">{fmtNumber(row.received_qty)} {unitLabel}</span>
                              </Td>
                              <Td mono bold>
                                {row.reportable_qty !== undefined && row.reportable_qty !== null ? (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span>{fmtNumber(row.reportable_qty)} {unitLabel}</span>
                                      {row.allocation_coverage_pct !== null && row.allocation_coverage_pct !== undefined && (
                                        <span className="inline-flex rounded text-[10px] px-1.5 py-0.5 bg-green-100 text-green-800 font-medium">
                                          {lang === "ar" ? `نسبة التوزيع ${row.allocation_coverage_pct}%` : `Coverage ${row.allocation_coverage_pct}%`}
                                        </span>
                                      )}
                                    </div>
                                    {Number(row.remaining_qty) > 0 && (
                                      <div className="text-[10px] text-muted-foreground font-normal">
                                        {lang === "ar" ? `الكمية المتبقية غير الموزعة: ${fmtNumber(row.remaining_qty)} ${unitLabel}` : `Remaining Unallocated Quantity: ${fmtNumber(row.remaining_qty)} ${unitLabel}`}
                                      </div>
                                    )}
                                    {row.remaining_qty_data_risk === true && (
                                      <div className="flex items-center gap-1 text-[10px] text-destructive font-normal">
                                        <AlertCircle className="w-3 h-3" />
                                        {lang === "ar" ? "خطأ في البيانات: توزيع يفوق الاستلام" : "Data risk: Over-allocation"}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs font-normal text-muted-foreground italic flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {lang === "ar" ? "غير متاح — يحتاج تحديث البيانات" : "Unavailable — refresh required"}
                                  </span>
                                )}
                              </Td>
                              {sustReport.pathways?.map(pw => {
                                const match = row.pathways.find(p => p.pathway_id === pw.id);
                                return (
                                  <Td key={pw.id} mono>
                                    {match ? (
                                      <span>{fmtNumber(match.quantity)} {unitLabel}</span>
                                    ) : (
                                      <span className="text-muted-foreground/50">0</span>
                                    )}
                                  </Td>
                                );
                              })}
                              <Td>
                                <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-800">
                                  {lang === "ar" ? "معتمد" : "Finalized"}
                                </span>
                              </Td>
                               <Td>
                                 {row.status === "finalized" && (
                                   <button
                                     onClick={() => { setCorrReqRow(row); setCorrReqReason(""); setCorrReqSuccess(false); setCorrReqError(null); }}
                                     className="h-7 px-2.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 whitespace-nowrap flex items-center gap-1"
                                   >
                                     <Leaf className="h-3 w-3" />
                                     {lang === "ar" ? "طلب تصحيح" : "Request Correction"}
                                   </button>
                                 )}
                               </Td>
                              <Td>
                                <Link href={`/reports/sustainability/${row.allocation_id}/print`}>
                                  <a target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors flex items-center justify-center" title={lang === "ar" ? "طباعة التقرير" : "Print Report"}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                  </a>
                                </Link>
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

  {/* SIR-2D: Correction Request Dialog */}
  {corrReqRow && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir={dir}>
      <div className="bg-card rounded-2xl border border-border shadow-xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Leaf className="h-4 w-4 text-green-600" />
            {lang === "ar" ? "طلب إعادة فتح كمسودة تصحيحية" : "Request Correction Draft"}
          </h3>
          <button onClick={() => setCorrReqRow(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {lang === "ar"
            ? "سيُرسَل طلبك إلى المسؤول لمراجعته. يرجى ذكر سبب التصحيح بوضوح."
            : "Your request will be sent to an admin for review. Please describe the correction reason clearly."}
        </p>
        <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 font-mono" dir="ltr">
          {corrReqRow.commercial_ref}
        </div>
        {corrReqSuccess ? (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <Leaf className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <p className="text-sm text-green-800">
              {lang === "ar" ? "تم إرسال طلب التصحيح بنجاح. سيتواصل معك المسؤول قريباً." : "Correction request submitted. An admin will review it shortly."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {corrReqError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{corrReqError}
              </div>
            )}
            <label className="text-xs font-medium text-foreground block">
              {lang === "ar" ? "سبب التصحيح (مطلوب)" : "Correction reason (required)"}
            </label>
            <Textarea
              value={corrReqReason}
              onChange={e => setCorrReqReason(e.target.value)}
              placeholder={lang === "ar" ? "اكتب سبب طلب التصحيح..." : "Describe why a correction is needed..."}
              className="h-28 resize-none text-sm"
              disabled={corrReqSubmitting}
            />
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setCorrReqRow(null)}
            className="h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            {corrReqSuccess ? (lang === "ar" ? "إغلاق" : "Close") : (lang === "ar" ? "إلغاء" : "Cancel")}
          </button>
          {!corrReqSuccess && (
            <button
              onClick={() => void submitCorrReq()}
              disabled={corrReqSubmitting || !corrReqReason.trim()}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
            >
              {corrReqSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {lang === "ar" ? "إرسال الطلب" : "Submit Request"}
            </button>
          )}
        </div>
      </div>
    </div>
  )}

    </AppLayout>

  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function SummaryCard({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-3 flex items-center gap-2.5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-foreground leading-none truncate">{value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({
  children,
  mono,
  dim,
  bold,
}: {
  children: React.ReactNode;
  mono?: boolean;
  dim?: boolean;
  bold?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2.5 text-xs whitespace-nowrap ${
        mono ? "font-mono" : ""
      } ${dim ? "text-muted-foreground" : "text-foreground"} ${bold ? "font-semibold" : ""}`}
    >
      {children}
    </td>
  );
}
