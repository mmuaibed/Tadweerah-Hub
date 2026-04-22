import { SignIn } from "@clerk/react";
import { AppLayout } from "@/components/app-layout";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <AppLayout>
      <div className="flex items-center justify-center py-6 sm:py-12">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
        />
      </div>
    </AppLayout>
  );
}
