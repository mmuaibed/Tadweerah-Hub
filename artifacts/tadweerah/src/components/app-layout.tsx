import type { ReactNode } from "react";
import { Topbar } from "@/components/topbar";

interface AppLayoutProps {
  children: ReactNode;
  /** Show the Sign Out button in the header (signed-in pages only). */
  showSignOut?: boolean;
  /** Optional page title shown above the content. */
  title?: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Right-aligned actions area beside the title (e.g. primary action button). */
  actions?: ReactNode;
  /** Constrains content width. Defaults to "wide" (max-w-6xl). */
  width?: "narrow" | "wide";
}

export function AppLayout({
  children,
  showSignOut = false,
  title,
  subtitle,
  actions,
  width = "wide",
}: AppLayoutProps) {
  const maxWidthClass = width === "narrow" ? "max-w-2xl" : "max-w-6xl";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Topbar showSignOut={showSignOut} />
      <main className={`mx-auto w-full ${maxWidthClass} px-4 py-8 sm:px-6 sm:py-12`}>
        {(title || actions) && (
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {title && (
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-2 text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
