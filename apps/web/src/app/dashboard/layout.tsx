"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  BarChart3,
  MapPin,
  Sparkles,
  ShieldCheck,
  Swords,
  Plug,
  Settings,
  Eye,
} from "lucide-react";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { apiFetch } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Growth Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/gsc", label: "Google Search (GSC)", icon: Search },
  { href: "/dashboard/ga4", label: "Website Visitors (GA4)", icon: BarChart3 },
  { href: "/dashboard/gbp", label: "Google Maps & Calls", icon: MapPin },
  { href: "/dashboard/visibility", label: "AI Recommendations", icon: Sparkles },
  { href: "/dashboard/audit", label: "Website Health Check", icon: ShieldCheck },
  { href: "/dashboard/competitors", label: "Competitor Tracking", icon: Swords },
  { href: "/dashboard/integrations", label: "Connected Accounts", icon: Plug },
  { href: "/dashboard/settings", label: "Business Profile & NAP", icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [googleConnected, setGoogleConnected] = useState<boolean>(true);
  const [metaConnected, setMetaConnected] = useState<boolean>(false);
  const [websiteConnected, setWebsiteConnected] = useState<boolean>(true);
  const [websiteDomain, setWebsiteDomain] = useState<string>("");

  useEffect(() => {
    async function loadStatus() {
      try {
        const [statusRes, bizRes, wpRes] = await Promise.all([
          apiFetch<any>("/integrations/status").catch(() => null),
          apiFetch<any>("/business").catch(() => null),
          apiFetch<any>("/wordpress/connection").catch(() => null),
        ]);

        if (statusRes?.integrations) {
          const googleAccounts = statusRes.integrations.filter(
            (i: any) =>
              i.provider === "GOOGLE_SEARCH_CONSOLE" ||
              i.provider === "GOOGLE_ANALYTICS_4" ||
              i.provider === "GOOGLE_BUSINESS_PROFILE"
          );
          setGoogleConnected(googleAccounts.some((i: any) => Boolean(i.connected)));

          const metaAccounts = statusRes.integrations.filter(
            (i: any) => i.provider === "FACEBOOK_PAGE" || i.provider === "INSTAGRAM_INSIGHTS"
          );
          setMetaConnected(metaAccounts.some((i: any) => Boolean(i.connected)));
        }

        if (bizRes?.website) {
          const clean = bizRes.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
          setWebsiteDomain(clean);
        }

        const isWp = Boolean(wpRes?.connected);
        const hasWeb = Boolean(bizRes?.website);
        setWebsiteConnected(isWp || hasWeb);
      } catch (err) {
        // Fallback gracefully
      }
    }

    loadStatus();

    const handleDomainChange = (e: any) => {
      if (e?.detail?.domain) {
        setWebsiteDomain(e.detail.domain);
        setWebsiteConnected(true);
      }
    };

    window.addEventListener("brandos:domain-changed", handleDomainChange);
    const interval = setInterval(loadStatus, 15000);

    return () => {
      window.removeEventListener("brandos:domain-changed", handleDomainChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-4 z-40">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              BrandOS <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">EYE</span>
            </span>
            <p className="text-[10px] text-slate-400 font-medium">Online Growth & Presence Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
          Your Growth Hub
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/30 font-semibold"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Live Connection Status Badges */}
        <div className="mt-auto pt-3 border-t border-slate-800/80 space-y-1.5">
          {/* Website Indicator */}
          <Link
            href="/dashboard/integrations"
            className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/60 px-3 py-2 hover:border-slate-700 hover:bg-slate-950/90 transition group"
            title="Manage Website & CMS Connection"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {websiteConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    websiteConnected ? "bg-emerald-500" : "bg-slate-500"
                  }`}
                ></span>
              </span>
              <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                {websiteDomain ? websiteDomain : "Website"}
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                websiteConnected
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-slate-400 bg-slate-800/60 border-slate-700/50"
              }`}
            >
              {websiteConnected ? "CONNECTED" : "NOT CONNECTED"}
            </span>
          </Link>

          {/* Google OAuth Indicator */}
          <Link
            href="/dashboard/integrations"
            className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/60 px-3 py-2 hover:border-slate-700 hover:bg-slate-950/90 transition group"
            title="Manage Google Connected Accounts"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {googleConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    googleConnected ? "bg-emerald-500" : "bg-slate-500"
                  }`}
                ></span>
              </span>
              <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                Google OAuth
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                googleConnected
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-slate-400 bg-slate-800/60 border-slate-700/50"
              }`}
            >
              {googleConnected ? "CONNECTED" : "NOT CONNECTED"}
            </span>
          </Link>

          {/* Meta OAuth Indicator */}
          <Link
            href="/dashboard/integrations"
            className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/60 px-3 py-2 hover:border-slate-700 hover:bg-slate-950/90 transition group"
            title="Manage Meta Connected Accounts"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {metaConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    metaConnected ? "bg-emerald-500" : "bg-slate-500"
                  }`}
                ></span>
              </span>
              <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                Meta OAuth
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                metaConnected
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-slate-400 bg-slate-800/60 border-slate-700/50"
              }`}
            >
              {metaConnected ? "CONNECTED" : "NOT CONNECTED"}
            </span>
          </Link>
        </div>
      </aside>

      <div className="pl-64 min-h-screen flex flex-col">
        {/* Top Header with Global Domain Switcher */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400">Workspace /</span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {pathname.replace("/dashboard", "").replace("/", "") || "Overview"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <UserProfileDropdown />
          </div>
        </header>

        {/* Main Page Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}