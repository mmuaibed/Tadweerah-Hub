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
} from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { dealRef } from "@/lib/listing-ref";

interface PendingDeal {
  id: string;
  listing_id: string;
  status: string;
  role: "producer" | "buyer";
  action_needed: string;
  material: string | null;
  city: string | null;
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
};

export function PendingActionsPage() {
  const { t, lang } = useT();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const { data, isLoading } = usePendingDeals();
  const deals = data?.deals ?? [];

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
          <span className="ms-auto inline-flex h-6 items-center justify-center rounded-full bg-destructive px-2 text-xs font-bold text-white">
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
            const materialLabel = deal.material
              ? t(`material.${deal.material}`)
              : "—";
            const updatedDate = new Date(deal.updated_at).toLocaleDateString(
              lang === "ar" ? "ar-SA" : "en-US",
              { year: "numeric", month: "short", day: "numeric" },
            );

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
                        <p className="text-sm font-bold text-foreground">{materialLabel}</p>
                        <p className="text-[10px] font-mono text-muted-foreground" dir="ltr">
                          {dealRef(deal.id)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${colors.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                      {t(actionKey)}
                    </span>
                  </div>

                  {/* Details row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {deal.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {deal.city}
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
