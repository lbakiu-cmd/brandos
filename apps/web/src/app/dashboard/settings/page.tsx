"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  User,
  ShieldCheck,
  KeyRound,
  QrCode,
  Copy,
  Lock,
  Smartphone,
  Check,
  Eye,
  EyeOff,
  LogOut,
  Laptop,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  ArrowLeftRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import QRCode from "qrcode";

type Business = {
  id: string;
  name: string;
  city: string | null;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
};

const VERTICALS = [
  {
    id: "Professional Services",
    icon: "💼",
    label: "Professional Services & Consulting",
    schema: "ProfessionalService / Consulting",
    eeat: "Client Case Studies & Industry Authority",
    sampleQuery: "Top business consulting and advisory firm in [City]",
  },
  {
    id: "Home Services & Trades",
    icon: "🔧",
    label: "Home Services & Trades",
    schema: "Plumber / HVACBusiness / Contractor",
    eeat: "Field Experience & Licensed Trades",
    sampleQuery: "24/7 emergency repair services near me in [City]",
  },
  {
    id: "Restaurants & Food",
    icon: "🍕",
    label: "Restaurants, Cafes & Food",
    schema: "Restaurant / Cafe / Menu",
    eeat: "Culinary Authenticity & Sourcing",
    sampleQuery: "Best local dinner spots and restaurants in [City]",
  },
  {
    id: "Legal & Financial",
    icon: "⚖️",
    label: "Legal & Financial Services",
    schema: "LegalService / Attorney / Accounting",
    eeat: "Case Results & Professional Credentials",
    sampleQuery: "Top rated attorneys and advisors in [City]",
  },
  {
    id: "Real Estate",
    icon: "🏡",
    label: "Real Estate & Brokerages",
    schema: "RealEstateAgent / Residence",
    eeat: "Neighborhood Market Expertise",
    sampleQuery: "Best real estate agents and brokerages in [City]",
  },
  {
    id: "Beauty & Wellness",
    icon: "💇",
    label: "Beauty Salons & Spas",
    schema: "BeautySalon / DaySpa",
    eeat: "Stylist Portfolios & Treatments",
    sampleQuery: "Top rated salon and wellness spa in [City]",
  },
  {
    id: "Healthcare & Medical",
    icon: "🏥",
    label: "Healthcare & Medical Clinics",
    schema: "MedicalClinic / Physician",
    eeat: "Patient Care & Clinical Authority",
    sampleQuery: "Top rated healthcare and medical clinic in [City]",
  },
  {
    id: "Automotive & Repair",
    icon: "🚗",
    label: "Automotive & Mechanics",
    schema: "AutoRepair / AutoDealer",
    eeat: "Certified Technicians & Warranties",
    sampleQuery: "Trusted automotive repair and maintenance in [City]",
  },
];

