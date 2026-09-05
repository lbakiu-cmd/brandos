const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  // Only send a JSON content-type when there is actually a body
  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  // Automatically attach active business header if available in browser
  if (typeof window !== "undefined") {
    try {
      const activeBizId = localStorage.getItem("brandos_active_business_id");
      if (activeBizId && !headers["x-business-id"]) {
        headers["x-business-id"] = activeBizId;
      }
    } catch {
      // ignore localstorage errors
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || "API request failed");
  }

  return res.json();
}

export interface BusinessItem {
  id: string;
  name: string;
  city?: string | null;
  industry?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  subscriptionTier?: string;
  role?: string;
  latestScore?: number | null;
  reviewsCount?: number;
  competitorsCount?: number;
  createdAt?: string;
}

export const businessApi = {
  list: () => apiFetch<BusinessItem[]>("/business/list"),
  current: () => apiFetch<BusinessItem>("/business"),
  switch: (businessId: string) =>
    apiFetch<{ success: boolean; business: BusinessItem }>("/business/switch", {
      method: "POST",
      body: JSON.stringify({ businessId }),
    }),
  create: (data: {
    name: string;
    city?: string;
    industry?: string;
    website?: string;
    phone?: string;
    email?: string;
  }) =>
    apiFetch<BusinessItem>("/business", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const authApi = {
  register: (data: { email: string; password: string; name?: string; businessName?: string }) =>
    apiFetch<{
      requires2fa?: boolean;
      setupRequired?: boolean;
      tempToken?: string;
      qrCodeUri?: string;
      secret?: string;
      backupCodes?: string[];
      user?: any;
      token?: string;
      message?: string;
    }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    apiFetch<{
      requires2fa?: boolean;
      setupRequired?: boolean;
      tempToken?: string;
      qrCodeUri?: string;
      secret?: string;
      backupCodes?: string[];
      user?: any;
      token?: string;
      message?: string;
    }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  verify2faSetup: (data: { tempToken: string; code: string; secret: string }) =>
    apiFetch<{ user: any; backupCodes?: string[]; message: string }>("/auth/2fa/verify-setup", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  verify2faLogin: (data: { tempToken: string; code: string }) =>
    apiFetch<{ user: any }>("/auth/2fa/verify-login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  googleVerify: (data: { idToken?: string; accessToken?: string; code?: string }) =>
    apiFetch<{
      requires2fa?: boolean;
      setupRequired?: boolean;
      tempToken?: string;
      qrCodeUri?: string;
      secret?: string;
      user?: any;
      token?: string;
    }>("/auth/google/verify", { method: "POST", body: JSON.stringify(data) }),
  getGoogleAuthUrl: (returnUrl?: string) =>
    apiFetch<{ url: string; clientId: string }>(`/auth/google/url${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`),
  me: () => apiFetch<{ user: any }>("/auth/me"),
  updateProfile: (data: { name?: string; email?: string; phone?: string }) =>
    apiFetch<{ user: any }>("/auth/profile", { method: "POST", body: JSON.stringify(data) }),
  changePassword: (data: { currentPassword?: string; newPassword?: string }) =>
    apiFetch<{ success: boolean; message: string }>("/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
  toggle2FA: (enabled: boolean) =>
    apiFetch<{ enabled: boolean; backupCodes: string[]; qrCodeUri: string | null; message: string }>("/auth/2fa/toggle", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),
  verify2FA: (code: string) =>
    apiFetch<{ verified: boolean; enabled: boolean; backupCodes: string[]; message: string }>("/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
  logout: () => apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" }),
};

export const usersApi = {
  list: () => apiFetch<Array<{ membershipId: string; role: string; joinedAt: string; user: any }>>("/users"),
  listAll: () => apiFetch<Array<any>>("/users/all"),
  invite: (data: { email?: string; phone?: string; name?: string; role?: string }) =>
    apiFetch<{ success: boolean; message: string; user: any }>("/users/invite", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateRole: (userId: string, role: string) =>
    apiFetch<{ success: boolean; role: string; message: string }>(`/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  updateStatus: (userId: string, status: string) =>
    apiFetch<{ success: boolean; status: string; message: string }>(`/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  remove: (userId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/users/${userId}`, { method: "DELETE" }),
  getSessions: (userId: string) =>
    apiFetch<Array<{ id: string; ip: string | null; userAgent: string | null; expiresAt: string; createdAt: string }>>(
      `/users/${userId}/sessions`
    ),
  revokeSession: (sessionId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/users/sessions/${sessionId}`, { method: "DELETE" }),
};

export interface VpsTelemetry {
  timestamp: string;
  vps: {
    host: string;
    domain: string;
    platform: string;
    arch: string;
    release: string;
    hostname: string;
    uptimeSeconds: number;
    loadAvg: number[];
    coresCount: number;
  };
  cpu: {
    usagePct: number;
    cores: number;
    model: string;
    speedMhz: number;
  };
  memory: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usagePct: number;
  };
  disk: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usagePct: number;
  };
  network: {
    rxKbSec: number;
    txKbSec: number;
  };
  services: Array<{
    name: string;
    pid: number;
    status: string;
    cpu: number;
    memoryMb: number;
    uptime: number;
    restarts: number;
  }>;
}

export const adminApi = {
  getVpsMetrics: () => apiFetch<VpsTelemetry>("/system/metrics"),
  resetSystem: () =>
    apiFetch<{ success: boolean; message: string; businessesRemoved: number; usersRemoved: number }>(
      "/users/admin/reset-system",
      {
        method: "POST",
        body: JSON.stringify({ confirmation: "CONFIRM_RESET_ALL_DATA" }),
      }
    ),
  deleteUser: (userId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/users/admin/users/${userId}`, {
      method: "DELETE",
    }),
  deleteBusiness: (businessId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/users/admin/businesses/${businessId}`, {
      method: "DELETE",
    }),
  resetBusinessData: (businessId: string) =>
    apiFetch<{ success: boolean; message: string }>(`/users/admin/businesses/${businessId}/reset-data`, {
      method: "POST",
    }),
};

export const activityApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    action?: string;
    userId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.category) query.set("category", params.category);
    if (params?.action) query.set("action", params.action);
    if (params?.userId) query.set("userId", params.userId);
    if (params?.search) query.set("search", params.search);
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    const qs = query.toString();
    return apiFetch<{ items: Array<any>; pagination: { total: number; page: number; limit: number; totalPages: number } }>(
      `/activity${qs ? `?${qs}` : ""}`
    );
  },
  getStats: () =>
    apiFetch<{
      totalCount: number;
      activitiesLast24h: number;
      authEventsLast24h: number;
      teamChangesLast7d: number;
      activeIpAddresses: number;
    }>("/activity/stats"),
  export: (format: "json" | "csv" = "json") =>
    apiFetch<{ data: any; format: string; filename: string }>("/activity/export", {
      method: "POST",
      body: JSON.stringify({ format }),
    }),
};