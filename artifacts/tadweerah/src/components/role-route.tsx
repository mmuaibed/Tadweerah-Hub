import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useGetMe } from "@workspace/api-client-react";
import type { CompanyType } from "@workspace/api-client-react";
import { AppLayout } from "@/components/app-layout";

interface RoleRouteProps {
  /** Allowed company types. Users not in this set are sent to /dashboard. */
  allow: ReadonlyArray<CompanyType>;
  children: ReactNode;
}

/**
 * Frontend role gate. Mirrors the API-side requireCompany middleware so users
 * never land on a page their role can't use.
 *
 * Must be rendered INSIDE a Show when="signed-in" guard.
 */
export function RoleRoute({ allow, children }: RoleRouteProps) {
  const { data: me, isLoading } = useGetMe();

  if (isLoading) {
    return (
      <AppLayout showSignOut>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!me?.company) {
    return <Redirect to="/onboarding/company" />;
  }

  if (!allow.includes(me.company.type)) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}
