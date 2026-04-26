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
      {/* Hero */}
      <section className="flex flex-col items-center pt-12 pb-10 text-center sm:pt-20 sm:pb-14">
        <span className="mb-10 inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-xs font-medium text-muted-foreground tracking-wide">
          {t("app.tagline")}
        </span>

        <img
          src={`${basePath}/logo.png`}
          alt="Tadweerah | تدويرة"
          className="mb-10 w-[18rem] max-w-[85vw] h-auto sm:w-[26rem] md:w-[32rem]"
          style={{ mixBlendMode: "multiply" }}
        />

        <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg leading-relaxed">
          {t("app.description")}
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <SignUpButton mode="modal">
            <Button size="lg" className="gap-2 px-8">
              {t("action.getstarted")}
              <Arrow className="h-4 w-4" />
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button size="lg" variant="outline" className="px-8">
              {t("action.signin")}
            </Button>
          </SignInButton>
        </div>

        {/* Trust line */}
        <p className="mt-5 text-xs text-muted-foreground/70 tracking-wide">
          {t("home.trust_line")}
        </p>
      </section>

      {/* What it solves */}
      <section className="mb-10 rounded-xl border border-border bg-card px-6 py-6 sm:px-8">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("home.solves.title")}
        </h2>
        <ul className="space-y-3">
          {solves.map((text, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-foreground leading-relaxed">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Feature cards */}
      <section className="grid gap-4 pb-16 sm:grid-cols-3 sm:gap-6">
        {features.map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="border-card-border bg-card transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </AppLayout>
  );
}
