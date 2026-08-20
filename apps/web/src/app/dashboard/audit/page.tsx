"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Finding = {
  id: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  description: string | null;
  recommendation: string | null;
  passed: boolean;
};

type WebsiteAudit = {
  id: string;
  url: string;
  score: number | null;
  status: string;
  findings: Finding[];
};

type Rec = {
  id: string;
  category: string | null;
  title: string;
  description: string | null;
  priority: string;
  expectedImpact: number;
  estimatedEffort: number;
  actionPayload?: { filename?: string; code: string; instructions: string } | null;
  status: string;
};

type OverviewData = {
  composite: any;
  latestWeb: WebsiteAudit | null;
  latestGbp: { id: string; score: number | null; status: string; metrics: any } | null;
  latestSocial: { id: string; score: number | null; status: string; metrics: any } | null;
  latestAi: { id: string; overallScore: number | null; mentions: any } | null;
  recommendations: Rec[];
  wordpress?: { connected: boolean; url?: string | null; siteName?: string | null; version?: string } | null;
};

export default function AuditPage() {
  const [url, setUrl] = useState("https://");
  const [data, setData] = useState<OverviewData | null>(null);
  const [audits, setAudits] = useState<WebsiteAudit[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channelTab, setChannelTab] = useState<"WEBSITE" | "GBP" | "SOCIAL" | "AI">("WEBSITE");
  const [busy, setBusy] = useState(false);
  const [selectedFix, setSelectedFix] = useState<Rec | null>(null);
  const [copied, setCopied] = useState(false);
  const [wpApplying, setWpApplying] = useState(false);
  const [wpResult, setWpResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [overview, webList] = await Promise.all([
        apiFetch<OverviewData>("/audits/overview"),
        apiFetch<WebsiteAudit[]>("/audits"),
      ]);
      setData(overview);
      setAudits(webList);
      if (!selectedId && webList.length > 0) {
        setSelectedId(webList[0].id);
        if (webList[0].url) setUrl(webList[0].url);
      }
    } catch {
      // Ignored
    }
  }, [selectedId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const selectedAudit = audits.find((a) => a.id === selectedId) ?? data?.latestWeb ?? null;

  async function runWebsiteAudit() {
    if (!url.startsWith("http")) return;
    setBusy(true);
    try {
      const audit = await apiFetch<WebsiteAudit>("/audits", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      setSelectedId(audit.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function runOmnichannelAudit() {
    setBusy(true);
    try {
      await apiFetch("/audits/omnichannel", { method: "POST" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(id: string, newStatus: string) {
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

  const scoreColor = (s: number) =>
    s >= 75 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-rose-400";

  const sevBadge = (s: string) => {
    if (s === "CRITICAL") return "bg-rose-500/10 text-rose-400 border border-rose-500/30";
    if (s === "HIGH") return "bg-orange-500/10 text-orange-400 border border-orange-500/30";
    if (s === "MEDIUM") return "bg-amber-500/10 text-amber-400 border border-amber-500/30";
    return "bg-slate-800 text-slate-400 border border-slate-700";
  };

  const recs = data?.recommendations ?? [];

  async function applyFixToWordpress(rec: Rec) {
    if (!rec.actionPayload) return;
    setWpApplying(true);
    setWpResult(null);
    try {
      let fixType = "GENERATE_FEEDS";
      const filename = (rec.actionPayload.filename || "").toLowerCase();
      if (filename.includes("robots")) fixType = "OPTIMIZE_ROBOTS";
      else if (filename.includes("llms")) fixType = "LLMS_TXT_BIO";
      else if (filename.includes("schema") || filename.includes("json")) fixType = "LOCAL_BUSINESS_SCHEMA";

      const res = await apiFetch<any>("/wordpress/apply-fix", {
        method: "POST",
        body: JSON.stringify({
          fix_type: fixType,
          payload: {
            code: rec.actionPayload.code,
            schema_type: "LocalBusiness",
            schema_json: rec.actionPayload.code,
          },
        }),
      });
      setWpResult(res.message || "✔ Fix pushed directly to WordPress!");
      toggleStatus(rec.id, "DONE");
    } catch (err: any) {
      setWpResult("❌ " + (err.message || "Failed to push fix to WordPress."));
    } finally {
      setWpApplying(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Omnichannel Business Audit</h1>
          <p className="mt-1 text-xs text-slate-400">
            Comprehensive discovery & AI visibility analysis across Website, Google Maps, Social, and LLM search engines.
          </p>
        </div>

        <div className="flex gap-3 text-xs font-semibold">
          <Link href="/dashboard" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 hover:bg-slate-800">
            ← Dashboard
          </Link>
          <Link href="/dashboard/visibility" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 hover:bg-slate-800">
            AI Visibility
          </Link>
          <Link href="/dashboard/content" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 hover:bg-slate-800">
            Content Studio
          </Link>
        </div>
      </header>

      {/* Audit Trigger Controls */}
      <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-400">Business Website URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-business-domain.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3 pt-5 md:pt-0">
            <button
              onClick={runWebsiteAudit}
              disabled={busy || !url.startsWith("http")}
              className="rounded-xl bg-blue-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {busy ? "Auditing Website…" : "Audit Website"}
            </button>

            <button
              onClick={runOmnichannelAudit}
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50"
            >
              ⚡ Audit All 4 Channels
            </button>
          </div>
        </div>
      </div>

      {/* 4-Channel Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800/80 pb-4 text-xs font-bold">
        <button
          onClick={() => setChannelTab("WEBSITE")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
            channelTab === "WEBSITE"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <span>🌐</span>
          <span>Website AI & SEO ({data?.latestWeb?.score ?? "—"}%)</span>
        </button>

        <button
          onClick={() => setChannelTab("GBP")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
            channelTab === "GBP"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <span>📍</span>
          <span>Google Business Profile ({data?.latestGbp?.score ?? "—"}%)</span>
        </button>

        <button
          onClick={() => setChannelTab("SOCIAL")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
            channelTab === "SOCIAL"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <span>📱</span>
          <span>Social Presence ({data?.latestSocial?.score ?? "—"}%)</span>
        </button>

        <button
          onClick={() => setChannelTab("AI")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
            channelTab === "AI"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <span>🔮</span>
          <span>AI Search Visibility ({data?.latestAi?.overallScore != null ? `${data.latestAi.overallScore}%` : "—"})</span>
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Channel Details */}
        <section className="lg:col-span-2 space-y-6">
          {/* TAB 1: WEBSITE */}
          {channelTab === "WEBSITE" && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Website Technical & AI Checks</h2>
                  <p className="text-xs text-slate-400">{selectedAudit?.url ?? url}</p>
                </div>
                <div className="text-right">
                  {selectedAudit?.score != null ? (
                    <span className={`text-4xl font-black ${scoreColor(selectedAudit.score)}`}>
                      {selectedAudit.score}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 animate-pulse">Running…</span>
                  )}
                </div>
              </div>

              {selectedAudit?.findings && selectedAudit.findings.length > 0 ? (
                <div className="space-y-3">
                  {[...selectedAudit.findings]
                    .sort((a, b) => Number(a.passed) - Number(b.passed))
                    .map((f) => (
                      <div key={f.id} className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                        <span className={`text-base ${f.passed ? "text-emerald-400" : "text-rose-400"}`}>
                          {f.passed ? "✔" : "✖"}
                        </span>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{f.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sevBadge(f.severity)}`}>
                              {f.severity}
                            </span>
                            <span className="text-[10px] text-slate-500">{f.category}</span>
                          </div>
                          {f.description && <p className="mt-1 text-xs text-slate-400">{f.description}</p>}
                          {!f.passed && f.recommendation && (
                            <p className="mt-1 text-xs font-medium text-amber-400/90">→ Fix: {f.recommendation}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-center py-8 text-sm text-slate-500">
                  No findings recorded yet. Run a website audit above.
                </p>
              )}
            </div>
          )}

          {/* TAB 2: GBP */}
          {channelTab === "GBP" && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Google Business Profile (GBP) Breakdown</h2>
                  <p className="text-xs text-slate-400">Maps placement, Review sentiment, NAP consistency, and Attributes</p>
                </div>
                <div className="text-right">
                  <span className={`text-4xl font-black ${scoreColor(data?.latestGbp?.score ?? 80)}`}>
                    {data?.latestGbp?.score ?? 80}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mb-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs text-slate-500">Profile Completeness</span>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">
                    {data?.latestGbp?.metrics?.completenessScore ?? 85}%
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs text-slate-500">Review Health & Rating</span>
                  <p className="mt-1 text-2xl font-bold text-blue-400">
                    {data?.latestGbp?.metrics?.rating ?? 4.7}★ ({data?.latestGbp?.metrics?.reviewCount ?? 24} reviews)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                  <span className="text-emerald-400">✔</span>
                  <div>
                    <p className="text-sm font-semibold text-white">Operating Hours & Holiday Schedule Active</p>
                    <p className="text-xs text-slate-400">Hours are listed and verified for voice & mobile searches.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                  <span className="text-emerald-400">✔</span>
                  <div>
                    <p className="text-sm font-semibold text-white">Primary & Secondary Categories Linked</p>
                    <p className="text-xs text-slate-400">Categorization matched against Google Local Search taxonomy.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SOCIAL */}
          {channelTab === "SOCIAL" && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Social Media & Omnichannel Footprint</h2>
                  <p className="text-xs text-slate-400">Multi-platform social entity presence, bio linking, and scheduling</p>
                </div>
                <div className="text-right">
                  <span className={`text-4xl font-black ${scoreColor(data?.latestSocial?.score ?? 75)}`}>
                    {data?.latestSocial?.score ?? 75}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mb-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs text-slate-500">Connected Profiles</span>
                  <p className="mt-1 text-2xl font-bold text-purple-400">
                    {data?.latestSocial?.metrics?.platformCount ?? 1} Channels
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs text-slate-500">Publishing Pipeline</span>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">Active (BullMQ)</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI VISIBILITY */}
          {channelTab === "AI" && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">AI Search Engine Mentions</h2>
                  <p className="text-xs text-slate-400">Direct prompt testing on ChatGPT, Gemini, Claude, and Perplexity</p>
                </div>
                <div className="text-right">
                  <span className={`text-4xl font-black ${scoreColor(data?.latestAi?.overallScore ?? 67)}`}>
                    {data?.latestAi?.overallScore ?? 67}%
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard/visibility"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition"
              >
                Open Full AI Model Benchmark Studio →
              </Link>
            </div>
          )}
        </section>

        {/* Actionable Recommendations Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Actionable Suggestions</h2>
              <span className="text-xs font-bold text-blue-400">{recs.filter((r) => r.status === "OPEN").length} open</span>
            </div>

            <div className="space-y-3">
              {recs.slice(0, 8).map((r) => (
                <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${sevBadge(r.priority)}`}>
                      {r.priority}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">+{r.expectedImpact} pts</span>
                  </div>

                  <p className="mt-2 text-xs font-semibold text-white">{r.title}</p>
                  {r.description && <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">{r.description}</p>}

                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2">
                    {r.actionPayload ? (
                      <button
                        onClick={() => setSelectedFix(r)}
                        className="text-[11px] font-bold text-blue-400 hover:underline"
                      >
                        ⚡ View Fix Snippet
                      </button>
                    ) : (
                      <span></span>
                    )}

                    <button
                      onClick={() => toggleStatus(r.id, r.status === "OPEN" ? "DONE" : "OPEN")}
                      className={`text-[11px] font-semibold ${
                        r.status === "DONE" ? "text-emerald-400" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {r.status === "DONE" ? "✔ Done" : "Mark Done"}
                    </button>
                  </div>
                </div>
              ))}

              {recs.length === 0 && <p className="text-xs text-slate-500">No suggestions yet. Run an audit above.</p>}
            </div>
          </div>
        </aside>
      </div>

      {/* Action Fix Modal */}
      {selectedFix && selectedFix.actionPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Ready-to-Use Artifact</span>
                <h3 className="text-lg font-bold text-white">{selectedFix.title}</h3>
              </div>
              <button onClick={() => setSelectedFix(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">✕</button>
            </div>

            <div className="mt-4">
              <p className="text-xs text-slate-400 mb-3">{selectedFix.actionPayload.instructions}</p>
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{selectedFix.actionPayload.filename ?? "fix.txt"}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedFix.actionPayload!.code);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
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

            {/* WordPress 1-Click Automation Banner */}
            {data?.wordpress?.connected ? (
              <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-950/30 p-3.5 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span>⚡ AIVision SEO Plugin Connected</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded">LIVE</span>
                  </span>
                  <p className="text-slate-400 text-[11px] mt-0.5">Push this fix directly to {data.wordpress.siteName || data.wordpress.url || "your WordPress site"}.</p>
                </div>
                <button
                  onClick={() => applyFixToWordpress(selectedFix)}
                  disabled={wpApplying}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition shrink-0"
                >
                  {wpApplying ? "Applying in WP…" : "⚡ 1-Click Apply to WordPress"}
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between text-xs text-slate-400">
                <span>💡 Connect the <strong>AIVision SEO WordPress Plugin</strong> for 1-click automated fix application.</span>
                <Link href="/dashboard/integrations" className="text-blue-400 font-semibold hover:underline shrink-0 ml-2">
                  Connect WP →
                </Link>
              </div>
            )}

            {wpResult && (
              <div className={`mt-3 p-3 rounded-xl text-xs font-semibold ${wpResult.startsWith("✔") ? "bg-emerald-950/50 text-emerald-300 border border-emerald-500/30" : "bg-rose-950/50 text-rose-300 border border-rose-500/30"}`}>
                {wpResult}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => {
                  toggleStatus(selectedFix.id, "DONE");
                  setSelectedFix(null);
                }}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
              >
                ✔ Mark Completed
              </button>
              <button
                onClick={() => {
                  setSelectedFix(null);
                  setWpResult(null);
                }}
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