"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Terminal,
  KeyRound,
  Copy,
  Check,
  Download,
  ArrowLeft,
} from "lucide-react";
import QRCode from "qrcode";
import { authApi } from "@/lib/api";

type SuperAdminStep = "credentials" | "2fa_setup" | "2fa_challenge";

function SuperAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<SuperAdminStep>("credentials");
  const [email, setEmail] = useState("superadmin@brandoseye.com");
  const [password, setPassword] = useState("");

  // 2FA state
  const [tempToken, setTempToken] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState(["", "", "", "", "", ""]);
  const [backupCodeInput, setBackupCodeInput] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Status
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === "2fa_setup" || (step === "2fa_challenge" && !useBackupCode)) {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 150);
    }
  }, [step, useBackupCode]);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });

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
        router.push("/admin");
      }
    } catch (err: any) {
      setError(err.message || "Super Admin authentication failed. Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2faSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const code = totpCode.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      await authApi.verify2faSetup({
        tempToken,
        code,
        secret: totpSecret,
      });
      setSuccessMsg("Super Admin 2FA activated! Accessing Control Center...");
      setTimeout(() => {
        router.push("/admin");
      }, 700);
    } catch (err: any) {
      setError(err.message || "Invalid 2FA code. Please verify in Google Authenticator.");
      setLoading(false);
    }
  }

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
      setSuccessMsg("Identity verified! Loading Super Admin Control Center...");
      setTimeout(() => {
        router.push("/admin");
      }, 500);
    } catch (err: any) {
      setError(err.message || "Invalid security code. Access denied.");
      setLoading(false);
    }
  }

  const handleOtpChange = (index: number, val: string) => {
    const sanitized = val.replace(/\D/g, "");
    if (!sanitized) {
      const next = [...totpCode];
      next[index] = "";
      setTotpCode(next);
      return;
    }

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
    const content = `BRANDOS EYE - SUPER ADMIN 2FA BACKUP CODES\nAccount: ${email}\nGenerated: ${new Date().toISOString()}\n\n${backupCodes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brandos-superadmin-backup-codes.txt`;
    a.click();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Cyber Glow Accents */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-purple-600/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-[130px]" />

      <div className="relative w-full max-w-md rounded-3xl border border-purple-900/40 bg-slate-900/95 p-8 shadow-2xl backdrop-blur-2xl">
        {/* Terminal Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-600/30 border border-purple-400/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-bold uppercase tracking-wider mb-2">
            <Terminal className="h-3 w-3" /> SaaS Owner Restricted Access
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">
            Super Admin Portal
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {step === "2fa_setup"
              ? "Scan QR code with Google Authenticator"
              : step === "2fa_challenge"
              ? "Enter 6-digit Authenticator security code"
              : "Sign in with your master administrative credentials"}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-rose-950/60 border border-rose-800/60 p-3.5 text-xs text-rose-200 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-800/60 p-3.5 text-xs text-emerald-200 animate-in fade-in duration-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div className="flex-1 font-medium">{successMsg}</div>
          </div>
        )}

        {/* ========================================================
            STEP 1: SUPER ADMIN CREDENTIALS
            ======================================================== */}
        {step === "credentials" && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Super Admin Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@brandoseye.com"
                  className="w-full rounded-2xl border border-purple-900/30 bg-slate-950/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl border border-purple-900/30 bg-slate-950/80 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-600/30 transition hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-60"
            >
              {loading ? (
                <RefreshCw className="h-5 w-5 animate-spin text-white" />
              ) : (
                <>
                  <span>Authenticate & Verify 2FA</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="mt-4 pt-4 border-t border-slate-800/80 text-center">
              <span className="text-[11px] text-slate-500 font-mono">
                BrandOS Eye Global Control Plane • v0.1.0
              </span>
            </div>
          </form>
        )}

        {/* ========================================================
            STEP 2: SUPER ADMIN 2FA SETUP
            ======================================================== */}
        {step === "2fa_setup" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950 border border-purple-900/30">
              {qrCodeDataUrl ? (
                <div className="rounded-xl bg-white p-2 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeDataUrl} alt="Google Authenticator QR" className="h-40 w-40" />
                </div>
              ) : (
                <div className="h-40 w-40 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
                </div>
              )}

              <div className="mt-3 w-full">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Manual Key:</span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                  >
                    {copiedSecret ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedSecret ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-center font-mono text-xs text-slate-200">
                  {totpSecret}
                </div>
              </div>
            </div>

            {backupCodes.length > 0 && (
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <KeyRound className="h-3 w-3 text-amber-400" /> Master Backup Codes
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadBackupCodes}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Save .txt
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-[10px] text-slate-400">
                  {backupCodes.map((c, i) => (
                    <div key={i} className="rounded bg-slate-900 px-1.5 py-0.5 border border-slate-800 text-center">
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleVerify2faSetup} className="space-y-4">
              <div>
                <label className="block text-center text-xs font-semibold text-slate-300 mb-2">
                  Enter 6-digit Google Authenticator code
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
                      className="h-11 w-10 rounded-xl border border-purple-900/40 bg-slate-950 text-center font-mono text-lg font-bold text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-600/25 transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60"
              >
                {loading ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Confirm & Enable Master 2FA</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================
            STEP 3: SUPER ADMIN 2FA CHALLENGE
            ======================================================== */}
        {step === "2fa_challenge" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <form onSubmit={handleVerify2faLogin} className="space-y-4">
              {!useBackupCode ? (
                <div>
                  <label className="block text-center text-xs font-semibold text-slate-300 mb-2">
                    Enter 6-digit Google Authenticator code
                  </label>
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
                        className="h-11 w-10 rounded-xl border border-purple-900/40 bg-slate-950 text-center font-mono text-lg font-bold text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Master Backup Recovery Code
                  </label>
                  <input
                    type="text"
                    required
                    value={backupCodeInput}
                    onChange={(e) => setBackupCodeInput(e.target.value)}
                    placeholder="BRANDOS-XXXX-XXXX"
                    className="w-full rounded-2xl border border-purple-900/30 bg-slate-950/80 py-3 px-4 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition font-mono uppercase"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-600/30 transition hover:from-purple-500 hover:to-indigo-500 disabled:opacity-60"
              >
                {loading ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Verify & Enter Control Center</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setError("");
                }}
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                {useBackupCode ? "Use Authenticator code" : "Use master backup code"}
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

export default function SuperAdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <SuperAdminLoginForm />
    </Suspense>
  );
}
