import React from "react";
import { useGetMe } from "@workspace/api-client-react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  requireCompany: boolean;
  children: React.ReactNode;
}

export function RouteGuard({ requireCompany, children }: RouteGuardProps) {
  const { data: me, isLoading, isError } = useGetMe();

  // Show spinner while loading OR on API error (don't make routing decisions on stale/failed data)
  if (isLoading || isError) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Safeguard: if user has a company, NEVER redirect to onboarding
  if (requireCompany && me?.company) {
    return <>{children}</>;
  }

  if (requireCompany && !me?.company) {
    return <Redirect to="/onboarding/company" />;
  }

  if (!requireCompany && me?.company) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}
