import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Loader2,
  Plus,
  Calendar,
  Building2,
  ArrowRight,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppLayout } from "@/components/app-layout";
import { EmptyState } from "@/components/empty-state";
import { FileText } from "lucide-react";
import { useT } from "@/i18n";

// ── Types ─────────────────────────────────────────────────────────────────────

type ContractStatus =
  | "draft"
  | "pending_confirmation"
  | "active"
  | "completed"
  | "cancelled";

interface ContractSummary {
  id: string;
  reference: string;
  external_reference: string | null;
  seller_company_id: string;
  buyer_company_id: string;
  seller_name: string;
  buyer_name: string;
  start_date: string;
  end_date: string | null;
  status: ContractStatus;
  weight_policy: string;
  created_at: string;
  shipment_summary?: {
    total: number;
    open: number;
    closed: number;
    cancelled: number;
  };
  materials?: { id: string }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusBadgeClass(status: ContractStatus): string {
  switch (status) {
    case "draft":
      return "bg-muted text-muted-foreground border-border";
    case "pending_confirmation":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "active":
      return "bg-green-50 text-green-700 border-green-200";
    case "completed":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "cancelled":
      return "bg-red-50 text-red-600 border-red-200";
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useContracts() {
  const { getToken } = useAuth();
  return useQuery<ContractSummary[]>({
    queryKey: ["contracts"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/contracts", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load contracts");
      return res.json() as Promise<ContractSummary[]>;
    },
    staleTime: 30_000,
  });
}

// ── Contract Card ─────────────────────────────────────────────────────────────

function ContractCard({ contract }: { contract: ContractSummary }) {
  const { t, lang } = useT();

  const matCount = contract.materials?.length ?? 0;
  const summary = contract.shipment_summary;

  const dateStr = new Date(contract.start_date).toLocaleDateString(
    lang === "ar" ? "ar-SA" : "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );

  return (
    <Link to={`/contracts/${contract.id}`}>
      <div className="group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm hover:border-primary/30 cursor-pointer space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-sm font-mono font-semibold text-foreground">
              {contract.reference}
            </span>
            {contract.external_reference && (
              <span className="block text-xs text-muted-foreground mt-0.5">
                {contract.external_reference}
              </span>
            )}
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs border ${statusBadgeClass(contract.status)}`}
          >
            {t(`contract.status.${contract.status}`)}
          </Badge>
        </div>

        {/* Parties */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{contract.seller_name}</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="truncate">{contract.buyer_name}</span>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-3">
            {matCount > 0 && (
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                <span>
                  {matCount}{" "}
                  {matCount === 1
                    ? t("contracts.card.materials")
                    : t("contracts.card.materials_plural")}
                </span>
              </div>
            )}
            {summary && summary.total > 0 && (
              <span>
                {summary.open} / {summary.total}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ContractsPage() {
  const { t } = useT();
  const { data: contracts, isLoading, isError } = useContracts();

  return (
    <AppLayout
      title={t("contracts.title")}
      subtitle={t("contracts.subtitle")}
      showSignOut
      actions={
        <Link to="/contracts/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {t("contracts.new")}
          </Button>
        </Link>
      }
    >
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {t("error.generic")}
        </div>
      )}

      {!isLoading && !isError && contracts?.length === 0 && (
        <EmptyState
          icon={FileText}
          title={t("contracts.empty.title")}
          description={t("contracts.empty.desc")}
          action={
            <Link to="/contracts/new">
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("contracts.new")}
              </Button>
            </Link>
          }
        />
      )}

      {!isLoading && !isError && contracts && contracts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contracts.map((c) => (
            <ContractCard key={c.id} contract={c} />
          ))}
        </div>
      )}
    </AppLayout>
  );
}
