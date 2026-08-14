const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  me: () => apiFetch<{ user: any }>("/auth/me"),
  logout: () => apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" }),
};