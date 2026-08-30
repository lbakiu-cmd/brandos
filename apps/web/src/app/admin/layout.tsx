"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Users,
  Activity,
  Building2,
  LayoutDashboard,
  ArrowLeft,
  ShieldCheck,
  Eye,
  LogOut,
  Sparkles,
  Terminal,
} from "lucide-react";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";

const ADMIN_NAV = [
  { href: "/admin", label: "Control Center", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Management & Team", icon: Users },
  { href: "/admin/activity", label: "Global Audit & Activity", icon: Activity },
  { href: "/admin/businesses", label: "Client Workspaces & Tenancy", icon: Building2 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-500 selection:text-white">
      {/* Admin Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-purple-900/30 bg-slate-900/95 backdrop-blur-2xl p-4 z-40">
        {/* BrandOS Super Admin Header */}
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              BrandOS <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/25 text-purple-300 font-bold border border-purple-500/40">ADMIN</span>
            </span>
            <p className="text-[10px] text-purple-400 font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Super Admin Authority
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400/80 px-3 mb-2">
          System Control Plane
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 font-semibold border border-purple-400/30"
                    : "text-slate-300 hover:bg-purple-950/40 hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-purple-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Exit to End-User Dashboard button */}
        <div className="mt-auto pt-3 border-t border-slate-800/80 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-between rounded-xl bg-slate-950/80 border border-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition group"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-white transition" />
              <span>Back to User Dashboard</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">App</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pl-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-purple-900/20 bg-slate-950/80 px-8 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 border border-purple-500/20">
              <Terminal className="h-3.5 w-3.5" />
              <span>Super Admin Management Root (/admin)</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <UserProfileDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-slate-950">{children}</main>
      </div>
    </div>
  );
}
