import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Truck,
  Loader2,
  AlertCircle,
  MapPin,
  Calendar,
  Package,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

// ── Types ────────────────────────────────────────────────────────────────────

type TRStatus =
  | "pending"
  | "accepted"
  | "manifest_ready"
  | "in_transit"
  | "delivered"
  | "closed"
  | "cancelled";

interface TransportRequest {
  id: string;
  deal_id: string;
  created_by_company_id: string;
  transporter_company_id?: string;
  transporter_name?: string;
  status: TRStatus;
  pickup_city?: string;
  delivery_city?: string;
  waste_description?: string;
  notes?: string;
  planned_pickup_at?: string;
  actual_pickup_at?: string;
  delivered_at?: string;
  closed_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

function useFetchJson<T>(endpoint: string, queryKey: string[]) {
  const { getToken } = useAuth();
  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("fetch failed");
      return res.json() as Promise<T>;
    },
    staleTime: 30_000,
  });
}

function useMyTransportRequests() {
  return useFetchJson<TransportRequest[]>(
    "/api/transport-requests/mine",
    ["transport-requests", "mine"],
  );
}

function useAvailableTransportRequests() {
  return useFetchJson<TransportRequest[]>(
    "/api/transport-requests/available",
    ["transport-requests", "available"],
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<TRStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  accepted: "bg-blue-100 text-blue-800 border-blue-200",
  manifest_ready: "bg-indigo-100 text-indigo-800 border-indigo-200",
  in_transit: "bg-orange-100 text-orange-800 border-orange-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  closed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

function TRStatusBadge({ status, t }: { status: TRStatus; t: (k: string) => string }) {
  const colorClass = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}>
      {t(`transport.status.${status}`)}
    </span>
  );
}

// ── Accept action ─────────────────────────────────────────────────────────────

function useAcceptTransportRequest() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      const res = await fetch(`/api/transport-requests/${id}/accept`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Failed to accept");
      }
      return res.json() as Promise<TransportRequest>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["transport-requests"] });
    },
  });
}

// ── TR Card ───────────────────────────────────────────────────────────────────

function TRCard({
  tr,
  showAccept,
}: {
  tr: TransportRequest;
  showAccept?: boolean;
}) {
  const { t, lang } = useT();
  const { mutate: accept, isPending } = useAcceptTransportRequest();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const dateOpts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  const locale = lang === "ar" ? "ar-SA-u-nu-latn" : "en-US";

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Truck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">{t("transport.deal_ref")}</p>
              <p className="text-xs font-mono font-semibold text-foreground truncate">
                {tr.deal_id.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>
          <TRStatusBadge status={tr.status} t={t} />
        </div>

        {/* Cities */}
        {(tr.pickup_city || tr.delivery_city) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {tr.pickup_city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {tr.pickup_city}
              </span>
            )}
            {tr.pickup_city && tr.delivery_city && (
              <Arrow className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            )}
            {tr.delivery_city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {tr.delivery_city}
              </span>
            )}
          </div>
        )}

        {/* Waste description */}
        {tr.waste_description && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Package className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{tr.waste_description}</span>
          </div>
        )}

        {/* Planned pickup */}
        {tr.planned_pickup_at && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>
              {t("transport.planned_pickup")}:{" "}
              {new Date(tr.planned_pickup_at).toLocaleDateString(locale, dateOpts)}
            </span>
          </div>
        )}

        {/* Transporter (for "mine" tab) */}
        {tr.transporter_name && (
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
            <span className="text-muted-foreground">{t("transport.transporter")}:</span>
            <span className="font-medium text-foreground">{tr.transporter_name}</span>
          </div>
        )}
        {!tr.transporter_name && tr.status === "pending" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{t("transport.not_assigned")}</span>
          </div>
        )}

        {/* Accept button (available tab only) */}
        {showAccept && tr.status === "pending" && (
          <Button
            size="sm"
            className="w-full mt-1"
            disabled={isPending}
            onClick={() => accept(tr.id)}
          >
            {isPending && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
            {isPending ? t("transport.action.accepting") : t("transport.action.accept")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "mine" | "available";

export function TransportRequestsPage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("mine");

  const { data: mine, isLoading: mineLoading, error: mineError } = useMyTransportRequests();
  const { data: available, isLoading: availableLoading, error: availableError } = useAvailableTransportRequests();

  const isLoading = tab === "mine" ? mineLoading : availableLoading;
  const error = tab === "mine" ? mineError : availableError;
  const items = tab === "mine" ? mine : available;

  return (
    <AppLayout showSignOut title={t("transport.title")} subtitle={t("transport.subtitle")}>

      {/* ── Tabs ── */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        {(["mine", "available"] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === tabKey
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`transport.tab.${tabKey}`)}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-8 text-sm text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{String(error)}</span>
        </div>
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 py-12 text-sm text-muted-foreground">
          <Truck className="h-8 w-8 opacity-30" />
          <span>{t(`transport.empty.${tab}`)}</span>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((tr) => (
            <TRCard key={tr.id} tr={tr} showAccept={tab === "available"} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
