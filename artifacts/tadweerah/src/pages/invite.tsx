import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser, useClerk } from "@clerk/react";
import { Loader2, Mail, CheckCircle2, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";

interface InvitationDetails {
  id: string;
  email: string;
  status: string;
  companyName: string;
}

export function InvitePage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  // Fetch invitation details
  const { data, isLoading, isError, error } = useQuery<InvitationDetails>({
    queryKey: ["invitation", id],
    queryFn: async () => {
      const res = await fetch(`/api/invitations/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("NOT_FOUND");
        }
        throw new Error("FETCH_FAILED");
      }
      return res.json();
    },
    retry: false,
    enabled: !!id,
  });

  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  const inviteEmail = data?.email?.toLowerCase() ?? "";

  // If signed in, check email match
  useEffect(() => {
    if (user && data) {
      if (userEmail === inviteEmail) {
        // Clear the stale "me" query cache
        queryClient.removeQueries({ queryKey: ["me"] });
        // Redirect to dashboard where RouteGuard will force a fresh fetch
        setLocation("/dashboard");
      }
    }
  }, [user, data, userEmail, inviteEmail, queryClient, setLocation]);

  if (isLoading || !isUserLoaded) {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isError || !data) {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold mb-2">Invitation Unavailable</h1>
          <p className="text-muted-foreground max-w-sm mb-6">
            This invitation link is invalid, expired, or has already been accepted.
          </p>
          <Link to="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }



  if (user) {
    if (userEmail === inviteEmail) {
      // Wait for useEffect to redirect
      return (
        <AppLayout>
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </AppLayout>
      );
    } else {
      // Mismatch
      return (
        <AppLayout>
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold mb-2">Wrong Account</h1>
            <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
              You are signed in as <strong className="text-foreground">{userEmail}</strong>, but this invitation is for <strong className="text-foreground">{inviteEmail}</strong>.
            </p>
            <div className="flex gap-4">
              <Button onClick={() => signOut()}>Sign Out</Button>
              <Link to="/dashboard">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        </AppLayout>
      );
    }
  }

  // Not signed in
  return (
    <AppLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm text-center flex flex-col items-center" dir="rtl">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-6">
            <Mail className="h-8 w-8" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            دعوة انضمام
          </h1>
          
          <p className="text-muted-foreground leading-relaxed mb-8 text-lg">
            تمت دعوتك للانضمام إلى <strong className="text-foreground">{data.companyName}</strong> على منصة تدويرة كعضو فريق.
          </p>

          <div className="w-full space-y-3">
            <Link to={`/sign-up?redirect_url=${encodeURIComponent(`/invite/${id}`)}`}>
              <Button className="w-full font-bold h-11" size="lg">
                إنشاء حساب لقبول الدعوة
              </Button>
            </Link>
            <Link to={`/sign-in?redirect_url=${encodeURIComponent(`/invite/${id}`)}`}>
              <Button variant="outline" className="w-full h-11" size="lg">
                تسجيل الدخول لقبول الدعوة
              </Button>
            </Link>
          </div>
          
          <p className="text-xs text-muted-foreground mt-8">
            أُرسلت الدعوة إلى {data.email}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
