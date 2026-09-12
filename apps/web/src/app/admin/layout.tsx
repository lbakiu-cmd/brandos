"use client";

import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  Activity,
  Building2,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  Terminal,
  RefreshCw,
  Server,
} from "lucide-react";
import { authApi } from "@/lib/api";

const ADMIN_NAV = [
  { href: "/admin", label: "Control Center", icon: LayoutDashboard },
  { href: "/admin/vps", label: "VPS Realtime Monitor", icon: Server },
  { href: "/admin/users", label: "User Management & Team", icon: Users },
  { href: "/admin/activity", label: "Global Audit & Activity", icon: Activity },
  { href: "/admin/businesses", label: "Client Workspaces & Tenancy", icon: Building2 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(pathname !== "/admin/login");
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setLoading(false);
      return;
    }

    async function checkSuperAdmin() {
      try {
        const meRes = await authApi.me();
        const user = meRes?.user;
        const isSuper =
          user?.isSuperAdmin === true ||
          user?.role === "SUPER_ADMIN" ||
          user?.memberships?.some((m: any) => m.role === "SUPER_ADMIN");

        if (isSuper) {
          setAuthorized(true);
        } else {
          router.replace("/admin/login");
        }
      } catch {
        router.replace("/admin/login");
      } finally {
        setLoading(false);
      }
    }

    checkSuperAdmin();
  }, [pathname, router]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  const handleAdminLogout = async () => {
    try {
      localStorage.removeItem("brandos_active_business_id");
      document.cookie = "brandos_active_business_id=; path=/; max-age=0; SameSite=Lax";
      await authApi.logout().catch(() => {});
    } catch {
      // Ignore
    }
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-purple-500 selection:text-white">
      {/* Admin Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-purple-900/30 bg-slate-900/95 backdrop-blur-2xl p-4 z-40">
        {/* AIVisibility SEO Super Admin Header */}
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 border border-purple-400/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
              AIVisibility SEO <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/25 text-purple-300 font-bold border border-purple-500/40">ADMIN</span>
            </span>
            <p className="text-[10px] text-purple-400 font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              SaaS Owner Authority
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

        {/* Super Admin Logout */}
        <div className="mt-auto pt-3 border-t border-slate-800/80">
          <button
            onClick={handleAdminLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-950/40 border border-purple-800/40 px-3 py-2.5 text-xs font-semibold text-purple-300 hover:text-white hover:bg-purple-900/50 transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out from Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pl-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-purple-900/20 bg-slate-950/80 px-8 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 border border-purple-500/20">
              <Terminal className="h-3.5 w-3.5" />
              <span>Restricted Control Center</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-purple-300/80 font-mono">superadmin@brandoseye.com</span>
            <button
              onClick={handleAdminLogout}
              className="rounded-lg bg-slate-900 border border-slate-800 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-slate-950">{children}</main>
      </div>
    </div>
  );
}
