import { useState } from "react";
import { useAuth } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Clock,
  UserCheck,
  UserCog,
  Percent,
  Printer,
  TrendingUp,
  Shield,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Truck,
  FileText as FileTextIcon,
  MapPin,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useT } from "@/i18n";
import { dealRef } from "@/lib/listing-ref";
import {
  useGetListingOffers,
  useGetOffersSummary,
  useGetMaterialCategories,
} from "@workspace/api-client-react";
import type { ListingOffer, MaterialCategory } from "@workspace/api-client-react";

export type DealStatus = "active" | "payment_confirmed" | "dispatched" | "completed";
export type SettlementType = "fixed" | "by_weight";

export interface DealInfo {
  id: string;
  offer_id: string;
  listing_id: string;
  settlement_type: SettlementType;
  price_per_unit: number;
  estimated_amount: number;
  actual_quantity: number | null;
  final_amount: number | null;
  status: DealStatus;
  counterparty: {
    name: string;
    contact_phone: string;
    city?: string;
  } | null;
  payment_confirmed_at: string | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
  dispatched_at: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DealPanelProps {
  deal: DealInfo;
  role: "producer" | "buyer";
  unit: string;
  onUpdate: (updated: DealInfo) => void;
  pricingModel?: string;
  revenueSharePct?: number | string | null;
  /** Human-readable listing ref (e.g. "#LIST-ABCD12") */
  listingRef?: string;
  /** Material label for print report */
  listingMaterial?: string;
  /** Quantity for print report */
  listingQuantity?: number;
  /** Authenticated company name (for print report) */
  myCompanyName?: string;
  /** Material category name (localised) for display and print */
  listingCategory?: string;
  /** Authenticated user's company phone (for print report) */
  myPhone?: string;
  /** Listing city — pre-fills transport request pickup city */
  listingCity?: string;
  /** Counterparty (buyer/receiver) city — pre-fills transport request delivery city */
  counterpartyCity?: string;
  /** Listing description — pre-fills transport request waste description */
  listingDescription?: string;
  /** Material category ID from listing — pre-selects taxonomy in TR form */
  listingCategoryId?: string;
  /** Material subcategory ID from listing — pre-selects taxonomy in TR form */
  listingSubcategoryId?: string;
}

type PendingAction = "confirm-payment" | "confirm-dispatch" | "confirm-receipt" | null;

const STATUS_STEPS: DealStatus[] = [
  "active",
  "payment_confirmed",
  "dispatched",
  "completed",
];

class DealApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function callDealApi(
  dealId: string,
  action: "confirm-payment" | "confirm-dispatch" | "confirm-receipt",
  body?: object,
  authToken?: string | null,
): Promise<DealInfo> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`/api/deals/${dealId}/${action}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; message?: string };
    throw new DealApiError(err.error ?? "GenericError", err.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<DealInfo>;
}

function formatDate(iso: string | null, lang: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** V1 — Deal value summary: shows financial benefit of auction competition */
function DealValueSummary({
  listingId,
  acceptedPricePerUnit,
  estimatedAmount,
  unit,
}: {
  listingId: string;
  acceptedPricePerUnit: number;
  estimatedAmount: number;
  unit: string;
}) {
  const { t } = useT();
  const { data: summary } = useGetOffersSummary(listingId);
  const { data: offersRaw } = useGetListingOffers(listingId);
  const offers = (offersRaw ?? []) as ListingOffer[];

  if (!summary || summary.count === 0) return null;

  const sorted = [...offers].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const firstPrice = sorted[0]?.price_per_unit ?? null;
  const gained = firstPrice != null ? acceptedPricePerUnit - firstPrice : 0;

  return (
    <div className="mx-4 mb-3 rounded-xl border border-secondary/30 bg-secondary/5 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
        {t("deal.value_summary.title")}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="text-muted-foreground">{t("deal.value_summary.offers_count")}</span>
        <span className="font-bold text-end text-foreground">{summary.count}</span>

        {firstPrice != null && firstPrice !== acceptedPricePerUnit && (
          <>
            <span className="text-muted-foreground">{t("deal.value_summary.first_price")}</span>
            <span className="font-medium text-end text-muted-foreground">
              {firstPrice.toLocaleString()} {t("deal.value_summary.sar")}
            </span>

            <span className="text-muted-foreground">{t("deal.value_summary.accepted_price")}</span>
            <span className="font-bold text-end text-secondary">
              {acceptedPricePerUnit.toLocaleString()} {t("deal.value_summary.sar")}
            </span>

            <span className="text-muted-foreground">{t("deal.value_summary.value_gained")}</span>
            <span className="font-bold text-end text-green-700">
              +{(gained).toLocaleString()} {t("deal.value_summary.sar")} / {unit}
            </span>
          </>
        )}
      </div>

      {firstPrice != null && gained > 0 ? (
        <p className="text-[10px] text-secondary/80 leading-snug">
          {t("deal.value_summary.competition_note")}
        </p>
      ) : firstPrice != null ? (
        <p className="text-[10px] text-muted-foreground leading-snug">
          {t("deal.value_summary.no_change")}
        </p>
      ) : null}
    </div>
  );
}

// ── Next Step Banner ──────────────────────────────────────────────────────────

function NextStepBanner({
  deal,
  role,
  onOpenTrForm,
}: {
  deal: DealInfo;
  role: "producer" | "buyer";
  onOpenTrForm: () => void;
}) {
  const { t } = useT();
  if (deal.status === "completed") return null;

  const needsTrForm =
    role === "producer" &&
    deal.status === "payment_confirmed";

  const icon = needsTrForm ? <Truck className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />;
  const text = t(`deal.next_step.${deal.status}.${role}`);

  return (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium border-t ${
      needsTrForm
        ? "bg-primary/5 border-primary/15 text-primary"
        : "bg-muted/40 border-border text-muted-foreground"
    }`}>
      {icon}
      <span className="flex-1 min-w-0">{text}</span>
      {needsTrForm && (
        <button
          type="button"
          onClick={onOpenTrForm}
          className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          {t("deal.next_step.open_tr_form")}
        </button>
      )}
    </div>
  );
}

// ── Deal Progress Bar ─────────────────────────────────────────────────────────

