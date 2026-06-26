import { useState, useRef, useEffect, Fragment, type FormEvent } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateWasteListing,
  useGetMaterialCategories,
  useGetUnitOptions,
  useGetCapabilities,
  useGetCompanyCategories,
  getListMyListingsQueryKey,
  type MaterialCategory,
  type UnitOption,
  type Capability,
  type CompanyCategory,
} from "@workspace/api-client-react";
import {
  Loader2, ImagePlus, X, Scale, Tag, Gavel, ShoppingBag, Percent,
  Lock, Globe, Users, Check, ChevronRight, Truck, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { useDirtyFormWarning } from "@/hooks/use-dirty-form-warning";

type PricingModel = "fixed" | "by_weight" | "revenue_share";
type SaleType = "auction" | "direct";
type TargetingType = "open" | "category" | "specific_company";

const LEGACY_MATERIAL_KEYS = new Set(["paper", "plastic", "metal", "glass", "electronics", "organic", "other"]);
const LEGACY_UNIT_KEYS = new Set(["kg", "ton"]);

function toLegacyMaterial(key: string): string {
  return LEGACY_MATERIAL_KEYS.has(key) ? key : "other";
}
function toLegacyUnit(key: string): string {
  return LEGACY_UNIT_KEYS.has(key) ? key : "kg";
}

const TOTAL_STEPS = 3;

function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-center mb-4">
      {labels.map((label, i) => (
        <Fragment key={label}>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors border-2 ${
              i < current
                ? "bg-primary border-primary text-primary-foreground"
                : i === current
                  ? "bg-primary border-primary text-primary-foreground ring-2 ring-primary/25"
                  : "bg-background border-muted-foreground/30 text-muted-foreground"
            }`}>
              {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`text-[10px] text-center leading-tight max-w-[64px] ${
              i === current ? "text-primary font-semibold" : "text-muted-foreground"
            }`}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div className={`h-0.5 flex-1 mx-2 mb-4 rounded-full transition-colors ${
              i < current ? "bg-primary" : "bg-muted-foreground/20"
            }`} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

export function ListingNewPage() {
  const { t } = useT();
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: allCategories = [] } = useGetMaterialCategories();
  const { data: unitOptions = [] } = useGetUnitOptions();
  const { data: allCapabilities = [] } = useGetCapabilities();
  const { data: companyCategoryList = [] } = useGetCompanyCategories();

  const topLevel = (allCategories as MaterialCategory[]).filter((c) => !c.parent_id);
  const [materialCategoryId, setMaterialCategoryId] = useState<string>("");
  const [materialSubcategoryId, setMaterialSubcategoryId] = useState<string>("");

  const subcategories = (allCategories as MaterialCategory[]).filter(
    (c) => c.parent_id === materialCategoryId,
  );

  const defaultUnitId = (unitOptions as UnitOption[])[0]?.id ?? "";
  const [unitOptionId, setUnitOptionId] = useState<string>("");
  const [unitNotes, setUnitNotes] = useState<string>("");
  const resolvedUnitId = unitOptionId || defaultUnitId;
  const selectedUnitForDisplay = (unitOptions as UnitOption[]).find((u) => u.id === resolvedUnitId);
  const isOtherUnit = selectedUnitForDisplay?.key === "other";

  const [quantity, setQuantity] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [priceHint, setPriceHint] = useState("");
  const [pricingModel, setPricingModel] = useState<PricingModel>("fixed");
  const [saleType, setSaleType] = useState<SaleType>("auction");
  const [eligibleCompanyType, setEligibleCompanyType] = useState<"ALL" | "LICENSED_ONLY">("ALL");
  const [revenueSharePct, setRevenueSharePct] = useState("");
  const [requiredServiceIds, setRequiredServiceIds] = useState<Set<string>>(new Set());
  const [buyerEligibility, setBuyerEligibility] = useState<"open_to_all" | "recycling_only">("open_to_all");
  const [targetingType, setTargetingType] = useState<TargetingType>("open");
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [companyResults, setCompanyResults] = useState<{ id: string; name: string; city: string }[]>([]);
  const [companySearching, setCompanySearching] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string; city: string } | null>(null);
  const [targetCategoryIds, setTargetCategoryIds] = useState<Set<string>>(new Set());
  const [transportResponsibility, setTransportResponsibility] = useState<"seller" | "buyer">("buyer");
  const [materialLocationAddress, setMaterialLocationAddress] = useState("");
  const [materialLocationNotes, setMaterialLocationNotes] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [mapsUrlError, setMapsUrlError] = useState(false);
  // CLT-1: Offer Window
  const [offerWindowPreset, setOfferWindowPreset] = useState<string>("7d");
  const [offerWindowCustom, setOfferWindowCustom] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const isDirty =
    materialCategoryId !== "" ||
    quantity !== "" ||
    city !== "" ||
    priceHint !== "" ||
    description !== "" ||
    imageFile !== null;
  useDirtyFormWarning(isDirty);

  const { mutate, isPending } = useCreateWasteListing();

  useEffect(() => {
    if (targetingType !== "specific_company" || companySearch.length < 2) {
      setCompanyResults([]);
      return;
    }
    setCompanySearching(true);
    let cancelled = false;
    getToken().then((token) =>
      fetch(`/api/companies/search?q=${encodeURIComponent(companySearch)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })
    ).then((r) => (r.ok ? r.json() : []))
      .then((rows) => { if (!cancelled) setCompanyResults(rows as { id: string; name: string; city: string }[]); })
      .catch(() => { if (!cancelled) setCompanyResults([]); })
      .finally(() => { if (!cancelled) setCompanySearching(false); });
    return () => { cancelled = true; };
  }, [companySearch, targetingType, getToken]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadImage(listingId: string): Promise<void> {
    if (!imageFile) return;
    const authToken = await getToken();
    const form = new FormData();
    form.append("image", imageFile);
    const res = await fetch(`/api/listings/${listingId}/image`, {
      method: "POST",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: form,
      credentials: "include",
    });
    if (!res.ok) throw new Error("Image upload failed");
  }

  function advanceStep() {
    setError(null);
    if (currentStep === 0) {
      if (!materialCategoryId) {
        setError(t("listing.form.error"));
        return;
      }
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        setError(t("listing.form.error"));
        return;
      }
      if (isOtherUnit && !unitNotes.trim()) {
        setError(t("listing.form.unit_notes.required"));
        return;
      }
    } else if (currentStep === 1) {
      if (pricingModel === "revenue_share") {
        const pctNum = Number(revenueSharePct);
        if (!revenueSharePct.trim() || !Number.isFinite(pctNum) || pctNum <= 0 || pctNum > 100) {
          setError(t("listing.form.error.revenue_share_pct_required"));
          return;
        }
      }
    }
    setCurrentStep((c) => c + 1);
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!materialCategoryId) { setError(t("listing.form.error")); return; }
    const selectedCategory = (allCategories as MaterialCategory[]).find((c) => c.id === materialCategoryId);
    const selectedUnit = (unitOptions as UnitOption[]).find((u) => u.id === resolvedUnitId);
    const legacyMaterial = selectedCategory ? toLegacyMaterial(selectedCategory.key) : "other";
    const legacyUnit = selectedUnit ? toLegacyUnit(selectedUnit.key) : "kg";
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) { setError(t("listing.form.error")); return; }
    if (isOtherUnit && !unitNotes.trim()) { setError(t("listing.form.unit_notes.required")); return; }
    if (pricingModel === "revenue_share") {
      const pctNum = Number(revenueSharePct);
      if (!revenueSharePct.trim() || !Number.isFinite(pctNum) || pctNum <= 0 || pctNum > 100) {
        setError(t("listing.form.error.revenue_share_pct_required"));
        return;
      }
    }

    const priceNumber = priceHint.trim() ? Number(priceHint) : undefined;

    // CLT-1: Compute offer_deadline from preset or custom
    let offerDeadlineISO: string;
    if (offerWindowPreset === "custom") {
      if (!offerWindowCustom) { setError(t("offer_window.min_error")); return; }
      const customDate = new Date(offerWindowCustom);
      const minCustom = new Date(Date.now() + 23 * 60 * 60 * 1000 + 55 * 60 * 1000);
      if (customDate < minCustom) { setError(t("offer_window.min_error")); return; }
      const maxCustom = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      if (customDate > maxCustom) { setError(t("offer_window.max_error")); return; }
      offerDeadlineISO = customDate.toISOString();
    } else {
      const BUFFER_MS = 5 * 60 * 1000; // 5 min buffer for clock drift
      const presetMs: Record<string, number> = {
        "24h": 24 * 60 * 60 * 1000,
        "3d": 3 * 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "14d": 14 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
      };
      offerDeadlineISO = new Date(Date.now() + (presetMs[offerWindowPreset] ?? presetMs["7d"]) + BUFFER_MS).toISOString();
    }

    mutate(
      {
        data: {
          material: legacyMaterial as any,
          unit: legacyUnit as any,
          quantity: qty,
          city: city.trim(),
          pricing_model: pricingModel,
          sale_type: saleType,
          material_category_id: materialCategoryId,
          ...(materialSubcategoryId ? { material_subcategory_id: materialSubcategoryId } : {}),
          unit_option_id: resolvedUnitId,
          ...(isOtherUnit && unitNotes.trim() ? { unit_notes: unitNotes.trim() } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(priceNumber != null && Number.isFinite(priceNumber) && priceNumber >= 0
            ? { price_hint: priceNumber }
            : {}),
          ...(pricingModel === "revenue_share" && revenueSharePct.trim()
            ? { revenue_share_pct: Number(revenueSharePct) }
            : {}),
          ...(requiredServiceIds.size > 0
            ? { required_service_ids: Array.from(requiredServiceIds) }
            : {}),
          transport_responsibility: transportResponsibility,
          eligible_company_type: saleType === "auction"
            ? (buyerEligibility === "recycling_only" ? "LICENSED_ONLY" : "ALL")
            : eligibleCompanyType,
          ...(saleType === "direct" ? { targeting_type: targetingType } : {}),
          ...(saleType === "direct" && targetingType === "specific_company" && selectedCompany
            ? { target_company_id: selectedCompany.id }
            : saleType === "direct" && targetingType === "specific_company" && targetCompanyId.trim()
            ? { target_company_id: targetCompanyId.trim() }
            : {}),
          ...(saleType === "direct" && targetingType === "category" && targetCategoryIds.size > 0
            ? { target_category_ids: Array.from(targetCategoryIds) }
            : {}),
          ...(materialLocationAddress.trim() ? { material_location_address: materialLocationAddress.trim() } : {}),
          ...(materialLocationNotes.trim() ? { material_location_notes: materialLocationNotes.trim() } : {}),
          ...(googleMapsUrl.trim() && googleMapsUrl.trim().startsWith("https://")
            ? { google_maps_url: googleMapsUrl.trim() }
            : {}),
          offer_deadline: offerDeadlineISO,
        } as any,
      },
      {
        onSuccess: async (created) => {
          const listingId = (created as { id: string }).id;
          if (imageFile && listingId) {
            setIsUploading(true);
            try { await uploadImage(listingId); } catch (e) { console.warn("image upload failed:", e); } finally { setIsUploading(false); }
          }
          queryClient.invalidateQueries({ queryKey: getListMyListingsQueryKey() });
          setLocation("/listings/mine");
        },
        onError: () => setError(t("listing.form.error")),
      },
    );
  };

  const isBusy = isPending || isUploading;

  const stepLabels = [
    t("listing.form.section.material"),
    t("listing.form.section.pricing"),
    t("listing.form.section.details"),
  ];

  return (
    <AppLayout
      showSignOut
      width="narrow"
      title={t("listing.new.title")}
      subtitle={t("listing.new.subtitle")}
    >
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Step indicator */}
        <StepIndicator current={currentStep} labels={stepLabels} />

        {/* ── Step 0: Material & Location ── */}
        {currentStep === 0 && (
          <Card className="border-card-border bg-card">
            <CardContent className="space-y-3 p-4">

              <div className={`grid gap-3 ${subcategories.length > 0 ? "sm:grid-cols-2" : ""}`}>
                <div className="space-y-1.5">
                  <Label htmlFor="material">{t("listing.form.material")}</Label>
                  <Select
                    value={materialCategoryId}
                    onValueChange={(v) => { setMaterialCategoryId(v); setMaterialSubcategoryId(""); }}
                  >
                    <SelectTrigger id="material">
                      <SelectValue placeholder={t("listing.form.material")} />
                    </SelectTrigger>
                    <SelectContent>
                      {topLevel.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {t(`material.${cat.key}`) !== `material.${cat.key}` ? t(`material.${cat.key}`) : cat.name_ar + " / " + cat.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {subcategories.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="subcategory">{t("listing.form.subcategory")}</Label>
                    <Select value={materialSubcategoryId} onValueChange={setMaterialSubcategoryId}>
                      <SelectTrigger id="subcategory">
                        <SelectValue placeholder={t("listing.form.subcategory.placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name_ar} / {sub.name_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Taxonomy info badges for selected category */}
              {(() => {
                const activeId = materialSubcategoryId || materialCategoryId;
                const entry = (allCategories as MaterialCategory[]).find((c) => c.id === activeId);
                const hasTaxonomy = entry && (entry.regulatory_code || entry.hazard_level || entry.physical_state);
                if (!hasTaxonomy) return null;
                return (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-primary/10 bg-primary/5 px-3 py-2">
                    <span className="text-[10px] text-muted-foreground me-1">{t("taxonomy.info.label")}:</span>
                    {entry.regulatory_code && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-primary/10 text-primary">
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
                        {t(`taxonomy.hazard_level.${entry.hazard_level}`) || entry.hazard_level}
                      </span>
                    )}
                    {entry.physical_state && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700">
                        {t(`taxonomy.physical_state.${entry.physical_state}`) || entry.physical_state}
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Transport Responsibility — required, shown clearly before pricing */}
              <div className="space-y-1.5">
                <Label>{t("listing.transport_responsibility.form_label")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["buyer", "seller"] as const).map((party) => {
                    const active = transportResponsibility === party;
                    return (
                      <button
                        key={party}
                        type="button"
                        onClick={() => setTransportResponsibility(party)}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                        }`}
                      >
                        <Truck className="h-4 w-4 shrink-0" />
                        <span>{t(`listing.transport_responsibility.${party}`)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{t("listing.transport_responsibility.helper")}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="city">{t("listing.form.city")}</Label>
                  <Input id="city" required minLength={2} maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="quantity">{t("listing.form.quantity")}</Label>
                      <Input id="quantity" required type="number" inputMode="decimal" min={0} step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                    </div>
                    <div className="w-[120px] sm:w-[140px] space-y-1.5">
                      <Label htmlFor="unit">{t("listing.form.unit")}</Label>
                      <Select value={resolvedUnitId} onValueChange={setUnitOptionId}>
                        <SelectTrigger id="unit"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(unitOptions as UnitOption[]).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {t(`unit.${u.key}`) !== `unit.${u.key}` ? t(`unit.${u.key}`) : u.name_ar + " / " + u.name_en}
                              {" "}({u.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {isOtherUnit && (
                <div className="space-y-1.5">
                  <Label htmlFor="unit_notes">{t("listing.form.unit_notes.required_label")}</Label>
                  <Input
                    id="unit_notes"
                    placeholder={t("listing.form.unit_notes.placeholder")}
                    value={unitNotes}
                    onChange={(e) => setUnitNotes(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="material_location_address">{t("listing.form.material_location_address")}</Label>
                <Input
                  id="material_location_address"
                  maxLength={500}
                  placeholder={t("listing.form.material_location_address.placeholder")}
                  value={materialLocationAddress}
                  onChange={(e) => setMaterialLocationAddress(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="material_location_notes">{t("listing.form.material_location_notes")}</Label>
                <Input
                  id="material_location_notes"
                  maxLength={500}
                  placeholder={t("listing.form.material_location_notes.placeholder")}
                  value={materialLocationNotes}
                  onChange={(e) => setMaterialLocationNotes(e.target.value)}
                />
              </div>

            </CardContent>
          </Card>
        )}

        {/* ── Step 1: Pricing & Settings ── */}
        {currentStep === 1 && (
          <Card className="border-card-border bg-card">
            <CardContent className="space-y-3 p-4">

              <div className="space-y-1.5">
                <Label>{t("listing.form.saleType")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["auction", "direct"] as SaleType[]).map((type) => {
                    const active = saleType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setSaleType(type);
                          if (type === "auction") {
                            if (pricingModel === "revenue_share") setPricingModel("fixed");
                            setTargetingType("open");
                            setTargetCompanyId("");
                            setSelectedCompany(null);
                            setCompanySearch("");
                            setTargetCategoryIds(new Set());
                          }
                        }}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                          active
                            ? type === "auction"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-secondary bg-secondary/10 text-secondary"
                            : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                        }`}
                      >
                        {type === "auction" ? <Gavel className="h-4 w-4 shrink-0" /> : <ShoppingBag className="h-4 w-4 shrink-0" />}
                        <span>{t(`listing.sale_type.${type}`)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{t(`listing.form.saleType.${saleType}.hint`)}</p>
              </div>

              <div className="space-y-1.5">
                <Label>{t("listing.form.pricingModel")}</Label>
                <div className={`grid gap-2 ${saleType === "direct" ? "grid-cols-3" : "grid-cols-2"}`}>
                  {(["fixed", "by_weight", ...(saleType === "direct" ? ["revenue_share"] : [])] as PricingModel[]).map((model) => {
                    const active = pricingModel === model;
                    const modelColor =
                      model === "fixed"
                        ? "border-secondary bg-secondary/10 text-secondary"
                        : model === "by_weight"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-emerald-500 bg-emerald-50 text-emerald-700";
                    return (
                      <button
                        key={model}
                        type="button"
                        onClick={() => setPricingModel(model)}
                        className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                          active ? modelColor : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                        }`}
                      >
                        {model === "fixed" ? <Tag className="h-4 w-4 shrink-0" /> : model === "by_weight" ? <Scale className="h-4 w-4 shrink-0" /> : <Percent className="h-4 w-4 shrink-0" />}
                        <span className="text-center text-xs leading-tight">{t(`listing.pricing_model.${model}`)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{t(`listing.form.pricingModel.${pricingModel}.hint`)}</p>
              </div>

              {pricingModel === "revenue_share" && (
                <div className="space-y-1.5">
                  <Label htmlFor="revenueSharePct">{t("listing.form.revenue_share_pct")}</Label>
                  <Input
                    id="revenueSharePct"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step="0.1"
                    value={revenueSharePct}
                    onChange={(e) => setRevenueSharePct(e.target.value)}
                    placeholder="e.g. 15"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">{t("listing.form.revenue_share_pct.hint")}</p>
                </div>
              )}

              <div className={`grid gap-3 ${saleType === "direct" ? "sm:grid-cols-2" : ""}`}>
                <div className="space-y-1.5">
                  <Label htmlFor="priceHint">{t("listing.form.priceHint")}</Label>
                  <Input
                    id="priceHint"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={priceHint}
                    onChange={(e) => setPriceHint(e.target.value)}
                  />
                </div>

                {saleType === "direct" && (
                  <div className="space-y-1.5">
                    <Label>{t("listing.form.targeting.label")}</Label>
                    <p className="text-xs text-muted-foreground">{t("listing.form.targeting.hint")}</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["open", "category", "specific_company"] as TargetingType[]).map((type) => {
                        const active = targetingType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setTargetingType(type);
                              setSelectedCompany(null);
                              setCompanySearch("");
                              setCompanyResults([]);
                            }}
                            className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition-all ${
                              active
                                ? type === "open"
                                  ? "border-primary bg-primary/10 text-primary"
                                  : type === "category"
                                  ? "border-secondary bg-secondary/10 text-secondary"
                                  : "border-amber-500 bg-amber-50 text-amber-700"
                                : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                            }`}
                          >
                            {type === "open" ? <Globe className="h-4 w-4 shrink-0" /> : type === "category" ? <Users className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 shrink-0" />}
                            <span className="text-center text-xs leading-tight">{t(`listing.targeting.${type}`)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {saleType === "direct" && targetingType === "category" && (
                <div className="space-y-1.5">
                  <Label>{t("listing.form.targeting.categories.label")}</Label>
                  <p className="text-xs text-muted-foreground">{t("listing.form.targeting.categories.hint")}</p>
                  <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                    {(companyCategoryList as CompanyCategory[]).map((cat) => {
                      const checked = targetCategoryIds.has(cat.id);
                      return (
                        <label
                          key={cat.id}
                          className={`flex items-center gap-2 rounded-md px-3 py-1.5 cursor-pointer transition-colors ${checked ? "bg-secondary/10 text-secondary" : "hover:bg-muted/40 text-muted-foreground"}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setTargetCategoryIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(cat.id)) next.delete(cat.id); else next.add(cat.id);
                                return next;
                              });
                            }}
                            className="h-3.5 w-3.5 accent-secondary shrink-0"
                          />
                          <span className="text-xs font-medium">{cat.name_ar}</span>
                          <span className="text-xs text-muted-foreground">/ {cat.name_en}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {saleType === "direct" && targetingType === "specific_company" && (
                <div className="space-y-1.5">
                  <Label>{t("listing.form.targeting.companySearch.selected")}</Label>
                  <p className="text-xs text-muted-foreground">{t("listing.form.targeting.companySearch.hint")}</p>
                  {selectedCompany ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-secondary">{selectedCompany.name}</p>
                        {selectedCompany.city && <p className="text-xs text-muted-foreground">{selectedCompany.city}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedCompany(null); setCompanySearch(""); setCompanyResults([]); }}
                        className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded"
                      >✕</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        type="text"
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        placeholder={t("listing.form.targeting.companySearch.placeholder")}
                        autoComplete="off"
                      />
                      {(companySearching || companyResults.length > 0 || (companySearch.length >= 2 && !companySearching)) && (
                        <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-background shadow-lg max-h-40 overflow-y-auto">
                          {companySearching ? (
                            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {t("listing.form.targeting.companySearch.searching")}
                            </div>
                          ) : companyResults.length === 0 ? (
                            <p className="px-3 py-3 text-sm text-muted-foreground">{t("listing.form.targeting.companySearch.empty")}</p>
                          ) : (
                            companyResults.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => { setSelectedCompany(c); setCompanySearch(""); setCompanyResults([]); }}
                                className="w-full flex items-start gap-2 px-3 py-2 text-start hover:bg-muted/50 transition-colors"
                              >
                                <div>
                                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                                  {c.city && <p className="text-xs text-muted-foreground">{c.city}</p>}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── CLT-1: Offer Window ── */}
              <div className="space-y-1.5 pt-3 border-t border-border">
                <Label><Clock className="inline h-3.5 w-3.5 me-1" />{t("offer_window.label")}</Label>
                <p className="text-xs text-muted-foreground">{t("offer_window.hint")}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {(["24h", "3d", "7d", "14d", "30d", "custom"] as const).map((preset) => {
                    const active = offerWindowPreset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setOfferWindowPreset(preset)}
                        className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors text-center ${
                          active
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                            : "border-border bg-card hover:border-primary/40 text-muted-foreground"
                        }`}
                      >
                        {t(`offer_window.${preset}`)}
                      </button>
                    );
                  })}
                </div>
                {offerWindowPreset === "custom" && (
                  <Input
                    type="datetime-local"
                    value={offerWindowCustom}
                    onChange={(e) => setOfferWindowCustom(e.target.value)}
                    min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                    max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                    className="mt-1"
                  />
                )}
              </div>

              {/* ── Buyer Eligibility (auction) / Eligible Company Type (direct) ── */}
              {saleType === "auction" ? (
                <div className="space-y-1.5 pt-1">
                  <Label>{t("listing.form.buyerEligibility")}</Label>
                  <p className="text-xs text-muted-foreground">{t("listing.form.buyerEligibility.hint")}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(["open_to_all", "recycling_only"] as const).map((opt) => {
                      const active = buyerEligibility === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setBuyerEligibility(opt)}
                          className={`flex items-start gap-3 rounded-lg border p-3 text-start transition-colors ${
                            active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${active ? "border-primary" : "border-muted-foreground/40"}`}>
                            {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                          </span>
                          <div>
                            <div className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>
                              {t(`listing.buyerEligibility.${opt}.label`)}
                            </div>
                            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                              {t(`listing.buyerEligibility.${opt}.desc`)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 pt-1">
                  <Label>{t("listing.form.eligibleCompanyType")}</Label>
                  <p className="text-xs text-muted-foreground">{t("listing.form.eligibleCompanyType.hint")}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(["ALL", "LICENSED_ONLY"] as const).map((opt) => {
                      const active = eligibleCompanyType === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setEligibleCompanyType(opt)}
                          className={`flex items-start gap-3 rounded-lg border p-3 text-start transition-colors ${
                            active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${active ? "border-primary" : "border-muted-foreground/40"}`}>
                            {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                          </span>
                          <div>
                            <div className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>
                              {t(`listing.eligible.${opt}.label`)}
                            </div>
                            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                              {t(`listing.eligible.${opt}.desc`)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Details & Media ── */}
        {currentStep === 2 && (
          <Card className="border-card-border bg-card">
            <CardContent className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="description">{t("listing.form.description")}</Label>
                  <Textarea
                    id="description"
                    maxLength={500}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("listing.form.image")}</Label>
                  {imagePreview ? (
                    <div className="relative w-full overflow-hidden rounded-lg border border-border">
                      <img src={imagePreview} alt="Preview" className="h-32 w-full object-cover sm:h-full sm:max-h-[9rem]" />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute top-2 end-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 py-5 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 sm:h-full sm:min-h-[8.5rem]"
                    >
                      <ImagePlus className="h-6 w-6" />
                      <span className="text-sm">{t("listing.form.image.prompt")}</span>
                      <span className="text-xs opacity-70">{t("listing.form.image.hint")}</span>
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-2.5 pt-1">
          {currentStep === 0 ? (
            <Button type="button" variant="outline" onClick={() => setLocation("/dashboard")} disabled={isBusy}>
              {t("action.cancel")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => { setCurrentStep((c) => c - 1); setError(null); }}
              disabled={isBusy}
            >
              {t("action.back")}
            </Button>
          )}

          {currentStep < TOTAL_STEPS - 1 && (
            <Button type="button" className="flex-1 gap-2" onClick={advanceStep}>
              {t("action.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {currentStep === TOTAL_STEPS - 1 && (
            <Button type="submit" className="flex-1 gap-2 bg-secondary hover:bg-secondary/90" disabled={isBusy || !materialCategoryId}>
              {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isUploading
                ? t("listing.form.uploading")
                : isPending
                  ? t("listing.form.saving")
                  : t("listing.form.submit")}
            </Button>
          )}
        </div>
      </form>
    </AppLayout>
  );
}
