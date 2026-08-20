"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, authApi } from "@/lib/api";

type ReportData = {
  composite: {
    overallScore: number;
    grade: string;
    gradeLabel: string;
    pillars: {
      website: { score: number; status: string };
      gbp: { score: number; status: string };
      aiVisibility: { score: number; status: string };
      social: { score: number; status: string };
    };
  };
  latestWeb: any;
  latestGbp: any;
  latestSocial: any;
  latestAi: any;
  recommendations: Array<{
    id: string;
    title: string;
    description: string | null;
    priority: string;
    expectedImpact: number;
    estimatedEffort: number;
    status: string;
    category: string | null;
  }>;
};

export default function ReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Pitch Modal State
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await authApi.me();
        setUser(me.user);
        const overview = await apiFetch<ReportData>("/audits/overview");
        setData(overview);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !data || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        <p>Generating Executive Report…</p>
      </main>
    );
  }

  const biz = user.memberships[0]?.business;
  const composite = data.composite;
  const overall = composite.overallScore;

  const scoreColor = (s: number) =>
    s >= 75 ? "text-emerald-500" : s >= 50 ? "text-amber-500" : "text-rose-500";

  // Cold Email Pitch Template for Agencies
  const pitchSubject = `Quick note regarding ${biz?.name}'s AI search visibility in ${biz?.city || "your area"}`;
  const pitchBody = `Hi ${biz?.name} Team,

I recently ran a diagnostic audit of ${biz?.name}'s local discovery footprint across ChatGPT, Perplexity, Google Maps, and search engines.

Your current Brand Health Score is ${overall}/100 (${composite.grade} - ${composite.gradeLabel}).

While your business has strong local reputation foundations, we identified a few critical AI visibility gaps:
1. Missing Schema.org machine-readable structured data for ${biz?.industry || "your industry"}.
2. Lack of standard /llms.txt knowledge manifest (blocking LLM agent citations).
3. Question-answer formatting gaps in primary landing pages.

I put together an executive PDF report and concrete 1-click code fixes to bring your visibility to 90+. 

Would you be open to a quick 10-minute chat this Thursday to review the audit findings?

Best regards,
Your Growth Team
`;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100 print:bg-white print:p-0 print:text-black">
      {/* Top Toolbar (Hidden on Print) */}
      <div className="mx-auto mb-8 flex max-w-4xl flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 print:hidden">
        <Link
          href="/dashboard"
          className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
        >
          ← Back to Dashboard
        </Link>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPitchModal(true)}
            className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition"
          >
            <span>✉️</span>
            <span>Generate Client Sales Pitch</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition"
          >
            <span>📄</span>
            <span>Download / Print PDF Report</span>
          </button>
        </div>
      </div>

      {/* Printable Paper Document Container */}
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-10 shadow-2xl print:border-none print:bg-white print:p-8 print:shadow-none">
        {/* Executive Header */}
        <div className="flex flex-wrap items-start justify-between border-b border-slate-800 pb-8 print:border-slate-300">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                B
              </span>
              <span className="text-xl font-bold tracking-tight text-white print:text-black">
                BrandOS Executive Visibility Audit
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-black text-white print:text-black">{biz?.name}</h1>
            <p className="mt-1 text-xs text-slate-400 print:text-slate-600">
              {biz?.website || "Website Unlisted"} · {biz?.city || "Local Market"} · Vertical: {biz?.industry || "Local Business"}
            </p>
          </div>
          <div className="mt-4 text-right sm:mt-0">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-bold text-slate-300 print:border print:border-slate-300 print:bg-slate-100 print:text-black">
              Official Assessment
            </span>
            <p className="mt-2 text-xs text-slate-500 print:text-slate-600">
              Audit Date: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Master Score Block */}
        <div className="my-8 rounded-2xl border border-slate-800 bg-slate-950 p-6 print:border-slate-300 print:bg-slate-50">
          <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-3">
            <div className="text-center sm:border-r sm:border-slate-800 print:border-slate-300">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">
                Omnichannel Health Score
              </span>
              <div className={`mt-2 text-6xl font-black ${scoreColor(overall)}`}>
                {overall}
                <span className="text-2xl font-normal text-slate-500 print:text-slate-400">/100</span>
              </div>
              <span className="mt-2 inline-block rounded-full bg-slate-800 px-3 py-0.5 text-xs font-bold text-slate-300 print:bg-slate-200 print:text-black">
                Grade {composite.grade} · {composite.gradeLabel}
              </span>
            </div>

            <div className="space-y-3 sm:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-600">
                4-Pillar Channel Performance
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-center print:border-slate-300 print:bg-white">
                  <span className="text-[10px] text-slate-500 print:text-slate-600">Website & Schema</span>
                  <p className="text-base font-bold text-white print:text-black">{data.latestWeb?.score ?? "—"}%</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-center print:border-slate-300 print:bg-white">
                  <span className="text-[10px] text-slate-500 print:text-slate-600">Google Business</span>
                  <p className="text-base font-bold text-white print:text-black">{data.latestGbp?.score ?? "—"}%</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-center print:border-slate-300 print:bg-white">
                  <span className="text-[10px] text-slate-500 print:text-slate-600">AI Recommendation Engine</span>
                  <p className="text-base font-bold text-white print:text-black">{data.latestAi?.overallScore != null ? `${data.latestAi.overallScore}%` : "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-center print:border-slate-300 print:bg-white">
                  <span className="text-[10px] text-slate-500 print:text-slate-600">Social Footprint</span>
                  <p className="text-base font-bold text-white print:text-black">{data.latestSocial?.score ?? "—"}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prioritized Action Plan */}
        <div className="mt-8">
          <h2 className="text-base font-bold text-white print:text-black">
            Prioritized Roadmap & Improvement Plan
          </h2>
          <p className="text-xs text-slate-400 print:text-slate-600 mb-4">
            Executing these high-impact items will systematically elevate local rankings and AI engine recommendations.
          </p>

          <div className="space-y-3">
            {data.recommendations.map((rec, i) => (
              <div
                key={rec.id}
                className="flex items-start justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 print:border-slate-300 print:bg-white"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-400 print:bg-blue-100 print:text-blue-700">
                    {i + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white print:text-black">{rec.title}</p>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-400 print:bg-slate-100 print:text-slate-700">
                        {rec.priority}
                      </span>
                    </div>
                    {rec.description && (
                      <p className="mt-1 text-[11px] text-slate-400 print:text-slate-600">
                        {rec.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-emerald-400 print:text-emerald-700">
                    +{rec.expectedImpact} pts
                  </span>
                  <p className="text-[10px] text-slate-500 print:text-slate-600">
                    ⏱ ~{rec.estimatedEffort}m
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-slate-800 pt-6 text-center text-[10px] text-slate-500 print:border-slate-300 print:text-slate-600">
          <p>Report generated by BrandOS · Confidential & Prepared for {biz?.name}</p>
        </div>
      </div>

      {/* 1-Click Pitch Outreach Modal */}
      {showPitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">✉️ Client Cold Outreach Pitch</h3>
                <p className="text-xs text-slate-400">
                  Copy and send this personalized email pitch to close {biz?.name} on your services.
                </p>
              </div>
              <button
                onClick={() => setShowPitchModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Subject Line</label>
                <input
                  readOnly
                  value={pitchSubject}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400">Email Body</label>
                <textarea
                  readOnly
                  rows={10}
                  value={pitchBody}
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {copiedPitch ? "✔ Copied to clipboard!" : "Ready to paste into Gmail or Outlook"}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPitchModal(false)}
                  className="rounded-xl border border-slate-800 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${pitchSubject}\n\n${pitchBody}`);
                    setCopiedPitch(true);
                    setTimeout(() => setCopiedPitch(false), 2000);
                  }}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500"
                >
                  {copiedPitch ? "✔ Copied Pitch!" : "📋 Copy Subject & Body"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
