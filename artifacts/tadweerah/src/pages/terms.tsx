import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";

export function TermsPage() {
  const { t } = useT();
  return (
    <AppLayout
      width="narrow"
      title={t("terms.title")}
      subtitle={t("terms.subtitle")}
    >
      <div className="prose prose-sm max-w-none text-foreground space-y-6">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{t("terms.section1.title")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("terms.section1.body")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{t("terms.section2.title")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("terms.section2.body")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{t("terms.section3.title")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("terms.section3.body")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{t("terms.section4.title")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("terms.section4.body")}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{t("terms.section5.title")}</h2>
          <p className="text-muted-foreground leading-relaxed">{t("terms.section5.body")}</p>
        </section>

        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          {t("terms.lastUpdated")}
        </p>
      </div>
    </AppLayout>
  );
}
