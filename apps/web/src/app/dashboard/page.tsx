"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

type User = {
  id: string;
  email: string;
  name: string | null;
  memberships: Array<{
    role: string;
    business: { id: string; name: string };
  }>;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900">
        <p className="text-slate-400">Loading your workspace…</p>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-400">BrandOS</h1>
        <div className="flex items-center gap-4">
          <span className="text-slate-300">{user.email}</span>
          <button
            onClick={async () => {
              await authApi.logout();
              router.push("/login");
            }}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
          >
            Log out
          </button>
        </div>
      </header>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Your Businesses</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {user.memberships.map((m) => (
            <div key={m.business.id} className="rounded-2xl bg-slate-800 p-6">
              <p className="text-lg font-semibold">{m.business.name}</p>
              <p className="mt-1 text-sm text-slate-400">Role: {m.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">AI Visibility</h2>
        <div className="rounded-2xl bg-slate-800 p-6">
          <p className="text-5xl font-bold text-blue-400">—</p>
          <p className="mt-2 text-sm text-slate-400">
            Your first AI Visibility audit will appear here once the audit engine ships.
          </p>
        </div>
      </section>
    </main>
  );
}