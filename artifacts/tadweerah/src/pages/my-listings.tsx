import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMyListings,
  useCloseWasteListing,
  getListMyListingsQueryKey,
} from "@workspace/api-client-react";
import { Loader2, Plus, Recycle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/app-layout";
import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useT } from "@/i18n";

export function MyListingsPage() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useListMyListings();
  const { mutate: closeListing, isPending: isClosing } = useCloseWasteListing();

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);

  const handleConfirmClose = () => {
    if (!confirmId) return;
    setCloseError(null);
    closeListing(
      { wasteListingId: confirmId },
      {
        onSuccess: () => {
          setConfirmId(null);
          queryClient.invalidateQueries({ queryKey: getListMyListingsQueryKey() });
        },
        onError: () => {
          setConfirmId(null);
          setCloseError(t("myListings.closeError"));
        },
      },
    );
  };

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
        onOpenChange={(open) => { if (!open) setConfirmId(null); }}
        title={t("listing.close.confirm.title")}
        description={t("listing.close.confirm.desc")}
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
          description={t("myListings.empty.desc")}
          action={
            <Link to="/listings/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("myListings.add")}
              </Button>
            </Link>
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
                listing.status === "open" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={isClosing && confirmId === listing.id}
                    onClick={() => setConfirmId(listing.id)}
                  >
                    {t("myListings.close")}
                  </Button>
                ) : null
              }
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
