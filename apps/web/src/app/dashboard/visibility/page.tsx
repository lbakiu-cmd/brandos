"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Bot, ArrowRight, CheckCircle2, AlertCircle, HelpCircle, Zap } from "lucide-react";
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
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-400">
                {business?.industry || "Local Business"}
              </span>
              <span className="text-xs text-slate-400">• {business?.city || "Local Market"}</span>
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-white">
              AI Recommendation Studio (ChatGPT & Gemini)
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Find out how often AI assistants recommend your business when potential customers ask for recommendations in your area.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              ← Dashboard
            </Link>
          </div>
        </header>

        {/* Action Hero */}
        <div className="mb-8 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur space-y-4">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Simulate Customer Inquiries for "{business?.name || "Your Business"}"
              </h2>
              <p className="mt-1 text-xs text-slate-400 max-w-2xl">
                We simulate real customer prompts on ChatGPT, Perplexity, Gemini, and Claude (e.g. <em>"Who is the top rated {business?.industry || "specialist"} in {business?.city || "your city"}?"</em>) and verify if your business is recommended.
              </p>
            </div>

            <button
              onClick={run}
              disabled={busy || running}
              className="shrink-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition"
            >
              {running ? "⚡ Querying AI Models…" : "Run Live AI Visibility Check"}
            </button>
          </div>

          {/* Beginner explainer card */}
          <div className="rounded-2xl bg-slate-950/70 border border-slate-800/80 p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-blue-400 font-bold">1.</span>
              <div>
                <p className="font-bold text-white">How AI Picks You</p>
                <p className="text-[11px] text-slate-400 mt-0.5">AI reads your website's <code>/llms.txt</code> feed and verified customer reviews.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-indigo-400 font-bold">2.</span>
              <div>
                <p className="font-bold text-white">Direct Customer Referrals</p>
                <p className="text-[11px] text-slate-400 mt-0.5">When users ask for local suggestions, AI provides a direct clickable link to your site.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-emerald-400 font-bold">3.</span>
              <div>
                <p className="font-bold text-white">Higher Conversion Rate</p>
                <p className="text-[11px] text-slate-400 mt-0.5">AI-referred visitors are already interested and convert 3x faster into paying clients.</p>
              </div>
            </div>
          </div>
        </div>

        {latest && latest.mentions && (
          <div className="space-y-8">
            {/* Score Banner */}
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={`text-6xl font-black ${scoreColor(latest.overallScore ?? 0)}`}>
                    {latest.overallScore}%
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">AI Recommendation Score</h3>
                    <p className="text-xs text-slate-400">
                      Percentage of simulated AI search queries that actively recommend {business?.name || "your business"} as the top choice.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400">
                    {latest.mentions.filter((m) => m.mentioned).length} Recommended You
                  </span>
                  <span className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300">
                    {latest.mentions.length} AI Engines Tested
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Engine Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {latest.mentions.map((m) => (
                <div
                  key={m.engine}
                  className={`rounded-3xl border p-6 backdrop-blur transition ${
                    m.mentioned
                      ? "border-emerald-500/30 bg-emerald-950/10"
                      : "border-slate-800/80 bg-slate-900/60"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{m.engine}</span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          m.source === "live"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {m.source === "live" ? "Live API" : "Simulated"}
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        m.mentioned
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      {m.mentioned ? "✔ Recommended" : "✕ Not Recommended"}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Recommendation Rank:</span>
                      <span className="font-bold text-white">{m.rank ? `#${m.rank}` : "N/A"}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400">
                      <span>Sentiment:</span>
                      <span className="font-bold capitalize text-slate-200">{m.sentiment}</span>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-[11px] italic text-slate-300">
                      "{m.quote}"
                    </div>
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