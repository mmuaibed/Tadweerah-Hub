import {
  Recycle,
  Package,
  MapPin,
  Calendar,
  Tag,
  Building2,
  ChevronLeft,
  ChevronRight,
  Scale,
  Gavel,
  ShoppingBag,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { listingRef } from "@/lib/listing-ref";
import type { WasteListing } from "@workspace/api-client-react";

interface ListingCardProps {
  listing: WasteListing;
  /** Show the company name (marketplace) or hide it (my listings). */
  showCompany?: boolean;
  /** Navigate to this href when the card is clicked. */
  href?: string;
  /** Footer slot — typically actions like "Close listing". */
  footer?: React.ReactNode;
}

export function ListingCard({
  listing,
  showCompany = true,
  href,
  footer,
}: ListingCardProps) {
  const { t, lang } = useT();
  const isOpen = listing.status === "open";
  const isRtl = lang === "ar";
  const imageUrl = (listing as WasteListing & { image_url?: string }).image_url;

  const dateStr = new Date(listing.created_at).toLocaleDateString(
    lang === "ar" ? "ar-SA" : "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );

  const inner = (
    <Card
      className={`border-card-border bg-card overflow-hidden transition-shadow ${
        href ? "hover:shadow-md cursor-pointer" : ""
      }`}
    >
      {/* Listing image */}
      {imageUrl && (
        <div className="h-36 w-full shrink-0 overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={t(`material.${listing.material}`)}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <CardContent className="flex flex-col gap-4 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary/10 text-secondary">
              <Recycle className="h-4 w-4" />
            </span>
            <div className="flex flex-col">
              <h3 className="text-base font-semibold text-card-foreground">
                {t(`material.${listing.material}`)}
              </h3>
              <span className="text-xs text-muted-foreground">
                {listingRef(listing.id)}
              </span>
            </div>
          </div>
          <Badge variant={isOpen ? "secondary" : "outline"} className="shrink-0">
            {t(`status.${listing.status}`)}
          </Badge>
        </div>

        {/* Details grid */}
        <div className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 shrink-0" />
            <span>
              {listing.quantity} {t(`unit.${listing.unit}`)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{listing.city}</span>
          </div>
          {listing.price_hint != null && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 shrink-0" />
              <span>
                {listing.price_hint.toLocaleString()} {t("listing.sar")} / {t(`unit.${listing.unit}`)}
              </span>
            </div>
          )}
          {listing.pricing_model && (
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 shrink-0" />
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  listing.pricing_model === "fixed"
                    ? "bg-secondary/15 text-secondary"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {t(`listing.pricing_model.${listing.pricing_model}`)}
              </span>
            </div>
          )}
          {(() => {
            const saleType = (listing as WasteListing & { sale_type?: string }).sale_type ?? "auction";
            return (
              <div className="flex items-center gap-2">
                {saleType === "auction" ? (
                  <Gavel className="h-4 w-4 shrink-0" />
                ) : (
                  <ShoppingBag className="h-4 w-4 shrink-0" />
                )}
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    saleType === "auction"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary/15 text-secondary"
                  }`}
                >
                  {t(`listing.sale_type.${saleType}`)}
                </span>
              </div>
            );
          })()}
          {showCompany && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" />
              <span>{listing.company_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{dateStr}</span>
          </div>
        </div>

        {listing.description && (
          <p className="line-clamp-3 border-t border-border pt-3 text-sm text-muted-foreground">
            {listing.description}
          </p>
        )}

        {/* Footer actions (e.g. Close listing button) — stop propagation so card link doesn't fire */}
        {footer && (
          <div
            className="mt-1 flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {footer}
          </div>
        )}

        {/* Show "View details" chevron only when there's no href wrapper (footer-only cards) */}
        {!href && footer && null}
        {href && !footer && (
          <div className="flex items-center justify-end gap-1 text-xs text-primary/70 mt-1">
            <span>{t("listing.viewDetail")}</span>
            {isRtl ? (
              <ChevronLeft className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link to={href} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}
