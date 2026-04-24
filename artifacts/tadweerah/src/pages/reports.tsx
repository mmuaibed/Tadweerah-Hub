import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { Leaf, BarChart3, Award, TrendingUp, Lock, Shield, FileText, Package, Handshake } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
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

export function ReportsPage() {
  const { t, lang } = useT();
  const { data: stats } = useDashboardStats();

  const impactMetrics = [
    {
      icon: FileText,
      labelKey: "reports.impact.listings",
      value: stats?.listings_count,
      colorClass: "bg-blue-100 text-blue-700",
    },
    {
      icon: TrendingUp,
      labelKey: "reports.impact.offers_received",
      value: stats?.offers_received_count,
      colorClass: "bg-purple-100 text-purple-700",
    },
    {
      icon: Package,
      labelKey: "reports.impact.offers_made",
      value: stats?.offers_made_count,
      colorClass: "bg-amber-100 text-amber-700",
    },
    {
      icon: Handshake,
      labelKey: "reports.impact.completed_deals",
      value: stats?.completed_deals_count,
      colorClass: "bg-green-100 text-green-700",
    },
    {
      icon: BarChart3,
      labelKey: "reports.impact.total_value",
      value: stats?.total_deal_value != null
        ? stats.total_deal_value > 0
          ? stats.total_deal_value.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 })
          : "0"
        : undefined,
      colorClass: "bg-primary/10 text-primary",
      suffix: lang === "ar" ? " ريال" : " SAR",
    },
  ];

  const futureMetrics = [
    { icon: Leaf,     key: "reports.metric.co2",    colorClass: "bg-green-100 text-green-700" },
    { icon: BarChart3,key: "reports.metric.weight",  colorClass: "bg-blue-100 text-blue-700" },
    { icon: Award,    key: "reports.metric.deals",   colorClass: "bg-amber-100 text-amber-700" },
    { icon: TrendingUp,key:"reports.metric.growth",  colorClass: "bg-purple-100 text-purple-700" },
  ];

  return (
    <AppLayout title={t("reports.title")} subtitle={t("reports.subtitle")}>

      {/* V7 — Real operational impact summary */}
      <div className="mb-8 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t("reports.impact.title")}</h2>
          {/* V6 — Compliance trust signal */}
          <div className="flex items-center gap-1.5 rounded-full border border-green-300 bg-green-50 px-2.5 py-1">
            <Shield className="h-3 w-3 text-green-700 shrink-0" />
            <span className="text-[10px] font-semibold text-green-800">{t("deal.compliance.badge")}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {impactMetrics.map(({ icon: Icon, labelKey, value, colorClass, suffix }) => (
            <Card key={labelKey} className="border-border bg-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground leading-none">
                    {value !== undefined ? `${value}${suffix ?? ""}` : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t(labelKey)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2 flex items-center gap-2">
          <Shield className="h-3 w-3 text-muted-foreground shrink-0" />
          <p className="text-[10px] text-muted-foreground">{t("reports.impact.disclaimer")}</p>
        </div>
      </div>

      {/* Placeholder banner for advanced analytics */}
      <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 px-6 py-5 text-center space-y-2">
        <Leaf className="mx-auto h-8 w-8 text-primary" />
        <h3 className="font-semibold text-foreground">{t("reports.coming.title")}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {t("reports.coming.desc")}
        </p>
      </div>

      {/* Future metric cards (subscription-gated) */}
      <div className="grid gap-4 sm:grid-cols-2">
        {futureMetrics.map(({ icon: Icon, key, colorClass }) => (
          <Card key={key} className="border-border bg-card relative overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClass} opacity-60`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-muted-foreground">—</p>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border bg-muted/50 px-1.5 py-0.5 rounded-full">
                    <Lock className="h-2.5 w-2.5" />
                    {t("reports.subscription.badge")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{t(key)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground mt-3">{t("reports.subscription.desc")}</p>
    </AppLayout>
  );
}
