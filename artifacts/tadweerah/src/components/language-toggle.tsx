import React from "react";
import { useT } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { lang, setLang, t } = useT();

  const toggleLang = () => {
    setLang(lang === "ar" ? "en" : "ar");
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleLang} className="gap-2 font-medium">
      <Globe className="h-4 w-4" />
      {t("nav.language")}
    </Button>
  );
}
