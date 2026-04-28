import { SignInButton, SignUpButton } from "@clerk/react";
import { Recycle, ShoppingBag, Truck, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const USER_GROUPS = [
  {
    icon: Recycle,
    titleKey: "home.feature1.title",
    valueKey: "home.for.producers.value",
  },
  {
    icon: ShoppingBag,
    titleKey: "home.feature2.title",
    valueKey: "home.for.buyers.value",
  },
  {
    icon: Truck,
    titleKey: "home.feature3.title",
    valueKey: "home.for.transporters.value",
  },
] as const;

const WHY_POINTS = ["home.why.p1", "home.why.p2", "home.why.p3"] as const;

export function HomePage() {
  const { t, lang } = useT();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <AppLayout>
      {/* ── Hero ── */}
      <section className="flex flex-col items-center pt-2 pb-4 text-center sm:pt-4 sm:pb-5">
        <span className="mb-2.5 inline-flex items-center rounded-full border border-border/60 bg-card/80 px-4 py-1 text-[10px] font-medium text-muted-foreground tracking-wide">
          {t("app.tagline")}
        </span>

        <img
          src={`${basePath}/logo.png`}
          alt="Tadweerah | تدويرة"
          className="mb-3 w-[6rem] max-w-[55vw] h-auto sm:w-[9rem] md:w-[11rem]"
          style={{ mixBlendMode: "multiply" }}
        />

        <p className="max-w-lg text-pretty text-sm text-muted-foreground sm:text-base leading-relaxed">
          {t("app.description")}
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <SignUpButton mode="modal">
            <Button size="lg" className="gap-2 px-7">
              {t("action.getstarted")}
              <Arrow className="h-4 w-4" />
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button size="lg" variant="outline" className="px-7">
              {t("action.signin")}
            </Button>
          </SignInButton>
        </div>

        <p className="mt-2 text-xs text-muted-foreground/70 leading-relaxed">
          {t("home.trust_line")}
        </p>
      </section>

      {/* ── 2-column: Why + For ── */}
      <section className="grid gap-5 pb-6 lg:grid-cols-2">

        {/* Column 1 → visual RIGHT in Arabic RTL — "Why Tadweerah?" */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">
            {t("home.why.title")}
          </h2>

          <div className="rounded-xl border border-border bg-card p-4">
            <ul className="space-y-3">
              {WHY_POINTS.map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  <span className="text-sm font-medium text-foreground leading-snug">
                    {t(key)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Column 2 → visual LEFT in Arabic RTL — "Who is this for?" */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">
            {t("home.for.title")}
          </h2>

          {USER_GROUPS.map(({ icon: Icon, titleKey, valueKey }) => (
            <div
              key={titleKey}
              className="flex items-center gap-3.5 rounded-xl border border-border bg-card px-4 py-3 transition-shadow hover:shadow-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{t(titleKey)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                  {t(valueKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

      </section>
    </AppLayout>
  );
}
