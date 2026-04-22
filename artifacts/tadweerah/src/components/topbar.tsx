import { useClerk, Show } from "@clerk/react";
import { Link } from "wouter";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/i18n";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Topbar({ showSignOut = false }: { showSignOut?: boolean }) {
  const { signOut } = useClerk();
  const { t } = useT();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center" aria-label={t("app.name")}>
          <img
            src={`${basePath}/logo.png`}
            alt="Tadweerah"
            className="h-9 w-auto"
          />
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
