"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  Activity,
  Building2,
  Laptop,
  ArrowRight,
  RefreshCw,
  KeyRound,
  Sparkles,
  Smartphone,
  Mail,
  UserPlus,
  FileText,
  Clock,
  Terminal,
} from "lucide-react";
import { usersApi, activityApi, apiFetch } from "@/lib/api";

const FALLBACK_USERS = [
  {
    id: "usr_superadmin",
    name: "Super Administrator",
    email: "superadmin@brandoseye.com",
    phone: "+15125550100",
    authProvider: "EMAIL",
    status: "ACTIVE",
    isSuperAdmin: true,
    activeSessionsCount: 1,
    createdAt: new Date().toISOString(),
    businesses: [{ id: "biz_hq", name: "BrandOS Global Headquarters", role: "SUPER_ADMIN" }],
  },
  {
    id: "usr_marcus",
    name: "Marcus Vance",
    email: "marcus@nobeldental.com",
    phone: "+15125550199",
    authProvider: "GOOGLE",
    status: "ACTIVE",
    isSuperAdmin: false,
    activeSessionsCount: 1,
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    businesses: [{ id: "biz_1", name: "Nobel Dental Clinic", role: "OWNER" }],
  },
  {
    id: "usr_sarah",
    name: "Dr. Sarah Lin",
    email: "sarah.lin@apexhealth.com",
    phone: "+15125550144",
    authProvider: "PHONE",
    status: "ACTIVE",
    isSuperAdmin: false,
    activeSessionsCount: 1,
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    businesses: [{ id: "biz_2", name: "Apex Health Partners", role: "ADMIN" }],
  },
];

const FALLBACK_ACTIVITIES = [
  {
    id: "act_1",
    action: "SUPERADMIN_ACCESS",
    category: "SECURITY",
    description: "Super Admin accessed global control plane (/admin)",
    ipAddress: "127.0.0.1",
    createdAt: new Date().toISOString(),
  },
  {
    id: "act_2",
    action: "USER_LOGIN_GOOGLE",
    category: "AUTH",
    description: "User Marcus Vance signed in via Google 1-Click OAuth",
    ipAddress: "192.168.1.45",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "act_3",
    action: "PHONE_OTP_VERIFIED",
    category: "AUTH",
    description: "User verified SMS OTP phone (+15125550144)",
    ipAddress: "172.56.21.90",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

export default function AdminOverviewPage() {
  const [platformUsers, setPlatformUsers] = useState<any[]>(FALLBACK_USERS);
  const [activityLogs, setActivityLogs] = useState<any[]>(FALLBACK_ACTIVITIES);
  const [stats, setStats] = useState<any>({
    totalCount: 18,
    activitiesLast24h: 12,
    authEventsLast24h: 7,
    teamChangesLast7d: 4,
    activeIpAddresses: 3,
  });
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, activityData, statsData] = await Promise.all([
        usersApi.listAll().catch(() => null),
        activityApi.list({ limit: 8 }).catch(() => null),
        activityApi.getStats().catch(() => null),
      ]);

      if (usersData && Array.isArray(usersData) && usersData.length > 0) {
        setPlatformUsers(usersData);
      }
      if (activityData?.items && Array.isArray(activityData.items) && activityData.items.length > 0) {
        setActivityLogs(activityData.items);
      }
      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to load admin overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalUsers = platformUsers.length;
  const activeSessions = platformUsers.reduce((acc, u) => acc + (u.activeSessionsCount || 0), 0);
  const superAdminsCount = platformUsers.filter((u) => u.isSuperAdmin || u.businesses?.some((b: any) => b.role === "SUPER_ADMIN")).length;

  const getProviderBadge = (provider?: string) => {
    switch (provider?.toUpperCase()) {
      case "GOOGLE":
        return <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Google</span>;
      case "PHONE":
        return <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">SMS OTP</span>;
      default:
        return <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">Email</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Super Admin Control Center
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Global management portal for registered users, security monitoring, multi-tenant workspaces, and system audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/users"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition"
          >
            <UserPlus className="h-4 w-4" />
            <span>Manage Users</span>
          </Link>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-purple-900/40 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
          <span className="text-xs font-medium text-slate-400">Total Registered Users</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{totalUsers}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold">
              Platform Total
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-900/40 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
          <span className="text-xs font-medium text-slate-400">Live Device Sessions</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-400">{activeSessions}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Online
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-900/40 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
          <span className="text-xs font-medium text-slate-400">Super Admins Active</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-purple-300">{superAdminsCount}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
              👑 Root Access
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-900/40 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
          <span className="text-xs font-medium text-slate-400">Total Audit Events</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-blue-400">{stats?.totalCount || 0}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
              Permanent Trail
            </span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/users"
          className="p-5 rounded-2xl border border-purple-900/30 bg-slate-900/60 hover:bg-slate-850 hover:border-purple-500/50 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <Users className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-white transition group-hover:translate-x-1" />
          </div>
          <h3 className="font-bold text-sm text-white mb-1">User Management & Directory</h3>
          <p className="text-xs text-slate-400">
            View all platform accounts, promote Super Admins, revoke active device sessions, and invite team members.
          </p>
        </Link>

        <Link
          href="/admin/activity"
          className="p-5 rounded-2xl border border-purple-900/30 bg-slate-900/60 hover:bg-slate-850 hover:border-indigo-500/50 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              <Activity className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-white transition group-hover:translate-x-1" />
          </div>
          <h3 className="font-bold text-sm text-white mb-1">Global Audit & Activity Trail</h3>
          <p className="text-xs text-slate-400">
            Chronological stream of all login events, IP addresses, security modifications, and CSV/JSON reporting.
          </p>
        </Link>

        <Link
          href="/admin/businesses"
          className="p-5 rounded-2xl border border-purple-900/30 bg-slate-900/60 hover:bg-slate-850 hover:border-blue-500/50 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30">
              <Building2 className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-white transition group-hover:translate-x-1" />
          </div>
          <h3 className="font-bold text-sm text-white mb-1">Client Workspaces & Tenancy</h3>
          <p className="text-xs text-slate-400">
            Inspect all provisioned business tenants, industry categories, subscription tiers, and health metrics.
          </p>
        </Link>
      </div>

      {/* Two Column Section: Users Preview & Audit Log Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Registered Users */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-400" />
              Recent User Accounts
            </h2>
            <Link href="/admin/users" className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
              View All ({totalUsers}) →
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60">
            {platformUsers.slice(0, 6).map((user) => (
              <div key={user.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-xs border border-slate-700">
                    {(user.name || user.email || "U").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{user.name || "Unnamed"}</span>
                      {user.isSuperAdmin && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          👑 SUPER_ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 text-[11px]">{user.email || user.phone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getProviderBadge(user.authProvider)}
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Audit Events */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h2 className="font-bold text-sm text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              Live Audit Stream
            </h2>
            <Link href="/admin/activity" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
              View Audit Log →
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60">
            {activityLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-start gap-2.5 overflow-hidden">
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-indigo-400 shrink-0"></span>
                  <div className="overflow-hidden">
                    <p className="font-medium text-slate-200 truncate">{log.description}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {log.action} • {log.ipAddress || "127.0.0.1"}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 shrink-0 font-mono ml-2">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}

            {activityLogs.length === 0 && (
              <div className="py-8 text-center text-slate-500 text-xs">
                No activity logs recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
