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
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { fmtSAR, fmtDate } from "@/lib/format";
import { trRef } from "@/lib/listing-ref";

// ── Types ────────────────────────────────────────────────────────────────────

type TRStatus =
  | "pending"
  | "accepted"
  | "manifest_ready"
  | "in_transit"
  | "delivered"
  | "closed"
  | "cancelled";

type QuoteStatus = "submitted" | "under_review" | "selected" | "rejected";

interface TransportRequest {
  id: string;
  deal_id: string;
  deal_reference?: string;
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

interface TransportQuote {
  id: string;
  transport_request_id: string;
  deal_reference?: string;
  transporter_company_id: string;
  transporter_name?: string;
  price_total: string;
  truck_count: number;
  truck_type?: string;
  notes?: string;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
  // enriched by my-quotes endpoint
  pickup_city?: string;
  delivery_city?: string;
  waste_description?: string;
  tr_status?: TRStatus;
  planned_pickup_at?: string;
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

function useMyQuotes() {
  return useFetchJson<TransportQuote[]>(
    "/api/transport-requests/my-quotes",
    ["transport-quotes", "mine"],
  );
}

function useSubmitQuote(trId: string) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      price_total: number;
      truck_count: number;
      truck_type?: string;
      notes?: string;
    }) => {
      const token = await getToken();
      const res = await fetch(`/api/transport-requests/${trId}/quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? "Failed to submit quote");
      }
      return res.json() as Promise<TransportQuote>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["transport-quotes"] });
      void qc.invalidateQueries({ queryKey: ["transport-requests", "available"] });
    },
  });
}

// ── Status badge helpers ──────────────────────────────────────────────────────

const TR_STATUS_COLORS: Record<TRStatus, string> = {
  pending:        "bg-yellow-100 text-yellow-800 border-yellow-200",
  accepted:       "bg-blue-100 text-blue-800 border-blue-200",
  manifest_ready: "bg-indigo-100 text-indigo-800 border-indigo-200",
  in_transit:     "bg-orange-100 text-orange-800 border-orange-200",
  delivered:      "bg-green-100 text-green-800 border-green-200",
  closed:         "bg-gray-100 text-gray-700 border-gray-200",
  cancelled:      "bg-red-100 text-red-700 border-red-200",
};

const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  submitted:    "bg-yellow-100 text-yellow-800 border-yellow-200",
  under_review: "bg-blue-100 text-blue-800 border-blue-200",
  selected:     "bg-green-100 text-green-800 border-green-200",
  rejected:     "bg-red-100 text-red-700 border-red-200",
};

function TRStatusBadge({ status, t }: { status: TRStatus; t: (k: string) => string }) {
  const colorClass = TR_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}>
      {t(`transport.status.${status}`)}
    </span>
  );
}

function QuoteStatusBadge({ status, t }: { status: QuoteStatus; t: (k: string) => string }) {
  const colorClass = QUOTE_STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}>
      {t(`transport.quote.status.${status}`)}
    </span>
  );
}

// ── Quote Form ────────────────────────────────────────────────────────────────

function QuoteForm({
  trId,
  onClose,
}: {
  trId: string;
  onClose: () => void;
}) {
  const { t } = useT();
  const { mutate: submit, isPending, isSuccess, error } = useSubmitQuote(trId);

  const [priceTotal, setPriceTotal] = useState("");
  const [truckCount, setTruckCount] = useState("1");
  const [truckType, setTruckType] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseFloat(priceTotal);
    if (!price || price <= 0) return;
    submit({
      price_total: price,
      truck_count: Math.max(1, parseInt(truckCount) || 1),
      truck_type: truckType.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  if (isSuccess) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {t("transport.quote.success")}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-muted/30 border border-border p-3">
      <p className="text-xs font-semibold text-foreground">{t("transport.quote.form_title")}</p>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            {t("transport.quote.price_total")}
          </label>
          <Input
            type="number"
            min="1"
            step="0.01"
            value={priceTotal}
            onChange={(e) => setPriceTotal(e.target.value)}
            className="h-8 text-sm"
            dir="ltr"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
            {t("transport.quote.truck_count")}
          </label>
          <Input
            type="number"
            min="1"
            step="1"
            value={truckCount}
            onChange={(e) => setTruckCount(e.target.value)}
            className="h-8 text-sm"
            dir="ltr"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
          {t("transport.quote.truck_type")}
        </label>
        <Input
          type="text"
          value={truckType}
          onChange={(e) => setTruckType(e.target.value)}
          placeholder={t("transport.quote.truck_type.placeholder")}
          className="h-8 text-sm"
        />
      </div>

      <div>
        <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
          {t("transport.quote.notes")}
        </label>
        <Input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" className="flex-1" disabled={isPending || !priceTotal}>
          {isPending && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
          {isPending ? t("transport.quote.submitting") : t("transport.quote.submit_btn")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onClose} disabled={isPending}>
          {t("transport.quote.cancel")}
        </Button>
      </div>
    </form>
  );
}

// ── TR Card ───────────────────────────────────────────────────────────────────

function TRCard({
  tr,
  showQuote,
}: {
  tr: TransportRequest;
  showQuote?: boolean;
}) {
  const { t, lang } = useT();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const [quoteOpen, setQuoteOpen] = useState(false);

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
                {tr.deal_reference || (lang === "ar" ? "مرجع غير متوفر" : "Reference unavailable")}
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
              {fmtDate(tr.planned_pickup_at, lang)}
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

        {/* Quote button / form (available tab for transporter companies) */}
        {showQuote && tr.status === "pending" && (
          <>
            {!quoteOpen ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-1"
                onClick={() => setQuoteOpen(true)}
              >
                <FileText className="me-1.5 h-3.5 w-3.5" />
                {t("transport.quote.submit_btn")}
                <ChevronDown className="ms-auto h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setQuoteOpen(false)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  {t("transport.quote.cancel")}
                </button>
                <QuoteForm trId={tr.id} onClose={() => setQuoteOpen(false)} />
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── My Quotes Card ────────────────────────────────────────────────────────────

function QuoteCard({ quote }: { quote: TransportQuote }) {
  const { t, lang } = useT();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <Card className={`border-border bg-card ${quote.status === "selected" ? "ring-1 ring-green-400" : ""}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">{t("transport.quote.tr_ref")}</p>
              <p className="text-xs font-mono font-semibold text-foreground truncate">
                {trRef(quote.transport_request_id, quote.created_at)}
              </p>
            </div>
          </div>
          <QuoteStatusBadge status={quote.status} t={t} />
        </div>

        {/* Route */}
        {(quote.pickup_city || quote.delivery_city) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {quote.pickup_city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{quote.pickup_city}</span>}
            {quote.pickup_city && quote.delivery_city && <Arrow className="h-3 w-3 text-muted-foreground/40" />}
            {quote.delivery_city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{quote.delivery_city}</span>}
          </div>
        )}

        {/* Waste desc */}
        {quote.waste_description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{quote.waste_description}</p>
        )}

        {/* Price + trucks */}
        <div className="flex items-center gap-4 text-xs">
          <span className="font-semibold text-foreground">{fmtSAR(Number(quote.price_total), lang)}</span>
          <span className="text-muted-foreground">
            {quote.truck_count} {quote.truck_type ? `× ${quote.truck_type}` : t("transport.quote.truck_count")}
          </span>
        </div>

        {/* Notes */}
        {quote.notes && (
          <p className="text-xs text-muted-foreground italic line-clamp-2">{quote.notes}</p>
        )}

        {/* Date */}
        <p className="text-[10px] text-muted-foreground/60">
          {t("transport.quote.submitted_at")}: {fmtDate(quote.created_at, lang)}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "mine" | "available" | "my_quotes";

