import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import {
  Leaf,
  Loader2,
  AlertCircle,
  Lock,
  Search,
  Filter,
} from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/i18n";
import { fmtDate, fmtNumber } from "@/lib/format";
import { useGetMaterialCategories } from "@workspace/api-client-react";

interface ReceivedLine {
  id: string;
  parent_entity_type: string;
  parent_entity_id: string;
  parent_reference?: string;
  source_line_type: string;
  source_line_id: string;
  material_category_id?: string | null;
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
  const { data: allCategoriesRaw = [] } = useGetMaterialCategories();
  const allCategories = allCategoriesRaw as Array<{ id: string; name_ar: string; name_en: string; parent_id: string | null }>;

  const getCategoryPath = (catId: string | null | undefined) => {
    if (!catId) return lang === "ar" ? "غير مصنف" : "Unclassified";
    const cat = allCategories.find((c) => c.id === catId);
    if (!cat) return lang === "ar" ? "غير مصنف" : "Unclassified";
    if (!cat.parent_id) return lang === "ar" ? cat.name_ar : cat.name_en;
    const parent = allCategories.find((c) => c.id === cat.parent_id);
    if (!parent) return lang === "ar" ? cat.name_ar : cat.name_en;
    return lang === "ar" ? `${parent.name_ar} / ${cat.name_ar}` : `${parent.name_en} / ${cat.name_en}`;
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "not_started" | "draft">("all");
  const [eligibilityFilter, setEligibilityFilter] = useState<"all" | "eligible" | "ineligible">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "deal" | "contract">("all");

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    return rows.filter((row) => {
      // Status
      if (statusFilter === "not_started" && row.allocation_status === "draft") return false;
      if (statusFilter === "draft" && row.allocation_status !== "draft") return false;

      // Eligibility
      if (eligibilityFilter === "eligible" && !row.received_line.is_eligible) return false;
      if (eligibilityFilter === "ineligible" && row.received_line.is_eligible) return false;

      // Source
      if (sourceFilter === "deal" && row.received_line.parent_entity_type !== "deal") return false;
      if (sourceFilter === "contract" && row.received_line.parent_entity_type !== "contract_shipment") return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const mat = row.received_line.material_label.toLowerCase();
        const srcId = row.received_line.parent_entity_id?.toLowerCase() || "";
        const srcType = row.received_line.parent_entity_type.toLowerCase();
        
        if (!mat.includes(q) && !srcId.includes(q) && !srcType.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [rows, statusFilter, eligibilityFilter, sourceFilter, searchQuery]);

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
            <div className="p-4 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/10">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={lang === "ar" ? "بحث بالمادة أو المصدر..." : "Search material or source..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                
                <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                  <SelectTrigger className="w-[130px] h-9 text-xs bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{lang === "ar" ? "كل الحالات" : "All status"}</SelectItem>
                    <SelectItem value="not_started">{lang === "ar" ? "لم يبدأ" : "Not started"}</SelectItem>
                    <SelectItem value="draft">{lang === "ar" ? "مسودة" : "Draft"}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={eligibilityFilter} onValueChange={(val: any) => setEligibilityFilter(val)}>
                  <SelectTrigger className="w-[130px] h-9 text-xs bg-background">
                    <SelectValue placeholder="Eligibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{lang === "ar" ? "كل الأهلية" : "All eligibility"}</SelectItem>
                    <SelectItem value="eligible">{t("sustainability.allocations.eligible")}</SelectItem>
                    <SelectItem value="ineligible">{t("sustainability.allocations.ineligible")}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={(val: any) => setSourceFilter(val)}>
                  <SelectTrigger className="w-[130px] h-9 text-xs bg-background">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{lang === "ar" ? "كل المصادر" : "All sources"}</SelectItem>
                    <SelectItem value="deal">{lang === "ar" ? "صفقة" : "Deal"}</SelectItem>
                    <SelectItem value="contract">{lang === "ar" ? "عقد" : "Contract"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="px-4 py-2 border-b border-border flex items-center justify-between gap-2 bg-muted/5">
              <p className="text-xs font-medium text-muted-foreground">
                {filteredRows.length} {lang === "ar" ? "مادة مستلمة مطابقة" : "received materials match"}
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
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                        {lang === "ar" ? "لا توجد نتائج مطابقة للبحث أو التصفية" : "No results match the current filters"}
                      </td>
                    </tr>
                  ) : filteredRows.map((row) => {
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
                        <td className="px-3 py-2.5 font-semibold text-foreground">{getCategoryPath(rl.material_category_id)}</td>
                        <td className="px-3 py-2.5 font-mono">
                          {fmtNumber(rl.final_received_qty)} {rl.final_received_unit && t(`unit.${rl.final_received_unit}`) ? t(`unit.${rl.final_received_unit}`) : rl.final_received_unit}
                        </td>
                        <td className="px-3 py-2.5">
                          {rl.parent_entity_type === "deal" && rl.source_line_type === "listing" && rl.source_line_id ? (
                            <Link href={`/listings/${rl.source_line_id}?deal=${rl.parent_entity_id}&returnTo=${encodeURIComponent("/sustainability/allocations")}`}>
                              <a className="text-[10px] text-primary font-semibold hover:underline font-mono bg-primary/10 px-1.5 py-0.5 rounded uppercase transition-colors" dir="ltr" title={t("sustainability.allocations.open_deal")}>
                                {rl.parent_entity_type === "deal" ? (lang === "ar" ? "صفقة" : "DEAL") : rl.parent_entity_type === "contract_shipment" ? (lang === "ar" ? "شحنة عقد" : "CONTRACT SHIPMENT") : rl.parent_entity_type} / {rl.parent_reference || (lang === "ar" ? "مرجع غير متاح" : "REF_UNAVAILABLE")}
                              </a>
                            </Link>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded uppercase" dir="ltr">
                              {rl.parent_entity_type === "deal" ? (lang === "ar" ? "صفقة" : "DEAL") : rl.parent_entity_type === "contract_shipment" ? (lang === "ar" ? "شحنة عقد" : "CONTRACT SHIPMENT") : rl.parent_entity_type} / {rl.parent_reference || (lang === "ar" ? "مرجع غير متاح" : "REF_UNAVAILABLE")}
                            </span>
                          )}
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
                                  {t(`sustainability.allocations.ineligibility.${rl.ineligibility_reason}`) === `sustainability.allocations.ineligibility.${rl.ineligibility_reason}` ? rl.ineligibility_reason : t(`sustainability.allocations.ineligibility.${rl.ineligibility_reason}`)}
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
                          <Link href={`/sustainability/allocations/${rl.id}`}>
                            <button className="text-xs font-semibold text-primary hover:underline">
                              {t("sustainability.allocations.view_detail")}
                            </button>
                          </Link>
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
