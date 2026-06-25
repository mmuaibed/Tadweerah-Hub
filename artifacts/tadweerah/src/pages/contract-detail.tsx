import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ChevronDown,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Building2,
  Calendar,
  ArrowLeft,
  AlertTriangle,
  Lock,
  Package,
  Truck,
  Send,
  Users,
  FileCheck,
  XCircle,
  Clock,
  User,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { fmtNumber } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function isImageUrl(url: string): boolean {
  const cleanUrl = url.split("?")[0].toLowerCase();
  return (
    cleanUrl.endsWith(".jpg") ||
    cleanUrl.endsWith(".jpeg") ||
    cleanUrl.endsWith(".png") ||
    cleanUrl.endsWith(".webp") ||
    cleanUrl.endsWith(".gif") ||
    url.startsWith("data:image/")
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ContractStatus =
  | "draft"
  | "pending_confirmation"
  | "active"
  | "completed"
  | "cancelled";

type ShipmentStatus =
  | "planned"
  | "dispatched"
  | "received"
  | "closed"
  | "cancelled";

interface ContractMaterial {
  id: string;
  material_label: string;
  unit_label: string;
  price_per_unit: number | string;
  seller_pct: number | string | null;
  buyer_pct: number | string | null;
  sort_order: number;
}

interface ContractDetail {
  id: string;
  reference: string;
  external_reference: string | null;
  seller_company_id: string;
  buyer_company_id: string;
  created_by_company_id: string | null;
  seller_name: string;
  buyer_name: string;
  start_date: string;
  end_date: string | null;
  status: ContractStatus;
  weight_policy: string;
  attachment_url: string | null;
  notes: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  materials: ContractMaterial[];
  shipment_summary: {
    total: number;
    open: number;
    closed: number;
    cancelled: number;
  };
}

interface ContractShipment {
  id: string;
  reference: string;
  contract_id: string;
  material_line_id: string;
  status: ShipmentStatus;
  source_weight: number | string | null;
  source_ticket_url?: string | null;
  source_ticket_uploaded_by_company_id?: string | null;
  destination_weight: number | string | null;
  destination_ticket_url?: string | null;
  destination_ticket_uploaded_by_company_id?: string | null;
  final_weight: number | string | null;
  final_value: number | string | null;
  notes: string | null;
  planned_at: string;
  dispatched_at: string | null;
  received_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

interface MyCompany {
  id: string;
  name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadgeClass(status: ContractStatus): string {
  switch (status) {
    case "draft":            return "bg-muted text-muted-foreground border-border";
    case "pending_confirmation": return "bg-amber-50 text-amber-700 border-amber-200";
    case "active":           return "bg-green-50 text-green-700 border-green-200";
    case "completed":        return "bg-blue-50 text-blue-700 border-blue-200";
    case "cancelled":        return "bg-red-50 text-red-600 border-red-200";
  }
}

function shipmentBadgeClass(status: ShipmentStatus): string {
  switch (status) {
    case "planned":    return "bg-muted text-muted-foreground border-border";
    case "dispatched": return "bg-blue-50 text-blue-700 border-blue-200";
    case "received":   return "bg-amber-50 text-amber-700 border-amber-200";
    case "closed":     return "bg-green-50 text-green-700 border-green-200";
    case "cancelled":  return "bg-red-50 text-red-600 border-red-200";
  }
}

function localizeLabel(label: string, lang: string): string {
  if (lang !== "en") return label;
  const trimmed = label.trim().toLowerCase();
  switch (trimmed) {
    case "حديد": return "Steel";
    case "المنيوم":
    case "ألمنيوم": return "Aluminum";
    case "طن": return "ton";
    case "كجم": return "kg";
    case "بلاستيك": return "Plastic";
    case "كرتون":
    case "ورق وكرتون": return "Cardboard";
    case "معادن": return "Metals";
    case "زجاج": return "Glass";
    case "إلكترونيات": return "Electronics";
    case "عضوية": return "Organic";
    case "أخرى": return "Other";
    default: return label;
  }
}

// ── API hooks ─────────────────────────────────────────────────────────────────

function makeAuthHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function useContract(id: string) {
  const { getToken } = useAuth();
  return useQuery<ContractDetail>({
    queryKey: ["contract", id],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/contracts/${id}`, {
        headers: makeAuthHeaders(token),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load contract");
      return res.json() as Promise<ContractDetail>;
    },
  });
}

function useContractShipments(contractId: string) {
  const { getToken } = useAuth();
  return useQuery<ContractShipment[]>({
    queryKey: ["contract-shipments", contractId],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`/api/contracts/${contractId}/shipments`, {
        headers: makeAuthHeaders(token),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load shipments");
      return res.json() as Promise<ContractShipment[]>;
    },
  });
}

function useMyCompany() {
  const { getToken } = useAuth();
  return useQuery<MyCompany>({
    queryKey: ["my-company"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/companies/mine", {
        headers: makeAuthHeaders(token),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load company");
      return res.json() as Promise<MyCompany>;
    },
    staleTime: 5 * 60_000,
  });
}

// ── Contract Lifecycle Panel — 5-stage timeline with status banner ──────────────

function ContractLifecyclePanel({
  contract,
  role,
  myCompanyId,
  onRefresh,
}: {
  contract: ContractDetail;
  role: "seller" | "buyer" | null;
  myCompanyId: string | undefined;
  onRefresh: () => void;
}) {
  const { t, lang } = useT();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ar = lang === "ar";
  const { status } = contract;
  const summary = contract.shipment_summary;

  const isCreator = contract.created_by_company_id
    ? contract.created_by_company_id === myCompanyId
    : role === "seller";
  const isParty = role === "seller" || role === "buyer";
  const isCounterparty = isParty && !isCreator;

  const canSubmit   = isCreator      && status === "draft";
  const canConfirm  = isCounterparty && status === "pending_confirmation";
  const canComplete = isCreator      && status === "active";
  const canCancel   = isParty && !["completed", "cancelled"].includes(status);

  const isCancelled = status === "cancelled";
  const isCompleted = status === "completed";
  const isTerminal  = isCancelled || isCompleted;
  const allShipmentsTerminal = summary.total > 0 && summary.open === 0;

  async function doAction(action: string) {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/contracts/${contract.id}/${action}`, {
        method: "POST",
        headers: makeAuthHeaders(token),
        credentials: "include",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }
      onRefresh();
    } catch (e) {
      toast({ title: t("error.generic"), description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setLoading(false);
      setPending(null);
    }
  }

  function fmtDate(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  // ── Status Banner ────────────────────────────────────────────────────────────
  type BannerCfg = { text: string; bg: string; fg: string; border: string; Icon: React.ElementType };
  const banner: BannerCfg = (() => {
    if (status === "draft")                  return { text: ar ? "مسودة — أضف البنود ثم أرسل للطرف الآخر" : "Draft — add material lines and submit", bg: "bg-muted/50", fg: "text-muted-foreground", border: "border-border", Icon: Clock };
    if (status === "pending_confirmation")   return { text: ar ? "في انتظار تأكيد الطرف الآخر" : "Waiting for counterparty confirmation", bg: "bg-amber-50", fg: "text-amber-800", border: "border-amber-200", Icon: Clock };
    if (status === "active") {
      if (summary.total === 0)               return { text: ar ? "العقد نشط — جاهز لإنشاء الشحنات" : "Contract active — ready to add shipments", bg: "bg-green-50", fg: "text-green-800", border: "border-green-200", Icon: CheckCircle2 };
      if (summary.open > 0)                  return { text: ar ? "الشحنات جارية" : "Shipments in progress", bg: "bg-blue-50", fg: "text-blue-800", border: "border-blue-200", Icon: Truck };
      if (allShipmentsTerminal)              return { text: ar ? "جاهز لإغلاق العقد" : "Ready to close contract", bg: "bg-primary/5", fg: "text-primary", border: "border-primary/25", Icon: FileCheck };
    }
    if (status === "completed")              return { text: ar ? "اكتمل العقد بنجاح" : "Contract completed", bg: "bg-blue-50", fg: "text-blue-800", border: "border-blue-200", Icon: CheckCircle2 };
    if (status === "cancelled")              return { text: ar ? "تم إلغاء العقد" : "Contract cancelled", bg: "bg-red-50", fg: "text-red-700", border: "border-red-200", Icon: XCircle };
    return { text: "", bg: "bg-muted", fg: "text-muted-foreground", border: "border-border", Icon: Clock };
  })();

  // ── User Responsibility Message ──────────────────────────────────────────────
  const responsibilityMsg: string | null = (() => {
    if (!isParty) return null;
    switch (status) {
      case "draft":
        return isCreator
          ? (ar ? "أضف بنود المواد ثم أرسل العقد للطرف الآخر للتأكيد" : "Add material lines, then submit to your counterparty for confirmation")
          : (ar ? "في انتظار المنشئ لإتمام المسودة وإرسالها" : "Waiting for the creator to complete the draft and submit");
      case "pending_confirmation":
        return isCounterparty
          ? (ar ? "أنت مسؤول عن تأكيد هذا العقد — راجع البنود ثم اضغط «تأكيد»" : "You are responsible for confirming this contract — review the terms, then confirm")
          : (ar ? "في انتظار الطرف الآخر لمراجعة العقد وتأكيده" : "Waiting for your counterparty to review and confirm the contract");
      case "active":
        if (allShipmentsTerminal && isCreator)
          return ar ? "جميع الشحنات اكتملت — يمكنك الآن إغلاق العقد" : "All shipments completed — you can now close the contract";
        return isCreator
          ? (ar ? "يمكنك إضافة شحنات أو إغلاق العقد عند اكتمال جميع الشحنات" : "You can add shipments or close the contract when all shipments complete")
          : (ar ? "يمكن لكلا الطرفين إنشاء الشحنات وإدارتها في هذا العقد" : "Both parties can create and manage shipments under this active contract");
      default:
        return null;
    }
  })();

  const isMyTurnHighlight = canConfirm || (canComplete && allShipmentsTerminal);

  // ── 5-Stage Timeline ─────────────────────────────────────────────────────────
  const sellerLabel       = ar ? "البائع"       : "Seller";
  const counterpartyLabel = ar ? "الطرف الآخر" : "Counterparty";
  const creatorLabel      = ar ? "المنشئ"       : "Creator";
  const bothLabel         = ar ? "الطرفان"      : "Both parties";

  interface TStep {
    id: string;
    label: string;
    party: string;
    PIcon: React.ElementType;
    isDone: boolean;
    isCurrent: boolean;
    isCancelled?: boolean;
    ts: string | null;
    action: { label: string; key: string; primary: boolean } | null;
  }

  const steps: TStep[] = [
    {
      id: "created",
      label: ar ? "إنشاء العقد" : "Contract created",
      party: creatorLabel,
      PIcon: User,
      isDone: true,
      isCurrent: false,
      ts: contract.created_at,
      action: null,
    },
    {
      id: "submitted",
      label: ar ? "إرسال للتأكيد" : "Sent for confirmation",
      party: creatorLabel,
      PIcon: Send,
      isDone: status !== "draft",
      isCurrent: status === "draft",
      ts: status !== "draft" ? contract.created_at : null,
      action: canSubmit ? { label: t("contract.action.submit"), key: "submit", primary: true } : null,
    },
    {
      id: "confirmed",
      label: ar ? "تأكيد العقد" : "Contract confirmed",
      party: counterpartyLabel,
      PIcon: User,
      isDone: contract.confirmed_at != null,
      isCurrent: status === "pending_confirmation",
      ts: contract.confirmed_at,
      action: null,
    },
    {
      id: "shipments",
      label: ar ? "تنفيذ الشحنات" : "Shipments in progress",
      party: bothLabel,
      PIcon: Users,
      isDone: isTerminal,
      isCurrent: status === "active",
      ts: isTerminal ? (contract.completed_at ?? contract.cancelled_at) : null,
      action: canComplete ? { label: t("contract.action.complete"), key: "complete", primary: false } : null,
    },
    isCancelled
      ? { id: "cancelled", label: ar ? "إلغاء العقد"  : "Contract cancelled",  party: "", PIcon: XCircle,   isDone: true,        isCurrent: false, isCancelled: true, ts: contract.cancelled_at, action: null }
      : { id: "closed",    label: ar ? "إغلاق العقد"  : "Contract closed",     party: sellerLabel, PIcon: FileCheck, isDone: isCompleted, isCurrent: false, ts: contract.completed_at, action: null },
  ];

  function stepIconClass(s: TStep) {
    if (s.isCancelled) return "bg-red-100 text-red-500 border-2 border-red-200";
    if (s.isDone)      return "bg-primary text-white";
    if (s.isCurrent)   return "bg-white text-primary border-2 border-primary ring-4 ring-primary/15";
    return "border-2 border-muted-foreground/20 bg-background text-muted-foreground/30";
  }

  function lineClass(s: TStep) {
    if (s.isDone)    return "bg-primary/40";
    if (s.isCurrent) return "bg-primary/20";
    return "bg-muted-foreground/10";
  }

  return (
    <>
      {pending && (
        <ConfirmDialog
          open={!!pending}
          onOpenChange={(o) => { if (!o) setPending(null); }}
          title={t(`contract.action.${pending}.confirm`)}
          description={t(`contract.action.${pending}.confirm`)}
          confirmLabel={t(`contract.action.${pending}`)}
          onConfirm={() => doAction(pending)}
          isPending={loading}
        />
      )}

      <div className="rounded-xl border border-border bg-card overflow-hidden">

        {/* ── Header ── */}
        <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {ar ? "مراحل العقد" : "Contract Progress"}
          </h3>
          {role && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border shrink-0">
              {t(`contract.role.you_are_${role}`)}
              {" · "}
              {isCreator ? t("contract.role.you_are_creator") : t("contract.role.you_are_counterparty")}
            </span>
          )}
        </div>

        <div className="px-4 pt-4 space-y-3">

          {/* ── Status Banner ── */}
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${banner.bg} ${banner.border}`}>
            <banner.Icon className={`h-4 w-4 shrink-0 ${banner.fg}`} />
            <p className={`text-xs font-semibold ${banner.fg}`}>{banner.text}</p>
          </div>

          {/* ── User Responsibility Message ── */}
          {responsibilityMsg && (
            <div className={`flex items-start gap-2 rounded-lg px-3 py-3 border ${
              isMyTurnHighlight
                ? "bg-primary/5 border-primary/30"
                : "bg-muted/30 border-transparent"
            }`}>
              {isMyTurnHighlight && (
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
              )}
              <div className="flex-1 space-y-3">
                <p className={`text-xs leading-relaxed ${isMyTurnHighlight ? "text-primary font-medium" : "text-muted-foreground"}`}>
                  {responsibilityMsg}
                </p>
                {canConfirm && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-primary/10">
                    <Button
                      size="sm"
                      onClick={() => setPending("confirm")}
                      disabled={loading}
                      className="gap-1.5 flex-1 sm:flex-none"
                    >
                      {loading && pending === "confirm" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {t("contract.action.confirm")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPending("cancel")}
                      disabled={loading}
                      className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50"
                    >
                      {t("contract.action.cancel")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Vertical Timeline ── */}
          <div className="space-y-0">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              const showAction = step.isCurrent && step.action != null && (
                (step.id === "submitted" && canSubmit)  ||
                (step.id === "confirmed" && canConfirm) ||
                (step.id === "shipments" && canComplete)
              );

              return (
                <div key={step.id} className="flex gap-3">
                  {/* Icon col */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${stepIconClass(step)}`}>
                      {step.isDone && !step.isCancelled ? <CheckCircle2 className="h-3.5 w-3.5" />
                        : step.isCancelled            ? <XCircle className="h-3.5 w-3.5" />
                        : step.isCurrent              ? <Clock className="h-3 w-3 text-primary" />
                        :                               <Circle className="h-2.5 w-2.5" />}
                    </div>
                    {!isLast && <div className={`w-0.5 flex-1 min-h-5 mt-0.5 ${lineClass(step)}`} />}
                  </div>

                  {/* Content col */}
                  <div className={`pb-4 min-w-0 flex-1 ${isLast ? "pb-2" : ""}`}>
                    {/* Label + party */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className={`text-xs font-semibold leading-tight ${
                        step.isCancelled ? "text-red-600"
                        : step.isDone || step.isCurrent ? "text-foreground"
                        : "text-muted-foreground/40"
                      }`}>
                        {step.label}
                      </p>
                      {step.party && (
                        <span className={`inline-flex items-center gap-1 text-[10px] rounded-full px-1.5 py-0.5 border shrink-0 ${
                          step.isCurrent ? "bg-primary/10 text-primary border-primary/20"
                          : step.isDone  ? "bg-muted text-muted-foreground border-border"
                          :                "bg-transparent text-muted-foreground/30 border-muted-foreground/15"
                        }`}>
                          <step.PIcon className="h-2.5 w-2.5" />
                          {step.party}
                        </span>
                      )}
                    </div>

                    {/* Timestamp */}
                    {step.ts && step.isDone && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(step.ts)}</p>
                    )}

                    {/* Waiting hint for creator on pending_confirmation */}
                    {step.isCurrent && step.id === "confirmed" && !canConfirm && isParty && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                        <p className="text-[11px] text-amber-700">
                          {ar ? "في انتظار الطرف الآخر" : "Waiting for counterparty"}
                        </p>
                      </div>
                    )}

                    {/* Inline action button */}
                    {showAction && step.action && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant={step.action.primary ? "default" : "outline"}
                          className={`w-full gap-1.5 ${!step.action.primary ? "border-gray-400" : ""}`}
                          onClick={() => setPending(step.action!.key)}
                          disabled={loading}
                        >
                          {loading && pending === step.action.key
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : step.action.key === "submit"  ? <Send className="h-3.5 w-3.5" />
                            : step.action.key === "confirm" ? <CheckCircle2 className="h-3.5 w-3.5" />
                            :                                 <FileCheck className="h-3.5 w-3.5" />}
                          {step.action.label}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Cancel footer ── */}
        {canCancel && (
          <div className="px-4 pb-4 pt-2">
            <button
              type="button"
              onClick={() => setPending("cancel")}
              disabled={loading}
              className="w-full text-xs text-muted-foreground hover:text-red-600 transition-colors py-1.5 border border-dashed border-border hover:border-red-200 rounded-lg"
            >
              {t("contract.action.cancel")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Material Lines Section ────────────────────────────────────────────────────

function MaterialLinesSection({
  contract,
  onRefresh,
}: {
  contract: ContractDetail;
  onRefresh: () => void;
}) {
  const { t, lang } = useT();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    materialLabel: "", unitLabel: "", pricePerUnit: "", sellerPct: "", buyerPct: "",
  });
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isDraft = contract.status === "draft";

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.materialLabel.trim() || !addForm.unitLabel.trim() || !addForm.pricePerUnit) return;
    setAdding(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/contracts/${contract.id}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...makeAuthHeaders(token) },
        credentials: "include",
        body: JSON.stringify({
          material_label: addForm.materialLabel.trim(),
          unit_label: addForm.unitLabel.trim(),
          price_per_unit: Number(addForm.pricePerUnit),
          seller_pct: addForm.sellerPct ? Number(addForm.sellerPct) : undefined,
          buyer_pct: addForm.buyerPct ? Number(addForm.buyerPct) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to add material line");
      setAddForm({ materialLabel: "", unitLabel: "", pricePerUnit: "", sellerPct: "", buyerPct: "" });
      setShowAdd(false);
      onRefresh();
    } catch (e) {
      toast({ title: t("error.generic"), description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(materialId: string) {
    setDeletingId(materialId);
    try {
      const token = await getToken();
      const res = await fetch(`/api/contracts/${contract.id}/materials/${materialId}`, {
        method: "DELETE",
        headers: makeAuthHeaders(token),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete material line");
      onRefresh();
    } catch (e) {
      toast({ title: t("error.generic"), description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">{t("contract.materials.title")}</h3>
        {isDraft && (
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1.5 border-gray-400 hover:border-primary/60 h-7 text-xs">
            <Plus className="h-3 w-3" />
            {t("contract.materials.add")}
          </Button>
        )}
      </div>

      {!isDraft && (
        <div className="px-4 py-2 border-b border-border/50 bg-amber-50/50 flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-amber-600 shrink-0" />
          <span className="text-xs text-amber-700">{t("contract.materials.locked")}</span>
        </div>
      )}

      {contract.materials.length === 0 && !showAdd ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("contract.materials.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2 text-start font-medium">{t("contract.materials.label")}</th>
                <th className="px-4 py-2 text-start font-medium">{t("contract.materials.unit")}</th>
                <th className="px-4 py-2 text-end font-medium">{t("contract.materials.price")}</th>
                <th className="px-4 py-2 text-center font-medium">{lang === "ar" ? "البائع" : "Seller"} %</th>
                <th className="px-4 py-2 text-center font-medium">{lang === "ar" ? "المشتري" : "Buyer"} %</th>
                {isDraft && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contract.materials.map((m) => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{localizeLabel(m.material_label, lang)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{localizeLabel(m.unit_label, lang)}</td>
                  <td className="px-4 py-3 text-end font-mono text-foreground">
                    {fmtNumber(m.price_per_unit)}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {m.seller_pct != null ? `${Number(m.seller_pct)}%` : "100%"}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {m.buyer_pct != null ? `${Number(m.buyer_pct)}%` : "0%"}
                  </td>
                  {isDraft && (
                    <td className="px-4 py-3 text-end">
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        {deletingId === m.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add line inline form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="border-t border-border p-4 bg-muted/20 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">{t("contract.new.add_material")}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("contract.materials.label")} *</Label>
              <Input value={addForm.materialLabel} onChange={e => setAddForm(f => ({ ...f, materialLabel: e.target.value }))} placeholder={lang === "ar" ? "بلاستيك" : "Plastic"} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("contract.materials.unit")} *</Label>
              <Input value={addForm.unitLabel} onChange={e => setAddForm(f => ({ ...f, unitLabel: e.target.value }))} placeholder={lang === "ar" ? "طن" : "Ton"} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("contract.materials.price")} *</Label>
              <Input type="number" min="0" step="0.001" value={addForm.pricePerUnit} onChange={e => setAddForm(f => ({ ...f, pricePerUnit: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("contract.materials.seller_pct")}</Label>
              <Input type="number" min="0" max="100" step="0.01" value={addForm.sellerPct} onChange={e => setAddForm(f => ({ ...f, sellerPct: e.target.value }))} placeholder="%" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("contract.materials.buyer_pct")}</Label>
              <Input type="number" min="0" max="100" step="0.01" value={addForm.buyerPct} onChange={e => setAddForm(f => ({ ...f, buyerPct: e.target.value }))} placeholder="%" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground bg-background/50 p-2 rounded border border-border/50 mt-1">
            {lang === "ar" ? "إذا تُركت النسب فارغة، تُحتسب القيمة بالكامل للبائع." : "If left blank, 100% of the value is assumed for the seller."}
          </p>
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={adding} className="gap-1.5">
              {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {lang === "ar" ? "حفظ البند" : "Save Line"}
            </Button>
            <Button size="sm" type="button" variant="outline" onClick={() => setShowAdd(false)} className="border-gray-400">{t("action.cancel")}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Shipment Mini Timeline ────────────────────────────────────────────────────

function ShipmentMiniTimeline({
  shipment,
  contract,
  lang,
}: {
  shipment: ContractShipment;
  contract: ContractDetail;
  lang: string;
}) {
  const ar = lang === "ar";
  const isCancelled = shipment.status === "cancelled";

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    url: string;
    type: "source" | "destination";
    uploadedBy: string | null;
    date: string | null;
  } | null>(null);

  function fmtShort(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-US", {
      month: "short", day: "numeric",
    });
  }

  function formatDocDate(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(ar ? "ar-SA-u-nu-latn" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  interface MiniStep {
    id: string;
    label: string;
    party: string;
    isDone: boolean;
    isCurrent: boolean;
    isCancelled?: boolean;
    ts: string | null;
    weightNote?: string | null;
    ticketUrl?: string | null;
    ticketUploadedBy?: string | null;
  }

  const sellerLbl = ar ? "البائع"   : "Seller";
  const buyerLbl  = ar ? "المشتري" : "Buyer";
  const bothLbl   = ar ? "الطرفان" : "Both";

  function getUploaderLabel(companyId: string | null | undefined): string | null {
    if (!companyId) return null;
    if (companyId === contract.seller_company_id) return sellerLbl;
    if (companyId === contract.buyer_company_id) return buyerLbl;
    return ar ? "غير محدد" : "Unknown";
  }

  const baseSteps: MiniStep[] = [
    {
      id: "planned",
      label: ar ? "مخططة" : "Planned",
      party: bothLbl,
      isDone: true,
      isCurrent: shipment.status === "planned",
      ts: shipment.planned_at,
    },
    {
      id: "dispatched",
      label: ar ? "مرسلة" : "Dispatched",
      party: sellerLbl,
      isDone: shipment.dispatched_at != null,
      isCurrent: shipment.status === "planned",
      ts: shipment.dispatched_at,
      weightNote: shipment.source_weight != null
        ? fmtNumber(shipment.source_weight)
        : null,
      ticketUrl: shipment.source_ticket_url,
      ticketUploadedBy: shipment.source_ticket_uploaded_by_company_id,
    },
    {
      id: "received",
      label: ar ? "مستلمة" : "Received",
      party: buyerLbl,
      isDone: shipment.received_at != null,
      isCurrent: shipment.status === "dispatched",
      ts: shipment.received_at,
      weightNote: shipment.destination_weight != null
        ? fmtNumber(shipment.destination_weight)
        : null,
      ticketUrl: shipment.destination_ticket_url,
      ticketUploadedBy: shipment.destination_ticket_uploaded_by_company_id,
    },
  ];

  const lastStep: MiniStep = isCancelled
    ? { id: "cancelled", label: ar ? "ملغاة" : "Cancelled", party: "", isDone: true, isCancelled: true, isCurrent: false, ts: shipment.cancelled_at }
    : { id: "closed",    label: ar ? "مغلقة"  : "Closed",    party: bothLbl, isDone: shipment.closed_at != null, isCurrent: shipment.status === "received", ts: shipment.closed_at };

  const steps: MiniStep[] = [...baseSteps, lastStep];

  return (
    <>
      <div className="flex items-start gap-0 overflow-x-auto" dir="ltr">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const iconCls = step.isCancelled
            ? "bg-red-100 text-red-400 border border-red-200"
            : step.isDone
              ? "bg-primary text-white"
              : step.isCurrent
                ? "bg-white border-2 border-primary text-primary ring-2 ring-primary/15"
                : "border border-muted-foreground/25 bg-background text-muted-foreground/25";
          const lineCls = step.isDone ? "bg-primary/35" : "bg-muted-foreground/15";

          return (
            <div key={step.id} className="flex items-start flex-1 min-w-0">
              {/* Step block */}
              <div className="flex flex-col items-center min-w-0">
                {/* Circle */}
                <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${iconCls}`}>
                  {step.isDone && !step.isCancelled ? <CheckCircle2 className="h-3 w-3" />
                    : step.isCancelled              ? <XCircle className="h-3 w-3" />
                    : step.isCurrent               ? <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    :                                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />}
                </div>
                {/* Label */}
                <p className={`text-[9px] font-semibold mt-1 text-center leading-tight ${
                  step.isCancelled ? "text-red-500"
                  : step.isDone || step.isCurrent ? "text-foreground"
                  : "text-muted-foreground/40"
                }`}>{step.label}</p>
                {/* Party */}
                {step.party && (
                  <p className={`text-[9px] text-center leading-tight ${
                    step.isCurrent ? "text-primary" : step.isDone ? "text-muted-foreground" : "text-muted-foreground/30"
                  }`}>{step.party}</p>
                )}
                {/* Date */}
                {step.ts && step.isDone && (
                  <p className="text-[9px] text-muted-foreground text-center mt-0.5">{fmtShort(step.ts)}</p>
                )}
                {/* Weight note */}
                {step.weightNote && step.isDone && (
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    <span className="text-[9px] text-primary font-semibold text-center">{step.weightNote}</span>
                    {step.ticketUrl && (
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewData({
                              url: step.ticketUrl!,
                              type: step.id === "dispatched" ? "source" : "destination",
                              uploadedBy: step.ticketUploadedBy
                                ? (step.ticketUploadedBy === contract.seller_company_id
                                    ? (ar ? "المورد" : "Seller")
                                    : step.ticketUploadedBy === contract.buyer_company_id
                                      ? (ar ? "المشتري" : "Buyer")
                                      : ar ? "غير محدد" : "Unknown")
                                : null,
                              date: step.ts,
                            });
                            setPreviewOpen(true);
                          }}
                          className="text-[9px] text-blue-600 hover:underline text-center focus:outline-none"
                        >
                          {ar ? "عرض مستند الوزن" : "View weight document"}
                        </button>
                        {step.ticketUploadedBy && (
                          <span className="text-[8px] text-muted-foreground/70 text-center">
                            {ar ? `مرفوع بواسطة: ${getUploaderLabel(step.ticketUploadedBy)}` : `Uploaded by: ${getUploaderLabel(step.ticketUploadedBy)}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Connector line */}
              {!isLast && (
                <div className={`h-0.5 flex-1 mt-2.5 mx-0.5 rounded-full ${lineCls}`} />
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ar ? "مستند الوزن" : "Weight Document"}</DialogTitle>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm text-muted-foreground">{ar ? "نوع المستند" : "Document Type"}</span>
                <span className="text-sm font-semibold">
                  {previewData.type === "source"
                    ? (ar ? "مستند وزن موقع المورد" : "Seller site weight document")
                    : (ar ? "مستند وزن موقع المشتري" : "Buyer site weight document")}
                </span>
              </div>

              {previewData.uploadedBy && (
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-sm text-muted-foreground">{ar ? "تم الرفع بواسطة" : "Uploaded by"}</span>
                  <span className="text-sm font-semibold">{previewData.uploadedBy}</span>
                </div>
              )}

              {previewData.date && (
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-sm text-muted-foreground">{ar ? "التاريخ والوقت" : "Date & Time"}</span>
                  <span className="text-sm font-medium">{formatDocDate(previewData.date)}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <span className="text-sm text-muted-foreground mb-1">{ar ? "معاينة المستند" : "Document Preview"}</span>
                {isImageUrl(previewData.url) ? (
                  <div className="rounded-md border border-border overflow-hidden bg-muted/30 p-2 flex justify-center">
                    <img 
                      src={previewData.url} 
                      alt="Weight Document Preview" 
                      className="max-w-full max-h-[350px] object-contain rounded"
                    />
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {ar ? "المستند غير قابل للمعاينة المباشرة (مثل ملف PDF)" : "This document cannot be previewed directly (e.g. PDF file)"}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border/50">
                <a 
                  href={previewData.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors w-full justify-center"
                >
                  <ExternalLink className="h-4 w-4" />
                  {ar ? "فتح المستند في تبويب جديد" : "Open document in new tab"}
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Shipment Row ──────────────────────────────────────────────────────────────

function ShipmentRow({
  shipment,
  materials,
  contract,
  onRefresh,
}: {
  shipment: ContractShipment;
  materials: ContractMaterial[];
  contract: ContractDetail;
  onRefresh: () => void;
}) {
  const { t, lang } = useT();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [inlineAction, setInlineAction] = useState<"dispatch" | "receive" | null>(null);
  const [weight, setWeight] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [confirmAction, setConfirmAction] = useState<"close" | "cancel" | null>(null);
  const [loading, setLoading] = useState(false);

  const material = materials.find((m) => m.id === shipment.material_line_id);

  async function doAction(action: string, body?: object) {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/shipments/${shipment.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...makeAuthHeaders(token) },
        credentials: "include",
        body: body ? JSON.stringify(body) : JSON.stringify({}),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }
      setWeight("");
      setEvidenceFile(null);
      setInlineAction(null);
      setConfirmAction(null);
      onRefresh();
    } catch (e) {
      toast({ title: t("error.generic"), description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleInlineActionSubmit() {
    try {
      const w = Number(weight);
      if (isNaN(w) || w <= 0) {
        toast({
          variant: "destructive",
          title: lang === "ar" ? "وزن غير صالح" : "Invalid Weight",
          description: inlineAction === "dispatch"
            ? (lang === "ar" ? "يرجى إدخال وزن صحيح أكبر من صفر قبل إرسال الشحنة." : "Please enter a valid weight greater than zero before dispatching the shipment.")
            : (lang === "ar" ? "يرجى إدخال وزن صحيح أكبر من صفر قبل تأكيد الاستلام." : "Please enter a valid weight greater than zero before confirming receipt.")
        });
        return;
      }
      setLoading(true);
      let evidenceUrl: string | undefined;

      if (evidenceFile) {
        const formData = new FormData();
        formData.append("file", evidenceFile);
        formData.append("type", inlineAction === "dispatch" ? "source" : "destination");

        const token = await getToken();
        const res = await fetch(`/api/shipments/${shipment.id}/evidence`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Upload failed");
        }
        const data = await res.json();
        evidenceUrl = data.url;
      }

      const body: Record<string, unknown> = {};
      if (weight) {
        if (inlineAction === "dispatch") body.source_weight = Number(weight);
        else body.destination_weight = Number(weight);
      }
      if (evidenceUrl) {
        if (inlineAction === "dispatch") body.source_ticket_url = evidenceUrl;
        else body.destination_ticket_url = evidenceUrl;
      }
      await doAction(inlineAction!, Object.keys(body).length > 0 ? body : undefined);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: lang === "ar" ? "خطأ" : "Error",
        description: err instanceof Error ? err.message : "Action failed",
      });
      setLoading(false);
    }
  }

  const canDispatch = shipment.status === "planned";
  const canReceive = shipment.status === "dispatched";
  const canClose = shipment.status === "received";
  const canCancel = ["planned", "dispatched"].includes(shipment.status);

  function handleCloseClick() {
    const src = Number(shipment.source_weight);
    const dst = Number(shipment.destination_weight);
    const pol = contract.weight_policy;

    let valid = true;
    if (["source_weight_only", "dual_source_final", "dual_higher_final"].includes(pol) && (isNaN(src) || src <= 0)) valid = false;
    if (["destination_weight_only", "dual_destination_final", "dual_higher_final"].includes(pol) && (isNaN(dst) || dst <= 0)) valid = false;

    if (!valid) {
      const msg = ["source_weight_only", "dual_source_final"].includes(pol)
        ? (lang === "ar" ? "لا يمكن اعتماد الشحنة نهائياً قبل إدخال وزن المصدر الصحيح." : "Cannot finalize shipment before entering a valid source weight.")
        : ["destination_weight_only", "dual_destination_final"].includes(pol)
          ? (lang === "ar" ? "لا يمكن اعتماد الشحنة نهائياً قبل إدخال وزن الاستلام الصحيح." : "Cannot finalize shipment before entering a valid destination weight.")
          : (lang === "ar" ? "لا يمكن اعتماد الشحنة نهائياً قبل اكتمال الأوزان المطلوبة حسب سياسة العقد." : "Cannot finalize shipment before entering all required weights.");

      toast({
        variant: "destructive",
        title: lang === "ar" ? "إجراء غير مكتمل" : "Incomplete Action",
        description: msg,
      });
      return;
    }
    setConfirmAction("close");
  }

  return (
    <>
      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onOpenChange={(o) => { if (!o) setConfirmAction(null); }}
          title={t(`shipment.action.${confirmAction}`)}
          description={
            confirmAction === "close" && contract.weight_policy === "dual_source_final"
              ? (lang === "ar" ? "سيتم اعتماد وزن المصدر كأساس للقيمة النهائية حسب سياسة العقد." : "The source weight will be used as the final value basis according to the contract policy.")
              : `${t(`shipment.action.${confirmAction}`)}?`
          }
          confirmLabel={t(`shipment.action.${confirmAction}`)}
          onConfirm={() => doAction(confirmAction)}
          isPending={loading}
        />
      )}

      <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-xs font-mono font-semibold text-foreground" dir="ltr">
              {shipment.reference}
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              {material?.material_label ? localizeLabel(material.material_label, lang) : "—"} · {material?.unit_label ? localizeLabel(material.unit_label, lang) : ""}
            </span>
          </div>
        </div>

        {/* Shipment Mini Timeline */}
        <ShipmentMiniTimeline shipment={shipment} contract={contract} lang={lang} />

        {/* Weights */}
        <div className="grid grid-cols-3 gap-x-3 text-xs">
          <div>
            <span className="text-muted-foreground block">{lang === "ar" ? "الوزن في موقع البائع" : "Weight at seller site"}</span>
            <span className="font-medium">{shipment.source_weight != null ? fmtNumber(shipment.source_weight) : "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">{lang === "ar" ? "الوزن في موقع المشتري" : "Weight at buyer site"}</span>
            <span className="font-medium">{shipment.destination_weight != null ? fmtNumber(shipment.destination_weight) : "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">{t("contract.shipments.final_weight")}</span>
            <span className="font-semibold text-primary">
              {shipment.final_weight != null ? fmtNumber(shipment.final_weight) : "—"}
            </span>
          </div>
        </div>

        {shipment.final_value != null && (
          <div className="text-xs font-semibold text-foreground">
            {t("contract.shipments.final_value")}: {fmtNumber(shipment.final_value)} {lang === "ar" ? "ريال" : "SAR"}
          </div>
        )}

        {/* Inline action form */}
        {inlineAction && (
          <div className="pt-2 border-t border-border space-y-2">
            <Label className="text-xs">
              {inlineAction === "dispatch" ? (lang === "ar" ? "الوزن في موقع البائع" : "Weight at seller site") : (lang === "ar" ? "الوزن في موقع المشتري" : "Weight at buyer site")}
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="any"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                className="flex-1"
              />
              <Input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              <Button size="sm" disabled={loading} onClick={handleInlineActionSubmit}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t(`shipment.action.${inlineAction}`)}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setInlineAction(null); setWeight(""); setEvidenceFile(null); }} className="border-gray-400">
                {t("action.cancel")}
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!inlineAction && (canDispatch || canReceive || canClose || canCancel) && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/60">
            {canDispatch && (
              <Button size="sm" variant="outline" className="h-7 text-xs border-gray-400 hover:border-blue-400" onClick={() => setInlineAction("dispatch")}>
                <Truck className="h-3 w-3 me-1" />
                {t("shipment.action.dispatch")}
              </Button>
            )}
            {canReceive && (
              <Button size="sm" variant="outline" className="h-7 text-xs border-gray-400 hover:border-amber-400" onClick={() => setInlineAction("receive")}>
                <Package className="h-3 w-3 me-1" />
                {t("shipment.action.receive")}
              </Button>
            )}
            {canClose && (
              <Button size="sm" variant="outline" className="h-7 text-xs border-gray-400 hover:border-green-400" onClick={handleCloseClick}>
                {lang === "ar" ? "اعتماد الشحنة نهائياً" : "Finalize Shipment"}
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => setConfirmAction("cancel")}>
                {t("shipment.action.cancel")}
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Shipments Section ─────────────────────────────────────────────────────────

function ShipmentsSection({
  contract,
  shipments,
  onRefresh,
}: {
  contract: ContractDetail;
  shipments: ContractShipment[];
  onRefresh: () => void;
}) {
  const { t, lang } = useT();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ materialLineId: "", plannedAt: "", notes: "" });
  const [adding, setAdding] = useState(false);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("shipment");
    }
    return null;
  });
  const [tab, setTab] = useState<"all" | "in-progress" | "closed">(() => {
    return shipments.some(s => s.status !== "closed" && s.status !== "cancelled") ? "in-progress" : "all";
  });

  const sortedShipments = [...shipments].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return timeA - timeB;
  });

  const filteredShipments = sortedShipments.filter(s => {
    if (tab === "all") return true;
    if (tab === "closed") return s.status === "closed";
    if (tab === "in-progress") return s.status !== "closed" && s.status !== "cancelled";
    return true;
  });

  useEffect(() => {
    if (pendingScrollId && shipments.some((s) => s.id === pendingScrollId)) {
      setTimeout(() => {
        const el = document.getElementById(`shipment-${pendingScrollId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const inner = el.firstElementChild;
          if (inner) {
            inner.classList.add("ring-2", "ring-primary", "bg-primary/5", "transition-all", "duration-1000");
            setTimeout(() => inner.classList.remove("ring-2", "ring-primary", "bg-primary/5"), 2500);
          }
        }
      }, 50);
      setPendingScrollId(null);
    }
  }, [shipments, pendingScrollId]);

  const canAddShipments = contract.status === "active";

  async function handleAddShipment(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.materialLineId || !addForm.plannedAt) return;
    setAdding(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/contracts/${contract.id}/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...makeAuthHeaders(token) },
        credentials: "include",
        body: JSON.stringify({
          material_line_id: addForm.materialLineId,
          planned_at: addForm.plannedAt,
          notes: addForm.notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }
      const newShipment = await res.json() as ContractShipment;
      setAddForm({ materialLineId: "", plannedAt: "", notes: "" });
      setShowAdd(false);
      setTab("in-progress");
      setPendingScrollId(newShipment.id);
      onRefresh();
    } catch (e) {
      toast({ title: t("error.generic"), description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  function handleOpenAddForm() {
    setShowAdd(true);
    setTimeout(() => {
      const el = document.getElementById("add-shipment-form");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary", "transition-all", "duration-1000");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2500);
        const select = el.querySelector("select");
        if (select) select.focus({ preventScroll: true });
      }
    }, 50);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">{t("contract.shipments.title")}</h3>
        {canAddShipments && (
          <Button size="sm" variant="outline" onClick={handleOpenAddForm} className="gap-1.5 border-gray-400 hover:border-primary/60 h-7 text-xs">
            <Plus className="h-3 w-3" />
            {t("contract.shipments.add")}
          </Button>
        )}
      </div>

      {/* Summary bar */}
      {contract.shipment_summary.total > 0 && (
        <div className="px-4 py-2 border-b border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
          <span>{t("contract.summary.total_shipments")}: <strong className="text-foreground">{contract.shipment_summary.total}</strong></span>
          <span>{t("contract.summary.open_shipments")}: <strong className="text-foreground">{contract.shipment_summary.open}</strong></span>
          <span>{t("contract.summary.closed_shipments")}: <strong className="text-foreground">{contract.shipment_summary.closed}</strong></span>
        </div>
      )}

      {/* Tabs */}
      {shipments.length > 0 && (
        <div className="px-4 py-2 border-b border-border/50 bg-muted/10 flex gap-2 overflow-x-auto">
          <Button 
            variant={tab === "all" ? "default" : "outline"} 
            size="sm" 
            className={`h-7 text-xs rounded-full ${tab !== "all" ? "bg-background text-muted-foreground hover:bg-muted" : ""}`}
            onClick={() => setTab("all")}
          >
            {lang === "ar" ? "الكل" : "All"}
          </Button>
          <Button 
            variant={tab === "in-progress" ? "default" : "outline"} 
            size="sm" 
            className={`h-7 text-xs rounded-full ${tab !== "in-progress" ? "bg-background text-muted-foreground hover:bg-muted" : ""}`}
            onClick={() => setTab("in-progress")}
          >
            {lang === "ar" ? "قيد الإجراء" : "In Progress"}
          </Button>
          <Button 
            variant={tab === "closed" ? "default" : "outline"} 
            size="sm" 
            className={`h-7 text-xs rounded-full ${tab !== "closed" ? "bg-background text-muted-foreground hover:bg-muted" : ""}`}
            onClick={() => setTab("closed")}
          >
            {lang === "ar" ? "مغلقة" : "Closed"}
          </Button>
        </div>
      )}

      <div className="p-4 space-y-3">
        {filteredShipments.length === 0 && !showAdd && (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("contract.shipments.empty")}</p>
        )}

        {filteredShipments.map((s) => (
          <div key={s.id} id={`shipment-${s.id}`}>
            <ShipmentRow
              shipment={s}
              materials={contract.materials}
              contract={contract}
              onRefresh={onRefresh}
            />
          </div>
        ))}

        {/* Add shipment form */}
        {showAdd && (
          <form id="add-shipment-form" onSubmit={handleAddShipment} className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
            <p className="text-xs font-semibold text-primary">{t("contract.shipments.add")}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("contract.shipments.material")} *</Label>
                <div className="relative">
                  <select
                    value={addForm.materialLineId}
                    onChange={e => setAddForm(f => ({ ...f, materialLineId: e.target.value }))}
                    required
                    className="w-full appearance-none rounded-md border border-border bg-input px-3 py-2 pe-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">{lang === "ar" ? "اختر المادة..." : "Select material..."}</option>
                    {contract.materials.map(m => (
                      <option key={m.id} value={m.id}>
                        {localizeLabel(m.material_label, lang)} ({localizeLabel(m.unit_label, lang)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{lang === "ar" ? "تاريخ الشحن المخطط" : "Planned Date"} *</Label>
                <Input
                  type="date"
                  value={addForm.plannedAt}
                  onChange={e => setAddForm(f => ({ ...f, plannedAt: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">{t("shipment.field.notes")}</Label>
                <Input
                  value={addForm.notes}
                  onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={lang === "ar" ? "ملاحظات (اختياري)" : "Notes (optional)"}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={adding} className="gap-1.5">
                {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("contract.shipments.add")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowAdd(false)} className="border-gray-400">
                {t("action.cancel")}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useT();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: contract, isLoading, isError } = useContract(id!);
  const { data: shipments = [] } = useContractShipments(id!);
  const { data: myCompany } = useMyCompany();

  const role: "seller" | "buyer" | null = contract && myCompany
    ? contract.seller_company_id === myCompany.id
      ? "seller"
      : contract.buyer_company_id === myCompany.id
        ? "buyer"
        : null
    : null;

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["contract", id] });
    void queryClient.invalidateQueries({ queryKey: ["contract-shipments", id] });
    void queryClient.invalidateQueries({ queryKey: ["contracts"] });
  }

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <AppLayout showSignOut>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (isError || !contract) {
    return (
      <AppLayout showSignOut>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm text-muted-foreground">{t("error.generic")}</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/contracts")} className="gap-1.5 border-gray-400">
            <ArrowLeft className="h-4 w-4" />
            {t("contracts.nav")}
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showSignOut>
      <div className="mb-5 flex flex-col items-start gap-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            if (typeof window !== "undefined") {
              const sp = new URLSearchParams(window.location.search);
              const returnTo = sp.get("returnTo");
              if (returnTo) {
                navigate(decodeURIComponent(returnTo));
                return;
              }
            }
            navigate("/contracts");
          }} 
          className="-ms-2 gap-1.5 h-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {lang === "ar" ? "رجوع" : "Back"}
        </Button>
        <div className="flex w-full flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {contract.reference}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {`${fmtDate(contract.start_date)}${contract.end_date ? ` → ${fmtDate(contract.end_date)}` : ""}`}
            </p>
          </div>
          <Badge variant="outline" className={`text-xs border ${statusBadgeClass(contract.status)}`}>
            {t(`contract.status.${contract.status}`)}
          </Badge>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Left column: main content */}
        <div className="space-y-4">
          {/* Contract header card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{lang === "ar" ? "تفاصيل العقد" : "Contract Details"}</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="block text-xs text-muted-foreground">{t("contract.field.seller")}</span>
                <div className="flex items-center gap-1 mt-0.5 font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {contract.seller_name}
                </div>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">{t("contract.field.buyer")}</span>
                <div className="flex items-center gap-1 mt-0.5 font-medium text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {contract.buyer_name}
                </div>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">{t("contract.field.weight_policy")}</span>
                <span className="block mt-0.5 font-medium text-foreground">
                  {t(`contract.policy.${contract.weight_policy}`)}
                </span>
              </div>
              {contract.external_reference && (
                <div>
                  <span className="block text-xs text-muted-foreground">{t("contract.field.external_ref")}</span>
                  <span className="block mt-0.5 font-mono text-foreground">{contract.external_reference}</span>
                </div>
              )}
              {contract.confirmed_at && (
                <div>
                  <span className="block text-xs text-muted-foreground">{t("contract.field.confirmed_at")}</span>
                  <div className="flex items-center gap-1 mt-0.5 font-medium text-foreground">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {fmtDate(contract.confirmed_at)}
                  </div>
                </div>
              )}
              {contract.notes && (
                <div className="col-span-2">
                  <span className="block text-xs text-muted-foreground">{t("contract.field.notes")}</span>
                  <span className="block mt-0.5 text-foreground">{contract.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Material lines */}
          <MaterialLinesSection contract={contract} onRefresh={refresh} />

          {/* Shipments */}
          <ShipmentsSection contract={contract} shipments={shipments} onRefresh={refresh} />
        </div>

        {/* Right column: lifecycle panel (timeline + actions unified) */}
        <div className="space-y-4">
          <ContractLifecyclePanel
            contract={contract}
            role={role}
            myCompanyId={myCompany?.id}
            onRefresh={refresh}
          />
        </div>
      </div>
    </AppLayout>
  );
}
