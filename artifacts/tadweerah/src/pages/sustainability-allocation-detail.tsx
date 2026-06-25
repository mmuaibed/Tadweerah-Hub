import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useAuth } from "@clerk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Leaf,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useGetMaterialCategories } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/i18n";
import { fmtNumber, fmtDate } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Pathway {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
  requires_explanation: boolean;
}

interface AllocationDetailRes {
  received_line: any;
  allocation: any | null;
  lines: any[];
  pathways: Pathway[];
  validation: any;
}

interface DraftLine {
  uiId: string;
  pathway_id: string;
  quantity: string;
  explanation_text: string;
}

const getPathwayDesc = (key: string, t: any) => {
  if (!key) return "";
  switch (key) {
    case "reuse": return t("pathway.reuse.desc");
    case "repair_refurbishment": return t("pathway.repair.desc");
    case "remanufacturing": return t("pathway.remanufacturing.desc");
    case "recycling": return t("pathway.recycling.desc");
    case "material_recovery": return t("pathway.material_recovery.desc");
    case "energy_recovery": return t("pathway.energy_recovery.desc");
    case "safe_treatment": return t("pathway.safe_treatment.desc");
    case "certified_disposal": return t("pathway.certified_disposal.desc");
    case "residue_loss": return t("pathway.loss_rejected.desc");
    case "other": return t("pathway.other.desc");
    default: return "";
  }
};

