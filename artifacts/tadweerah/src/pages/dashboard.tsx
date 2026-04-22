import { useGetMe } from "@workspace/api-client-react";
import type { CompanyType } from "@workspace/api-client-react";
import { Recycle, ShoppingBag, Truck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/topbar";
import { useT } from "@/i18n";

const ROLE_KEY: Record<CompanyType, string> = {
  producer: "dashboard.role.producer",
  buyer: "dashboard.role.buyer",
  carrier: "dashboard.role.carrier",
};

const ROLE_ICON: Record<CompanyType, typeof Recycle> = {
  producer: Recycle,
  buyer: ShoppingBag,
  carrier: Truck,
};

const ROLE_CARDS: Record<
  CompanyType,
  Array<{ titleKey: string; descKey: string; icon: typeof Recycle }>
> = {
  producer: [
    { titleKey: "card.producer.1.title", descKey: "card.producer.1.desc", icon: Recycle },
    { titleKey: "card.producer.2.title", descKey: "card.producer.2.desc", icon: ShoppingBag },
    { titleKey: "card.producer.3.title", descKey: "card.producer.3.desc", icon: Truck },
  ],
  buyer: [
    { titleKey: "card.buyer.1.title", descKey: "card.buyer.1.desc", icon: ShoppingBag },
    { titleKey: "card.buyer.2.title", descKey: "card.buyer.2.desc", icon: Recycle },
    { titleKey: "card.buyer.3.title", descKey: "card.buyer.3.desc", icon: Truck },
  ],
  carrier: [
    { titleKey: "card.carrier.1.title", descKey: "card.carrier.1.desc", icon: Truck },
    { titleKey: "card.carrier.2.title", descKey: "card.carrier.2.desc", icon: Recycle },
    { titleKey: "card.carrier.3.title", descKey: "card.carrier.3.desc", icon: ShoppingBag },
  ],
};

export function DashboardPage() {
  const { t } = useT();
  const { data: me, isLoading } = useGetMe();

  if (isLoading || !me?.company) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <Topbar showSignOut />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const company = me.company;
  const RoleIcon = ROLE_ICON[company.type];
  const cards = ROLE_CARDS[company.type];

  return (
    <div className="min-h-[100dvh] bg-background">
      <Topbar showSignOut />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t("dashboard.welcome")}</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">
              {company.name}
            </h1>
            <div className="mt-3 flex items-center gap-3">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                <RoleIcon className="h-3.5 w-3.5" />
                {t(ROLE_KEY[company.type])}
              </Badge>
              <span className="text-sm text-muted-foreground">{company.city}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {cards.map(({ titleKey, descKey, icon: Icon }) => (
            <Card
              key={titleKey}
              className="relative cursor-not-allowed border-card-border bg-card opacity-70"
            >
              <CardContent className="flex flex-col items-start gap-4 p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-card-foreground">
                      {t(titleKey)}
                    </h3>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {t("dashboard.comingsoon")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(descKey)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
