import { useState } from "react";
import {
  Phone,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
}

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
): Promise<DealInfo> {
  const res = await fetch(`/api/deals/${dealId}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

export function DealPanel({ deal, role, unit, onUpdate }: DealPanelProps) {
  const { t, lang } = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualQty, setActualQty] = useState("");

  const currentStepIndex = STATUS_STEPS.indexOf(deal.status);

  async function handleAction(
    action: "confirm-payment" | "confirm-dispatch" | "confirm-receipt",
    body?: object,
  ) {
    setLoading(true);
    setError(null);
    try {
      const updated = await callDealApi(deal.id, action, body);
      onUpdate(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("deal.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  function handleConfirmPayment() {
    if (deal.settlement_type === "by_weight") {
      const qty = parseFloat(actualQty);
      if (!actualQty || isNaN(qty) || qty <= 0) {
        setError(t("deal.error.invalid_state"));
        return;
      }
      handleAction("confirm-payment", { actual_quantity: qty });
    } else {
      handleAction("confirm-payment");
    }
  }

  const statusLabel = (s: DealStatus) => t(`deal.status.${s}`);

  const statusBadgeVariant = (s: DealStatus): "default" | "secondary" | "outline" => {
    if (s === "completed") return "default";
    if (s === "active") return "secondary";
    return "outline";
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 space-y-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/10">
        <span className="font-semibold text-primary text-sm">{t("deal.panel.title")}</span>
        <Badge variant={statusBadgeVariant(deal.status)}>
          {statusLabel(deal.status)}
        </Badge>
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
            <p
              dir="ltr"
              className="text-sm text-primary font-mono"
            >
              {deal.counterparty.contact_phone}
            </p>
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
      <div className="px-4 py-3 border-b border-primary/10 bg-background">
        <div className="flex items-center gap-0">
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStepIndex;
            const isLast = i === STATUS_STEPS.length - 1;
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-0.5 flex-1">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
                  )}
                  <span
                    className={`text-center text-[10px] leading-tight ${done ? "text-primary font-medium" : "text-muted-foreground/60"}`}
                    style={{ maxWidth: "60px" }}
                  >
                    {statusLabel(step)}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`h-px flex-1 mx-1 mb-4 ${i < currentStepIndex ? "bg-primary" : "bg-muted"}`}
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
          {/* Producer: confirm payment */}
          {role === "producer" && deal.status === "active" && (
            <div className="space-y-2">
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
                onClick={handleConfirmPayment}
                disabled={loading}
              >
                {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("deal.action.confirm_payment")}
              </Button>
            </div>
          )}

          {/* Producer: confirm dispatch */}
          {role === "producer" && deal.status === "payment_confirmed" && (
            <Button
              className="w-full"
              onClick={() => handleAction("confirm-dispatch")}
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
              onClick={() => handleAction("confirm-receipt")}
              disabled={loading}
            >
              {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("deal.action.confirm_receipt")}
            </Button>
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                {t("deal.timestamp.payment_confirmed")}: {formatDate(deal.payment_confirmed_at, lang)}
              </span>
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
  );
}
