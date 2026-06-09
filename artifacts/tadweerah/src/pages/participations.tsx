import { useState } from "react";
import { Link } from "wouter";
import {
  useListMyOffers,
  useWithdrawOffer,
  getListMyOffersQueryKey,
  type MyOffer,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/app-layout";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useT } from "@/i18n";
import { fmtNumber } from "@/lib/format";
import { LocationLink } from "@/components/location-link";

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
  const queryClient = useQueryClient();
  const isRejected = offer.status === "rejected";
  const isAccepted = offer.status === "accepted";
  const isPending = offer.status === "pending";
  const dealStatus = (offer as unknown as { deal_status?: DealStatus }).deal_status;

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const { mutate: withdraw, isPending: isWithdrawing } = useWithdrawOffer({
    mutation: {
      onSuccess: () => {
        setWithdrawOpen(false);
        queryClient.invalidateQueries({ queryKey: getListMyOffersQueryKey() });
      },
    },
  });

  const closedDateStr = offer.listing_closed_at
    ? new Date(offer.listing_closed_at).toLocaleDateString(
        lang === "ar" ? "ar-SA-u-nu-latn" : "en-US",
        { year: "numeric", month: "short", day: "numeric" },
      )
    : null;

  const rejectionReason = translateRejectionReason(offer.rejection_reason, t);
  const estimatedTotal = offer.offer_subtotal_amount ?? (offer.price_per_unit * offer.listing_quantity);
  const isCompleted = isAccepted && dealStatus === "completed";

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-shadow hover:shadow-sm ${
        isCompleted
          ? "border-green-400 bg-green-50/60 dark:border-green-600 dark:bg-green-950/40"
          : isAccepted
            ? "border-green-200 bg-card dark:border-green-800"
            : isRejected
              ? "border-destructive/20 bg-card"
              : "border-border bg-card"
      }`}
    >
      {/* Top: material + status badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground truncate">
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
        <Badge
          variant={isAccepted ? "default" : isRejected ? "outline" : "secondary"}
          className="shrink-0"
        >
          {isAccepted && <CheckCircle2 className="me-1 h-3 w-3" />}
          {isRejected && <XCircle className="me-1 h-3 w-3" />}
          {isPending && <Clock className="me-1 h-3 w-3" />}
          {t(`offer.status.${offer.status}`)}
        </Badge>
      </div>

      {/* Listing meta — compact */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          {fmtNumber(offer.listing_quantity)} {t(`unit.${offer.listing_unit}`)}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {offer.listing_city}
          {(offer as typeof offer & { listing_google_maps_url?: string | null }).listing_google_maps_url?.startsWith("https://") && (
            <a
              href={(offer as typeof offer & { listing_google_maps_url?: string | null }).listing_google_maps_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="ms-0.5 text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              ↗
            </a>
          )}
        </span>
        {(offer as typeof offer & { listing_material_location_address?: string | null }).listing_material_location_address && (
          <span className="flex items-center gap-1 italic opacity-80">
            <LocationLink
              address={(offer as typeof offer & { listing_material_location_address?: string | null }).listing_material_location_address}
              city={offer.listing_city}
              mapsUrl={(offer as typeof offer & { listing_google_maps_url?: string | null }).listing_google_maps_url}
              stopPropagation
            />
          </span>
        )}
        {(offer as typeof offer & { listing_material_location_notes?: string | null }).listing_material_location_notes && (
          <span className="flex items-center gap-1 italic opacity-60">
            {(offer as typeof offer & { listing_material_location_notes?: string | null }).listing_material_location_notes}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          {offer.listing_company_name}
        </span>
      </div>

      {/* Accepted: winner banner */}
      {isAccepted && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-950 space-y-1">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-semibold">{t("participations.winner.label")}</span>
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

      {/* Price */}
      <div className="space-y-0.5">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-foreground">
            {fmtNumber(offer.price_per_unit)}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("listing.sar")} / {t("unit." + offer.listing_unit)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {t("offer.mine.total")}:{" "}
          <span className="font-semibold text-foreground">
            {fmtNumber(estimatedTotal)} {t("listing.sar")}
          </span>
          {" "}
          <span className="text-muted-foreground/60">{t("offer.quantityDisclaimer")}</span>
        </div>
      </div>

      {/* Rank */}
      {isPending && offer.rank != null && offer.total_offers != null && offer.total_offers > 1 && (
        <div className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
          offer.rank === 1
            ? "bg-amber-50 text-amber-700 border border-amber-200"
            : "bg-muted text-muted-foreground border border-border"
        }`}>
          <Medal className="h-3 w-3" />
          {offer.rank === 1 ? (
            <span>{t("offer.rank.top")}</span>
          ) : (
            <span>{t("offer.rank.label")}: {offer.rank} {t("offer.rank.of")} {offer.total_offers}</span>
          )}
        </div>
      )}

      {/* Rejected reason */}
      {isRejected && rejectionReason && (
        <div className="text-xs text-muted-foreground border-t border-border pt-2">
          <span className="font-medium">{t("participations.rejected.reason")}</span>{" "}
          {rejectionReason}
        </div>
      )}

      {isRejected && offer.listing_status === "closed" && offer.listing_accepted_total != null && (
        <div className="rounded-lg bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
          {t("participations.listing.acceptedTotal")}:{" "}
          <span className="font-semibold text-foreground">
            {fmtNumber(offer.listing_accepted_total)} {t("listing.sar")}
          </span>
        </div>
      )}

      {closedDateStr && (
        <div className="text-xs text-muted-foreground">
          {t("participations.listing.closedAt")}: {closedDateStr}
        </div>
      )}

      {/* Withdraw */}
      {isPending && offer.listing_status === "open" && (
        <>
          <ConfirmDialog
            open={withdrawOpen}
            onOpenChange={setWithdrawOpen}
            title={t("offer.withdraw.confirm.title")}
            description={t("offer.withdraw.confirm.desc")}
            confirmLabel={t("offer.withdraw.confirm.action")}
            destructive
            isPending={isWithdrawing}
            onConfirm={() => withdraw({ wasteListingId: offer.waste_listing_id })}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/10"
            disabled={isWithdrawing}
            onClick={() => setWithdrawOpen(true)}
          >
            {isWithdrawing ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1" /> : null}
            {t("offer.withdraw.button")}
          </Button>
        </>
      )}

      <Link to={`/listings/${offer.waste_listing_id}?from=participations`}>
        <Button variant="outline" size="sm" className="w-full">
          {t("listing.viewDetail")}
        </Button>
      </Link>
    </div>
  );
}

