import { useState } from "react";
import { useAuth } from "@clerk/react";
import {
  Phone,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Clock,
  UserCheck,
  UserCog,
  Percent,
  Printer,
  TrendingUp,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useT } from "@/i18n";
import { useGetListingOffers, useGetOffersSummary } from "@workspace/api-client-react";
import type { ListingOffer } from "@workspace/api-client-react";

export type DealStatus = "active" | "payment_confirmed" | "dispatched" | "completed";
export type SettlementType = "fixed" | "by_weight";

export interface DealInfo {
  id: string;
  offer_id: string;
  listing_id: string;
  settlement_type: SettlementType;
  price_per_unit: number;
  estimated_amount: number;
  actual_quantity: number | null;
  final_amount: number | null;
  status: DealStatus;
  counterparty: {
    name: string;
    contact_phone: string;
  } | null;
  payment_confirmed_at: string | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
  dispatched_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DealPanelProps {
  deal: DealInfo;
  role: "producer" | "buyer";
  unit: string;
  onUpdate: (updated: DealInfo) => void;
  pricingModel?: string;
  revenueSharePct?: number | string | null;
  /** Human-readable listing ref (e.g. "#LIST-ABCD12") */
  listingRef?: string;
  /** Material label for print report */
  listingMaterial?: string;
  /** Quantity for print report */
  listingQuantity?: number;
  /** Authenticated company name (for print report) */
  myCompanyName?: string;
}

type PendingAction = "confirm-payment" | "confirm-dispatch" | "confirm-receipt" | null;

const STATUS_STEPS: DealStatus[] = [
  "active",
  "payment_confirmed",
  "dispatched",
  "completed",
];

async function callDealApi(
  dealId: string,
  action: "confirm-payment" | "confirm-dispatch" | "confirm-receipt",
  body?: object,
  authToken?: string | null,
): Promise<DealInfo> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`/api/deals/${dealId}/${action}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<DealInfo>;
}

function formatDate(iso: string | null, lang: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** V1 — Deal value summary: shows financial benefit of auction competition */
function DealValueSummary({
  listingId,
  acceptedPricePerUnit,
  estimatedAmount,
  unit,
}: {
  listingId: string;
  acceptedPricePerUnit: number;
  estimatedAmount: number;
  unit: string;
}) {
  const { t } = useT();
  const { data: summary } = useGetOffersSummary(listingId);
  const { data: offersRaw } = useGetListingOffers(listingId);
  const offers = (offersRaw ?? []) as ListingOffer[];

  if (!summary || summary.count === 0) return null;

  const sorted = [...offers].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const firstPrice = sorted[0]?.price_per_unit ?? null;
  const gained = firstPrice != null ? acceptedPricePerUnit - firstPrice : 0;

  return (
    <div className="mx-4 mb-3 rounded-xl border border-secondary/30 bg-secondary/5 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
        {t("deal.value_summary.title")}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground">{t("deal.value_summary.offers_count")}</span>
        <span className="font-bold text-end text-foreground">{summary.count}</span>

        {firstPrice != null && firstPrice !== acceptedPricePerUnit && (
          <>
            <span className="text-muted-foreground">{t("deal.value_summary.first_price")}</span>
            <span className="font-medium text-end text-muted-foreground">
              {firstPrice.toLocaleString()} {t("deal.value_summary.sar")}
            </span>

            <span className="text-muted-foreground">{t("deal.value_summary.accepted_price")}</span>
            <span className="font-bold text-end text-secondary">
              {acceptedPricePerUnit.toLocaleString()} {t("deal.value_summary.sar")}
            </span>

            <span className="text-muted-foreground">{t("deal.value_summary.value_gained")}</span>
            <span className="font-bold text-end text-green-700">
              +{(gained).toLocaleString()} {t("deal.value_summary.sar")} / {unit}
            </span>
          </>
        )}
      </div>

      {firstPrice != null && gained > 0 ? (
        <p className="text-[10px] text-secondary/80 leading-snug">
          {t("deal.value_summary.competition_note")}
        </p>
      ) : firstPrice != null ? (
        <p className="text-[10px] text-muted-foreground leading-snug">
          {t("deal.value_summary.no_change")}
        </p>
      ) : null}
    </div>
  );
}

/** V2 — Proper governance timeline replacing the old flat timestamp list */
function GovernanceTimeline({
  deal,
  lang,
}: {
  deal: DealInfo;
  lang: string;
}) {
  const { t } = useT();

  const steps: { key: string; label: string; ts: string | null }[] = [
    { key: "offer_accepted", label: t("deal.timeline.offer_accepted"), ts: deal.created_at },
    { key: "payment_confirmed", label: t("deal.timeline.payment_confirmed"), ts: deal.payment_confirmed_at },
    { key: "dispatched", label: t("deal.timeline.dispatched"), ts: deal.dispatched_at },
    { key: "received", label: t("deal.timeline.received"), ts: deal.received_at },
  ];

  const completedCount = steps.filter((s) => s.ts !== null).length;

  return (
    <div className="px-4 py-3 space-y-2 bg-muted/20 border-t border-primary/10">
      <p className="text-xs font-semibold text-muted-foreground">{t("deal.timeline.title")}</p>
      <div className="space-y-0">
        {steps.map((step, i) => {
          const done = step.ts !== null;
          const isCurrent = done && (i === completedCount - 1) && deal.status !== "completed";
          const isLast = i === steps.length - 1;
          return (
            <div key={step.key} className="flex gap-3">
              {/* Icon column */}
              <div className="flex flex-col items-center">
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${
                  done
                    ? isCurrent
                      ? "bg-primary text-white ring-2 ring-primary/30"
                      : "bg-primary/80 text-white"
                    : "border-2 border-muted-foreground/20 bg-background"
                }`}>
                  {done ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Circle className="h-2.5 w-2.5 text-muted-foreground/30" />
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-4 mt-0.5 ${done ? "bg-primary/50" : "bg-muted-foreground/15"}`} />
                )}
              </div>
              {/* Content column */}
              <div className={`pb-3 min-w-0 ${isLast ? "" : ""}`}>
                <p className={`text-xs font-medium leading-tight ${done ? "text-foreground" : "text-muted-foreground/50"}`}>
                  {step.label}
                </p>
                {done && step.ts ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDate(step.ts, lang)}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">{t("deal.timeline.pending_label")}</p>
                )}
                {step.key === "payment_confirmed" && deal.payment_reference && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono" dir="ltr">
                    {deal.payment_reference}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** V3 — Print deal report (opens a new window) */
function printDealReport(
  deal: DealInfo,
  role: "producer" | "buyer",
  unit: string,
  lang: string,
  t: (k: string) => string,
  opts: {
    listingRef?: string;
    listingMaterial?: string;
    listingQuantity?: number;
    myCompanyName?: string;
  },
) {
  const producerName = role === "producer"
    ? (opts.myCompanyName ?? "—")
    : (deal.counterparty?.name ?? "—");
  const buyerName = role === "buyer"
    ? (opts.myCompanyName ?? "—")
    : (deal.counterparty?.name ?? "—");

  const statusMap: Record<DealStatus, string> = {
    active: lang === "ar" ? "انتظار تأكيد الدفع" : "Awaiting payment",
    payment_confirmed: lang === "ar" ? "تم تأكيد الدفع" : "Payment confirmed",
    dispatched: lang === "ar" ? "البضاعة في الطريق" : "In transit",
    completed: lang === "ar" ? "مكتملة" : "Completed",
  };

  const timelineRows = [
    { label: t("deal.timeline.offer_accepted"), ts: deal.created_at },
    { label: t("deal.timeline.payment_confirmed"), ts: deal.payment_confirmed_at },
    { label: t("deal.timeline.dispatched"), ts: deal.dispatched_at },
    { label: t("deal.timeline.received"), ts: deal.received_at },
  ];

  const formatTs = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
          year: "numeric", month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : t("deal.timeline.pending_label");

  const dir = lang === "ar" ? "rtl" : "ltr";
  const totalValue = (deal.final_amount ?? deal.estimated_amount).toLocaleString();

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="utf-8"/>
  <title>${t("deal.print.title")} — ${opts.listingRef ?? deal.id.slice(0, 8)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Tajawal,Arial,sans-serif;color:#111;padding:32px;direction:${dir};font-size:13px}
    h1{font-size:20px;font-weight:700;margin-bottom:4px}
    .sub{color:#555;font-size:12px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    td{padding:6px 8px;border:1px solid #ddd;vertical-align:top}
    td:first-child{font-weight:600;background:#f5f5f5;width:38%}
    h2{font-size:14px;font-weight:700;margin:20px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
    .timeline-row{display:flex;gap:12px;margin-bottom:8px}
    .tl-dot{width:10px;height:10px;border-radius:50%;background:#2563eb;margin-top:3px;flex-shrink:0}
    .tl-dot.pending{background:#ccc}
    .tl-label{font-size:12px;font-weight:600}
    .tl-ts{font-size:11px;color:#555}
    .footer{margin-top:32px;border-top:1px solid #ddd;padding-top:12px;text-align:center;font-size:11px;color:#777}
    .badge{display:inline-block;background:#dcfce7;border:1px solid #86efac;color:#166534;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
    @media print{body{padding:16px}}
  </style>
</head>
<body>
  <h1>${t("deal.print.title")}</h1>
  <p class="sub">${opts.listingRef ? `${t("deal.print.deal_id")}: ${opts.listingRef}` : `${t("deal.print.deal_id")}: ${deal.id.slice(0, 13)}...`}</p>
  <h2>${lang === "ar" ? "أطراف الصفقة" : "Parties"}</h2>
  <table>
    <tr><td>${t("deal.print.producer")}</td><td>${producerName}</td></tr>
    <tr><td>${t("deal.print.buyer")}</td><td>${buyerName}</td></tr>
  </table>
  <h2>${lang === "ar" ? "تفاصيل المادة والسعر" : "Material & Price"}</h2>
  <table>
    ${opts.listingMaterial ? `<tr><td>${t("deal.print.material")}</td><td>${opts.listingMaterial}</td></tr>` : ""}
    ${opts.listingQuantity != null ? `<tr><td>${t("deal.print.quantity")}</td><td>${opts.listingQuantity.toLocaleString()} ${unit}</td></tr>` : ""}
    <tr><td>${t("deal.print.price_per_unit")}</td><td>${deal.price_per_unit.toLocaleString()} ${lang === "ar" ? "ريال" : "SAR"} / ${unit}</td></tr>
    <tr><td>${t("deal.print.total_value")}</td><td><strong>${totalValue} ${lang === "ar" ? "ريال" : "SAR"}</strong></td></tr>
    <tr><td>${t("deal.print.status")}</td><td>${statusMap[deal.status]}</td></tr>
  </table>
  <h2>${t("deal.print.timeline")}</h2>
  <div>
    ${timelineRows.map((row) => `
    <div class="timeline-row">
      <div class="tl-dot${row.ts ? "" : " pending"}"></div>
      <div><div class="tl-label">${row.label}</div><div class="tl-ts">${formatTs(row.ts)}</div></div>
    </div>`).join("")}
  </div>
  ${deal.status === "completed" ? `<p style="margin-top:12px"><span class="badge">✓ ${t("deal.compliance.badge")}</span></p>` : ""}
  <div class="footer">
    ${t("deal.print.footer")} &nbsp;|&nbsp; ${t("deal.print.generated_at")}: ${new Date().toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}
  </div>
  <script>window.onload=function(){window.print()}<\/script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

export function DealPanel({ deal, role, unit, onUpdate, pricingModel, revenueSharePct, listingRef, listingMaterial, listingQuantity, myCompanyName }: DealPanelProps) {
  const { t, lang } = useT();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualQty, setActualQty] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const currentStepIndex = STATUS_STEPS.indexOf(deal.status);

  async function executeAction(
    action: "confirm-payment" | "confirm-dispatch" | "confirm-receipt",
    body?: object,
  ) {
    setLoading(true);
    setError(null);
    setPendingAction(null);
    try {
      const authToken = await getToken();
      const updated = await callDealApi(deal.id, action, body, authToken);
      onUpdate(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("deal.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  function requestConfirmPayment() {
    if (!paymentRef.trim()) {
      setError(t("deal.error.payment_reference_required"));
      return;
    }
    if (deal.settlement_type === "by_weight") {
      const qty = parseFloat(actualQty);
      if (!actualQty || isNaN(qty) || qty <= 0) {
        setError(t("deal.error.invalid_state"));
        return;
      }
    }
    setError(null);
    setPendingAction("confirm-payment");
  }

  function handleConfirmed() {
    if (!pendingAction) return;
    if (pendingAction === "confirm-payment") {
      const body: Record<string, unknown> = {
        payment_reference: paymentRef.trim(),
      };
      if (paymentProofUrl.trim()) {
        body.payment_proof_url = paymentProofUrl.trim();
      }
      if (deal.settlement_type === "by_weight") {
        body.actual_quantity = parseFloat(actualQty);
      }
      executeAction("confirm-payment", body);
    } else {
      executeAction(pendingAction);
    }
  }

  const statusLabel = (s: DealStatus) => t(`deal.status.${s}`);

  const statusBadgeVariant = (s: DealStatus): "default" | "secondary" | "outline" => {
    if (s === "completed") return "default";
    if (s === "active") return "secondary";
    return "outline";
  };

  const waitingText =
    deal.status !== "completed" ? t(`deal.waiting.${deal.status}`) : null;

  const isMyTurn =
    (role === "producer" && (deal.status === "active" || deal.status === "payment_confirmed")) ||
    (role === "buyer" && deal.status === "dispatched");

  const confirmDialogProps: Record<
    Exclude<PendingAction, null>,
    { title: string; desc: string; label: string }
  > = {
    "confirm-payment": {
      title: t("deal.confirm.payment.title"),
      desc: t("deal.confirm.payment.desc"),
      label: t("deal.action.confirm_payment"),
    },
    "confirm-dispatch": {
      title: t("deal.confirm.dispatch.title"),
      desc: t("deal.confirm.dispatch.desc"),
      label: t("deal.action.confirm_dispatch"),
    },
    "confirm-receipt": {
      title: t("deal.confirm.receipt.title"),
      desc: t("deal.confirm.receipt.desc"),
      label: t("deal.action.confirm_receipt"),
    },
  };

  const activeDialog = pendingAction ? confirmDialogProps[pendingAction] : null;

  return (
    <>
      {activeDialog && (
        <ConfirmDialog
          open={!!pendingAction}
          onOpenChange={(open) => { if (!open) setPendingAction(null); }}
          title={activeDialog.title}
          description={activeDialog.desc}
          confirmLabel={activeDialog.label}
          onConfirm={handleConfirmed}
          isPending={loading}
        />
      )}

      <div className="rounded-xl border border-primary/20 bg-primary/5 space-y-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-primary/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-primary text-sm">{t("deal.panel.title")}</span>
            <Badge variant={statusBadgeVariant(deal.status)}>
              {statusLabel(deal.status)}
            </Badge>
          </div>

          {pricingModel === "revenue_share" && revenueSharePct != null && (
            <div className="flex items-center gap-1.5 text-xs text-primary/80 font-medium border border-primary/20 rounded-md px-2 py-1 bg-primary/5 w-fit">
              <Percent className="h-3 w-3 shrink-0" />
              <span>{t("listing.pricing_model.revenue_share")} — {revenueSharePct}%</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-primary/80 font-medium">
              {role === "producer"
                ? <UserCog className="h-3.5 w-3.5 shrink-0" />
                : <UserCheck className="h-3.5 w-3.5 shrink-0" />}
              <span>{t(`deal.role.${role}`)}</span>
            </div>
            {deal.status !== "completed" && (
              <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                isMyTurn
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                  : "bg-muted text-muted-foreground"
              }`}>
                {isMyTurn
                  ? <><AlertCircle className="h-3 w-3 shrink-0" />{t("deal.role.your_turn")}</>
                  : <><Clock className="h-3 w-3 shrink-0" />{t("deal.role.not_your_turn")}</>
                }
              </div>
            )}
          </div>
        </div>

        {/* V6 — Compliance badge (completed deals) */}
        {deal.status === "completed" && (
          <div className="px-4 py-2.5 flex items-center gap-2 bg-green-50 border-b border-green-200/60">
            <Shield className="h-4 w-4 text-green-700 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-green-800">{t("deal.compliance.badge")}</span>
              <span className="mx-2 text-green-400 text-xs">·</span>
              <span className="text-xs text-green-700">{t("deal.compliance.tagline")}</span>
            </div>
            {listingRef && (
              <span className="text-[10px] text-green-600 font-mono shrink-0">{listingRef}</span>
            )}
          </div>
        )}

        {/* V5 — Smart contextual message */}
        {deal.status === "completed" && (
          <div className="px-4 py-2 bg-muted/30 border-b border-border">
            <p className="text-xs text-muted-foreground">{t("deal.smart.deal_completed")}</p>
          </div>
        )}

        {/* Contact */}
        {deal.counterparty && (
          <div className="px-4 py-3 flex items-center gap-3 bg-background border-b border-primary/10">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("deal.contact.title")}</p>
              <p className="font-semibold text-sm truncate">{deal.counterparty.name}</p>
              <a
                href={`tel:${deal.counterparty.contact_phone}`}
                dir="ltr"
                className="text-sm text-primary font-mono hover:underline"
              >
                {deal.counterparty.contact_phone}
              </a>
            </div>
          </div>
        )}

        {/* Settlement summary */}
        <div className="px-4 py-3 space-y-2 border-b border-primary/10 bg-background">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">{t("deal.settlement.label")}</span>
            <span className="font-medium text-end">
              {t(`deal.settlement.${deal.settlement_type}`)}
            </span>

            <span className="text-muted-foreground">{t("deal.field.price_per_unit")}</span>
            <span className="font-medium text-end">
              {deal.price_per_unit.toLocaleString()} {t("listing.sar")} / {unit}
            </span>

            <span className="text-muted-foreground">{t("deal.field.estimated_amount")}</span>
            <span className="font-medium text-end">
              {deal.estimated_amount.toLocaleString()} {t("listing.sar")}
            </span>

            {deal.actual_quantity != null && (
              <>
                <span className="text-muted-foreground">{t("deal.field.actual_quantity")}</span>
                <span className="font-semibold text-end">
                  {deal.actual_quantity.toLocaleString()} {unit}
                </span>
              </>
            )}

            {deal.final_amount != null && (
              <>
                <span className="text-muted-foreground font-semibold">{t("deal.field.final_amount")}</span>
                <span className="font-bold text-primary text-end">
                  {deal.final_amount.toLocaleString()} {t("listing.sar")}
                </span>
              </>
            )}
          </div>
          {deal.settlement_type === "by_weight" && deal.final_amount == null && (
            <p className="text-xs text-muted-foreground">{t("deal.disclaimer")}</p>
          )}
        </div>

        {/* Status stepper */}
        <div className="px-4 py-3 border-b border-primary/10 bg-background space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("deal.stepper.title")}</span>
            <span className="text-xs text-muted-foreground">
              {currentStepIndex + 1} / {STATUS_STEPS.length}
            </span>
          </div>
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex && deal.status !== "completed";
              const isLast = i === STATUS_STEPS.length - 1;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    {isCurrent ? (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 relative" />
                      </div>
                    ) : done ? (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
                    )}
                    <span
                      className={`text-center text-[10px] leading-tight ${
                        isCurrent
                          ? "text-primary font-bold"
                          : done
                            ? "text-primary/70 font-medium"
                            : "text-muted-foreground/50"
                      }`}
                      style={{ maxWidth: "60px" }}
                    >
                      {statusLabel(step)}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`h-0.5 flex-1 mx-1 mb-5 rounded-full ${i < currentStepIndex ? "bg-primary" : "bg-muted"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Role-based actions */}
        {deal.status !== "completed" && (
          <div className="px-4 py-3 space-y-3 border-b border-primary/10 bg-background">
            <div className={`rounded-md px-3 py-2 text-xs leading-relaxed ${
              isMyTurn
                ? "bg-amber-50 border border-amber-200 text-amber-800"
                : "bg-muted/60 text-muted-foreground"
            }`}>
              {t(`deal.stage.action.${deal.status}.${role}`)}
            </div>

            {role === "producer" && deal.status === "active" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    {t("deal.field.payment_reference")} *
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => { setPaymentRef(e.target.value); setError(null); }}
                    placeholder={t("deal.field.payment_reference.placeholder")}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    dir="ltr"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">{t("deal.field.payment_reference.hint")}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("deal.field.payment_proof_url")}
                  </label>
                  <input
                    type="url"
                    value={paymentProofUrl}
                    onChange={(e) => setPaymentProofUrl(e.target.value)}
                    placeholder={t("deal.field.payment_proof_url.placeholder")}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    dir="ltr"
                  />
                </div>

                {deal.settlement_type === "by_weight" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={actualQty}
                      onChange={(e) => setActualQty(e.target.value)}
                      placeholder={t("deal.field.quantity.placeholder")}
                      className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-start"
                      dir="ltr"
                    />
                    <span className="text-sm text-muted-foreground shrink-0">{unit}</span>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={requestConfirmPayment}
                  disabled={loading}
                >
                  {loading && pendingAction === null && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("deal.action.confirm_payment")}
                </Button>
              </div>
            )}

            {role === "producer" && deal.status === "payment_confirmed" && (
              <Button
                className="w-full"
                onClick={() => setPendingAction("confirm-dispatch")}
                disabled={loading}
              >
                {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("deal.action.confirm_dispatch")}
              </Button>
            )}

            {role === "buyer" && deal.status === "dispatched" && (
              <Button
                className="w-full"
                onClick={() => setPendingAction("confirm-receipt")}
                disabled={loading}
              >
                {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("deal.action.confirm_receipt")}
              </Button>
            )}

            {(deal.status as string) !== "completed" && !isMyTurn && waitingText && (
              <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground text-center leading-relaxed">
                {waitingText}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* V1 — Deal Value Summary (producer only, auction only) */}
        {role === "producer" && pricingModel !== "revenue_share" && deal.listing_id && (
          <DealValueSummary
            listingId={deal.listing_id}
            acceptedPricePerUnit={deal.price_per_unit}
            estimatedAmount={deal.estimated_amount}
            unit={unit}
          />
        )}

        {/* V2 — Governance Timeline */}
        <GovernanceTimeline deal={deal} lang={lang} />

        {/* V3 — Print Report button */}
        <div className="px-4 py-3 bg-muted/10 border-t border-border">
          <button
            type="button"
            onClick={() =>
              printDealReport(deal, role, unit, lang, t, {
                listingRef,
                listingMaterial,
                listingQuantity,
                myCompanyName,
              })
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <Printer className="h-4 w-4 shrink-0" />
            {t("deal.print.button")}
          </button>
        </div>
      </div>
    </>
  );
}
