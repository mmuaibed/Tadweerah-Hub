import React from "react";
import { useGetMe } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  requireCompany: boolean;
  children: React.ReactNode;
}

function getAdminAllowlist(): string[] {
  const raw = (import.meta.env.VITE_TADWEERAH_ADMIN_EMAILS as string | undefined) ?? "";
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function RouteGuard({ requireCompany, children }: RouteGuardProps) {
  const { data: me, isLoading, isError } = useGetMe();
  const { user } = useUser();

  const adminAllowlist = getAdminAllowlist();
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  const isAdmin = adminAllowlist.length > 0 && adminAllowlist.includes(userEmail);

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
    // Admin users have no company — send them to their dashboard instead of onboarding
    if (isAdmin) return <Redirect to="/admin" />;
    return <Redirect to="/onboarding/company" />;
  }

  if (!requireCompany && me?.company) {
    return <Redirect to="/dashboard" />;
  }

  // Admin users with no company should never land on the onboarding flow
  if (!requireCompany && !me?.company && isAdmin) {
    return <Redirect to="/admin" />;
  }

  return <>{children}</>;
}
