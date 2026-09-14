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
  Star,
  MessageSquare,
  Camera,
  TrendingUp,
  Layers,
  Award,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { ComparisonModal } from "../components/ComparisonModal";

export const dynamic = "force-dynamic";

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
  business?: { id: string; name: string; website?: string | null } | null;
};

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [isUrlAutoFilled, setIsUrlAutoFilled] = useState(false);
  const [data, setData] = useState<OverviewData | null>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [audits, setAudits] = useState<WebsiteAudit[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channelTab, setChannelTab] = useState<"WEBSITE" | "GBP" | "AI">("WEBSITE");
  const [busy, setBusy] = useState(false);
  const [wpApplying, setWpApplying] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [wpResult, setWpResult] = useState<string | null>(null);

  // Pre-load from localStorage cache immediately to avoid any initial delay or empty input
  useEffect(() => {
    try {
      const cached = localStorage.getItem("brandos_nap_profile");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.website) {
          let w = parsed.website.trim();
          if (w && !w.startsWith("http://") && !w.startsWith("https://")) {
            w = `https://${w}`;
          }
          if (w) {
            setBusinessWebsite(w);
            setUrl(w);
            setIsUrlAutoFilled(true);
          }
        }
      }
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [overview, webList, compRes, bizRes] = await Promise.all([
        apiFetch<OverviewData>("/audits/overview"),
        apiFetch<WebsiteAudit[]>("/audits"),
        apiFetch<any>("/business/snapshot/comparison").catch(() => null),
        apiFetch<any>("/business").catch(() => null),
      ]);
      setData(overview);
      setAudits(webList);
      if (compRes) setComparisonData(compRes);

      // Extract official website from Business Profile & NAP Settings
      let officialUrl = (bizRes?.website || overview?.business?.website || "").trim();
      if (officialUrl && !officialUrl.startsWith("http://") && !officialUrl.startsWith("https://")) {
        officialUrl = `https://${officialUrl}`;
      }

      if (officialUrl) {
        setBusinessWebsite(officialUrl);
        setUrl((prev) => {
          // If no url or user hasn't typed a custom one, auto-fill with official website
          if (!prev || prev === "https://" || prev === "http://" || !prev.startsWith("http") || prev === officialUrl) {
            setIsUrlAutoFilled(true);
            return officialUrl;
          }
          return prev;
        });
      } else if (!selectedId && webList.length > 0 && webList[0].url) {
        setUrl(webList[0].url);
      }

      if (!selectedId && webList.length > 0) {
        setSelectedId(webList[0].id);
      }
    } catch {
      // Ignored
    }
  }, [selectedId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedAudit = audits.find((a) => a.id === selectedId) ?? data?.latestWeb ?? null;

  async function runWebsiteAudit() {
    let target = url.trim();
    if (!target || target === "https://" || target === "http://") {
      target = businessWebsite || "";
    }
    if (!target) return;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = `https://${target}`;
    }
    setUrl(target);
    setBusy(true);
    try {
      const audit = await apiFetch<WebsiteAudit>("/audits", {
        method: "POST",
        body: JSON.stringify({ url: target }),
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

  const rawRecs = data?.recommendations ?? [];
  const recs = rawRecs.reduce<Rec[]>((acc, current) => {
    const exists = acc.find(
      (r) => r.title.toLowerCase().trim() === current.title.toLowerCase().trim()
    );
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);
  const openRecs = recs.filter((r) => r.status === "OPEN");

  async function applyFixToWordpress(rec: Rec) {
    if (!rec.actionPayload || rec.status === "DONE" || wpApplying) return;
    setApplyingId(rec.id);
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
      await toggleStatus(rec.id, "DONE");
    } catch (err: any) {
      setWpResult("❌ " + (err.message || "Failed to push fix to WordPress."));
    } finally {
      setWpApplying(false);
      setApplyingId(null);
    }
  }

  async function applyFindingFix(finding: Finding) {
    if (wpApplying) return;
    setApplyingId(finding.id);
    setWpApplying(true);
    setWpResult(null);

    try {
      let fixType = "OPTIMIZE_ROBOTS";
      let payload: any = {};

      const lowerTitle = (finding.title || "").toLowerCase();
      const lowerRec = (finding.recommendation || "").toLowerCase();

      if (lowerTitle.includes("robot") || lowerTitle.includes("crawler") || lowerRec.includes("disallow")) {
        fixType = "OPTIMIZE_ROBOTS";
        payload = {
          allowed_bots: [
            "Googlebot", "Bingbot", "DuckDuckBot", "Applebot", "Googlebot-News",
            "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web",
            "anthropic-ai", "PerplexityBot", "Google-Extended", "Applebot-Extended",
            "Meta-ExternalAgent", "FacebookBot", "Bytespider", "Amazonbot", "cohere-ai",
            "Diffbot", "CCBot",
            "facebookexternalhit", "Twitterbot", "LinkedInBot", "Pinterestbot"
          ]
        };
      } else if (lowerTitle.includes("llms") || lowerRec.includes("llms.txt")) {
        fixType = "LLMS_TXT_BIO";
        payload = { site_ai_bio: `${selectedAudit?.url || url} verified local service provider knowledge base.` };
      } else if (lowerTitle.includes("schema") || lowerRec.includes("json-ld")) {
        fixType = "LOCAL_BUSINESS_SCHEMA";
        payload = {
          schema_type: "LocalBusiness",
          schema_json: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": url.replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
            "url": url
          }, null, 2)
        };
      } else if (lowerTitle.includes("faq") || lowerRec.includes("faq")) {
        fixType = "FAQ_SCHEMA";
        payload = {
          schema_type: "FAQPage",
          schema_json: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": []
          }, null, 2)
        };
      }

      const res = await apiFetch<any>("/wordpress/apply-fix", {
        method: "POST",
        body: JSON.stringify({
          fix_type: fixType,
          payload,
        }),
      });

      setWpResult(res.message || "✔ Fix successfully deployed to connected WordPress site!");

      // If there's a matching recommendation, mark it DONE
      const matchingRec = recs.find(
        (r) => r.title.toLowerCase().includes(lowerTitle.slice(0, 15)) ||
               (r.actionPayload?.filename || "").toLowerCase().includes(fixType === "OPTIMIZE_ROBOTS" ? "robot" : "")
      );
      if (matchingRec) {
        await toggleStatus(matchingRec.id, "DONE");
      }

      // Quick re-scan to immediately update the health check grade and findings
      await runWebsiteAudit();
    } catch (err: any) {
      setWpResult("❌ " + (err.message || "Failed to push fix to connected site."));
    } finally {
      setWpApplying(false);
      setApplyingId(null);
    }
  }

  async function autoRemediateAll() {
    if (wpApplying) return;
    setWpApplying(true);
    setWpResult(null);
    try {
      const res = await apiFetch<any>("/wordpress/auto-remediate", {
        method: "POST",
      });
      setWpResult(res.message || "✔ Successfully auto-remediated all audit issues on WordPress!");
      await runWebsiteAudit();
    } catch (err: any) {
      setWpResult("❌ " + (err.message || "Failed to auto-remediate WordPress."));
    } finally {
      setWpApplying(false);
    }
  }

  const findings: Finding[] = selectedAudit?.findings ?? [];
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
            {data?.wordpress?.connected && (
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-400" /> AIVision SEO Plugin Active
              </span>
            )}
          </div>
          <p className="mt-1 text-xs md:text-sm text-slate-400">
            A simple, plain-English breakdown of your website speed, Google ranking readiness, and AI discovery.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 text-xs font-semibold">
          <button
            onClick={() => setIsComparisonOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/60 px-4 py-2.5 text-xs font-bold text-indigo-200 hover:bg-indigo-900/60 hover:text-white transition shadow-sm"
          >
            <Award className="h-3.5 w-3.5 text-indigo-400" />
            <span>Compare Baseline</span>
          </button>
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">Your Website Address</label>
              {businessWebsite && (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <Check className="h-3 w-3" /> Auto-filled from Business Profile &amp; NAP
                </span>
              )}
            </div>
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setIsUrlAutoFilled(e.target.value.trim() === businessWebsite.trim());
              }}
              placeholder={businessWebsite || "https://yourbusiness.com"}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3 pt-2 md:pt-0">
            <button
              onClick={runWebsiteAudit}
              disabled={busy || (!url.startsWith("http") && !businessWebsite)}
              className="rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {busy ? "Running Scan…" : "Run Website Checkup"}
            </button>

            <button
              onClick={runFullCheckup}
              disabled={busy}
              className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-bold text-slate-200 transition hover:bg-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              Full Omnichannel Checkup
            </button>
          </div>
        </div>
      </div>

      {/* Channel Switcher */}
      <div className="mb-6 flex gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setChannelTab("WEBSITE")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            channelTab === "WEBSITE"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "text-slate-400 hover:bg-slate-900 hover:text-white"
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Website Health ({findings.length})</span>
        </button>
        <button
          onClick={() => setChannelTab("GBP")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            channelTab === "GBP"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
              : "text-slate-400 hover:bg-slate-900 hover:text-white"
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Google Business Profile ({data?.latestGbp?.score ? `${data.latestGbp.score}/100` : "No Audit"})</span>
        </button>
        <button
          onClick={() => setChannelTab("AI")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
            channelTab === "AI"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:bg-slate-900 hover:text-white"
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>AI Search Visibility ({data?.latestAi?.overallScore ? `${data.latestAi.overallScore}%` : "No Audit"})</span>
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Findings (2 Cols) */}
        <section className="lg:col-span-2 space-y-6">
          {channelTab === "WEBSITE" && (
            <div className="space-y-6">
              {!selectedAudit ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center backdrop-blur shadow-xl space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Globe className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white">No Website Checkup Run Yet</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Enter your website URL above and click &quot;Run Website Checkup&quot; to analyze technical SEO, schema structured data, and AI discovery readiness in real time.
                  </p>
                </div>
              ) : (
                <>
                  {/* Overall Score Card */}
                  <div className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur">
                    <div>
                      <h2 className="text-lg font-bold text-white">Overall Website Grade</h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Analyzed for: {selectedAudit.url}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-4xl md:text-5xl font-black ${scoreColor(selectedAudit.score ?? 0)}`}>
                        {selectedAudit.score ?? "—"}
                      </span>
                      <span className="text-slate-500 text-sm font-bold"> / 100</span>
                    </div>
                  </div>

              {/* Platform Auto-Remediation Banner */}
              {data?.wordpress?.connected && (criticalFindings.length > 0 || opportunityFindings.length > 0) && (
                <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/50 via-purple-950/30 to-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl shadow-indigo-950/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        <Zap className="h-4 w-4" />
                      </span>
                      <h4 className="text-sm font-bold text-white">Platform Auto-Remediation Available</h4>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> AIVision SEO Plugin Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 max-w-xl">
                      Automate deployment of optimal AI crawler directives (GPTBot, PerplexityBot, Google-Extended), generate your official /llms.txt knowledge manifest, and inject Schema.org JSON-LD in 1 automated click.
                    </p>
                  </div>
                  <button
                    onClick={autoRemediateAll}
                    disabled={wpApplying}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <Zap className="h-4 w-4 fill-current" />
                    {wpApplying ? "Auto-Remediating Site..." : "⚡ Auto-Fix All on WordPress"}
                  </button>
                </div>
              )}

              {/* Bucket 1: Fixes Needed (Critical) */}
              {criticalFindings.length > 0 && (
                <div className="rounded-3xl border border-rose-500/30 bg-rose-950/10 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-400">
                      <XCircle className="h-5 w-5" />
                      <h3 className="text-base font-bold text-white">Important Fixes Needed ({criticalFindings.length})</h3>
                    </div>
                    {data?.wordpress?.connected && (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Plugin Connected (1-Click Auto-Fix Enabled)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    These issues could prevent potential clients from finding your website on Google or contacting you.
                  </p>

                  <div className="space-y-3">
                    {criticalFindings.map((f: Finding) => {
                      const lower = ((f.title || "") + " " + (f.recommendation || "")).toLowerCase();
                      const isFixable = 
                        lower.includes("robot") ||
                        lower.includes("crawler") ||
                        lower.includes("disallow") ||
                        lower.includes("schema") ||
                        lower.includes("llms") ||
                        lower.includes("faq");

                      return (
                        <div key={f.id} className="rounded-2xl border border-rose-500/20 bg-slate-950/80 p-4 space-y-3">
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

                          {isFixable && (
                            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80">
                              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                {data?.wordpress?.connected ? (
                                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> AIVision SEO Plugin Connected
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Auto-fix available via connected plugin</span>
                                )}
                              </span>

                              {data?.wordpress?.connected ? (
                                <button
                                  onClick={() => applyFindingFix(f)}
                                  disabled={wpApplying}
                                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-900/30 disabled:opacity-50"
                                >
                                  <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                                  {wpApplying && applyingId === f.id ? "Applying Fix..." : "⚡ Auto-Fix with Connected Plugin"}
                                </button>
                              ) : (
                                <Link
                                  href="/dashboard/integrations"
                                  className="rounded-lg border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1"
                                >
                                  <Zap className="h-3 w-3" /> Connect Plugin to Auto-Fix
                                </Link>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                    {opportunityFindings.map((f: Finding) => {
                      const lower = ((f.title || "") + " " + (f.recommendation || "")).toLowerCase();
                      const isFixable = 
                        lower.includes("robot") ||
                        lower.includes("crawler") ||
                        lower.includes("disallow") ||
                        lower.includes("schema") ||
                        lower.includes("llms") ||
                        lower.includes("faq");

                      return (
                        <div key={f.id} className="rounded-2xl border border-amber-500/20 bg-slate-950/80 p-4 space-y-2.5">
                          <p className="text-sm font-bold text-white">{f.title}</p>
                          {f.description && <p className="text-xs text-slate-300">{f.description}</p>}
                          {f.recommendation && (
                            <p className="text-xs text-slate-400">→ {f.recommendation}</p>
                          )}

                          {isFixable && data?.wordpress?.connected && (
                            <div className="pt-2 flex items-center justify-end border-t border-slate-800/60">
                              <button
                                onClick={() => applyFindingFix(f)}
                                disabled={wpApplying}
                                className="rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white px-3 py-1 text-xs font-semibold transition flex items-center gap-1"
                              >
                                <Zap className="h-3 w-3 text-amber-400" />
                                {wpApplying && applyingId === f.id ? "Applying..." : "⚡ Auto-Fix via Plugin"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

                {/* Bucket 3: What's Working Well (Passed) */}
                <div className="rounded-3xl border border-emerald-500/20 bg-slate-900/40 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <h3 className="text-base font-bold text-white">What You’re Doing Great ({passedFindings.length})</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Your business is already set up properly in these key areas.
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {passedFindings.map((f: Finding) => (
                      <div key={f.id} className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5 flex items-start gap-2.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-white">{f.title}</p>
                          {f.description && <p className="text-[11px] text-slate-400 mt-0.5">{f.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {channelTab === "GBP" && (
          <div className="space-y-6">
            {!data?.latestGbp ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center backdrop-blur shadow-xl space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <MapPin className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-white">No Google Business Audit Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Run a checkup or connect your Google Business Profile to analyze Local 3-Pack rank signals, NAP consistency, and photo velocity.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard/integrations"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition"
                  >
                    Connect Google Business Profile
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-emerald-400" /> Google Business Profile Audit & Local Rank Signals
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Auditing ranking factors for Google Maps Local 3-Pack, NAP consistency, and local recommendation engines.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
                    <span className="text-xs text-slate-400">Overall Score:</span>
                    <span className="text-xl font-black text-emerald-400">{data.latestGbp.score}/100</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {channelTab === "AI" && (
          <div className="space-y-6">
            {!data?.latestAi ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center backdrop-blur shadow-xl space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Bot className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-white">No AI Visibility Scan Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Analyze how often ChatGPT, Perplexity, and Google Gemini mention and recommend your business to nearby customers.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard/visibility"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition"
                  >
                    Open AI Visibility Studio <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Bot className="h-5 w-5 text-indigo-400" /> AI Discovery & Prompt Benchmarks
                </h2>
                <p className="text-xs text-slate-400">
                  How often ChatGPT, Perplexity, and Google Gemini mention your business when customers search.
                </p>
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/10 p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-indigo-300">Total AI Mention Share</span>
                    <p className="text-3xl font-black text-white mt-1">{data.latestAi.overallScore}%</p>
                  </div>
                  <Link
                    href="/dashboard/visibility"
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition flex items-center gap-1.5"
                  >
                    Open AI Benchmark Studio <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}
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
            <span className="text-xs font-bold text-blue-400">{openRecs.length} available</span>
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
            {openRecs.length > 0 ? (
              openRecs.map((r: any) => (
                <div key={r.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{r.title}</span>
                    {r.expectedImpact && (
                      <span className="text-[10px] text-emerald-400 font-bold">+{r.expectedImpact} pts</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{r.description}</p>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
                    {r.actionPayload ? (
                      <button
                        onClick={() => applyFixToWordpress(r)}
                        disabled={wpApplying || r.status === "DONE"}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                          r.status === "DONE"
                            ? "bg-slate-850 text-slate-500 cursor-not-allowed border border-slate-800 opacity-60 pointer-events-none"
                            : wpApplying
                            ? "bg-indigo-700/60 text-indigo-300 cursor-wait"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-95"
                        }`}
                        title={r.status === "DONE" ? "Fix has already been applied" : "Push automated fix to WordPress"}
                      >
                        <Zap className={`h-3 w-3 ${r.status === "DONE" ? "text-slate-500" : "text-amber-300"}`} />
                        {wpApplying && applyingId === r.id
                          ? "Applying..."
                          : r.status === "DONE"
                          ? "Fix Applied"
                          : "1-Click Fix"}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Manual verification</span>
                    )}

                    <button
                      onClick={() => toggleStatus(r.id, r.status === "DONE" ? "OPEN" : "DONE")}
                      className={`text-xs font-semibold flex items-center gap-1 transition ${
                        r.status === "DONE" ? "text-emerald-400 font-bold" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {r.status === "DONE" ? "✔ Applied" : "Mark Done"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No outstanding recommendations. Run a website checkup above to generate automated fixes.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>

    {/* 14-Day Baseline Comparison Modal */}
    <ComparisonModal
      isOpen={isComparisonOpen}
      onClose={() => setIsComparisonOpen(false)}
      data={comparisonData}
      onRefresh={refresh}
    />
  </main>
);
}