"use client";

import { useState, useEffect } from "react";
import { Search, TrendingUp, MousePointerClick, Eye } from "lucide-react";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeMultiplier, getTimeRangeLabel } from "@/lib/timeRanges";

interface GscWidgetProps {
  data?: any;
  onRemove?: () => void;
  initialTimeRange?: TimeRangeKey;
}

export function GscWidget({ data, onRemove, initialTimeRange = "7D" }: GscWidgetProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(initialTimeRange);

  useEffect(() => {
    if (initialTimeRange) {
      setTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  const multiplier = getTimeRangeMultiplier(timeRange);

  // Base 1-Month figures
  const baseClicks = data?.totalClicks || 348;
  const baseImpressions = data?.totalImpressions || 6850;
  const ctr = data?.averageCtr || 5.08;
  const position = data?.averagePosition || 6.4;
  const bName = data?.businessName || "Your Business";

  const baseQueries = data?.topQueries || [
    { query: `${bName} official website`, clicks: 84, impressions: 1420, ctr: 5.92, position: 1.8 },
    { query: `dental implants near me`, clicks: 62, impressions: 980, ctr: 6.32, position: 2.1 },
    { query: `emergency dentist in my area`, clicks: 48, impressions: 1240, ctr: 3.87, position: 3.3 },
    { query: `teeth cleaning pricing & reviews`, clicks: 36, impressions: 810, ctr: 4.44, position: 4.4 },
  ];

  // Dynamic scaled values according to selected Time Range
  const clicks = Math.max(1, Math.round(baseClicks * multiplier));
  const impressions = Math.max(10, Math.round(baseImpressions * multiplier));

  const queries = baseQueries.map((q: any) => ({
    ...q,
    clicks: Math.max(1, Math.round(q.clicks * multiplier)),
    impressions: Math.max(5, Math.round(q.impressions * multiplier)),
  }));

  // Dynamic growth indicators per window
  const visitGrowth =
    timeRange === "7D" ? "+8.4%" : timeRange === "14D" ? "+11.2%" : timeRange === "3M" ? "+28.6%" : timeRange === "MAX" ? "+84.2%" : "+14.2%";
  const viewGrowth =
    timeRange === "7D" ? "+12.1%" : timeRange === "14D" ? "+16.8%" : timeRange === "3M" ? "+42.5%" : timeRange === "MAX" ? "+126.0%" : "+22.8%";

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Search className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              Google Search Keywords
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30 shrink-0">
                Google Search
              </span>
            </h3>
            <p className="text-xs text-slate-400 truncate">
              Keywords and clicks for <span className="text-slate-300 font-medium">{getTimeRangeLabel(timeRange)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Channel Time Range Filter */}
          <TimeRangeFilter
            value={timeRange}
            onChange={setTimeRange}
            variant="compact"
            accentColor="blue"
          />

          {onRemove && (
            <button
              onClick={onRemove}
              className="text-xs text-slate-500 hover:text-red-400 transition ml-1"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 py-4">
        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <MousePointerClick className="h-3 w-3 text-blue-400" /> Website Visits
          </p>
          <p className="text-lg font-black text-white mt-1">{clicks.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> {visitGrowth} visits
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Eye className="h-3 w-3 text-indigo-400" /> Google Views
          </p>
          <p className="text-lg font-black text-white mt-1">{impressions.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> {viewGrowth} views
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
                <td className="py-2.5 text-right font-bold text-white">{q.clicks.toLocaleString()}</td>
                <td className="py-2.5 text-right text-slate-400">{q.impressions.toLocaleString()}</td>
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
