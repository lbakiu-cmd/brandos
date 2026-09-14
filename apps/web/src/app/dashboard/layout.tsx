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
  Menu,
  X,
  FileText,
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
  { href: "/dashboard/content", label: "Content Autopilot", icon: FileText },
  { href: "/dashboard/competitors", label: "Competitor Tracking", icon: Swords },
  { href: "/dashboard/integrations", label: "Connected Accounts", icon: Plug },
  { href: "/dashboard/settings", label: "Business Profile & NAP", icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [googleConnected, setGoogleConnected] = useState<boolean>(true);
  const [metaConnected, setMetaConnected] = useState<boolean>(false);
  const [websiteConnected, setWebsiteConnected] = useState<boolean>(true);
  const [websiteDomain, setWebsiteDomain] = useState<string>("");

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  const renderSidebarContent = (isMobile = false) => (
    <>
      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-950 font-black text-xs shadow-sm">
            AI
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              AIVisibility SEO
            </span>
            <p className="text-xs text-zinc-400 font-medium">Search Visibility Platform</p>
          </div>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-3 mb-2">
        Navigation
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-850 text-white border border-zinc-700/60 font-semibold"
                  : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-white" : "text-zinc-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Live Connection Status Badges */}
      <div className="mt-auto pt-3 border-t border-zinc-800/80 space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-1 mb-1">
          Connected Channels
        </div>
        {/* Website Indicator */}
        <Link
          href="/dashboard/integrations"
          onClick={() => isMobile && setMobileMenuOpen(false)}
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
            className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
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
          onClick={() => isMobile && setMobileMenuOpen(false)}
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
            className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
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
          onClick={() => isMobile && setMobileMenuOpen(false)}
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
            className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${
              metaConnected
                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                : "text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
            }`}
          >
            {metaConnected ? "Connected" : "Offline"}
          </span>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-white">
      {/* Mobile Navigation Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] flex flex-col border-r border-zinc-800/90 bg-zinc-950 p-4 z-50 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderSidebarContent(true)}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-zinc-800/80 bg-zinc-950 p-4 z-40">
        {renderSidebarContent(false)}
      </aside>

      {/* Main Content Area */}
      <div className="w-full pl-0 lg:pl-64 min-h-screen flex flex-col transition-all duration-200">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-3 sm:px-6 lg:px-8 backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition shrink-0"
              aria-label="Open Navigation Menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <BusinessSwitcher />
            <div className="h-4 w-[1px] bg-zinc-800 hidden md:block" />
            <div className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm">
              <span className="text-zinc-500">View /</span>
              <span className="font-medium text-zinc-300 capitalize">
                {pathname.replace("/dashboard", "").replace("/", "") || "Overview"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />
            <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />
            <UserProfileDropdown />
          </div>
        </header>

        {/* Main Page Content */}
        <div className="flex-1 w-full">{children}</div>
      </div>
    </div>
  );
}