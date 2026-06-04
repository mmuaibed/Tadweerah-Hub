import type { ReactNode } from "react";
import { Topbar } from "@/components/topbar";

interface AppLayoutProps {
  children: ReactNode;
  showSignOut?: boolean;
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
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
    <div className="flex min-h-[100dvh] w-full flex-col bg-background text-foreground">
      <Topbar showSignOut={showSignOut} />
      <main className={`mx-auto flex w-full flex-1 flex-col ${maxWidthClass} px-4 py-3 sm:px-6 sm:py-5`}>
        {(title || actions) && (
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {title && (
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
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
