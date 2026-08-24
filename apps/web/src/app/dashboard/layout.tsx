"use client";

import type { ReactNode } from "react";
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
  Flame,
} from "lucide-react";

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-xl p-4 z-40">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
            <Flame className="h-5 w-5" />
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

        {/* Live Status Badge */}
        <div className="mt-auto pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/60 p-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-slate-200">Live Sync</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">ACTIVE</span>
          </div>
        </div>
      </aside>

      <div className="pl-64 min-h-screen flex flex-col">{children}</div>
    </div>
  );
}