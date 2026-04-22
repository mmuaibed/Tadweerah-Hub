import { useClerk, Show } from "@clerk/react";
import { Link } from "wouter";
import { Recycle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/i18n";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Topbar({ showSignOut = false }: { showSignOut?: boolean }) {
  const { signOut } = useClerk();
  const { t } = useT();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Recycle className="h-5 w-5" />
          </span>
          <span className="text-lg">{t("app.name")}</span>
        </Link>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Show when="signed-in">
            {showSignOut && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                {t("action.signout")}
              </Button>
            )}
          </Show>
        </div>
      </div>
    </header>
  );
}
