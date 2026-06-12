import { useEffect, useRef, useState } from "react";
import { useParams, Link, useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import {
  useGetWasteListing,
  useGetMe,
  useGetListingOffers,
  useGetOffersSummary,
  useSubmitOffer,
  useImproveOffer,
  useAcceptOffer,
  useRejectOffer,
  useGetMaterialCategories,
  getListMyListingsQueryKey,
  getGetListingOffersQueryKey,
  getGetOffersSummaryQueryKey,
  type ListingOffer,
} from "@workspace/api-client-react";
import {
  Loader2,
  Package,
  MapPin,
  Tag,
  Building2,
  Calendar,
  Recycle,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  Medal,
  Copy,
  Check,
  Gavel,
  ShoppingBag,
  Scale,
  Percent,
  Lock,
  Info,
  AlertCircle,
  Shield,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { AppLayout } from "@/components/app-layout";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DealPanel, type DealInfo } from "@/components/deal-panel";
import { EligibilityBlock } from "@/components/eligibility-block";
import { useEligibility } from "@/hooks/use-eligibility";
import { useT } from "@/i18n";
import { fmtNumber } from "@/lib/format";
import { listingRef } from "@/lib/listing-ref";
import { LocationLink } from "@/components/location-link";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REJECTION_REASON_CODES = [
  "price_too_low",
  "quantity_mismatch",
  "not_interested",
  "other",
] as const;

/** Translate a machine rejection_reason code to a human label. Falls back to raw value. */
function translateRejectionReason(code: string | undefined, t: (k: string) => string): string {
  if (!code) return "";
  // Strip any detail suffix (e.g. "other: some detail")
  const base = code.split(":")[0]?.trim() ?? code;
  const key = `offer.reject.reason.${base}`;
  const translated = t(key);
  // If not translated (key returned as-is), use raw
  if (translated === key) return code;
  // If detail was present, append it
  const detail = code.includes(":") ? code.slice(code.indexOf(":") + 1).trim() : null;
  return detail ? `${translated}: ${detail}` : translated;
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

/** Compact detail row for the middle column */
function CompactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] text-muted-foreground truncate">{label}</span>
        <span className="block text-xs font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

/**
 * Shared price display: adapts label and layout based on pricing model.
 * - "fixed" → shows offer total (price_per_unit × quantity) only, no per-unit label.
 * - other   → shows price_per_unit / unit label + estimated total below.
 */
function PriceDisplay({
  pricePerUnit,
  quantity,
  unit,
  pricingModel,
  size = "md",
  t,
  subtotalOverride,
}: {
  pricePerUnit: number;
  quantity: number;
  unit?: string;
  pricingModel?: string | null;
  size?: "sm" | "md" | "lg";
  t: (k: string) => string;
  subtotalOverride?: number;
}) {
  const isTotal = pricingModel === "fixed";
  const unitLabel = unit ? t(`unit.${unit}`) : "";
  const totalValue = subtotalOverride ?? pricePerUnit * quantity;
  const valueClass =
    size === "lg" ? "text-3xl font-extrabold tracking-tight text-foreground"
    : size === "md" ? "text-xl font-bold text-foreground"
    : "text-base font-bold text-foreground";

  if (isTotal) {
    return (
      <div>
        <p className="text-[10px] text-muted-foreground mb-0.5">{t("offer.price.offerTotal")}</p>
        <div className="flex items-baseline gap-1">
          <span className={valueClass}>{fmtNumber(totalValue)}</span>
          <span className="text-xs text-muted-foreground">{t("listing.sar")}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className={valueClass}>{fmtNumber(pricePerUnit)}</span>
        <span className="text-xs text-muted-foreground">
          {t("listing.sar")}{unitLabel ? ` / ${unitLabel}` : ` / ${t("offer.price.perUnit").split("/")[1]?.trim()}`}
        </span>
      </div>
      {quantity > 0 && (
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("offer.mine.total")}:{" "}
          <span className="font-semibold text-foreground">{fmtNumber(totalValue)} {t("listing.sar")}</span>
          {" "}<span className="text-muted-foreground/60">{t("offer.quantityDisclaimer")}</span>
        </p>
      )}
    </div>
  );
}

/** Hero price display for the middle stats column */
function OfferPriceHero({
  wasteListingId,
  listingQuantity,
  unit,
  pricingModel,
  t,
}: {
  wasteListingId: string;
  listingQuantity: number;
  unit?: string;
  pricingModel?: string | null;
  t: (k: string) => string;
}) {
  const { data: summary } = useGetOffersSummary(wasteListingId);
  if (!summary) return null;
  return (
    <div className="space-y-2">
      {summary.count > 0 && summary.highest_price != null ? (
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">{t("offer.summary.highest")}</p>
          <PriceDisplay
            pricePerUnit={summary.highest_price}
            quantity={listingQuantity}
            unit={unit}
            pricingModel={pricingModel}
            size="lg"
            t={t}
            subtotalOverride={summary.highest_subtotal_amount ?? undefined}
          />
        </div>
      ) : null}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        {summary.count > 0
          ? `${summary.count} ${t("offer.summary.count")}`
          : t("offer.summary.noOffers")}
      </div>
    </div>
  );
}

function offerStatusVariant(status: ListingOffer["status"]) {
  if (status === "accepted") return "default";
  if (status === "rejected") return "outline";
  return "secondary";
}

/** Compact summary bar: offer count + highest price */
function OfferSummaryBar({ wasteListingId }: { wasteListingId: string }) {
  const { t } = useT();
  const { data: summary } = useGetOffersSummary(wasteListingId);

  if (!summary) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
      <span className="font-medium text-foreground">
        {summary.count > 0
          ? `${summary.count} ${t("offer.summary.count")}`
          : t("offer.summary.noOffers")}
      </span>
      {summary.highest_price != null && summary.count > 0 && (
        <span className="text-muted-foreground">
          {t("offer.summary.highest")}:{" "}
          <span className="font-bold text-foreground">
            {fmtNumber(summary.highest_price)}
          </span>{" "}
          {t("offer.summary.perUnit")}
        </span>
      )}
    </div>
  );
}

