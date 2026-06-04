import { SignUp } from "@clerk/react";
import { AppLayout } from "@/components/app-layout";
import { useSearch } from "wouter";

export function SignUpPage() {
  const search = useSearch();
  const params = new URLSearchParams(search || "");
  const redirectUrl = params.get("redirect_url") || "/dashboard";

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center py-12 sm:py-24" dir="rtl">
        <SignUp 
          routing="path"
          path="/sign-up"
          fallbackRedirectUrl={redirectUrl}
          signInUrl={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-in`}
        />
      </div>
    </AppLayout>
  );
}
