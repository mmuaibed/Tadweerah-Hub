import { useState, useEffect } from "react";
import {
  useGetCapabilities,
  useGetMyCapabilities,
  useUpdateMyCapabilities,
  getGetMyCapabilitiesQueryKey,
  type Capability,
  type CompanyCapabilityRow,
} from "@workspace/api-client-react";
import { Loader2, Shield, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { useQueryClient } from "@tanstack/react-query";

// P7 — Group capabilities by their key prefix so the UI shows logical sections.
// Keys starting with cert / license / permit → certifications
// Keys starting with collect / transport / pickup → collect_transport
// Everything else → recycle
function getCapGroup(key: string): "collect_transport" | "recycle" | "certifications" {
  const k = key.toLowerCase();
  if (k.startsWith("cert") || k.startsWith("license") || k.startsWith("permit") || k.includes("certif")) {
    return "certifications";
  }
  if (k.startsWith("collect") || k.startsWith("transport") || k.startsWith("pickup")) {
    return "collect_transport";
  }
  return "recycle";
}

const GROUP_ORDER = ["collect_transport", "recycle", "certifications"] as const;
type CapGroup = (typeof GROUP_ORDER)[number];

export function CompanyCapabilitiesPage() {
  const { t, lang } = useT();
  const queryClient = useQueryClient();

  const { data: allCapabilities = [], isLoading: loadingAll } = useGetCapabilities();
  const { data: myCapabilities = [], isLoading: loadingMine } = useGetMyCapabilities();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    const ids = new Set(
      (myCapabilities as CompanyCapabilityRow[]).map((c) => c.capability_id),
    );
    setSelected(ids);
  }, [myCapabilities]);

  const { mutate: updateCapabilities } = useUpdateMyCapabilities({
    mutation: {
      onMutate: () => setSaveStatus("saving"),
      onSuccess: () => {
        setSaveStatus("saved");
        void queryClient.invalidateQueries({ queryKey: getGetMyCapabilitiesQueryKey() });
        setTimeout(() => setSaveStatus("idle"), 2500);
      },
      onError: () => {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      },
    },
  });

  function toggleCapability(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaveStatus("idle");
  }

  function handleSave() {
    updateCapabilities({ data: { capability_ids: Array.from(selected) } });
  }

  const isLoading = loadingAll || loadingMine;
  const capabilities = allCapabilities as Capability[];

  // P7 — build grouped structure
  const grouped = GROUP_ORDER.reduce<Record<CapGroup, Capability[]>>((acc, g) => {
    acc[g] = [];
    return acc;
  }, { collect_transport: [], recycle: [], certifications: [] });
  capabilities.forEach((cap) => {
    grouped[getCapGroup(cap.key)].push(cap);
  });
  const visibleGroups = GROUP_ORDER.filter((g) => grouped[g].length > 0);

  return (
    <AppLayout
      showSignOut
      width="narrow"
      title={t("capabilities.title")}
      subtitle={t("capabilities.subtitle")}
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : capabilities.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {t("capabilities.empty")}
        </p>
      ) : (
        <div className="space-y-6">
          <Card className="border-card-border bg-card overflow-hidden">
            {visibleGroups.map((group, gi) => (
              <div key={group}>
                {/* Group header */}
                <div className={`px-5 py-2.5 border-b border-border ${gi === 0 ? "" : "border-t"} bg-muted/30`}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t(`capabilities.group.${group}`)}
                  </p>
                </div>
                <div className="p-4 grid gap-3 sm:grid-cols-2">
                  {grouped[group].map((cap) => {
                    const isSelected = selected.has(cap.id);
                    return (
                      <label
                        key={cap.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-background hover:border-muted-foreground/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 rounded accent-primary"
                          checked={isSelected}
                          onChange={() => toggleCapability(cap.id)}
                        />
                        <div className="flex flex-col gap-1">
                          <span className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                            {lang === "ar" ? cap.name_ar : cap.name_en}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {lang === "ar" ? cap.name_en : cap.name_ar}
                          </span>
                          {cap.requires_license && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                              <Shield className="h-3 w-3" />
                              {t("capability.requires_license")}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </Card>

          {/* Save feedback */}
          {saveStatus === "error" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {t("capabilities.error")}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="gap-2"
            >
              {saveStatus === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saveStatus === "saved" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveStatus === "saving"
                ? t("capabilities.saving")
                : saveStatus === "saved"
                ? t("capabilities.saved")
                : t("action.save")}
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
