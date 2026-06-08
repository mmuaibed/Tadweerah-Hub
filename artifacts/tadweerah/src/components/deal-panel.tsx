import { useState, useRef, useCallback, type ReactNode } from "react";
import { fmtNumber, fmtDateTime } from "@/lib/format";
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
  Printer,
  Shield,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Truck,
  FileText as FileTextIcon,
  MapPin,
  Tag,
  Download,
  Inbox as InboxIcon,
  Package,
  X,
  Upload,
  CreditCard,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n";
import { dealRef } from "@/lib/listing-ref";
import { buildMapsUrl } from "@/lib/maps";
import {
  useGetMaterialCategories,
} from "@workspace/api-client-react";
import type { MaterialCategory } from "@workspace/api-client-react";

export type DealStatus = "active" | "payment_submitted" | "payment_confirmed" | "dispatched" | "receipt_pending" | "completed" | "expired" | "cancelled";
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
  /** VAT rate as a decimal (e.g. 0.15 = 15%). Always 0.15 for MVP. */
  vat_rate?: number | null;
  /** VAT amount = estimated_amount × vat_rate */
  vat_amount?: number | null;
  /** Total including VAT = estimated_amount + vat_amount */
  total_amount?: number | null;
  /** Transport Smart-Assist decision: null | 'not_required' */
  transport_decision?: string | null;
  /** Who is responsible for arranging and bearing transport cost: 'seller' | 'buyer' | null */
  transport_responsibility?: string | null;
  status: DealStatus;
  counterparty: {
    name: string;
    contact_phone: string;
    city?: string;
    is_verified?: boolean;
  } | null;
  payment_confirmed_at: string | null;
  payment_submitted_at: string | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
  dispatched_at: string | null;
  received_at: string | null;
  receipt_pending_since: string | null;
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
  /** Sale type (auction / direct) for deal info panel */
  listingSaleType?: string;
  /** Counterparty (buyer/receiver) city — pre-fills transport request delivery city */
  counterpartyCity?: string;
  /** Listing description — pre-fills transport request waste description */
  listingDescription?: string;
  /** Material category ID from listing — pre-selects taxonomy in TR form */
  listingCategoryId?: string;
  /** Material subcategory ID from listing — pre-selects taxonomy in TR form */
  listingSubcategoryId?: string;
  /** ReactNode rendered inside the "العروض الواردة" modal (producer only) */
  offersPanel?: ReactNode;
  /** ReactNode rendered inside the "معلومات الإعلان" modal */
  listingInfoPanel?: ReactNode;
  /** Material pickup location address (National Address / free text) */
  listingLocationAddress?: string | null;
  /** Google Maps share URL for the pickup location */
  listingMapsUrl?: string | null;
  /** Operational site details (gate, warehouse, access notes) — display only, not used for Maps search */
  listingLocationNotes?: string | null;
}

type PendingAction = "submit-payment" | "confirm-payment" | "confirm-dispatch" | "confirm-receipt" | null;

const STEPPER_DISPLAY_STEPS: Array<"active" | "payment_confirmed" | "dispatched" | "completed"> = [
  "active",
  "payment_confirmed",
  "dispatched",
  "completed",
];

function getStepperIndex(status: DealStatus): number {
  const map: Partial<Record<DealStatus, number>> = {
    active: 0,
    payment_submitted: 0,
    payment_confirmed: 1,
    dispatched: 2,
    receipt_pending: 3,
    completed: 3,
  };
  return map[status] ?? -1;
}

const TR_STEPS = [
  { key: "transport_request_created", ar: "إنشاء طلب نقل", en: "Create transport request" },
  { key: "transporter_assigned", ar: "تعيين ناقل", en: "Assign transporter" },
  { key: "vehicle_plate_set", ar: "تحديد المركبة", en: "Set vehicle plate" },
  { key: "pickup_city_set", ar: "تحديد موقع الاستلام", en: "Set pickup location" },
  { key: "delivery_city_set", ar: "تحديد موقع التسليم", en: "Set delivery location" },
] as const;

class DealApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function callDealApi(
  dealId: string,
  action: "submit-payment" | "confirm-payment" | "confirm-dispatch" | "confirm-receipt",
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
  return fmtDateTime(iso, lang);
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
  transport_decision: string | null;
  checks: Record<string, boolean>;
  generator: { name: string; city: string | null; commercial_registration?: string; license_number?: string; license_status?: string } | null;
  receiver: { name: string; city: string | null; commercial_registration?: string; license_number?: string; license_status?: string } | null;
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
      {/* MWAN eManifest integration context */}
      {data && (
        <p className="px-4 py-1.5 text-[10px] text-muted-foreground/60 italic border-b border-border/40">
          {t("mwan.helper_text")}
        </p>
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
                        <div className="flex items-start gap-1.5 flex-wrap">
                          <p className="text-xs font-medium text-foreground">{party.name}</p>
                          {"license_status" in party && party.commercial_registration && party.license_status === "approved" && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 text-green-800 text-[9px] font-bold px-1.5 py-0.5 shrink-0">
                              <Check className="h-2.5 w-2.5" />{t("company.verified")}
                            </span>
                          )}
                        </div>
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

              {/* Manifest ref badge + PDF download */}
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
                  <a
                    href={`/api/deals/${dealId}/transport-requests/${data.transport.id}/summary.pdf`}
                    download
                    className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-primary/70 hover:text-primary transition-colors border border-primary/20 rounded px-2 py-1 bg-background hover:bg-primary/5"
                    title={t("deal.pdf.download")}
                  >
                    <Download className="h-3 w-3" />
                    PDF
                  </a>
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
  const [facilitySuggestions, setFacilitySuggestions] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem("tdw_facilities");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch { return []; }
  });

  function saveFacility(name: string) {
    if (!name.trim()) return;
    setFacilitySuggestions((prev) => {
      const next = [...new Set([name.trim(), ...prev])].slice(0, 20);
      try { sessionStorage.setItem("tdw_facilities", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

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
      // Save facility names for autocomplete
      saveFacility(pickupFacility);
      saveFacility(deliveryFacility);
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
              {facilitySuggestions.length > 0 && (
                <datalist id={`tdw-facilities-${dealId}`}>
                  {facilitySuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              )}
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  {t("transport.create.pickup_facility")}
                </label>
                <Input
                  value={pickupFacility}
                  onChange={(e) => setPickupFacility(e.target.value)}
                  placeholder={t("transport.create.pickup_facility.placeholder")}
                  className="h-8 text-sm"
                  list={facilitySuggestions.length > 0 ? `tdw-facilities-${dealId}` : undefined}
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
                  list={facilitySuggestions.length > 0 ? `tdw-facilities-${dealId}` : undefined}
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
            {/* Waste code hint */}
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5 -mt-1">
              <span className="shrink-0 mt-px">ℹ️</span>
              {t("transport.create.waste_code_hint")}
            </p>

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
    pricingModel?: string;
    listingLocationAddress?: string | null;
    listingMapsUrl?: string | null;
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
    active: lang === "ar" ? "انتظار إرسال الدفع" : "Awaiting payment",
    payment_submitted: lang === "ar" ? "بانتظار تأكيد الدفع" : "Payment under review",
    payment_confirmed: lang === "ar" ? "تم تأكيد الدفع" : "Payment confirmed",
    dispatched: lang === "ar" ? "البضاعة في الطريق" : "In transit",
    receipt_pending: lang === "ar" ? "تم تأكيد الاستلام" : "Receipt confirmed",
    completed: lang === "ar" ? "مكتملة" : "Completed",
    expired: lang === "ar" ? "منتهية" : "Expired",
    cancelled: lang === "ar" ? "ملغاة" : "Cancelled",
  };

  const timelineRows = [
    { label: t("deal.timeline.offer_accepted"), ts: deal.created_at },
    { label: t("deal.timeline.payment_confirmed"), ts: deal.payment_confirmed_at },
    { label: t("deal.timeline.dispatched"), ts: deal.dispatched_at },
    { label: t("deal.timeline.received"), ts: deal.received_at },
  ];

  const formatTs = (iso: string | null) =>
    iso ? fmtDateTime(iso, lang) : t("deal.timeline.pending_label");

  const dir = lang === "ar" ? "rtl" : "ltr";
  const marginStart = dir === "rtl" ? "margin-right" : "margin-left";
  const subtotalNum = deal.final_amount ?? deal.estimated_amount;
  const totalValue = fmtNumber(subtotalNum);
  const vatAmtNum = deal.vat_amount ?? Math.round(subtotalNum * 0.15 * 1000) / 1000;
  const totalAmtNum = deal.total_amount ?? Math.round((subtotalNum + vatAmtNum) * 1000) / 1000;
  const vatValue = fmtNumber(vatAmtNum);
  const grandTotalValue = fmtNumber(totalAmtNum);
  const ref = dealRef(deal.id, deal.created_at);
  const isFixed = opts.pricingModel === "fixed";
  const sarLabel = lang === "ar" ? "ريال" : "SAR";
  const transportResp = deal.transport_responsibility
    ? (lang === "ar"
        ? (deal.transport_responsibility === "seller" ? "المورّد (البائع)" : "المشتري")
        : (deal.transport_responsibility === "seller" ? "Seller (Producer)" : "Buyer"))
    : null;

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head>
  <meta charset="utf-8"/>
  <title>${lang === "ar" ? "سجل العملية التجارية" : "Transaction Record"} — ${ref}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Tajawal,Arial,sans-serif;color:#111;padding:36px;direction:${dir};font-size:13px;background:#fff}
    .header{display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #16a34a}
    .logo-icon{width:44px;height:44px;background:linear-gradient(135deg,#1e40af,#16a34a);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:700;flex-shrink:0;line-height:1}
    .logo-block{display:flex;flex-direction:column;justify-content:center;gap:2px}
    .logo-name{font-size:20px;font-weight:700;color:#1e40af;line-height:1.2}
    .logo-tag{font-size:10px;color:#6b7280;line-height:1.3}
    .ref-box{${marginStart}:auto;text-align:end}
    .ref-label{font-size:10px;color:#6b7280}
    .ref-value{font-size:15px;font-weight:700;color:#1e40af;font-family:monospace;direction:ltr;display:block;margin-top:2px}
    .doc-note{background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:11px;color:#1d4ed8}
    .total-box{background:#f0fdf4;border:2px solid #16a34a;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
    .total-left{display:flex;flex-direction:column;gap:4px}
    .total-label{font-size:11px;color:#4b7a58}
    .total-value{font-size:24px;font-weight:700;color:#1e40af}
    .total-sub{font-size:11px;color:#6b7280;margin-top:2px}
    .total-status{display:inline-block;background:#dcfce7;border:1px solid #86efac;color:#166534;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    td{padding:7px 10px;border:1px solid #e5e7eb;vertical-align:top}
    td:first-child{font-weight:600;background:#f9fafb;width:36%;color:#374151}
    .phone-cell{font-family:monospace;font-size:14px;direction:ltr;color:#1e40af;font-weight:700;display:block;margin-top:3px}
    h2{font-size:11px;font-weight:700;color:#1e40af;margin:16px 0 6px;border-bottom:2px solid #dbeafe;padding-bottom:4px;text-transform:uppercase;letter-spacing:0.05em}
    .timeline-row{display:flex;gap:12px;margin-bottom:8px;align-items:flex-start}
    .tl-dot{width:10px;height:10px;border-radius:50%;background:#1e40af;margin-top:3px;flex-shrink:0}
    .tl-dot.pending{background:#d1d5db}
    .tl-label{font-size:12px;font-weight:600}
    .tl-ts{font-size:11px;color:#6b7280}
    .footer{margin-top:28px;border-top:1px solid #e5e7eb;padding-top:12px;text-align:center;font-size:11px;color:#9ca3af}
    .footer strong{color:#6b7280}
    @media print{body{padding:20px}@page{margin:1cm}}
  </style>
</head>
<body>

  <div class="header">
    <div class="logo-icon">ت</div>
    <div class="logo-block">
      <div class="logo-name">تدويرة</div>
      <div class="logo-tag">Tadweerah · منصة إدارة المواد القابلة للتدوير</div>
    </div>
    <div class="ref-box">
      <div class="ref-label">${lang === "ar" ? "رقم مرجع الصفقة" : "Deal Reference"}</div>
      <span class="ref-value">${ref}</span>
      ${opts.listingRef ? `<div class="ref-label" style="margin-top:3px">${opts.listingRef}</div>` : ""}
    </div>
  </div>

  <div class="doc-note">
    ${lang === "ar"
      ? `هذه الوثيقة سجل للعملية التجارية تم توثيقها عبر منصة تدويرة. تاريخ إنشاء الصفقة: ${formatTs(deal.created_at)}`
      : `This document is a transaction record documented via Tadweerah platform. Deal created: ${formatTs(deal.created_at)}`}
  </div>

  <div class="total-box">
    <div class="total-left">
      <div class="total-label">${isFixed
        ? (lang === "ar" ? "إجمالي الصفقة" : "Total Deal Value")
        : (lang === "ar" ? "القيمة الإجمالية المقدّرة" : "Estimated Total Value")}</div>
      <table style="margin:0;border:none;font-size:12px;width:auto">
        <tr><td style="border:none;background:none;font-weight:400;color:#6b7280;padding:1px 8px 1px 0;width:auto">${lang === "ar" ? "المبلغ قبل الضريبة" : "Subtotal (before VAT)"}</td><td style="border:none;background:none;font-weight:600;padding:1px 0;direction:ltr">${totalValue} ${sarLabel}</td></tr>
        <tr><td style="border:none;background:none;font-weight:400;color:#6b7280;padding:1px 8px 1px 0">${lang === "ar" ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}</td><td style="border:none;background:none;font-weight:600;padding:1px 0;direction:ltr">${vatValue} ${sarLabel}</td></tr>
        <tr><td style="border:none;background:none;font-weight:700;padding:1px 8px 1px 0">${lang === "ar" ? "الإجمالي شامل الضريبة" : "Total (incl. VAT)"}</td><td style="border:none;background:none;padding:1px 0"><div class="total-value" style="font-size:20px;margin:0">${grandTotalValue} ${sarLabel}</div></td></tr>
      </table>
      ${!isFixed ? `<div class="total-sub">${fmtNumber(deal.price_per_unit)} ${sarLabel} / ${unit}</div>` : ""}
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
    ${opts.listingQuantity != null ? `<tr><td>${t("deal.print.quantity")}</td><td>${fmtNumber(opts.listingQuantity)} ${unit}</td></tr>` : ""}
    ${isFixed
      ? `<tr><td>${lang === "ar" ? "إجمالي الصفقة" : "Total Deal Value"}</td><td style="font-weight:700;color:#1e40af">${totalValue} ${sarLabel}</td></tr>`
      : `<tr><td>${t("deal.print.price_per_unit")}</td><td>${fmtNumber(deal.price_per_unit)} ${sarLabel} / ${unit}</td></tr>
    <tr><td>${lang === "ar" ? "الإجمالي المقدَّر" : "Estimated Total"}</td><td style="font-weight:700;color:#1e40af">${totalValue} ${sarLabel}</td></tr>`}
    <tr><td>${lang === "ar" ? "ضريبة القيمة المضافة (15%)" : "VAT (15%)"}</td><td>${vatValue} ${sarLabel}</td></tr>
    <tr><td style="font-weight:700">${lang === "ar" ? "الإجمالي شامل الضريبة" : "Total (incl. VAT)"}</td><td style="font-weight:700;color:#16a34a;font-size:15px">${grandTotalValue} ${sarLabel}</td></tr>
    ${deal.actual_quantity != null ? `<tr><td>${lang === "ar" ? "الكمية الفعلية" : "Actual Quantity"}</td><td>${fmtNumber(deal.actual_quantity)} ${unit}</td></tr>` : ""}
    ${deal.final_amount != null ? `<tr><td>${lang === "ar" ? "الإجمالي النهائي" : "Final Amount"}</td><td style="font-weight:700;color:#16a34a">${fmtNumber(deal.final_amount)} ${sarLabel}</td></tr>` : ""}
    ${transportResp ? `<tr><td>${lang === "ar" ? "مسؤولية النقل" : "Transport Responsibility"}</td><td>${transportResp}</td></tr>` : ""}
    ${opts.listingLocationAddress ? `<tr><td>${lang === "ar" ? "موقع المواد" : "Material Location"}</td><td>${opts.listingLocationAddress}</td></tr>` : ""}
    ${opts.listingMapsUrl && opts.listingMapsUrl.startsWith("https://") ? `<tr><td>${lang === "ar" ? "رابط الموقع" : "Map Link"}</td><td><a href="${opts.listingMapsUrl}" target="_blank" rel="noopener noreferrer" style="color:#1e40af">${opts.listingMapsUrl}</a></td></tr>` : ""}
  </table>

  ${deal.payment_reference || deal.payment_submitted_at ? `
  <h2>${lang === "ar" ? "تفاصيل الدفع" : "Payment Details"}</h2>
  <table>
    <tr><td>${lang === "ar" ? "حالة الدفع" : "Payment Status"}</td><td style="font-weight:600">${
      deal.status === "payment_confirmed" || deal.status === "dispatched" || deal.status === "receipt_pending" || deal.status === "completed" 
        ? (lang === "ar" ? "تم تأكيد استلام الدفع" : "Payment received confirmed") 
        : (lang === "ar" ? "تم إرسال إثبات الدفع من المشتري" : "Payment proof submitted by buyer")
    }</td></tr>
    ${deal.payment_reference ? `<tr><td>${lang === "ar" ? "رقم الدفعة / الحوالة" : "Payment Reference"}</td><td style="font-weight:600;font-family:monospace;direction:ltr;text-align:${lang === "ar" ? "right" : "left"}">${deal.payment_reference}</td></tr>` : ""}
    ${deal.payment_submitted_at ? `<tr><td>${lang === "ar" ? "تاريخ إرسال الإثبات" : "Submitted At"}</td><td>${formatTs(deal.payment_submitted_at)}</td></tr>` : ""}
    ${deal.payment_confirmed_at ? `<tr><td>${lang === "ar" ? "تاريخ تأكيد الاستلام" : "Confirmed At"}</td><td>${formatTs(deal.payment_confirmed_at)}</td></tr>` : ""}
    <tr><td>${lang === "ar" ? "إيصال التحويل" : "Transfer Receipt"}</td><td style="color:#1e40af;font-size:12px">${
      deal.payment_proof_url 
        ? (lang === "ar" ? "تم إرفاق إيصال الحوالة وهو متاح داخل صفحة الصفقة." : "The transfer receipt was submitted and is available in the deal page.")
        : (lang === "ar" ? "لم يتم إرفاق إيصال حتى الآن" : "No receipt has been uploaded yet")
    }</td></tr>
  </table>
  ` : ""}

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
    &nbsp;|&nbsp; ${t("deal.print.generated_at")}: ${fmtDateTime(new Date().toISOString(), lang)}
  </div>
  <script>
    window.onload = function() {
      window.print();
      window.addEventListener('afterprint', function() { window.close(); });
    };
  <\/script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

// ── SmartTransportBody ──────────────────────────────────────────────────────
// Extracted as a plain function (not a React component) to guarantee stable
// event bindings and avoid IIFE reconciliation surprises in the parent render.
interface SmartTransportBodyProps {
  tr: MwanSummary["transport"];
  trDecision: string | null;
  dealStatus: DealStatus;
  smartTrLoading: boolean;
  smartTrError: string | null;
  skipConfirmOpen: boolean;
  setSkipConfirmOpen: (v: boolean) => void;
  onArrange: () => void;
  onSkipConfirm: () => void;
  t: (k: string) => string;
  lang: "ar" | "en";
}

function SmartTransportBody({
  tr, trDecision, dealStatus, smartTrLoading, smartTrError,
  skipConfirmOpen, setSkipConfirmOpen,
  onArrange, onSkipConfirm, t, lang,
}: SmartTransportBodyProps): React.ReactNode {
  /* Transport exists: show status */
  if (tr) {
    const statusMap: Record<string, string> = {
      pending:        t("deal.transport.smart.requested"),
      accepted:       t("deal.transport.smart.assigned"),
      manifest_ready: t("deal.transport.smart.assigned"),
      in_transit:     t("deal.transport.smart.in_progress"),
      delivered:      t("deal.transport.smart.completed_tr"),
      closed:         t("deal.transport.smart.completed_tr"),
      cancelled:      t("deal.transport.smart.cancelled"),
    };
    const statusText = statusMap[tr.status] ?? tr.status;
    const isActive = ["pending", "accepted", "manifest_ready", "in_transit"].includes(tr.status);
    return (
      <div className="space-y-2">
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 ${
          isActive ? "bg-green-50 border border-green-200" : "bg-muted/30 border border-border"
        }`}>
          <CheckCircle2 className={`h-4 w-4 shrink-0 ${isActive ? "text-green-600" : "text-muted-foreground"}`} />
          <span className={`text-sm font-semibold ${isActive ? "text-green-800" : "text-foreground"}`}>
            {statusText}
          </span>
        </div>
        {tr.status === "pending" && (
          <div className="rounded-lg border border-green-200 bg-green-50/60 px-3 py-3 space-y-2 text-xs text-green-900 leading-relaxed">
            <p className="font-semibold">{t("deal.transport.smart.requested_line1")}</p>
            <p>{t("deal.transport.smart.requested_line2")}</p>
            <a
              href={`https://wa.me/${import.meta.env.VITE_TADWEERAH_SUPPORT_PHONE?.replace("+", "") || "966504927090"}?text=${encodeURIComponent(
                lang === "ar" ? `مرحباً، أود الاستفسار بخصوص طلب النقل للصفقة رقم: ${deal.id}` : `Hello, I'd like to inquire about transport request for deal: ${deal.id}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 w-fit rounded-md bg-green-600 text-white font-bold px-3 py-1.5 text-sm hover:bg-green-700 transition-colors"
              dir="ltr"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {lang === "ar" ? import.meta.env.VITE_TADWEERAH_SUPPORT_PHONE || "0504927090" : import.meta.env.VITE_TADWEERAH_SUPPORT_PHONE || "+966504927090"}
            </a>
            <p className="text-green-800/80">{t("deal.transport.smart.requested_line3")}</p>
          </div>
        )}
        {tr.manifest_ref && (
          <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5">
            <FileTextIcon className="h-3 w-3 text-primary shrink-0" />
            <span className="text-[10px] font-mono text-primary font-bold flex-1" dir="ltr">{tr.manifest_ref}</span>
          </div>
        )}
      </div>
    );
  }

  /* Opted out */
  if (trDecision === "not_required") {
    return (
      <div className="rounded-lg bg-muted/20 border border-border px-3 py-2.5 space-y-1">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("deal.transport.smart.not_required")}
        </p>
      </div>
    );
  }

  /* Goods already dispatched with no transport arranged — informational only */
  if (dealStatus === "dispatched") {
    return (
      <div className="rounded-lg bg-muted/20 border border-border px-3 py-2.5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("deal.transport.smart.dispatched_no_tr")}
        </p>
      </div>
    );
  }

  /* No decision yet: prompt */
  return (
    <>
      {/* Confirmation dialog for self-arrange — irreversible action needs explicit consent */}
      <ConfirmDialog
        open={skipConfirmOpen}
        onOpenChange={setSkipConfirmOpen}
        title={t("deal.transport.smart.skip_confirm_title")}
        description={t("deal.transport.smart.skip_confirm_desc")}
        confirmLabel={t("deal.transport.smart.skip_confirm_ok")}
        onConfirm={() => { setSkipConfirmOpen(false); onSkipConfirm(); }}
        isPending={smartTrLoading}
      />
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground leading-snug">
            {t("deal.transport.smart.prompt_title")}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t("deal.transport.smart.prompt_helper")}
          </p>
        </div>
        {smartTrError && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{smartTrError}</span>
          </div>
        )}
        {/* Option 1 — Green card: request Tadweerah transport */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onArrange(); }}
          disabled={smartTrLoading}
          className="w-full text-start rounded-xl bg-green-600 text-white px-4 py-3.5 hover:bg-green-700 active:bg-green-800 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
        >
          <div className="flex items-center gap-2 mb-0.5">
            {smartTrLoading
              ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              : <Truck className="h-4 w-4 shrink-0" />}
            <span className="text-sm font-bold">{t("deal.transport.smart.arrange_btn")}</span>
          </div>
          <p className="text-xs opacity-80 leading-relaxed ps-6">{t("deal.transport.smart.arrange_card_helper")}</p>
        </button>
        {/* Option 2 — Blue card: self-arrange */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSkipConfirmOpen(true); }}
          disabled={smartTrLoading}
          className="w-full text-start rounded-xl bg-blue-600 text-white px-4 py-3.5 hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <div className="flex items-center gap-2 mb-0.5">
            <UserCog className="h-4 w-4 shrink-0" />
            <span className="text-sm font-bold">{t("deal.transport.smart.self_arrange_btn")}</span>
          </div>
          <p className="text-xs opacity-80 leading-relaxed ps-6">{t("deal.transport.smart.self_arrange_helper")}</p>
        </button>
      </div>
    </>
  );
}

export function DealPanel({ deal, role, unit, onUpdate, pricingModel, revenueSharePct, listingRef, listingMaterial, listingQuantity, myCompanyName, listingCategory, myPhone, listingCity, listingSaleType, counterpartyCity, listingDescription, listingCategoryId, listingSubcategoryId, offersPanel, listingInfoPanel, listingLocationAddress, listingMapsUrl, listingLocationNotes }: DealPanelProps) {
  const { t, lang } = useT();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { data: allCategories = [] } = useGetMaterialCategories();
  const subcategoryLabel = listingSubcategoryId
    ? (allCategories as MaterialCategory[]).find((c) => c.id === listingSubcategoryId)?.[lang === "ar" ? "name_ar" : "name_en"] ?? null
    : null;
  const displayMaterial = subcategoryLabel ?? listingMaterial;
  const resolvedListingMapsUrl = buildMapsUrl(listingMapsUrl, listingLocationAddress, listingCity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualQty, setActualQty] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreviewUrl, setPaymentProofPreviewUrl] = useState<string | null>(null);
  const [paymentProofDataUrl, setPaymentProofDataUrl] = useState<string | null>(null);
  const [paymentProofProcessing, setPaymentProofProcessing] = useState(false);
  const [proofUploadError, setProofUploadError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [smartTrLoading, setSmartTrLoading] = useState(false);
  const [smartTrError, setSmartTrError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);
  const [trFormOpen, setTrFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [offersOpen, setOffersOpen] = useState(false);
  const [listingInfoOpen, setListingInfoOpen] = useState(false);
  const [paymentDetailsOpen, setPaymentDetailsOpen] = useState(false);

  // Share cache key with MwanSummaryPanel — no extra network call
  const { data: mwanHeaderData } = useQuery<MwanSummary>({
    queryKey: ["mwan-summary", deal.id],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/deals/${deal.id}/mwan-summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("mwan fetch failed");
      return res.json() as Promise<MwanSummary>;
    },
    staleTime: 60_000,
  });

  function copyManifestRef(ref: string) {
    navigator.clipboard.writeText(ref).catch(() => {});
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 2000);
  }

  function copyDealRef() {
    const ref = dealRef(deal.id, deal.created_at);
    navigator.clipboard.writeText(ref).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const handleFileSelect = useCallback((file: File) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setProofUploadError(t("deal.upload.error.type"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofUploadError(t("deal.upload.error.size"));
      return;
    }
    setProofUploadError(null);
    setPaymentProofFile(file);
    if (file.type !== "application/pdf") {
      const objUrl = URL.createObjectURL(file);
      setPaymentProofPreviewUrl(objUrl);
    } else {
      setPaymentProofPreviewUrl(null);
    }
    // Pre-read as data URL for submission
    setPaymentProofProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPaymentProofDataUrl(e.target?.result as string ?? null);
      setPaymentProofProcessing(false);
    };
    reader.onerror = () => {
      setProofUploadError(lang === "ar" ? "فشل قراءة الملف" : "Failed to read file");
      setPaymentProofProcessing(false);
    };
    reader.readAsDataURL(file);
  }, [t, lang]);

  function clearProofFile() {
    if (paymentProofPreviewUrl) URL.revokeObjectURL(paymentProofPreviewUrl);
    setPaymentProofFile(null);
    setPaymentProofPreviewUrl(null);
    setPaymentProofDataUrl(null);
    setProofUploadError(null);
    setPaymentProofProcessing(false);
  }

  function handleDropZoneDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  async function handleSmartTransportRequest() {
    setSmartTrLoading(true);
    setSmartTrError(null);
    try {
      const authToken = await getToken();
      const res = await fetch(`/api/deals/${deal.id}/transport-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          transport_mode: "platform",
          pickup_city: listingCity ?? "",
          delivery_city: counterpartyCity ?? deal.counterparty?.city ?? "",
          waste_description: listingDescription ?? listingMaterial ?? "",
          waste_category_id: listingCategoryId ?? undefined,
          waste_subcategory_id: listingSubcategoryId ?? undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, string>;
        throw new Error(err.message ?? "failed");
      }
      await queryClient.invalidateQueries({ queryKey: ["mwan-summary", deal.id] });
    } catch (e) {
      setSmartTrError(e instanceof Error ? e.message : t("deal.error.generic"));
    } finally {
      setSmartTrLoading(false);
    }
  }

  async function handleSkipTransport() {
    setSmartTrLoading(true);
    setSmartTrError(null);
    try {
      const authToken = await getToken();
      const res = await fetch(`/api/deals/${deal.id}/transport-decision`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ decision: "not_required" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Record<string, string>;
        throw new Error(err.message ?? "failed");
      }
      await queryClient.invalidateQueries({ queryKey: ["mwan-summary", deal.id] });
    } catch (e) {
      setSmartTrError(e instanceof Error ? e.message : t("deal.error.generic"));
    } finally {
      setSmartTrLoading(false);
    }
  }

  const currentStepIndex = getStepperIndex(deal.status);

  async function executeAction(
    action: "submit-payment" | "confirm-payment" | "confirm-dispatch" | "confirm-receipt",
    body?: object,
  ) {
    setLoading(true);
    setError(null);
    setPendingAction(null);
    try {
      const authToken = await getToken();
      const updated = await callDealApi(deal.id, action, body, authToken);
      onUpdate(updated);
      if (action === "submit-payment" || action === "confirm-payment") {
        setShowPaymentSuccess(true);
      }
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

  function requestSubmitPayment() {
    if (paymentProofProcessing) {
      return;
    }
    if (!paymentRef.trim()) {
      setError(t("deal.error.payment_reference_required"));
      return;
    }
    if (!paymentProofDataUrl) {
      setError(lang === "ar" ? "يرجى إرفاق إيصال الحوالة قبل إرسال مرجع الدفع." : "Please attach the transfer receipt before submitting payment details.");
      return;
    }
    setError(null);
    setPendingAction("submit-payment");
  }

  function requestConfirmPaymentReceipt() {
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
    if (pendingAction === "submit-payment") {
      const body: Record<string, unknown> = {
        payment_reference: paymentRef.trim(),
      };
      if (paymentProofDataUrl) {
        body.payment_proof_url = paymentProofDataUrl;
      }
      executeAction("submit-payment", body);
    } else if (pendingAction === "confirm-payment") {
      executeAction("confirm-payment");
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

  const waitingText = (() => {
    if (deal.status === "completed" || deal.status === "expired" || deal.status === "cancelled") return null;
    if (deal.status === "receipt_pending") {
      return role === "producer"
        ? t("deal.waiting.receipt_pending.producer")
        : t("deal.waiting.receipt_pending.buyer");
    }
    return t(`deal.waiting.${deal.status}` as Parameters<typeof t>[0]) ?? null;
  })();

  const isMyTurn =
    (role === "buyer" && deal.status === "active") ||
    (role === "producer" && deal.status === "payment_submitted") ||
    (role === "producer" && deal.status === "payment_confirmed") ||
    (role === "buyer" && deal.status === "dispatched");

  const confirmDialogProps: Record<
    Exclude<PendingAction, null>,
    { title: string; desc: string; label: string }
  > = {
    "submit-payment": {
      title: lang === "ar" ? "تأكيد إرسال مرجع الدفع" : "Confirm Payment Reference",
      desc: lang === "ar"
        ? "هل تأكدت من إرسال الدفع؟ سيتم إشعار المنتج للتحقق والتأكيد. لا يمكن التراجع عن هذه الخطوة."
        : "Have you sent the payment? The producer will be notified to verify and confirm. This cannot be undone.",
      label: lang === "ar" ? "نعم، أرسلت الدفع" : "Yes, I Sent Payment",
    },
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

  /* ── helpers ── */
  const mwanRemainingText = mwanHeaderData ? (() => {
    const [ready, total] = mwanHeaderData.readiness_score.split("/").map(Number);
    const remaining = total - ready;
    if (remaining <= 0) {
      return (
        <span className="text-[10px] text-green-700 font-medium">
          {lang === "ar" ? "البيان الإلكتروني مكتمل ✓" : "e-Manifest complete ✓"}
        </span>
      );
    }
    return (
      <span className="text-[10px] text-muted-foreground">
        {lang === "ar"
          ? `متبقي ${remaining} عنصر لإكمال البيان الإلكتروني`
          : `${remaining} items remaining for e-manifest`}
      </span>
    );
  })() : null;

  return (
    <>
      {/* ── Confirm-action dialog ── */}
      {activeDialog && (
        <ConfirmDialog
          open={!!pendingAction}
          onOpenChange={(open) => { if (!open) setPendingAction(null); }}
          title={activeDialog.title}
          description={activeDialog.desc}
          confirmLabel={activeDialog.label}
          onConfirm={handleConfirmed}
          isPending={loading}
          destructive={false}
        >
          {pendingAction === "confirm-receipt" && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm space-y-1.5 my-2">
              {deal.counterparty?.name && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs">{t("deal.receipt_dialog.producer")}</span>
                  <span className="font-semibold text-foreground text-xs">{deal.counterparty.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">{t("deal.receipt_dialog.quantity")}</span>
                <span className="font-semibold text-foreground text-xs">
                  {fmtNumber(deal.actual_quantity ?? listingQuantity ?? undefined) ?? "—"} {unit}
                </span>
              </div>
              <p className="text-[11px] text-destructive/80 font-medium pt-1 border-t border-border">
                {t("deal.receipt_dialog.irreversible")}
              </p>
            </div>
          )}
        </ConfirmDialog>
      )}

      {/* ── Modal: Deal Details ── */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lang === "ar" ? "تفاصيل الصفقة" : "Deal Details"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pb-2">
            {/* Financial summary */}
            <div className="rounded-lg border border-border p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {lang === "ar" ? "الملخص المالي" : "Financial Summary"}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <span className="text-muted-foreground">{t("deal.settlement.label")}</span>
                <span className="font-medium text-end">{t(`deal.settlement.${deal.settlement_type}`)}</span>

                <span className="text-muted-foreground">{t("deal.field.price_per_unit")}</span>
                <span className="font-medium text-end">
                  {fmtNumber(deal.price_per_unit)} {t("listing.sar")} / {unit}
                </span>

                {/* Transport responsibility row */}
                {deal.transport_responsibility && (
                  <>
                    <span className="text-muted-foreground">{t("deal.transport_responsibility.label")}</span>
                    <span className="font-medium text-end">{t(`listing.transport_responsibility.${deal.transport_responsibility}`)}</span>
                  </>
                )}

                {/* VAT breakdown — subtotal, VAT 15%, total */}
                <span className="text-muted-foreground">
                  {deal.vat_amount != null ? t("deal.vat.subtotal") : t("deal.field.estimated_amount")}
                </span>
                <span className="font-semibold text-primary text-end">
                  {fmtNumber(deal.estimated_amount)} {t("listing.sar")}
                </span>

                {deal.vat_amount != null && (
                  <>
                    <span className="text-muted-foreground">{t("deal.vat.rate")}</span>
                    <span className="font-medium text-end">{fmtNumber(deal.vat_amount)} {t("listing.sar")}</span>
                    <span className="text-muted-foreground font-semibold">{t("deal.vat.total")}</span>
                    <span className="font-bold text-green-700 text-end">{fmtNumber(deal.total_amount)} {t("listing.sar")}</span>
                  </>
                )}

                {deal.actual_quantity != null && (
                  <>
                    <span className="text-muted-foreground">{t("deal.field.actual_quantity")}</span>
                    <span className="font-semibold text-end">{fmtNumber(deal.actual_quantity)} {unit}</span>
                  </>
                )}
                {deal.final_amount != null && (
                  <>
                    <span className="text-muted-foreground font-semibold">{t("deal.field.final_amount")}</span>
                    <span className="font-bold text-primary text-end">{fmtNumber(deal.final_amount)} {t("listing.sar")}</span>
                  </>
                )}
                {pricingModel === "revenue_share" && revenueSharePct != null && (
                  <>
                    <span className="text-muted-foreground">{t("listing.pricing_model.revenue_share")}</span>
                    <span className="font-medium text-end">{revenueSharePct}%</span>
                  </>
                )}
                <span className="text-muted-foreground">{t("deal.created_on")}</span>
                <span className="font-medium text-end text-xs">
                  {fmtDateTime(deal.created_at, lang)}
                </span>
              </div>
              {deal.settlement_type === "by_weight" && deal.final_amount == null && (
                <p className="text-xs text-muted-foreground mt-1">{t("deal.disclaimer")}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Transport Request ── */}
      <Dialog open={trFormOpen} onOpenChange={setTrFormOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{lang === "ar" ? "طلب النقل" : "Transport Request"}</DialogTitle>
          </DialogHeader>
          <CreateTransportRequestForm
            dealId={deal.id}
            defaultPickupCity={listingCity ?? ""}
            defaultDeliveryCity={counterpartyCity ?? deal.counterparty?.city ?? ""}
            defaultWasteDesc={listingDescription ?? listingMaterial ?? ""}
            defaultCategoryId={listingCategoryId ?? ""}
            defaultSubcategoryId={listingSubcategoryId ?? ""}
            externalOpen
            onExternalOpen={() => {}}
          />
        </DialogContent>
      </Dialog>

      {/* ── Modal: Offers Panel ── */}
      {offersPanel && (
        <Dialog open={offersOpen} onOpenChange={setOffersOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{lang === "ar" ? "العروض الواردة" : "Incoming Offers"}</DialogTitle>
            </DialogHeader>
            {offersPanel}
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal: Listing Info ── */}
      {listingInfoPanel && (
        <Dialog open={listingInfoOpen} onOpenChange={setListingInfoOpen}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{lang === "ar" ? "معلومات الإعلان" : "Listing Info"}</DialogTitle>
            </DialogHeader>
            {listingInfoPanel}
          </DialogContent>
        </Dialog>
      )}

      {/* ── MAIN PANEL ── */}
      <div className="rounded-xl border border-primary/20 bg-background overflow-hidden">

        {/* 1. COMPACT HEADER */}
        <div className="px-4 py-3 bg-primary/10 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-sm font-bold font-mono text-primary tracking-wider" dir="ltr">
                {dealRef(deal.id, deal.created_at)}
              </span>
              <button
                type="button"
                onClick={copyDealRef}
                className="flex items-center gap-1 text-primary/60 hover:text-primary transition-colors"
                aria-label={t("deal.ref.copy")}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied && <span className="text-[10px] text-green-600 font-medium">{t("deal.ref.copied")}</span>}
              </button>
              {mwanHeaderData?.transport?.manifest_ref && (
                <>
                  <span className="text-primary/30 text-xs">·</span>
                  <span className="text-xs font-mono text-primary/70" dir="ltr">{mwanHeaderData.transport.manifest_ref}</span>
                  <button type="button" onClick={() => copyManifestRef(mwanHeaderData.transport!.manifest_ref!)} className="text-primary/50 hover:text-primary">
                    {copiedManifest ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </>
              )}
            </div>
            <Badge variant={statusBadgeVariant(deal.status)}>{statusLabel(deal.status)}</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-primary/70 flex-wrap">
            {role === "producer" ? <UserCog className="h-3 w-3 shrink-0" /> : <UserCheck className="h-3 w-3 shrink-0" />}
            <span className="font-medium">{t(`deal.role.${role}`)}</span>
            {displayMaterial && <><span className="opacity-40">·</span><span>{displayMaterial}</span></>}
            {deal.counterparty?.name && <><span className="opacity-40">·</span><span>{deal.counterparty.name}</span></>}
            {deal.counterparty?.is_verified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 text-green-800 text-[9px] font-bold px-1.5 py-0.5">
                <Check className="h-2.5 w-2.5" />{t("company.verified")}
              </span>
            )}
          </div>
          {mwanRemainingText && (
            <div className="flex items-center gap-1.5">
              {mwanRemainingText}
            </div>
          )}
        </div>

        {/* 2. TWO-COLUMN: action card (left) + deal info & transport (right) */}
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] divide-y md:divide-y-0 md:divide-x divide-border">

        {/* ── LEFT: action card ── */}
        <div className="p-4">

          {/* Completed state */}
          {deal.status === "completed" && (
            <div className="rounded-xl border-2 border-green-300 bg-green-50 p-5 text-center space-y-3">
              <Shield className="h-10 w-10 text-green-600 mx-auto" />
              <div>
                <p className="font-bold text-green-800 text-base">{t("deal.compliance.badge")}</p>
                <p className="text-xs text-green-700 mt-0.5">{t("deal.compliance.tagline")}</p>
                {listingRef && <p className="text-[10px] text-green-600 font-mono mt-1">{listingRef}</p>}
              </div>
              {(() => {
                const subtotal = deal.final_amount ?? deal.estimated_amount ?? 0;
                const vatAmt = deal.vat_amount ?? Math.round(subtotal * 0.15 * 1000) / 1000;
                const totalAmt = deal.total_amount ?? Math.round((subtotal + vatAmt) * 1000) / 1000;
                return (
                  <div className="rounded-lg border border-green-200 bg-white px-3 py-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <span className="text-muted-foreground">{t("deal.vat.subtotal")}</span>
                    <span className="font-medium text-end">{fmtNumber(subtotal)} {lang === "ar" ? "ر.س" : "SAR"}</span>
                    <span className="text-muted-foreground">{t("deal.vat.rate")}</span>
                    <span className="font-medium text-end">{fmtNumber(vatAmt)} {lang === "ar" ? "ر.س" : "SAR"}</span>
                    <span className="text-muted-foreground font-semibold">{t("deal.vat.total")}</span>
                    <span className="text-lg font-bold text-foreground text-end">{fmtNumber(totalAmt)} {lang === "ar" ? "ر.س" : "SAR"}</span>
                  </div>
                );
              })()}
              {deal.counterparty?.contact_phone && (
                <a
                  href={`tel:${deal.counterparty.contact_phone}`}
                  dir="ltr"
                  className="inline-flex items-center gap-1.5 text-primary text-sm font-medium hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />{deal.counterparty.contact_phone}
                </a>
              )}
            </div>
          )}

          {/* Active action */}
          {deal.status !== "completed" && (
            <div className={`rounded-xl border-2 p-5 space-y-4 ${
              isMyTurn ? "border-primary/50 bg-primary/5" : "border-border bg-muted/15"
            }`}>

              {/* Action title + turn indicator */}
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-bold text-foreground leading-snug flex-1">
                  {t(`deal.stage.action.${deal.status}.${role}`)}
                </p>
                <span className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                  isMyTurn ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"
                }`}>
                  {isMyTurn ? (
                    <>
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      {t(`deal.step_current.${deal.status}.${role}` as Parameters<typeof t>[0]) || t("deal.role.your_turn")}
                    </>
                  ) : (
                    <><Clock className="h-3 w-3 shrink-0" />{t("deal.role.not_your_turn")}</>
                  )}
                </span>
              </div>

              {/* Price summary with VAT breakdown */}
              <div className="rounded-lg bg-background border border-border px-4 py-3">
                {deal.settlement_type === "fixed" ? (
                  (() => {
                    const subtotal = deal.estimated_amount ?? 0;
                    const vatAmt = deal.vat_amount ?? Math.round(subtotal * 0.15 * 1000) / 1000;
                    const totalAmt = deal.total_amount ?? Math.round((subtotal + vatAmt) * 1000) / 1000;
                    return (
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                        <span className="text-muted-foreground">{t("deal.vat.subtotal")}</span>
                        <span className="font-medium text-end">{fmtNumber(subtotal)} <span className="text-xs text-muted-foreground">{lang === "ar" ? "ر.س" : "SAR"}</span></span>
                        <span className="text-muted-foreground">{t("deal.vat.rate")}</span>
                        <span className="font-medium text-end">{fmtNumber(vatAmt)} <span className="text-xs text-muted-foreground">{lang === "ar" ? "ر.س" : "SAR"}</span></span>
                        <span className="text-muted-foreground font-semibold">{t("deal.vat.total")}</span>
                        <span className="text-xl font-bold text-foreground text-end">{fmtNumber(totalAmt)} <span className="text-sm font-medium text-muted-foreground">{lang === "ar" ? "ر.س" : "SAR"}</span></span>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {lang === "ar" ? "سعر الوحدة" : "Unit Price"}
                    </span>
                    <span className="text-xl font-bold text-foreground">
                      {fmtNumber(deal.price_per_unit)} <span className="text-sm font-medium text-muted-foreground">{lang === "ar" ? "ر.س" : "SAR"}/{unit}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Contact info */}
              {deal.counterparty && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-green-700 font-medium leading-tight">{t("deal.contact.can_now_contact")}</p>
                    <p className="text-sm font-bold text-green-900 leading-tight mt-0.5">{deal.counterparty.name}</p>
                  </div>
                  {deal.counterparty.contact_phone ? (
                    <a
                      href={`tel:${deal.counterparty.contact_phone}`}
                      dir="ltr"
                      className="flex items-center gap-1.5 text-primary font-bold text-sm hover:underline shrink-0"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      {deal.counterparty.contact_phone}
                    </a>
                  ) : (
                    <span className="text-xs text-amber-700 font-medium shrink-0">{t("deal.contact.phone_missing")}</span>
                  )}
                </div>
              )}

              {/* Buyer + active: payment form */}
              {role === "buyer" && deal.status === "active" && (
                <div className="space-y-4">
                  {/* Payment reference */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">
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

                  {/* File upload */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t("deal.upload.label")}
                    </label>
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                        e.target.value = "";
                      }}
                    />

                    {paymentProofFile ? (
                      /* File preview */
                      <div className="flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
                        {paymentProofPreviewUrl ? (
                          <img
                            src={paymentProofPreviewUrl}
                            alt="proof"
                            className="h-10 w-10 rounded object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded border border-border bg-muted flex items-center justify-center shrink-0">
                            <FileTextIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate" dir="ltr">
                            {paymentProofFile.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(paymentProofFile.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearProofFile}
                          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          aria-label={t("deal.upload.remove")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      /* Drop zone */
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={handleDropZoneDrop}
                        className={`cursor-pointer rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors ${
                          isDraggingOver
                            ? "border-primary bg-primary/10"
                            : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <Upload className="h-5 w-5 mx-auto mb-1.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {t("deal.upload.drop_hint")}{" "}
                          <span className="text-primary font-medium underline-offset-2 hover:underline">
                            {t("deal.upload.browse")}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {t("deal.upload.hint")}
                        </p>
                      </div>
                    )}

                    {proofUploadError && (
                      <p className="text-xs text-destructive">{proofUploadError}</p>
                    )}
                  </div>

                  {/* Submit button */}
                  <Button
                    className="w-full h-11 text-base font-bold"
                    onClick={requestSubmitPayment}
                    disabled={loading || paymentProofProcessing || !paymentRef.trim() || !paymentProofDataUrl}
                  >
                    {(loading && pendingAction === null) || paymentProofProcessing ? (
                      <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {paymentProofProcessing
                      ? (lang === "ar" ? "جارٍ تجهيز إيصال الحوالة..." : "Preparing transfer receipt...")
                      : (lang === "ar" ? "إرسال مرجع الدفع" : "Submit Payment Reference")
                    }
                  </Button>
                </div>
              )}

              {/* Producer + payment_submitted: confirm payment receipt */}
              {role === "producer" && deal.status === "payment_submitted" && (
                <div className="space-y-3">
                  {/* Payment details moved to dedicated dialog */}
                  <Button
                    className="w-full h-11 text-base font-bold"
                    onClick={requestConfirmPaymentReceipt}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {t("deal.action.confirm_payment")}
                  </Button>
                </div>
              )}

              {/* Producer + payment_confirmed: success + dispatch */}
              {role === "producer" && deal.status === "payment_confirmed" && (
                <div className="space-y-3">
                  {/* Success banner (transient) */}
                  {showPaymentSuccess && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2.5">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-sm font-semibold text-green-800 flex-1">
                        {t("deal.payment.success")}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPaymentSuccess(false)}
                        className="text-green-600/60 hover:text-green-800 shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
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
                          className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          dir="ltr"
                        />
                        <span className="text-sm text-muted-foreground shrink-0">{unit}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t("deal.field.actual_quantity.dispatch_hint")}</p>
                    </div>
                  )}
                  {deal.transport_responsibility === "buyer" && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 leading-relaxed">
                      {t("deal.dispatch.buyer_transport_hint")}
                    </p>
                  )}
                  <Button className="w-full h-11 text-base font-bold" onClick={requestConfirmDispatch} disabled={loading}>
                    {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {deal.transport_responsibility === "buyer"
                      ? t("deal.action.confirm_handover")
                      : t("deal.action.confirm_dispatch")}
                  </Button>
                </div>
              )}

              {/* Buyer + dispatched: receipt */}
              {role === "buyer" && deal.status === "dispatched" && (
                <Button
                  className="w-full h-11 text-base font-bold bg-green-600 hover:bg-green-700 text-white border-0"
                  onClick={() => setPendingAction("confirm-receipt")}
                  disabled={loading}
                >
                  {loading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("deal.action.confirm_receipt")}
                </Button>
              )}

              {/* Receipt pending — both roles see a status banner */}
              {deal.status === "receipt_pending" && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-sm font-bold text-green-900">
                      {lang === "ar" ? "تم تأكيد الاستلام" : "Receipt Confirmed"}
                    </p>
                  </div>
                  <p className="text-xs text-green-700 leading-relaxed">
                    {waitingText}
                  </p>
                </div>
              )}

              {/* Waiting state (all non-receipt_pending non-turn states) */}
              {!isMyTurn && waitingText && deal.status !== "receipt_pending" && (
                <p className="text-sm text-muted-foreground text-center leading-relaxed py-1">{waitingText}</p>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* ── SMART-ASSIST TRANSPORT STEP — shown to the responsible party ── */}
          {deal.status !== "completed" && (() => {
            const isTransportResponsible = deal.transport_responsibility === "seller"
              ? role === "producer"
              : role === "buyer";
            if (!isTransportResponsible) {
              if (deal.status !== "active" && deal.status !== "payment_submitted") {
                return (
                  <div className="mt-4 rounded-xl border border-border bg-muted/10 p-3 flex items-start gap-2.5">
                    <Truck className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {deal.transport_responsibility === "seller"
                        ? t("deal.transport.not_responsible_seller")
                        : t("deal.transport.not_responsible_buyer")}
                    </p>
                  </div>
                );
              }
              return null;
            }
            return (
            <div className={`mt-4 rounded-xl border-2 overflow-hidden ${
              deal.status === "active"
                ? "border-border bg-muted/10 opacity-60"
                : "border-primary/25 bg-primary/5"
            }`}>
              {/* Section header */}
              <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${
                deal.status === "active" ? "border-border bg-muted/20" : "border-primary/15 bg-primary/10"
              }`}>
                <Truck className={`h-4 w-4 shrink-0 ${deal.status === "active" ? "text-muted-foreground" : "text-primary"}`} />
                <p className={`text-sm font-bold ${deal.status === "active" ? "text-muted-foreground" : "text-foreground"}`}>
                  {deal.status === "active"
                    ? (lang === "ar" ? "خطوة النقل" : "Transport Step")
                    : t("deal.transport.smart.section_title")}
                </p>
              </div>

              <div className="px-4 py-4 space-y-3">
                {/* LOCKED state — before payment is confirmed */}
                {(deal.status === "active" || deal.status === "payment_submitted") && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("deal.transport.smart.locked")}
                  </p>
                )}

                {/* ACTIVE states — after payment confirmed */}
                {deal.status !== "active" && deal.status !== "payment_submitted" && SmartTransportBody({
                  tr: mwanHeaderData?.transport ?? null,
                  trDecision: mwanHeaderData?.transport_decision ?? null,
                  dealStatus: deal.status,
                  smartTrLoading,
                  smartTrError,
                  skipConfirmOpen,
                  setSkipConfirmOpen,
                  onArrange: handleSmartTransportRequest,
                  onSkipConfirm: handleSkipTransport,
                  t,
                  lang,
                })}
              </div>
            </div>
          );
          })()}
        </div>

        {/* ── RIGHT: transport + deal info ── */}
        <div className="p-4 space-y-5 bg-muted/5">

          {/* MWAN Readiness — shown only when transport exists */}
          {mwanHeaderData?.transport && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {lang === "ar" ? "جاهزية مَوَن" : "MWAN Readiness"}
              </p>
              <div className="space-y-1.5">
                {TR_STEPS.map((step) => {
                  const done = mwanHeaderData?.checks[step.key] ?? false;
                  return (
                    <div key={step.key} className="flex items-center gap-2">
                      {done
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        : <Circle className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
                      <span className={`text-xs ${done ? "text-foreground" : "text-muted-foreground/60"}`}>
                        {lang === "ar" ? step.ar : step.en}
                      </span>
                    </div>
                  );
                })}
                {mwanHeaderData.transport.manifest_ref && (
                  <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 mt-1">
                    <FileTextIcon className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-[10px] font-mono text-primary font-bold flex-1" dir="ltr">
                      {mwanHeaderData.transport.manifest_ref}
                    </span>
                    <button type="button" onClick={() => copyManifestRef(mwanHeaderData.transport!.manifest_ref!)} className="text-primary/50 hover:text-primary">
                      {copiedManifest ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deal Info */}
          <div className={`space-y-2.5 ${mwanHeaderData?.transport ? "border-t border-border pt-4" : ""}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {lang === "ar" ? "معلومات الصفقة" : "Deal Info"}
            </p>
            <div className="space-y-2">
              {(listingCategory ?? listingMaterial) && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{lang === "ar" ? "الفئة" : "Category"}</span>
                  <span className="text-xs font-medium">{listingCategory ?? listingMaterial}</span>
                </div>
              )}
              {subcategoryLabel && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{lang === "ar" ? "نوع المادة" : "Material"}</span>
                  <span className="text-xs font-medium">{subcategoryLabel}</span>
                </div>
              )}
              {listingQuantity != null && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{lang === "ar" ? "الكمية" : "Quantity"}</span>
                  <span className="text-xs font-medium">{fmtNumber(listingQuantity)} {unit}</span>
                </div>
              )}
              {listingCity && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{lang === "ar" ? "المدينة" : "City"}</span>
                  <span className="text-xs font-medium">{listingCity}</span>
                </div>
              )}
              {listingDescription && (
                <div className="flex flex-col gap-1 pt-0.5">
                  <span className="text-xs text-muted-foreground">{lang === "ar" ? "وصف المادة" : "Description"}</span>
                  <span className="text-xs leading-relaxed text-foreground/80 bg-muted/30 rounded px-2 py-1.5">{listingDescription}</span>
                </div>
              )}
              {listingLocationAddress && (
                <div className="flex flex-col gap-1 pt-0.5">
                  <span className="text-xs text-muted-foreground">{t("listing.location.address")}</span>
                  {resolvedListingMapsUrl ? (
                    <a
                      href={resolvedListingMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs leading-relaxed text-foreground/80 bg-muted/30 rounded px-2 py-1.5 hover:underline"
                    >
                      {listingLocationAddress}
                    </a>
                  ) : (
                    <span className="text-xs leading-relaxed text-foreground/80 bg-muted/30 rounded px-2 py-1.5">{listingLocationAddress}</span>
                  )}
                  {resolvedListingMapsUrl && (
                    <a
                      href={resolvedListingMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary hover:underline self-start"
                    >
                      ↗ {t("listing.location.open_maps")}
                    </a>
                  )}
                </div>
              )}
              {listingLocationNotes && (
                <div className="flex flex-col gap-1 pt-0.5">
                  <span className="text-xs text-muted-foreground">{t("listing.location.site_details")}</span>
                  <span className="text-xs leading-relaxed text-foreground/80 bg-muted/30 rounded px-2 py-1.5">{listingLocationNotes}</span>
                </div>
              )}
              {!listingLocationAddress && resolvedListingMapsUrl && (
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={resolvedListingMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    ↗ {t("listing.location.open_maps")}
                  </a>
                </div>
              )}
              {listingSaleType && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{lang === "ar" ? "نوع البيع" : "Sale Type"}</span>
                  <span className="text-xs font-medium">{t(`listing.sale_type.${listingSaleType}`)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {deal.settlement_type === "fixed"
                    ? (lang === "ar" ? "الإجمالي شامل الضريبة" : "Total incl. VAT")
                    : (lang === "ar" ? "سعر الوحدة" : "Unit Price")}
                </span>
                <span className="text-sm font-bold text-primary">
                  {deal.settlement_type === "fixed"
                    ? (() => {
                        const sub = deal.final_amount ?? deal.estimated_amount;
                        const total = deal.total_amount ?? Math.round((sub + (deal.vat_amount ?? Math.round(sub * 0.15 * 1000) / 1000)) * 1000) / 1000;
                        return `${fmtNumber(total)} ${lang === "ar" ? "ر.س" : "SAR"}`;
                      })()
                    : `${fmtNumber(deal.price_per_unit)} ${lang === "ar" ? "ر.س" : "SAR"}/${unit}`}
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>{/* end two-column grid */}

        {/* 3. HORIZONTAL STEPPER */}
        <div className="px-4 py-3 bg-muted/30 border-t border-border">
          <div className="flex items-center gap-0">
            {STEPPER_DISPLAY_STEPS.map((step, i) => {
              const done = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex && deal.status !== "completed" && deal.status !== "receipt_pending";
              const isLast = i === STEPPER_DISPLAY_STEPS.length - 1;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-0.5 flex-1">
                    {isCurrent ? (
                      <div className="relative flex items-center justify-center">
                        <div className="absolute h-6 w-6 rounded-full bg-primary/20 animate-pulse" />
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 relative" />
                      </div>
                    ) : done ? (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                    )}
                    <span className={`text-center text-[9px] leading-tight font-medium truncate w-full px-0.5 ${
                      isCurrent ? "text-primary font-bold" : done ? "text-primary/70" : "text-muted-foreground/40"
                    }`}>
                      {statusLabel(step)}
                    </span>
                  </div>
                  {!isLast && (
                    <div className={`h-0.5 flex-shrink-0 w-3 mx-0.5 mb-3.5 rounded-full ${i < currentStepIndex ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. POPUP BUTTONS ROW — 2-col grid, no transport */}
        <div className="px-4 py-3 border-t border-border grid grid-cols-2 gap-2">
          {listingInfoPanel && (
            <button
              type="button"
              onClick={() => setListingInfoOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              <Package className="h-4 w-4 text-primary/60 shrink-0" />
              <span>{lang === "ar" ? "معلومات الإعلان" : "Listing Info"}</span>
            </button>
          )}
          {offersPanel && (
            <button
              type="button"
              onClick={() => setOffersOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              <InboxIcon className="h-4 w-4 text-primary/60 shrink-0" />
              <span>{lang === "ar" ? "العروض الواردة" : "Offers"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-colors"
          >
            <FileTextIcon className="h-4 w-4 text-primary/60 shrink-0" />
            <span>{lang === "ar" ? "تفاصيل الصفقة" : "Deal Details"}</span>
          </button>
          
          {(deal.payment_reference || ["payment_submitted", "payment_confirmed", "dispatched", "receipt_pending", "completed"].includes(deal.status)) && (
            <button
              type="button"
              onClick={() => setPaymentDetailsOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-900 hover:bg-amber-100 hover:text-amber-950 transition-colors"
            >
              <CreditCard className="h-4 w-4 text-amber-600 shrink-0" />
              <span>{lang === "ar" ? "تفاصيل الدفع" : "Payment Details"}</span>
            </button>
          )}
        </div>

        <Dialog open={paymentDetailsOpen} onOpenChange={setPaymentDetailsOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{lang === "ar" ? "تفاصيل الدفع" : "Payment Details"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">{lang === "ar" ? "حالة الدفع" : "Payment Status"}</span>
                <Badge variant={deal.status === "payment_submitted" ? "secondary" : "default"}>
                  {deal.status === "payment_submitted" || deal.status === "active"
                    ? (lang === "ar" ? "بانتظار تأكيد استلام الدفع" : "Awaiting payment confirmation")
                    : (lang === "ar" ? "تم تأكيد استلام الدفع" : "Payment received confirmed")
                  }
                </Badge>
              </div>

              {deal.payment_reference && (
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-sm text-muted-foreground">{lang === "ar" ? "رقم مرجع الدفع / الحوالة" : "Payment / transfer reference"}</span>
                  <span className="text-sm font-bold font-mono tracking-tight" dir="ltr">{deal.payment_reference}</span>
                </div>
              )}

              {deal.payment_submitted_at && (
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-sm text-muted-foreground">{lang === "ar" ? "تاريخ ووقت إرسال إثبات الدفع" : "Payment proof submitted at"}</span>
                  <span className="text-sm font-medium">{formatDate(deal.payment_submitted_at, lang)}</span>
                </div>
              )}

              {deal.payment_confirmed_at && (
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-sm text-muted-foreground">{lang === "ar" ? "تاريخ تأكيد الاستلام" : "Payment confirmed at"}</span>
                  <span className="text-sm font-medium">{formatDate(deal.payment_confirmed_at, lang)}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <span className="text-sm text-muted-foreground mb-1">{lang === "ar" ? "إيصال التحويل" : "Transfer Receipt"}</span>
                {deal.payment_proof_url ? (
                  <div className="space-y-3">
                    {deal.payment_proof_url.startsWith("data:image/") && (
                      <div className="rounded-md border border-border overflow-hidden bg-muted/30 p-2">
                        <img 
                          src={deal.payment_proof_url} 
                          alt="Payment Proof" 
                          className="w-full max-h-[300px] object-contain rounded"
                        />
                      </div>
                    )}
                    <a 
                      href={deal.payment_proof_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors w-full justify-center"
                    >
                      <FileTextIcon className="h-4 w-4" />
                      {lang === "ar" ? "عرض إيصال الحوالة" : "View transfer receipt"}
                    </a>
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      {lang === "ar" ? "لم يتم إرفاق إيصال حتى الآن" : "No receipt has been uploaded yet"}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground text-center pt-2 mt-4 border-t border-border/50">
                {lang === "ar" ? "تم الإرسال بواسطة:" : "Submitted by:"} <span className="font-semibold">{role === "buyer" ? (lang === "ar" ? "أنت" : "You") : (deal.counterparty?.name ?? "—")}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 5. PRINT BUTTON */}
        <div className="px-4 pb-4 border-t border-border pt-3">
          <button
            type="button"
            onClick={() =>
              printDealReport(deal, role, unit, lang, t, {
                listingRef,
                listingMaterial: displayMaterial ?? listingMaterial,
                listingCategory,
                listingQuantity,
                myCompanyName,
                myPhone,
                pricingModel,
                listingLocationAddress,
                listingMapsUrl,
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
