import { Link } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import {
  Recycle,
  ShoppingBag,
  Truck,
  TrendingUp,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Settings,
  FileText,
  BarChart2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

interface PlatformCard {
  titleKey: string;
  descKey: string;
  icon: typeof Recycle;
  href: string;
}

const PLATFORM_CARDS: PlatformCard[] = [
  {
    titleKey: "listing.new.title",
    descKey: "listing.new.subtitle",
    icon: Recycle,
    href: "/listings/new",
  },
  {
    titleKey: "myListings.title",
    descKey: "myListings.subtitle",
    icon: FileText,
    href: "/listings/mine",
  },
  {
    titleKey: "marketplace.title",
    descKey: "marketplace.subtitle",
    icon: ShoppingBag,
    href: "/marketplace",
  },
  {
    titleKey: "participations.title",
    descKey: "participations.subtitle",
    icon: TrendingUp,
    href: "/participations",
  },
  {
    titleKey: "capabilities.title",
    descKey: "capabilities.subtitle",
    icon: Settings,
    href: "/company/capabilities",
  },
  {
    titleKey: "reports.title",
    descKey: "reports.subtitle",
    icon: BarChart2,
    href: "/reports",
  },
];

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

  return (
    <AppLayout showSignOut>
      <div className="mb-10">
        <p className="text-sm text-muted-foreground">{t("dashboard.welcome")}</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">{company.name}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Truck className="h-3.5 w-3.5" />
          {company.city}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
        {PLATFORM_CARDS.map(({ titleKey, descKey, icon: Icon, href }) => (
          <Link key={titleKey} to={href}>
            <Card className="group h-full border-card-border bg-card transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex h-full flex-col items-start gap-4 p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-card-foreground">{t(titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {t("action.getstarted")}
                  <Arrow className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
