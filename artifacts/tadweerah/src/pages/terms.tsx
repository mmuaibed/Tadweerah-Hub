import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

export function TermsPage() {
  const { t } = useT();
  return (
    <AppLayout
      width="wide"
      title={t("terms.title")}
      subtitle={t("terms.subtitle")}
    >
      <div className="mx-auto max-w-[1000px] space-y-4 text-foreground">
        <section className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">{t("terms.section1.title")}</h2>
          <p className="text-muted-foreground" style={{ lineHeight: 1.75 }}>{t("terms.section1.body")}</p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">{t("terms.section2.title")}</h2>
          <p className="text-muted-foreground" style={{ lineHeight: 1.75 }}>{t("terms.section2.body")}</p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">{t("terms.section3.title")}</h2>
          <p className="text-muted-foreground" style={{ lineHeight: 1.75 }}>{t("terms.section3.body")}</p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">{t("terms.section4.title")}</h2>
          <p className="text-muted-foreground" style={{ lineHeight: 1.75 }}>{t("terms.section4.body")}</p>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">{t("terms.section5.title")}</h2>
          <p className="text-muted-foreground" style={{ lineHeight: 1.75 }}>{t("terms.section5.body")}</p>
        </section>

        <div className="border-t border-border pt-3 flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{t("terms.lastUpdated")}</p>
          <p className="text-xs text-muted-foreground">
            <a href="mailto:info@tadweerah.com" className="text-primary hover:underline">
              {t("terms.support")}
            </a>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
