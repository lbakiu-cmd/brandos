"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Radar, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";

type EngineMention = {
  engine: string;
  mentioned: boolean;
  rank: number | null;
  sentiment: string;
  quote: string;
  source?: "live" | "mock";
};

type Report = {
  id: string;
  overallScore: number | null;
  mentions: EngineMention[] | null;
  createdAt: string;
};

type Business = {
  id: string;
  name: string;
  city: string | null;
  industry: string | null;
};

export default function VisibilityPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [list, biz] = await Promise.all([
        apiFetch<Report[]>("/ai-reports"),
        apiFetch<Business>("/business"),
      ]);
      setReports(list);
      setBusiness(biz);
    } catch {}
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(() => refresh().catch(() => {}), 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const latest = reports[0] ?? null;
  const running = latest !== null && latest.overallScore === null;

  async function run() {
    setBusy(true);
    try {
      await apiFetch("/ai-reports", { method: "POST", body: JSON.stringify({}) });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const scoreColor = (s: number) =>
    s >= 70 ? "text-emerald-400" : s >= 40 ? "text-amber-400" : "text-rose-400";

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {business?.industry || "Local Business"}
              </span>
              <span className="text-xs text-zinc-500">• {business?.city || "Local Market"}</span>
            </div>
            <h1 className="mt-1 text-xl md:text-2xl font-semibold tracking-tight text-white">
              Search & Assistant Visibility
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Simulate customer queries across ChatGPT, Claude, Gemini, and Perplexity to quantify how often your business is recommended.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
            >
              ← Overview
            </Link>
          </div>
        </header>

        {/* Action Hero */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 space-y-5">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Radar className="h-4 w-4 text-zinc-400" />
                Simulate Discovery Queries for "{business?.name || "Your Business"}"
              </h2>
              <p className="mt-1 text-xs text-zinc-400 max-w-2xl leading-relaxed">
                Tests simulated customer intent prompts (e.g. <em>"Who is the top rated {business?.industry || "specialist"} in {business?.city || "your city"}?"</em>) and validates citation verification.
              </p>
            </div>

            <button
              onClick={run}
              disabled={busy || running}
              className="shrink-0 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-zinc-950 shadow-sm hover:bg-zinc-200 disabled:opacity-50 transition"
            >
              {running ? "Simulating Queries…" : "Run Visibility Probe"}
            </button>
          </div>

          {/* Precision telemetry factors */}
          <div className="rounded-lg bg-zinc-950/80 border border-zinc-800/80 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-zinc-400 font-semibold">01</span>
              <div>
                <p className="font-semibold text-zinc-200">Knowledge Ingestion</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Assistants index Schema.org microdata and <code>/llms.txt</code> manifests.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-zinc-400 font-semibold">02</span>
              <div>
                <p className="font-semibold text-zinc-200">Citation Routing</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Direct clickable citations route qualified local searchers directly to your site.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-zinc-400 font-semibold">03</span>
              <div>
                <p className="font-semibold text-zinc-200">High Intent Conversion</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Assistant-referred users convert at significantly higher velocity than broad traffic.</p>
              </div>
            </div>
          </div>
        </div>

        {latest && latest.mentions && (
          <div className="space-y-6">
            {/* Score Banner */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={`text-4xl font-semibold tracking-tight ${scoreColor(latest.overallScore ?? 0)}`}>
                    {latest.overallScore}%
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Assistant Recommendation Frequency</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Percentage of simulated queries across all tested engines where {business?.name || "your business"} was cited as a primary recommendation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                    {latest.mentions.filter((m) => m.mentioned).length} Cited
                  </span>
                  <span className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {latest.mentions.length} Engines Benchmarked
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Engine Cards */}
            <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-3">
              {latest.mentions.map((m) => (
                <div
                  key={m.engine}
                  className={`rounded-xl border p-5 transition ${
                    m.mentioned
                      ? "border-emerald-500/20 bg-zinc-900/50"
                      : "border-zinc-800/80 bg-zinc-900/30"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{m.engine}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                          m.source === "live"
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                            : "bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-500"
                        }`}
                      >
                        {m.source === "live" ? "Live API" : "Simulated"}
                      </span>
                    </div>

                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                        m.mentioned
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {m.mentioned ? "Recommended" : "Not Cited"}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {m.rank !== null && (
                      <div className="flex justify-between text-zinc-400 text-[11px]">
                        <span>Rank Position:</span>
                        <span className="font-semibold text-white">#{m.rank}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-zinc-400 text-[11px]">
                      <span>Sentiment:</span>
                      <span className="capitalize font-medium text-zinc-200">{m.sentiment}</span>
                    </div>

                    {m.quote && (
                      <div className="mt-3 rounded-lg bg-zinc-950/80 p-3 border border-zinc-800/60">
                        <p className="text-[11px] italic text-zinc-300 leading-relaxed">
                          "{m.quote}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!latest && (
          <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center text-slate-500 text-sm">
            Click "Run Live AI Visibility Check" above to see how AI assistants answer questions about your business.
          </div>
        )}
      </div>
    </main>
  );
}