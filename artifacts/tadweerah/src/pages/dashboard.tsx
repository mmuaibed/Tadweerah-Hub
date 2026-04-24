import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
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
  Users,
  Package,
  Handshake,
  Building2,
  Sparkles,
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
  { titleKey: "listing.new.title", descKey: "listing.new.subtitle", icon: Recycle, href: "/listings/new" },
  { titleKey: "myListings.title", descKey: "myListings.subtitle", icon: FileText, href: "/listings/mine" },
  { titleKey: "marketplace.title", descKey: "marketplace.subtitle", icon: ShoppingBag, href: "/marketplace" },
  { titleKey: "participations.title", descKey: "participations.subtitle", icon: TrendingUp, href: "/participations" },
  { titleKey: "capabilities.title", descKey: "capabilities.subtitle", icon: Settings, href: "/company/capabilities" },
  { titleKey: "reports.title", descKey: "reports.subtitle", icon: BarChart2, href: "/reports" },
  { titleKey: "members.dashboard.title", descKey: "members.dashboard.subtitle", icon: Users, href: "/company/members" },
  { titleKey: "profile.nav.title", descKey: "profile.nav.subtitle", icon: Building2, href: "/company/profile" },
];

interface DashboardStats {
  listings_count: number;
  offers_received_count: number;
  offers_made_count: number;
  completed_deals_count: number;
  total_deal_value: number;
}

function useDashboardStats() {
  const { getToken } = useAuth();
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/dashboard/stats", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("stats fetch failed");
      return res.json() as Promise<DashboardStats>;
    },
    staleTime: 60_000,
  });
}

function StatPill({ icon: Icon, label, value }: { icon: typeof Recycle; label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-4 py-3 min-w-0">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <span className="text-lg font-bold text-foreground leading-none">{value}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

export function DashboardPage() {
  const { t, lang } = useT();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const { data: me, isLoading } = useGetMe();
  const { data: stats } = useDashboardStats();

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
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">{t("dashboard.welcome")}</p>
        <h1 className="mt-1 text-3xl font-bold text-foreground sm:text-4xl">{company.name}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Truck className="h-3.5 w-3.5" />
          {company.city}
        </p>
      </div>

      {/* V4 — Activity stats strip */}
      {stats && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{t("dashboard.stats.title")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            <StatPill icon={FileText}    label={t("dashboard.stats.listings")}         value={stats.listings_count} />
            <StatPill icon={TrendingUp}  label={t("dashboard.stats.offers_received")}  value={stats.offers_received_count} />
            <StatPill icon={Package}     label={t("dashboard.stats.offers_made")}      value={stats.offers_made_count} />
            <StatPill icon={Handshake}   label={t("dashboard.stats.completed_deals")}  value={stats.completed_deals_count} />
            <StatPill
              icon={BarChart2}
              label={t("dashboard.stats.total_value")}
              value={stats.total_deal_value > 0
                ? stats.total_deal_value.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 })
                : "—"}
            />
          </div>
        </div>
      )}

      {/* Onboarding CTA — shown only to new accounts with no activity yet */}
      {stats && stats.listings_count === 0 && stats.offers_received_count === 0 && stats.offers_made_count === 0 && (
        <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground">{t("dashboard.onboarding.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t("dashboard.onboarding.desc")}</p>
              <Link to="/listings/new">
                <button className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
                  <Recycle className="h-4 w-4" />
                  {t("dashboard.onboarding.cta")}
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

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
