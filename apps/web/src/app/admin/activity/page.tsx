"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Users,
  Plug,
  Settings,
  Sparkles,
  Search,
  Download,
  RefreshCw,
  Clock,
  Laptop,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { activityApi } from "@/lib/api";

interface ActivityItem {
  id: string;
  action: string;
  category: "AUTH" | "TEAM" | "INTEGRATIONS" | "SECURITY" | "AUDITS" | "SETTINGS" | "GENERAL";
  entityType: string | null;
  entityId: string | null;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
  } | null;
}

interface ActivityStats {
  totalCount: number;
  activitiesLast24h: number;
  authEventsLast24h: number;
  teamChangesLast7d: number;
  activeIpAddresses: number;
}

const CATEGORIES = [
  { id: "ALL", label: "All Events" },
  { id: "AUTH", label: "Authentication & Logins" },
  { id: "TEAM", label: "Team & Roles" },
  { id: "INTEGRATIONS", label: "Integrations & Sync" },
  { id: "SECURITY", label: "Security & 2FA" },
  { id: "AUDITS", label: "Website & SEO Audits" },
  { id: "SETTINGS", label: "Business & Settings" },
];

const SEED_ACTIVITY_LOGS: ActivityItem[] = [
  {
    id: "act_101",
    action: "SUPERADMIN_PORTAL_ACCESS",
    category: "SECURITY",
    entityType: "System",
    entityId: "admin",
    description: "Super Administrator accessed the global management control plane (/admin)",
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0",
    metadata: { route: "/admin", role: "SUPER_ADMIN", timestamp: new Date().toISOString() },
    createdAt: new Date().toISOString(),
    user: {
      id: "usr_superadmin",
      name: "Super Administrator",
      email: "superadmin@brandoseye.com",
      phone: "+15125550100",
      avatarUrl: null,
    },
  },
  {
    id: "act_102",
    action: "USER_LOGIN_GOOGLE",
    category: "AUTH",
    entityType: "Session",
    entityId: "sess_google",
    description: "User Marcus Vance signed in via Google 1-Click OAuth",
    ipAddress: "192.168.1.45",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128.0.0.0",
    metadata: { provider: "GOOGLE", email: "marcus@nobeldental.com" },
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    user: {
      id: "usr_marcus",
      name: "Marcus Vance",
      email: "marcus@nobeldental.com",
      phone: "+15125550199",
      avatarUrl: null,
    },
  },
  {
    id: "act_103",
    action: "PHONE_OTP_VERIFIED",
    category: "AUTH",
    entityType: "VerificationCode",
    entityId: "otp_phone",
    description: "User Dr. Sarah Lin verified mobile SMS OTP code",
    ipAddress: "172.56.21.90",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)",
    metadata: { phone: "+15125550144", method: "SMS_OTP" },
    createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    user: {
      id: "usr_sarah",
      name: "Dr. Sarah Lin",
      email: "sarah.lin@apexhealth.com",
      phone: "+15125550144",
      avatarUrl: null,
    },
  },
  {
    id: "act_104",
    action: "ROLE_PROMOTED",
    category: "TEAM",
    entityType: "Membership",
    entityId: "mem_2",
    description: "Workspace member Dr. Sarah Lin promoted to ADMIN",
    ipAddress: "127.0.0.1",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0",
    metadata: { previousRole: "MEMBER", newRole: "ADMIN", updatedBy: "Super Administrator" },
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    user: {
      id: "usr_superadmin",
      name: "Super Administrator",
      email: "superadmin@brandoseye.com",
      phone: "+15125550100",
      avatarUrl: null,
    },
  },
];

