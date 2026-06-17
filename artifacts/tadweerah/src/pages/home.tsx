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
import { Topbar } from "@/components/topbar";
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
    <div 
      className="flex min-h-[100dvh] w-full flex-col bg-background text-foreground"
      data-build-marker="home-reference-match-final"
    >
      <Topbar />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-2 sm:px-6 sm:py-3">
        
        {/* ── Hero ── */}
        <section className="flex w-full flex-col items-center pt-1 pb-3 text-center">
          {/* Badge */}
          <span className="mb-2 inline-flex items-center rounded-full border-2 border-green-300 bg-green-100 px-5 py-1.5 text-xs font-bold text-green-900 tracking-wide">
            {t("home.badge")}
          </span>

          {/* Logo with hard constraints */}
          <img
            src={`${basePath}/logo.png`}
            alt="Tadweerah"
            className="mb-2 h-auto w-32 max-w-[55vw] object-contain sm:w-44 md:w-52"
            style={{ maxWidth: "208px", width: "min(208px, 55vw)", height: "auto", objectFit: "contain", mixBlendMode: "multiply" }}
          />

          {/* Headline */}
          <h1 className="text-base font-bold text-foreground leading-snug sm:whitespace-nowrap sm:text-lg">
            {t("home.headline")}
          </h1>

          {/* CTAs */}
          <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="gap-2 px-8 font-bold" onClick={goToOnboarding}>
              {t("action.getstarted")}
              <Arrow className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-400 px-8 hover:border-primary/60 hover:bg-muted/50"
              onClick={() => navigate("/sign-in")}
            >
              {t("action.signin")}
            </Button>
          </div>

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

        {/* ── 2-column: Why + For ── */}
        <section className="mt-2 grid w-full gap-4 pb-4 lg:grid-cols-2 lg:gap-6">
          
          {/* Right column in RTL: Why */}
          <div className="flex flex-col gap-3">
            <h2 className="text-center text-base font-bold text-foreground sm:text-lg lg:text-start">
              {t("home.why.title")}
            </h2>
            <div className="flex-1 rounded-xl border border-border bg-card p-4">
              <ul className="flex h-full flex-col justify-center gap-3">
                {WHY_POINTS.map(({ key, icon: Icon, bold }) => (
                  <li key={key} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm font-semibold text-foreground leading-snug">
                      {t(key)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Left column in RTL: For */}
          <div className="flex flex-col gap-3">
            <h2 className="text-center text-base font-bold text-foreground sm:text-lg lg:text-start">
              {t("home.for.title")}
            </h2>
            <div className="flex flex-1 flex-col gap-3">
              {USER_GROUPS.map(({ icon: Icon, titleKey, valueKey }) => (
                <div
                  key={titleKey}
                  className="flex flex-1 items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 transition-shadow hover:shadow-sm"
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

        <p className="mt-auto pb-2 text-center text-xs text-muted-foreground/80">
          {t("home.description")}
        </p>
      </main>
    </div>
  );
}
