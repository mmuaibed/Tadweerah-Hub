import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMyListings,
  useCloseWasteListing,
  getListMyListingsQueryKey,
  type WasteListing,
} from "@workspace/api-client-react";
import { Loader2, Plus, Recycle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/app-layout";
import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useT } from "@/i18n";

type TabFilter = "open" | "closed";

export function MyListingsPage() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabFilter>("open");
  const { data, isLoading, isError } = useListMyListings({ status: tab });
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
                  {/* F13: Offer count badge */}
                  {(listing.offer_count ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      <span>
                        <span className="font-semibold text-foreground">
                          {listing.offer_count}
                        </span>{" "}
                        {t("myListings.offersCount")}
                      </span>
                    </div>
                  )}

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