export function TransportRequestsPage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("mine");

  const { data: mine, isLoading: mineLoading, error: mineError } = useMyTransportRequests();
  const { data: available, isLoading: availableLoading, error: availableError } = useAvailableTransportRequests();
  const { data: myQuotes, isLoading: quotesLoading, error: quotesError } = useMyQuotes();

  const isLoading = tab === "mine" ? mineLoading : tab === "available" ? availableLoading : quotesLoading;
  const error = tab === "mine" ? mineError : tab === "available" ? availableError : quotesError;

  return (
    <AppLayout showSignOut title={t("transport.title")} subtitle={t("transport.subtitle")}>

      {/* ── Tabs ── */}
      <div className="mb-4 flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        {(["mine", "available", "my_quotes"] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
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
      ) : tab === "mine" ? (
        !mine || mine.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 py-12 text-sm text-muted-foreground">
            <Truck className="h-8 w-8 opacity-30" />
            <span>{t("transport.empty.mine")}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {mine.map((tr) => (
              <TRCard key={tr.id} tr={tr} />
            ))}
          </div>
        )
      ) : tab === "available" ? (
        !available || available.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 py-12 text-sm text-muted-foreground">
            <Truck className="h-8 w-8 opacity-30" />
            <span>{t("transport.empty.available")}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {available.map((tr) => (
              <TRCard key={tr.id} tr={tr} showQuote />
            ))}
          </div>
        )
      ) : (
        /* my_quotes tab */
        !myQuotes || myQuotes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-muted/30 py-12 text-sm text-muted-foreground">
            <FileText className="h-8 w-8 opacity-30" />
            <span>{t("transport.empty.my_quotes")}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {myQuotes.map((q) => (
              <QuoteCard key={q.id} quote={q} />
            ))}
          </div>
        )
      )}
    </AppLayout>
  );
}
