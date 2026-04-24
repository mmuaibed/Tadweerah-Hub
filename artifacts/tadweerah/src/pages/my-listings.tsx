import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMyListings,
  useCloseWasteListing,
  getListMyListingsQueryKey,
  type WasteListing,
} from "@workspace/api-client-react";
import { Loader2, Plus, Recycle, TrendingUp, Handshake, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/app-layout";
import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useT } from "@/i18n";

type TabFilter = "open" | "closed";
type AugListing = WasteListing & { deal_status?: string };

function StatCard({ value, label, urgent = false, onClick }: {
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
      className={`rounded-xl border px-4 py-3 text-start space-y-1 transition-shadow hover:shadow-sm w-full disabled:cursor-default ${
        active
          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50"
          : "border-border bg-card"
      }`}
    >
      <div className={`text-2xl font-bold ${active ? "text-amber-700 dark:text-amber-300" : "text-foreground"}`}>
        {value}
      </div>
      <div className={`text-xs flex items-center gap-1 ${active ? "text-amber-700 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}>
        {active && <AlertCircle className="h-3 w-3 shrink-0" />}
        {label}
      </div>
    </button>
  );
}

export function MyListingsPage() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabFilter>("open");
  const { data, isLoading, isError } = useListMyListings({ status: tab });
  // Always fetch all listings for stats computation
  const { data: allListingsRaw = [] } = useListMyListings();
  const allListings = allListingsRaw as AugListing[];

  // Stats
  const statOpen      = allListings.filter(l => l.status === "open").length;
  const statActive    = allListings.filter(l => l.deal_status && ["active","payment_confirmed","dispatched"].includes(l.deal_status)).length;
  const statMyTurn    = allListings.filter(l => l.deal_status && ["active","payment_confirmed"].includes(l.deal_status)).length;
  const statCompleted = allListings.filter(l => l.deal_status === "completed").length;

  const { mutate: closeListing, isPending: isClosing } = useCloseWasteListing();

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmListing, setConfirmListing] = useState<WasteListing | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);

  function openCloseConfirm(listing: WasteListing) {
    setConfirmId(listing.id);
    setConfirmListing(listing);
    setCloseError(null);
  }

  function handleConfirmClose() {
    if (!confirmId) return;
    setCloseError(null);
    closeListing(
      { wasteListingId: confirmId },
      {
        onSuccess: () => {
          setConfirmId(null);
          setConfirmListing(null);
          queryClient.invalidateQueries({ queryKey: getListMyListingsQueryKey({ status: "open" }) });
          queryClient.invalidateQueries({ queryKey: getListMyListingsQueryKey({ status: "closed" }) });
        },
        onError: () => {
          setConfirmId(null);
          setConfirmListing(null);
          setCloseError(t("myListings.closeError"));
        },
      },
    );
  }

  // Build close dialog description with pending offer count
  const pendingCount = confirmListing?.offer_count ?? 0;
  const closeDesc =
    pendingCount > 0
      ? `${t("listing.close.confirm.pendingOffers").replace("{count}", String(pendingCount))} ${t("listing.close.confirm.desc")}`
      : `${t("listing.close.confirm.noPending")} ${t("listing.close.confirm.desc")}`;

  return (
    <AppLayout
      showSignOut
      title={t("myListings.title")}
      subtitle={t("myListings.subtitle")}
      actions={
        <Link to="/listings/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("myListings.add")}
          </Button>
        </Link>
      }
    >
      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={(open) => { if (!open) { setConfirmId(null); setConfirmListing(null); } }}
        title={t("listing.close.confirm.title")}
        description={closeDesc}
        confirmLabel={t("listing.close.confirm.action")}
        onConfirm={handleConfirmClose}
        isPending={isClosing}
        destructive
      />

      {closeError && (
        <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {closeError}
        </div>
      )}

      {/* Summary stats bar */}
      {!isLoading && !isError && allListings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard value={statOpen}      label={t("stats.open_listings")} />
          <StatCard value={statActive}    label={t("stats.active_deals")} />
          <StatCard value={statMyTurn}    label={t("stats.my_turn")} urgent onClick={() => setTab("closed")} />
          <StatCard value={statCompleted} label={t("stats.completed")} />
        </div>
      )}

      {/* F7: Active / Closed tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        {(["open", "closed"] as TabFilter[]).map((t_val) => (
          <button
            key={t_val}
            type="button"
            onClick={() => setTab(t_val)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t_val
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`myListings.tab.${t_val === "open" ? "active" : "closed"}`)}
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
          icon={Recycle}
          title={t("error.loading")}
          description={t("error.generic")}
        />
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState
          icon={Recycle}
          title={t("myListings.empty.title")}
          description={
            tab === "open"
              ? t("myListings.empty.desc")
              : t("myListings.empty.desc")
          }
          action={
            tab === "open" ? (
              <Link to="/listings/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("myListings.add")}
                </Button>
              </Link>
            ) : undefined
          }
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              showCompany={false}
              href={`/listings/${listing.id}`}
              footer={
                <div className="flex flex-col gap-2">
                  {/* Deal status badge — shows on closed listings with an active/completed deal */}
                  {(listing as unknown as { deal_status?: string }).deal_status && (
                    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg w-fit ${
                      (listing as unknown as { deal_status?: string }).deal_status === "completed"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                    }`}>
                      <Handshake className="h-3.5 w-3.5 shrink-0" />
                      {(listing as unknown as { deal_status?: string }).deal_status === "completed"
                        ? t("myListings.deal.completed")
                        : t("myListings.deal.active")}
                    </div>
                  )}

                  {/* F13: Offer count + highest price */}
                  {(listing.offer_count ?? 0) > 0 && (() => {
                    const highestPpu = (listing as WasteListing & { highest_offer_price?: number | null }).highest_offer_price;
                    const highestTotal = (listing as WasteListing & { highest_offer_total?: number | null }).highest_offer_total;
                    return (
                      <div className="rounded-lg border border-secondary/30 bg-secondary/5 px-3 py-2 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <TrendingUp className="h-3.5 w-3.5 text-secondary" />
                          <span>
                            <span className="font-semibold text-foreground">{listing.offer_count}</span>{" "}
                            {t("myListings.offersCount")}
                          </span>
                        </div>
                        {highestPpu != null && (
                          <div className="flex items-center justify-between text-xs ps-5">
                            <span className="text-muted-foreground">{t("myListings.highestOffer.label")}:</span>
                            <span className="font-semibold text-foreground">
                              {Number(highestPpu).toLocaleString()} {t("listing.sar")}
                              {listing.unit ? ` / ${t(`unit.${listing.unit}`)}` : ""}
                            </span>
                          </div>
                        )}
                        {highestTotal != null && (
                          <div className="flex items-center justify-between text-xs ps-5">
                            <span className="text-muted-foreground">{t("myListings.highestOffer.total")}:</span>
                            <span className="font-medium text-foreground">
                              {Number(highestTotal).toLocaleString()} {t("listing.sar")}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Close button */}
                  {listing.status === "open" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                      disabled={isClosing && confirmId === listing.id}
                      onClick={() => openCloseConfirm(listing)}
                    >
                      {t("myListings.close")}
                    </Button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
