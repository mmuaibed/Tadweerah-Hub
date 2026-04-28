import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { useGetMe } from "@workspace/api-client-react";
import {
  Recycle,
  ShoppingBag,
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
  TrendingUp,
  Truck,
  Sparkles,
  Bell,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

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

function StatPill({
  icon: Icon, label, value, href,
}: {
  icon: typeof Recycle;
  label: string;
  value: number | string;
  href?: string;
}) {
  const inner = (
    <div
      className={`flex flex-col items-center gap-0.5 rounded-lg border border-border bg-card px-3 py-2 min-w-0 transition-colors ${
        href ? "hover:border-primary/40 hover:bg-primary/5 cursor-pointer" : ""
      }`}
    >
      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="text-base font-bold text-foreground leading-none">{value}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
  if (href) return <Link to={href}>{inner}</Link>;
  return inner;
}

type NextBannerProps = {
  stats: DashboardStats;
  t: (k: string) => string;
  Arrow: typeof ArrowLeft;
};

function NextActionBanner({ stats, t, Arrow }: NextBannerProps) {
  const isFirstUse =
    stats.listings_count === 0 &&
    stats.offers_received_count === 0 &&
    stats.offers_made_count === 0;

  if (isFirstUse) {
    return (
      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{t("dashboard.onboarding.title")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("dashboard.onboarding.desc")}</p>
          </div>
          <Link to="/listings/new">
            <button className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              {t("dashboard.onboarding.cta")}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (stats.offers_received_count > 0) {
    return (
      <div className="mb-4 rounded-xl border border-secondary/25 bg-secondary/5 p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
            <Bell className="h-3.5 w-3.5" />
          </span>
          <p className="flex-1 text-sm font-semibold text-foreground">
            {t("dashboard.next.offers_received")}
          </p>
          <Link to="/listings/mine">
            <button className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-secondary/40 bg-card px-3 py-1.5 text-xs font-medium text-secondary hover:bg-secondary/10 transition-colors">
              {t("dashboard.next.offers_received.cta")}
              <Arrow className="h-3 w-3" />
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (stats.offers_made_count > 0) {
    return (
      <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-3.5 w-3.5" />
          </span>
          <p className="flex-1 text-sm font-semibold text-foreground">
            {t("dashboard.next.offers_made")}
          </p>
          <Link to="/participations">
            <button className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-card px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
              {t("dashboard.next.offers_made.cta")}
              <Arrow className="h-3 w-3" />
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

const SECONDARY_CARDS = [
  { titleKey: "myListings.title",          descKey: "myListings.subtitle",          icon: FileText,   href: "/listings/mine" },
  { titleKey: "participations.title",      descKey: "participations.subtitle",      icon: TrendingUp, href: "/participations" },
  { titleKey: "capabilities.title",        descKey: "capabilities.subtitle",        icon: Settings,   href: "/company/capabilities" },
  { titleKey: "reports.title",             descKey: "reports.subtitle",             icon: BarChart2,  href: "/reports" },
  { titleKey: "members.dashboard.title",   descKey: "members.dashboard.subtitle",   icon: Users,      href: "/company/members" },
  { titleKey: "profile.nav.title",         descKey: "profile.nav.subtitle",         icon: Building2,  href: "/company/profile" },
] as const;

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

      {/* ── Company header ── */}
      <div className="mb-3 flex items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t("dashboard.welcome")}</p>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl truncate">{company.name}</h1>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Truck className="h-3 w-3 shrink-0" />
            {company.city}
          </p>
        </div>
      </div>

      {/* ── Activity stats — clickable ── */}
      {stats && (
        <div className="mb-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("dashboard.stats.title")}
          </p>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
            <StatPill icon={FileText}   label={t("dashboard.stats.listings")}        value={stats.listings_count}         href="/listings/mine" />
            <StatPill icon={Bell}       label={t("dashboard.stats.offers_received")} value={stats.offers_received_count}  href="/listings/mine" />
            <StatPill icon={Package}    label={t("dashboard.stats.offers_made")}     value={stats.offers_made_count}      href="/participations" />
            <StatPill icon={Handshake}  label={t("dashboard.stats.completed_deals")} value={stats.completed_deals_count}  href="/reports" />
            <StatPill
              icon={BarChart2}
              label={t("dashboard.stats.total_value")}
              value={
                stats.total_deal_value > 0
                  ? stats.total_deal_value.toLocaleString(
                      lang === "ar" ? "ar-SA" : "en-US",
                      { maximumFractionDigits: 0 }
                    )
                  : "—"
              }
              href="/reports"
            />
          </div>
        </div>
      )}

      {/* ── Context-aware next-action nudge ── */}
      {stats && <NextActionBanner stats={stats} t={t} Arrow={Arrow} />}

      {/* ── Primary action cards (blue = produce, green = buy) ── */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link to="/listings/new">
          <div className="group flex cursor-pointer items-center gap-3.5 rounded-xl border-2 border-primary/25 bg-primary/5 px-4 py-3.5 transition-all hover:border-primary/45 hover:bg-primary/10">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Recycle className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-primary/70">{t("dashboard.primary.producer")}</p>
              <h3 className="text-sm font-bold text-foreground">{t("listing.new.title")}</h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{t("listing.new.subtitle")}</p>
            </div>
            <Arrow className="h-4 w-4 shrink-0 text-primary opacity-60 transition-opacity group-hover:opacity-100" />
          </div>
        </Link>

        <Link to="/marketplace">
          <div className="group flex cursor-pointer items-center gap-3.5 rounded-xl border-2 border-secondary/25 bg-secondary/5 px-4 py-3.5 transition-all hover:border-secondary/45 hover:bg-secondary/10">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-secondary/70">{t("dashboard.primary.buyer")}</p>
              <h3 className="text-sm font-bold text-foreground">{t("marketplace.title")}</h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{t("marketplace.subtitle")}</p>
            </div>
            <Arrow className="h-4 w-4 shrink-0 text-secondary opacity-60 transition-opacity group-hover:opacity-100" />
          </div>
        </Link>
      </div>

      {/* ── Secondary tools ── */}
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("dashboard.tools.title")}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:grid-cols-3">
        {SECONDARY_CARDS.map(({ titleKey, descKey, icon: Icon, href }) => (
          <Link key={titleKey} to={href}>
            <Card className="group h-full cursor-pointer border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-sm">
              <CardContent className="flex h-full flex-col items-start gap-2 p-3 sm:p-3.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-card-foreground">{t(titleKey)}</h3>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground">{t(descKey)}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
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
