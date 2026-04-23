import { useState, useRef, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateWasteListing,
  getListMyListingsQueryKey,
  WasteMaterial,
  WasteUnit,
} from "@workspace/api-client-react";
import type {
  WasteMaterial as WasteMaterialT,
  WasteUnit as WasteUnitT,
} from "@workspace/api-client-react";
import { Loader2, ImagePlus, X, Scale, Tag } from "lucide-react";
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

const MATERIAL_OPTIONS: WasteMaterialT[] = [
  WasteMaterial.paper,
  WasteMaterial.plastic,
  WasteMaterial.metal,
  WasteMaterial.glass,
  WasteMaterial.electronics,
  WasteMaterial.organic,
  WasteMaterial.other,
];

const UNIT_OPTIONS: WasteUnitT[] = [WasteUnit.kg, WasteUnit.ton];

type PricingModel = "fixed" | "by_weight";

export function ListingNewPage() {
  const { t } = useT();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [material, setMaterial] = useState<WasteMaterialT>(WasteMaterial.plastic);
  const [unit, setUnit] = useState<WasteUnitT>(WasteUnit.kg);
  const [quantity, setQuantity] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [priceHint, setPriceHint] = useState("");
  const [pricingModel, setPricingModel] = useState<PricingModel>("fixed");
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

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError(t("listing.form.error"));
      return;
    }

    const priceNumber = priceHint.trim() ? Number(priceHint) : undefined;

    mutate(
      {
        data: {
          material,
          unit,
          quantity: qty,
          city: city.trim(),
          pricing_model: pricingModel,
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(priceNumber != null && Number.isFinite(priceNumber) && priceNumber >= 0
            ? { price_hint: priceNumber }
            : {}),
        },
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
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="material">{t("listing.form.material")}</Label>
                <Select
                  value={material}
                  onValueChange={(v) => setMaterial(v as WasteMaterialT)}
                >
                  <SelectTrigger id="material">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {t(`material.${m}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="unit">{t("listing.form.unit")}</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as WasteUnitT)}>
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {t(`unit.${u}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
          <Button type="submit" className="flex-1 gap-2" disabled={isBusy}>
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