export function SustainabilityAllocationDetailPage() {
  const { t, lang } = useT();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [, params] = useRoute("/sustainability/allocations/:id");
  const id = params?.id;
  
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

  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  const { data, isLoading, error } = useQuery<AllocationDetailRes>({
    queryKey: ["sustainability-allocation", id],
    enabled: !!id,
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/sustainability/received-lines/${id}/allocation`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load allocation details");
      return res.json() as Promise<AllocationDetailRes>;
    },
  });

  useEffect(() => {
    if (data && !isInitialized) {
      if (data.lines && data.lines.length > 0) {
        setDraftLines(
          data.lines.map((l) => ({
            uiId: Math.random().toString(36).substring(7),
            pathway_id: l.pathway_id,
            quantity: Number(l.quantity).toString(),
            explanation_text: l.explanation_text || "",
          }))
        );
      }
      setIsInitialized(true);
    }
  }, [data, isInitialized]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { lines: any[] }) => {
      const token = await getToken();
      let res: Response;
      try {
        res = await fetch(`/api/sustainability/received-lines/${id}/allocation`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } catch (err: any) {
        throw new Error(err.message || "Network Error: Failed to fetch");
      }
      
      if (!res.ok) {
        let errMsg = "Failed to save draft";
        try {
          const errBody = await res.json();
          if (errBody.message) errMsg = errBody.message;
        } catch (e) {
          errMsg = `Server error ${res.status}: ${res.statusText}`;
        }
        throw new Error(errMsg);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("sustainability.allocations.draft_saved"),
      });
      queryClient.invalidateQueries({ queryKey: ["sustainability-allocation", id] });
      queryClient.invalidateQueries({ queryKey: ["sustainability-received-lines"] });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      let res: Response;
      try {
        res = await fetch(`/api/sustainability/received-lines/${id}/allocation/finalize`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
      } catch (err: any) {
        throw new Error(err.message || "Network Error: Failed to fetch");
      }
      
      if (!res.ok) {
        let errMsg = "Failed to finalize";
        try {
          const errBody = await res.json();
          if (errBody.message) errMsg = errBody.message;
        } catch (e) {
          errMsg = `Server error ${res.status}: ${res.statusText}`;
        }
        throw new Error(errMsg);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("sustainability.allocations.finalized_success"),
      });
      setShowFinalizeModal(false);
      queryClient.invalidateQueries({ queryKey: ["sustainability-allocation", id] });
      queryClient.invalidateQueries({ queryKey: ["sustainability-received-lines"] });
    },
  });

  if (isLoading) {
    return (
      <AppLayout title={t("sustainability.allocations.detail.title")}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout title={t("sustainability.allocations.detail.title")}>
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mt-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error ? (error as Error).message : "Not found"}
        </div>
      </AppLayout>
    );
  }

  const rl = data.received_line;
  const allocation = data.allocation;
  const isFinalized = allocation?.status === "finalized";
  const pathways = data.pathways;
  const totalReceived = Number(rl.final_received_qty) || 0;

  // Real-time UI validation
  const currentTotalAllocated = draftLines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  const remaining = totalReceived - currentTotalAllocated;
  const isOverAllocated = remaining < -0.001;
  const isPerfectlyAllocated = Math.abs(remaining) <= 0.001;
  const allocatedPercentage = totalReceived > 0 ? (currentTotalAllocated / totalReceived) * 100 : 0;

  const hasDuplicates = new Set(draftLines.map(l => l.pathway_id).filter(Boolean)).size !== draftLines.map(l => l.pathway_id).filter(Boolean).length;
  
  const isDirty = (() => {
    if (!allocation) return draftLines.length > 0;
    const dbLines = data?.lines || [];
    if (draftLines.length !== dbLines.length) return true;
    
    const dbMap = new Map(dbLines.map((l: any) => [l.pathway_id, l]));
    for (const draft of draftLines) {
      if (!draft.pathway_id) return true;
      const dbL = dbMap.get(draft.pathway_id);
      if (!dbL) return true;
      if (Math.abs(Number(draft.quantity) - Number(dbL.quantity)) > 0.0001) return true;
      if ((draft.explanation_text || "").trim() !== (dbL.explanation_text || "").trim()) return true;
    }
    return false;
  })();

  const isValidLines = draftLines.every(l => {
    if (!l.pathway_id) return false;
    const qty = Number(l.quantity);
    if (isNaN(qty) || qty <= 0) return false;
    const pw = pathways.find(p => p.id === l.pathway_id);
    if (pw?.requires_explanation && !l.explanation_text.trim()) return false;
    return true;
  });

  const canSave = !isOverAllocated && !hasDuplicates && isValidLines;

  const handleSave = () => {
    const payload = {
      lines: draftLines.map(l => ({
        pathway_id: l.pathway_id,
        quantity: Number(l.quantity),
        explanation_text: l.explanation_text,
      }))
    };
    saveMutation.mutate(payload);
  };

  const addLine = () => {
    setDraftLines([
      ...draftLines,
      { uiId: Math.random().toString(36).substring(7), pathway_id: "", quantity: "", explanation_text: "" }
    ]);
  };

  const removeLine = (uiId: string) => {
    setDraftLines(draftLines.filter(l => l.uiId !== uiId));
  };

  const updateLine = (uiId: string, field: keyof DraftLine, value: string) => {
    setDraftLines(draftLines.map(l => l.uiId === uiId ? { ...l, [field]: value } : l));
  };

  return (
    <AppLayout
      title={t("sustainability.allocations.title")}
      subtitle={t("sustainability.allocations.subtitle")}
    >
      <div className="space-y-6 max-w-4xl" dir={dir}>
        
        {/* Back Button */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation("/sustainability/allocations")}
            className="text-muted-foreground hover:text-foreground -ms-2"
          >
            <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
            {t("sustainability.allocations.detail.back")}
          </Button>
        </div>

        {/* Header Summary */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">{t("sustainability.allocations.col.material")}</p>
              <h2 className="text-xl font-bold text-foreground mt-1">{getCategoryPath(rl.material_category_id)}</h2>
              <div className="flex items-center gap-2 mt-2">
                {rl.parent_entity_type === "deal" && rl.source_line_type === "listing" && rl.source_line_id ? (
                  <Link href={`/listings/${rl.source_line_id}?deal=${rl.parent_entity_id}&returnTo=${encodeURIComponent(`/sustainability/allocations/${id}`)}`}>
                    <a className="text-[10px] text-primary font-semibold hover:underline font-mono bg-primary/10 px-1.5 py-0.5 rounded uppercase transition-colors" dir="ltr" title={t("sustainability.allocations.open_deal")}>
                      {rl.parent_entity_type === "deal" ? (lang === "ar" ? "صفقة" : "DEAL") : rl.parent_entity_type === "contract_shipment" ? (lang === "ar" ? "شحنة عقد" : "CONTRACT SHIPMENT") : rl.parent_entity_type} / {rl.parent_reference || (lang === "ar" ? "مرجع غير متاح" : "REF_UNAVAILABLE")}
                    </a>
                  </Link>
                ) : (
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded uppercase" dir="ltr">
                    {rl.parent_entity_type === "deal" ? (lang === "ar" ? "صفقة" : "DEAL") : rl.parent_entity_type === "contract_shipment" ? (lang === "ar" ? "شحنة عقد" : "CONTRACT SHIPMENT") : rl.parent_entity_type} / {rl.parent_reference || (lang === "ar" ? "مرجع غير متاح" : "REF_UNAVAILABLE")}
                  </span>
                )}
                <span className="text-sm text-muted-foreground">{fmtDate(rl.created_at, lang)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <p className="text-xs text-muted-foreground">{t("sustainability.allocations.total_received")}</p>
                <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                  {fmtNumber(rl.final_received_qty)} <span className="text-sm">{t(`unit.${rl.final_received_unit}`) || rl.final_received_unit}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("sustainability.allocations.total_allocated")}</p>
                <p className="text-lg font-bold font-mono text-primary mt-0.5">
                  {fmtNumber(currentTotalAllocated)} <span className="text-sm">{t(`unit.${rl.final_received_unit}`) || rl.final_received_unit}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("sustainability.allocations.remaining_quantity")}</p>
                <p className={`text-lg font-bold font-mono mt-0.5 ${isOverAllocated ? "text-destructive" : isPerfectlyAllocated ? "text-primary" : "text-amber-600"}`}>
                  {fmtNumber(Math.abs(remaining) <= 0.001 ? 0 : remaining)} <span className="text-sm">{t(`unit.${rl.final_received_unit}`) || rl.final_received_unit}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("sustainability.allocations.allocated_percentage")}</p>
                <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                  {allocatedPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {isOverAllocated && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t("sustainability.allocations.over_allocated")}
          </div>
        )}

        {hasDuplicates && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t("sustainability.allocations.duplicate_pathway")}
          </div>
        )}

        {saveMutation.isError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveMutation.error?.message}
          </div>
        )}

        {/* Editor or Read-Only Guard */}
        {!rl.is_eligible ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm flex flex-col items-center text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-destructive">
              {t("sustainability.allocations.detail.not_allocatable")}
            </h3>
            {rl.ineligibility_reason && (
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                <strong className="font-semibold">{t("sustainability.allocations.ineligibility_reason")}:</strong> {t(`sustainability.allocations.ineligibility_desc.${rl.ineligibility_reason}`) === `sustainability.allocations.ineligibility_desc.${rl.ineligibility_reason}` ? rl.ineligibility_reason : t(`sustainability.allocations.ineligibility_desc.${rl.ineligibility_reason}`)}
              </p>
            )}
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => setLocation("/sustainability/allocations")}
            >
              <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
              {t("action.cancel")}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Leaf className="h-4 w-4 text-primary" />
                {t("sustainability.allocations.detail.title")}
              </h3>
              {isFinalized ? (
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    {t("sustainability.allocations.finalized_at")}: {fmtDate(allocation.finalized_at, lang)}
                  </span>
                  <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {t("sustainability.allocations.status.finalized")}
                  </span>
                </div>
              ) : (
                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {t("sustainability.allocations.status.draft")}
                </span>
              )}
            </div>
            
            <div className="p-4 space-y-4">
              {draftLines.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                  {t("sustainability.allocations.no_pathways")}
                </div>
              ) : (
                <div className="space-y-4">
                  {draftLines.map((line, index) => {
                    const pw = pathways.find(p => p.id === line.pathway_id);
                    const isMissingExplanation = pw?.requires_explanation && !line.explanation_text.trim();
                    
                    return (
                      <div key={line.uiId} className="flex flex-col gap-3 p-4 rounded-lg border border-border/80 bg-background relative group transition-colors hover:border-primary/30">
                        <div className="flex flex-col md:flex-row gap-4 md:items-start">
                          
                          {/* Pathway Select */}
                          <div className="flex-1 space-y-1">
                            <label className="text-xs font-medium text-foreground">{t("sustainability.allocations.pathway")}</label>
                            <select
                              value={line.pathway_id}
                              onChange={(e) => updateLine(line.uiId, "pathway_id", e.target.value)}
                              disabled={isFinalized}
                              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="" disabled>{lang === "ar" ? "اختر مساراً" : "Select pathway"}</option>
                              {pathways.map(p => (
                                <option key={p.id} value={p.id}>
                                  {lang === "ar" ? p.name_ar : p.name_en}
                                </option>
                              ))}
                            </select>
                            {pw && getPathwayDesc(pw.key, t) && (
                              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                {getPathwayDesc(pw.key, t)}
                              </p>
                            )}
                          </div>
                          
                          {/* Quantity Input */}
                          <div className="w-full md:w-48 space-y-1 shrink-0">
                            <label className="text-xs font-medium text-foreground">{t("sustainability.allocations.col.quantity")}</label>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.quantity}
                                onChange={(e) => updateLine(line.uiId, "quantity", e.target.value)}
                                disabled={isFinalized}
                                className="pr-12 h-10 disabled:opacity-50"
                                placeholder="0"
                                dir="ltr"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs text-muted-foreground font-medium">
                                {t(`unit.${rl.final_received_unit}`) || rl.final_received_unit}
                              </div>
                            </div>
                          </div>

                          {/* Remove Button */}
                          {!isFinalized && (
                            <div className="pt-6">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeLine(line.uiId)}
                                className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title={t("sustainability.allocations.remove")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Explanation Textarea (if required) */}
                        {pw?.requires_explanation && (
                          <div className="mt-2 space-y-1 bg-muted/30 p-3 rounded-md border border-border/50">
                            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                              {t("sustainability.allocations.explanation_text")}
                              <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-sm font-semibold">
                                {t("sustainability.allocations.explanation_required")}
                              </span>
                            </label>
                            <Textarea
                              value={line.explanation_text}
                              onChange={(e) => updateLine(line.uiId, "explanation_text", e.target.value)}
                              placeholder={lang === "ar" ? "أدخل تفاصيل ومبررات استخدام هذا المسار..." : "Enter details and justification..."}
                              disabled={isFinalized}
                              className={`min-h-[80px] text-sm resize-y disabled:opacity-50 disabled:cursor-not-allowed ${isMissingExplanation ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!isFinalized && (
                <Button
                  variant="outline"
                  onClick={addLine}
                  className="w-full mt-4 border-dashed border-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all text-muted-foreground"
                >
                  <Plus className="h-4 w-4 me-2" />
                  {t("sustainability.allocations.add_pathway")}
                </Button>
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-muted/20 flex flex-wrap justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setLocation("/sustainability/allocations")}
              >
                {t(isFinalized ? "action.back" : "action.cancel")}
              </Button>
              {!isFinalized && (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={!canSave || saveMutation.isPending || finalizeMutation.isPending || !isDirty}
                    variant="outline"
                    className="min-w-[140px]"
                  >
                    {saveMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 me-2 animate-spin" /> {t("sustainability.allocations.saving")}</>
                    ) : (
                      <><Save className="h-4 w-4 me-2" /> {t("sustainability.allocations.save_draft")}</>
                    )}
                  </Button>
                  {isDirty && isPerfectlyAllocated ? (
                    <Button
                      disabled
                      className="min-w-[140px] bg-muted text-muted-foreground border border-border"
                      title={lang === "ar" ? "احفظ المسودة أولاً لاعتماد بيانات الاستدامة" : "Save the draft first to finalize sustainability data"}
                    >
                      <Lock className="h-4 w-4 me-2 opacity-50" /> 
                      {lang === "ar" ? "احفظ المسودة أولاً" : "Save Draft First"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setShowFinalizeModal(true)}
                      disabled={!canSave || !isPerfectlyAllocated || saveMutation.isPending || finalizeMutation.isPending || isDirty || draftLines.length === 0}
                      className="min-w-[140px] bg-green-600 hover:bg-green-700 text-white disabled:bg-green-600/50 disabled:text-white/70"
                      title={(!isPerfectlyAllocated && lang === "ar") ? "يجب توزيع الكمية بالكامل" : ""}
                    >
                      <Lock className="h-4 w-4 me-2" /> {t("sustainability.allocations.finalize")}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

      </div>

      <Dialog open={showFinalizeModal} onOpenChange={setShowFinalizeModal}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <DialogTitle>{t("sustainability.allocations.finalize")}</DialogTitle>
            <DialogDescription className="pt-4 text-foreground font-medium">
              {t("sustainability.allocations.finalize_warning")}
            </DialogDescription>
          </DialogHeader>

          {finalizeMutation.isError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive mt-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {finalizeMutation.error?.message}
            </div>
          )}

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowFinalizeModal(false)}
              disabled={finalizeMutation.isPending}
            >
              {t("action.cancel")}
            </Button>
            <Button
              variant="default"
              onClick={() => finalizeMutation.mutate()}
              disabled={finalizeMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {finalizeMutation.isPending ? (
                <><Loader2 className="h-4 w-4 me-2 animate-spin" /> {t("sustainability.allocations.finalizing")}</>
              ) : (
                <><Lock className="h-4 w-4 me-2" /> {t("sustainability.allocations.finalize")}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