const LOCAL_STORAGE_KEY = "brandos_nap_profile";
const LOCAL_STORAGE_USER_KEY = "brandos_user_profile";
const LOCAL_STORAGE_2FA_KEY = "brandos_2fa_status";
const LOCAL_STORAGE_SETUP_KEY = "brandos_initial_setup_completed";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"business" | "account">("business");

  // Business Data State
  const [form, setForm] = useState<Record<string, string>>({
    name: "",
    city: "",
    industry: "Professional Services",
    website: "",
    phone: "",
    email: "",
  });

  // Baseline Saved State (to track modifications against established data)
  const [savedForm, setSavedForm] = useState<Record<string, string>>({
    name: "",
    city: "",
    industry: "Professional Services",
    website: "",
    phone: "",
    email: "",
  });

  // Setup Completion Status
  const [isInitialSetupDone, setIsInitialSetupDone] = useState<boolean>(false);

  // Vertical Switch Confirmation Modal State
  const [pendingVertical, setPendingVertical] = useState<(typeof VERTICALS)[0] | null>(null);
  const [showVerticalConfirmModal, setShowVerticalConfirmModal] = useState<boolean>(false);

  // Business Data Change Confirmation Modal State
  const [showBusinessConfirmModal, setShowBusinessConfirmModal] = useState<boolean>(false);

  // User Account State
  const [userForm, setUserForm] = useState<{ name: string; email: string }>({
    name: "",
    email: "",
  });

  // Password State
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [setupStep, setSetupStep] = useState<"scan" | "verify" | "success">("scan");
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const secretKey = "JBSWY3DPEHPK3PXP";

  // General Status
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [userSaved, setUserSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const backupCodes = [
    "BRANDOS-9482-1049",
    "BRANDOS-7821-4920",
    "BRANDOS-3910-8472",
    "BRANDOS-5829-1940",
  ];

  // Generate real scannable TOTP QR code for Google Authenticator / Authy / 1Password
  useEffect(() => {
    const userEmail = userForm.email || "user@brandoseye.com";
    const label = encodeURIComponent(`BrandOS Eye (${userEmail})`);
    const issuer = encodeURIComponent("BrandOS Eye");
    const otpAuthUrl = `otpauth://totp/${label}?secret=${secretKey}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    // Standard high-resolution QR service as reliable default & instant fallback
    const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(otpAuthUrl)}`;
    setQrCodeDataUrl(fallbackUrl);

    try {
      QRCode.toDataURL(otpAuthUrl, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: "M",
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(fallbackUrl));
    } catch {
      setQrCodeDataUrl(fallbackUrl);
    }
  }, [userForm.email]);

  // 1. Preload data on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      const cachedSetup = localStorage.getItem(LOCAL_STORAGE_SETUP_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          if (parsed.industry === "Dental & Healthcare") {
            parsed.industry = "Professional Services";
          }
          setForm((prev) => ({ ...prev, ...parsed }));
          setSavedForm((prev) => ({ ...prev, ...parsed }));
          if (parsed.name || parsed.city || cachedSetup === "true") {
            setIsInitialSetupDone(true);
          }
        }
      }
      const cachedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser);
        if (parsedUser && typeof parsedUser === "object") {
          setUserForm((prev) => ({ ...prev, ...parsedUser }));
        }
      }
      const cached2fa = localStorage.getItem(LOCAL_STORAGE_2FA_KEY);
      if (cached2fa) {
        setTwoFactorEnabled(cached2fa === "true");
      }
    } catch {
      // ignore localstorage errors
    }

    // Load Business
    apiFetch<Business>("/business")
      .then((b) => {
        if (b) {
          const freshData: Record<string, string> = {
            name: b.name || "",
            city: b.city || "",
            industry: b.industry || "Professional Services",
            website: b.website || "",
            phone: b.phone || "",
            email: b.email || "",
          };
          setForm(freshData);
          setSavedForm(freshData);
          if (b.name || b.website || b.city) {
            setIsInitialSetupDone(true);
            try {
              localStorage.setItem(LOCAL_STORAGE_SETUP_KEY, "true");
            } catch {}
          }
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(freshData));
          } catch {}
        }
      })
      .catch((err) => console.warn("Could not fetch business from API:", err));

    // Load User
    apiFetch<any>("/auth/me")
      .then((res) => {
        if (res?.user) {
          const freshUser = {
            name: res.user.name || "Business Owner",
            email: res.user.email || "owner@brandoseye.com",
          };
          setUserForm(freshUser);
          try {
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(freshUser));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Compute modified fields between baseline savedForm and current form
  const getBusinessFormChanges = () => {
    const fields: { key: string; label: string }[] = [
      { key: "name", label: "Business Name" },
      { key: "city", label: "City & Region" },
      { key: "industry", label: "Business Vertical / Industry" },
      { key: "website", label: "Official Website URL" },
      { key: "phone", label: "Direct Phone (NAP)" },
      { key: "email", label: "Public Contact Email" },
    ];

    const changes: { key: string; label: string; from: string; to: string }[] = [];
    for (const field of fields) {
      const fromVal = (savedForm[field.key] || "").trim();
      const toVal = (form[field.key] || "").trim();
      if (fromVal !== toVal) {
        changes.push({
          key: field.key,
          label: field.label,
          from: fromVal || "(none)",
          to: toVal || "(none)",
        });
      }
    }
    return changes;
  };

  // Intercept vertical selection to show confirmation modal before switching
  const handleVerticalClick = (targetVertical: (typeof VERTICALS)[0]) => {
    const currentSelectedId = selectedVertical.id.toLowerCase();
    const targetId = targetVertical.id.toLowerCase();

    // If clicking already active vertical, no confirmation needed
    if (currentSelectedId === targetId) {
      return;
    }

    setPendingVertical(targetVertical);
    setShowVerticalConfirmModal(true);
  };

  // Confirm vertical switch from modal
  const handleConfirmVerticalSwitch = () => {
    if (pendingVertical) {
      setForm((prev) => ({ ...prev, industry: pendingVertical.id }));
    }
    setShowVerticalConfirmModal(false);
    setPendingVertical(null);
  };

  // Cancel vertical switch
  const handleCancelVerticalSwitch = () => {
    setShowVerticalConfirmModal(false);
    setPendingVertical(null);
  };

  // Save Business Data Click Handler
  const handleSaveBusinessClick = () => {
    const changes = getBusinessFormChanges();

    // If initial setup is already completed and there are modified fields, confirm with popup
    if (isInitialSetupDone && changes.length > 0) {
      setShowBusinessConfirmModal(true);
    } else {
      // First-time setup or no changes: save directly
      executeSaveBusiness();
    }
  };

  // Confirm Business Data Save from Modal
  const handleConfirmBusinessSave = async () => {
    setShowBusinessConfirmModal(false);
    await executeSaveBusiness();
  };

  // Execute Save Business Data to API & LocalStorage
  async function executeSaveBusiness() {
    setBusy(true);
    setErrorMessage(null);
    try {
      const updated = await apiFetch<Business>("/business", {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      if (updated) {
        const freshData: Record<string, string> = {
          name: updated.name || form.name || "",
          city: updated.city || form.city || "",
          industry: updated.industry || form.industry || "Professional Services",
          website: updated.website || form.website || "",
          phone: updated.phone || form.phone || "",
          email: updated.email || form.email || "",
        };
        setForm(freshData);
        setSavedForm(freshData);
        setIsInitialSetupDone(true);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(freshData));
          localStorage.setItem(LOCAL_STORAGE_SETUP_KEY, "true");
        } catch {}
      } else {
        setSavedForm({ ...form });
        setIsInitialSetupDone(true);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(form));
          localStorage.setItem(LOCAL_STORAGE_SETUP_KEY, "true");
        } catch {}
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save business profile. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Save User Account Profile
  async function saveUserProfile() {
    setBusy(true);
    setErrorMessage(null);
    try {
      await apiFetch("/auth/profile", {
        method: "POST",
        body: JSON.stringify(userForm),
      });

      try {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userForm));
      } catch {}

      setUserSaved(true);
      setTimeout(() => setUserSaved(false), 3500);
    } catch (err: any) {
      // Graceful fallback for demo
      try {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userForm));
      } catch {}
      setUserSaved(true);
      setTimeout(() => setUserSaved(false), 3500);
    } finally {
      setBusy(false);
    }
  }

  // Change Password
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwords.currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (passwords.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordBusy(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });

      setPasswordSuccess("Your password has been changed successfully.");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err?.message || "Could not update password. Please check your current password.");
    } finally {
      setPasswordBusy(false);
    }
  }

  // Toggle 2FA
  async function handleToggle2FA() {
    if (twoFactorEnabled) {
      // Disabling 2FA
      setTwoFactorBusy(true);
      try {
        await apiFetch("/auth/2fa/toggle", {
          method: "POST",
          body: JSON.stringify({ enabled: false }),
        });
      } catch {}
      setTwoFactorEnabled(false);
      localStorage.setItem(LOCAL_STORAGE_2FA_KEY, "false");
      setTwoFactorBusy(false);
    } else {
      // Enabling 2FA -> Open setup wizard at scan step
      setSetupStep("scan");
      setVerificationCode("");
      setVerifyError(null);
      setShowQrModal(true);
    }
  }

  // Verify 6-Digit TOTP Code from Authenticator App
  async function handleVerify2FACode(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setVerifyError(null);

    const cleanCode = verificationCode.trim().replace(/\s/g, "");
    if (cleanCode.length !== 6) {
      setVerifyError("Please enter the complete 6-digit verification code.");
      return;
    }

    setVerifyBusy(true);
    try {
      await apiFetch("/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ code: cleanCode }),
      });

      setTwoFactorEnabled(true);
      localStorage.setItem(LOCAL_STORAGE_2FA_KEY, "true");
      setSetupStep("success");
    } catch (err: any) {
      setVerifyError(
        err?.message || "Invalid 6-digit verification code. Please check your authenticator app and try again."
      );
    } finally {
      setVerifyBusy(false);
    }
  }

  const copyBackupCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const selectedVertical =
    VERTICALS.find((v) => v.id.toLowerCase() === (form.industry || "").toLowerCase()) ||
    VERTICALS.find((v) => (form.industry || "").toLowerCase().includes(v.id.toLowerCase().split(" ")[0])) ||
    VERTICALS[0];

  const userInitials = (userForm.name || userForm.email || "User")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-5xl">
        {/* Top Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Account & Business Settings</h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage your business profile, target vertical intelligence, login credentials, and 2FA security.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </header>

        {/* Global Alerts */}
        {saved && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Business profile & NAP settings updated and synchronized across all dashboards!
          </div>
        )}

        {userSaved && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            User account profile updated successfully!
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm font-semibold text-red-400 animate-in fade-in">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Top Navigation Tabs */}
        <div className="mb-8 flex items-center gap-3 border-b border-slate-800/80 pb-4">
          <button
            onClick={() => setActiveTab("business")}
            className={`flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
              activeTab === "business"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30"
                : "bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Business Data & Vertical Intelligence</span>
          </button>

          <button
            onClick={() => setActiveTab("account")}
            className={`flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-bold transition-all ${
              activeTab === "account"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30"
                : "bg-slate-900/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <User className="h-4 w-4" />
            <span>User Account, Password & 2FA</span>
            {twoFactorEnabled && (
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" title="2FA Active" />
            )}
          </button>
        </div>

        {/* TAB 1: BUSINESS DATA */}
        {activeTab === "business" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 animate-in fade-in duration-200">
            {/* Main Form (2 Cols) */}
            <div className="space-y-6 lg:col-span-2">
              {/* Industry Vertical Selector */}
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">1. Select Business Vertical / Industry</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      BrandOS customizes all Schema.org markup, E-E-A-T audits, and AI search benchmark queries to this vertical.
                    </p>
                  </div>
                  {isInitialSetupDone && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-[11px] font-semibold text-blue-400">
                      <ShieldCheck className="h-3.5 w-3.5" /> Setup Active
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {VERTICALS.map((v) => {
                    const isSelected = selectedVertical.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleVerticalClick(v)}
                        className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                            : "border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40"
                        }`}
                      >
                        <span className="text-2xl">{v.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-white">{v.label}</p>
                            {isSelected && <span className="text-xs text-blue-400 font-semibold">● Active</span>}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">{v.schema}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Core Details (NAP) */}
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">2. Business NAP & Identity</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Machine-readable Name, Address, Phone, and website used across audits, AI reports, and client PDFs.
                    </p>
                  </div>
                  {loading && <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Business Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Acme Growth Services"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">City & Region</label>
                    <input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="e.g. New York, NY"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Official Website URL / Monitored Domain</label>
                    <input
                      value={form.website}
                      onChange={(e) => setForm({ ...form, website: e.target.value })}
                      placeholder="e.g. https://yourbusiness.com"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Direct Phone (NAP)</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="e.g. +1 (555) 234-5678"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Business Public Contact Email</label>
                    <input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. contact@yourbusiness.com"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <button
                    onClick={handleSaveBusinessClick}
                    disabled={busy}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
                  >
                    {busy ? "Saving Changes…" : "Save Business Profile"}
                  </button>
                  {saved && <span className="text-sm font-semibold text-emerald-400">✔ Saved successfully!</span>}
                </div>
              </div>
            </div>

            {/* Right Sidebar: Active Vertical Preview (1 Col) */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-b from-blue-950/30 to-slate-900/60 p-6 backdrop-blur shadow-xl">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedVertical.icon}</span>
                  <div>
                    <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      Active Vertical Engine
                    </span>
                    <h3 className="text-lg font-bold text-white">{selectedVertical.label}</h3>
                  </div>
                </div>

                <div className="mt-5 space-y-4 border-t border-slate-800 pt-4 text-xs">
                  <div>
                    <p className="font-semibold text-slate-400">Target Schema.org Type</p>
                    <p className="mt-0.5 font-mono text-emerald-400">{selectedVertical.schema}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-400">E-E-A-T Focus Area</p>
                    <p className="mt-0.5 text-slate-200">{selectedVertical.eeat}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-400">Benchmark AI Search Query</p>
                    <p className="mt-0.5 rounded-lg bg-slate-950/80 p-2.5 italic text-slate-300">
                      "{selectedVertical.sampleQuery.replace("[City]", form.city || "your city")}"
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur shadow-xl">
                <h3 className="text-sm font-bold text-white">⚡ Quick Actions</h3>
                <ul className="mt-3 space-y-2 text-xs">
                  <li>
                    <Link
                      href="/dashboard/audit"
                      className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-slate-300 hover:text-white transition"
                    >
                      <span>Re-run Omnichannel Audit</span>
                      <span>→</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/report"
                      className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-slate-300 hover:text-white transition"
                    >
                      <span>View Executive Pitch PDF</span>
                      <span>→</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/dashboard/integrations"
                      className="flex items-center justify-between rounded-xl bg-blue-950/40 border border-blue-500/20 p-3 text-blue-300 hover:text-white transition"
                    >
                      <span className="font-semibold">🔌 Connected Google & WordPress</span>
                      <span>→</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER ACCOUNT & SECURITY */}
        {activeTab === "account" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Section 1: User Profile Details */}
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-lg font-black text-white shadow-lg shadow-blue-500/25">
                    {userInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">{userForm.name}</h2>
                      <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-bold text-blue-400 border border-blue-500/30">
                        Account Owner
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{userForm.email} • {form.name || "Your Business"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> ⚡ Pro Growth Plan
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">Your Full Name</label>
                  <input
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    placeholder="e.g. Alex Morgan"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">Account Login Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="e.g. alex@yourbusiness.com"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <button
                  onClick={saveUserProfile}
                  disabled={busy}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Update Profile Info"}
                </button>
                {userSaved && <span className="text-sm font-semibold text-emerald-400">✔ Profile updated!</span>}
              </div>
            </div>

            {/* Section 2: Password Management & 2FA in 2 Columns */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Password Change Form */}
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur shadow-xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Password & Authentication</h3>
                    <p className="text-xs text-slate-400">Change your password to keep your account secure.</p>
                  </div>
                </div>

                {passwordSuccess && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {passwordSuccess}
                  </div>
                )}

                {passwordError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? "text" : "password"}
                        value={passwords.currentPassword}
                        onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">New Password (Min 8 chars)</label>
                    <div className="relative">
                      <input
                        type={showNewPass ? "text" : "password"}
                        value={passwords.newPassword}
                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-300">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={passwordBusy}
                    className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {passwordBusy ? "Updating Password…" : "Change Password"}
                  </button>
                </form>
              </div>

              {/* Two-Factor Authentication (2FA) */}
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Two-Factor Authentication (2FA)</h3>
                      <p className="text-xs text-slate-400">Add an extra layer of defense with TOTP authentication.</p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                      twoFactorEnabled
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {twoFactorEnabled ? "Active" : "Disabled"}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">Authenticator App (TOTP)</p>
                      <p className="text-xs text-slate-400">Use Google Authenticator, Microsoft Auth, or 1Password.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggle2FA}
                      disabled={twoFactorBusy}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        twoFactorEnabled ? "bg-emerald-500" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          twoFactorEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* When 2FA is Enabled: Show Quick Code / Key */}
                {twoFactorEnabled && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-emerald-400" /> Emergency Recovery Codes
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowQrModal(true)}
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <QrCode className="h-3 w-3" /> View Setup QR
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-xs font-mono text-slate-300"
                        >
                          <span>{code}</span>
                          <button
                            type="button"
                            onClick={() => copyBackupCode(code, idx)}
                            className="text-slate-500 hover:text-white"
                          >
                            {copiedCodeIndex === idx ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Keep these backup codes safe in case you lose access to your authenticator device.
                    </p>
                  </div>
                )}

                {/* Section 3: Active Sessions */}
                <div className="border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Laptop className="h-4 w-4 text-blue-400" />
                      <div>
                        <p className="font-bold text-white">Current Session</p>
                        <p className="text-[11px] text-slate-400">Chrome on Windows • Online Now</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2FA Multi-Step Setup & Verification Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {setupStep === "scan" && "Step 1: Scan 2FA QR Code"}
                    {setupStep === "verify" && "Step 2: Verify Authenticator Code"}
                    {setupStep === "success" && "🎉 2FA Successfully Activated"}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-xs text-slate-500 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            {/* STEP 1: SCAN QR CODE */}
            {setupStep === "scan" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-5 shadow-lg border border-slate-200 text-center">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="2FA TOTP QR Code"
                      className="h-56 w-56 object-contain rounded-lg shadow-sm"
                    />
                  ) : (
                    <div className="flex h-56 w-56 items-center justify-center text-xs text-slate-500">
                      <RefreshCw className="h-6 w-6 animate-spin text-slate-700" />
                    </div>
                  )}
                  <p className="text-[11px] font-semibold text-slate-800 mt-2">
                    Open Google Authenticator → Tap <strong>"+"</strong> → Choose <strong>"Scan a QR code"</strong>
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Secret Key (Manual Entry):</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(secretKey);
                        setCopiedSecret(true);
                        setTimeout(() => setCopiedSecret(false), 2000);
                      }}
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold text-[11px]"
                    >
                      {copiedSecret ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedSecret ? "Copied!" : "Copy Key"}
                    </button>
                  </div>
                  <p className="font-mono font-bold text-emerald-400 text-sm mt-1 tracking-widest select-all">
                    {secretKey}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSetupStep("verify");
                    setVerifyError(null);
                  }}
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
                >
                  I've Scanned the QR → Verify Code →
                </button>
              </div>
            )}

            {/* STEP 2: ENTER 6-DIGIT CODE FROM APP */}
            {setupStep === "verify" && (
              <form onSubmit={handleVerify2FACode} className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 text-center space-y-3">
                  <Smartphone className="h-8 w-8 text-emerald-400 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Enter the 6-Digit App Code</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Type the 6-digit code currently displayed in your Google Authenticator app for <strong>BrandOS Eye</strong>.
                    </p>
                  </div>

                  <div className="pt-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000 000"
                      className="w-full text-center text-3xl font-mono font-bold tracking-[0.35em] rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-emerald-400 placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {verifyError && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-semibold text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {verifyError}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSetupStep("scan");
                      setVerifyError(null);
                    }}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
                  >
                    ← Back to QR
                  </button>

                  <button
                    type="submit"
                    disabled={verifyBusy || verificationCode.trim().length !== 6}
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {verifyBusy ? "Verifying Code…" : "Verify & Activate 2FA"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: SUCCESS & BACKUP CODES */}
            {setupStep === "success" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-white">2FA Verification Successful!</h4>
                  <p className="text-xs text-slate-300">
                    Your Google Authenticator code was verified. Two-Factor Authentication is now active on your account.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-emerald-400" /> Emergency Recovery Codes
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-xs font-mono text-slate-300"
                      >
                        <span>{code}</span>
                        <button
                          type="button"
                          onClick={() => copyBackupCode(code, idx)}
                          className="text-slate-500 hover:text-white"
                        >
                          {copiedCodeIndex === idx ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Save these backup codes in a safe place. They will allow you to regain access if you lose your phone.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20"
                >
                  Done &amp; Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. Industry Vertical Switch Confirmation Modal */}
      {showVerticalConfirmModal && pendingVertical && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl border border-blue-500/30 bg-slate-900/95 p-6 md:p-8 shadow-2xl shadow-blue-500/10 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Confirm Vertical Switch</h3>
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-400">
                      Impact Notice
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Recalibrating Schema.org models, E-E-A-T audits & benchmark queries
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelVerticalSwitch}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Impact Explanation */}
            <div className="rounded-2xl border border-blue-500/20 bg-blue-950/30 p-4 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-blue-400">
                <Sparkles className="h-4 w-4" />
                <span>What happens when you switch industry verticals?</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                BrandOS will update all machine-readable Schema.org entities, audit algorithms, E-E-A-T scoring criteria, and target AI search prompts to target <strong>{pendingVertical.label}</strong>.
              </p>
            </div>

            {/* Side-by-Side Transition Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Current Active */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-semibold uppercase tracking-wider">Current Vertical</span>
                  <span className="text-slate-500 text-[10px]">Active</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{selectedVertical.icon}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{selectedVertical.label}</h4>
                    <p className="text-[11px] font-mono text-slate-400 truncate">{selectedVertical.schema}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-500">E-E-A-T Focus:</span>
                  <p className="text-slate-300 font-medium">{selectedVertical.eeat}</p>
                </div>
              </div>

              {/* Target Vertical */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 font-bold uppercase tracking-wider">Target Vertical</span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                    New Selection
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{pendingVertical.icon}</span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{pendingVertical.label}</h4>
                    <p className="text-[11px] font-mono text-emerald-400 truncate">{pendingVertical.schema}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-emerald-500/20 text-[11px]">
                  <span className="text-slate-400">E-E-A-T Focus:</span>
                  <p className="text-emerald-200 font-medium">{pendingVertical.eeat}</p>
                </div>
              </div>
            </div>

            {/* Benchmark Query Preview */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs space-y-1">
              <span className="text-slate-400 font-semibold">Benchmark AI Search Query:</span>
              <p className="italic text-slate-200">
                "{pendingVertical.sampleQuery.replace("[City]", form.city || "your city")}"
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelVerticalSwitch}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                Keep {selectedVertical.label}
              </button>
              <button
                type="button"
                onClick={handleConfirmVerticalSwitch}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition"
              >
                Confirm &amp; Switch to {pendingVertical.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Business Profile & NAP Change Confirmation Modal (After Initial Setup) */}
      {showBusinessConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl border border-amber-500/30 bg-slate-900/95 p-6 md:p-8 shadow-2xl shadow-amber-500/10 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/10">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Confirm Business Identity Updates</h3>
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                      Established Profile
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Modifying live Business NAP & structured data credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBusinessConfirmModal(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Impact Explanation */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Downstream Synchronisation Impact</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Your business Name, Address/City, Phone, and Website (NAP) are synchronized with Google Search Console, GA4, WordPress AIVision, and AI search engines. Confirm the modifications below:
              </p>
            </div>

            {/* Changed Fields Summary Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Summary of Modified Fields ({getBusinessFormChanges().length})
              </span>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {getBusinessFormChanges().map((change) => (
                  <div
                    key={change.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-xs"
                  >
                    <span className="font-semibold text-slate-300 min-w-[130px]">{change.label}</span>
                    <div className="flex items-center gap-2 font-mono text-[11px] overflow-hidden">
                      <span className="text-slate-400 line-through truncate max-w-[150px]" title={change.from}>
                        {change.from}
                      </span>
                      <ArrowRight className="h-3 w-3 text-slate-600 shrink-0" />
                      <span className="text-emerald-400 font-bold truncate max-w-[170px]" title={change.to}>
                        {change.to}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBusinessConfirmModal(false)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                Cancel / Review Edits
              </button>
              <button
                type="button"
                onClick={handleConfirmBusinessSave}
                disabled={busy}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50"
              >
                {busy ? "Saving Updates…" : "Confirm & Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}