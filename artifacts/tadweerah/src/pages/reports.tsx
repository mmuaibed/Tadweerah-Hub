import { useState } from "react";
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
} from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [tab, setTab] = useState<"deals" | "contracts">("deals");

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
        ) : (
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
        )
      }
    >
      <div className="space-y-5" dir={dir}>

        {/* ── Top Level Tabs ── */}
        <div className="flex gap-1 border-b border-border">
          {(["deals", "contracts"] as const).map((tName) => (
            <button
              key={tName}
              onClick={() => {
                setTab(tName);
                setStatus(tName === "contracts" ? "closed" : "");
                setDateFrom("");
                setDateTo("");
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === tName
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tName === "deals" ? (lang === "ar" ? "الصفقات" : "Marketplace Deals") : (lang === "ar" ? "العقود" : "Contracts")}
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
        ) : (
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
                  label={lang === "ar" ? "عدد الشحنات" : "Number of Shipments"}
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
                              <Td>{row.weight_policy.replace("_final", "").replace("_only", "").replace("dual_", "")}</Td>
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
        )}
      </div>
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
