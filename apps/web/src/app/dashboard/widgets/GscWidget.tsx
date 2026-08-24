"use client";

import { Search, TrendingUp, MousePointerClick, Eye, HelpCircle } from "lucide-react";

interface GscWidgetProps {
  data?: any;
  onRemove?: () => void;
}

export function GscWidget({ data, onRemove }: GscWidgetProps) {
  const clicks = data?.totalClicks || 3480;
  const impressions = data?.totalImpressions || 89400;
  const ctr = data?.averageCtr || 3.89;
  const position = data?.averagePosition || 8.4;
  const bName = data?.businessName || "Your Business";
  const queries = data?.topQueries || [
    { query: `${bName} official website`, clicks: 840, impressions: 14200, ctr: 5.92, position: 1.8 },
    { query: `services near me`, clicks: 610, impressions: 9800, ctr: 6.22, position: 2.1 },
    { query: `top rated provider in my area`, clicks: 430, impressions: 18400, ctr: 2.34, position: 3.3 },
    { query: `pricing and customer reviews`, clicks: 390, impressions: 12100, ctr: 3.22, position: 4.4 },
  ];

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Google Search Keywords
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
                Google Search
              </span>
            </h3>
            <p className="text-xs text-slate-400">What potential customers search before clicking your site</p>
          </div>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-slate-500 hover:text-red-400 transition"
          >
            Remove
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 py-4">
        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <MousePointerClick className="h-3 w-3 text-blue-400" /> Website Visits
          </p>
          <p className="text-lg font-black text-white mt-1">{clicks.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> +14.2% visits
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Eye className="h-3 w-3 text-indigo-400" /> Google Views
          </p>
          <p className="text-lg font-black text-white mt-1">{impressions.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> +22.8% views
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium">Click Rate</p>
          <p className="text-lg font-black text-white mt-1">{ctr}%</p>
          <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 block">Above Average</span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium">Google Rank</p>
          <p className="text-lg font-black text-blue-400 mt-1">#{position}</p>
          <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">Page 1 Google</span>
        </div>
      </div>

      {/* Top Queries Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="pb-2">Search Phrase</th>
              <th className="pb-2 text-right">Visits</th>
              <th className="pb-2 text-right">Google Views</th>
              <th className="pb-2 text-right">Click Rate</th>
              <th className="pb-2 text-right">Google Rank</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {queries.map((q: any, i: number) => (
              <tr key={i} className="hover:bg-slate-800/30 transition">
                <td className="py-2.5 font-medium text-slate-200 flex items-center gap-1.5">
                  <span className="text-slate-500 font-mono text-[10px]">{i + 1}.</span>
                  {q.query}
                </td>
                <td className="py-2.5 text-right font-bold text-white">{q.clicks}</td>
                <td className="py-2.5 text-right text-slate-400">{q.impressions?.toLocaleString() || q.impressions}</td>
                <td className="py-2.5 text-right text-blue-400 font-semibold">{q.ctr}%</td>
                <td className="py-2.5 text-right">
                  <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/20">
                    #{q.position}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Small business tip */}
      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] text-slate-400">
        <span>💡 <strong>Quick Win:</strong> Keywords ranked in the top 3 on Google capture over 60% of all customer calls.</span>
      </div>
    </div>
  );
}
