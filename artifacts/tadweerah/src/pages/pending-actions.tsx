import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Clock,
  Package,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { fmtNumber, fmtDate } from "@/lib/format";
import { dealRef } from "@/lib/listing-ref";
import { LocationLink } from "@/components/location-link";
import { useGetMaterialCategories } from "@workspace/api-client-react";

interface PendingDeal {
  id: string;
  listing_id: string;
  status: string;
  role: "producer" | "buyer";
  action_needed: string;
  material: string | null;
  city: string | null;
  quantity: string | number | null;
  unit: string | null;
  material_subcategory_id: string | null;
  material_location_address: string | null;
  google_maps_url: string | null;
  material_location_notes: string | null;
  updated_at: string;
}

function usePendingDeals() {
  const { getToken } = useAuth();
  return useQuery<{ deals: PendingDeal[] }>({
    queryKey: ["pending-deals"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/deals/pending", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("pending fetch failed");
      return res.json() as Promise<{ deals: PendingDeal[] }>;
    },
    staleTime: 30_000,
  });
}

const ACTION_COLOR: Record<string, { badge: string; border: string; dot: string }> = {
  submit_payment: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    border: "border-s-amber-400",
    dot: "bg-amber-400",
  },
  confirm_payment: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    border: "border-s-amber-400",
    dot: "bg-amber-400",
  },
  confirm_dispatch: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    border: "border-s-blue-400",
    dot: "bg-blue-400",
  },
  confirm_receipt: {
    badge: "bg-secondary/15 text-secondary border-secondary/25",
    border: "border-s-secondary",
    dot: "bg-secondary",
  },
  choose_transport: {
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    border: "border-s-violet-400",
    dot: "bg-violet-400",
  },
  transport_pending_producer: {
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    border: "border-s-orange-400",
    dot: "bg-orange-400",
  },
  transport_pending_buyer: {
    badge: "bg-orange-100 text-orange-700 border-orange-200",
    border: "border-s-orange-400",
    dot: "bg-orange-400",
  },
};

export function PendingActionsPage() {
  const { t, lang } = useT();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const { data, isLoading } = usePendingDeals();
  const deals = data?.deals ?? [];
  const { data: allCategories = [] } = useGetMaterialCategories();
  const nameKey = lang === "ar" ? "name_ar" : "name_en";

  return (
    <AppLayout>
      {/* ── Header ── */}
      <div className="mb-4 flex items-center gap-3">
        <Link to="/dashboard">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
          >
            {lang === "ar" ? (
              <ArrowRight className="h-4 w-4" />
            ) : (
              <ArrowLeft className="h-4 w-4" />
            )}
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {lang === "ar" ? "الإجراءات المعلقة" : "Pending Actions"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {lang === "ar"
              ? "الصفقات التي تحتاج إجراء منك"
              : "Deals that require your attention"}
          </p>
        </div>
        {deals.length > 0 && (
          <span className="ms-auto inline-flex h-6 items-center justify-center rounded-full bg-amber-500 px-2 text-xs font-bold text-white">
            {deals.length}
          </span>
        )}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* ── Empty ── */}
      {!isLoading && deals.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/20 py-16">
          <CheckCircle2 className="h-10 w-10 text-secondary" />
          <p className="text-sm font-semibold text-foreground">
            {lang === "ar" ? "لا توجد إجراءات معلقة" : "No pending actions"}
          </p>
          <p className="text-xs text-muted-foreground">
            {lang === "ar"
              ? "جميع صفقاتك محدّثة — عمل رائع!"
              : "All your deals are up to date — great work!"}
          </p>
        </div>
      )}

      {/* ── Deal list ── */}
      {!isLoading && deals.length > 0 && (
        <div className="space-y-3">
          {deals.map((deal) => {
            const actionKey = `dashboard.pending.action.${deal.action_needed}`;
            const colors = ACTION_COLOR[deal.action_needed] ?? {
              badge: "bg-muted text-muted-foreground border-border",
              border: "border-s-border",
              dot: "bg-muted-foreground",
            };
            const categoryLabel = deal.material ? t(`material.${deal.material}`) : "—";
            const subcategoryLabel = deal.material_subcategory_id
              ? ((allCategories as Array<{ id: string; name_ar: string; name_en: string }>).find(
                  (c) => c.id === deal.material_subcategory_id,
                )?.[nameKey] ?? null)
              : null;
            const primaryLabel = subcategoryLabel ?? categoryLabel;
            const qtyDisplay = deal.quantity != null && deal.unit
              ? ` — ${fmtNumber(deal.quantity)} ${deal.unit}`
              : "";
            const updatedDate = fmtDate(deal.updated_at, lang);

            return (
              <div
                key={deal.id}
                className={`rounded-xl border border-s-4 bg-card shadow-sm ${colors.border}`}
              >
                <div className="flex flex-col gap-3 p-4">
                  {/* Top row: material + action badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-foreground">{primaryLabel}{qtyDisplay}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {subcategoryLabel ? categoryLabel : null}
                          {subcategoryLabel && deal.city ? " · " : null}
                          {deal.city}
                          {(subcategoryLabel || deal.city) ? " · " : null}
                          <span dir="ltr">{dealRef(deal.id)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {/* Ownership label */}
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-bold text-amber-700">
                        <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                        {t("deal.role.your_turn")}
                      </span>
                      {/* Action badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colors.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                        {t(actionKey)}
                      </span>
                    </div>
                  </div>

                  {/* Details row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {deal.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {deal.city}
                        {deal.google_maps_url && deal.google_maps_url.startsWith("https://") && (
                          <a
                            href={deal.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ms-0.5 text-primary hover:underline font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            ↗
                          </a>
                        )}
                      </span>
                    )}
                    {deal.material_location_address && (
                      <span className="flex items-center gap-1 italic opacity-80">
                        <LocationLink
                          address={deal.material_location_address}
                          city={deal.city}
                          mapsUrl={deal.google_maps_url}
                          stopPropagation
                        />
                      </span>
                    )}
                    {deal.material_location_notes && (
                      <span className="flex items-center gap-1 italic opacity-60">
                        {deal.material_location_notes}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      {updatedDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                      {t(`deal.status.${deal.status}`)}
                    </span>
                  </div>

                  {/* Action button */}
                  <Link to={`/listings/${deal.listing_id}`}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-80"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {lang === "ar" ? "فتح الصفقة" : "Open Deal"}
                      <Arrow className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
