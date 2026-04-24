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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useT } from "@/i18n";

export type DealStatus = "active" | "payment_confirmed" | "dispatched" | "completed";
export type SettlementType = "fixed" | "by_weight";

export interface DealInfo {
  id: string;
  offer_id: string;
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

export function DealPanel({ deal, role, unit, onUpdate, pricingModel, revenueSharePct }: DealPanelProps) {
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
      console.log(`[tadweerah] deal action '${action}' succeeded — deal ${deal.id}`);
    } catch (e) {
      console.warn(`[tadweerah] deal action '${action}' failed — deal ${deal.id}:`, e);
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
      {/* Confirmation dialog */}
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

          {/* Revenue share indicator */}
          {pricingModel === "revenue_share" && revenueSharePct != null && (
            <div className="flex items-center gap-1.5 text-xs text-primary/80 font-medium border border-primary/20 rounded-md px-2 py-1 bg-primary/5 w-fit">
              <Percent className="h-3 w-3 shrink-0" />
              <span>{t("listing.pricing_model.revenue_share")} — {revenueSharePct}%</span>
            </div>
          )}

          {/* Role badge + action status */}
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
            {/* P4 — Per-stage description: tells each role what's expected */}
            <div className={`rounded-md px-3 py-2 text-xs leading-relaxed ${
              isMyTurn
                ? "bg-amber-50 border border-amber-200 text-amber-800"
                : "bg-muted/60 text-muted-foreground"
            }`}>
              {t(`deal.stage.action.${deal.status}.${role}`)}
            </div>
            {/* Producer: confirm payment */}
            {role === "producer" && deal.status === "active" && (
              <div className="space-y-3">
                {/* Payment reference (required) */}
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

                {/* Payment proof URL (optional) */}
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

                {/* Actual quantity (by_weight only) */}
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

            {/* Producer: confirm dispatch */}
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

            {/* Buyer: confirm receipt */}
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

            {/* Waiting — not the current user's turn */}
            {(deal.status as string) !== "completed" && !isMyTurn && waitingText && (
              <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground text-center leading-relaxed">
                {waitingText}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Timestamp log */}
        {(deal.payment_confirmed_at || deal.dispatched_at || deal.received_at) && (
          <div className="px-4 py-3 space-y-1.5 bg-muted/30">
            {deal.payment_confirmed_at && (
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>
                    {t("deal.timestamp.payment_confirmed")}: {formatDate(deal.payment_confirmed_at, lang)}
                  </span>
                </div>
                {deal.payment_reference && (
                  <div className="ms-5 text-xs text-muted-foreground">
                    {t("deal.field.payment_reference")}: <span className="font-mono font-medium text-foreground" dir="ltr">{deal.payment_reference}</span>
                  </div>
                )}
              </div>
            )}
            {deal.dispatched_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  {t("deal.timestamp.dispatched")}: {formatDate(deal.dispatched_at, lang)}
                </span>
              </div>
            )}
            {deal.received_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  {t("deal.timestamp.received")}: {formatDate(deal.received_at, lang)}
                </span>
              </div>
            )}
            {deal.status === "completed" && (
              <div className="pt-1">
                <Badge variant="default" className="text-xs">
                  {t("deal.timestamp.completed")}
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
