import { useLocation } from "wouter";
import {
  Recycle,
  ShoppingBag,
  Truck,
  ArrowLeft,
  ArrowRight,
  Building2,
  FileCheck,
  BadgeCheck,
  LayoutDashboard,
  Lock,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type WhyPoint = { key: string; icon: LucideIcon; bold?: boolean };

const WHY_POINTS: WhyPoint[] = [
  { key: "home.why.p1", icon: Building2, bold: true },
  { key: "home.why.p2", icon: FileCheck },
  { key: "home.why.p3", icon: BadgeCheck },
  { key: "home.why.p4", icon: LayoutDashboard },
  { key: "home.why.p5", icon: Lock },
  { key: "home.why.p6", icon: TrendingUp },
];

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

export function HomePage() {
  const { t, lang } = useT();
  const [, navigate] = useLocation();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const goToOnboarding = () => navigate("/onboarding/company");

  return (
    <AppLayout>
      {/* ── Hero: badge → logo → headline → CTAs (compact) ── */}
      <section className="flex flex-col items-center pt-1 pb-3 text-center">

        {/* Saudi green badge */}
        <span className="mb-2 inline-flex items-center rounded-full border-2 border-green-300 bg-green-100 px-5 py-1.5 text-xs font-bold text-green-900 tracking-wide">
          {t("home.badge")}
        </span>

        {/* Logo */}
        <img
          src={`${basePath}/logo.png`}
          alt="Tadweerah | تدويرة"
          className="mb-2 w-[8rem] max-w-[55vw] h-auto sm:w-[11rem] md:w-[13rem]"
          style={{ mixBlendMode: "multiply" }}
        />

        {/* Main headline */}
        <h1 className="text-base font-bold text-foreground leading-snug sm:whitespace-nowrap sm:text-lg">
          {t("home.headline")}
        </h1>

        {/* CTAs */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button size="lg" className="gap-2 px-7 font-bold" onClick={goToOnboarding}>
            {t("action.getstarted")}
            <Arrow className="h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-gray-400 px-7 hover:border-primary/60 hover:bg-muted/50"
            onClick={() => navigate("/sign-in")}
          >
            {t("action.signin")}
          </Button>
        </div>

        {/* No-account prompt */}
        <div className="mt-2">
          <button
            type="button"
            onClick={goToOnboarding}
            className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
          >
            {t("home.no_account_prompt")}
          </button>
        </div>
      </section>

      {/* ── 2-column: Why + For — fills remaining space ── */}
      <section className="flex-1 grid gap-4 lg:grid-cols-2">

        {/* Column 1 → visual RIGHT in Arabic RTL — "Why Tadweerah?" */}
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-foreground sm:text-lg">
            {t("home.why.title")}
          </h2>

          <div className="rounded-xl border border-border bg-card p-4 flex-1">
            <ul className="h-full flex flex-col justify-between">
              {WHY_POINTS.map(({ key, icon: Icon, bold }) => (
                <li key={key} className="flex items-center gap-3 py-1">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span
                    className={`text-sm leading-snug ${
                      bold
                        ? "font-semibold text-foreground"
                        : "font-medium text-foreground/85"
                    }`}
                  >
                    {t(key)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Column 2 → visual LEFT in Arabic RTL — "Who is this for?" */}
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-bold text-foreground sm:text-lg">
            {t("home.for.title")}
          </h2>

          <div className="flex flex-col gap-3 flex-1 justify-between">
            {USER_GROUPS.map(({ icon: Icon, titleKey, valueKey }) => (
              <div
                key={titleKey}
                className="flex items-center gap-3.5 rounded-xl border border-border bg-card px-4 py-4 flex-1 transition-shadow hover:shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">{t(titleKey)}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug">
                    {t(valueKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* B2B description footer */}
      <p className="mt-3 pb-2 text-center text-xs text-muted-foreground/80">
        {t("home.description")}
      </p>
    </AppLayout>
  );
}
