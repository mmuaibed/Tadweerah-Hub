import { AppLayout } from "@/components/app-layout";
import { useT } from "@/i18n";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TermsPage() {
  const { t } = useT();

  const handleReturn = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };

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

        {/* Return button — at bottom, prominent */}
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleReturn}
          >
            <ChevronRight className="h-4 w-4" />
            {t("common.back")}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
