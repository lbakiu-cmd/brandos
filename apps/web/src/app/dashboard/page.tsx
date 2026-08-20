"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch, authApi } from "@/lib/api";

type User = {
  id: string;
  email: string;
  name: string | null;
  memberships: Array<{ role: string; business: { id: string; name: string; website?: string | null; city?: string | null; industry?: string | null } }>;
};

type FixPayload = {
  actionType: string;
  filename?: string;
  code: string;
  instructions: string;
};

type Recommendation = {
  id: string;
  category: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string | null;
  actionType?: string | null;
  actionPayload?: FixPayload | null;
  expectedImpact: number;
  estimatedEffort: number;
  status: "OPEN" | "DONE" | "DISMISSED";
  completedAt?: string | null;
};

type CompositeOverview = {
  composite: {
    overallScore: number;
    grade: string;
    gradeLabel: string;
    gradeColor: string;
    pillars: {
      website: { score: number; weightPercent: number; status: string };
      gbp: { score: number; weightPercent: number; status: string };
      aiVisibility: { score: number; weightPercent: number; status: string };
      social: { score: number; weightPercent: number; status: string };
    };
  };
  latestWeb: { id: string; score: number | null; url: string; status: string } | null;
  latestGbp: { id: string; score: number | null; status: string; metrics: any } | null;
  latestSocial: { id: string; score: number | null; status: string; metrics: any } | null;
  latestAi: { id: string; overallScore: number | null; mentions: any } | null;
  recommendations: Recommendation[];
  stats: { totalRecs: number; openRecs: number; doneRecs: number };
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<CompositeOverview | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [selectedFix, setSelectedFix] = useState<Recommendation | null>(null);
  const [copied, setCopied] = useState(false);
  const [auditing, setAuditing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const overview = await apiFetch<CompositeOverview>("/audits/overview");
      setData(overview);
    } catch {
      // Ignored if unauthenticated
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await authApi.me();
        setUser(me.user);
        await refresh();
      } catch {
        window.location.href = "/login";
      }
    })();
  }, [refresh]);

  async function runFullAudit() {
    setAuditing(true);
    try {
      await apiFetch("/audits/omnichannel", { method: "POST" });
      setTimeout(refresh, 1500);
      setTimeout(refresh, 4000);
    } finally {
      setTimeout(() => setAuditing(false), 2000);
    }
  }

  async function toggleStatus(id: string, newStatus: "OPEN" | "DONE" | "DISMISSED") {
    try {
      await apiFetch(`/audits/recommendations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await refresh();
    } catch (err) {
      console.error(err);
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></span>
          <span>Loading BrandOS Workspace…</span>
        </div>
      </main>
    );
  }

  const primaryBiz = user.memberships[0]?.business;
  const composite = data?.composite;
  const overall = composite?.overallScore ?? 0;
  const recs = data?.recommendations ?? [];

  const filteredRecs = recs.filter((r) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "OPEN") return r.status === "OPEN";
    if (activeTab === "HIGH_PRIORITY") return r.priority === "HIGH" && r.status === "OPEN";
    if (activeTab === "WEBSITE") return r.category === "TECHNICAL" || r.category === "AI_READINESS";
    if (activeTab === "GBP") return r.category === "LOCAL_SEO" || r.title.includes("Google");
    if (activeTab === "SOCIAL") return r.category === "SOCIAL_PRESENCE";
    if (activeTab === "DONE") return r.status === "DONE";
    return true;
  });

  const getScoreColor = (s: number) =>
    s >= 75 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-rose-400";

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      {/* Top Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              {primaryBiz?.name ?? "Command Center"}
            </h1>
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-0.5 text-xs font-semibold text-blue-400">
              {user.memberships[0]?.role ?? "OWNER"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {primaryBiz?.city ? `${primaryBiz.city} · ` : ""}
            {primaryBiz?.industry ?? "Local Business"}
            {primaryBiz?.website ? ` · ${primaryBiz.website}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/copilot"
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-bold text-indigo-400 transition hover:bg-indigo-500/20"
          >
            <span>🤖</span>
            <span>AI Copilot</span>
          </Link>

          <Link
            href="/dashboard/prospector"
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20"
          >
            <span>🎯</span>
            <span>Prospector</span>
          </Link>

          <Link
            href="/dashboard/clients"
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <span>🏢</span>
            <span>Clients</span>
          </Link>

          <Link
            href="/dashboard/competitors"
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <span>🥊</span>
            <span>Competitors</span>
          </Link>

          <Link
            href="/dashboard/reviews"
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <span>💬</span>
            <span>AI Reviews</span>
          </Link>

          <Link
            href="/dashboard/billing"
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <span>💳</span>
            <span>Billing</span>
          </Link>

          <Link
            href="/dashboard/report"
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <span>📄</span>
            <span>PDF Report</span>
          </Link>

          <button
            onClick={runFullAudit}
            disabled={auditing}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
          >
            {auditing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Auditing Channels…</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Run Full Business Audit</span>
              </>
            )}
          </button>

          <button
            onClick={async () => {
              await authApi.logout();
              window.location.href = "/login";
            }}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Hero: Master Unified Score Card */}
      <section className="mb-10 overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-8 shadow-2xl">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="flex flex-col items-center justify-center border-b border-slate-800/80 pb-6 text-center lg:col-span-4 lg:border-r lg:border-b-0 lg:pb-0 lg:pr-8">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              BrandOS Visibility & Health Score
            </p>
            <div className="relative my-4 flex h-36 w-36 items-center justify-center rounded-full border-4 border-slate-800 bg-slate-950/80 shadow-inner">
              <span className={`text-6xl font-black ${getScoreColor(overall)}`}>
                {overall}
              </span>
              <span className="absolute -bottom-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-0.5 text-xs font-bold text-slate-200">
                {composite?.grade ?? "—"}
              </span>
            </div>
            <p className="text-sm font-semibold text-white">
              {composite?.gradeLabel ?? "Audit Pending"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Weighted composite across all 4 customer discovery channels
            </p>
          </div>

          {/* 4 Pillars Mini-Dashboard */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
            {/* Website Pillar */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">🌐 Website AI Readiness</span>
                <span className="text-xs font-bold text-slate-500">30% wt</span>
              </div>
              <p className={`mt-2 text-3xl font-extrabold ${getScoreColor(composite?.pillars.website.score ?? 0)}`}>
                {data?.latestWeb?.score ?? "—"}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Schema · llms.txt · SEO</span>
                <Link href="/dashboard/audit" className="font-semibold text-blue-400 hover:underline">
                  View Audit →
                </Link>
              </div>
            </div>

            {/* Google Profile Pillar */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">📍 Google Business Profile</span>
                <span className="text-xs font-bold text-slate-500">25% wt</span>
              </div>
              <p className={`mt-2 text-3xl font-extrabold ${getScoreColor(composite?.pillars.gbp.score ?? 0)}`}>
                {data?.latestGbp?.score ?? "—"}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Reviews · Hours · NAP</span>
                <Link href="/dashboard/audit" className="font-semibold text-blue-400 hover:underline">
                  Optimize →
                </Link>
              </div>
            </div>

            {/* AI Search Visibility Pillar */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">🔮 AI Engine Visibility</span>
                <span className="text-xs font-bold text-slate-500">25% wt</span>
              </div>
              <p className={`mt-2 text-3xl font-extrabold ${getScoreColor(composite?.pillars.aiVisibility.score ?? 0)}`}>
                {data?.latestAi?.overallScore != null ? `${data.latestAi.overallScore}%` : "—"}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">ChatGPT · Claude · Gemini</span>
                <Link href="/dashboard/visibility" className="font-semibold text-blue-400 hover:underline">
                  Test Models →
                </Link>
              </div>
            </div>

            {/* Social Presence Pillar */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">📱 Social & Omnichannel</span>
                <span className="text-xs font-bold text-slate-500">20% wt</span>
              </div>
              <p className={`mt-2 text-3xl font-extrabold ${getScoreColor(composite?.pillars.social.score ?? 0)}`}>
                {data?.latestSocial?.score ?? "—"}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Instagram · Facebook · Inbox</span>
                <Link href="/dashboard/content" className="font-semibold text-blue-400 hover:underline">
                  Studio →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Actionable Suggestions & Fixes Engine */}
      <section className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-md">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">Prioritized Improvement Tasks</h2>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-400">
                {data?.stats.openRecs ?? 0} Action Items
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              High-impact fixes designed to systematically increase your score across AI and local search.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {[
              { id: "ALL", label: "All Items" },
              { id: "OPEN", label: "Active" },
              { id: "HIGH_PRIORITY", label: "⚡ High Priority" },
              { id: "WEBSITE", label: "🌐 Website" },
              { id: "GBP", label: "📍 Google Profile" },
              { id: "SOCIAL", label: "📱 Social" },
              { id: "DONE", label: "✔ Completed" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task Cards Grid */}
        <div className="space-y-3">
          {filteredRecs.map((rec) => (
            <div
              key={rec.id}
              className={`flex flex-col justify-between gap-4 rounded-2xl border p-5 transition md:flex-row md:items-center ${
                rec.status === "DONE"
                  ? "border-emerald-500/20 bg-emerald-950/10 opacity-70"
                  : "border-slate-800 bg-slate-900/90 hover:border-slate-700"
              }`}
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      rec.priority === "HIGH"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : rec.priority === "MEDIUM"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {rec.priority} PRIORITY
                  </span>

                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                    +{rec.expectedImpact} Score Pts
                  </span>

                  <span className="text-[10px] text-slate-500">
                    ⏱ ~{rec.estimatedEffort} mins effort
                  </span>
                </div>

                <h3 className="mt-2 text-base font-semibold text-white">
                  {rec.title}
                </h3>
                {rec.description && (
                  <p className="mt-1 text-xs text-slate-400">{rec.description}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {rec.actionPayload && (
                  <button
                    onClick={() => setSelectedFix(rec)}
                    className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-400 transition hover:bg-blue-500/20"
                  >
                    <span>⚡</span>
                    <span>View & Copy Fix</span>
                  </button>
                )}

                {rec.status === "OPEN" ? (
                  <button
                    onClick={() => toggleStatus(rec.id, "DONE")}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20"
                  >
                    ✔ Mark Done
                  </button>
                ) : (
                  <button
                    onClick={() => toggleStatus(rec.id, "OPEN")}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    ↩ Reopen
                  </button>
                )}

                {rec.status === "OPEN" && (
                  <button
                    onClick={() => toggleStatus(rec.id, "DISMISSED")}
                    className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-500 hover:text-slate-300"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredRecs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
              No tasks found for this filter. Run an audit to generate suggestions.
            </div>
          )}
        </div>
      </section>

      {/* Interactive Fix Modal / Drawer */}
      {selectedFix && selectedFix.actionPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Ready-to-Use Artifact
                </span>
                <h3 className="text-lg font-bold text-white">{selectedFix.title}</h3>
              </div>
              <button
                onClick={() => setSelectedFix(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-3">
                {selectedFix.actionPayload.instructions}
              </p>

              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{selectedFix.actionPayload.filename ?? "snippet.txt"}</span>
                  <button
                    onClick={() => handleCopy(selectedFix.actionPayload!.code)}
                    className="rounded-md bg-blue-600/20 px-2.5 py-1 font-semibold text-blue-400 hover:bg-blue-600 hover:text-white transition"
                  >
                    {copied ? "✔ Copied!" : "📋 Copy Snippet"}
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto text-xs text-slate-300 font-mono">
                  {selectedFix.actionPayload.code}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => {
                  toggleStatus(selectedFix.id, "DONE");
                  setSelectedFix(null);
                }}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
              >
                ✔ Mark Task as Completed
              </button>
              <button
                onClick={() => setSelectedFix(null)}
                className="rounded-xl border border-slate-800 px-4 py-2.5 text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}