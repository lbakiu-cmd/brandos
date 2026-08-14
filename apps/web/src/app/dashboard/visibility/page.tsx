"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type EngineMention = {
  engine: string;
  mentioned: boolean;
  rank: number | null;
  sentiment: string;
  quote: string;
};

type Report = {
  id: string;
  overallScore: number | null;
  mentions: EngineMention[] | null;
  createdAt: string;
};

export default function VisibilityPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const list = await apiFetch<Report[]>("/ai-reports");
    setReports(list);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(() => refresh().catch(() => {}), 2500);
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
    s >= 70 ? "text-green-400" : s >= 40 ? "text-amber-400" : "text-red-400";

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-400">AI Visibility</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/dashboard" className="rounded-lg bg-slate-800 px-4 py-2 hover:bg-slate-700">Dashboard</Link>
          <Link href="/dashboard/audit" className="rounded-lg bg-slate-800 px-4 py-2 hover:bg-slate-700">Audit</Link>
          <Link href="/dashboard/inbox" className="rounded-lg bg-slate-800 px-4 py-2 hover:bg-slate-700">Inbox</Link>
          <Link href="/dashboard/content" className="rounded-lg bg-slate-800 px-4 py-2 hover:bg-slate-700">Content</Link>
        </div>
      </header>

      <div className="mb-8 rounded-2xl bg-slate-800 p-6">
        <p className="mb-4 text-sm text-slate-300">
          We ask ChatGPT, Gemini, Claude, Perplexity & co: "Do you know this business?" — and measure how visible your brand is inside AI answers.
        </p>
        <button
          onClick={run}
          disabled={busy || running}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? "Engines are thinking…" : "Run AI Visibility report"}
        </button>
      </div>

      {latest && latest.mentions && (
        <>
          <div className="mb-8 flex items-center gap-6">
            <p className={`text-7xl font-bold ${scoreColor(latest.overallScore ?? 0)}`}>
              {latest.overallScore}
            </p>
            <div>
              <p className="font-semibold">AI Visibility Score</p>
              <p className="text-sm text-slate-400">% of engines that mention your business</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {latest.mentions.map((m) => (
              <div key={m.engine} className="rounded-2xl bg-slate-800 p-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold">{m.engine}</p>
                  <span className={m.mentioned ? "text-green-400" : "text-red-400"}>
                    {m.mentioned ? "✔ mentioned" : "✖ invisible"}
                  </span>
                </div>
                {m.mentioned && m.rank !== null && (
                  <p className="mb-2 text-xs text-slate-400">Rank #{m.rank} · {m.sentiment}</p>
                )}
                <p className="text-xs italic text-slate-300">"{m.quote}"</p>
              </div>
            ))}
          </div>
        </>
      )}

      {!latest && <p className="text-slate-500">No reports yet. Run your first one above.</p>}
    </main>
  );
}