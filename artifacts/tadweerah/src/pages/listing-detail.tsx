import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetWasteListing,
  useCloseWasteListing,
  useGetMe,
  getListMyListingsQueryKey,
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
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AppLayout } from "@/components/app-layout";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useT } from "@/i18n";
import { listingRef } from "@/lib/listing-ref";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export function ListingDetailPage() {
  const { t, lang } = useT();
  const params = useParams<{ waste_listing_id: string }>();
  const wasteListingId = params.waste_listing_id ?? "";
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

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
  const isOpen = listing?.status === "open";

  const backPath =
    role === "producer"
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

  const handleConfirmClose = () => {
    setCloseError(null);
    closeListing(
      { wasteListingId },
      {
        onSuccess: (updated) => {
          setConfirmOpen(false);
          queryClient.invalidateQueries({ queryKey });
          queryClient.invalidateQueries({ queryKey: getListMyListingsQueryKey() });
          if (updated.status === "closed") {
            navigate("/listings/mine");
          }
        },
        onError: () => {
          setConfirmOpen(false);
          setCloseError(t("myListings.closeError"));
        },
      },
    );
  };

  const backButton = (
    <Link to={backPath}>
      <Button variant="ghost" size="sm" className="gap-1 px-2">
        {lang === "ar" ? (
          <ArrowRight className="h-4 w-4" />
        ) : (
          <ArrowLeft className="h-4 w-4" />
        )}
        {t("action.back")}
      </Button>
    </Link>
  );

  if (!isValidId) {
    return (
      <AppLayout showSignOut title={t("listing.invalidId.title")} actions={backButton}>
        <EmptyState
          icon={Recycle}
          title={t("listing.invalidId.title")}
          description={t("listing.invalidId.desc")}
        />
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
        <EmptyState
          icon={Recycle}
          title={t("listing.notFound.title")}
          description={t("listing.notFound.desc")}
        />
      </AppLayout>
    );
  }

  const ref = listingRef(listing.id);
  const materialLabel = t(`material.${listing.material}`);

  return (
    <AppLayout
      showSignOut
      title={materialLabel}
      subtitle={ref}
      actions={backButton}
    >
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("listing.close.confirm.title")}
        description={t("listing.close.confirm.desc")}
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
        {/* Header card */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
              <Recycle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">{materialLabel}</h2>
              <span className="text-xs text-muted-foreground">{ref}</span>
            </div>
          </div>
          <Badge
            variant={isOpen ? "secondary" : "outline"}
            className="text-sm"
          >
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
          <DetailRow
            icon={<MapPin className="h-4 w-4" />}
            label={t("listing.city")}
            value={listing.city}
          />
          {listing.price_hint != null && (
            <DetailRow
              icon={<Tag className="h-4 w-4" />}
              label={t("listing.priceHint")}
              value={`${listing.price_hint} ${t("listing.sar")}`}
            />
          )}
          <DetailRow
            icon={<Building2 className="h-4 w-4" />}
            label={t("listing.detail.publishedBy")}
            value={listing.company_name}
          />
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label={t("listing.publishedOn")}
            value={dateStr}
          />
        </div>

        {/* Description */}
        {listing.description && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("listing.detail.description")}
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {listing.description}
            </p>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="pb-4">
          {role === "producer" && isOwner && isOpen && (
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

          {role === "buyer" && (
            <div className="space-y-3">
              <Button
                disabled
                className="w-full gap-2 cursor-not-allowed opacity-70"
              >
                <Lock className="h-4 w-4" />
                {t("listing.offer.cta")}
              </Button>
              <p className="text-center text-xs text-muted-foreground leading-relaxed px-2">
                {t("listing.offer.hint")}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
