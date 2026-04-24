import { useState, useRef, type FormEvent } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateWasteListing,
  useGetMaterialCategories,
  useGetUnitOptions,
  useGetCapabilities,
  getListMyListingsQueryKey,
  type MaterialCategory,
  type UnitOption,
  type Capability,
} from "@workspace/api-client-react";
import { Loader2, ImagePlus, X, Scale, Tag, Gavel, ShoppingBag, Percent, Shield, Lock, Globe, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

type PricingModel = "fixed" | "by_weight" | "revenue_share";
type SaleType = "auction" | "direct";
type TargetingType = "open" | "specific_company";

const LEGACY_MATERIAL_KEYS = new Set(["paper", "plastic", "metal", "glass", "electronics", "organic", "other"]);
const LEGACY_UNIT_KEYS = new Set(["kg", "ton"]);

function toLegacyMaterial(key: string): string {
  return LEGACY_MATERIAL_KEYS.has(key) ? key : "other";
}

function toLegacyUnit(key: string): string {
  return LEGACY_UNIT_KEYS.has(key) ? key : "kg";
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

  const topLevel = (allCategories as MaterialCategory[]).filter((c) => !c.parent_id);
  const [materialCategoryId, setMaterialCategoryId] = useState<string>("");
  const [materialSubcategoryId, setMaterialSubcategoryId] = useState<string>("");

  const subcategories = (allCategories as MaterialCategory[]).filter(
    (c) => c.parent_id === materialCategoryId,
  );

  const defaultUnitId = (unitOptions as UnitOption[])[0]?.id ?? "";
  const [unitOptionId, setUnitOptionId] = useState<string>("");
  const resolvedUnitId = unitOptionId || defaultUnitId;

  const [quantity, setQuantity] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [priceHint, setPriceHint] = useState("");
  const [pricingModel, setPricingModel] = useState<PricingModel>("fixed");
  const [saleType, setSaleType] = useState<SaleType>("auction");
  const [revenueSharePct, setRevenueSharePct] = useState("");
  const [requiredServiceIds, setRequiredServiceIds] = useState<Set<string>>(new Set());
  const [targetingType, setTargetingType] = useState<TargetingType>("open");
  const [targetCompanyId, setTargetCompanyId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useCreateWasteListing();

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!materialCategoryId) {
      setError(t("listing.form.error"));
      return;
    }

    const selectedCategory = (allCategories as MaterialCategory[]).find((c) => c.id === materialCategoryId);
    const selectedUnit = (unitOptions as UnitOption[]).find((u) => u.id === resolvedUnitId);

    const legacyMaterial = selectedCategory ? toLegacyMaterial(selectedCategory.key) : "other";
    const legacyUnit = selectedUnit ? toLegacyUnit(selectedUnit.key) : "kg";

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError(t("listing.form.error"));
      return;
    }

    const priceNumber = priceHint.trim() ? Number(priceHint) : undefined;

    mutate(
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          ...(saleType === "direct" ? { targeting_type: targetingType } : {}),
          ...(saleType === "direct" && targetingType === "specific_company" && targetCompanyId.trim()
            ? { target_company_id: targetCompanyId.trim() }
            : {}),
        } as any,
      },
      {
        onSuccess: async (created) => {
          const listingId = (created as { id: string }).id;
          console.log("[tadweerah] listing created:", listingId);
          if (imageFile && listingId) {
            setIsUploading(true);
            try {
              await uploadImage(listingId);
              console.log("[tadweerah] listing image uploaded:", listingId);
            } catch (e) {
              console.warn("[tadweerah] listing image upload failed (non-fatal):", e);
            } finally {
              setIsUploading(false);
            }
          }
          queryClient.invalidateQueries({ queryKey: getListMyListingsQueryKey() });
          setLocation("/listings/mine");
        },
        onError: (err) => {
          console.warn("[tadweerah] listing creation failed:", err);
          const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "";
          if (code === "LicenseInvalid") {
            setError(t("listing.form.error.license_invalid"));
          } else {
            setError(t("listing.form.error"));
          }
        },
      },
    );
  };

  const isBusy = isPending || isUploading;

  return (
    <AppLayout
      showSignOut
      width="narrow"
      title={t("listing.new.title")}
      subtitle={t("listing.new.subtitle")}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-card-border bg-card">
          <CardContent className="space-y-5 p-6">
            {/* Material category */}
            <div className="space-y-2">
              <Label htmlFor="material">{t("listing.form.material")}</Label>
              <Select
                value={materialCategoryId}
                onValueChange={(v) => {
                  setMaterialCategoryId(v);
                  setMaterialSubcategoryId("");
                }}
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

            {/* Subcategory — shown only when the selected category has children */}
            {subcategories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="subcategory">{t("listing.form.subcategory")}</Label>
                <Select
                  value={materialSubcategoryId}
                  onValueChange={setMaterialSubcategoryId}
                >
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

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">{t("listing.form.city")}</Label>
                <Input
                  id="city"
                  required
                  minLength={2}
                  maxLength={80}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">{t("listing.form.quantity")}</Label>
                <Input
                  id="quantity"
                  required
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>

            {/* Unit — from lookup table */}
            <div className="space-y-2">
              <Label htmlFor="unit">{t("listing.form.unit")}</Label>
              <Select value={resolvedUnitId} onValueChange={setUnitOptionId}>
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
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

            {/* Sale type toggle */}
            <div className="space-y-2">
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
                        }
                      }}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                        active
                          ? type === "auction"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-secondary bg-secondary/10 text-secondary"
                          : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                      }`}
                    >
                      {type === "auction" ? (
                        <Gavel className="h-4 w-4 shrink-0" />
                      ) : (
                        <ShoppingBag className="h-4 w-4 shrink-0" />
                      )}
                      <span>{t(`listing.sale_type.${type}`)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t(`listing.form.saleType.${saleType}.hint`)}
              </p>
            </div>

            {/* Pricing model toggle */}
            <div className="space-y-2">
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
                      className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-all ${
                        active ? modelColor : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                      }`}
                    >
                      {model === "fixed" ? (
                        <Tag className="h-4 w-4 shrink-0" />
                      ) : model === "by_weight" ? (
                        <Scale className="h-4 w-4 shrink-0" />
                      ) : (
                        <Percent className="h-4 w-4 shrink-0" />
                      )}
                      <span className="text-center text-xs leading-tight">{t(`listing.pricing_model.${model}`)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t(`listing.form.pricingModel.${pricingModel}.hint`)}
              </p>
            </div>

            {/* Revenue share percentage — shown only when revenue_share is selected */}
            {pricingModel === "revenue_share" && (
              <div className="space-y-2">
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

            {/* Targeting — only for direct sale */}
            {saleType === "direct" && (
              <div className="space-y-2">
                <Label>{t("listing.form.targeting.label")}</Label>
                <p className="text-xs text-muted-foreground">{t("listing.form.targeting.hint")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["open", "specific_company"] as TargetingType[]).map((type) => {
                    const active = targetingType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTargetingType(type)}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-all ${
                          active
                            ? type === "open"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-amber-500 bg-amber-50 text-amber-700"
                            : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                        }`}
                      >
                        {type === "open" ? (
                          <Globe className="h-4 w-4 shrink-0" />
                        ) : (
                          <Lock className="h-4 w-4 shrink-0" />
                        )}
                        <span className="text-center text-xs leading-tight">
                          {t(`listing.targeting.${type}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {targetingType === "specific_company" && (
                  <div className="space-y-1 pt-1">
                    <Label htmlFor="targetCompanyId">{t("listing.form.targeting.companyId.label")}</Label>
                    <Input
                      id="targetCompanyId"
                      type="text"
                      value={targetCompanyId}
                      onChange={(e) => setTargetCompanyId(e.target.value)}
                      placeholder={t("listing.form.targeting.companyId.placeholder")}
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">{t("listing.form.targeting.companyId.hint")}</p>
                  </div>
                )}
              </div>
            )}

            {/* Price hint */}
            <div className="space-y-2">
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

            {/* Required services */}
            {(allCapabilities as Capability[]).length > 0 && (
              <div className="space-y-2">
                <Label>{t("listing.form.requiredServices")}</Label>
                <p className="text-xs text-muted-foreground">{t("listing.form.requiredServices.hint")}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(allCapabilities as Capability[]).map((cap) => {
                    const checked = requiredServiceIds.has(cap.id);
                    return (
                      <label
                        key={cap.id}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors ${
                          checked
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 rounded accent-primary"
                          checked={checked}
                          onChange={() => {
                            setRequiredServiceIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(cap.id)) next.delete(cap.id);
                              else next.add(cap.id);
                              return next;
                            });
                          }}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">{cap.name_ar}</span>
                          <span className="text-xs text-muted-foreground">{cap.name_en}</span>
                          {cap.requires_license && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-600">
                              <Shield className="h-3 w-3" />
                              {t("license.status.approved")}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t("listing.form.description")}</Label>
              <Textarea
                id="description"
                maxLength={500}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <Label>{t("listing.form.image")}</Label>
              {imagePreview ? (
                <div className="relative w-full overflow-hidden rounded-lg border border-border">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-44 w-full object-cover"
                  />
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
                  className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm">{t("listing.form.image.prompt")}</span>
                  <span className="text-xs opacity-70">{t("listing.form.image.hint")}</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/dashboard")}
            disabled={isBusy}
          >
            {t("action.cancel")}
          </Button>
          <Button
            type="submit"
            className="flex-1 gap-2"
            disabled={isBusy || !materialCategoryId}
          >
            {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isUploading
              ? t("listing.form.uploading")
              : isPending
                ? t("listing.form.saving")
                : t("listing.form.submit")}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
