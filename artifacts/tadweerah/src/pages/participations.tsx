import { useState } from "react";
import { Link } from "wouter";
import {
  useListMyOffers,
  type MyOffer,
} from "@workspace/api-client-react";
import {
  Loader2,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  Medal,
  MapPin,
  Package,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/app-layout";
import { EmptyState } from "@/components/empty-state";
import { useT } from "@/i18n";

type Tab = "all" | "pending" | "accepted" | "rejected";

const TABS: Tab[] = ["all", "pending", "accepted", "rejected"];

function translateRejectionReason(code: string | undefined, t: (k: string) => string): string {
  if (!code) return "";
  const base = code.split(":")[0]?.trim() ?? code;
  const key = `offer.reject.reason.${base}`;
  const translated = t(key);
  if (translated === key) return code;
  const detail = code.includes(":") ? code.slice(code.indexOf(":") + 1).trim() : null;
  return detail ? `${translated}: ${detail}` : translated;
}

type DealStatus = "active" | "payment_confirmed" | "dispatched" | "completed";

function OfferCard({ offer }: { offer: MyOffer }) {
  const { t, lang } = useT();
  const isRejected = offer.status === "rejected";
  const isAccepted = offer.status === "accepted";
  const isPending = offer.status === "pending";
  const dealStatus = (offer as unknown as { deal_status?: DealStatus }).deal_status;

  const closedDateStr = offer.listing_closed_at
    ? new Date(offer.listing_closed_at).toLocaleDateString(
        lang === "ar" ? "ar-SA" : "en-US",
        { year: "numeric", month: "short", day: "numeric" },
      )
    : null;

  const rejectionReason = translateRejectionReason(offer.rejection_reason, t);
  const estimatedTotal = offer.price_per_unit * offer.listing_quantity;

  const isCompleted = isAccepted && dealStatus === "completed";

  return (
    <div
      className={`rounded-xl border p-5 space-y-4 transition-shadow hover:shadow-sm ${
        isCompleted
          ? "border-green-400 bg-green-50/60 dark:border-green-600 dark:bg-green-950/40"
          : isAccepted
            ? "border-green-200 bg-card dark:border-green-800"
            : isRejected
              ? "border-destructive/20 bg-card"
              : "border-border bg-card"
      }`}
    >
      {/* Top: material + listing status */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-foreground truncate">
              {t(`material.${offer.listing_material}`)}
            </span>
            <Badge
              variant={offer.listing_status === "open" ? "secondary" : "outline"}
              className="text-[10px] shrink-0"
            >
              {t(`status.${offer.listing_status}`)}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">{offer.listing_ref}</span>
        </div>
        {/* Offer status badge */}
        <Badge
          variant={
            isAccepted ? "default" : isRejected ? "outline" : "secondary"
          }
          className="shrink-0"
        >
          {isAccepted && <CheckCircle2 className="me-1 h-3 w-3" />}
          {isRejected && <XCircle className="me-1 h-3 w-3" />}
          {isPending && <Clock className="me-1 h-3 w-3" />}
          {t(`offer.status.${offer.status}`)}
        </Badge>
      </div>

      {/* Listing meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Package className="h-3.5 w-3.5" />
          {offer.listing_quantity.toLocaleString()} {t(`unit.${offer.listing_unit}`)}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {offer.listing_city}
        </span>
        <span className="flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" />
          {offer.listing_company_name}
        </span>
      </div>

      {/* Accepted: winner banner + deal stage */}
      {isAccepted && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800 dark:bg-green-950 space-y-1.5">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">{t("participations.winner.label")}</span>
          </div>
          {dealStatus && (
            <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              dealStatus === "completed"
                ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
            }`}>
              {dealStatus === "completed"
                ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                : <Clock className="h-3 w-3 shrink-0" />}
              {t(`participations.deal.${dealStatus}`)}
            </div>
          )}
        </div>
      )}

      {/* Offer price + estimated total */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-foreground">
            {offer.price_per_unit.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("listing.sar")} / {t("unit." + offer.listing_unit)}
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
      </div>

      {/* F6 rank — only for pending offers when total_offers > 1 */}
      {isPending && offer.rank != null && offer.total_offers != null && offer.total_offers > 1 && (
        <div
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
            offer.rank === 1
              ? "bg-amber-50 text-amber-700 border border-amber-200"
              : "bg-muted text-muted-foreground border border-border"
          }`}
        >
          <Medal className="h-3 w-3" />
          {offer.rank === 1 ? (
            <span>{t("offer.rank.top")}</span>
          ) : (
            <span>
              {t("offer.rank.label")}: {offer.rank} {t("offer.rank.of")} {offer.total_offers}
            </span>
          )}
        </div>
      )}

      {/* Rejected: show reason */}
      {isRejected && rejectionReason && (
        <div className="text-xs text-muted-foreground border-t border-border pt-2">
          <span className="font-medium">{t("participations.rejected.reason")}</span>{" "}
          {rejectionReason}
        </div>
      )}

      {/* Rejected on closed listing: show accepted total */}
      {isRejected && offer.listing_status === "closed" && offer.listing_accepted_total != null && (
        <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {t("participations.listing.acceptedTotal")}:{" "}
          <span className="font-semibold text-foreground">
            {offer.listing_accepted_total.toLocaleString()} {t("listing.sar")}
          </span>
        </div>
      )}

      {/* Closed date */}
      {closedDateStr && (
        <div className="text-xs text-muted-foreground">
          {t("participations.listing.closedAt")}: {closedDateStr}
        </div>
      )}

      {/* Action: view listing detail */}
      <Link to={`/listings/${offer.waste_listing_id}?from=participations`}>
        <Button variant="outline" size="sm" className="w-full mt-1">
          {t("listing.viewDetail")}
        </Button>
      </Link>
    </div>
  );
}

export function ParticipationsPage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("all");

  const { data, isLoading, isError } = useListMyOffers(
    tab !== "all" ? { status: tab } : undefined,
  );

  return (
    <AppLayout
      showSignOut
      title={t("participations.title")}
      subtitle={t("participations.subtitle")}
    >
      {/* Status tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit flex-wrap">
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === tabKey
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`participations.tab.${tabKey}`)}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && isError && (
        <EmptyState
          icon={ShoppingBag}
          title={t("error.loading")}
          description={t("error.generic")}
        />
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title={t("participations.empty.title")}
          description={t("participations.empty.desc")}
          action={
            <Link to="/marketplace">
              <Button>{t("participations.goToMarketplace")}</Button>
            </Link>
          }
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
