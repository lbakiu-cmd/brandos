"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  BarChart3,
  MapPin,
  Radar,
  ShieldCheck,
  Swords,
  Plug,
  Settings,
  Eye,
} from "lucide-react";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { BusinessSwitcher } from "@/components/BusinessSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiFetch } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Overview & Presence", icon: LayoutDashboard },
  { href: "/dashboard/gsc", label: "Google Search (GSC)", icon: Search },
  { href: "/dashboard/ga4", label: "Website Traffic (GA4)", icon: BarChart3 },
  { href: "/dashboard/gbp", label: "Google Maps & Calls", icon: MapPin },
  { href: "/dashboard/visibility", label: "Assistant Visibility", icon: Radar },
  { href: "/dashboard/audit", label: "Technical SEO & Schema", icon: ShieldCheck },
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

    const handleBusinessChange = (e: any) => {
      if (e?.detail?.website) {
        const clean = e.detail.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
        setWebsiteDomain(clean);
        setWebsiteConnected(true);
      }
      loadStatus();
    };

    window.addEventListener("brandos:domain-changed", handleDomainChange);
    window.addEventListener("brandos:business-changed", handleBusinessChange);
    const interval = setInterval(loadStatus, 15000);

    return () => {
      window.removeEventListener("brandos:domain-changed", handleDomainChange);
      window.removeEventListener("brandos:business-changed", handleBusinessChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-white">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-800/80 bg-zinc-950 p-4 z-40">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950 font-bold text-sm shadow-sm">
            B
          </div>
          <div>
            <span className="text-base font-semibold tracking-tight text-white flex items-center gap-1.5">
              BrandOS
            </span>
            <p className="text-[11px] text-zinc-400 font-medium">Search Visibility Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-3 mb-2">
          Navigation
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto pr-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-850 text-white border border-zinc-700/60 font-medium"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-zinc-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Live Connection Status Badges */}
        <div className="mt-auto pt-3 border-t border-zinc-800/80 space-y-1.5">
          {/* Website Indicator */}
          <Link
            href="/dashboard/integrations"
            className="flex items-center justify-between rounded-lg bg-zinc-900/60 border border-zinc-800/60 px-3 py-2 hover:border-zinc-700 hover:bg-zinc-900 transition group"
            title="Manage Website & CMS Connection"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span
                className={`relative inline-flex rounded-full h-2 w-2 shrink-0 ${
                  websiteConnected ? "bg-emerald-500" : "bg-zinc-600"
                }`}
              ></span>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white truncate">
                {websiteDomain ? websiteDomain : "Website"}
              </span>
            </div>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                websiteConnected
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                  : "text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {websiteConnected ? "Connected" : "Offline"}
            </span>
          </Link>

          {/* Google OAuth Indicator */}
          <Link
            href="/dashboard/integrations"
            className="flex items-center justify-between rounded-lg bg-zinc-900/60 border border-zinc-800/60 px-3 py-2 hover:border-zinc-700 hover:bg-zinc-900 transition group"
            title="Manage Google Connected Accounts"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span
                className={`relative inline-flex rounded-full h-2 w-2 shrink-0 ${
                  googleConnected ? "bg-emerald-500" : "bg-zinc-600"
                }`}
              ></span>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white truncate">
                Google APIs
              </span>
            </div>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                googleConnected
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                  : "text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {googleConnected ? "Connected" : "Offline"}
            </span>
          </Link>

          {/* Meta OAuth Indicator */}
          <Link
            href="/dashboard/integrations"
            className="flex items-center justify-between rounded-lg bg-zinc-900/60 border border-zinc-800/60 px-3 py-2 hover:border-zinc-700 hover:bg-zinc-900 transition group"
            title="Manage Meta Connected Accounts"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span
                className={`relative inline-flex rounded-full h-2 w-2 shrink-0 ${
                  metaConnected ? "bg-emerald-500" : "bg-zinc-600"
                }`}
              ></span>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white truncate">
                Meta APIs
              </span>
            </div>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                metaConnected
                  ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                  : "text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {metaConnected ? "Connected" : "Offline"}
            </span>
          </Link>
        </div>
      </aside>

      <div className="pl-64 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <BusinessSwitcher />
            <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <span className="text-zinc-500">View /</span>
              <span className="font-medium text-zinc-300 capitalize">
                {pathname.replace("/dashboard", "").replace("/", "") || "Overview"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />
            <UserProfileDropdown />
          </div>
        </header>

        {/* Main Page Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}