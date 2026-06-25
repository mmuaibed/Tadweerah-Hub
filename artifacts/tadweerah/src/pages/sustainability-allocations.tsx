import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import {
  Leaf,
  Loader2,
  AlertCircle,
  Lock,
} from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { fmtDate, fmtNumber } from "@/lib/format";

interface ReceivedLine {
  id: string;
  parent_entity_type: string;
  parent_entity_id: string;
  source_line_type: string;
  source_line_id: string;
  material_label: string;
  final_received_qty: string;
  final_received_unit: string;
  is_eligible: boolean;
  ineligibility_reason: string | null;
  created_at: string;
}

interface ReceivedLineRow {
  received_line: ReceivedLine;
  allocation_id: string | null;
  allocation_status: string | null;
}

function useReceivedLines() {
  const { getToken } = useAuth();
  return useQuery<ReceivedLineRow[]>({
    queryKey: ["sustainability-received-lines"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/sustainability/received-lines?limit=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("fetch failed");
      return res.json() as Promise<ReceivedLineRow[]>;
    },
  });
}

export function SustainabilityAllocationsPage() {
  const { t, lang } = useT();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const { data: rows, isLoading, error } = useReceivedLines();

  return (
    <AppLayout
      title={t("sustainability.allocations.title")}
      subtitle={t("sustainability.allocations.subtitle")}
    >
      <div className="space-y-5" dir={dir}>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {(error as Error).message}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Leaf className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-foreground">
              {t("sustainability.allocations.empty.title")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("sustainability.allocations.empty.desc")}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {rows.length} {lang === "ar" ? "مادة مستلمة" : "received materials"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground whitespace-nowrap">{t("reports.col.date")}</th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground whitespace-nowrap">{t("sustainability.allocations.col.material")}</th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground whitespace-nowrap">{t("sustainability.allocations.col.quantity")}</th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground whitespace-nowrap">{t("sustainability.allocations.col.source")}</th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground whitespace-nowrap">{t("sustainability.allocations.col.eligibility")}</th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground whitespace-nowrap">{t("sustainability.allocations.col.status")}</th>
                    <th className="px-3 py-2.5 text-start text-xs font-semibold text-muted-foreground whitespace-nowrap"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => {
                    const rl = row.received_line;
                    const isEligible = rl.is_eligible;
                    
                    let statusLabel = t("sustainability.allocations.status.none");
                    let statusStyle = "bg-gray-100 text-gray-600";
                    if (row.allocation_status === "draft") {
                      statusLabel = t("sustainability.allocations.status.draft");
                      statusStyle = "bg-amber-100 text-amber-800";
                    }

                    return (
                      <tr key={rl.id} className={`transition-colors ${isEligible ? "hover:bg-muted/20" : "bg-muted/5 opacity-80"}`}>
                        <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs">{fmtDate(rl.created_at, lang)}</td>
                        <td className="px-3 py-2.5">{rl.material_label}</td>
                        <td className="px-3 py-2.5 font-mono">
                          {fmtNumber(rl.final_received_qty)} {rl.final_received_unit && t(`unit.${rl.final_received_unit}`) ? t(`unit.${rl.final_received_unit}`) : rl.final_received_unit}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded uppercase" dir="ltr">
                            {rl.parent_entity_type} / {rl.parent_entity_id?.substring(0, 8)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {isEligible ? (
                            <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
                              {t("sustainability.allocations.eligible")}
                            </span>
                          ) : (
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                                <Lock className="h-3 w-3" />
                                {t("sustainability.allocations.ineligible")}
                              </span>
                              {rl.ineligibility_reason && (
                                <span className="text-[10px] text-muted-foreground max-w-[200px] truncate" title={rl.ineligibility_reason}>
                                  {rl.ineligibility_reason}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {isEligible && (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle}`}>
                              {statusLabel}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-end">
                          {isEligible && (
                            <Link href={`/sustainability/allocations/${rl.id}`}>
                              <button className="text-xs font-semibold text-primary hover:underline">
                                {t("sustainability.allocations.view_detail")}
                              </button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
