import { SignIn } from "@clerk/react";
import { Topbar } from "@/components/topbar";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <div className="min-h-[100dvh] bg-background">
      <Topbar />
      <div className="flex items-center justify-center px-4 py-10 sm:py-16">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
        />
      </div>
    </div>
  );
}