/** F6: Rank badge — only shown when total_offers > 1 */
function RankBadge({
  rank,
  total_offers,
}: {
  rank: number;
  total_offers: number;
}) {
  const { t } = useT();
  if (total_offers <= 1) return null;
  const isTop = rank === 1;

  const label = isTop
    ? t("offer.rank.top")
    : `${t("offer.rank.label")}: ${rank} ${t("offer.rank.of")} ${total_offers}`;

  return (
    <div
      data-testid="rank-badge"
      aria-label={label}
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
        isTop
          ? "bg-amber-50 text-amber-700 border border-amber-200"
          : "bg-muted text-muted-foreground border border-border"
      }`}
    >
      <Medal className="h-3 w-3" aria-hidden="true" />
      {isTop ? (
        <span>{t("offer.rank.top")}</span>
      ) : (
        <span>
          {t("offer.rank.label")}: {rank} {t("offer.rank.of")} {total_offers}
        </span>
      )}
    </div>
  );
}

/** F3: Rejection reason dialog for producer */
function RejectOfferDialog({
  open,
  offer,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  offer: ListingOffer | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, detail?: string) => void;
  isPending: boolean;
}) {
  const { t } = useT();
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setReason("");
      setDetail("");
      setError(null);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError(t("offer.reject.reason.required"));
      return;
    }
    onConfirm(reason, detail.trim() || undefined);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("offer.reject.confirm.title")}</DialogTitle>
          {offer && (
            <DialogDescription>
              {offer.buyer_company_name} —{" "}
              {fmtNumber(offer.price_per_unit)} {t("listing.sar")}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t("offer.reject.reason.label")} *
            </label>
            <div className="grid grid-cols-1 gap-2">
              {REJECTION_REASON_CODES.map((code) => (
                <label
                  key={code}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    reason === code
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="rejection_reason"
                    value={code}
                    checked={reason === code}
                    onChange={() => { setReason(code); setError(null); }}
                    className="accent-primary"
                  />
                  {t(`offer.reject.reason.${code}`)}
                </label>
              ))}
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {reason === "other" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("offer.reject.reason.detail.label")}
              </label>
              <textarea
                rows={2}
                maxLength={300}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("action.cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending}
            >
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {isPending ? t("offer.rejecting") : t("offer.reject.confirm.action")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** F4: Accept offer dialog — with optional lower-price reason */
function AcceptOfferDialog({
  open,
  offer,
  isLowerThanHighest,
  listingQuantity,
  pricingModel,
  unit,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  offer: ListingOffer | null;
  isLowerThanHighest: boolean;
  listingQuantity?: number;
  pricingModel?: string | null;
  unit?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (acceptanceReason?: string) => void;
  isPending: boolean;
}) {
  const { t } = useT();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLowerThanHighest && !reason.trim()) {
      setError(t("offer.accept.reason.required"));
      return;
    }
    onConfirm(reason.trim() || undefined);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("offer.accept.confirm.title")}</DialogTitle>
          {offer && (
            <DialogDescription asChild>
              <div className="space-y-2 pt-1">
                <p className="text-sm font-semibold text-foreground">{offer.buyer_company_name}</p>
                <PriceDisplay
                  pricePerUnit={offer.price_per_unit}
                  quantity={listingQuantity ?? 0}
                  unit={unit}
                  pricingModel={pricingModel}
                  size="sm"
                  t={t}
                  subtotalOverride={offer.offer_subtotal_amount ?? undefined}
                />
                <p className="text-xs text-muted-foreground">{t("offer.accept.confirm.desc")}</p>
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {isLowerThanHighest && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
              {t("offer.accept.lowerThanHighest")}
            </div>
          )}

          {isLowerThanHighest && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                {t("offer.accept.reason.label")} *
              </label>
              <textarea
                rows={3}
                maxLength={300}
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError(null); }}
                placeholder={t("offer.accept.reason.placeholder")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("action.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {isPending ? t("offer.accepting") : t("offer.accept.confirm.action")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Buyer offer section: submit / improve / status */
function BuyerOfferSection({
  wasteListingId,
  listingQuantity,
  isOpen,
  pricingModel,
  unit,
  onSuccess,
}: {
  wasteListingId: string;
  listingQuantity: number;
  isOpen: boolean;
  pricingModel?: string | null;
  unit?: string;
  onSuccess: () => void;
}) {
  const { t } = useT();
  const { data: offers = [], isLoading } = useGetListingOffers(wasteListingId);
  const { data: summary } = useGetOffersSummary(wasteListingId);
  const { mutate: submitOffer, isPending: isSubmitting } = useSubmitOffer();
  const { mutate: improveOffer, isPending: isImproving } = useImproveOffer();

  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [showImproveForm, setShowImproveForm] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showSelfImprovePopup, setShowSelfImprovePopup] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const myOffer = offers[0] as ListingOffer | undefined;
  const highestPrice = summary?.highest_price ?? 0;

  function mapOfferError(err: unknown): string {
    // The API returns { error: <message>, code: <machine code> }.
    // We must read `code`, not `error` (which is the human-readable message).
    const data = (err as { response?: { data?: { code?: string; error?: string } } })?.response?.data;
    const code = data?.code ?? data?.error ?? "";
    if (code === "CompanyIncomplete")    return t("offer.error.CompanyIncomplete");
    if (code === "CompanyPending")       return t("offer.error.CompanyPending");
    if (code === "CompanyExpired")       return t("offer.error.CompanyExpired");
    if (code === "CompanyRejected")      return t("offer.error.CompanyRejected");
    if (code === "PriceTooLow" || code.includes("higher")) return t("offer.error.tooLow");
    if (code === "MissingCapability")    return t("offer.error.MissingCapability");
    if (code === "LicenseRequired")      return t("offer.error.LicenseRequired");
    if (code === "TargetingRestricted")  return t("offer.error.TargetingRestricted");
    if (code === "AlreadyTopBidder")     return t("offer.error.AlreadyTopBidder");
    if (code === "OfferSubmissionBlocked") return t("offer.error.OfferSubmissionBlocked");
    if (code === "CommercialRegistrationRequired") return t("offer.error.CommercialRegistrationRequired");
    if (code === "TermsRequired")        return t("offer.error.TermsRequired");
    if (code === "Forbidden")            return t("offer.error.Forbidden");
    if (code === "ListingClosed")        return t("offer.error.ListingClosed");
    return t("offer.error.generic");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const entered = parseFloat(price);
    if (!entered || entered <= 0) return;
    const isFixed = pricingModel === "fixed";
    const price_per_unit = isFixed
      ? (listingQuantity > 0 ? entered / listingQuantity : entered)
      : entered;
    const offer_subtotal_amount = isFixed
      ? entered
      : Math.round(entered * listingQuantity * 100) / 100;

    submitOffer(
      { wasteListingId, data: { price_per_unit, message: message.trim() || undefined, offer_subtotal_amount } },
      {
        onSuccess: () => { setPrice(""); setMessage(""); onSuccess(); },
        onError: (err: unknown) => { setFormError(mapOfferError(err)); },
      },
    );
  }

  // P1 — holds the validated unit price pending self-improve confirmation
  const [pendingImproveData, setPendingImproveData] = useState<{ price_per_unit: number; message?: string; offer_subtotal_amount?: number } | null>(null);

  function submitImprove(data: { price_per_unit: number; message?: string; offer_subtotal_amount?: number; explicit_self_improve?: boolean }) {
    improveOffer(
      { wasteListingId, data },
      {
        onSuccess: () => {
          setShowImproveForm(false);
          setNewPrice("");
          setNewMessage("");
          setPendingImproveData(null);
          onSuccess();
        },
        onError: (err: unknown) => { setFormError(mapOfferError(err)); },
      },
    );
  }

  function handleImprove(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const entered = parseFloat(newPrice);
    if (!entered || entered <= 0) return;
    const isFixed = pricingModel === "fixed";
    const unitVal = isFixed
      ? (listingQuantity > 0 ? entered / listingQuantity : entered)
      : entered;
    const offer_subtotal_amount = isFixed
      ? entered
      : Math.round(entered * listingQuantity * 100) / 100;
    const myRank = (myOffer as unknown as { rank?: number })?.rank;
    const payload = { price_per_unit: unitVal, message: newMessage.trim() || undefined, offer_subtotal_amount };
    // P1 — if already top bidder, show confirmation popup instead of submitting
    if (myRank === 1) {
      setPendingImproveData(payload);
      setShowSelfImprovePopup(true);
      return;
    }
    submitImprove(payload);
  }

  function handleConfirmedSelfImprove() {
    if (!pendingImproveData) return;
    setShowSelfImprovePopup(false);
    submitImprove({ ...pendingImproveData, explicit_self_improve: true });
    setPendingImproveData(null);
  }

  if (isLoading) {
    return (
      <div className="flex h-16 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Accepted offer
  if (myOffer?.status === "accepted") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-3 dark:border-green-800 dark:bg-green-950">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">{t("offer.mine.accepted")}</span>
        </div>
        <PriceDisplay
          pricePerUnit={myOffer.price_per_unit}
          quantity={listingQuantity}
          unit={unit}
          pricingModel={pricingModel}
          size="md"
          t={t}
          subtotalOverride={myOffer.offer_subtotal_amount ?? undefined}
        />
      </div>
    );
  }

  // Rejected offer — F2: show rejection reason + consistent price display
  if (myOffer?.status === "rejected") {
    const reasonText = translateRejectionReason(myOffer.rejection_reason, t);
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-2">
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          <span className="font-semibold">{t("offer.mine.rejected")}</span>
        </div>
        <div className="opacity-70">
          <PriceDisplay
            pricePerUnit={myOffer.price_per_unit}
            quantity={listingQuantity}
            unit={unit}
            pricingModel={pricingModel}
            size="md"
            t={t}
            subtotalOverride={myOffer.offer_subtotal_amount ?? undefined}
          />
        </div>
        {reasonText && (
          <div className="text-xs text-muted-foreground border-t border-destructive/20 pt-2 mt-1">
            <span className="font-medium">{t("offer.mine.rejectionReason")}:</span>{" "}
            {reasonText}
          </div>
        )}
      </div>
    );
  }

  // Existing pending offer
  if (myOffer?.status === "pending") {
    const rank = (myOffer as unknown as { rank?: number }).rank;
    const totalOffers = (myOffer as unknown as { total_offers?: number }).total_offers;

    return (
      <>
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          {/* Submitted confirmation banner */}
          <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold text-primary">{t("offer.mine.submitted_confirmation")}</p>
              <p className="text-[11px] text-muted-foreground">{t("offer.mine.waiting_response")}</p>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t("offer.mine.title")}
            </span>
            <div className="flex items-center gap-2">
              {/* F6: rank badge */}
              {rank != null && totalOffers != null && (
                <RankBadge rank={rank} total_offers={totalOffers} />
              )}
              <Badge variant="secondary">{t("offer.status.pending")}</Badge>
            </div>
          </div>
          <PriceDisplay
            pricePerUnit={myOffer.price_per_unit}
            quantity={listingQuantity}
            unit={unit}
            pricingModel={pricingModel}
            size="md"
            t={t}
            subtotalOverride={myOffer.offer_subtotal_amount ?? undefined}
          />
          <p className="text-xs text-muted-foreground">{t("offer.mine.pending")}</p>
          {myOffer.message && (
            <p className="text-sm text-foreground italic">{myOffer.message}</p>
          )}
        </div>

        {/* Improve offer */}
        {isOpen && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => { setShowImproveForm(!showImproveForm); setFormError(null); }}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t("offer.form.improve")}
              </span>
              {showImproveForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {/* P1: Top-bidder info note (no checkbox — popup fires on submit) */}
            {rank === 1 && showImproveForm && (
              <div className="px-5 pt-3">
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">{t("offer.warning.already_top")}</p>
                </div>
              </div>
            )}
            {showImproveForm && (
              <form onSubmit={handleImprove} className="px-5 pb-5 pt-2 space-y-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {t("offer.form.mustExceed")}:{" "}
                  <span className="font-semibold">
                    {fmtNumber(highestPrice)} {t("listing.sar")}
                  </span>
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {pricingModel === "fixed" ? t("offer.form.totalPriceLabel") : t("offer.form.unitPriceLabel")}
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={`> ${fmtNumber(highestPrice)}`}
                  />
                  {newPrice && parseFloat(newPrice) > 0 && (() => {
                    const entered = parseFloat(newPrice);
                    const isFixed = pricingModel === "fixed";
                    const subtotal = isFixed ? entered : Math.round(entered * listingQuantity * 100) / 100;
                    const vatAmt = Math.round(subtotal * 0.15 * 100) / 100;
                    const totalAmt = Math.round((subtotal + vatAmt) * 100) / 100;
                    return (
                      <div className="space-y-1">
                        {!isFixed && (
                          <p className="text-xs text-muted-foreground">
                            {t("offer.form.computedTotal")}: <span className="font-semibold">{fmtNumber(subtotal, { maximumFractionDigits: 2 })} {t("listing.sar")}</span>
                          </p>
                        )}
                        <div className="rounded-md bg-muted/40 border border-border/50 px-2.5 py-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                          <span className="text-muted-foreground">{t("deal.vat.subtotal")}</span>
                          <span className="font-medium text-end">{fmtNumber(subtotal, { maximumFractionDigits: 2 })} {t("listing.sar")}</span>
                          <span className="text-muted-foreground">{t("deal.vat.rate")}</span>
                          <span className="font-medium text-end">{fmtNumber(vatAmt, { maximumFractionDigits: 2 })} {t("listing.sar")}</span>
                          <span className="font-semibold text-muted-foreground">{t("deal.vat.total")}</span>
                          <span className="font-bold text-end">{fmtNumber(totalAmt, { maximumFractionDigits: 2 })} {t("listing.sar")}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("offer.form.message")}
                  </label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {formError && <p className="text-xs text-destructive">{formError}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isImproving}
                >
                  {isImproving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {isImproving ? t("offer.form.improving") : t("offer.form.improve")}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* P1 — Self-improve confirmation popup */}
      <ConfirmDialog
        open={showSelfImprovePopup}
        onOpenChange={(open) => { if (!open) { setShowSelfImprovePopup(false); setPendingImproveData(null); } }}
        title={t("offer.confirm.alreadyTop.popup.title")}
        description={t("offer.confirm.alreadyTop.popup.desc")}
        confirmLabel={t("offer.confirm.alreadyTop.popup.confirm")}
        onConfirm={handleConfirmedSelfImprove}
        isPending={isImproving}
      />
      </>
    );
  }

  // No offer yet
  if (!isOpen) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          {t("listing.offer.cta")}
        </span>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">{t("offer.form.intro")}</p>
      {highestPrice > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("offer.form.mustExceed")}:{" "}
          <span className="font-semibold">
            {fmtNumber(highestPrice)} {t("listing.sar")}
          </span>
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {pricingModel === "fixed" ? t("offer.form.totalPriceLabel") : t("offer.form.unitPriceLabel")}
          </label>
          <input
            type="number"
            min="0.001"
            step="0.001"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={highestPrice > 0 ? `> ${fmtNumber(highestPrice)}` : "0.000"}
          />
          {price && parseFloat(price) > 0 && (() => {
            const entered = parseFloat(price);
            const isFixed = pricingModel === "fixed";
            const subtotal = isFixed ? entered : Math.round(entered * listingQuantity * 100) / 100;
            const vatAmt = Math.round(subtotal * 0.15 * 100) / 100;
            const totalAmt = Math.round((subtotal + vatAmt) * 100) / 100;
            return (
              <div className="space-y-1">
                {!isFixed && (
                  <p className="text-xs text-muted-foreground">
                    {t("offer.form.computedTotal")}: <span className="font-semibold">{fmtNumber(subtotal, { maximumFractionDigits: 2 })} {t("listing.sar")}</span>{" "}
                    <span className="text-muted-foreground/60">{t("offer.quantityDisclaimer")}</span>
                  </p>
                )}
                <div className="rounded-md bg-muted/40 border border-border/50 px-2.5 py-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                  <span className="text-muted-foreground">{t("deal.vat.subtotal")}</span>
                  <span className="font-medium text-end">{fmtNumber(subtotal, { maximumFractionDigits: 2 })} {t("listing.sar")}</span>
                  <span className="text-muted-foreground">{t("deal.vat.rate")}</span>
                  <span className="font-medium text-end">{fmtNumber(vatAmt, { maximumFractionDigits: 2 })} {t("listing.sar")}</span>
                  <span className="font-semibold text-muted-foreground">{t("deal.vat.total")}</span>
                  <span className="font-bold text-end">{fmtNumber(totalAmt, { maximumFractionDigits: 2 })} {t("listing.sar")}</span>
                </div>
              </div>
            );
          })()}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("offer.form.message")}
          </label>
          <textarea
            rows={2}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {formError && <p className="text-xs text-destructive">{formError}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? t("offer.form.submitting") : t("offer.form.submit")}
        </Button>
      </form>
    </div>
  );
}

/** Single offer row in producer's list */
function ProducerOfferRow({
  offer,
  listingQuantity,
  listingIsOpen,
  highestPendingPrice,
  pricingModel,
  unit,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: {
  offer: ListingOffer;
  listingQuantity: number;
  listingIsOpen: boolean;
  highestPendingPrice: number;
  pricingModel?: string | null;
  unit?: string;
  onAccept: (offer: ListingOffer) => void;
  onReject: (offer: ListingOffer) => void;
  isAccepting: boolean;
  isRejecting: boolean;
}) {
  const { t } = useT();

  return (
    <div className="py-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground truncate">
            {offer.buyer_company_name}
          </span>
          {offer.buyer_is_verified && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 text-green-800 text-[9px] font-bold px-1.5 py-0.5 shrink-0">
              <Check className="h-2.5 w-2.5" />{t("company.verified")}
            </span>
          )}
        </div>
        <Badge variant={offerStatusVariant(offer.status)} className="shrink-0 text-xs">
          {t(`offer.status.${offer.status}`)}
        </Badge>
      </div>

      <PriceDisplay
        pricePerUnit={offer.price_per_unit}
        quantity={listingQuantity}
        unit={unit}
        pricingModel={pricingModel}
        size="md"
        t={t}
        subtotalOverride={offer.offer_subtotal_amount ?? undefined}
      />

      {/* VAT breakdown — display only; comparison and ranking use pre-VAT price_per_unit */}
      {(() => {
        const raw = offer.offer_subtotal_amount ?? (offer.price_per_unit * listingQuantity);
        const subtotal = Math.round(raw * 100) / 100;
        const vatAmt = Math.round(subtotal * 0.15 * 100) / 100;
        const totalAmt = Math.round((subtotal + vatAmt) * 100) / 100;
        return (
          <div className="rounded-md bg-muted/30 border border-border/40 px-2.5 py-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs mt-1.5">
            <span className="text-muted-foreground">{t("deal.vat.subtotal")}</span>
            <span className="font-medium text-end">{fmtNumber(subtotal, { maximumFractionDigits: 2 })} {t("listing.sar")}</span>
            <span className="text-muted-foreground">{t("deal.vat.rate")}</span>
            <span className="font-medium text-end">{fmtNumber(vatAmt, { maximumFractionDigits: 2 })} {t("listing.sar")}</span>
            <span className="font-semibold text-muted-foreground">{t("deal.vat.total")}</span>
            <span className="font-bold text-end">{fmtNumber(totalAmt, { maximumFractionDigits: 2 })} {t("listing.sar")}</span>
          </div>
        );
      })()}

      {offer.message && (
        <p className="text-sm text-muted-foreground italic">{offer.message}</p>
      )}

      {offer.status === "pending" && listingIsOpen && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => onAccept(offer)}
            disabled={isAccepting || isRejecting}
          >
            {isAccepting ? <Loader2 className="me-1.5 h-3 w-3 animate-spin" /> : <BadgeCheck className="me-1.5 h-3 w-3" />}
            {isAccepting ? t("offer.accepting") : t("offer.accept")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => onReject(offer)}
            disabled={isAccepting || isRejecting}
          >
            {isRejecting ? <Loader2 className="me-1.5 h-3 w-3 animate-spin" /> : <XCircle className="me-1.5 h-3 w-3" />}
            {isRejecting ? t("offer.rejecting") : t("offer.reject")}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Producer's incoming offers panel */
function ProducerOffersPanel({
  wasteListingId,
  listingQuantity,
  listingIsOpen,
  pricingModel,
  unit,
  onAfterAction,
  onPendingCountChange,
}: {
  wasteListingId: string;
  listingQuantity: number;
  listingIsOpen: boolean;
  pricingModel?: string | null;
  unit?: string;
  onAfterAction: () => void;
  onPendingCountChange: (count: number) => void;
}) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const { data: offers = [], isLoading } = useGetListingOffers(wasteListingId);
  const { mutate: acceptOffer, isPending: isAccepting } = useAcceptOffer();
  const { mutate: rejectOffer, isPending: isRejecting } = useRejectOffer();

  const [acceptTarget, setAcceptTarget] = useState<ListingOffer | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ListingOffer | null>(null);

  // Notify parent of pending count for close-dialog warning
  const prevCountRef = useRef<number>(-1);
  useEffect(() => {
    const pending = (offers as ListingOffer[]).filter((o) => o.status === "pending").length;
    if (pending !== prevCountRef.current) {
      prevCountRef.current = pending;
      onPendingCountChange(pending);
    }
  }, [offers, onPendingCountChange]);

  // F4: compute whether the acceptTarget is lower than the highest other pending offer
  const highestPendingPrice = (offers as ListingOffer[])
    .filter((o) => o.status === "pending")
    .reduce((max, o) => Math.max(max, o.price_per_unit), 0);

  const acceptIsLower =
    acceptTarget != null &&
    (offers as ListingOffer[]).some(
      (o) => o.status === "pending" && o.id !== acceptTarget.id && o.price_per_unit > acceptTarget.price_per_unit,
    );

  function invalidateOffers() {
    queryClient.invalidateQueries({ queryKey: getGetListingOffersQueryKey(wasteListingId) });
    queryClient.invalidateQueries({ queryKey: getGetOffersSummaryQueryKey(wasteListingId) });
  }

  function handleAcceptConfirm(acceptanceReason?: string) {
    if (!acceptTarget) return;
    acceptOffer(
      { offerId: acceptTarget.id, data: acceptanceReason ? { acceptance_reason: acceptanceReason } : {} },
      {
        onSuccess: () => { setAcceptTarget(null); invalidateOffers(); onAfterAction(); },
        onError: () => setAcceptTarget(null),
      },
    );
  }

  function handleRejectConfirm(reason: string, detail?: string) {
    if (!rejectTarget) return;
    const fullReason = detail ? `${reason}: ${detail}` : reason;
    rejectOffer(
      { offerId: rejectTarget.id, data: { rejection_reason: fullReason } },
      {
        onSuccess: () => { setRejectTarget(null); invalidateOffers(); },
        onError: () => setRejectTarget(null),
      },
    );
  }

  return (
    <>
      {/* F3: Reject dialog with reason select */}
      <RejectOfferDialog
        open={!!rejectTarget}
        offer={rejectTarget}
        onOpenChange={(open) => { if (!open) setRejectTarget(null); }}
        onConfirm={handleRejectConfirm}
        isPending={isRejecting}
      />

      {/* F4: Accept dialog with conditional reason */}
      <AcceptOfferDialog
        open={!!acceptTarget}
        offer={acceptTarget}
        isLowerThanHighest={acceptIsLower}
        listingQuantity={listingQuantity}
        pricingModel={pricingModel}
        unit={unit}
        onOpenChange={(open) => { if (!open) setAcceptTarget(null); }}
        onConfirm={handleAcceptConfirm}
        isPending={isAccepting}
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <span className="text-sm font-semibold text-foreground">
            {t("offer.producer.title")}
          </span>
          {offers.length > 0 && (
            <span className="ms-2 text-xs text-muted-foreground">
              ({offers.length})
            </span>
          )}
        </div>
        {isLoading ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : offers.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground text-center">
            {t("offer.producer.empty")}
          </p>
        ) : (
          <div className="px-5 divide-y divide-border">
            {(offers as ListingOffer[]).map((offer) => (
              <ProducerOfferRow
                key={offer.id}
                offer={offer}
                listingQuantity={listingQuantity}
                listingIsOpen={listingIsOpen}
                highestPendingPrice={highestPendingPrice}
                pricingModel={pricingModel}
                unit={unit}
                onAccept={(o) => setAcceptTarget(o)}
                onReject={(o) => setRejectTarget(o)}
                isAccepting={isAccepting && acceptTarget?.id === offer.id}
                isRejecting={isRejecting && rejectTarget?.id === offer.id}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function ListingDetailPage() {
  const { getToken } = useAuth();
  const { t, lang } = useT();
  const params = useParams<{ waste_listing_id: string }>();
  const wasteListingId = params.waste_listing_id ?? "";
  const [, navigate] = useLocation();
  const search = useSearch();
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [pendingOffersDialogOpen, setPendingOffersDialogOpen] = useState(false);
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [isForceClosing, setIsForceClosing] = useState(false);
  const [pendingOfferCount, setPendingOfferCount] = useState(0);
  const [refCopied, setRefCopied] = useState(false);
  const [dealOverride, setDealOverride] = useState<DealInfo | null>(null);

  const isValidId = UUID_RE.test(wasteListingId);

  const { data: me } = useGetMe();
  const {
    data: listing,
    isLoading,
    isError,
    queryKey,
  } = useGetWasteListing(wasteListingId);

  const myCompanyId = me?.company?.id;
  const isOwner = !!myCompanyId && listing?.company_id === myCompanyId;
  // Role is derived from ownership, not company.type.
  // "producer" = listing owner (seller side), "buyer" = any other authenticated company.
  const role: "producer" | "buyer" | null = listing
    ? isOwner
      ? "producer"
      : "buyer"
    : null;

  // Derive active deal — prefer locally-updated override (post-action), fall back to server data
  const rawDeal = (listing as unknown as { deal?: DealInfo | null })?.deal ?? null;
  const activeDeal: DealInfo | null = dealOverride ?? rawDeal;
  const isOpen = listing?.status === "open";

  // ── Rules Engine — centralised eligibility decision ───────────────────────
  const eligibleCompanyType = (listing as unknown as { eligible_company_type?: string })?.eligible_company_type ?? "ALL";
  const eligibilityListing = listing
    ? {
        status: listing.status,
        company_id: listing.company_id,
        eligible_company_type: eligibleCompanyType,
        targeting_type: (listing as unknown as { targeting_type?: string }).targeting_type,
        target_company_id: (listing as unknown as { target_company_id?: string }).target_company_id,
      }
    : null;
  const eligibilityCompany = me?.company
    ? {
        id: me.company.id,
        license_status: (me.company as unknown as { license_status?: string }).license_status,
        license_number: (me.company as unknown as { license_number?: string }).license_number,
        license_validity: (me.company as unknown as { license_validity?: string }).license_validity,
        accepted_terms_at: (me.company as unknown as { accepted_terms_at?: string }).accepted_terms_at,
        offer_submission_blocked: (me.company as unknown as { offer_submission_blocked?: boolean }).offer_submission_blocked,
      }
    : null;
  const eligibilityDecision = useEligibility(eligibilityListing, eligibilityCompany);

  const fromParam = new URLSearchParams(search).get("from");
  const backPath =
    fromParam === "reports"
      ? "/reports"
      : fromParam === "participations"
        ? "/participations"
        : isOwner
          ? "/listings/mine"
          : "/marketplace";

  const dateStr = listing
    ? new Date(listing.created_at).toLocaleDateString(
        lang === "ar" ? "ar-SA-u-nu-latn" : "en-US",
        { year: "numeric", month: "long", day: "numeric" },
      )
    : "";

  function invalidateListing() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: getListMyListingsQueryKey() });
  }

  async function callCloseListing(listingId: string, forceClose = false) {
    const token = await getToken();
    const res = await fetch(`/api/listings/${listingId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ forceClose }),
    });
    if (res.ok) return { ok: true as const };
    const body = await res.json().catch(() => ({}));
    if (res.status === 401) {
      return { ok: false as const, isUnauthorized: true };
    }
    if (res.status === 409 && body.requiresConfirmation) {
      return { ok: false as const, requiresConfirmation: true, pendingOffersCount: body.pendingOffersCount as number };
    }
    return { ok: false as const, requiresConfirmation: false };
  }

  async function handleConfirmClose() {
    setCloseError(null);
    setIsClosing(true);
    try {
      const result = await callCloseListing(wasteListingId);
      if (result.ok) {
        setConfirmOpen(false);
        invalidateListing();
        navigate("/listings/mine");
      } else if (result.requiresConfirmation) {
        setConfirmOpen(false);
        setPendingOffersCount(result.pendingOffersCount ?? 0);
        setPendingOffersDialogOpen(true);
      } else if (result.isUnauthorized) {
        setConfirmOpen(false);
        setCloseError(lang === "ar" ? "انتهت الجلسة أو لا تملك صلاحية تنفيذ هذا الإجراء. يرجى تسجيل الدخول مرة أخرى." : "Your session expired or you are not authorized to perform this action. Please sign in again.");
      } else {
        setConfirmOpen(false);
        setCloseError(t("myListings.closeError"));
      }
    } finally {
      setIsClosing(false);
    }
  }

  async function handleForceClose() {
    setIsForceClosing(true);
    try {
      const result = await callCloseListing(wasteListingId, true);
      if (result.ok) {
        setPendingOffersDialogOpen(false);
        invalidateListing();
        navigate("/listings/mine");
      } else if (result.isUnauthorized) {
        setPendingOffersDialogOpen(false);
        setCloseError(lang === "ar" ? "انتهت الجلسة أو لا تملك صلاحية تنفيذ هذا الإجراء. يرجى تسجيل الدخول مرة أخرى." : "Your session expired or you are not authorized to perform this action. Please sign in again.");
      } else {
        setPendingOffersDialogOpen(false);
        setCloseError(t("myListings.closeError"));
      }
    } finally {
      setIsForceClosing(false);
    }
  }

  const backButton = (
    <Link to={backPath}>
      <Button variant="ghost" size="sm" className="gap-1 px-2">
        {lang === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        {t("action.back")}
      </Button>
    </Link>
  );

  const { data: allCategoriesRaw = [] } = useGetMaterialCategories();

  if (!isValidId) {
    return (
      <AppLayout showSignOut title={t("listing.invalidId.title")} actions={backButton}>
        <EmptyState icon={Recycle} title={t("listing.invalidId.title")} description={t("listing.invalidId.desc")} />
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout showSignOut title={t("listing.detail.title")} actions={backButton}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError || !listing) {
    return (
      <AppLayout showSignOut title={t("listing.notFound.title")} actions={backButton}>
        <EmptyState icon={Recycle} title={t("listing.notFound.title")} description={t("listing.notFound.desc")} />
      </AppLayout>
    );
  }

  const ref = listingRef(listing.id);
  const materialLabel = t(`material.${listing.material}`);
  const quantity = Number(listing.quantity);
  const categoryNameAr = (listing as typeof listing & { material_category_name_ar?: string | null }).material_category_name_ar;
  const categoryNameEn = (listing as typeof listing & { material_category_name_en?: string | null }).material_category_name_en;
  const categoryLabel = lang === "ar" ? (categoryNameAr ?? categoryNameEn) : (categoryNameEn ?? categoryNameAr);
  const allCats = allCategoriesRaw as Array<{ id: string; name_ar: string; name_en: string }>;
  const subcategoryId = (listing as typeof listing & { material_subcategory_id?: string | null }).material_subcategory_id;
  const subcategoryLabel = subcategoryId
    ? (allCats.find((c) => c.id === subcategoryId)?.[lang === "ar" ? "name_ar" : "name_en"] ?? null)
    : null;

  const unitLabel = listing.unit ? t(`unit.${listing.unit}`) : "";
  const displayTitle = `${subcategoryLabel ?? categoryLabel ?? materialLabel}${quantity > 0 ? ` — ${fmtNumber(quantity)} ${unitLabel}` : ""}`;

  const listingLocationAddress = (listing as typeof listing & { material_location_address?: string | null }).material_location_address ?? null;
  const listingMapsUrl = (listing as typeof listing & { google_maps_url?: string | null }).google_maps_url ?? null;
  const listingLocationNotes = (listing as typeof listing & { material_location_notes?: string | null }).material_location_notes ?? null;

  // F1: Build close dialog description with pending count
  const closeDialogDesc = isOwner && pendingOfferCount > 0
    ? `${t("listing.close.confirm.pendingOffers").replace("{count}", String(pendingOfferCount))} ${t("listing.close.confirm.desc")}`
    : pendingOfferCount === 0 && isOwner
      ? `${t("listing.close.confirm.noPending")} ${t("listing.close.confirm.desc")}`
      : t("listing.close.confirm.desc");

  const imageUrl = (listing as typeof listing & { image_url?: string }).image_url;
  const targeting = (listing as typeof listing & { targeting_type?: string }).targeting_type;
  const saleType = (listing as typeof listing & { sale_type?: string }).sale_type ?? "auction";

  const subtitleNode = (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
      {(subcategoryLabel ? categoryLabel : null) && (
        <span className="text-xs text-muted-foreground/70">{subcategoryLabel ? categoryLabel : null}</span>
      )}
      {(subcategoryLabel ? categoryLabel : null) && listing.city && (
        <span className="text-xs text-muted-foreground/40">·</span>
      )}
      {listing.city && (
        <span className="text-xs text-muted-foreground/70">{listing.city}</span>
      )}
      {(subcategoryLabel || listing.city) && (
        <span className="text-xs text-muted-foreground/40">·</span>
      )}
      <span className="text-xs text-muted-foreground" dir="ltr">{ref}</span>
      <button
        type="button"
        onClick={() => { void navigator.clipboard.writeText(ref); setRefCopied(true); setTimeout(() => setRefCopied(false), 2000); }}
        className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        title={t("action.copy")}
      >
        {refCopied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );

  const isDealMode = !!(activeDeal && (role === "producer" || role === "buyer"));

  const listingInfoPanel = (
    <div className="space-y-3">
      {imageUrl && !imageError ? (
        <div className="w-full h-[180px] overflow-hidden rounded-xl border border-border">
          <img src={imageUrl} alt={materialLabel} className="h-full w-full object-cover" onError={() => setImageError(true)} />
        </div>
      ) : (
        <div className="w-full h-[120px] rounded-xl border border-border bg-muted/30 flex items-center justify-center">
          <Recycle className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}
      {listing.description && (
        <p className="text-sm text-foreground/80 leading-relaxed">{listing.description}</p>
      )}
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {categoryLabel && (
          <CompactRow icon={<Recycle className="h-3.5 w-3.5 text-secondary/70" />} label={t("listing.category")} value={categoryLabel} />
        )}
        <CompactRow
          icon={<Package className="h-3.5 w-3.5" />}
          label={t("listing.quantity")}
          value={`${listing.quantity} ${listing.unit ? t(`unit.${listing.unit}`) : ""}`}
        />
        <CompactRow icon={<MapPin className="h-3.5 w-3.5" />} label={t("listing.city")} value={listing.city} />
        {listing.price_hint != null && (
          <CompactRow icon={<Tag className="h-3.5 w-3.5" />} label={t("listing.priceHint")} value={`${listing.price_hint} ${t("listing.sar")}`} />
        )}
        <CompactRow
          icon={saleType === "auction" ? <Gavel className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
          label={t("listing.form.saleType")}
          value={t(`listing.sale_type.${saleType}`)}
        />
        {listing.pricing_model && listing.pricing_model !== "fixed" && (
          <CompactRow icon={<Scale className="h-3.5 w-3.5" />} label={t("listing.form.pricingModel")} value={t(`listing.pricing_model.${listing.pricing_model}`)} />
        )}
        {listing.pricing_model === "revenue_share" && listing.revenue_share_pct != null && (
          <CompactRow icon={<Percent className="h-3.5 w-3.5" />} label={t("listing.form.revenue_share_pct")} value={`${listing.revenue_share_pct}%`} />
        )}
        <CompactRow icon={<Building2 className="h-3.5 w-3.5" />} label={t("listing.detail.publishedBy")} value={listing.company_name} />
        <CompactRow icon={<Calendar className="h-3.5 w-3.5" />} label={t("listing.publishedOn")} value={dateStr} />
        {(listing as typeof listing & { transport_responsibility?: string }).transport_responsibility && (
          <CompactRow
            icon={<Truck className="h-3.5 w-3.5" />}
            label={t("listing.transport_responsibility.label")}
            value={t(`listing.transport_responsibility.${(listing as typeof listing & { transport_responsibility?: string }).transport_responsibility}`)}
          />
        )}
        {listingLocationAddress && (
          <CompactRow
            icon={<MapPin className="h-3.5 w-3.5 text-primary/60" />}
            label={t("listing.location.address")}
            value={
              <LocationLink
                address={listingLocationAddress}
                city={listing.city}
                mapsUrl={listingMapsUrl}
                stopPropagation
              />
            }
          />
        )}
        {listingLocationNotes && (
          <CompactRow
            icon={<MapPin className="h-3.5 w-3.5 text-muted-foreground/40" />}
            label={t("listing.location.site_details")}
            value={listingLocationNotes}
          />
        )}
        {!listingLocationAddress && listingMapsUrl && listingMapsUrl.startsWith("https://") && (
          <div className="flex items-center gap-2 px-3 py-2.5 text-xs">
            <MapPin className="h-3.5 w-3.5 text-primary/60 shrink-0" />
            <a
              href={listingMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              ↗ {t("listing.location.open_maps")}
            </a>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AppLayout showSignOut title={displayTitle} subtitle={subtitleNode} actions={backButton} width="wide">
      {/* Dialogs */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("listing.close.confirm.title")}
        description={closeDialogDesc}
        confirmLabel={t("listing.close.confirm.action")}
        onConfirm={() => void handleConfirmClose()}
        isPending={isClosing}
        destructive
      />
      <AlertDialog
        open={pendingOffersDialogOpen}
        onOpenChange={(open) => { if (!open && !isForceClosing) setPendingOffersDialogOpen(false); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("listing.close.pendingOffers.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("listing.close.pendingOffers.desc").replace("{count}", String(pendingOffersCount))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" disabled={isForceClosing} onClick={() => setPendingOffersDialogOpen(false)} className="w-full sm:w-auto">
              {t("listing.close.pendingOffers.review")}
            </Button>
            <Button variant="destructive" disabled={isForceClosing} onClick={() => void handleForceClose()} className="w-full sm:w-auto">
              {isForceClosing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("listing.close.pendingOffers.forceClose")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {closeError && (
        <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {closeError}
        </div>
      )}

      {/* ══ DEAL MODE: single-column execution dashboard ══ */}
      {isDealMode ? (
        <div className="pb-8">
          <DealPanel
            deal={activeDeal}
            role={role as "producer" | "buyer"}
            unit={listing?.unit ?? ""}
            onUpdate={(updated) => setDealOverride(updated)}
            pricingModel={(listing as typeof listing & { pricing_model?: string }).pricing_model}
            revenueSharePct={(listing as typeof listing & { revenue_share_pct?: number | null }).revenue_share_pct}
            listingRef={ref}
            listingMaterial={materialLabel}
            listingCategory={categoryLabel ?? undefined}
            listingQuantity={quantity}
            myCompanyName={me?.company?.name}
            myPhone={(me as { company?: { contactPhone?: string } } | undefined)?.company?.contactPhone}
            listingCity={(listing as typeof listing & { city?: string }).city}
            listingSaleType={(listing as typeof listing & { sale_type?: string }).sale_type}
            counterpartyCity={activeDeal.counterparty?.city}
            listingDescription={(listing as typeof listing & { description?: string }).description}
            listingCategoryId={listing.material_category_id ?? undefined}
            listingSubcategoryId={(listing as typeof listing & { material_subcategory_id?: string }).material_subcategory_id ?? undefined}
            listingLocationAddress={listingLocationAddress}
            listingMapsUrl={listingMapsUrl}
            listingLocationNotes={listingLocationNotes}
            offersPanel={role === "producer" && isOwner ? (
              <ProducerOffersPanel
                wasteListingId={wasteListingId}
                listingQuantity={quantity}
                listingIsOpen={!!isOpen}
                pricingModel={listing.pricing_model}
                unit={listing.unit ?? undefined}
                onAfterAction={invalidateListing}
                onPendingCountChange={setPendingOfferCount}
              />
            ) : undefined}
            listingInfoPanel={listingInfoPanel}
          />
        </div>
      ) : (
      <div className="grid grid-cols-[1.3fr_1.2fr_2.5fr] gap-4 h-[calc(100dvh-8rem)] min-h-0">

        {/* ── LEFT: image + title + description + what's next ── */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Image */}
          {imageUrl && !imageError ? (
            <div className="w-full h-[240px] overflow-hidden rounded-xl border border-border shrink-0">
              <img src={imageUrl} alt={materialLabel} className="h-full w-full object-cover" onError={() => setImageError(true)} />
            </div>
          ) : (
            <div className="w-full h-[240px] rounded-xl border border-border bg-muted/30 flex items-center justify-center shrink-0">
              <Recycle className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div className="rounded-xl border border-border bg-card p-4 shrink-0">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("listing.detail.description")}</p>
              <p className="text-sm text-foreground leading-relaxed line-clamp-4">{listing.description}</p>
            </div>
          )}

          {/* What's next — producer only, open listing, no deal */}
          {role === "producer" && isOpen && !activeDeal && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shrink-0">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-sm">🗺️</span>
                <h3 className="text-xs font-semibold text-primary">{t("listing.what_next.title")}</h3>
              </div>
              <ol className="space-y-1.5 text-xs text-foreground/80 list-none">
                {(["step1","step2","step3","step4"] as const).map((step, i) => (
                  <li key={step} className="flex items-start gap-2">
                    <span className="shrink-0 h-4 w-4 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center mt-px">{i + 1}</span>
                    <span className="leading-snug">{t(`listing.what_next.${step}`)}</span>
                  </li>
                ))}
              </ol>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-2 mt-2 border-t border-primary/20">
                <span>⏱️</span>{t("listing.what_next.eta")}
              </p>
            </div>
          )}
        </div>

        {/* ── MIDDLE: quick stats + details ── */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Status + price hero */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{t("listing.detail.status")}</span>
              <Badge variant={isOpen ? "secondary" : "outline"} className="text-xs">
                {t(`status.${listing.status}`)}
              </Badge>
            </div>
            {/* Offer summary — hero price */}
            <OfferPriceHero
              wasteListingId={wasteListingId}
              listingQuantity={quantity}
              unit={listing.unit ?? undefined}
              pricingModel={listing.pricing_model}
              t={t}
            />
          </div>

          {/* Targeting & eligibility banners */}
          {targeting && targeting !== "open" && (
            <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs shrink-0 ${
              isOwner
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : targeting === "specific_company"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-primary/20 bg-primary/5 text-primary"
            }`}>
              {isOwner ? <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" /> : <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
              <span>
                {isOwner
                  ? targeting === "specific_company" ? t("listing.targeting.banner.seller") : t("listing.targeting.banner.seller.category")
                  : targeting === "specific_company" ? t("listing.targeting.banner.buyer.private") : t("listing.targeting.banner.buyer.category")}
              </span>
            </div>
          )}
          {eligibleCompanyType === "LICENSED_ONLY" && (
            <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-700 shrink-0">
              <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
              <span>{t("listing.eligible.badge")}</span>
            </div>
          )}

          {/* Detail rows — compact */}
          <div className="rounded-xl border border-border bg-card divide-y divide-border shrink-0">
            {categoryLabel && (
              <CompactRow icon={<Recycle className="h-3.5 w-3.5 text-secondary/70" />} label={t("listing.category")} value={categoryLabel} />
            )}
            <CompactRow
              icon={<Package className="h-3.5 w-3.5" />}
              label={t("listing.quantity")}
              value={`${listing.quantity} ${listing.unit ? t(`unit.${listing.unit}`) : ""}`}
            />
            <CompactRow icon={<MapPin className="h-3.5 w-3.5" />} label={t("listing.city")} value={listing.city} />
            {listing.price_hint != null && (
              <CompactRow icon={<Tag className="h-3.5 w-3.5" />} label={t("listing.priceHint")} value={`${listing.price_hint} ${t("listing.sar")}`} />
            )}
            <CompactRow
              icon={saleType === "auction" ? <Gavel className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
              label={t("listing.form.saleType")}
              value={t(`listing.sale_type.${saleType}`)}
            />
            {targeting && targeting !== "open" && (
              <CompactRow icon={<Lock className="h-3.5 w-3.5 text-amber-500" />} label={t("listing.targeting.label")} value={t(`listing.targeting.${targeting}`)} />
            )}
            {listing.pricing_model && listing.pricing_model !== "fixed" && (
              <CompactRow icon={<Scale className="h-3.5 w-3.5" />} label={t("listing.form.pricingModel")} value={t(`listing.pricing_model.${listing.pricing_model}`)} />
            )}
            {listing.pricing_model === "revenue_share" && listing.revenue_share_pct != null && (
              <CompactRow icon={<Percent className="h-3.5 w-3.5" />} label={t("listing.form.revenue_share_pct")} value={`${listing.revenue_share_pct}%`} />
            )}
            <CompactRow icon={<Building2 className="h-3.5 w-3.5" />} label={t("listing.detail.publishedBy")} value={listing.company_name} />
            <CompactRow icon={<Calendar className="h-3.5 w-3.5" />} label={t("listing.publishedOn")} value={dateStr} />
            {listingLocationAddress && (
              <CompactRow
                icon={<MapPin className="h-3.5 w-3.5 text-primary/60" />}
                label={t("listing.location.address")}
                value={
                  <LocationLink
                    address={listingLocationAddress}
                    city={listing.city}
                    mapsUrl={listingMapsUrl}
                    stopPropagation
                  />
                }
              />
            )}
            {listingLocationNotes && (
              <CompactRow
                icon={<MapPin className="h-3.5 w-3.5 text-muted-foreground/40" />}
                label={t("listing.location.site_details")}
                value={listingLocationNotes}
              />
            )}
            {!listingLocationAddress && listingMapsUrl && listingMapsUrl.startsWith("https://") && (
              <div className="flex items-center gap-2 px-3 py-2.5 text-xs">
                <MapPin className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                <a
                  href={listingMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  ↗ {t("listing.location.open_maps")}
                </a>
              </div>
            )}
          </div>

          {/* Producer: close button */}
          {role === "producer" && isOwner && isOpen && (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => setConfirmOpen(true)}
              disabled={isClosing}
            >
              {isClosing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("myListings.close")}
            </Button>
          )}
        </div>

        {/* ── RIGHT: offers panel ── */}
        <div className="min-h-0 overflow-y-auto">
          {/* Deal panel */}
          {activeDeal && (role === "producer" || role === "buyer") && (
            <div className="mb-3">
              <DealPanel
                deal={activeDeal}
                role={role as "producer" | "buyer"}
                unit={listing?.unit ?? ""}
                onUpdate={(updated) => setDealOverride(updated)}
                pricingModel={(listing as typeof listing & { pricing_model?: string }).pricing_model}
                revenueSharePct={(listing as typeof listing & { revenue_share_pct?: number | null }).revenue_share_pct}
                listingRef={ref}
                listingMaterial={materialLabel}
                listingCategory={categoryLabel ?? undefined}
                listingQuantity={quantity}
                myCompanyName={me?.company?.name}
                myPhone={(me as { company?: { contactPhone?: string } } | undefined)?.company?.contactPhone}
                listingCity={(listing as typeof listing & { city?: string }).city}
                counterpartyCity={activeDeal.counterparty?.city}
                listingDescription={(listing as typeof listing & { description?: string }).description}
                listingCategoryId={listing.material_category_id ?? undefined}
                listingSubcategoryId={(listing as typeof listing & { material_subcategory_id?: string }).material_subcategory_id ?? undefined}
                listingLocationAddress={listingLocationAddress}
                listingMapsUrl={listingMapsUrl}
              />
            </div>
          )}

          {/* Producer incoming offers */}
          {role === "producer" && isOwner && (
            <ProducerOffersPanel
              wasteListingId={wasteListingId}
              listingQuantity={quantity}
              listingIsOpen={!!isOpen}
              pricingModel={listing.pricing_model}
              unit={listing.unit ?? undefined}
              onAfterAction={invalidateListing}
              onPendingCountChange={setPendingOfferCount}
            />
          )}

          {/* Buyer: submit / improve / status */}
          {role === "buyer" && (
            <div>
              {!eligibilityDecision.allowed ? (
                <EligibilityBlock decision={eligibilityDecision} />
              ) : (
                <BuyerOfferSection
                  wasteListingId={wasteListingId}
                  listingQuantity={quantity}
                  isOpen={!!isOpen}
                  pricingModel={listing.pricing_model}
                  unit={listing.unit ?? undefined}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: getGetListingOffersQueryKey(wasteListingId) });
                    queryClient.invalidateQueries({ queryKey: getGetOffersSummaryQueryKey(wasteListingId) });
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </AppLayout>
  );
}
