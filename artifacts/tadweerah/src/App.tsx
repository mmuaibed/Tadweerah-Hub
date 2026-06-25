import { useEffect, useRef } from "react";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { ClerkProvider, Show, useClerk, useAuth, useUser } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { arSA, enUS } from "@clerk/localizations";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider, useT } from "@/i18n";
import { RouteGuard } from "@/components/route-guard";
import { HomePage } from "@/pages/home";
import { SignInPage } from "@/pages/sign-in";
import { SignUpPage } from "@/pages/sign-up";
import { OnboardingPage } from "@/pages/onboarding";
import { DashboardPage } from "@/pages/dashboard";
import { InvitePage } from "@/pages/invite";
import { ListingNewPage } from "@/pages/listing-new";
import { MyListingsPage } from "@/pages/my-listings";
import { MarketplacePage } from "@/pages/marketplace";
import { ListingDetailPage } from "@/pages/listing-detail";
import { ParticipationsPage } from "@/pages/participations";
import { TermsPage } from "@/pages/terms";
import { ReportsPage } from "@/pages/reports";
import { CompanyCapabilitiesPage } from "@/pages/company-capabilities";
import { MembersPage } from "@/pages/members";
import { CompanyProfilePage } from "@/pages/company-profile";
import { ContractsPage } from "@/pages/contracts";
import { ContractNewPage } from "@/pages/contract-new";
import { ContractDetailPage } from "@/pages/contract-detail";
import { TransportRequestsPage } from "@/pages/transport-requests";
import { PendingActionsPage } from "@/pages/pending-actions";
import { AdminPage } from "@/pages/admin";
import { SustainabilityAllocationsPage } from "@/pages/sustainability-allocations";
import { SustainabilityAllocationDetailPage } from "@/pages/sustainability-allocation-detail";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <HomePage />
      </Show>
    </>
  );
}

function OnboardingRoute() {
  // OnboardingPage handles both signed-in and signed-out states internally,
  // including the redirect-to-dashboard logic for users who already have a company.
  return <OnboardingPage />;
}

function CompanyRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <RouteGuard requireCompany={true}>{children}</RouteGuard>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AuthTokenSync() {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
    return () => {
      setAuthTokenGetter(null);
    };
  }, [isSignedIn, getToken]);

  return null;
}

function buildAppearance(lang: "ar" | "en") {
  const fontFamily = `'Tajawal', system-ui, sans-serif`;

  return {
    theme: shadcn,
    cssLayerName: "clerk",
    layout: {
      logoPlacement: "none",
      direction: lang === "ar" ? "rtl" : "ltr",
    },
    variables: {
      colorPrimary: "hsl(223, 67%, 50%)",
      colorForeground: "hsl(223, 35%, 15%)",
      colorMutedForeground: "hsl(220, 12%, 42%)",
      colorDanger: "hsl(0, 75%, 50%)",
      colorBackground: "hsl(0, 0%, 100%)",
      colorInput: "hsl(0, 0%, 100%)",
      colorInputForeground: "hsl(223, 35%, 15%)",
      colorNeutral: "hsl(220, 16%, 90%)",
      colorModalBackdrop: "rgba(15, 23, 42, 0.55)",
      fontFamily,
      borderRadius: "0.5rem",
    },
    elements: {
      rootBox: "w-full",
      cardBox:
        "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-border",
      card: "!shadow-none !border-0 !bg-transparent !rounded-none",
      footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
      headerTitle: "text-foreground",
      headerSubtitle: "text-muted-foreground whitespace-pre-line",
      formFieldLabel: "text-foreground font-medium",
      footerActionLink: "text-primary font-medium",
      footerActionText: "text-muted-foreground",
      logoBox: "hidden",
      logoImage: "hidden",
      dividerText: "text-muted-foreground",
      identityPreviewEditButton: "text-primary",
      formFieldSuccessText: "text-primary",
      alertText: "text-destructive",
      socialButtonsBlockButton:
        "border border-border bg-background hover:bg-muted",
      formButtonPrimary:
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full",
      formFieldInput:
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      footerAction: "text-sm",
      dividerLine: "bg-border",
      alert: "border border-destructive/40 bg-destructive/10 text-destructive",
      otpCodeFieldInput:
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-center",
      formFieldRow: "gap-2",
      main: "gap-4",
    },
  } as const;
}

