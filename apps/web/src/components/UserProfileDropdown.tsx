"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  CreditCard,
  Plug,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Building2,
  ExternalLink,
  Globe,
  Sun,
  Moon,
} from "lucide-react";
import { apiFetch, authApi } from "@/lib/api";

interface UserProfile {
  id?: string;
  email?: string;
  name?: string;
  businessName?: string;
  role?: string;
  plan?: string;
  website?: string;
}

export function UserProfileDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: "My Business",
    email: "",
    role: "Owner",
    plan: "Pro Growth Plan",
    website: "example.com",
  });
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">("light");
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("brandos_theme");
      if (stored === "light" || stored === "dark") {
        setCurrentTheme(stored);
        if (stored === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    } catch {
      // ignore
    }

    const handleThemeChange = (e: any) => {
      if (e?.detail?.theme) {
        setCurrentTheme(e.detail.theme);
        if (e.detail.theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    };
    window.addEventListener("brandos:theme-changed", handleThemeChange);
    async function loadProfile() {
      try {
        const [meRes, bizRes, billRes] = await Promise.all([
          authApi.me().catch(() => null),
          apiFetch<any>("/business").catch(() => null),
          apiFetch<any>("/billing/status").catch(() => null),
        ]);

        const userObj = meRes?.user;
        const bizName = userObj?.businessName || bizRes?.name || userObj?.name || "My Workspace";
        const email = userObj?.email || bizRes?.email || "";
        const websiteClean = bizRes?.website
          ? bizRes.website.replace(/^https?:\/\//, "").replace(/\/$/, "")
          : "yourbusiness.com";
        const planName = billRes?.subscription?.planName || "Pro Growth Plan";

        setProfile({
          id: userObj?.id,
          name: bizName,
          email: email,
          role: userObj?.role || "Owner",
          plan: planName,
          website: websiteClean,
        });
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("brandos:business-changed", loadProfile);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("brandos:business-changed", loadProfile);
      window.removeEventListener("brandos:theme-changed", handleThemeChange);
    };
  }, []);

  const handleToggleTheme = () => {
    const next = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(next);
    try {
      document.documentElement.setAttribute("data-theme", next);
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("brandos_theme", next);
      document.cookie = `brandos_theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent("brandos:theme-changed", { detail: { theme: next } }));
  };

  const handleLogout = async () => {
    try {
      await authApi.logout().catch(() => {});
    } catch {
      // Ignore
    }
    router.push("/login");
  };

  const getInitials = (name: string) => {
    if (!name) return "US";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Top Right Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/90 py-1.5 pl-2 pr-3 text-xs font-semibold text-white shadow-lg backdrop-blur-md transition hover:border-blue-500/50 hover:bg-slate-850 focus:outline-none ${
          isOpen ? "border-blue-500 ring-2 ring-blue-500/20 bg-slate-850" : ""
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar with dynamic initials and active indicator */}
        <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-xs shadow-md shadow-blue-500/20 border border-blue-400/30">
          {getInitials(profile.name || "User")}
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950"></span>
        </div>

        {/* User Info Text */}
        <div className="flex flex-col text-left hidden sm:flex">
          <span className="font-bold text-white text-xs leading-tight max-w-[140px] truncate">
            {profile.name}
          </span>
          <span className="text-[10px] text-slate-400 font-medium leading-tight flex items-center gap-1">
            <span className="text-blue-400 font-semibold">{profile.role}</span>
            <span>•</span>
            <span className="truncate max-w-[90px]">{profile.plan}</span>
          </span>
        </div>

        {/* Dropdown Indicator */}
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-800 bg-slate-900/95 p-2.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-800/80">
          {/* Header Section */}
          <div className="px-3 py-3 mb-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-sm shadow-lg shadow-blue-600/30 border border-blue-400/30">
                {getInitials(profile.name || "User")}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-white text-sm truncate">{profile.name}</p>
                <p className="text-[11px] text-slate-400 font-mono truncate">{profile.email || "No email linked"}</p>
              </div>
            </div>

            {/* Plan Badge & Monitored Site */}
            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>{profile.plan}</span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                Active
              </span>
            </div>

            {/* Active Domain Info */}
            <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3 text-blue-400" />
                <span>Monitored:</span>
              </span>
              <span className="font-semibold text-slate-200 truncate max-w-[130px]">
                {profile.website}
              </span>
            </div>
          </div>

          {/* Core Navigation Items: Account Settings, Billing, Integrations */}
          <div className="py-1.5 space-y-1">
            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white group"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition">
                <Settings className="h-4 w-4" />
              </div>
              <div className="flex flex-col text-left">
                <span>Account & Profile Settings</span>
                <span className="text-[10px] text-slate-500 font-normal">Business NAP, Industry & SEO</span>
              </div>
            </Link>

            <Link
              href="/dashboard/billing"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white group"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 group-hover:bg-emerald-600/20 group-hover:text-emerald-400 transition">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="flex flex-col text-left">
                <span>Billing & Subscription</span>
                <span className="text-[10px] text-slate-500 font-normal">Manage plan, invoices & limits</span>
              </div>
            </Link>

            <Link
              href="/dashboard/integrations"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white group"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-400 group-hover:bg-purple-600/20 group-hover:text-purple-400 transition">
                <Plug className="h-4 w-4" />
              </div>
              <div className="flex flex-col text-left">
                <span>Connected Accounts</span>
                <span className="text-[10px] text-slate-500 font-normal">Google, Meta, WordPress & AI</span>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleToggleTheme}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white group"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-amber-400 group-hover:bg-amber-500/20 transition">
                  {currentTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-indigo-400" />}
                </div>
                <div className="flex flex-col text-left">
                  <span>Appearance</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {currentTheme === "dark" ? "Dark Theme Active" : "Light Theme Active"}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800/80 uppercase">
                {currentTheme}
              </span>
            </button>
          </div>

          {/* Sign Out Section */}
          <div className="pt-1.5">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 group"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 transition">
                <LogOut className="h-4 w-4" />
              </div>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
