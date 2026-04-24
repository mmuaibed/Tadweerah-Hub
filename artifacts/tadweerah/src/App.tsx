import { useEffect, useRef } from "react";
import { Switch, Route, Redirect, useLocation, Router as WouterRouter } from "wouter";
import { ClerkProvider, Show, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider, useT } from "@/i18n";
import { RouteGuard } from "@/components/route-guard";
import { RoleRoute } from "@/components/role-route";
import { HomePage } from "@/pages/home";
import { SignInPage } from "@/pages/sign-in";
import { SignUpPage } from "@/pages/sign-up";
import { OnboardingPage } from "@/pages/onboarding";
import { DashboardPage } from "@/pages/dashboard";
import { ListingNewPage } from "@/pages/listing-new";
import { MyListingsPage } from "@/pages/my-listings";
import { MarketplacePage } from "@/pages/marketplace";
import { ListingDetailPage } from "@/pages/listing-detail";
import { ParticipationsPage } from "@/pages/participations";
import { TermsPage } from "@/pages/terms";
import { ReportsPage } from "@/pages/reports";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

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
  return (
    <>
      <Show when="signed-in">
        <RouteGuard requireCompany={false}>
          <OnboardingPage />
        </RouteGuard>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function DashboardRoute() {
  return (
    <>
      <Show when="signed-in">
        <RouteGuard requireCompany={true}>
          <DashboardPage />
        </RouteGuard>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function SignedInRoleRoute({
  allow,
  children,
}: {
  allow: ReadonlyArray<"producer" | "buyer" | "carrier">;
  children: React.ReactNode;
}) {
  return (
    <>
      <Show when="signed-in">
        <RoleRoute allow={allow}>{children}</RoleRoute>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ListingNewRoute() {
  return (
    <SignedInRoleRoute allow={["producer"]}>
      <ListingNewPage />
    </SignedInRoleRoute>
  );
}

function MyListingsRoute() {
  return (
    <SignedInRoleRoute allow={["producer"]}>
      <MyListingsPage />
    </SignedInRoleRoute>
  );
}

function MarketplaceRoute() {
  return (
    <SignedInRoleRoute allow={["buyer"]}>
      <MarketplacePage />
    </SignedInRoleRoute>
  );
}

function ListingDetailRoute() {
  return (
    <SignedInRoleRoute allow={["producer", "buyer", "carrier"]}>
      <ListingDetailPage />
    </SignedInRoleRoute>
  );
}

function ParticipationsRoute() {
  return (
    <SignedInRoleRoute allow={["buyer"]}>
      <ParticipationsPage />
    </SignedInRoleRoute>
  );
}

function ReportsRoute() {
  return (
    <SignedInRoleRoute allow={["producer", "buyer", "carrier"]}>
      <ReportsPage />
    </SignedInRoleRoute>
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

function buildAppearance(lang: "ar" | "en") {
  const fontFamily = `'Tajawal', system-ui, sans-serif`;

  return {
    theme: shadcn,
    cssLayerName: "clerk",
    options: {
      logoPlacement: "inside" as const,
      logoLinkUrl: basePath || "/",
      logoImageUrl: `${window.location.origin}${basePath}/logo.png`,
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
      headerSubtitle: "text-muted-foreground",
      formFieldLabel: "text-foreground",
      footerActionLink: "text-primary font-medium",
      footerActionText: "text-muted-foreground",
      dividerText: "text-muted-foreground",
      identityPreviewEditButton: "text-primary",
      formFieldSuccessText: "text-primary",
      alertText: "text-destructive",
      logoBox: "justify-center",
      logoImage: "h-10 w-auto",
      socialButtonsBlockButton:
        "border border-border bg-background hover:bg-muted",
      formButtonPrimary:
        "bg-primary text-primary-foreground hover:bg-primary/90",
      formFieldInput:
        "bg-input border border-border text-foreground rounded-md",
      footerAction: "text-sm",
      dividerLine: "bg-border",
      alert: "border border-destructive/40 bg-destructive/10",
      otpCodeFieldInput:
        "bg-input border border-border text-foreground rounded-md",
      formFieldRow: "gap-2",
      main: "gap-4",
    },
  } as const;
}

const localizationByLang = {
  ar: {
    signIn: {
      start: { title: "أهلاً بعودتك", subtitle: "سجّل دخولك للمتابعة إلى تدويرة" },
    },
    signUp: {
      start: { title: "أنشئ حسابك", subtitle: "ابدأ رحلتك مع تدويرة اليوم" },
    },
  },
  en: {
    signIn: {
      start: { title: "Welcome back", subtitle: "Sign in to continue to Tadweerah" },
    },
    signUp: {
      start: { title: "Create your account", subtitle: "Get started with Tadweerah today" },
    },
  },
} as const;

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { lang } = useT();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={buildAppearance(lang)}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={localizationByLang[lang]}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/onboarding/company" component={OnboardingRoute} />
            <Route path="/dashboard" component={DashboardRoute} />
            <Route path="/listings/new" component={ListingNewRoute} />
            <Route path="/listings/mine" component={MyListingsRoute} />
            <Route path="/listings/:waste_listing_id" component={ListingDetailRoute} />
            <Route path="/marketplace" component={MarketplaceRoute} />
            <Route path="/participations" component={ParticipationsRoute} />
            <Route path="/reports" component={ReportsRoute} />
            <Route path="/terms" component={TermsPage} />
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
