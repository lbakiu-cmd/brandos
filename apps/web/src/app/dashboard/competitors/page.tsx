"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Competitor = {
  id: string;
  name: string;
  website: string | null;
  createdAt: string;
  mentions: Array<{
    id: string;
    engine: string;
    prompt: string;
    mentioned: boolean;
    rank: number | null;
  }>;
};

type BenchmarkResult = {
  prompt: string;
  engines: string[];
  shareOfVoice: {
    yourBusiness: { name: string; mentions: number; sovPercent: number };
    competitors: Array<{ id: string; name: string; website: string | null; mentionCount: number; sovPercent: number }>;
  };
  insights: string[];
};

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch<{ business: any; competitors: Competitor[] }>("/competitors");
      setCompetitors(res.competitors);
      setBusiness(res.business);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAddCompetitor(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      await apiFetch("/competitors", {
        method: "POST",
        body: JSON.stringify({ name: newName, website: newWebsite || undefined }),
      });
      setNewName("");
      setNewWebsite("");
      setShowAdd(false);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Failed to add competitor.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this competitor?")) return;
    try {
      await apiFetch(`/competitors/${id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      console.error(err);
    }
  }

  async function runBenchmark() {
    setBusy(true);
    try {
      const res = await apiFetch<BenchmarkResult>("/competitors/benchmark", { method: "POST" });
      setBenchmark(res);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Competitor AI Benchmarking</h1>
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-0.5 text-xs font-bold text-purple-400">
              AIO Intelligence
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Compare your brand's AI search visibility and Share of Voice (SOV) head-to-head against local competitors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800">
            ← Dashboard
          </Link>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition"
          >
            + Add Competitor
          </button>
          <button
            onClick={runBenchmark}
            disabled={busy || competitors.length === 0}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition disabled:opacity-50"
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                <span>Testing LLMs…</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Run Head-to-Head Test</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Share of Voice Summary Hero */}
      <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
          <div className="flex flex-col items-center justify-center border-b border-slate-800 pb-6 text-center lg:col-span-4 lg:border-r lg:border-b-0 lg:pb-0 lg:pr-6">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              AI Share of Voice (SOV)
            </span>
            <div className="my-4 flex h-32 w-32 items-center justify-center rounded-full border-4 border-purple-500/30 bg-purple-950/40 text-4xl font-black text-purple-400">
              {benchmark?.shareOfVoice.yourBusiness.sovPercent ?? (competitors.length > 0 ? 50 : 100)}%
            </div>
            <p className="text-sm font-bold text-white">{business?.name ?? "Your Business"}</p>
            <p className="text-xs text-slate-500">
              {competitors.length} Tracked Competitors
            </p>
          </div>

          <div className="space-y-4 lg:col-span-8">
            <h3 className="text-base font-bold text-white">Local AI Search Head-to-Head</h3>
            <p className="text-xs text-slate-400">
              Simulated prompt: <span className="font-mono text-purple-300">"{benchmark?.prompt || `Best ${business?.industry || "services"} in ${business?.city || "your area"}`}"</span>
            </p>

            {/* SOV Breakdown Bars */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-white">{business?.name} (You)</span>
                  <span className="text-emerald-400">
                    {benchmark?.shareOfVoice.yourBusiness.sovPercent ?? (competitors.length > 0 ? 50 : 100)}% SOV
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${benchmark?.shareOfVoice.yourBusiness.sovPercent ?? (competitors.length > 0 ? 50 : 100)}%` }}
                  ></div>
                </div>
              </div>

              {benchmark?.shareOfVoice.competitors.map((c) => (
                <div key={c.id}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-300">{c.name}</span>
                    <span className="text-purple-400">{c.sovPercent}% SOV</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${c.sovPercent}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Insights */}
            {benchmark?.insights && (
              <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-950/20 p-3 text-xs text-purple-300 space-y-1">
                {benchmark.insights.map((ins, i) => (
                  <p key={i}>💡 {ins}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Competitors List */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-base font-bold text-white mb-4">Tracked Competitor Profiles</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitors.map((comp) => (
            <div key={comp.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-white">{comp.name}</h3>
                  <button
                    onClick={() => handleDelete(comp.id)}
                    className="text-xs text-slate-500 hover:text-rose-400 transition"
                  >
                    ✕
                  </button>
                </div>
                {comp.website && (
                  <p className="mt-1 text-xs text-slate-400 font-mono">{comp.website}</p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                    {comp.mentions.length} AI Tests Logged
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Citation Status</span>
                <span className="text-emerald-400 font-semibold">Active in Index</span>
              </div>
            </div>
          ))}

          {competitors.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-500">
              No competitors added yet. Click "+ Add Competitor" to start tracking local competition in AI engines.
            </div>
          )}
        </div>
      </section>

      {/* Add Competitor Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">Track New Competitor</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddCompetitor} className="mt-4 space-y-4">
              {error && <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl">{error}</p>}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Competitor Business Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Austin Family Dental"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Competitor Website (Optional)</label>
                <input
                  type="text"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="e.g. https://austinfamilydental.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="rounded-xl border border-slate-800 px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500"
                >
                  Save & Track
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
