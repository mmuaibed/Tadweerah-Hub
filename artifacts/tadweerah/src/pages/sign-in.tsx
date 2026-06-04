import { SignIn } from "@clerk/react";
import { AppLayout } from "@/components/app-layout";
import { useSearch } from "wouter";

export function SignInPage() {
  const search = useSearch();
  const params = new URLSearchParams(search || "");
  const redirectUrl = params.get("redirect_url") || "/dashboard";

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-12 sm:py-24" dir="rtl">
        <SignIn 
          routing="path"
          path="/sign-in"
          fallbackRedirectUrl={redirectUrl}
          signUpUrl={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/onboarding/company`}
        />
      </div>
    </AppLayout>
  );
}
