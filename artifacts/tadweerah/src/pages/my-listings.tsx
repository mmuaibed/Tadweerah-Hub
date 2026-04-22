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
import { useT } from "@/i18n";

export function MyListingsPage() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useListMyListings();
  const { mutate: closeListing, isPending: isClosing, variables: closingVars } =
    useCloseWasteListing();
  const [closeError, setCloseError] = useState<string | null>(null);

  const handleClose = (waste_listing_id: string) => {
    setCloseError(null);
    closeListing(
      { wasteListingId: waste_listing_id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMyListingsQueryKey() });
        },
        onError: () => setCloseError(t("myListings.closeError")),
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
          {data.map((listing) => {
            const closingThis =
              isClosing && closingVars?.wasteListingId === listing.id;
            return (
              <ListingCard
                key={listing.id}
                listing={listing}
                showCompany={false}
                footer={
                  listing.status === "open" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      disabled={closingThis}
                      onClick={() => handleClose(listing.id)}
                    >
                      {closingThis && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {closingThis ? t("myListings.closing") : t("myListings.close")}
                    </Button>
                  ) : null
                }
              />
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
