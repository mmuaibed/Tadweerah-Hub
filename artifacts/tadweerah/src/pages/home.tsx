import { SignInButton, SignUpButton } from "@clerk/react";
import { Recycle, ShoppingBag, Truck, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Topbar } from "@/components/topbar";
import { useT } from "@/i18n";

export function HomePage() {
  const { t, lang } = useT();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const features = [
    {
      icon: Recycle,
      title: t("home.feature1.title"),
      desc: t("home.feature1.desc"),
    },
    {
      icon: ShoppingBag,
      title: t("home.feature2.title"),
      desc: t("home.feature2.desc"),
    },
    {
      icon: Truck,
      title: t("home.feature3.title"),
      desc: t("home.feature3.desc"),
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Topbar />

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <section className="flex flex-col items-center pt-16 pb-12 text-center sm:pt-24 sm:pb-16">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            {t("app.tagline")}
          </span>
          <h1 className="max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {t("app.name")}
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            {t("app.description")}
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <SignUpButton mode="modal">
              <Button size="lg" className="gap-2">
                {t("action.getstarted")}
                <Arrow className="h-4 w-4" />
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button size="lg" variant="outline">
                {t("action.signin")}
              </Button>
            </SignInButton>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-3 sm:gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card
              key={title}
              className="border-card-border bg-card transition-shadow hover:shadow-md"
            >
              <CardContent className="flex flex-col items-start gap-4 p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {desc}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
