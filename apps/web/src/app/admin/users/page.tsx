"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Mail,
  Laptop,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  KeyRound,
  Trash2,
  UserX,
  UserCheck,
  Globe,
  Sparkles,
} from "lucide-react";
import { usersApi } from "@/lib/api";

type RoleType = "SUPER_ADMIN" | "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

interface MemberItem {
  membershipId: string;
  role: RoleType;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    authProvider: string;
    status: string;
    isSuperAdmin?: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    activeSessionsCount: number;
    activityCount: number;
  };
}

interface SessionItem {
  id: string;
  ip: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
}

const SEED_PLATFORM_USERS = [
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

const SEED_WORKSPACE_MEMBERS: MemberItem[] = [
  {
    membershipId: "mem_1",
    role: "SUPER_ADMIN",
    joinedAt: new Date().toISOString(),
    user: {
      id: "usr_superadmin",
      name: "Super Administrator",
      email: "superadmin@brandoseye.com",
      phone: "+15125550100",
      avatarUrl: null,
      authProvider: "EMAIL",
      status: "ACTIVE",
      isSuperAdmin: true,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      activeSessionsCount: 1,
      activityCount: 12,
    },
  },
  {
    membershipId: "mem_2",
    role: "ADMIN",
    joinedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    user: {
      id: "usr_sarah",
      name: "Dr. Sarah Lin",
      email: "sarah.lin@apexhealth.com",
      phone: "+15125550144",
      avatarUrl: null,
      authProvider: "PHONE",
      status: "ACTIVE",
      isSuperAdmin: false,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      activeSessionsCount: 1,
      activityCount: 8,
    },
  },
];

export default function AdminUsersPage() {
  const [members, setMembers] = useState<MemberItem[]>(SEED_WORKSPACE_MEMBERS);
  const [allPlatformUsers, setAllPlatformUsers] = useState<any[]>(SEED_PLATFORM_USERS);
  const [viewMode, setViewMode] = useState<"platform" | "workspace">("platform");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Invite Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteType, setInviteType] = useState<"email" | "phone">("email");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<RoleType>("ADMIN");
  const [inviteLoading, setInviteLoading] = useState(false);

  // Sessions Modal
  const [activeSessionUser, setActiveSessionUser] = useState<MemberItem["user"] | null>(null);
  const [userSessions, setUserSessions] = useState<SessionItem[]>([
    {
      id: "sess_current",
      ip: "127.0.0.1",
      userAgent: "Mozilla/5.0 Chrome/128.0.0.0 (Windows NT 10.0; Win64; x64)",
      expiresAt: new Date(Date.now() + 3600000 * 24 * 30).toISOString(),
      createdAt: new Date().toISOString(),
    },
  ]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Feedback Messages
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, platformData] = await Promise.all([
        usersApi.list().catch(() => null),
        usersApi.listAll().catch(() => null),
      ]);

      if (membersData && Array.isArray(membersData) && membersData.length > 0) {
        setMembers(membersData as MemberItem[]);
      }
      if (platformData && Array.isArray(platformData) && platformData.length > 0) {
        setAllPlatformUsers(platformData);
      }
    } catch (err: any) {
      console.error("Failed to load users from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Invite Submission
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setInviteLoading(true);

    try {
      await usersApi.invite({
        email: inviteType === "email" ? inviteEmail : undefined,
        phone: inviteType === "phone" ? invitePhone : undefined,
        name: inviteName || undefined,
        role: inviteRole,
      });

      setSuccessMsg(`User invited successfully as ${inviteRole}.`);
      setIsInviteOpen(false);
      setInviteEmail("");
      setInvitePhone("");
      setInviteName("");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to invite user.");
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle Role Change
  const handleRoleChange = async (userId: string, newRole: RoleType) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await usersApi.updateRole(userId, newRole);
      setSuccessMsg(`Role updated to ${newRole}`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update role.");
    }
  };

  // Handle Status Toggle (Active / Suspended)
  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await usersApi.updateStatus(userId, newStatus);
      setSuccessMsg(`User status changed to ${newStatus}`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update user status.");
    }
  };

  // Handle Member Removal
  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this workspace?`)) return;
    setErrorMsg("");
    setSuccessMsg("");
    try {
      await usersApi.remove(userId);
      setSuccessMsg(`Removed ${name} from workspace.`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove member.");
    }
  };

  // View User Sessions
  const handleViewSessions = async (user: MemberItem["user"]) => {
    setActiveSessionUser(user);
    setSessionsLoading(true);
    try {
      const sessions = await usersApi.getSessions(user.id);
      setUserSessions(sessions);
    } catch (err) {
      setUserSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Revoke Specific Session
  const handleRevokeSession = async (sessionId: string) => {
    try {
      await usersApi.revokeSession(sessionId);
      if (activeSessionUser) {
        setUserSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
      setSuccessMsg("Session revoked successfully.");
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to revoke session.");
    }
  };

  const getInitials = (name?: string | null, fallback?: string | null) => {
    const target = name || fallback || "User";
    const parts = target.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getRoleBadge = (role: RoleType) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold shadow-sm shadow-purple-500/20";
      case "OWNER":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "ADMIN":
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
      case "MEMBER":
        return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
      case "VIEWER":
        return "bg-slate-700/50 text-slate-300 border-slate-600/50";
    }
  };

  const getProviderIcon = (provider?: string) => {
    switch (provider?.toUpperCase()) {
      case "GOOGLE":
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
            <svg className="h-3 w-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            Google
          </span>
        );
      case "PHONE":
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <Smartphone className="h-3 w-3" />
            SMS OTP
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
            <Mail className="h-3 w-3" />
            Email
          </span>
        );
    }
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      (m.user.name && m.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.user.email && m.user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.user.phone && m.user.phone.includes(searchQuery));
    const matchesRole = roleFilter === "ALL" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredPlatformUsers = allPlatformUsers.filter((u) => {
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(searchQuery));
    return matchesSearch;
  });

  const totalUsers = allPlatformUsers.length;
  const activeSessionsTotal = allPlatformUsers.reduce((acc, u) => acc + (u.activeSessionsCount || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Users className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              User Management & Platform Directory
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Inspect all registered platform users, assign Super Admin and Owner privileges, monitor live sessions, and invite team members.
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

          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition"
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite New User / Admin</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/50 border border-emerald-800/60 p-4 text-xs text-emerald-200 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-950/50 border border-rose-800/60 p-4 text-xs text-rose-200 animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-purple-900/40 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
          <span className="text-xs font-medium text-slate-400">Total Registered Users</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{totalUsers}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold">
              Global Platform
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-900/40 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
          <span className="text-xs font-medium text-slate-400">Active Live Sessions</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-400">{activeSessionsTotal}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Live Devices
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-900/40 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
          <span className="text-xs font-medium text-slate-400">Workspace Members</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-black text-blue-400">{members.length}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
              Headquarters
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-purple-900/40 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl">
          <span className="text-xs font-medium text-slate-400">Auth Channels Active</span>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold">Google</span>
            <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">SMS OTP</span>
            <span className="text-xs px-2 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold">Email</span>
          </div>
        </div>
      </div>

      {/* Main Members Section */}
      <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 shadow-2xl backdrop-blur-2xl overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-6 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-850 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher (Platform Directory vs Workspace Team) */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                onClick={() => setViewMode("platform")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  viewMode === "platform"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Platform Directory ({allPlatformUsers.length})
              </button>
              <button
                onClick={() => setViewMode("workspace")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  viewMode === "workspace"
                    ? "bg-purple-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Workspace Team ({members.length})
              </button>
            </div>
          </div>
        </div>

        {/* Platform Directory Table View */}
        {viewMode === "platform" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-[11px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800/80">
                <tr>
                  <th className="py-4 px-6">User & Identity</th>
                  <th className="py-4 px-6">Auth Channel</th>
                  <th className="py-4 px-6">Assigned Workspaces & Roles</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Live Sessions</th>
                  <th className="py-4 px-6">Created Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPlatformUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/50 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 font-bold text-white text-xs border border-purple-400/30">
                          {getInitials(u.name, u.email || u.phone)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            <span>{u.name || "Unnamed"}</span>
                            {u.isSuperAdmin && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                                👑 SUPER_ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-xs">{u.email || u.phone}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">{getProviderIcon(u.authProvider)}</td>

                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5">
                        {u.businesses?.map((b: any) => (
                          <span
                            key={b.id}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-700"
                          >
                            <span className="font-medium">{b.name}</span>
                            <span className="text-[10px] text-purple-300 font-semibold uppercase">({b.role})</span>
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          u.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${u.status === "ACTIVE" ? "bg-emerald-400" : "bg-rose-400"}`} />
                        {u.status || "ACTIVE"}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleViewSessions(u)}
                        className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 transition"
                      >
                        <Laptop className="h-3.5 w-3.5" />
                        <span>{u.activeSessionsCount || 0} active</span>
                      </button>
                    </td>

                    <td className="py-4 px-6 text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleStatusToggle(u.id, u.status)}
                          title={u.status === "ACTIVE" ? "Suspend user access" : "Activate user access"}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          {u.status === "ACTIVE" ? (
                            <UserX className="h-4 w-4 text-amber-400" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-emerald-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Workspace Members Table View */}
        {viewMode === "workspace" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-[11px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800/80">
                <tr>
                  <th className="py-4 px-6">User & Identity</th>
                  <th className="py-4 px-6">Auth Channel</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Live Sessions</th>
                  <th className="py-4 px-6">Joined Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMembers.map((item) => (
                  <tr key={item.membershipId} className="hover:bg-slate-850/50 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 font-bold text-white text-xs border border-purple-400/30">
                          {getInitials(item.user.name, item.user.email || item.user.phone)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            <span>{item.user.name || "Unnamed"}</span>
                            {item.role === "SUPER_ADMIN" && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                                👑 SUPER_ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-xs">{item.user.email || item.user.phone}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">{getProviderIcon(item.user.authProvider)}</td>

                    <td className="py-4 px-6">
                      <select
                        value={item.role}
                        onChange={(e) => handleRoleChange(item.user.id, e.target.value as RoleType)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold outline-none transition bg-slate-900 cursor-pointer ${getRoleBadge(
                          item.role
                        )}`}
                      >
                        <option value="SUPER_ADMIN">👑 SUPER_ADMIN</option>
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          item.user.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${item.user.status === "ACTIVE" ? "bg-emerald-400" : "bg-rose-400"}`} />
                        {item.user.status || "ACTIVE"}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleViewSessions(item.user)}
                        className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 transition"
                      >
                        <Laptop className="h-3.5 w-3.5" />
                        <span>{item.user.activeSessionsCount || 0} active</span>
                      </button>
                    </td>

                    <td className="py-4 px-6 text-slate-400">
                      {new Date(item.joinedAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleStatusToggle(item.user.id, item.user.status)}
                          title={item.user.status === "ACTIVE" ? "Suspend user access" : "Activate user access"}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        >
                          {item.user.status === "ACTIVE" ? (
                            <UserX className="h-4 w-4 text-amber-400" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-emerald-400" />
                          )}
                        </button>

                        <button
                          onClick={() => handleRemoveMember(item.user.id, item.user.name || item.user.email || "this user")}
                          title="Remove user from workspace"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-purple-900/40 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-400" />
                Invite User / Administrator
              </h2>
              <button onClick={() => setIsInviteOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setInviteType("email")}
                  className={`py-2 text-xs font-semibold rounded-lg transition ${
                    inviteType === "email" ? "bg-slate-800 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Invite by Email
                </button>
                <button
                  type="button"
                  onClick={() => setInviteType("phone")}
                  className={`py-2 text-xs font-semibold rounded-lg transition ${
                    inviteType === "phone" ? "bg-slate-800 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Invite by Phone
                </button>
              </div>

              {inviteType === "email" ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@yourcompany.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (512) 555-0199"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Marcus Vance"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Assigned Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["SUPER_ADMIN", "ADMIN", "MEMBER", "VIEWER"] as RoleType[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInviteRole(r)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        inviteRole === r
                          ? "border-purple-500 bg-purple-500/10 text-white"
                          : "border-slate-800 bg-slate-850 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{r === "SUPER_ADMIN" ? "👑 SUPER_ADMIN" : r}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {r === "SUPER_ADMIN" && "Global system authority"}
                        {r === "ADMIN" && "Full management rights"}
                        {r === "MEMBER" && "Audits & recommendations"}
                        {r === "VIEWER" && "Read-only access"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition disabled:opacity-50"
                >
                  {inviteLoading ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Sessions Modal */}
      {activeSessionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl border border-purple-900/40 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Laptop className="h-5 w-5 text-purple-400" />
                  Active Sessions: {activeSessionUser.name || activeSessionUser.email}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Currently connected devices and login sessions for this user.
                </p>
              </div>
              <button onClick={() => setActiveSessionUser(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {sessionsLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
                <span>Loading active sessions...</span>
              </div>
            ) : userSessions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No active device sessions found.</div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {userSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-850 border border-slate-800">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-0.5">
                        <Laptop className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{session.userAgent || "Web Browser"}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          IP: <strong className="text-slate-300 font-mono">{session.ip || "127.0.0.1"}</strong> • Logged in:{" "}
                          {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-800">
              <button
                onClick={() => setActiveSessionUser(null)}
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
