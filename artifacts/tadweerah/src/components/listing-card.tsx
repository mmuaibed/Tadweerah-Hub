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
  Shield,
  TrendingUp,
  TrendingDown,
  Lock,
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
  const myRank = (listing as WasteListing & { my_rank?: number }).my_rank;
  const myOfferPrice = (listing as WasteListing & { my_offer_price?: string | number | null }).my_offer_price;
  const highestOfferPrice = (listing as WasteListing & { highest_offer_price?: number | null }).highest_offer_price;
  const requiredServices = (listing as WasteListing & { required_services?: Array<{ id: string; name_ar: string; name_en: string; requires_license?: boolean }> }).required_services ?? [];
  const targetingType = (listing as WasteListing & { targeting_type?: string }).targeting_type ?? "open";

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
      {/* Listing image — always shown; falls back to a material-icon placeholder */}
      <div className="h-36 w-full shrink-0 overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={t(`material.${listing.material}`)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Recycle className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
      </div>

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
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant={isOpen ? "secondary" : "outline"}>
              {t(`status.${listing.status}`)}
            </Badge>
            {targetingType !== "open" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                <Lock className="h-2.5 w-2.5" />
                {t(`listing.targeting.${targetingType}`)}
              </span>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 shrink-0" />
            <span>
              {listing.quantity} {listing.unit ? t(`unit.${listing.unit}`) : ""}
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
                {listing.price_hint.toLocaleString()} {t("listing.sar")}{listing.unit ? ` / ${t(`unit.${listing.unit}`)}` : ""}
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
              {listing.pricing_model === "revenue_share" && listing.revenue_share_pct != null && (
                <span className="text-xs text-muted-foreground">
                  {listing.revenue_share_pct}%
                </span>
              )}
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
              <span>{listing.company_name ?? "—"}</span>
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

        {/* Required services badges */}
        {requiredServices.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
            <span className="text-xs text-muted-foreground me-1 self-center">{t("listing.required_services.label")}:</span>
            {requiredServices.map((svc) => (
              <span
                key={svc.id}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
              >
                {svc.requires_license && <Shield className="h-3 w-3" />}
                {lang === "ar" ? svc.name_ar : svc.name_en}
              </span>
            ))}
          </div>
        )}

        {/* Bid status — shown when viewer has bid */}
        {myRank != null && (
          <div className={`rounded-lg border px-3 py-2 space-y-1 ${
            myRank === 1
              ? "border-secondary/40 bg-secondary/10 text-secondary"
              : "border-muted text-muted-foreground bg-muted/30"
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {myRank === 1 ? (
                  <TrendingUp className="h-4 w-4 shrink-0" />
                ) : (
                  <TrendingDown className="h-4 w-4 shrink-0" />
                )}
                <span className="text-xs font-semibold">
                  {myRank === 1 ? t("listing.bid.top") : t("listing.bid.not_top")}
                </span>
              </div>
              {myOfferPrice != null && (
                <span className="text-xs font-medium">
                  {t("listing.bid.mine.label")}: {Number(myOfferPrice).toLocaleString()} {t("listing.sar")}
                </span>
              )}
            </div>
            {myRank > 1 && highestOfferPrice != null && (
              <p className="text-xs text-muted-foreground ps-5">
                {t("listing.bid.highest.label")}:{" "}
                <span className="font-semibold">{Number(highestOfferPrice).toLocaleString()} {t("listing.sar")}</span>
              </p>
            )}
          </div>
        )}

        {/* Highest offer context — viewer hasn't bid but there are offers */}
        {myRank == null && highestOfferPrice != null && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">
              {t("listing.bid.highest.label")}:{" "}
              <span className="font-semibold text-foreground">
                {Number(highestOfferPrice).toLocaleString()} {t("listing.sar")}
              </span>
            </span>
          </div>
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
