import { SignIn } from "@clerk/react";
import { AppLayout } from "@/components/app-layout";

export function SignInPage() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-12 sm:py-24" dir="rtl">
        <SignIn 
          routing="path"
          path="/sign-in"
          fallbackRedirectUrl="/dashboard"
          signUpUrl={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/onboarding/company`}
        />
      </div>
    </AppLayout>
  );
}
