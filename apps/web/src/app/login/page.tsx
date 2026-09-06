"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  Mail,
  Lock,
  User,
  Building2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  QrCode,
  KeyRound,
  Copy,
  Check,
  Download,
  ArrowLeft,
} from "lucide-react";
import QRCode from "qrcode";
import { authApi } from "@/lib/api";

type AuthStep = "credentials" | "2fa_setup" | "2fa_challenge";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Navigation / Step state
  const [step, setStep] = useState<AuthStep>("credentials");

  // Email form state
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");

  // 2FA state
  const [tempToken, setTempToken] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState(["", "", "", "", "", ""]);
  const [backupCodeInput, setBackupCodeInput] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [targetAccountEmail, setTargetAccountEmail] = useState("");

  // Common state
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Check URL parameters on mount (for Google OAuth callback or 2FA redirection)
  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");
    const provider = searchParams.get("provider");
    const setup2faParam = searchParams.get("setup2fa");
    const verify2faParam = searchParams.get("verify2fa");
    const tempTokenParam = searchParams.get("tempToken");
    const secretParam = searchParams.get("secret");
    const emailParam = searchParams.get("email");

    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      document.cookie = `brandos_session=${tokenParam}; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax; Secure`;
      const ret = searchParams.get("returnUrl") || "/dashboard";
      router.push(ret);
      return;
    }

    if (errorParam) {
      setError(`Authentication error: ${decodeURIComponent(errorParam)}`);
    }

    if (emailParam) {
      setTargetAccountEmail(decodeURIComponent(emailParam));
    }

    // Google OAuth direct callback with 2FA setup requirement
    if (setup2faParam === "1" && tempTokenParam) {
      setTempToken(tempTokenParam);
      const s = secretParam || "JBSWY3DPEHPK3PXP";
      setTotpSecret(s);
      const acc = emailParam || "Google User";
      const uri = `otpauth://totp/BrandOS%20Eye:${encodeURIComponent(
        acc
      )}?secret=${s}&issuer=BrandOS%20Eye&algorithm=SHA1&digits=6&period=30`;
      QRCode.toDataURL(uri, { width: 220, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
        .then(setQrCodeDataUrl)
        .catch(() => {});
      setStep("2fa_setup");
      return;
    }

    // Google OAuth direct callback with 2FA verification requirement
    if (verify2faParam === "1" && tempTokenParam) {
      setTempToken(tempTokenParam);
      setStep("2fa_challenge");
      return;
    }

    // Google OAuth code exchange
    if (code && provider === "google") {
      setGoogleLoading(true);
      authApi
        .googleVerify({ code })
        .then((res: any) => {
          if (res.requires2fa) {
            setTempToken(res.tempToken || "");
            setTargetAccountEmail(res.user?.email || "");
            if (res.setupRequired) {
              setTotpSecret(res.secret || "");
              setBackupCodes(res.backupCodes || []);
              if (res.qrCodeUri) {
                QRCode.toDataURL(res.qrCodeUri, { width: 220, margin: 1 })
                  .then(setQrCodeDataUrl)
                  .catch(() => {});
              }
              setStep("2fa_setup");
            } else {
              setStep("2fa_challenge");
            }
          } else {
            router.push("/dashboard");
          }
        })
        .catch((err) => {
          setError(err.message || "Failed to complete Google Sign-In.");
        })
        .finally(() => setGoogleLoading(false));
    }
  }, [searchParams, router]);

  // Focus first OTP box when entering 2FA step
  useEffect(() => {
    if (step === "2fa_setup" || (step === "2fa_challenge" && !useBackupCode)) {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    }
  }, [step, useBackupCode]);

  // 1. Handle Primary Email / Password Submit
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await authApi.login({ email, password });
      } else {
        res = await authApi.register({ email, password, name, businessName });
      }

      setTargetAccountEmail(email);

      if (res.requires2fa) {
        setTempToken(res.tempToken || "");
        if (res.setupRequired) {
          setTotpSecret(res.secret || "");
          setBackupCodes(res.backupCodes || []);
          if (res.qrCodeUri) {
            const dataUrl = await QRCode.toDataURL(res.qrCodeUri, {
              width: 220,
              margin: 1,
              color: { dark: "#0f172a", light: "#ffffff" },
            });
            setQrCodeDataUrl(dataUrl);
          }
          setStep("2fa_setup");
        } else {
          setStep("2fa_challenge");
        }
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  // 2. Handle 2FA Setup Submission
  async function handleVerify2faSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const code = totpCode.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit code from Google Authenticator.");
      return;
    }

    setLoading(true);
    try {
      await authApi.verify2faSetup({
        tempToken,
        code,
        secret: totpSecret,
      });
      setSuccessMsg("Two-Factor Authentication verified successfully! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    } catch (err: any) {
      setError(err.message || "Invalid verification code. Please check Google Authenticator.");
      setLoading(false);
    }
  }

  // 3. Handle 2FA Challenge Submission (Login)
  async function handleVerify2faLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const code = useBackupCode ? backupCodeInput.trim() : totpCode.join("");

    if (!code || (!useBackupCode && code.length < 6)) {
      setError(
        useBackupCode
          ? "Please enter your backup recovery code."
          : "Please enter the 6-digit code from Google Authenticator."
      );
      return;
    }

    setLoading(true);
    try {
      await authApi.verify2faLogin({
        tempToken,
        code,
      });
      setSuccessMsg("Verification successful! Redirecting to your dashboard...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 600);
    } catch (err: any) {
      setError(err.message || "Invalid 2FA security code. Please try again.");
      setLoading(false);
    }
  }

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    const sanitized = val.replace(/\D/g, "");
    if (!sanitized) {
      const next = [...totpCode];
      next[index] = "";
      setTotpCode(next);
      return;
    }

    // Handle full 6-digit paste
    if (sanitized.length > 1) {
      const digits = sanitized.slice(0, 6).split("");
      const next = [...totpCode];
      digits.forEach((d, idx) => {
        if (index + idx < 6) next[index + idx] = d;
      });
      setTotpCode(next);
      const focusTarget = Math.min(index + digits.length, 5);
      otpInputsRef.current[focusTarget]?.focus();
      return;
    }

    const next = [...totpCode];
    next[index] = sanitized[0];
    setTotpCode(next);

    if (index < 5 && sanitized) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !totpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const content = `BRANDOS EYE - 2FA BACKUP RECOVERY CODES\nGenerated: ${new Date().toISOString()}\nAccount: ${targetAccountEmail}\n\nKeep these codes in a safe place. Each code can be used once if you lose access to Google Authenticator:\n\n${backupCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brandos-backup-codes-${Date.now()}.txt`;
    a.click();
  };

  // 4. Handle Google Sign-In
  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      const res = await authApi.getGoogleAuthUrl("/dashboard");
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize Google Sign-In.");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 relative selection:bg-zinc-800 selection:text-white">
      <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950 font-bold text-base shadow-sm">
            B
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white flex items-center justify-center gap-2">
            BrandOS
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            {step === "2fa_setup"
              ? "Two-Factor Authentication Setup"
              : step === "2fa_challenge"
              ? "Security Verification"
              : isLogin
              ? "Sign in to access your business intelligence dashboard"
              : "Create your presence management account"}
          </p>
        </div>

        {/* Status / Error Alerts */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-950/60 border border-rose-800/60 p-4 text-xs text-rose-200 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 p-4 text-xs text-emerald-200 animate-in fade-in duration-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        {/* ========================================================
            STEP 1: PRIMARY CREDENTIALS (Email / Password / Google)
            ======================================================== */}
        {step === "credentials" && (
          <>
            {/* Google 1-Click Single Sign-On Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-zinc-850 hover:border-zinc-700 disabled:opacity-60 group"
            >
              {googleLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-zinc-400" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                  />
                </svg>
              )}
              <span>{isLogin ? "Continue with Google" : "Sign up with Google"}</span>
            </button>

            {/* Divider */}
            <div className="relative my-5 flex items-center justify-center">
              <div className="w-full border-t border-zinc-800"></div>
              <span className="absolute bg-zinc-900 px-2.5 text-[11px] font-medium text-zinc-500">
                Or with work email
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              {!isLogin && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Business or Practice Name
                    </label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Acme Growth Services"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-zinc-300">Password</label>
                  {isLogin && (
                    <span className="text-[11px] text-zinc-400 font-medium cursor-pointer hover:text-white transition">
                      Forgot password?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    minLength={8}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-200 focus:outline-none disabled:opacity-60"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-zinc-950" />
                ) : (
                  <>
                    <span>{isLogin ? "Sign In" : "Create Account"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Login / Register */}
            <div className="mt-6 text-center text-xs text-slate-400">
              {isLogin ? (
                <p>
                  Don&apos;t have an account yet?{" "}
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setError("");
                    }}
                    className="font-bold text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Create Account
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setIsLogin(true);
                      setError("");
                    }}
                    className="font-bold text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </>
        )}

        {/* ========================================================
            STEP 2: MANDATORY 2FA SETUP (QR Code + Google Authenticator)
            ======================================================== */}
        {step === "2fa_setup" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="rounded-2xl bg-blue-500/10 border border-blue-500/20 p-3.5 text-xs text-blue-300 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">Setup Authenticator App</p>
                <p className="text-[11px] text-blue-300/80 mt-0.5">
                  Open Google Authenticator (or Microsoft Authenticator / 1Password), tap the &apos;+&apos; icon, and scan the QR code below.
                </p>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
              {qrCodeDataUrl ? (
                <div className="rounded-xl bg-white p-2.5 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeDataUrl} alt="Google Authenticator QR Code" className="h-44 w-44" />
                </div>
              ) : (
                <div className="h-44 w-44 flex items-center justify-center text-slate-500 font-mono text-xs">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                </div>
              )}

              {/* Manual Secret Key Fallback */}
              <div className="mt-3 w-full max-w-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Manual Entry Key:</span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                  >
                    {copiedSecret ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedSecret ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-center font-mono text-xs text-slate-200 tracking-wider select-all">
                  {totpSecret || "JBSWY3DPEHPK3PXP"}
                </div>
              </div>
            </div>

            {/* Backup Codes Box */}
            {backupCodes.length > 0 && (
              <div className="rounded-2xl bg-slate-950 border border-slate-800/80 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <KeyRound className="h-3 w-3 text-amber-400" /> Backup Recovery Codes
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadBackupCodes}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Download .txt
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-slate-400">
                  {backupCodes.map((c, i) => (
                    <div key={i} className="rounded-lg bg-slate-900/80 px-2 py-1 border border-slate-800/60 text-center">
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6-Digit Code Form */}
            <form onSubmit={handleVerify2faSetup} className="space-y-4">
              <div>
                <label className="block text-center text-xs font-semibold text-slate-300 mb-2">
                  Enter 6-digit code from Google Authenticator
                </label>
                <div className="flex justify-center gap-2">
                  {totpCode.map((digit, idx) => (
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
                      className="h-12 w-11 rounded-xl border border-slate-700 bg-slate-950 text-center font-mono text-lg font-bold text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-600/25 transition hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-60"
              >
                {loading ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verify & Complete 2FA Setup</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setError("");
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 3: 2FA CHALLENGE VERIFICATION (Returning Login)
            ======================================================== */}
        {step === "2fa_challenge" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-xl">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <p className="text-sm font-bold text-white">Enter Authenticator Security Code</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Open Google Authenticator on your phone and enter the active 6-digit code for{" "}
                <span className="text-slate-200 font-semibold">{targetAccountEmail || "your account"}</span>.
              </p>
            </div>

            <form onSubmit={handleVerify2faLogin} className="space-y-4">
              {!useBackupCode ? (
                <div>
                  <div className="flex justify-center gap-2 mb-2">
                    {totpCode.map((digit, idx) => (
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
                        className="h-12 w-11 rounded-xl border border-slate-700 bg-slate-950 text-center font-mono text-lg font-bold text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Backup Recovery Code (e.g. BRANDOS-8492-1049)
                  </label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={backupCodeInput}
                      onChange={(e) => setBackupCodeInput(e.target.value)}
                      placeholder="BRANDOS-XXXX-XXXX"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition font-mono uppercase"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60"
              >
                {loading ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Verify & Continue to Dashboard</span>
                  </>
                )}
              </button>
            </form>

            {/* Toggle Backup Code */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setError("");
                }}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                {useBackupCode ? "Use Google Authenticator code" : "Use a backup recovery code"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setError("");
                }}
                className="text-slate-400 hover:text-white flex items-center gap-1 transition"
              >
                <ArrowLeft className="h-3 w-3" /> Back
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}