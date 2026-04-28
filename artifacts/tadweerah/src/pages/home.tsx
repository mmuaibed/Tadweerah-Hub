import { SignInButton, SignUpButton } from "@clerk/react";
import { Recycle, ShoppingBag, Truck, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function HomePage() {
  const { t, lang } = useT();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const features = [
    { icon: Recycle, title: t("home.feature1.title"), desc: t("home.feature1.desc") },
    { icon: ShoppingBag, title: t("home.feature2.title"), desc: t("home.feature2.desc") },
    { icon: Truck, title: t("home.feature3.title"), desc: t("home.feature3.desc") },
  ];

  const solves = [
    t("home.solves.1"),
    t("home.solves.2"),
    t("home.solves.3"),
  ];

  return (
    <AppLayout>
      {/* Hero — compact, CTA above fold */}
      <section className="flex flex-col items-center pt-3 pb-4 text-center sm:pt-5 sm:pb-5">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground tracking-wide">
          {t("app.tagline")}
        </span>

        <img
          src={`${basePath}/logo.png`}
          alt="Tadweerah | تدويرة"
          className="mb-3 w-[9rem] max-w-[65vw] h-auto sm:w-[13rem] md:w-[16rem]"
          style={{ mixBlendMode: "multiply" }}
        />

        <p className="max-w-xl text-pretty text-sm text-muted-foreground sm:text-base leading-relaxed">
          {t("app.description")}
        </p>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
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

        <p className="mt-3 text-xs text-muted-foreground/70 tracking-wide">
          {t("home.trust_line")}
        </p>
      </section>

      {/* What it solves */}
      <section className="mb-4 rounded-xl border border-border bg-card px-5 py-4 sm:px-6">
        <h2 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("home.solves.title")}
        </h2>
        <ul className="space-y-2">
          {solves.map((text, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground leading-relaxed">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Feature cards */}
      <section className="grid gap-3 pb-6 sm:grid-cols-3 sm:gap-4">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="border-card-border bg-card transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col items-start gap-2 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </AppLayout>
  );
}
