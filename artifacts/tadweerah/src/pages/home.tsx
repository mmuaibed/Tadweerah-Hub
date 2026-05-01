import { SignInButton, SignUpButton } from "@clerk/react";
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
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const onboardingUrl = `${basePath}/onboarding/company`;

  return (
    <AppLayout>
      {/* ── Hero: badge → logo → headline → CTAs ── */}
      <section className="flex flex-col items-center pt-1 pb-2 text-center">

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
          <SignUpButton mode="modal" forceRedirectUrl={onboardingUrl}>
            <Button size="lg" className="gap-2 px-7 font-bold">
              {t("action.getstarted")}
              <Arrow className="h-4 w-4" />
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button
              size="lg"
              variant="outline"
              className="border-gray-400 px-7 hover:border-primary/60 hover:bg-muted/50"
            >
              {t("action.signin")}
            </Button>
          </SignInButton>
        </div>

        {/* No-account prompt */}
        <div className="mt-2">
          <SignUpButton mode="modal" forceRedirectUrl={onboardingUrl}>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
            >
              {t("home.no_account_prompt")}
            </button>
          </SignUpButton>
        </div>
      </section>

      {/* ── 2-column: Why + For ── */}
      <section className="mt-1 grid gap-3 pb-2 lg:grid-cols-2">

        {/* Column 1 → visual RIGHT in Arabic RTL — "Why Tadweerah?" */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-bold text-foreground sm:text-lg">
            {t("home.why.title")}
          </h2>

          <div className="rounded-xl border border-border bg-card p-3 lg:flex-1">
            <ul className="flex flex-col gap-2 lg:h-full lg:justify-between lg:gap-0">
              {WHY_POINTS.map(({ key, icon: Icon, bold }) => (
                <li key={key} className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3 w-3" />
                  </span>
                  <span
                    className={`text-xs leading-snug ${
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
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-bold text-foreground sm:text-lg">
            {t("home.for.title")}
          </h2>

          {USER_GROUPS.map(({ icon: Icon, titleKey, valueKey }) => (
            <div
              key={titleKey}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-shadow hover:shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
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

      {/* B2B description footer */}
      <p className="mt-1 pb-2 text-center text-sm text-muted-foreground/90">
        {t("home.description")}
      </p>
    </AppLayout>
  );
}
