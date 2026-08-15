"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, authApi } from "@/lib/api";

type User = {
  id: string;
  email: string;
  name: string | null;
  memberships: Array<{ role: string; business: { id: string; name: string } }>;
};

type Audit = { id: string; score: number | null; status: string };
type Report = { id: string; overallScore: number | null };

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await authApi.me();
        setUser(me.user);
        const [audits, reports] = await Promise.all([
          apiFetch<Audit[]>("/audits"),
          apiFetch<Report[]>("/ai-reports"),
        ]);
        setAudit(audits.find((a) => a.status === "COMPLETED") ?? null);
        setReport(reports.find((r) => r.overallScore !== null) ?? null);
      } catch {
        window.location.href = "/login";
      }
    })();
  }, []);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900">
        <p className="text-slate-400">Loading your workspace…</p>
      </main>
    );
  }

  const scoreColor = (s: number) =>
    s >= 70 ? "text-green-400" : s >= 40 ? "text-amber-400" : "text-red-400";

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-400">BrandOS</h1>
        <div className="flex items-center gap-4">
          <span className="text-slate-300">{user.email}</span>
          <button
            onClick={async () => {
              await authApi.logout();
              window.location.href = "/login";
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
        <h2 className="mb-4 text-xl font-semibold">Command Center</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/dashboard/audit" className="rounded-2xl bg-slate-800 p-6 transition hover:bg-slate-700">
            <p className="mb-2 text-sm text-slate-400">Website Audit</p>
            <p className={`text-5xl font-bold ${audit?.score != null ? scoreColor(audit.score) : "text-slate-600"}`}>
              {audit?.score ?? "—"}
            </p>
            <p className="mt-2 text-xs text-slate-500">AI-readiness score →</p>
          </Link>

          <Link href="/dashboard/visibility" className="rounded-2xl bg-slate-800 p-6 transition hover:bg-slate-700">
            <p className="mb-2 text-sm text-slate-400">AI Visibility</p>
            <p className={`text-5xl font-bold ${report?.overallScore != null ? scoreColor(report.overallScore) : "text-slate-600"}`}>
              {report?.overallScore ?? "—"}
            </p>
            <p className="mt-2 text-xs text-slate-500">% of engines that mention you →</p>
          </Link>

          <Link href="/dashboard/inbox" className="rounded-2xl bg-slate-800 p-6 transition hover:bg-slate-700">
            <p className="mb-2 text-sm text-slate-400">Unified Inbox</p>
            <p className="text-2xl font-semibold">All channels</p>
            <p className="mt-2 text-xs text-slate-500">Instagram · Messenger · more →</p>
          </Link>

          <Link href="/dashboard/content" className="rounded-2xl bg-slate-800 p-6 transition hover:bg-slate-700">
            <p className="mb-2 text-sm text-slate-400">Content Studio</p>
            <p className="text-2xl font-semibold">Schedule & publish</p>
            <p className="mt-2 text-xs text-slate-500">BullMQ-powered pipeline →</p>
          </Link>
        </div>
      </section>
    </main>
  );
}