const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  // Only send a JSON content-type when there is actually a body
  if (options?.body) {
    headers["Content-Type"] = "application/json";
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

export const authApi = {
  register: (data: { email: string; password: string; name?: string; businessName?: string }) =>
    apiFetch<{ user: any }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    apiFetch<{ user: any }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  sendPhoneOtp: (phone: string) =>
    apiFetch<{ success: boolean; phone: string; expiresInSeconds: number; message: string; devOtp?: string }>(
      "/auth/phone/send-otp",
      { method: "POST", body: JSON.stringify({ phone }) }
    ),
  verifyPhoneOtp: (data: { phone: string; code: string; name?: string; businessName?: string }) =>
    apiFetch<{ user: any }>("/auth/phone/verify-otp", { method: "POST", body: JSON.stringify(data) }),
  googleVerify: (data: { idToken?: string; accessToken?: string; code?: string }) =>
    apiFetch<{ user: any }>("/auth/google/verify", { method: "POST", body: JSON.stringify(data) }),
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