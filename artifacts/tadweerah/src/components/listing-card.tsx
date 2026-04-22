import {
  Recycle,
  Package,
  MapPin,
  Calendar,
  Tag,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n";
import type { WasteListing } from "@workspace/api-client-react";

interface ListingCardProps {
  listing: WasteListing;
  /** Show the company name (marketplace) or hide it (my listings). */
  showCompany?: boolean;
  /** Footer slot — typically actions like "Close listing". */
  footer?: React.ReactNode;
}

export function ListingCard({ listing, showCompany = true, footer }: ListingCardProps) {
  const { t, lang } = useT();
  const isOpen = listing.status === "open";

  const dateStr = new Date(listing.created_at).toLocaleDateString(
    lang === "ar" ? "ar-SA" : "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );

  return (
    <Card className="border-card-border bg-card transition-shadow hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary/10 text-secondary">
              <Recycle className="h-4 w-4" />
            </span>
            <h3 className="text-base font-semibold text-card-foreground">
              {t(`material.${listing.material}`)}
            </h3>
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
                {listing.price_hint} {t("listing.sar")}
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

        {footer && <div className="mt-auto pt-2">{footer}</div>}
      </CardContent>
    </Card>
  );
}
