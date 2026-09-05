"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type ProspectResult = {
  status: string;
  url: string;
  domain: string;
  businessName: string;
  city: string;
  overallScore: number;
  grade: string;
  gradeLabel: string;
  criticalRedFlags: Array<{ title: string; severity: string }>;
  pitch: string;
};

const SAMPLE_LIST = `acmegrowthconsulting.com
metrohvacservices.com
bayarealawgroup.com
summitrealestateteam.com
coastalwellnessclinic.com`;

export default function ProspectorPage() {
  const [urlsText, setUrlsText] = useState(SAMPLE_LIST);
  const [city, setCity] = useState("Austin, TX");
  const [results, setResults] = useState<ProspectResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function handleBulkScan() {
    const rawUrls = urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (rawUrls.length === 0) return;

    setScanning(true);
    try {
      const items = rawUrls.map((u) => ({
        url: u,
        city: city || undefined,
      }));

      const res = await apiFetch<ProspectResult[]>("/audits/bulk-scan", {
        method: "POST",
        body: JSON.stringify({ items }),
      });

      setResults(res);
    } catch (err: any) {
      alert(err.message || "Bulk scan encountered an error.");
    } finally {
      setScanning(false);
    }
  }

  const scoreColor = (s: number) =>
    s >= 75 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-rose-400";

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                Lead-Gen Engine
              </span>
              <span className="text-xs text-slate-500">• Cold Sales Outreach Studio</span>
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Bulk Lead Prospector & Cold Scanner</h1>
            <p className="text-sm text-slate-400">
              Audit up to 15 local businesses in bulk, rank them by missed AI opportunities, and generate 1-click cold email pitches.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              ← Dashboard
            </Link>
          </div>
        </header>

        {/* Input Box (2 Columns) */}
        <div className="mb-8 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Enter Prospect Website URLs (One per line)
              </label>
              <textarea
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                rows={5}
                placeholder="acmegrowthconsulting.com&#10;metrohvacservices.com&#10;bayarealawgroup.com"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex flex-col justify-between space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Target City / Region
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Austin, TX"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
                />
                <p className="mt-2 text-[11px] text-slate-400">
                  Tip: Target local businesses in the same city to highlight their competitive disadvantages.
                </p>
              </div>

              <button
                onClick={handleBulkScan}
                disabled={scanning || !urlsText.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition"
              >
                {scanning ? "⚡ Auditing Prospects in Bulk…" : "🚀 Run Bulk Opportunity Scan"}
              </button>
            </div>
          </div>
        </div>

        {/* Results List */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Prospect Opportunities (Sorted: Lowest Score = Biggest Sales Opportunity)
              </h2>
              <span className="text-xs text-slate-500">{results.length} Prospects Analyzed</span>
            </div>

            <div className="space-y-3">
              {results.map((p, idx) => (
                <div
                  key={idx}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur md:flex-row md:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-black text-slate-300">
                        #{idx + 1}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-white">{p.businessName}</h3>
                        <p className="text-xs text-slate-400">{p.domain} · {p.city || "Local Market"}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.criticalRedFlags.map((flag, fIdx) => (
                        <span
                          key={fIdx}
                          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300"
                        >
                          ✕ {flag.title}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 border-t border-slate-800/60 pt-3 md:border-t-0 md:pt-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500">Brand Score</span>
                      <p className={`text-3xl font-black ${scoreColor(p.overallScore)}`}>
                        {p.overallScore}%
                      </p>
                      <span className="text-[10px] font-semibold text-slate-400">
                        Grade {p.grade} ({p.gradeLabel})
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(p.pitch);
                        setCopiedIdx(idx);
                        setTimeout(() => setCopiedIdx(null), 2000);
                      }}
                      className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs font-bold text-blue-400 hover:bg-blue-500/20"
                    >
                      {copiedIdx === idx ? "✔ Copied Pitch!" : "✉️ Copy Cold Pitch"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
