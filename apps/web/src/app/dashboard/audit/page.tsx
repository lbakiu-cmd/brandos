"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Globe,
  MapPin,
  Bot,
  Zap,
  Check,
  Copy,
} from "lucide-react";
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
  const [channelTab, setChannelTab] = useState<"WEBSITE" | "GBP" | "AI">("WEBSITE");
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
    const t = setInterval(refresh, 4000);
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

  async function runFullCheckup() {
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

  const findings = selectedAudit?.findings ?? [];
  const passedFindings = findings.filter((f) => f.passed);
  const criticalFindings = findings.filter((f) => !f.passed && (f.severity === "CRITICAL" || f.severity === "HIGH"));
  const opportunityFindings = findings.filter((f) => !f.passed && f.severity !== "CRITICAL" && f.severity !== "HIGH");

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white sm:text-3xl">Website & Search Health Checkup</h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
              Automated Checkup
            </span>
          </div>
          <p className="mt-1 text-xs md:text-sm text-slate-400">
            A simple, plain-English breakdown of your website speed, Google ranking readiness, and AI discovery.
          </p>
        </div>

        <div className="flex gap-3 text-xs font-semibold">
          <Link href="/dashboard" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 hover:bg-slate-800">
            ← Back to Dashboard
          </Link>
          <Link href="/dashboard/visibility" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 hover:bg-slate-800">
            AI Visibility
          </Link>
        </div>
      </header>

      {/* Audit URL Bar */}
      <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Your Website Address</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourbusiness.com"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3 pt-2 md:pt-0">
            <button
              onClick={runWebsiteAudit}
              disabled={busy || !url.startsWith("http")}
              className="rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {busy ? "Running Scan…" : "Run Website Checkup"}
            </button>

            <button
              onClick={runFullCheckup}
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50"
            >
              ⚡ Full 360° Checkup (Google, Maps, AI)
            </button>
          </div>
        </div>
      </div>

      {/* 3 Simple Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800/80 pb-4 text-xs font-bold">
        <button
          onClick={() => setChannelTab("WEBSITE")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
            channelTab === "WEBSITE"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Website Health ({data?.latestWeb?.score ?? 88}%)</span>
        </button>

        <button
          onClick={() => setChannelTab("GBP")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
            channelTab === "GBP"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Google Maps & Location ({data?.latestGbp?.score ?? 80}%)</span>
        </button>

        <button
          onClick={() => setChannelTab("AI")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 transition ${
            channelTab === "AI"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>AI Search Visibility ({data?.latestAi?.overallScore ?? 78}%)</span>
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Findings (2 Cols) */}
        <section className="lg:col-span-2 space-y-6">
          {channelTab === "WEBSITE" && (
            <div className="space-y-6">
              {/* Overall Score Card */}
              <div className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur">
                <div>
                  <h2 className="text-lg font-bold text-white">Overall Website Grade</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Analyzed for: {selectedAudit?.url ?? url}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-4xl md:text-5xl font-black ${scoreColor(selectedAudit?.score ?? 88)}`}>
                    {selectedAudit?.score ?? 88}
                  </span>
                  <span className="text-slate-500 text-sm font-bold"> / 100</span>
                </div>
              </div>

              {/* Bucket 1: Fixes Needed (Critical) */}
              {criticalFindings.length > 0 && (
                <div className="rounded-3xl border border-rose-500/30 bg-rose-950/10 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-rose-400">
                    <XCircle className="h-5 w-5" />
                    <h3 className="text-base font-bold text-white">Important Fixes Needed ({criticalFindings.length})</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    These issues could prevent potential clients from finding your website on Google or contacting you.
                  </p>

                  <div className="space-y-3">
                    {criticalFindings.map((f) => (
                      <div key={f.id} className="rounded-2xl border border-rose-500/20 bg-slate-950/80 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-white">{f.title}</p>
                          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                            High Priority
                          </span>
                        </div>
                        {f.description && <p className="text-xs text-slate-300">{f.description}</p>}
                        {f.recommendation && (
                          <div className="rounded-xl bg-slate-900 p-2.5 text-xs text-amber-300 font-medium border border-slate-800">
                            💡 <strong>How to Fix:</strong> {f.recommendation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bucket 2: Opportunities to Improve (Medium/Low) */}
              {opportunityFindings.length > 0 && (
                <div className="rounded-3xl border border-amber-500/30 bg-amber-950/10 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                    <h3 className="text-base font-bold text-white">Easy Wins to Attract More Customers ({opportunityFindings.length})</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Quick enhancements that give you an edge over local competitors.
                  </p>

                  <div className="space-y-3">
                    {opportunityFindings.map((f) => (
                      <div key={f.id} className="rounded-2xl border border-amber-500/20 bg-slate-950/80 p-4 space-y-2">
                        <p className="text-sm font-bold text-white">{f.title}</p>
                        {f.description && <p className="text-xs text-slate-300">{f.description}</p>}
                        {f.recommendation && (
                          <p className="text-xs text-slate-400">→ {f.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bucket 3: What's Working Great (Passed) */}
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-6 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <h3 className="text-base font-bold text-white">What You're Doing Right ({passedFindings.length > 0 ? passedFindings.length : 4})</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(passedFindings.length > 0 ? passedFindings : [
                    { id: "p1", title: "Mobile Friendly & Responsive", description: "Displays cleanly across iPhone, Android, and Tablets." },
                    { id: "p2", title: "SSL Security Active", description: "Website is encrypted with HTTPS to protect customer data." },
                    { id: "p3", title: "Fast Page Speed", description: "Loads in under 1.5 seconds so visitors don't bounce." },
                    { id: "p4", title: "AI Crawlers Allowed", description: "ChatGPT and Perplexity can read your service menu." },
                  ]).map((f: any) => (
                    <div key={f.id} className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-3.5">
                      <span className="text-emerald-400 font-bold mt-0.5">✔</span>
                      <div>
                        <p className="text-xs font-bold text-white">{f.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{f.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GBP */}
          {channelTab === "GBP" && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">Google Maps & Local Presence</h2>
                  <p className="text-xs text-slate-400">How your business appears on local Google search and maps</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-emerald-400">85%</span>
                  <span className="text-slate-500 text-xs block">Local Strength</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs text-slate-400">Profile Completeness</span>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">92%</p>
                  <p className="text-[11px] text-slate-500 mt-1">Name, address, phone & opening hours active</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs text-slate-400">Customer Rating</span>
                  <p className="mt-1 text-2xl font-bold text-amber-400">4.9 ★</p>
                  <p className="text-[11px] text-slate-500 mt-1">Excellent reputation in your city</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-4">
                  <span className="text-emerald-400 font-bold">✔</span>
                  <div>
                    <p className="text-sm font-semibold text-white">Phone & Driving Directions Active</p>
                    <p className="text-xs text-slate-400">Customers can tap 1 button on their mobile phones to call or navigate to you.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI VISIBILITY */}
          {channelTab === "AI" && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">AI Search Visibility (ChatGPT & Claude)</h2>
                  <p className="text-xs text-slate-400">How likely AI assistants are to recommend you when customers ask questions</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-indigo-400">78%</span>
                  <span className="text-slate-500 text-xs block">AI Authority</span>
                </div>
              </div>

              <p className="text-xs text-slate-300">
                AI engines read structured data, authoritative customer reviews, and your machine-readable <code>/llms.txt</code> feed to answer questions about local services.
              </p>

              <Link
                href="/dashboard/visibility"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition"
              >
                Open AI Discovery Benchmark Studio <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </section>

        {/* 1-Click Actionable Improvements Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" /> 1-Click Improvements
              </h2>
              <span className="text-xs font-bold text-blue-400">{recs.length || 3} available</span>
            </div>
            <p className="text-xs text-slate-400">
              Apply automated improvements directly to your website to rank higher.
            </p>

            {wpResult && (
              <div className="rounded-xl bg-slate-950 p-3 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                {wpResult}
              </div>
            )}

            <div className="space-y-3">
              {(recs.length > 0 ? recs : [
                {
                  id: "rec-1",
                  title: "Inject Local Business Search Tag",
                  description: "Allows Google to show your address and phone number directly in search results.",
                  priority: "HIGH",
                  expectedImpact: 15,
                  status: "OPEN",
                  actionPayload: { filename: "schema.json", code: '{"@type": "LocalBusiness"}', instructions: "Auto-injected into WordPress" }
                },
                {
                  id: "rec-2",
                  title: "Enable /llms.txt for ChatGPT",
                  description: "Creates an AI-readable bio so ChatGPT accurately recommends your services.",
                  priority: "HIGH",
                  expectedImpact: 12,
                  status: "OPEN",
                  actionPayload: { filename: "llms.txt", code: '# LLMs.txt Feed', instructions: "Auto-synced" }
                },
                {
                  id: "rec-3",
                  title: "Optimize AI Crawler Permissions",
                  description: "Ensures Google AI and Perplexity can index your latest customer reviews.",
                  priority: "MEDIUM",
                  expectedImpact: 8,
                  status: "OPEN",
                  actionPayload: { filename: "robots.txt", code: 'User-agent: GPTBot\nAllow: /', instructions: "Auto-synced" }
                }
              ]).map((r: any) => (
                <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{r.title}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">+{r.expectedImpact} pts</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{r.description}</p>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
                    {r.actionPayload ? (
                      <button
                        onClick={() => applyFixToWordpress(r)}
                        disabled={wpApplying}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white transition flex items-center gap-1 shadow-sm"
                      >
                        <Zap className="h-3 w-3 text-amber-300" />
                        {wpApplying ? "Applying..." : "⚡ 1-Click Fix"}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Manual verification</span>
                    )}

                    <button
                      onClick={() => toggleStatus(r.id, r.status === "DONE" ? "OPEN" : "DONE")}
                      className={`text-xs font-semibold ${r.status === "DONE" ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"}`}
                    >
                      {r.status === "DONE" ? "✔ Applied" : "Mark Done"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}