type AugOffer = MyOffer & { deal_status?: string };

function StatPill({ value, label, urgent = false, onClick }: {
  value: number;
  label: string;
  urgent?: boolean;
  onClick?: () => void;
}) {
  const active = urgent && value > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-lg border px-3 py-2 text-start space-y-0.5 transition-shadow hover:shadow-sm w-full disabled:cursor-default ${
        active
          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50"
          : "border-border bg-card"
      }`}
    >
      <div className={`text-xl font-bold leading-none ${active ? "text-amber-700 dark:text-amber-300" : "text-foreground"}`}>
        {value}
      </div>
      <div className={`text-[10px] flex items-center gap-1 ${active ? "text-amber-700 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>
        {active && <AlertCircle className="h-2.5 w-2.5 shrink-0" />}
        {label}
      </div>
    </button>
  );
}

export function ParticipationsPage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("all");

  const { data: allData = [], isLoading, isError } = useListMyOffers();
  const offers = allData as AugOffer[];
  const data = tab === "all" ? offers : offers.filter((o) => o.status === tab);

  const statPending   = offers.filter(o => o.status === "pending").length;
  const statActive    = offers.filter(o => o.status === "accepted" && o.deal_status && ["active","payment_confirmed","dispatched"].includes(o.deal_status)).length;
  const statMyTurn    = offers.filter(o => o.status === "accepted" && o.deal_status === "dispatched").length;
  const statCompleted = offers.filter(o => o.status === "accepted" && o.deal_status === "completed").length;

  return (
    <AppLayout
      showSignOut
      title={t("participations.title")}
      subtitle={t("participations.subtitle")}
    >
      {/* Compact stats row */}
      {!isLoading && !isError && offers.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          <StatPill value={statPending}   label={t("stats.pending_offers")} />
          <StatPill value={statActive}    label={t("stats.active_deals")} />
          <StatPill value={statMyTurn}    label={t("stats.my_turn")} urgent onClick={() => setTab("accepted")} />
          <StatPill value={statCompleted} label={t("stats.completed")} />
        </div>
      )}

      {/* Status tabs */}
      <div className="mb-3 flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit flex-wrap">
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
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
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && isError && (
        <EmptyState icon={ShoppingBag} title={t("error.loading")} description={t("error.generic")} />
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
