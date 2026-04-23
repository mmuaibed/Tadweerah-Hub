import { SignInButton, SignUpButton } from "@clerk/react";
import { Recycle, ShoppingBag, Truck, ArrowLeft, ArrowRight } from "lucide-react";
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

  return (
    <AppLayout>
      <section className="flex flex-col items-center pt-10 pb-14 text-center sm:pt-20 sm:pb-20">
        <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
          {t("app.tagline")}
        </span>

        <img
          src={`${basePath}/logo.png`}
          alt="Tadweerah | تدويرة"
          className="mb-8 h-36 w-auto sm:h-44"
          style={{ mixBlendMode: "multiply" }}
        />

        <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg leading-relaxed">
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
