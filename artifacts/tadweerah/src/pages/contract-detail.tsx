import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { useToast } from "@/hooks/use-toast";

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
  destination_weight: number | string | null;
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

// ── Contract Actions Panel ────────────────────────────────────────────────────

function ContractActionsPanel({
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
  const { t } = useT();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { status } = contract;

  // Determine if the current user is the creator.
  // Fall back to seller=creator for legacy contracts without created_by_company_id.
  const isCreator = contract.created_by_company_id
    ? contract.created_by_company_id === myCompanyId
    : role === "seller";

  const isParty = role === "seller" || role === "buyer";
  const canSubmit = isCreator && status === "draft";
  const canConfirm = !isCreator && isParty && status === "pending_confirmation";
  const canComplete = isCreator && status === "active";
  const canCancel = isParty && !["completed", "cancelled"].includes(status);

  async function doAction(action: string) {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/contracts/${contract.id}/${action}`, {
        method: "POST",
        headers: { ...makeAuthHeaders(token) },
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

  if (!canSubmit && !canConfirm && !canComplete && !canCancel) return null;

  return (
    <>
      {pending && (
        <ConfirmDialog
          open={!!pending}
          onOpenChange={(o) => { if (!o) setPending(null); }}
          title={t(`contract.action.${pending}.confirm`).split(".")[0]}
          description={t(`contract.action.${pending}.confirm`)}
          confirmLabel={t(`contract.action.${pending}`)}
          onConfirm={() => doAction(pending)}
          isPending={loading}
        />
      )}

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t("action.title") || "Actions"}</h3>

        {/* Role + creator indicator */}
        {role && (
          <p className="text-xs text-muted-foreground">
            {t(`contract.role.you_are_${role}`)}
            {" · "}
            {isCreator ? t("contract.role.you_are_creator") : t("contract.role.you_are_counterparty")}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {canSubmit && (
            <Button size="sm" onClick={() => setPending("submit")} disabled={loading} className="gap-1.5">
              {t("contract.action.submit")}
            </Button>
          )}
          {canConfirm && (
            <Button size="sm" onClick={() => setPending("confirm")} disabled={loading} className="gap-1.5">
              {t("contract.action.confirm")}
            </Button>
          )}
          {canComplete && (
            <Button size="sm" variant="outline" onClick={() => setPending("complete")} disabled={loading} className="gap-1.5 border-gray-400">
              {t("contract.action.complete")}
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="outline" onClick={() => setPending("cancel")} disabled={loading} className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
              {t("contract.action.cancel")}
            </Button>
          )}
        </div>
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
                  <td className="px-4 py-3 font-medium text-foreground">{m.material_label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.unit_label}</td>
                  <td className="px-4 py-3 text-end font-mono text-foreground">
                    {Number(m.price_per_unit).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {m.seller_pct != null ? `${Number(m.seller_pct)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {m.buyer_pct != null ? `${Number(m.buyer_pct)}%` : "—"}
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
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={adding} className="gap-1.5">
              {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("contracts.new")}
            </Button>
            <Button size="sm" type="button" variant="outline" onClick={() => setShowAdd(false)} className="border-gray-400">{t("action.cancel")}</Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Shipment Row ──────────────────────────────────────────────────────────────

function ShipmentRow({
  shipment,
  materials,
  contractId,
  onRefresh,
}: {
  shipment: ContractShipment;
  materials: ContractMaterial[];
  contractId: string;
  onRefresh: () => void;
}) {
  const { t, lang } = useT();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [inlineAction, setInlineAction] = useState<"dispatch" | "receive" | null>(null);
  const [weight, setWeight] = useState("");
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
      setInlineAction(null);
      setConfirmAction(null);
      onRefresh();
    } catch (e) {
      toast({ title: t("error.generic"), description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const canDispatch = shipment.status === "planned";
  const canReceive = shipment.status === "dispatched";
  const canClose = shipment.status === "received";
  const canCancel = !["closed", "cancelled"].includes(shipment.status);

  return (
    <>
      {confirmAction && (
        <ConfirmDialog
          open={!!confirmAction}
          onOpenChange={(o) => { if (!o) setConfirmAction(null); }}
          title={t(`shipment.action.${confirmAction}`)}
          description={`${t(`shipment.action.${confirmAction}`)}?`}
          confirmLabel={t(`shipment.action.${confirmAction}`)}
          onConfirm={() => doAction(confirmAction)}
          isPending={loading}
        />
      )}

      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-xs font-mono font-semibold text-foreground" dir="ltr">
              {shipment.reference}
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              {material?.material_label ?? "—"} · {material?.unit_label ?? ""}
            </span>
          </div>
          <Badge variant="outline" className={`shrink-0 text-xs border ${shipmentBadgeClass(shipment.status)}`}>
            {t(`shipment.status.${shipment.status}`)}
          </Badge>
        </div>

        {/* Weights */}
        <div className="grid grid-cols-3 gap-x-3 text-xs">
          <div>
            <span className="text-muted-foreground block">{t("contract.shipments.source_weight")}</span>
            <span className="font-medium">{shipment.source_weight != null ? Number(shipment.source_weight).toLocaleString() : "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">{t("contract.shipments.dest_weight")}</span>
            <span className="font-medium">{shipment.destination_weight != null ? Number(shipment.destination_weight).toLocaleString() : "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">{t("contract.shipments.final_weight")}</span>
            <span className="font-semibold text-primary">
              {shipment.final_weight != null ? Number(shipment.final_weight).toLocaleString() : "—"}
            </span>
          </div>
        </div>

        {shipment.final_value != null && (
          <div className="text-xs font-semibold text-foreground">
            {t("contract.shipments.final_value")}: {Number(shipment.final_value).toLocaleString()} {lang === "ar" ? "ريال" : "SAR"}
          </div>
        )}

        {/* Inline action form */}
        {inlineAction && (
          <div className="pt-2 border-t border-border space-y-2">
            <Label className="text-xs">
              {inlineAction === "dispatch" ? t("shipment.field.source_weight") : t("shipment.field.dest_weight")}
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
              <Button size="sm" disabled={loading} onClick={() => {
                const body: Record<string, unknown> = {};
                if (weight) {
                  if (inlineAction === "dispatch") body.source_weight = Number(weight);
                  else body.destination_weight = Number(weight);
                }
                doAction(inlineAction, Object.keys(body).length > 0 ? body : undefined);
              }}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t(`shipment.action.${inlineAction}`)}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setInlineAction(null); setWeight(""); }} className="border-gray-400">
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
              <Button size="sm" variant="outline" className="h-7 text-xs border-gray-400 hover:border-green-400" onClick={() => setConfirmAction("close")}>
                {t("shipment.action.close")}
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
      setAddForm({ materialLineId: "", plannedAt: "", notes: "" });
      setShowAdd(false);
      onRefresh();
    } catch (e) {
      toast({ title: t("error.generic"), description: e instanceof Error ? e.message : undefined, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">{t("contract.shipments.title")}</h3>
        {canAddShipments && (
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-1.5 border-gray-400 hover:border-primary/60 h-7 text-xs">
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

      <div className="p-4 space-y-3">
        {shipments.length === 0 && !showAdd && (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("contract.shipments.empty")}</p>
        )}

        {shipments.map((s) => (
          <ShipmentRow
            key={s.id}
            shipment={s}
            materials={contract.materials}
            contractId={contract.id}
            onRefresh={onRefresh}
          />
        ))}

        {/* Add shipment form */}
        {showAdd && (
          <form onSubmit={handleAddShipment} className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
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
                      <option key={m.id} value={m.id}>{m.material_label} ({m.unit_label})</option>
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

// ── Timeline ──────────────────────────────────────────────────────────────────

function ContractTimeline({ contract, lang }: { contract: ContractDetail; lang: string }) {
  const { t } = useT();

  const steps: { label: string; ts: string | null }[] = [
    { label: t("contract.timeline.created"), ts: contract.created_at },
    { label: t("contract.timeline.submitted"), ts: contract.confirmed_at ? contract.created_at : null },
    { label: t("contract.timeline.confirmed"), ts: contract.confirmed_at },
    { label: t("contract.timeline.completed"), ts: contract.completed_at },
    ...(contract.cancelled_at ? [{ label: t("contract.timeline.cancelled"), ts: contract.cancelled_at }] : []),
  ];

  const filteredSteps = steps.filter(s =>
    s.ts !== null || !contract.completed_at && !contract.cancelled_at
  );

  function fmtDate(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{t("contract.timeline.title")}</h3>
      <div className="space-y-0 mt-3">
        {filteredSteps.map((step, i) => {
          const done = step.ts !== null;
          const isLast = i === filteredSteps.length - 1;
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${
                  done ? "bg-primary/80 text-white" : "border-2 border-muted-foreground/20 bg-background"
                }`}>
                  {done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-2.5 w-2.5 text-muted-foreground/30" />}
                </div>
                {!isLast && <div className={`w-0.5 flex-1 min-h-4 mt-0.5 ${done ? "bg-primary/40" : "bg-muted-foreground/10"}`} />}
              </div>
              <div className="pb-3">
                <p className={`text-xs font-medium ${done ? "text-foreground" : "text-muted-foreground/40"}`}>{step.label}</p>
                {done && <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(step.ts)}</p>}
              </div>
            </div>
          );
        })}
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
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
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
    <AppLayout
      showSignOut
      title={contract.reference}
      subtitle={`${fmtDate(contract.start_date)}${contract.end_date ? ` → ${fmtDate(contract.end_date)}` : ""}`}
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs border ${statusBadgeClass(contract.status)}`}>
            {t(`contract.status.${contract.status}`)}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => navigate("/contracts")} className="gap-1.5 border-gray-400 h-8 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("contracts.nav")}
          </Button>
        </div>
      }
    >
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

        {/* Right column: actions + timeline */}
        <div className="space-y-4">
          {/* Action required banner for counterparty */}
          {(() => {
            if (!myCompany || !contract) return null;
            const isCreator = contract.created_by_company_id
              ? contract.created_by_company_id === myCompany.id
              : contract.seller_company_id === myCompany.id;
            const isParty = role === "seller" || role === "buyer";
            const isCounterparty = !isCreator && isParty;
            if (isCounterparty && contract.status === "pending_confirmation") {
              return (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-1">
                  <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                    <span>⚠</span> {t("contract.action.required")}
                  </p>
                  <p className="text-xs text-amber-700">{t("contract.action.required.desc")}</p>
                </div>
              );
            }
            return null;
          })()}
          <ContractActionsPanel
            contract={contract}
            role={role}
            myCompanyId={myCompany?.id}
            onRefresh={refresh}
          />
          <ContractTimeline contract={contract} lang={lang} />
        </div>
      </div>
    </AppLayout>
  );
}
