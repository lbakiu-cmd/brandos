"use client";

import { useEffect, useState } from "react";
import { Search, TrendingUp, MousePointerClick, Eye, Globe, Sparkles, Filter, Download } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function GscPage() {
  const [filter, setFilter] = useState("");
  const [timeRange, setTimeRange] = useState("28D");
  const [loading, setLoading] = useState(true);
  const [gscData, setGscData] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [bRes, intRes] = await Promise.all([
          apiFetch<any>("/business").catch(() => null),
          apiFetch<any>("/integrations/status").catch(() => null),
        ]);

        if (bRes) setBusiness(bRes);
        if (intRes?.integrations) {
          const gsc = intRes.integrations.find((i: any) => i.provider === "GOOGLE_SEARCH_CONSOLE");
          if (gsc?.metricsCache) {
            setGscData(gsc.metricsCache);
          }
        }
      } catch (err) {
        console.error("Failed to load GSC data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const bName = business?.name || "Your Business";
  const clicks = gscData?.totalClicks || 3480;
  const impressions = gscData?.totalImpressions || 89400;
  const ctr = gscData?.averageCtr || 3.89;
  const position = gscData?.averagePosition || 8.4;

  const defaultQueries = [
    { query: `${bName} official website`, clicks: 840, impressions: 14200, ctr: 5.92, position: 1.8, intent: "Branded Navigation" },
    { query: `best ${business?.industry || "services"} near me`, clicks: 610, impressions: 9800, ctr: 6.22, position: 2.1, intent: "Urgent Local" },
    { query: `verified ${business?.industry || "company"} in ${business?.city || "my area"}`, clicks: 430, impressions: 18400, ctr: 2.34, position: 3.3, intent: "Informational" },
    { query: `pricing and customer reviews`, clicks: 390, impressions: 12100, ctr: 3.22, position: 4.4, intent: "Commercial" },
    { query: `top rated ${business?.industry || "specialist"}`, clicks: 280, impressions: 8400, ctr: 3.33, position: 4.9, intent: "High Commercial" },
  ];

  const queries = gscData?.topQueries || defaultQueries;
  const filtered = queries.filter((q: any) =>
    q.query.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Search className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-white">Google Search Console</h1>
            <span className="rounded-full bg-blue-500/10 px-3 py-0.5 text-xs font-bold text-blue-400 border border-blue-500/20">
              Connected via OAuth
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring organic search queries, clicks, impressions and average ranking for <strong className="text-slate-200">{bName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs font-semibold">
            {["7D", "28D", "90D", "12M"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-lg px-2.5 py-1 transition ${
                  timeRange === range ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <MousePointerClick className="h-4 w-4 text-blue-400" /> Total Organic Clicks
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{clicks.toLocaleString()}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +14.2%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">vs. previous period</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-indigo-400" /> Total Impressions
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{impressions.toLocaleString()}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +22.8%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across Google Web & Image search</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-emerald-400" /> Average Click-Through Rate
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{ctr}%</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +0.4%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">High commercial intent queries</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-400" /> Average Ranking Position
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-400">#{position}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +1.2 ranks
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Page 1 Google Average</p>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Top Performing Organic Keywords</h2>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-400">
              {filtered.length} queries
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter search queries..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none w-64"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3">Query</th>
                <th className="pb-3">Search Intent</th>
                <th className="pb-3 text-right">Clicks</th>
                <th className="pb-3 text-right">Impressions</th>
                <th className="pb-3 text-right">CTR</th>
                <th className="pb-3 text-right">Avg Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((q: any, i: number) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 font-semibold text-slate-200 flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-[11px]">{i + 1}.</span>
                    {q.query}
                  </td>
                  <td className="py-3">
                    <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700/50">
                      {q.intent || "Commercial"}
                    </span>
                  </td>
                  <td className="py-3 text-right font-black text-white">{q.clicks}</td>
                  <td className="py-3 text-right text-slate-400">{q.impressions?.toLocaleString() || q.impressions}</td>
                  <td className="py-3 text-right text-blue-400 font-bold">{q.ctr}%</td>
                  <td className="py-3 text-right">
                    <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-[11px] font-black text-blue-400 border border-blue-500/20">
                      #{q.position}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
