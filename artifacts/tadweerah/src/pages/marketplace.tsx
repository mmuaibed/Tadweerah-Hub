import { useState } from "react";
import {
  useListMarketplaceListings,
  WasteMaterial,
} from "@workspace/api-client-react";
import type { WasteMaterial as WasteMaterialT } from "@workspace/api-client-react";
import { Loader2, ShoppingBag, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/app-layout";
import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import { useT } from "@/i18n";

const ALL = "__all__";

const MATERIAL_OPTIONS: WasteMaterialT[] = [
  WasteMaterial.paper,
  WasteMaterial.plastic,
  WasteMaterial.metal,
  WasteMaterial.glass,
  WasteMaterial.electronics,
  WasteMaterial.organic,
  WasteMaterial.other,
];

export function MarketplacePage() {
  const { t } = useT();
  const [material, setMaterial] = useState<string>(ALL);
  const [city, setCity] = useState("");

  const params: { material?: WasteMaterialT; city?: string } = {};
  if (material !== ALL) params.material = material as WasteMaterialT;
  if (city.trim()) params.city = city.trim();

  const { data, isLoading, isError } = useListMarketplaceListings(params);

  return (
    <AppLayout
      showSignOut
      title={t("marketplace.title")}
      subtitle={t("marketplace.subtitle")}
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Select value={material} onValueChange={setMaterial}>
          <SelectTrigger>
            <SelectValue placeholder={t("marketplace.filter.material")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("marketplace.filter.all")}</SelectItem>
            {MATERIAL_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>
                {t(`material.${m}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
          <Input
            placeholder={t("marketplace.filter.city")}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && isError && (
        <EmptyState
          icon={ShoppingBag}
          title={t("error.loading")}
          description={t("error.generic")}
        />
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title={t("marketplace.empty.title")}
          description={t("marketplace.empty.desc")}
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
