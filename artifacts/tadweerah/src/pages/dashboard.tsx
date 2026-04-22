import { Link } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import type { CompanyType } from "@workspace/api-client-react";
import { Recycle, ShoppingBag, Truck, TrendingUp, Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/app-layout";
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

interface RoleCard {
  titleKey: string;
  descKey: string;
  icon: typeof Recycle;
  href?: string; // when set the card is enabled
}

const ROLE_CARDS: Record<CompanyType, RoleCard[]> = {
  producer: [
    { titleKey: "listing.new.title", descKey: "listing.new.subtitle", icon: Recycle, href: "/listings/new" },
    { titleKey: "myListings.title", descKey: "myListings.subtitle", icon: ShoppingBag, href: "/listings/mine" },
  ],
  buyer: [
    { titleKey: "marketplace.title", descKey: "marketplace.subtitle", icon: ShoppingBag, href: "/marketplace" },
    { titleKey: "participations.title", descKey: "participations.subtitle", icon: TrendingUp, href: "/participations" },
  ],
  carrier: [
    { titleKey: "dashboard.role.carrier", descKey: "dashboard.comingsoon", icon: Truck },
  ],
};

export function DashboardPage() {
  const { t, lang } = useT();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const { data: me, isLoading } = useGetMe();

  if (isLoading || !me?.company) {
    return (
      <AppLayout showSignOut>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const company = me.company;
  const RoleIcon = ROLE_ICON[company.type];
  const cards = ROLE_CARDS[company.type];

  return (
    <AppLayout showSignOut>
      <div className="mb-10">
        <p className="text-sm text-muted-foreground">{t("dashboard.welcome")}</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">{company.name}</h1>
        <div className="mt-3 flex items-center gap-3">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <RoleIcon className="h-3.5 w-3.5" />
            {t(ROLE_KEY[company.type])}
          </Badge>
          <span className="text-sm text-muted-foreground">{company.city}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
        {cards.map(({ titleKey, descKey, icon: Icon, href }) => {
          const enabled = Boolean(href);
          const card = (
            <Card
              className={`group h-full border-card-border bg-card transition-all ${
                enabled ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : "cursor-not-allowed opacity-70"
              }`}
            >
              <CardContent className="flex h-full flex-col items-start gap-4 p-6">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                    enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-card-foreground">{t(titleKey)}</h3>
                    {!enabled && (
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {t("dashboard.comingsoon")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
                </div>
                {enabled && (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {t("action.getstarted")}
                    <Arrow className="h-3.5 w-3.5" />
                  </span>
                )}
              </CardContent>
            </Card>
          );
          return enabled ? (
            <Link key={titleKey} to={href!}>{card}</Link>
          ) : (
            <div key={titleKey}>{card}</div>
          );
        })}
      </div>
    </AppLayout>
  );
}
