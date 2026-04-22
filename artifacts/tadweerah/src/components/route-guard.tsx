import React from "react";
import { useGetMe } from "@workspace/api-client-react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  requireCompany: boolean;
  children: React.ReactNode;
}

export function RouteGuard({ requireCompany, children }: RouteGuardProps) {
  const { data: me, isLoading } = useGetMe();

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireCompany && (!me || !me.company)) {
    return <Redirect to="/onboarding/company" />;
  }

  if (!requireCompany && me?.company) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}
