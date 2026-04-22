import { useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateCompany,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import type {
  CompanyType,
  CreateCompanyBody,
} from "@workspace/api-client-react";
import { Recycle, ShoppingBag, Truck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

const TYPE_OPTIONS: Array<{
  value: CompanyType;
  icon: typeof Recycle;
  titleKey: string;
  descKey: string;
}> = [
  { value: "producer", icon: Recycle, titleKey: "type.producer", descKey: "type.producer.desc" },
  { value: "buyer", icon: ShoppingBag, titleKey: "type.buyer", descKey: "type.buyer.desc" },
  { value: "carrier", icon: Truck, titleKey: "type.carrier", descKey: "type.carrier.desc" },
];

export function OnboardingPage() {
  const { t } = useT();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [type, setType] = useState<CompanyType>("producer");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [commercialRegistration, setCr] = useState("");
  const [contactPhone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useCreateCompany();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const body: CreateCompanyBody = {
      name: name.trim(),
      type,
      city: city.trim(),
      contactPhone: contactPhone.trim(),
      ...(commercialRegistration.trim()
        ? { commercialRegistration: commercialRegistration.trim() }
        : {}),
    };
    mutate(
      { data: body },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/dashboard");
        },
        onError: () => setError(t("onboarding.error.generic")),
      },
    );
  };

  return (
    <AppLayout
      showSignOut
      width="narrow"
      title={t("onboarding.title")}
      subtitle={t("onboarding.subtitle")}
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <fieldset>
          <legend className="mb-3 block text-sm font-medium text-foreground">
            {t("onboarding.form.type")}
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {TYPE_OPTIONS.map(({ value, icon: Icon, titleKey, descKey }) => {
              const selected = type === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`group relative flex flex-col items-start gap-3 rounded-lg border p-4 text-start transition-colors ${
                    selected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-md ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-semibold text-card-foreground">
                      {t(titleKey)}
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t(descKey)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Card className="border-card-border bg-card">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t("onboarding.form.name")}</Label>
              <Input
                id="name"
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">{t("onboarding.form.city")}</Label>
                <Input
                  id="city"
                  required
                  minLength={2}
                  maxLength={80}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("onboarding.form.phone")}</Label>
                <Input
                  id="phone"
                  required
                  minLength={6}
                  maxLength={20}
                  value={contactPhone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr">{t("onboarding.form.cr")}</Label>
              <Input
                id="cr"
                maxLength={40}
                value={commercialRegistration}
                onChange={(e) => setCr(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full gap-2" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? t("onboarding.form.saving") : t("onboarding.form.submit")}
        </Button>
      </form>
    </AppLayout>
  );
}
