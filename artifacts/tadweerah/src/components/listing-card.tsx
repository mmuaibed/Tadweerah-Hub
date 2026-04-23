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
  /** Navigate to this href when "View Details" is clicked. */
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

  return (
    <Card className="border-card-border bg-card transition-shadow hover:shadow-md overflow-hidden">
      {/* Listing image */}
      {imageUrl && (
        <div className="h-36 w-full overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={t(`material.${listing.material}`)}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary/10 text-secondary">
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
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                listing.pricing_model === "fixed"
                  ? "bg-secondary/15 text-secondary"
                  : "bg-primary/10 text-primary"
              }`}>
                {t(`listing.pricing_model.${listing.pricing_model}`)}
              </span>
            </div>
          )}
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

        {(footer || href) && (
          <div className="mt-auto flex flex-col gap-2 pt-2">
            {footer}
            {href && (
              <Link to={href}>
                <Button variant="ghost" size="sm" className="w-full gap-1">
                  {t("listing.viewDetail")}
                  {isRtl ? (
                    <ChevronLeft className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
