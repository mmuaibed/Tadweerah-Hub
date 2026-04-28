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

  return (
    <AppLayout>
      {/* ── Hero ── badge → logo → headline → CTAs only ── */}
      <section className="flex flex-col items-center pt-4 pb-3 text-center sm:pt-5">

        {/* Saudi badge */}
        <span className="mb-3 inline-flex items-center rounded-full border-2 border-green-300 bg-green-100 px-5 py-2 text-xs font-bold text-green-900 tracking-wide">
          {t("home.badge")}
        </span>

        {/* Logo — primary visual anchor, more breathing room below */}
        <img
          src={`${basePath}/logo.png`}
          alt="Tadweerah | تدويرة"
          className="mb-5 w-[9rem] max-w-[60vw] h-auto sm:w-[13rem] md:w-[15rem]"
          style={{ mixBlendMode: "multiply" }}
        />

        {/* Main headline */}
        <h1 className="text-lg font-bold text-foreground leading-snug sm:whitespace-nowrap sm:text-xl">
          {t("home.headline")}
        </h1>

        {/* CTAs — clearly separated from headline */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
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
      </section>

      {/* ── 2-column: Why + For ── */}
      <section className="mt-1 grid gap-5 pb-3 lg:grid-cols-2">

        {/* Column 1 → visual RIGHT in Arabic RTL — "Why Tadweerah?" */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">
            {t("home.why.title")}
          </h2>

          {/* Card stretches to fill column height on lg */}
          <div className="rounded-xl border border-border bg-card p-4 lg:flex-1">
            <ul className="flex flex-col gap-2.5 lg:h-full lg:justify-between lg:gap-0">
              {WHY_POINTS.map(({ key, icon: Icon, bold }) => (
                <li key={key} className="flex items-center gap-3">
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
        <div className="flex flex-col gap-2.5">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">
            {t("home.for.title")}
          </h2>

          {USER_GROUPS.map(({ icon: Icon, titleKey, valueKey }) => (
            <div
              key={titleKey}
              className="flex items-center gap-3.5 rounded-xl border border-border bg-card px-4 py-3.5 transition-shadow hover:shadow-sm"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
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

      {/* B2B description — bottom of page, informational only */}
      <p className="mt-2 pb-3 text-center text-sm text-muted-foreground/80">
        {t("home.description")}
      </p>
    </AppLayout>
  );
}
