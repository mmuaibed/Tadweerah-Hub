import { useState, useRef, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateWasteListing,
  useGetMaterialCategories,
  useGetUnitOptions,
  getListMyListingsQueryKey,
  type MaterialCategory,
  type UnitOption,
} from "@workspace/api-client-react";
import { Loader2, ImagePlus, X, Scale, Tag, Gavel, ShoppingBag } from "lucide-react";
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

type PricingModel = "fixed" | "by_weight";
type SaleType = "auction" | "direct";

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
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: allCategories = [] } = useGetMaterialCategories();
  const { data: unitOptions = [] } = useGetUnitOptions();

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
    const form = new FormData();
    form.append("image", imageFile);
    const res = await fetch(`/api/listings/${listingId}/image`, {
      method: "POST",
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
        } as any,
      },
      {
        onSuccess: async (created) => {
          if (imageFile && (created as { id: string }).id) {
            setIsUploading(true);
            try {
              await uploadImage((created as { id: string }).id);
            } catch {
              // Non-fatal — listing is published, image upload failed silently
            } finally {
              setIsUploading(false);
            }
          }
          queryClient.invalidateQueries({ queryKey: getListMyListingsQueryKey() });
          setLocation("/listings/mine");
        },
        onError: () => setError(t("listing.form.error")),
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
                      onClick={() => setSaleType(type)}
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
              <div className="grid grid-cols-2 gap-2">
                {(["fixed", "by_weight"] as PricingModel[]).map((model) => {
                  const active = pricingModel === model;
                  return (
                    <button
                      key={model}
                      type="button"
                      onClick={() => setPricingModel(model)}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                        active
                          ? model === "fixed"
                            ? "border-secondary bg-secondary/10 text-secondary"
                            : "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                      }`}
                    >
                      {model === "fixed" ? (
                        <Tag className="h-4 w-4 shrink-0" />
                      ) : (
                        <Scale className="h-4 w-4 shrink-0" />
                      )}
                      <span>{t(`listing.pricing_model.${model}`)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t(`listing.form.pricingModel.${pricingModel}.hint`)}
              </p>
            </div>

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
