import { SignUp } from "@clerk/react";
import { AppLayout } from "@/components/app-layout";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar. More information can be found in the Replit docs.
  return (
    <AppLayout>
      <div className="flex items-center justify-center py-6 sm:py-12">
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
        />
      </div>
    </AppLayout>
  );
}
