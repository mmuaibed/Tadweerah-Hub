import { Leaf, BarChart3, Award, TrendingUp } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n";

export function ReportsPage() {
  const { t } = useT();

  const metrics = [
    {
      icon: Leaf,
      key: "reports.metric.co2",
      colorClass: "bg-green-100 text-green-700",
    },
    {
      icon: BarChart3,
      key: "reports.metric.weight",
      colorClass: "bg-blue-100 text-blue-700",
    },
    {
      icon: Award,
      key: "reports.metric.deals",
      colorClass: "bg-amber-100 text-amber-700",
    },
    {
      icon: TrendingUp,
      key: "reports.metric.growth",
      colorClass: "bg-purple-100 text-purple-700",
    },
  ];

  return (
    <AppLayout
      width="default"
      title={t("reports.title")}
      subtitle={t("reports.subtitle")}
    >
      {/* Placeholder banner */}
      <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 px-6 py-5 text-center space-y-2">
        <Leaf className="mx-auto h-8 w-8 text-primary" />
        <h3 className="font-semibold text-foreground">{t("reports.coming.title")}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {t("reports.coming.desc")}
        </p>
      </div>

      {/* Metric cards (placeholder) */}
      <div className="grid gap-4 sm:grid-cols-2">
        {metrics.map(({ icon: Icon, key, colorClass }) => (
          <Card key={key} className="border-border bg-card">
            <CardContent className="p-5 flex items-center gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${colorClass}`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">—</p>
                <p className="text-xs text-muted-foreground">{t(key)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