const localizationByLang = {
  ar: {
    ...arSA,
    signIn: {
      ...arSA.signIn,
      start: { 
        ...arSA.signIn?.start, 
        title: "أهلاً بعودتك", 
        subtitle: "سجّل دخولك للمتابعة إلى منصة تدويرة\nيمكنك الدخول بكلمة المرور أو بكود تحقق يُرسل إلى بريدك الإلكتروني.",
        actionText: "ليس لديك حساب في تدويرة؟",
        actionLink: "أنشئ حساب شركة جديد",
      },
    },
    formFieldInputPlaceholder__emailAddress: "أدخل بريدك الإلكتروني",
    formFieldLabel__emailAddress: "البريد الإلكتروني",
    formButtonPrimary: "متابعة تسجيل الدخول",
    signUp: {
      ...arSA.signUp,
      start: { ...arSA.signUp?.start, title: "أنشئ حسابك", subtitle: "ابدأ رحلتك مع تدويرة اليوم" },
    },
  },
  en: {
    ...enUS,
    signIn: {
      ...enUS.signIn,
      start: { ...enUS.signIn?.start, title: "Welcome back", subtitle: "Sign in to continue to Tadweerah" },
    },
    signUp: {
      ...enUS.signUp,
      start: { ...enUS.signUp?.start, title: "Create your account", subtitle: "Get started with Tadweerah today" },
    },
  },
} as const;

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { lang } = useT();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={buildAppearance(lang)}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={localizationByLang[lang]}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AuthTokenSync />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/invite/:id" component={InvitePage} />
            <Route path="/onboarding/company" component={OnboardingRoute} />
            <Route path="/terms" component={TermsPage} />
            <Route path="/dashboard">
              <CompanyRoute><DashboardPage /></CompanyRoute>
            </Route>
            <Route path="/listings/new">
              <CompanyRoute><ListingNewPage /></CompanyRoute>
            </Route>
            <Route path="/listings/mine">
              <CompanyRoute><MyListingsPage /></CompanyRoute>
            </Route>
            <Route path="/listings/:waste_listing_id">
              <CompanyRoute><ListingDetailPage /></CompanyRoute>
            </Route>
            <Route path="/marketplace">
              <CompanyRoute><MarketplacePage /></CompanyRoute>
            </Route>
            <Route path="/participations">
              <CompanyRoute><ParticipationsPage /></CompanyRoute>
            </Route>
            <Route path="/reports">
              <CompanyRoute><ReportsPage /></CompanyRoute>
            </Route>
            <Route path="/sustainability/allocations">
              <CompanyRoute><SustainabilityAllocationsPage /></CompanyRoute>
            </Route>
            <Route path="/sustainability/allocations/:id">
              <CompanyRoute><SustainabilityAllocationDetailPage /></CompanyRoute>
            </Route>
            <Route path="/company/capabilities">
              <CompanyRoute><CompanyCapabilitiesPage /></CompanyRoute>
            </Route>
            <Route path="/company/members">
              <CompanyRoute><MembersPage /></CompanyRoute>
            </Route>
            <Route path="/company/profile">
              <CompanyRoute><CompanyProfilePage /></CompanyRoute>
            </Route>
            <Route path="/contracts/new">
              <CompanyRoute><ContractNewPage /></CompanyRoute>
            </Route>
            <Route path="/contracts/:id">
              <CompanyRoute><ContractDetailPage /></CompanyRoute>
            </Route>
            <Route path="/contracts">
              <CompanyRoute><ContractsPage /></CompanyRoute>
            </Route>
            <Route path="/transport-requests">
              <CompanyRoute><TransportRequestsPage /></CompanyRoute>
            </Route>
            <Route path="/pending-actions">
              <CompanyRoute><PendingActionsPage /></CompanyRoute>
            </Route>
            <Route path="/admin">
              <AdminPage />
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <I18nProvider defaultLang="ar">
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </I18nProvider>
  );
}

export default App;
