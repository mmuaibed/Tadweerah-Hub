import { useState, type FormEvent } from "react";
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
import { Loader2 } from "lucide-react";
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

export function ListingNewPage() {
  const { t } = useT();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [material, setMaterial] = useState<WasteMaterialT>(WasteMaterial.plastic);
  const [unit, setUnit] = useState<WasteUnitT>(WasteUnit.kg);
  const [quantity, setQuantity] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [priceHint, setPriceHint] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useCreateWasteListing();

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
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(priceNumber != null && Number.isFinite(priceNumber) && priceNumber >= 0
            ? { price_hint: priceNumber }
            : {}),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMyListingsQueryKey() });
          setLocation("/listings/mine");
        },
        onError: () => setError(t("listing.form.error")),
      },
    );
  };

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

            <div className="space-y-2">
              <Label htmlFor="description">{t("listing.form.description")}</Label>
              <Textarea
                id="description"
                maxLength={500}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
            disabled={isPending}
          >
            {t("action.cancel")}
          </Button>
          <Button type="submit" className="flex-1 gap-2" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? t("listing.form.saving") : t("listing.form.submit")}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
