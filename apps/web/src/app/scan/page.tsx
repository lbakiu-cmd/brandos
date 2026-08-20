"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type ScanResult = {
  url: string;
  domain: string;
  businessName: string;
  city: string;
  scannedAt: string;
  composite: {
    overallScore: number;
    grade: string;
    gradeLabel: string;
    pillars: any;
  };
  websiteScore: number;
  totalChecksCount: number;
  passedCount: number;
  failedCount: number;
  criticalRedFlags: Array<{
    title: string;
    category: string;
    severity: string;
    recommendation: string;
  }>;
  lockedFindingsCount: number;
  checksPreview: Array<{
    title: string;
    category: string;
    severity: string;
    passed: boolean;
    recommendation: string | null;
    isLocked: boolean;
  }>;
};

const SCAN_STEPS = [
  "Connecting to website & resolving DNS…",
  "Checking robots.txt for AI bots (GPTBot, ClaudeBot, Perplexity)…",
  "Parsing Schema.org LocalBusiness & JSON-LD structured data…",
  "Checking for /llms.txt machine-readable manifest…",
  "Simulating ChatGPT & Google AI Overview citation readiness…",
  "Computing BrandOS Omnichannel Health Score…",
];

function ScanContent() {
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";

  const [url, setUrl] = useState(initialUrl);
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [scanning, setScanning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialUrl && !result && !scanning) {
      handleScan(initialUrl);
    }
  }, [initialUrl]);

  async function handleScan(targetUrl?: string) {
    const rawUrl = (targetUrl || url).trim();
    if (!rawUrl) return;

    setError(null);
    setScanning(true);
    setResult(null);
    setStepIndex(0);

    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
    }, 600);

    try {
      const res = await fetch("/api/audits/public-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: rawUrl,
          businessName: businessName || undefined,
          city: city || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to complete audit scan.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Could not analyze website. Please check the URL.");
    } finally {
      clearInterval(interval);
      setScanning(false);
    }
  }

  const scoreColor = (s: number) =>
    s >= 75 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-rose-400";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-500/30">
              B
            </span>
            <span className="text-xl font-bold tracking-tight text-white">BrandOS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero & Input Section */}
      <div className="mx-auto max-w-4xl px-6 pt-12 pb-8 text-center">
        <span className="inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-400">
          Instant AI Visibility & Discovery Scanner
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
          Is Your Business Visible to <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">ChatGPT & AI Search?</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
          Enter your website to audit your AI search readiness, Google Business ranking factors, and unlock actionable fixes in seconds.
        </p>

        {/* Scan Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScan();
          }}
          className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-2xl backdrop-blur-md sm:flex-row"
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g. yourbusiness.com"
            disabled={scanning}
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="submit"
            disabled={scanning || !url.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
          >
            {scanning ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Auditing…</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Scan Free</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mx-auto mt-4 max-w-md rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
            {error}
          </div>
        )}
      </div>

      {/* Live Scanning Animation */}
      {scanning && (
        <div className="mx-auto max-w-md px-6 py-12 text-center">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-blue-500/20 bg-blue-500/10">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></span>
          </div>
          <p className="text-sm font-semibold text-white transition-all duration-300">
            {SCAN_STEPS[stepIndex]}
          </p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${((stepIndex + 1) / SCAN_STEPS.length) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Scan Results View */}
      {result && (
        <div className="mx-auto max-w-5xl px-6 pb-20">
          {/* Main Scorecard Banner */}
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-8 shadow-2xl">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              {/* Score Gauge */}
              <div className="flex flex-col items-center justify-center border-b border-slate-800 pb-6 text-center lg:col-span-4 lg:border-r lg:border-b-0 lg:pb-0 lg:pr-8">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  AI Visibility & SEO Score
                </span>
                <div className="relative my-4 flex h-36 w-36 items-center justify-center rounded-full border-4 border-slate-800 bg-slate-950 shadow-inner">
                  <span className={`text-6xl font-black ${scoreColor(result.websiteScore)}`}>
                    {result.websiteScore}
                  </span>
                  <span className="absolute -bottom-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-0.5 text-xs font-bold text-slate-200">
                    {result.composite.grade}
                  </span>
                </div>
                <p className="text-base font-bold text-white">
                  {result.businessName}
                </p>
                <p className="mt-1 text-xs text-slate-400">{result.domain}</p>
              </div>

              {/* Summary Stats */}
              <div className="space-y-4 lg:col-span-8">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                    <h3 className="text-lg font-bold text-white">
                      {result.failedCount} Search Optimization Gaps Detected
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {result.websiteScore < 70
                      ? "AI search engines like ChatGPT, Claude, and Perplexity lack key machine-readable signals to cite and recommend your business to local searchers."
                      : "Your business has strong foundational signals, but critical high-impact AI optimization gaps remain."}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                    <span className="text-xs text-slate-500">Passed</span>
                    <p className="mt-1 text-lg font-bold text-emerald-400">{result.passedCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                    <span className="text-xs text-slate-500">Gaps to Fix</span>
                    <p className="mt-1 text-lg font-bold text-rose-400">{result.failedCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                    <span className="text-xs text-slate-500">Grade</span>
                    <p className="mt-1 text-lg font-bold text-blue-400">{result.composite.grade}</p>
                  </div>
                </div>

                {/* Claim Lead CTA Box */}
                <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 p-4">
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-bold text-white">
                        Claim your full report & 1-click code fixes
                      </p>
                      <p className="text-xs text-slate-400">
                        Get ready-to-use Schema JSON-LD, llms.txt, and AI bot rules.
                      </p>
                    </div>
                    <Link
                      href={`/login?website=${encodeURIComponent(result.url)}&name=${encodeURIComponent(result.businessName)}`}
                      className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 whitespace-nowrap"
                    >
                      Unlock All Fixes →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Checks Grid */}
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-bold text-white">Audit Breakdown & Recommendations</h3>

            <div className="space-y-3">
              {result.checksPreview.map((c, i) => (
                <div
                  key={i}
                  className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${
                    c.isLocked
                      ? "border-slate-800/50 bg-slate-900/30 opacity-60 backdrop-blur-sm"
                      : c.passed
                      ? "border-slate-800 bg-slate-900/80"
                      : "border-rose-500/20 bg-rose-950/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={c.passed ? "text-emerald-400" : "text-rose-400"}>
                      {c.passed ? "✔" : "✖"}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white">{c.title}</p>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-400">
                          {c.category}
                        </span>
                      </div>
                      {!c.passed && c.recommendation && (
                        <p className="mt-1 text-xs text-slate-400">
                          {c.isLocked ? "🔒 Recommendation locked. Unlock below." : `→ ${c.recommendation}`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    {c.isLocked ? (
                      <Link
                        href={`/login?website=${encodeURIComponent(result.url)}`}
                        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
                      >
                        🔒 Unlock Fix
                      </Link>
                    ) : !c.passed ? (
                      <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-400">
                        {c.severity} RISK
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-400">Optimal</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Loading scanner…</div>}>
      <ScanContent />
    </Suspense>
  );
}
