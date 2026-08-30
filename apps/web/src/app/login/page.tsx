"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  Mail,
  Smartphone,
  Lock,
  User,
  Building2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { authApi } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auth Mode: "email" or "phone"
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");

  // Email form state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");

  // Phone form state
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneStep, setPhoneStep] = useState<"enter-phone" | "enter-otp">("enter-phone");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Common state
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Check for Google OAuth callback / state
  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const provider = searchParams.get("provider");

    if (errorParam) {
      setError(`Authentication failed: ${errorParam}`);
    }

    if (code && provider === "google") {
      setGoogleLoading(true);
      authApi
        .googleVerify({ code })
        .then(() => {
          router.push("/dashboard");
        })
        .catch((err) => {
          setError(err.message || "Failed to complete Google Sign-In.");
        })
        .finally(() => setGoogleLoading(false));
    }
  }, [searchParams, router]);

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // 1. Handle Email Login / Register
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (isLogin) {
        await authApi.login({ email, password });
      } else {
        await authApi.register({ email, password, name, businessName });
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  }

  // 2. Handle Send Phone OTP
  async function handleSendPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;
    if (phoneNumber.replace(/\D/g, "").length < 6) {
      setError("Please enter a valid mobile phone number.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.sendPhoneOtp(fullPhone);
      setPhoneStep("enter-otp");
      setSuccessMsg(`Verification code sent to ${fullPhone}`);
      setResendCooldown(60);
      if (res.devOtp) {
        setDevOtpCode(res.devOtp);
      }
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // 3. Handle Verify Phone OTP
  async function handleVerifyPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const code = otpCode.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;
    setLoading(true);

    try {
      await authApi.verifyPhoneOtp({
        phone: fullPhone,
        code,
        name: name || undefined,
        businessName: businessName || undefined,
      });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  }

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    const sanitized = val.replace(/\D/g, "");
    if (!sanitized) {
      const next = [...otpCode];
      next[index] = "";
      setOtpCode(next);
      return;
    }

    // Handle paste of whole code
    if (sanitized.length > 1) {
      const digits = sanitized.slice(0, 6).split("");
      const next = [...otpCode];
      digits.forEach((d, idx) => {
        if (index + idx < 6) next[index + idx] = d;
      });
      setOtpCode(next);
      const focusTarget = Math.min(index + digits.length, 5);
      otpInputsRef.current[focusTarget]?.focus();
      return;
    }

    const next = [...otpCode];
    next[index] = sanitized[0];
    setOtpCode(next);

    if (index < 5 && sanitized) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // 4. Handle Google Sign-In
  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      const res = await authApi.getGoogleAuthUrl("/dashboard");
      if (res.url) {
        window.location.href = res.url;
      } else {
        // Fallback simulated sign-in for dev preview
        await authApi.googleVerify({ idToken: "dev_mock_google_token" });
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize Google Sign-In.");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/15 blur-[120px]" />

      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800/90 bg-slate-900/95 p-8 shadow-2xl backdrop-blur-2xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-xl shadow-blue-500/25 border border-blue-400/30">
            <Eye className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            BrandOS <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">EYE</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {authMethod === "phone"
              ? "Sign in or register with your mobile phone number"
              : isLogin
              ? "Welcome back. Sign in to your growth dashboard"
              : "Create your account and begin tracking your presence"}
          </p>
        </div>

        {/* Status / Error Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-950/60 border border-rose-800/60 p-4 text-xs text-rose-200 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 p-4 text-xs text-emerald-200 animate-in fade-in duration-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* 1. Google 1-Click Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-800/90 py-3.5 px-4 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-750 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60 group"
        >
          {googleLoading ? (
            <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
          ) : (
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span>Continue with Google Account</span>
        </button>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-slate-900 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            or continue with
          </span>
        </div>

        {/* Auth Method Tabs */}
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-950/80 p-1.5 border border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              setAuthMethod("email");
              setError("");
              setSuccessMsg("");
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
              authMethod === "email"
                ? "bg-slate-800 text-white shadow-md border border-slate-700/60"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mail className="h-4 w-4" />
            <span>Email Address</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMethod("phone");
              setError("");
              setSuccessMsg("");
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
              authMethod === "phone"
                ? "bg-slate-800 text-white shadow-md border border-slate-700/60"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Mobile Phone (SMS)</span>
          </button>
        </div>

        {/* 2. Email Auth Form */}
        {authMethod === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Dr. Marcus Vance"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Business / Clinic Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Nobel Dental Clinic"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="admin@yourbusiness.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? "Sign In to Dashboard" : "Create Free Account"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                {isLogin ? (
                  <>
                    Don&apos;t have an account? <span className="font-semibold text-blue-400 underline">Register</span>
                  </>
                ) : (
                  <>
                    Already have an account? <span className="font-semibold text-blue-400 underline">Sign In</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* 3. Phone Number Auth Form */}
        {authMethod === "phone" && (
          <div>
            {phoneStep === "enter-phone" ? (
              <form onSubmit={handleSendPhoneOtp} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Mobile Phone Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="rounded-xl border border-slate-700/80 bg-slate-800/90 px-3 py-3 text-xs font-semibold text-white outline-none focus:border-blue-500"
                    >
                      <option value="+1">🇺🇸 +1 (US)</option>
                      <option value="+44">🇬🇧 +44 (UK)</option>
                      <option value="+49">🇩🇪 +49 (DE)</option>
                      <option value="+33">🇫🇷 +33 (FR)</option>
                      <option value="+39">🇮🇹 +39 (IT)</option>
                      <option value="+355">🇦🇱 +355 (AL)</option>
                      <option value="+383">🇽🇰 +383 (XK)</option>
                      <option value="+41">🇨🇭 +41 (CH)</option>
                      <option value="+61">🇦🇺 +61 (AU)</option>
                    </select>

                    <div className="relative flex-1">
                      <Smartphone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="(555) 019-2834"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full rounded-xl border border-slate-700/80 bg-slate-800/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    We will send a 6-digit verification code via SMS to this number.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* OTP Verification Step */
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-5 animate-in fade-in duration-200">
                <div className="text-center">
                  <span className="text-xs text-slate-400">Enter the 6-digit code sent to:</span>
                  <div className="font-bold text-white text-sm mt-0.5">
                    {countryCode} {phoneNumber}
                  </div>
                </div>

                {/* Sandbox Helper if devOtp available */}
                {devOtpCode && (
                  <div
                    onClick={() => {
                      const digits = devOtpCode.split("");
                      setOtpCode(digits);
                    }}
                    className="cursor-pointer mx-auto flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-500/20 transition"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                    <span>Dev Sandbox Code: <strong className="font-mono">{devOtpCode}</strong> (Click to fill)</span>
                  </div>
                )}

                {/* 6 Digit Input Boxes */}
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otpCode.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputsRef.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border border-slate-700/80 bg-slate-850 text-center text-xl font-bold text-white shadow-inner outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <span>Verify & Enter Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneStep("enter-phone");
                      setOtpCode(["", "", "", "", "", ""]);
                    }}
                    className="text-slate-400 hover:text-white transition"
                  >
                    ← Change phone number
                  </button>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleSendPhoneOtp}
                    className="text-blue-400 hover:underline disabled:text-slate-500 disabled:no-underline"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Security & Compliance Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 mb-3">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>256-bit TLS Encryption • Multi-Factor Session Security</span>
          </div>

          <div className="flex justify-center gap-4 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-slate-300 transition">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-slate-300 transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}