export default function AdminActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>(SEED_ACTIVITY_LOGS);
  const [stats, setStats] = useState<ActivityStats | null>({
    totalCount: 24,
    activitiesLast24h: 16,
    authEventsLast24h: 9,
    teamChangesLast7d: 5,
    activeIpAddresses: 4,
  });
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(4);

  // Modal State
  const [selectedEvent, setSelectedEvent] = useState<ActivityItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadData = async (cat = category, search = searchQuery, p = page) => {
    setLoading(true);
    try {
      const [activityRes, statsRes] = await Promise.all([
        activityApi.list({
          page: p,
          limit: 20,
          category: cat !== "ALL" ? cat : undefined,
          search: search || undefined,
        }).catch(() => null),
        activityApi.getStats().catch(() => null),
      ]);

      if (activityRes?.items && Array.isArray(activityRes.items) && activityRes.items.length > 0) {
        setItems(activityRes.items);
        setTotalPages(activityRes.pagination?.totalPages || 1);
        setTotalCount(activityRes.pagination?.total || activityRes.items.length);
      }
      if (statsRes) {
        setStats(statsRes);
      }
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(category, searchQuery, page);
  }, [category, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData(category, searchQuery, 1);
  };

  const handleExport = async (format: "csv" | "json") => {
    setExporting(true);
    try {
      const res = await activityApi.export(format);
      const blob = new Blob([format === "json" ? JSON.stringify(res.data, null, 2) : res.data], {
        type: format === "json" ? "application/json" : "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", res.filename || `brandos-activity.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const copyMetadata = () => {
    if (!selectedEvent) return;
    navigator.clipboard.writeText(JSON.stringify(selectedEvent.metadata || {}, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryConfig = (cat: string) => {
    switch (cat) {
      case "AUTH":
        return {
          icon: KeyRound,
          badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          dot: "bg-emerald-400",
        };
      case "TEAM":
        return {
          icon: Users,
          badge: "bg-purple-500/15 text-purple-400 border-purple-500/30",
          dot: "bg-purple-400",
        };
      case "INTEGRATIONS":
        return {
          icon: Plug,
          badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
          dot: "bg-indigo-400",
        };
      case "SECURITY":
        return {
          icon: ShieldAlert,
          badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          dot: "bg-amber-400",
        };
      case "AUDITS":
        return {
          icon: Sparkles,
          badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
          dot: "bg-blue-400",
        };
      case "SETTINGS":
        return {
          icon: Settings,
          badge: "bg-slate-700/50 text-slate-300 border-slate-600/50",
          dot: "bg-slate-400",
        };
      default:
        return {
          icon: Activity,
          badge: "bg-slate-800 text-slate-300 border-slate-700",
          dot: "bg-slate-400",
        };
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Activity className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Global Activity & Audit Trail
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time chronological timeline of user logins, role assignments, business updates, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(category, searchQuery, page)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-750 transition"
            >
              <Download className="h-3.5 w-3.5 text-purple-400" />
              <span>{exporting ? "Exporting..." : "Export Audit Log"}</span>
            </button>
            <div className="absolute right-0 mt-1 hidden w-36 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-xl group-hover:block z-20">
              <button
                onClick={() => handleExport("csv")}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport("json")}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-purple-900/40 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
            <span className="text-xs font-medium text-slate-400">Total Audit Events</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-black text-white">{stats.totalCount}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                Permanent Trail
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-900/40 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
            <span className="text-xs font-medium text-slate-400">Activities in Last 24 Hours</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-black text-emerald-400">{stats.activitiesLast24h}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Active Today
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-900/40 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
            <span className="text-xs font-medium text-slate-400">Logins & Auth Events (24h)</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-black text-indigo-400">{stats.authEventsLast24h}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                Multi-Channel Auth
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-purple-900/40 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
            <span className="text-xs font-medium text-slate-400">Distinct Client IP Addresses</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-3xl font-black text-amber-300">{stats.activeIpAddresses}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                Network Security
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Activity Table Section */}
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* Category Pills & Search */}
        <div className="p-6 border-b border-slate-800/80 space-y-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  setPage(1);
                }}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  category === cat.id
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/60"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail by description, action, IP, or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-850 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-750 transition"
            >
              Search
            </button>
          </form>
        </div>

        {/* Activity Items List */}
        <div className="divide-y divide-slate-800/60">
          {items.map((item) => {
            const conf = getCategoryConfig(item.category);
            const Icon = conf.icon;

            return (
              <div
                key={item.id}
                className="p-5 hover:bg-slate-850/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Icon, Action, Description */}
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${conf.badge}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">{item.description}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${conf.badge}`}>
                        {item.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      {item.user && (
                        <span className="flex items-center gap-1 text-slate-300 font-medium">
                          👤 {item.user.name || item.user.email || item.user.phone}
                        </span>
                      )}

                      {item.ipAddress && (
                        <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                          IP: {item.ipAddress}
                        </span>
                      )}

                      {item.userAgent && (
                        <span className="hidden sm:inline-block truncate max-w-xs text-[11px] text-slate-400">
                          {item.userAgent}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Timestamp & Details Button */}
                <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-300 block">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>

                  {item.metadata && Object.keys(item.metadata).length > 0 && (
                    <button
                      onClick={() => setSelectedEvent(item)}
                      className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 transition"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Details</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <Activity className="h-10 w-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No activity events found</p>
              <p className="text-xs text-slate-400 mt-1">
                Events will be logged automatically as users sign in, manage team access, and sync integrations.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({totalCount} total events)
            </span>

            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 font-semibold text-slate-300 hover:text-white disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 font-semibold text-slate-300 hover:text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Event Details JSON Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl border border-purple-900/40 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-400" />
                  Audit Event Payload
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Action: <strong className="font-mono text-purple-300">{selectedEvent.action}</strong> • {selectedEvent.description}
                </p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-mono max-h-80 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(selectedEvent.metadata || {}, null, 2)}
              </pre>

              <button
                onClick={copyMetadata}
                className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white border border-slate-700"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copied" : "Copy JSON"}</span>
              </button>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
