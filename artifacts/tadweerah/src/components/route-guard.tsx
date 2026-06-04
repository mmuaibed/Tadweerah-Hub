import React from "react";
import { useGetMe } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Redirect, Link } from "wouter";
import { Loader2, ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";

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
    // Admin users have no company — show them a friendly context message instead of forcing onboarding
    if (isAdmin) {
      return (
        <AppLayout showSignOut title="Admin Inspection">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center min-h-[50vh]">
            <ShieldAlert className="h-12 w-12 text-primary/50 mb-4" />
            <h2 className="text-xl font-bold mb-2">Company Context Required</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              As an admin, you bypass forced onboarding. However, this specific page requires a linked company profile to function correctly. You can create a test company if you need to test this flow.
            </p>
            <div className="flex gap-3">
              <Link to="/admin">
                <Button variant="outline">Go to Admin Panel</Button>
              </Link>
              <Link to="/onboarding/company">
                <Button>Create Test Company</Button>
              </Link>
            </div>
          </div>
        </AppLayout>
      );
    }
    return <Redirect to="/onboarding/company" />;
  }

  if (!requireCompany && me?.company) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}
