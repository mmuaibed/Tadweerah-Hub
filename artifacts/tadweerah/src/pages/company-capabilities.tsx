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
          <Card className="border-card-border bg-card">
            <CardContent className="p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {capabilities.map((cap) => {
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
                            {t("onboarding.form.license_number")}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </CardContent>
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
