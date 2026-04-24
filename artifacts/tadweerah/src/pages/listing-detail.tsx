import { useEffect, useRef, useState } from "react";
import { useParams, Link, useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetWasteListing,
  useCloseWasteListing,
  useGetMe,
  useGetListingOffers,
  useGetOffersSummary,
  useSubmitOffer,
  useImproveOffer,
  useAcceptOffer,
  useRejectOffer,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/app-layout";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DealPanel, type DealInfo } from "@/components/deal-panel";
import { useT } from "@/i18n";
import { listingRef } from "@/lib/listing-ref";

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
            {summary.highest_price.toLocaleString()}
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
              {offer.price_per_unit.toLocaleString()} {t("listing.sar")}
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
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  offer: ListingOffer | null;
  isLowerThanHighest: boolean;
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
            <DialogDescription className="space-y-1">
              <span className="block">
                {offer.buyer_company_name} —{" "}
                {offer.price_per_unit.toLocaleString()} {t("listing.sar")}
              </span>
              <span className="block text-xs">{t("offer.accept.confirm.desc")}</span>
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
  onSuccess,
}: {
  wasteListingId: string;
  listingQuantity: number;
  isOpen: boolean;
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
  const [formError, setFormError] = useState<string | null>(null);

  const myOffer = offers[0] as ListingOffer | undefined;
  const highestPrice = summary?.highest_price ?? 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const val = parseFloat(price);
    if (!val || val <= 0) return;

    submitOffer(
      { wasteListingId, data: { price_per_unit: val, message: message.trim() || undefined } },
      {
        onSuccess: () => { setPrice(""); setMessage(""); onSuccess(); },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          setFormError(
            msg?.includes("PriceTooLow") || msg?.includes("higher")
              ? t("offer.error.tooLow")
              : t("offer.error.generic"),
          );
        },
      },
    );
  }

  function handleImprove(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const val = parseFloat(newPrice);
    if (!val || val <= 0) return;

    improveOffer(
      { wasteListingId, data: { price_per_unit: val, message: newMessage.trim() || undefined } },
      {
        onSuccess: () => { setShowImproveForm(false); setNewPrice(""); setNewMessage(""); onSuccess(); },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          setFormError(
            msg?.includes("PriceTooLow") || msg?.includes("higher")
              ? t("offer.error.tooLow")
              : t("offer.error.generic"),
          );
        },
      },
    );
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
        <div className="text-sm text-muted-foreground">
          {myOffer.price_per_unit.toLocaleString()} {t("listing.sar")} /{" "}
          {t("offer.summary.perUnit").split("/")[1]}
        </div>
        <div className="text-xs text-muted-foreground">
          {t("offer.mine.total")}:{" "}
          <span className="font-medium text-foreground">
            {(myOffer.price_per_unit * listingQuantity).toLocaleString()} {t("listing.sar")}
          </span>
          {" "}
          <span className="text-muted-foreground/60">{t("offer.quantityDisclaimer")}</span>
        </div>
      </div>
    );
  }

  // Rejected offer — F2: show rejection reason + consistent price display
  if (myOffer?.status === "rejected") {
    const reasonText = translateRejectionReason(myOffer.rejection_reason, t);
    const rejectedTotal = myOffer.price_per_unit * listingQuantity;
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-2">
        <div className="flex items-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          <span className="font-semibold">{t("offer.mine.rejected")}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-foreground/70">
            {myOffer.price_per_unit.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("listing.sar")} / {t("offer.summary.perUnit").split("/")[1]}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {t("offer.mine.total")}:{" "}
          <span className="font-medium text-foreground/70">
            {rejectedTotal.toLocaleString()} {t("listing.sar")}
          </span>
          {" "}
          <span className="text-muted-foreground/60">{t("offer.quantityDisclaimer")}</span>
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
    const estimatedTotal = myOffer.price_per_unit * listingQuantity;
    const rank = (myOffer as unknown as { rank?: number }).rank;
    const totalOffers = (myOffer as unknown as { total_offers?: number }).total_offers;

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
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
          <div className="flex items-end gap-1">
            <span className="text-2xl font-bold text-foreground">
              {myOffer.price_per_unit.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground pb-0.5">
              {t("listing.sar")} / {t("offer.summary.perUnit").split("/")[1]}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {t("offer.mine.total")}:{" "}
            <span className="font-semibold text-foreground">
              {estimatedTotal.toLocaleString()} {t("listing.sar")}
            </span>
            {" "}
            <span className="text-muted-foreground/60">{t("offer.quantityDisclaimer")}</span>
          </div>
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
            {/* Top bidder self-bidding warning */}
            {rank === 1 && totalOffers != null && totalOffers > 1 && showImproveForm && (
              <div className="px-5 pt-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {t("offer.warning.already_top")}
                </div>
              </div>
            )}
            {showImproveForm && (
              <form onSubmit={handleImprove} className="px-5 pb-5 pt-2 space-y-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {t("offer.form.mustExceed")}:{" "}
                  <span className="font-semibold">
                    {highestPrice.toLocaleString()} {t("listing.sar")}
                  </span>
                </p>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("offer.form.newPrice")}
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={`> ${highestPrice.toLocaleString()}`}
                  />
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
                <Button type="submit" className="w-full" disabled={isImproving}>
                  {isImproving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {isImproving ? t("offer.form.improving") : t("offer.form.improve")}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
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
      {highestPrice > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("offer.form.mustExceed")}:{" "}
          <span className="font-semibold">
            {highestPrice.toLocaleString()} {t("listing.sar")}
          </span>
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("offer.form.price")}
          </label>
          <input
            type="number"
            min="0.001"
            step="0.001"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={highestPrice > 0 ? `> ${highestPrice.toLocaleString()}` : "0.000"}
          />
          {price && parseFloat(price) > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("offer.mine.total")}:{" "}
              <span className="font-semibold">
                {(parseFloat(price) * listingQuantity).toLocaleString()} {t("listing.sar")}
              </span>
              {" "}
              <span className="text-muted-foreground/60">{t("offer.quantityDisclaimer")}</span>
            </p>
          )}
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
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: {
  offer: ListingOffer;
  listingQuantity: number;
  listingIsOpen: boolean;
  highestPendingPrice: number;
  onAccept: (offer: ListingOffer) => void;
  onReject: (offer: ListingOffer) => void;
  isAccepting: boolean;
  isRejecting: boolean;
}) {
  const { t } = useT();
  const estimatedTotal = offer.price_per_unit * listingQuantity;

  return (
    <div className="py-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground truncate">
            {offer.buyer_company_name}
          </span>
        </div>
        <Badge variant={offerStatusVariant(offer.status)} className="shrink-0 text-xs">
          {t(`offer.status.${offer.status}`)}
        </Badge>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-foreground">
          {offer.price_per_unit.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("listing.sar")} / {t("offer.producer.pricePerUnit").split("/")[1].trim()}
        </span>
      </div>
      <div className="text-xs text-muted-foreground">
        {t("offer.producer.total")}:{" "}
        <span className="font-semibold text-foreground">
          {estimatedTotal.toLocaleString()} {t("listing.sar")}
        </span>
        {" "}
        <span className="text-muted-foreground/60">{t("offer.quantityDisclaimer")}</span>
      </div>

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
  onAfterAction,
  onPendingCountChange,
}: {
  wasteListingId: string;
  listingQuantity: number;
  listingIsOpen: boolean;
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
  const { t, lang } = useT();
  const params = useParams<{ waste_listing_id: string }>();
  const wasteListingId = params.waste_listing_id ?? "";
  const [, navigate] = useLocation();
  const search = useSearch();
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
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

  const { mutate: closeListing, isPending: isClosing } = useCloseWasteListing();

  const role = me?.company?.type;
  const myCompanyId = me?.company?.id;
  const isOwner = !!myCompanyId && listing?.company_id === myCompanyId;

  // Derive active deal — prefer locally-updated override (post-action), fall back to server data
  const rawDeal = (listing as unknown as { deal?: DealInfo | null })?.deal ?? null;
  const activeDeal: DealInfo | null = dealOverride ?? rawDeal;
  const isOpen = listing?.status === "open";

  const fromParam = new URLSearchParams(search).get("from");
  const backPath =
    fromParam === "participations"
      ? "/participations"
      : role === "producer"
        ? "/listings/mine"
        : role === "buyer"
          ? "/marketplace"
          : "/dashboard";

  const dateStr = listing
    ? new Date(listing.created_at).toLocaleDateString(
        lang === "ar" ? "ar-SA" : "en-US",
        { year: "numeric", month: "long", day: "numeric" },
      )
    : "";

  function invalidateListing() {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: getListMyListingsQueryKey() });
  }

  function handleConfirmClose() {
    setCloseError(null);
    closeListing(
      { wasteListingId },
      {
        onSuccess: (updated) => {
          setConfirmOpen(false);
          invalidateListing();
          if (updated.status === "closed") navigate("/listings/mine");
        },
        onError: () => {
          setConfirmOpen(false);
          setCloseError(t("myListings.closeError"));
        },
      },
    );
  }

  const backButton = (
    <Link to={backPath}>
      <Button variant="ghost" size="sm" className="gap-1 px-2">
        {lang === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
        {t("action.back")}
      </Button>
    </Link>
  );

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

  // F1: Build close dialog description with pending count
  const closeDialogDesc = isOwner && pendingOfferCount > 0
    ? `${t("listing.close.confirm.pendingOffers").replace("{count}", String(pendingOfferCount))} ${t("listing.close.confirm.desc")}`
    : pendingOfferCount === 0 && isOwner
      ? `${t("listing.close.confirm.noPending")} ${t("listing.close.confirm.desc")}`
      : t("listing.close.confirm.desc");

  return (
    <AppLayout showSignOut title={materialLabel} subtitle={ref} actions={backButton}>
      {/* F1: Close listing confirm with pending count */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("listing.close.confirm.title")}
        description={closeDialogDesc}
        confirmLabel={t("listing.close.confirm.action")}
        onConfirm={handleConfirmClose}
        isPending={isClosing}
        destructive
      />

      {closeError && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {closeError}
        </div>
      )}

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Listing image */}
        {(listing as typeof listing & { image_url?: string }).image_url && (
          <div className="w-full overflow-hidden rounded-xl border border-border">
            <img
              src={(listing as typeof listing & { image_url?: string }).image_url}
              alt={t(`material.${listing.material}`)}
              className="h-56 w-full object-cover"
            />
          </div>
        )}

        {/* Header card */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
              <Recycle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">{materialLabel}</h2>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{ref}</span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(ref);
                    setRefCopied(true);
                    setTimeout(() => setRefCopied(false), 2000);
                  }}
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  title={t("action.copy")}
                >
                  {refCopied
                    ? <Check className="h-3 w-3 text-green-500" />
                    : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
          </div>
          <Badge variant={isOpen ? "secondary" : "outline"} className="text-sm">
            {t(`status.${listing.status}`)}
          </Badge>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-border bg-card px-5 divide-y divide-border">
          <DetailRow
            icon={<Package className="h-4 w-4" />}
            label={t("listing.quantity")}
            value={`${listing.quantity} ${t(`unit.${listing.unit}`)}`}
          />
          <DetailRow icon={<MapPin className="h-4 w-4" />} label={t("listing.city")} value={listing.city} />
          {listing.price_hint != null && (
            <DetailRow
              icon={<Tag className="h-4 w-4" />}
              label={t("listing.priceHint")}
              value={`${listing.price_hint} ${t("listing.sar")}`}
            />
          )}
          {(() => {
            const saleType = (listing as typeof listing & { sale_type?: string }).sale_type ?? "auction";
            return (
              <DetailRow
                icon={saleType === "auction" ? <Gavel className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                label={t("listing.form.saleType")}
                value={t(`listing.sale_type.${saleType}`)}
              />
            );
          })()}
          {listing.pricing_model && listing.pricing_model !== "fixed" && (
            <DetailRow
              icon={<Scale className="h-4 w-4" />}
              label={t("listing.form.pricingModel")}
              value={t(`listing.pricing_model.${listing.pricing_model}`)}
            />
          )}
          {listing.pricing_model === "revenue_share" && listing.revenue_share_pct != null && (
            <DetailRow
              icon={<Percent className="h-4 w-4" />}
              label={t("listing.form.revenue_share_pct")}
              value={`${listing.revenue_share_pct}%`}
            />
          )}
          <DetailRow icon={<Building2 className="h-4 w-4" />} label={t("listing.detail.publishedBy")} value={listing.company_name} />
          <DetailRow icon={<Calendar className="h-4 w-4" />} label={t("listing.publishedOn")} value={dateStr} />
        </div>

        {/* Description */}
        {listing.description && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("listing.detail.description")}</p>
            <p className="text-sm text-foreground leading-relaxed">{listing.description}</p>
          </div>
        )}

        <Separator />

        {/* Offers summary bar */}
        {me?.company && <OfferSummaryBar wasteListingId={wasteListingId} />}

        {/* M5-Pre: Deal panel — shown to producer (owner) and accepted buyer after acceptance */}
        {activeDeal && (role === "producer" || role === "buyer") && (
          <DealPanel
            deal={activeDeal}
            role={role as "producer" | "buyer"}
            unit={listing?.unit ?? ""}
            onUpdate={(updated) => setDealOverride(updated)}
          />
        )}

        {/* Producer: close button + incoming offers */}
        {role === "producer" && isOwner && (
          <div className="space-y-4 pb-4">
            {isOpen && (
              <Button
                variant="outline"
                className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmOpen(true)}
                disabled={isClosing}
              >
                {isClosing && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("myListings.close")}
              </Button>
            )}
            <ProducerOffersPanel
              wasteListingId={wasteListingId}
              listingQuantity={quantity}
              listingIsOpen={!!isOpen}
              onAfterAction={invalidateListing}
              onPendingCountChange={setPendingOfferCount}
            />
          </div>
        )}

        {/* Buyer: submit / improve / status */}
        {role === "buyer" && (
          <div className="pb-4">
            <BuyerOfferSection
              wasteListingId={wasteListingId}
              listingQuantity={quantity}
              isOpen={!!isOpen}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: getGetListingOffersQueryKey(wasteListingId) });
                queryClient.invalidateQueries({ queryKey: getGetOffersSummaryQueryKey(wasteListingId) });
              }}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
