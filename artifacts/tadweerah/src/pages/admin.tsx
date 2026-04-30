import { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n";

interface AdminDeal {
  deal_id: string;
  status: string;
  manifest_ref: string | null;
  mwan_score: string;
  missing_count: number;
  is_mwan_ready: boolean;
  created_at: string;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  completed: "default",
  dispatched: "outline",
  payment_confirmed: "secondary",
  active: "secondary",
};

export function AdminPage() {
  const { t, lang } = useT();
  const [adminKey, setAdminKey] = useState("");
  const [deals, setDeals] = useState<AdminDeal[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  async function fetchDeals() {
    if (!adminKey.trim()) {
      setError(t("admin.error.no_key"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await fetch(`/api/admin/deals${params}`, {
        headers: { "X-Admin-Key": adminKey.trim() },
      });
      if (res.status === 401) throw new Error(t("admin.error.unauthorized"));
      if (res.status === 503) throw new Error(t("admin.error.not_configured"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as AdminDeal[];
      setDeals(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const statusOptions = ["", "active", "payment_confirmed", "dispatched", "completed"];

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("admin.page.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("admin.page.subtitle")}</p>
          </div>
        </div>

        {/* Filters + key */}
        <div className="rounded-xl border border-border bg-white p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-foreground mb-1 block">
                {t("admin.key.label")}
              </label>
              <Input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder={t("admin.key.placeholder")}
                className="h-9"
                dir="ltr"
                onKeyDown={(e) => e.key === "Enter" && void fetchDeals()}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                {t("admin.deal.status")}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s ? t(`deal.status.${s}`) : t("admin.filter.all_statuses")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={() => void fetchDeals()} disabled={loading} className="w-full sm:w-auto">
            {loading
              ? <><Loader2 className="h-4 w-4 me-2 animate-spin" />{t("admin.loading")}</>
              : <><RefreshCw className="h-4 w-4 me-2" />{t("admin.fetch_button")}</>
            }
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Results table */}
        {deals !== null && (
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {t("admin.deal.count").replace("{n}", String(deals.length))}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  {deals.filter((d) => d.is_mwan_ready).length} {t("admin.mwan.ready")}
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  {deals.filter((d) => !d.is_mwan_ready).length} {t("admin.mwan.incomplete")}
                </span>
              </div>
            </div>

            {deals.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("admin.no_deals")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.deal.id")}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.deal.status")}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.deal.manifest_ref")}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.deal.mwan_score")}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.deal.missing")}</th>
                      <th className="px-4 py-2.5 text-start text-xs font-semibold text-muted-foreground">{t("admin.deal.created_at")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deals.map((d) => (
                      <tr key={d.deal_id} className={`hover:bg-muted/20 transition-colors ${d.is_mwan_ready ? "" : "bg-amber-50/20"}`}>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                            {d.deal_id.slice(0, 8)}…
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={STATUS_VARIANTS[d.status] ?? "outline"} className="text-[10px]">
                            {t(`deal.status.${d.status}`)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          {d.manifest_ref ? (
                            <span className="font-mono text-xs font-semibold text-primary" dir="ltr">{d.manifest_ref}</span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {d.is_mwan_ready
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              : <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            }
                            <span className={`text-xs font-mono font-semibold ${d.is_mwan_ready ? "text-green-700" : "text-amber-700"}`} dir="ltr">
                              {d.mwan_score}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          {d.missing_count > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5">
                              {d.missing_count}
                            </span>
                          ) : (
                            <span className="text-[11px] text-green-700 font-semibold">✓</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {formatDate(d.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
