import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Loader2, Plus, Trash2, Building2, ChevronDown, X, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompanyResult {
  id: string;
  name: string;
  city?: string;
}

interface MaterialLine {
  id: string;
  materialLabel: string;
  unitLabel: string;
  pricePerUnit: string;
  sellerPct: string;
  buyerPct: string;
}

type WeightPolicy =
  | "source_weight_only"
  | "destination_weight_only"
  | "dual_source_final"
  | "dual_destination_final"
  | "dual_higher_final";

const WEIGHT_POLICIES: WeightPolicy[] = [
  "source_weight_only",
  "destination_weight_only",
  "dual_source_final",
  "dual_destination_final",
  "dual_higher_final",
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Company Search ─────────────────────────────────────────────────────────────

function CounterpartySearch({
  value,
  onChange,
  placeholder,
}: {
  value: CompanyResult | null;
  onChange: (company: CompanyResult | null) => void;
  placeholder: string;
}) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(
          `/api/companies/search?q=${encodeURIComponent(query.trim())}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            credentials: "include",
          },
        );
        if (res.ok) {
          const data = (await res.json()) as CompanyResult[];
          setResults(data.slice(0, 8));
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, getToken]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm font-medium text-foreground">
          {value.name}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Building2 className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className="ps-9"
        />
        {loading && (
          <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-background shadow-lg">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
              onMouseDown={() => {
                onChange(c);
                setQuery("");
                setOpen(false);
              }}
            >
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium text-foreground">{c.name}</span>
              {c.city && (
                <span className="text-muted-foreground ms-auto">{c.city}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Material Line Row ──────────────────────────────────────────────────────────

function MaterialLineRow({
  line,
  onChange,
  onRemove,
  lang,
}: {
  line: MaterialLine;
  onChange: (updated: MaterialLine) => void;
  onRemove: () => void;
  lang: "ar" | "en";
}) {
  const { t } = useT();

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t("contract.materials.label")}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">{t("contract.materials.label")} *</Label>
          <Input
            value={line.materialLabel}
            onChange={(e) =>
              onChange({ ...line, materialLabel: e.target.value })
            }
            placeholder={lang === "ar" ? "مثال: بلاستيك" : "e.g. Plastic"}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("contract.materials.unit")} *</Label>
          <Input
            value={line.unitLabel}
            onChange={(e) => onChange({ ...line, unitLabel: e.target.value })}
            placeholder={lang === "ar" ? "مثال: طن" : "e.g. Ton"}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("contract.materials.price")} *</Label>
          <Input
            type="number"
            min="0"
            step="0.001"
            value={line.pricePerUnit}
            onChange={(e) =>
              onChange({ ...line, pricePerUnit: e.target.value })
            }
            placeholder="0"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">{t("contract.materials.seller_pct")}</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={line.sellerPct}
              onChange={(e) =>
                onChange({ ...line, sellerPct: e.target.value })
              }
              placeholder="%"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("contract.materials.buyer_pct")}</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={line.buyerPct}
              onChange={(e) =>
                onChange({ ...line, buyerPct: e.target.value })
              }
              placeholder="%"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground sm:col-span-2 bg-background/50 p-2 rounded border border-border/50 mt-1">
          {lang === "ar" ? "إذا تُركت النسب فارغة، تُحتسب القيمة بالكامل للبائع." : "If left blank, 100% of the value is assumed for the seller."}
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ContractNewPage() {
  const { t, lang } = useT();
  const { getToken } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [myRole, setMyRole] = useState<"seller" | "buyer">("seller");
  const [counterparty, setCounterparty] = useState<CompanyResult | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weightPolicy, setWeightPolicy] = useState<WeightPolicy>("source_weight_only");
  const [externalRef, setExternalRef] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState<MaterialLine[]>([]);
  const [creating, setCreating] = useState(false);

  // Reset counterparty when role changes
  function handleRoleChange(role: "seller" | "buyer") {
    setMyRole(role);
    setCounterparty(null);
  }

  function addMaterialLine() {
    setMaterials((prev) => [
      ...prev,
      {
        id: uid(),
        materialLabel: "",
        unitLabel: "",
        pricePerUnit: "",
        sellerPct: "",
        buyerPct: "",
      },
    ]);
  }

  function updateMaterialLine(id: string, updated: MaterialLine) {
    setMaterials((prev) => prev.map((m) => (m.id === id ? updated : m)));
  }

  function removeMaterialLine(id: string) {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!counterparty) {
      toast({
        title: myRole === "seller"
          ? t("contract.new.counterparty_buyer")
          : t("contract.new.counterparty_seller"),
        description: t("error.required"),
        variant: "destructive",
      });
      return;
    }
    if (!startDate) {
      toast({ title: t("contract.field.start_date"), description: t("error.required"), variant: "destructive" });
      return;
    }
    if (materials.length === 0) {
      toast({ title: t("contract.new.min_one_material"), variant: "destructive" });
      return;
    }

    const invalidLine = materials.find(
      (m) => !m.materialLabel.trim() || !m.unitLabel.trim() || !m.pricePerUnit,
    );
    if (invalidLine) {
      toast({ title: t("error.generic"), description: lang === "ar" ? "تأكد من ملء جميع حقول بند المادة" : "Fill in all material line fields", variant: "destructive" });
      return;
    }

    const action = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") || "draft";

    setCreating(true);
    let createdContractId: string | null = null;
    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const contractRes = await fetch("/api/contracts", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          my_role: myRole,
          counterparty_company_id: counterparty.id,
          start_date: startDate,
          end_date: endDate || undefined,
          weight_policy: weightPolicy,
          external_reference: externalRef.trim() || undefined,
          attachment_url: attachmentUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!contractRes.ok) {
        const err = (await contractRes.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "Failed to create contract");
      }

      const contract = (await contractRes.json()) as { id: string };

      for (const mat of materials) {
        const matRes = await fetch(`/api/contracts/${contract.id}/materials`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            material_label: mat.materialLabel.trim(),
            unit_label: mat.unitLabel.trim(),
            price_per_unit: Number(mat.pricePerUnit),
            seller_pct: mat.sellerPct ? Number(mat.sellerPct) : undefined,
            buyer_pct: mat.buyerPct ? Number(mat.buyerPct) : undefined,
          }),
        });
        if (!matRes.ok) {
          const err = (await matRes.json().catch(() => ({}))) as { message?: string };
          throw new Error(err.message ?? "Failed to add material line");
        }
      }

      createdContractId = contract.id;

      if (action === "submit") {
        const submitRes = await fetch(`/api/contracts/${contract.id}/submit`, {
          method: "POST",
          headers,
          credentials: "include",
        });
        if (!submitRes.ok) {
          const err = (await submitRes.json().catch(() => ({}))) as { message?: string };
          toast({
            title: lang === "ar" ? "تم الحفظ كمسودة، لكن فشل الإرسال" : "Saved as draft, but sending failed",
            description: err.message ?? "Failed to send contract for confirmation.",
            variant: "destructive",
          });
          navigate(`/contracts/${contract.id}`);
          return; // Stop here, contract exists as draft
        }
      }

      navigate(`/contracts/${contract.id}`);
    } catch (err) {
      toast({
        title: t("error.generic"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  const counterpartyLabel = myRole === "seller"
    ? t("contract.new.counterparty_buyer")
    : t("contract.new.counterparty_seller");

  const counterpartyPlaceholder = myRole === "seller"
    ? (lang === "ar" ? "اكتب حرفين على الأقل للبحث عن الشركات المعتمدة" : "Type at least 2 characters to search approved companies")
    : (lang === "ar" ? "اكتب حرفين على الأقل للبحث عن الشركات المعتمدة" : "Type at least 2 characters to search approved companies");

  return (
    <AppLayout
      title={t("contract.new.title")}
      subtitle={t("contract.new.subtitle")}
      showSignOut
    >
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

        {/* Section 1: Role + Counterparty */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            {t("contract.new.section.details")}
          </h2>

          {/* Role selector */}
          <div className="space-y-1.5">
            <Label>{t("contract.new.my_role")} *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["seller", "buyer"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    myRole === role
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {t(`contract.new.role.${role}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Counterparty search */}
          <div className="space-y-1.5">
            <Label>{counterpartyLabel} *</Label>
            <CounterpartySearch
              value={counterparty}
              onChange={setCounterparty}
              placeholder={counterpartyPlaceholder}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">{t("contract.field.start_date")} *</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">{t("contract.field.end_date")}</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="weight_policy">{t("contract.field.weight_policy")} *</Label>
            <div className="relative">
              <select
                id="weight_policy"
                value={weightPolicy}
                onChange={(e) =>
                  setWeightPolicy(e.target.value as WeightPolicy)
                }
                className="w-full appearance-none rounded-md border border-border bg-input px-3 py-2 pe-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {WEIGHT_POLICIES.map((p) => (
                  <option key={p} value={p}>
                    {t(`contract.policy.${p}`)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="external_ref">{t("contract.field.external_ref")}</Label>
            <Input
              id="external_ref"
              value={externalRef}
              onChange={(e) => setExternalRef(e.target.value)}
              placeholder={lang === "ar" ? "رقم العقد الخارجي (اختياري)" : "Your external contract number (optional)"}
            />
          </div>

          {/* Attachment URL (Hidden for Phase 1 UAT) */}
          {/*
          <div className="space-y-1.5">
            <Label htmlFor="attachment_url" className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              {lang === "ar" ? "رابط المرفق (URL)" : "Attachment Link (URL)"}
            </Label>
            <Input
              id="attachment_url"
              type="url"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder={lang === "ar" ? "https://... (رابط فقط)" : "https://... (Web link only)"}
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              {lang === "ar" ? "أدخل رابطاً للوثيقة (مثل رابط Google Drive). لا يمكن رفع الملفات مباشرة." : "Enter a web link to the document (e.g., Google Drive). Direct file uploads are not supported."}
            </p>
          </div>
          */}

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("contract.field.notes")}</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={lang === "ar" ? "ملاحظات إضافية..." : "Additional notes..."}
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        {/* Section 2: Material lines */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {t("contract.new.section.materials")}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMaterialLine}
              className="gap-1.5 border-gray-400 hover:border-primary/60"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("contract.new.add_material")}
            </Button>
          </div>

          {materials.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("contract.materials.empty")}
            </p>
          )}

          <div className="space-y-3">
            {materials.map((m) => (
              <MaterialLineRow
                key={m.id}
                line={m}
                onChange={(updated) => updateMaterialLine(m.id, updated)}
                onRemove={() => removeMaterialLine(m.id)}
                lang={lang}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/contracts")}
            className="border-gray-400"
            disabled={creating}
          >
            {t("action.cancel")}
          </Button>
          <Button 
            type="submit" 
            name="action" 
            value="draft" 
            variant="secondary" 
            disabled={creating} 
            className="gap-2 min-w-32"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === "ar" ? "حفظ كمسودة" : "Save as Draft")}
          </Button>
          <Button 
            type="submit" 
            name="action" 
            value="submit" 
            disabled={creating} 
            className="gap-2 min-w-32"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : (lang === "ar" ? "إنشاء وإرسال للتأكيد" : "Create & Send")}
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}
