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
    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-border bg-card px-3 py-2 min-w-0">
      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="text-base font-bold text-foreground leading-none">{value}</span>
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
      {/* Compact company header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t("dashboard.welcome")}</p>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl truncate">{company.name}</h1>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Truck className="h-3 w-3 shrink-0" />
            {company.city}
          </p>
        </div>
      </div>

      {/* Activity stats strip */}
      {stats && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">{t("dashboard.stats.title")}</p>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
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

      {/* Onboarding CTA */}
      {stats && stats.listings_count === 0 && stats.offers_received_count === 0 && stats.offers_made_count === 0 && (
        <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:p-4">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-foreground">{t("dashboard.onboarding.title")}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{t("dashboard.onboarding.desc")}</p>
              <Link to="/listings/new">
                <button className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
                  <Recycle className="h-3.5 w-3.5" />
                  {t("dashboard.onboarding.cta")}
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Nav grid — 4-col on desktop = 2 rows for 8 cards */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4 sm:gap-2.5">
        {PLATFORM_CARDS.map(({ titleKey, descKey, icon: Icon, href }) => (
          <Link key={titleKey} to={href}>
            <Card className="group h-full border-card-border bg-card transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex h-full flex-col items-start gap-2 p-3 sm:p-3.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-card-foreground">{t(titleKey)}</h3>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground line-clamp-2">{t(descKey)}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  {t("action.getstarted")}
                  <Arrow className="h-3 w-3" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
