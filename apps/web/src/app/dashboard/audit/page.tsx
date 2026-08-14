"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Finding = {
  id: string;
  category: string;
  severity: string;
  title: string;
  recommendation: string | null;
  passed: boolean;
};

type Audit = {
  id: string;
  url: string;
  score: number | null;
  status: string;
  findings: Finding[];
};

type Rec = { id: string; title: string; description: string | null; priority: string };

export default function AuditPage() {
  const [url, setUrl] = useState("https://");
  const [audits, setAudits] = useState<Audit[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [a, r] = await Promise.all([
      apiFetch<Audit[]>("/audits"),
      apiFetch<Rec[]>("/audits/recommendations"),
    ]);
    setAudits(a);
    setRecs(r);
    if (!selectedId && a.length > 0) setSelectedId(a[0].id);
  }, [selectedId]);

  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(() => refresh().catch(() => {}), 2500);
    return () => clearInterval(t);
  }, [refresh]);

  const selected = audits.find((a) => a.id === selectedId) ?? null;

  async function run() {
    setBusy(true);
    try {
      const audit = await apiFetch<Audit>("/audits", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      setSelectedId(audit.id);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const scoreColor = (s: number) =>
    s >= 70 ? "text-green-400" : s >= 40 ? "text-amber-400" : "text-red-400";

  const sevColor = (s: string) =>
    s === "CRITICAL" ? "bg-red-600" : s === "HIGH" ? "bg-orange-600" : s === "MEDIUM" ? "bg-amber-600" : "bg-slate-600";

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-400">AI Visibility Audit</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/dashboard" className="rounded-lg bg-slate-800 px-4 py-2 hover:bg-slate-700">Dashboard</Link>
          <Link href="/dashboard/inbox" className="rounded-lg bg-slate-800 px-4 py-2 hover:bg-slate-700">Inbox</Link>
          <Link href="/dashboard/content" className="rounded-lg bg-slate-800 px-4 py-2 hover:bg-slate-700">Content</Link>
        </div>
      </header>

      <div className="mb-8 flex gap-3 rounded-2xl bg-slate-800 p-6">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-business-website.com"
          className="flex-1 rounded-lg bg-slate-700 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={run}
          disabled={busy || !url.startsWith("http")}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Run audit
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          {selected && (
            <div className="rounded-2xl bg-slate-800 p-6">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-slate-300">{selected.url}</p>
                {selected.status === "COMPLETED" && selected.score !== null && (
                  <p className={`text-5xl font-bold ${scoreColor(selected.score)}`}>{selected.score}</p>
                )}
                {(selected.status === "QUEUED" || selected.status === "RUNNING") && (
                  <p className="animate-pulse text-sm text-amber-400">{selected.status}…</p>
                )}
                {selected.status === "FAILED" && (
                  <p className="text-sm text-red-400">FAILED</p>
                )}
              </div>

              <div className="space-y-3">
                {[...selected.findings]
                  .sort((a, b) => Number(a.passed) - Number(b.passed))
                  .map((f) => (
                    <div key={f.id} className="flex items-start gap-3 rounded-xl bg-slate-700/50 p-4">
                      <span className={f.passed ? "text-green-400" : "text-red-400"}>
                        {f.passed ? "✔" : "✖"}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{f.title}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sevColor(f.severity)}`}>
                            {f.severity}
                          </span>
                        </div>
                        {!f.passed && f.recommendation && (
                          <p className="mt-1 text-xs text-slate-400">→ {f.recommendation}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {!selected && <p className="text-slate-500">Run your first audit above.</p>}
        </section>

        <aside>
          <h2 className="mb-4 text-xl font-semibold">Recommendations</h2>
          <div className="space-y-3">
            {recs.map((r) => (
              <div key={r.id} className="rounded-xl bg-slate-800 p-4">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.priority === "HIGH" ? "bg-orange-600" : "bg-amber-600"}`}>
                    {r.priority}
                  </span>
                  <p className="text-sm font-semibold">{r.title}</p>
                </div>
                {r.description && <p className="mt-1 text-xs text-slate-400">{r.description}</p>}
              </div>
            ))}
            {recs.length === 0 && <p className="text-slate-500 text-sm">No open recommendations.</p>}
          </div>
        </aside>
      </div>
    </main>
  );
}