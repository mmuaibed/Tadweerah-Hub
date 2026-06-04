import { useState } from "react";
import { useSignUp, useClerk } from "@clerk/react";
import { AppLayout } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { setSession } = useClerk();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<"credentials" | "verify">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: any) => {
    console.error(err);
    if (err.errors && err.errors.length > 0) {
      setError(err.errors[0].longMessage || err.errors[0].message);
    } else {
      setError("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
    }
    setIsLoading(false);
  };

  // 1. Create Account
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setIsLoading(true);
    setError(null);

    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      // Send verification email
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      
      setStep("verify");
      setIsLoading(false);
    } catch (err) {
      handleError(err);
    }
  };

  // 2. Verify Email
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setLocation("/dashboard");
      } else {
        setError("الكود غير صحيح أو تعذر إكمال التسجيل.");
        setIsLoading(false);
      }
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-center py-6 sm:py-12" dir="rtl">
        <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          
          <div className="p-8">
            <div className="space-y-1 text-center mb-8">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                أنشئ حساب شركة جديد
              </h1>
              <p className="text-sm text-muted-foreground whitespace-pre-line mt-2">
                أنشئ حسابك للبدء في تسجيل شركتك في تدويرة
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* CREDENTIALS STEP */}
            {step === "credentials" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-email">البريد الإلكتروني</Label>
                  <Input
                    id="su-email"
                    type="email"
                    required
                    placeholder="أدخل بريدك الإلكتروني للشركة"
                    autoComplete="email"
                    inputMode="email"
                    dir="ltr"
                    className="text-right focus-visible:ring-primary"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="su-password">كلمة المرور</Label>
                  <div className="relative">
                    <Input
                      id="su-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      dir="ltr"
                      className="text-right focus-visible:ring-primary pr-10"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    يجب أن تتكون من 8 أحرف على الأقل.
                  </p>
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading || !email || !password}>
                    {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    متابعة لإنشاء الحساب
                  </Button>
                </div>
              </form>
            )}

            {/* VERIFY STEP */}
            {step === "verify" && (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2 text-center mb-6">
                  <p className="text-sm text-foreground font-medium">
                    تم إرسال كود التحقق إلى
                  </p>
                  <p className="text-sm text-primary dir-ltr inline-block bg-muted/50 px-2 py-1 rounded border border-border">
                    {email}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="su-code">كود التحقق</Label>
                  <Input
                    id="su-code"
                    type="text"
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    className="text-center tracking-widest text-lg focus-visible:ring-primary"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setError(null); }}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" className="w-full h-10" disabled={isLoading || !code}>
                    {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    التحقق وإكمال التسجيل
                  </Button>
                </div>
                
                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setError(null); }}
                  className="mt-4 flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowRight className="h-4 w-4" />
                  تعديل البريد الإلكتروني
                </button>
              </form>
            )}

          </div>

          {/* FOOTER SIGN IN LINK */}
          {step === "credentials" && (
            <div className="bg-muted/30 px-8 py-4 border-t border-border flex justify-center items-center">
              <p className="text-sm text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <a href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-in`} className="text-primary font-medium hover:underline">
                  تسجيل الدخول
                </a>
              </p>
            </div>
          )}
          
        </div>
      </div>
    </AppLayout>
  );
}