function DealProgressBar({ deal }: { deal: DealInfo }) {
  const { t } = useT();

  const stages: { key: DealStatus | "active"; label: string; done: boolean }[] = [
    { key: "active",             label: t("deal.progress.active"),   done: true },
    { key: "payment_confirmed",  label: t("deal.progress.payment"),  done: !!deal.payment_confirmed_at },
    { key: "dispatched",         label: t("deal.progress.dispatch"), done: !!deal.dispatched_at },
    { key: "completed",          label: t("deal.progress.delivery"), done: deal.status === "completed" },
  ];

  const currentIdx = stages.reduce((acc, s, i) => (s.done ? i : acc), 0);

  return (
    <div className="px-4 py-3 border-t border-primary/10 bg-primary/5">
      <div className="flex items-center gap-0">
        {stages.map((stage, i) => {
          const isActive = i === currentIdx && deal.status !== "completed";
          const isDone = stage.done;
          return (
            <div key={stage.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                <div className={[
                  "flex h-6 w-6 items-center justify-center rounded-full shrink-0 text-[10px] font-bold transition-colors",
                  isDone && !isActive ? "bg-primary text-white" :
                  isActive ? "bg-primary text-white ring-2 ring-primary/30 ring-offset-1" :
                  "bg-muted border-2 border-muted-foreground/20 text-muted-foreground/40",
                ].join(" ")}>
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                </div>
                <p className={`text-center text-[9px] leading-tight font-medium truncate w-full px-0.5 ${
                  isDone ? "text-primary" : "text-muted-foreground/40"
                }`}>
                  {stage.label}
                </p>
              </div>
              {i < stages.length - 1 && (
                <div className={`h-0.5 flex-shrink-0 w-4 mx-0.5 mb-3 rounded-full transition-colors ${
                  stages[i + 1]?.done ? "bg-primary/60" : "bg-muted-foreground/20"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** V2 — Proper governance timeline replacing the old flat timestamp list */
function GovernanceTimeline({
  deal,
  lang,
}: {
  deal: DealInfo;
  lang: string;
}) {
  const { t } = useT();

  const steps: { key: string; label: string; ts: string | null }[] = [
    { key: "offer_accepted", label: t("deal.timeline.offer_accepted"), ts: deal.created_at },
    { key: "payment_confirmed", label: t("deal.timeline.payment_confirmed"), ts: deal.payment_confirmed_at },
    { key: "dispatched", label: t("deal.timeline.dispatched"), ts: deal.dispatched_at },
    { key: "received", label: t("deal.timeline.received"), ts: deal.received_at },
  ];

  const completedCount = steps.filter((s) => s.ts !== null).length;

  return (
    <div className="px-4 py-3 space-y-2 bg-muted/20 border-t border-primary/10">
      <p className="text-xs font-semibold text-muted-foreground">{t("deal.timeline.title")}</p>
      <div className="space-y-0">
        {steps.map((step, i) => {
          const done = step.ts !== null;
          const isCurrent = done && (i === completedCount - 1) && deal.status !== "completed";
          const isLast = i === steps.length - 1;
          return (
            <div key={step.key} className="flex gap-3">
              {/* Icon column */}
              <div className="flex flex-col items-center">
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${
                  done
                    ? isCurrent
                      ? "bg-primary text-white ring-2 ring-primary/30"
                      : "bg-primary/80 text-white"
                    : "border-2 border-muted-foreground/20 bg-background"
                }`}>
                  {done ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Circle className="h-2.5 w-2.5 text-muted-foreground/30" />
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-4 mt-0.5 ${done ? "bg-primary/50" : "bg-muted-foreground/15"}`} />
                )}
              </div>
              {/* Content column */}
              <div className={`pb-3 min-w-0 ${isLast ? "" : ""}`}>
                <p className={`text-xs font-medium leading-tight ${done ? "text-foreground" : "text-muted-foreground/50"}`}>
                  {step.label}
                </p>
                {done && step.ts ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDate(step.ts, lang)}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5">{t("deal.timeline.pending_label")}</p>
                )}
                {step.key === "payment_confirmed" && deal.payment_reference && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono" dir="ltr">
                    {deal.payment_reference}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── V3a — MWAN Summary Panel ──────────────────────────────────────────────────

interface TaxonomyEntry {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
  regulatory_code: string | null;
  hazard_level: string | null;
  physical_state: string | null;
}

interface MwanSummary {
  deal_id: string;
  deal_status: string;
  is_manifest_ready: boolean;
  readiness_score: string;
  checks: Record<string, boolean>;
  generator: { name: string; city: string | null; commercial_registration?: string; license_number?: string } | null;
  receiver: { name: string; city: string | null; license_number?: string } | null;
  transporter: { name: string; city?: string | null; license_number?: string; mode: "platform" | "self_managed" } | null;
  waste: { material: string; quantity: number | null; unit: string; origin_city: string | null } | null;
  waste_taxonomy: {
    category: TaxonomyEntry | null;
    subcategory: TaxonomyEntry | null;
  } | null;
  transport: {
    id: string;
    status: string;
    transport_mode: "platform" | "self_managed";
    manifest_ref?: string;
    pickup_facility_name?: string;
    delivery_facility_name?: string;
    transporter_name?: string;
    vehicle_plate?: string;
    pickup_city?: string;
    delivery_city?: string;
    planned_pickup_at?: string;
  } | null;
}

function TaxonomyRow({ label, entry }: { label: string; entry: TaxonomyEntry }) {
  const { lang } = useT();
  const name = lang === "ar" ? entry.name_ar : entry.name_en;
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xs font-medium text-foreground">{name}</p>
      <div className="flex flex-wrap gap-1">
        {entry.regulatory_code && (
          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-primary/10 text-primary">
            {entry.regulatory_code}
          </span>
        )}
        {entry.hazard_level && (
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
            entry.hazard_level === "hazardous"
              ? "bg-red-100 text-red-700"
              : entry.hazard_level === "inert"
              ? "bg-slate-100 text-slate-600"
              : "bg-green-100 text-green-700"
          }`}>
            {entry.hazard_level}
          </span>
        )}
        {entry.physical_state && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700">
            {entry.physical_state}
          </span>
        )}
      </div>
    </div>
  );
}

function MwanSummaryPanel({
  dealId,
  onRequestOpenTrForm,
}: {
  dealId: string;
  onRequestOpenTrForm?: () => void;
}) {
  const { t } = useT();
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);

  const { data, isLoading, error } = useQuery<MwanSummary>({
    queryKey: ["mwan-summary", dealId],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/deals/${dealId}/mwan-summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("mwan fetch failed");
      return res.json() as Promise<MwanSummary>;
    },
    enabled: true,
    staleTime: 60_000,
  });

  const CHECK_LABELS: Record<string, string> = {
    generator_cr: t("mwan.check.cr"),
    generator_license: t("mwan.check.license"),
    generator_city: t("mwan.check.city"),
    receiver_cr: t("mwan.check.cr"),
    receiver_license: t("mwan.check.license"),
    receiver_city: t("mwan.check.city"),
    waste_defined: t("mwan.check.waste_defined"),
    quantity_confirmed: t("mwan.check.quantity_confirmed"),
    payment_confirmed: t("mwan.check.payment_confirmed"),
    transport_request_created: t("mwan.check.transport_created"),
    transporter_assigned: t("mwan.check.transporter_assigned"),
    vehicle_plate_set: t("mwan.check.vehicle_plate_set"),
    pickup_city_set: t("mwan.check.pickup_city"),
    delivery_city_set: t("mwan.check.delivery_city"),
    waste_description_set: t("mwan.check.waste_description"),
  };

  const missingCount = data ? Object.values(data.checks).filter((v) => !v).length : null;

  const CHECK_SECTIONS: { key: string; checks: string[] }[] = [
    { key: "generator", checks: ["generator_cr", "generator_license", "generator_city"] },
    { key: "receiver",  checks: ["receiver_cr", "receiver_license", "receiver_city"] },
    { key: "deal",      checks: ["waste_defined", "quantity_confirmed", "payment_confirmed"] },
    { key: "transport", checks: [
      "transport_request_created", "transporter_assigned", "vehicle_plate_set",
      "pickup_city_set", "delivery_city_set", "waste_description_set",
    ]},
  ];

  const SECTION_LABELS: Record<string, string> = {
    generator: t("mwan.section.generator"),
    receiver:  t("mwan.section.receiver"),
    deal:      t("mwan.section.deal"),
    transport: t("mwan.section.transport"),
  };

  return (
    <div className="border-t border-border">
      {/* Always-visible readiness banner */}
      {data && (
        <div className={`flex items-center gap-2 px-4 py-2 text-xs font-medium border-b ${
          data.is_manifest_ready
            ? "bg-green-50 border-green-100 text-green-700"
            : "bg-amber-50 border-amber-100 text-amber-700"
        }`}>
          {data.is_manifest_ready
            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            : <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          }
          <span>
            {data.is_manifest_ready
              ? t("mwan.banner.ready")
              : missingCount === 1
                ? t("mwan.banner.missing_one")
                : t("mwan.banner.missing_many").replace("{n}", String(missingCount))
            }
          </span>
          <span className="ms-auto font-mono text-[10px] opacity-70">{data.readiness_score}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <FileTextIcon className="h-4 w-4 shrink-0" />
          {t("mwan.title")}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("mwan.loading")}
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {t("mwan.error")}
            </div>
          ) : data ? (
            <>
              {/* Parties */}
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { label: t("mwan.section.generator"), party: data.generator },
                  { label: t("mwan.section.receiver"),  party: data.receiver },
                  { label: t("mwan.section.transporter"), party: data.transporter },
                ].map(({ label, party }) => (
                  <div key={label} className="rounded-lg border border-border bg-card p-2.5 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                    {party ? (
                      <>
                        <p className="text-xs font-medium text-foreground">{party.name}</p>
                        {party.city && (
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />{party.city}
                          </p>
                        )}
                        {party.license_number && (
                          <p className="text-[11px] text-muted-foreground">#{party.license_number}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t("transport.not_assigned")}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Waste Taxonomy section */}
              {data.waste_taxonomy && (data.waste_taxonomy.category || data.waste_taxonomy.subcategory) && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Tag className="h-3 w-3 shrink-0" />
                    {t("mwan.section.taxonomy")}
                  </div>
                  <div className="px-3 py-2.5 space-y-2.5">
                    {data.waste_taxonomy.category && (
                      <TaxonomyRow
                        label={t("taxonomy.category")}
                        entry={data.waste_taxonomy.category}
                      />
                    )}
                    {data.waste_taxonomy.subcategory && (
                      <TaxonomyRow
                        label={t("taxonomy.subcategory")}
                        entry={data.waste_taxonomy.subcategory}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Transport route summary */}
              {data.transport && (data.transport.pickup_city || data.transport.delivery_city) && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                  <span>{data.transport.pickup_city ?? "—"}</span>
                  <span className="text-muted-foreground/40">→</span>
                  <Truck className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                  <span>{data.transport.delivery_city ?? "—"}</span>
                </div>
              )}

              {/* Manifest ref badge */}
              {data.transport?.manifest_ref && (
                <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                  <FileTextIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-primary/60 uppercase tracking-wide">{t("deal.manifest_ref.label")}</p>
                    <p className="text-xs font-bold font-mono text-primary" dir="ltr">{data.transport.manifest_ref}</p>
                  </div>
                  {data.transport.pickup_facility_name && (
                    <div className="text-right text-[10px] text-muted-foreground">
                      <p className="truncate max-w-[100px]">{data.transport.pickup_facility_name}</p>
                      {data.transport.delivery_facility_name && (
                        <p className="truncate max-w-[100px]">→ {data.transport.delivery_facility_name}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sectioned checklist */}
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("mwan.section.checklist")}
                </p>
                {CHECK_SECTIONS.map((section) => {
                  const sectionChecks = section.checks.filter((k) => k in data.checks);
                  if (sectionChecks.length === 0) return null;
                  const allDone = sectionChecks.every((k) => data.checks[k]);
                  return (
                    <div key={section.key} className="rounded-lg border border-border overflow-hidden">
                      <div className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide ${
                        allDone ? "bg-green-50/60 text-green-700" : "bg-muted/40 text-muted-foreground"
                      }`}>
                        {allDone
                          ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                          : <Circle className="h-3 w-3 shrink-0 opacity-50" />
                        }
                        {SECTION_LABELS[section.key]}
                      </div>
                      <div className="divide-y divide-border">
                        {sectionChecks.map((key) => {
                          const ok = data.checks[key] ?? false;
                          const label = CHECK_LABELS[key] ?? key;
                          const actionText = !ok ? t(`mwan.action.${key}`) : undefined;
                          const isTrCheck = [
                            "transport_request_created", "transporter_assigned",
                            "vehicle_plate_set", "pickup_city_set", "delivery_city_set",
                            "waste_description_set",
                          ].includes(key);
                          return (
                            <div key={key} className={`flex items-start gap-2.5 px-3 py-2 text-xs ${
                              ok ? "bg-background" : "bg-amber-50/40"
                            }`}>
                              {ok
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                                : <Circle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                              }
                              <span className="flex-1 min-w-0">
                                <span className={ok ? "text-foreground" : "text-foreground/80 font-medium"}>
                                  {label}
                                </span>
                                {actionText && (
                                  <span className="block text-[10px] text-amber-700/80 leading-tight mt-0.5">
                                    → {actionText}
                                  </span>
                                )}
                              </span>
                              {!ok && isTrCheck && onRequestOpenTrForm && (
                                <button
                                  type="button"
                                  onClick={onRequestOpenTrForm}
                                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                  {t("mwan.action.add_now")}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ── V3b — Create Transport Request inline form ────────────────────────────────

function CreateTransportRequestForm({
  dealId,
  defaultPickupCity = "",
  defaultDeliveryCity = "",
  defaultWasteDesc = "",
  defaultCategoryId = "",
  defaultSubcategoryId = "",
  defaultPickupFacility = "",
  defaultDeliveryFacility = "",
  externalOpen,
  onExternalOpen,
}: {
  dealId: string;
  defaultPickupCity?: string;
  defaultDeliveryCity?: string;
  defaultWasteDesc?: string;
  defaultCategoryId?: string;
  defaultSubcategoryId?: string;
  defaultPickupFacility?: string;
  defaultDeliveryFacility?: string;
  externalOpen?: boolean;
  onExternalOpen?: () => void;
}) {
  const { t } = useT();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const [transportMode, setTransportMode] = useState<"platform" | "self_managed">("platform");
  const [pickupCity, setPickupCity] = useState(defaultPickupCity);
  const [deliveryCity, setDeliveryCity] = useState(defaultDeliveryCity);
  const [wasteDesc, setWasteDesc] = useState(defaultWasteDesc);
  const [pickupFacility, setPickupFacility] = useState(defaultPickupFacility);
  const [deliveryFacility, setDeliveryFacility] = useState(defaultDeliveryFacility);
  const [transporterName, setTransporterName] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [wasteCategoryId, setWasteCategoryId] = useState(defaultCategoryId);
  const [wasteSubcategoryId, setWasteSubcategoryId] = useState(defaultSubcategoryId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { data: allCategories = [] } = useGetMaterialCategories();
  const topLevelCats = (allCategories as MaterialCategory[]).filter((c) => !c.parent_id);
  const subcats = (allCategories as MaterialCategory[]).filter(
    (c) => c.parent_id === wasteCategoryId,
  );

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/deals/${dealId}/transport-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          transport_mode: transportMode,
          pickup_city: pickupCity.trim() || null,
          delivery_city: deliveryCity.trim() || null,
          waste_description: wasteDesc.trim() || null,
          transporter_name: transportMode === "self_managed" ? transporterName.trim() || null : null,
          vehicle_plate: vehiclePlate.trim() || null,
          waste_category_id: wasteCategoryId || null,
          waste_subcategory_id: wasteSubcategoryId || null,
          pickup_facility_name: pickupFacility.trim() || null,
          delivery_facility_name: deliveryFacility.trim() || null,
        }),
      });
      if (res.status === 409) {
        setDone(true);
        void queryClient.invalidateQueries({ queryKey: ["mwan-summary", dealId] });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? `HTTP ${res.status}`);
      }
      setDone(true);
      void queryClient.invalidateQueries({ queryKey: ["mwan-summary", dealId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("deal.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="border-t border-border px-4 py-3 flex items-center gap-2 text-sm text-green-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {t("transport.create.success")}
      </div>
    );
  }

  return (
    <div className="border-t border-border" id={`tr-form-${dealId}`}>
      <button
        type="button"
        onClick={() => {
          if (onExternalOpen && !open) {
            onExternalOpen();
          } else {
            setInternalOpen((v) => !v);
          }
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Truck className="h-4 w-4 shrink-0" />
          {t("transport.create.title")}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-muted-foreground">{t("transport.create.prefilled")}</p>

          {/* Transport mode choice */}
          <div>
            <p className="text-xs font-medium text-foreground mb-1.5">{t("transport.create.mode.label")}</p>
            <div className="grid grid-cols-2 gap-2">
              {(["platform", "self_managed"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTransportMode(mode)}
                  className={[
                    "rounded-lg border px-3 py-2 text-start transition-colors",
                    transportMode === mode
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  ].join(" ")}
                >
                  <p className="text-xs font-medium leading-tight">{t(`transport.create.mode.${mode}`)}</p>
                  <p className="text-[10px] mt-0.5 leading-snug opacity-75">{t(`transport.create.mode.${mode}.desc`)}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {/* Transporter name — only for self_managed */}
            {transportMode === "self_managed" && (
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  {t("transport.create.transporter_name")}
                </label>
                <Input
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  placeholder={t("transport.create.transporter_name.placeholder")}
                  className="h-8 text-sm"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  {t("transport.create.pickup_city")}
                </label>
                <Input
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  placeholder={t("transport.create.pickup_city")}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  {t("transport.create.delivery_city")}
                </label>
                <Input
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  placeholder={t("transport.create.delivery_city")}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  {t("transport.create.pickup_facility")}
                </label>
                <Input
                  value={pickupFacility}
                  onChange={(e) => setPickupFacility(e.target.value)}
                  placeholder={t("transport.create.pickup_facility.placeholder")}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  {t("transport.create.delivery_facility")}
                </label>
                <Input
                  value={deliveryFacility}
                  onChange={(e) => setDeliveryFacility(e.target.value)}
                  placeholder={t("transport.create.delivery_facility.placeholder")}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            {/* Waste Category + Subcategory dropdowns */}
            <div className={`grid gap-2 ${subcats.length > 0 ? "grid-cols-2" : ""}`}>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  {t("taxonomy.category")}
                </label>
                <Select
                  value={wasteCategoryId}
                  onValueChange={(v) => { setWasteCategoryId(v); setWasteSubcategoryId(""); }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t("listing.form.material")} />
                  </SelectTrigger>
                  <SelectContent>
                    {topLevelCats.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        {cat.name_ar} / {cat.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {subcats.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">
                    {t("taxonomy.subcategory")}
                  </label>
                  <Select value={wasteSubcategoryId} onValueChange={setWasteSubcategoryId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t("listing.form.subcategory.placeholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {subcats.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id} className="text-xs">
                          {sub.name_ar} / {sub.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                {t("transport.create.waste_desc")}
              </label>
              <Input
                value={wasteDesc}
                onChange={(e) => setWasteDesc(e.target.value)}
                placeholder={t("transport.create.waste_desc")}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                {t("transport.create.vehicle_plate")}
              </label>
              <Input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="e.g. 1234 ABC"
                className="h-8 text-sm font-mono uppercase"
                dir="ltr"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("transport.create.vehicle_plate.hint")}</p>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
          <Button
            size="sm"
            onClick={submit}
            disabled={loading}
            className="w-full h-8"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 me-2 animate-spin" />}
            {t("transport.create.submit")}
          </Button>
        </div>
      )}
    </div>
  );
}

/** V4 — Print deal report (opens a new window) */
function printDealReport(
  deal: DealInfo,
  role: "producer" | "buyer",
  unit: string,
  lang: string,
  t: (k: string) => string,
  opts: {
    listingRef?: string;
    listingMaterial?: string;
    listingCategory?: string;
    listingQuantity?: number;
    myCompanyName?: string;
    myPhone?: string;
  },
) {
  const producerName = role === "producer"
    ? (opts.myCompanyName ?? "—")
    : (deal.counterparty?.name ?? "—");
  const producerPhone = role === "producer"
    ? (opts.myPhone ?? "")
    : (deal.counterparty?.contact_phone ?? "");
  const buyerName = role === "buyer"
    ? (opts.myCompanyName ?? "—")
    : (deal.counterparty?.name ?? "—");
  const buyerPhone = role === "buyer"
    ? (opts.myPhone ?? "")
    : (deal.counterparty?.contact_phone ?? "");

  const statusMap: Record<DealStatus, string> = {
    active: lang === "ar" ? "انتظار تأكيد الدفع" : "Awaiting payment",
    payment_confirmed: lang === "ar" ? "تم تأكيد الدفع" : "Payment confirmed",
    dispatched: lang === "ar" ? "البضاعة في الطريق" : "In transit",
    completed: lang === "ar" ? "مكتملة" : "Completed",
  };

  const timelineRows = [
    { label: t("deal.timeline.offer_accepted"), ts: deal.created_at },
    { label: t("deal.timeline.payment_confirmed"), ts: deal.payment_confirmed_at },
    { label: t("deal.timeline.dispatched"), ts: deal.dispatched_at },
    { label: t("deal.timeline.received"), ts: deal.received_at },
  ];

  const formatTs = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
          year: "numeric", month: "short", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : t("deal.timeline.pending_label");

  const dir = lang === "ar" ? "rtl" : "ltr";
  const marginStart = dir === "rtl" ? "margin-right" : "margin-left";
  const totalValue = (deal.final_amount ?? deal.estimated_amount).toLocaleString();
  const ref = dealRef(deal.id, deal.created_at);

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="utf-8"/>
  <title>${lang === "ar" ? "سجل العملية التجارية" : "Transaction Record"} — ${ref}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Tajawal,Arial,sans-serif;color:#111;padding:36px;direction:${dir};font-size:13px;background:#fff}
    .header{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:3px solid #16a34a}
    .logo-icon{width:48px;height:48px;background:linear-gradient(135deg,#1e40af,#16a34a);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;font-weight:700;flex-shrink:0;text-align:center;line-height:48px}
    .logo-name{font-size:22px;font-weight:700;color:#1e40af}
    .logo-tag{font-size:11px;color:#6b7280}
    .ref-box{${marginStart}:auto;text-align:${dir === "rtl" ? "right" : "left"}}
    .ref-label{font-size:10px;color:#6b7280}
    .ref-value{font-size:16px;font-weight:700;color:#1e40af;font-family:monospace;direction:ltr;display:block}
    .doc-note{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 14px;margin-bottom:20px;font-size:11px;color:#1d4ed8}
    .total-box{background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
    .total-label{font-size:11px;color:#4b7a58;margin-bottom:2px}
    .total-value{font-size:26px;font-weight:700;color:#1e40af}
    .total-status{display:inline-block;background:#dcfce7;border:1px solid #86efac;color:#166534;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    td{padding:8px 10px;border:1px solid #e5e7eb;vertical-align:top}
    td:first-child{font-weight:600;background:#f9fafb;width:36%;color:#374151}
    .phone-cell{font-family:monospace;font-size:14px;direction:ltr;color:#1e40af;font-weight:700;display:block;margin-top:2px}
    h2{font-size:12px;font-weight:700;color:#1e40af;margin:20px 0 8px;border-bottom:2px solid #dbeafe;padding-bottom:4px;text-transform:uppercase;letter-spacing:0.05em}
    .timeline-row{display:flex;gap:12px;margin-bottom:8px;align-items:flex-start}
    .tl-dot{width:10px;height:10px;border-radius:50%;background:#1e40af;margin-top:3px;flex-shrink:0}
    .tl-dot.pending{background:#d1d5db}
    .tl-label{font-size:12px;font-weight:600}
    .tl-ts{font-size:11px;color:#6b7280}
    .footer{margin-top:32px;border-top:1px solid #e5e7eb;padding-top:14px;text-align:center;font-size:11px;color:#9ca3af}
    .footer strong{color:#6b7280}
    @media print{body{padding:20px}}
  </style>
</head>
<body>

  <div class="header">
    <div class="logo-icon">ت</div>
    <div>
      <div class="logo-name">تدويرة</div>
      <div class="logo-tag">Tadweerah · منصة إدارة المواد القابلة للتدوير</div>
    </div>
    <div class="ref-box">
      <div class="ref-label">${lang === "ar" ? "رقم مرجع الصفقة" : "Deal Reference"}</div>
      <span class="ref-value">${ref}</span>
      ${opts.listingRef ? `<div class="ref-label" style="margin-top:4px">${opts.listingRef}</div>` : ""}
    </div>
  </div>

  <div class="doc-note">
    ${lang === "ar"
      ? `هذه الوثيقة سجل للعملية التجارية تم توثيقها عبر منصة تدويرة. تاريخ إنشاء الصفقة: ${formatTs(deal.created_at)}`
      : `This document is a transaction record documented via Tadweerah platform. Deal created: ${formatTs(deal.created_at)}`}
  </div>

  <div class="total-box">
    <div>
      <div class="total-label">${lang === "ar" ? "القيمة الإجمالية للصفقة" : "Total Deal Value"}</div>
      <div class="total-value">${totalValue} ${lang === "ar" ? "ريال" : "SAR"}</div>
    </div>
    <div><span class="total-status">${statusMap[deal.status]}</span></div>
  </div>

  <h2>${lang === "ar" ? "أطراف الصفقة والتواصل" : "Parties & Contact"}</h2>
  <table>
    <tr>
      <td>${t("deal.print.producer")}</td>
      <td>
        <span style="font-weight:600">${producerName}</span>
        ${producerPhone
          ? `<span class="phone-cell">${producerPhone}</span>`
          : `<span style="color:#9ca3af;font-size:12px;display:block;margin-top:2px">${lang === "ar" ? "رقم التواصل غير متاح" : "Contact number not available"}</span>`}
      </td>
    </tr>
    <tr>
      <td>${t("deal.print.buyer")}</td>
      <td>
        <span style="font-weight:600">${buyerName}</span>
        ${buyerPhone
          ? `<span class="phone-cell">${buyerPhone}</span>`
          : `<span style="color:#9ca3af;font-size:12px;display:block;margin-top:2px">${lang === "ar" ? "رقم التواصل غير متاح" : "Contact number not available"}</span>`}
      </td>
    </tr>
  </table>

  <h2>${lang === "ar" ? "تفاصيل المادة والسعر" : "Material & Price"}</h2>
  <table>
    ${opts.listingCategory ? `<tr><td>${lang === "ar" ? "الفئة" : "Category"}</td><td>${opts.listingCategory}</td></tr>` : ""}
    ${opts.listingMaterial ? `<tr><td>${t("deal.print.material")}</td><td>${opts.listingMaterial}</td></tr>` : ""}
    ${opts.listingQuantity != null ? `<tr><td>${t("deal.print.quantity")}</td><td>${opts.listingQuantity.toLocaleString()} ${unit}</td></tr>` : ""}
    <tr><td>${t("deal.print.price_per_unit")}</td><td>${deal.price_per_unit.toLocaleString()} ${lang === "ar" ? "ريال" : "SAR"} / ${unit}</td></tr>
    <tr><td>${t("deal.print.total_value")}</td><td style="font-weight:700;color:#1e40af">${totalValue} ${lang === "ar" ? "ريال" : "SAR"}</td></tr>
    ${deal.payment_reference ? `<tr><td>${lang === "ar" ? "رقم الدفعة" : "Payment Reference"}</td><td>${deal.payment_reference}</td></tr>` : ""}
  </table>

  <h2>${t("deal.print.timeline")}</h2>
  <div style="margin-bottom:20px">
    ${timelineRows.map((row) => `
    <div class="timeline-row">
      <div class="tl-dot${row.ts ? "" : " pending"}"></div>
      <div><div class="tl-label">${row.label}</div><div class="tl-ts">${formatTs(row.ts)}</div></div>
    </div>`).join("")}
  </div>
  ${deal.status === "completed" ? `<p style="margin-bottom:16px"><span class="total-status">✓ ${t("deal.compliance.badge")}</span></p>` : ""}

  <div class="footer">
    <strong>تدويرة — Tadweerah</strong>
    &nbsp;·&nbsp; ${lang === "ar" ? "وُثِّقت عبر المنصة" : "Documented via platform"}
    &nbsp;|&nbsp; ${t("deal.print.generated_at")}: ${new Date().toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}
  </div>
  <script>window.onload=function(){window.print()}<\/script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

export function DealPanel({ deal, role, unit, onUpdate, pricingModel, revenueSharePct, listingRef, listingMaterial, listingQuantity, myCompanyName, listingCategory, myPhone, listingCity, counterpartyCity, listingDescription, listingCategoryId, listingSubcategoryId }: DealPanelProps) {
  const { t, lang } = useT();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualQty, setActualQty] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [copied, setCopied] = useState(false);
  const [trFormOpen, setTrFormOpen] = useState(false);

  function openTrFormAndScroll() {
    setTrFormOpen(true);
    setTimeout(() => {
      document.getElementById(`tr-form-${deal.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function copyDealRef() {
    const ref = dealRef(deal.id, deal.created_at);
    navigator.clipboard.writeText(ref).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentStepIndex = STATUS_STEPS.indexOf(deal.status);

  async function executeAction(
    action: "confirm-payment" | "confirm-dispatch" | "confirm-receipt",
    body?: object,
  ) {
    setLoading(true);
    setError(null);
    setPendingAction(null);
    try {
      const authToken = await getToken();
      const updated = await callDealApi(deal.id, action, body, authToken);
      onUpdate(updated);
    } catch (e) {
      if (e instanceof DealApiError) {
        const CODE_TO_I18N: Record<string, string> = {
          VehiclePlateRequired:      "deal.error.vehicle_plate_required",
          TransportRequestRequired:  "deal.error.transport_request_required",
          ActualQuantityRequired:    "deal.error.quantity_required_for_dispatch",
          CommercialRegistrationRequired: "cr.gate.offer",
        };
        const key = CODE_TO_I18N[e.code];
        setError(key ? t(key) : e.message);
      } else {
        setError(e instanceof Error ? e.message : t("deal.error.generic"));
      }
    } finally {
      setLoading(false);
    }
  }

  function requestConfirmPayment() {
    if (!paymentRef.trim()) {
      setError(t("deal.error.payment_reference_required"));
      return;
    }
    setError(null);
    setPendingAction("confirm-payment");
  }

  function requestConfirmDispatch() {
    if (deal.settlement_type === "by_weight") {
      const qty = parseFloat(actualQty);
      if (!actualQty || isNaN(qty) || qty <= 0) {
        setError(t("deal.error.quantity_required_for_dispatch"));
        return;
      }
    }
    setError(null);
    setPendingAction("confirm-dispatch");
  }

  function handleConfirmed() {
    if (!pendingAction) return;
    if (pendingAction === "confirm-payment") {
      const body: Record<string, unknown> = {
        payment_reference: paymentRef.trim(),
      };
      if (paymentProofUrl.trim()) {
        body.payment_proof_url = paymentProofUrl.trim();
      }
      executeAction("confirm-payment", body);
    } else if (pendingAction === "confirm-dispatch" && deal.settlement_type === "by_weight") {
      executeAction("confirm-dispatch", { actual_quantity: parseFloat(actualQty) });
    } else {
      executeAction(pendingAction);
    }
  }

  const statusLabel = (s: DealStatus) => t(`deal.status.${s}`);

  const statusBadgeVariant = (s: DealStatus): "default" | "secondary" | "outline" => {
    if (s === "completed") return "default";
    if (s === "active") return "secondary";
    return "outline";
  };

  const waitingText =
    deal.status !== "completed" ? t(`deal.waiting.${deal.status}`) : null;

  const isMyTurn =
    (role === "producer" && (deal.status === "active" || deal.status === "payment_confirmed")) ||
    (role === "buyer" && deal.status === "dispatched");

  const confirmDialogProps: Record<
    Exclude<PendingAction, null>,
    { title: string; desc: string; label: string }
  > = {
    "confirm-payment": {
      title: t("deal.confirm.payment.title"),
      desc: t("deal.confirm.payment.desc"),
      label: t("deal.action.confirm_payment"),
    },
    "confirm-dispatch": {
      title: t("deal.confirm.dispatch.title"),
      desc: t("deal.confirm.dispatch.desc"),
      label: t("deal.action.confirm_dispatch"),
    },
    "confirm-receipt": {
      title: t("deal.confirm.receipt.title"),
      desc: t("deal.confirm.receipt.desc"),
      label: t("deal.action.confirm_receipt"),
    },
  };

  const activeDialog = pendingAction ? confirmDialogProps[pendingAction] : null;

  return (
    <>
      {activeDialog && (
        <ConfirmDialog
          open={!!pendingAction}
          onOpenChange={(open) => { if (!open) setPendingAction(null); }}
          title={activeDialog.title}
          description={activeDialog.desc}
          confirmLabel={activeDialog.label}
          onConfirm={handleConfirmed}
          isPending={loading}
        />
      )}

      <div className="rounded-xl border border-primary/20 bg-primary/5 space-y-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-primary/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-primary text-sm">{t("deal.panel.title")}</span>
              {(listingMaterial || deal.counterparty?.name) && (
                <p className="text-xs text-primary/70 mt-0.5 truncate">
                  {[listingMaterial, deal.counterparty?.name].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-sm font-bold font-mono text-primary tracking-wider" dir="ltr">
                  {dealRef(deal.id, deal.created_at)}
                </span>
                <button
                  type="button"
                  onClick={copyDealRef}
                  className="flex items-center gap-1 text-primary/60 hover:text-primary transition-colors"
                  aria-label={t("deal.ref.copy")}
                >
                  {copied
                    ? <Check className="h-3.5 w-3.5 text-green-600" />
                    : <Copy className="h-3.5 w-3.5" />}
                  {copied && <span className="text-[10px] text-green-600 font-medium">{t("deal.ref.copied")}</span>}
                </button>
              </div>
            </div>
            <Badge variant={statusBadgeVariant(deal.status)} className="shrink-0">
              {statusLabel(deal.status)}
            </Badge>
          </div>

          {pricingModel === "revenue_share" && revenueSharePct != null && (
            <div className="flex items-center gap-1.5 text-xs text-primary/80 font-medium border border-primary/20 rounded-md px-2 py-1 bg-primary/5 w-fit">
              <Percent className="h-3 w-3 shrink-0" />
              <span>{t("listing.pricing_model.revenue_share")} — {revenueSharePct}%</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-primary/80 font-medium">
              {role === "producer"
                ? <UserCog className="h-3.5 w-3.5 shrink-0" />
                : <UserCheck className="h-3.5 w-3.5 shrink-0" />}
              <span>{t(`deal.role.${role}`)}</span>
            </div>
            {deal.status !== "completed" && (
              <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                isMyTurn
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                  : "bg-muted text-muted-foreground"
              }`}>
                {isMyTurn
                  ? <><AlertCircle className="h-3 w-3 shrink-0" />{t("deal.role.your_turn")}</>
                  : <><Clock className="h-3 w-3 shrink-0" />{t("deal.role.not_your_turn")}</>
                }
              </div>
            )}
          </div>
        </div>

        {/* V6 — Compliance badge (completed deals) */}
        {deal.status === "completed" && (
          <div className="px-4 py-2.5 flex items-center gap-2 bg-green-50 border-b border-green-200/60">
            <Shield className="h-4 w-4 text-green-700 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-green-800">{t("deal.compliance.badge")}</span>
              <span className="mx-2 text-green-400 text-xs">·</span>
              <span className="text-xs text-green-700">{t("deal.compliance.tagline")}</span>
            </div>
            {listingRef && (
              <span className="text-[10px] text-green-600 font-mono shrink-0">{listingRef}</span>
            )}
          </div>
        )}

        {/* V5 — Smart contextual message */}
        {deal.status === "completed" && (
          <div className="px-4 py-2 bg-muted/30 border-b border-border">
            <p className="text-xs text-muted-foreground">{t("deal.smart.deal_completed")}</p>
          </div>
        )}

        {/* Contact — prominent congratulations card */}
        {deal.counterparty && (
          <div className="border-b border-green-200">
            <div className="px-4 py-3 flex items-start gap-3 bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-green-900">{t("deal.contact.congratulations")}</p>
                <p className="text-xs text-green-700 mt-0.5">{t("deal.contact.can_now_contact")}</p>
                <p className="text-xs text-green-600 mt-1 font-medium">{t("deal.contact.recorded_hint")}</p>
              </div>
            </div>
            <div className="px-4 py-3 bg-background">
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">{t("deal.contact.counterparty_label")}</p>
              <p className="font-bold text-base text-foreground leading-tight">{deal.counterparty.name}</p>
              {deal.counterparty.contact_phone ? (
                <a
                  href={`tel:${deal.counterparty.contact_phone}`}
                  dir="ltr"
                  className="inline-flex items-center gap-2 mt-2 text-primary font-bold text-lg hover:underline"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {deal.counterparty.contact_phone}
                </a>
              ) : (
                <p className="text-sm text-amber-700 font-medium mt-2 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  {t("deal.contact.phone_missing")}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground/60 mt-3 border-t border-border pt-2">
                <a href="mailto:info@tadweerah.com" className="hover:text-primary transition-colors">
                  {t("support.deal_panel")}
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Settlement summary */}
        <div className="px-4 py-3 space-y-2 border-b border-primary/10 bg-background">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">{t("deal.settlement.label")}</span>
            <span className="font-medium text-end">
              {t(`deal.settlement.${deal.settlement_type}`)}
            </span>

            <span className="text-muted-foreground">{t("deal.field.price_per_unit")}</span>
            <span className="font-medium text-end">
              {deal.price_per_unit.toLocaleString()} {t("listing.sar")} / {unit}
            </span>

            <span className="text-muted-foreground">{t("deal.field.estimated_amount")}</span>
            <span className="font-medium text-end">
              {deal.estimated_amount.toLocaleString()} {t("listing.sar")}
            </span>

            {deal.actual_quantity != null && (
              <>
                <span className="text-muted-foreground">{t("deal.field.actual_quantity")}</span>
                <span className="font-semibold text-end">
                  {deal.actual_quantity.toLocaleString()} {unit}
                </span>
              </>
            )}

            {deal.final_amount != null && (
              <>
                <span className="text-muted-foreground font-semibold">{t("deal.field.final_amount")}</span>
                <span className="font-bold text-primary text-end">
                  {deal.final_amount.toLocaleString()} {t("listing.sar")}
                </span>
              </>
            )}

            <span className="text-muted-foreground">{t("deal.created_on")}</span>
            <span className="font-medium text-end text-xs">
              {new Date(deal.created_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
                year: "numeric", month: "short", day: "numeric",
              })}
            </span>
          </div>
          {deal.settlement_type === "by_weight" && deal.final_amount == null && (
            <p className="text-xs text-muted-foreground">{t("deal.disclaimer")}</p>
          )}
        </div>

        {/* Status stepper */}
        <div className="px-4 py-3 border-b border-primary/10 bg-background space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("deal.stepper.title")}</span>
            <span className="text-xs text-muted-foreground">
              {currentStepIndex + 1} / {STATUS_STEPS.length}
            </span>
          </div>
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => {
              const done = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex && deal.status !== "completed";
              const isLast = i === STATUS_STEPS.length - 1;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    {isCurrent ? (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 relative" />
                      </div>
                    ) : done ? (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
                    )}
                    <span
                      className={`text-center text-[10px] leading-tight ${
                        isCurrent
                          ? "text-primary font-bold"
                          : done
                            ? "text-primary/70 font-medium"
                            : "text-muted-foreground/50"
                      }`}
                      style={{ maxWidth: "60px" }}
                    >
                      {statusLabel(step)}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`h-0.5 flex-1 mx-1 mb-5 rounded-full ${i < currentStepIndex ? "bg-primary" : "bg-muted"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Role-based actions */}
        {deal.status !== "completed" && (
          <div className="px-4 py-3 space-y-3 border-b border-primary/10 bg-background">
            <div className={`rounded-md px-3 py-2 text-xs leading-relaxed ${
              isMyTurn
                ? "bg-amber-50 border border-amber-200 text-amber-800"
                : "bg-muted/60 text-muted-foreground"
            }`}>
              {t(`deal.stage.action.${deal.status}.${role}`)}
            </div>

            {role === "producer" && deal.status === "active" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    {t("deal.field.payment_reference")} *
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => { setPaymentRef(e.target.value); setError(null); }}
                    placeholder={t("deal.field.payment_reference.placeholder")}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    dir="ltr"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">{t("deal.field.payment_reference.hint")}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t("deal.field.payment_proof_url")}
                  </label>
                  <input
                    type="url"
                    value={paymentProofUrl}
                    onChange={(e) => setPaymentProofUrl(e.target.value)}
                    placeholder={t("deal.field.payment_proof_url.placeholder")}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    dir="ltr"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={requestConfirmPayment}
                  disabled={loading}
                >
                  {loading && pendingAction === null && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("deal.action.confirm_payment")}
                </Button>
              </div>
            )}

            {role === "producer" && deal.status === "payment_confirmed" && (
              <div className="space-y-3">
                {deal.settlement_type === "by_weight" && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      {t("deal.field.actual_quantity")} *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={actualQty}
                        onChange={(e) => { setActualQty(e.target.value); setError(null); }}
                        placeholder={t("deal.field.quantity.placeholder")}
                        className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-start"
                        dir="ltr"
                      />
                      <span className="text-sm text-muted-foreground shrink-0">{unit}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("deal.field.actual_quantity.dispatch_hint")}</p>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={requestConfirmDispatch}
                  disabled={loading}
                >
                  {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("deal.action.confirm_dispatch")}
                </Button>
              </div>
            )}

            {role === "buyer" && deal.status === "dispatched" && (
              <Button
                className="w-full"
                onClick={() => setPendingAction("confirm-receipt")}
                disabled={loading}
              >
                {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("deal.action.confirm_receipt")}
              </Button>
            )}

            {(deal.status as string) !== "completed" && !isMyTurn && waitingText && (
              <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground text-center leading-relaxed">
                {waitingText}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Next Step Banner */}
        <NextStepBanner deal={deal} role={role} onOpenTrForm={openTrFormAndScroll} />

        {/* Deal Progress Bar */}
        <DealProgressBar deal={deal} />

        {/* V1 — Deal Value Summary (producer only, auction only) */}
        {role === "producer" && pricingModel !== "revenue_share" && deal.listing_id && (
          <DealValueSummary
            listingId={deal.listing_id}
            acceptedPricePerUnit={deal.price_per_unit}
            estimatedAmount={deal.estimated_amount}
            unit={unit}
          />
        )}

        {/* V2 — Governance Timeline */}
        <GovernanceTimeline deal={deal} lang={lang} />

        {/* V3b — Create Transport Request (payment_confirmed+ only, pre-filled) */}
        {["payment_confirmed", "dispatched", "completed"].includes(deal.status) && (
          <CreateTransportRequestForm
            dealId={deal.id}
            defaultPickupCity={listingCity ?? ""}
            defaultDeliveryCity={counterpartyCity ?? deal.counterparty?.city ?? ""}
            defaultWasteDesc={listingDescription ?? listingMaterial ?? ""}
            defaultCategoryId={listingCategoryId ?? ""}
            defaultSubcategoryId={listingSubcategoryId ?? ""}
            externalOpen={trFormOpen || undefined}
            onExternalOpen={() => setTrFormOpen(true)}
          />
        )}

        {/* V3a — MWAN Summary Panel (all statuses — score badge shows proactive readiness) */}
        <MwanSummaryPanel dealId={deal.id} onRequestOpenTrForm={openTrFormAndScroll} />

        {/* V3 — Print Report button */}
        <div className="px-4 py-3 bg-muted/10 border-t border-border">
          <button
            type="button"
            onClick={() =>
              printDealReport(deal, role, unit, lang, t, {
                listingRef,
                listingMaterial,
                listingCategory,
                listingQuantity,
                myCompanyName,
                myPhone,
              })
            }
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <Printer className="h-4 w-4 shrink-0" />
            {t("deal.print.button")}
          </button>
        </div>
      </div>
    </>
  );
}
