"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bot, TrendingUp, Sparkles, Plug, BarChart3 } from "lucide-react";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeLabel } from "@/lib/timeRanges";
import { useGa4Metrics } from "@/lib/useGa4Metrics";
import { EngineDistributionGraphic } from "@/components/charts/EngineDistributionGraphic";

interface Ga4WidgetProps {
  data?: any;
  onRemove?: () => void;
  initialTimeRange?: TimeRangeKey;
}

export function Ga4Widget({ onRemove, initialTimeRange = "7D" }: Ga4WidgetProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(initialTimeRange);

  useEffect(() => {
    if (initialTimeRange) {
      setTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  const { data, error, loading } = useGa4Metrics(timeRange);
  const isConnected = data !== null;

  if (!isConnected) {
    return (
      <div className="flex flex-col justify-between h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Search & Visitor Traffic</h3>
              <p className="text-xs text-slate-400">GA4 AI Referral Tracking</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {loading ? "Loading" : "Unavailable"}
          </span>
        </div>

        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BarChart3 className="h-5 w-5" />
          </div>
          <p className="text-xs text-slate-300 font-medium mb-1">{loading ? "Loading Google Analytics data..." : error}</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-4">
            Connect your GA4 property to monitor real visitors arriving from ChatGPT, Perplexity, Claude and Google AI.
          </p>
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-500 shadow-lg shadow-amber-600/20 transition"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Connect GA4 Property</span>
          </Link>
        </div>

        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>Google Analytics 4 API</span>
          {onRemove && (
            <button onClick={onRemove} className="text-slate-500 hover:text-red-400 transition">
              Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  const totalUsers = data.totalUsers;
  const aiSessions = data.aiReferralSessions;
  const aiShare = data.aiReferralShare;
  const engines = data.aiEngines;
  const userGrowth = "Growth unavailable";
  const aiGrowth = "Growth unavailable";

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bot className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
              Website Visitors from AI Chatbots
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30 shrink-0">
                AI Traffic
              </span>
            </h3>
            <p className="text-xs text-slate-400 truncate">
              Traffic for <span className="text-slate-300 font-medium">{getTimeRangeLabel(timeRange)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <TimeRangeFilter
            value={timeRange}
            onChange={setTimeRange}
            variant="compact"
            accentColor="amber"
          />

          {onRemove && (
            <button onClick={onRemove} className="text-xs text-slate-500 hover:text-red-400 transition ml-1">
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4">
        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-xs text-slate-400 font-medium">Total Website Users</p>
          <p className="text-xl font-bold text-white mt-1">{totalUsers.toLocaleString()}</p>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
            <TrendingUp className="h-3 w-3" /> {userGrowth}
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" /> AI-Generated Visits
          </p>
          <p className="text-xl font-bold text-amber-400 mt-1">{aiSessions.toLocaleString()}</p>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
            <TrendingUp className="h-3 w-3" /> {aiGrowth}
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-xs text-slate-400 font-medium">AI Traffic Share</p>
          <p className="text-xl font-bold text-white mt-1">{aiShare}%</p>
          <span className="text-xs text-indigo-400 font-semibold mt-0.5 block">High Intent</span>
        </div>
      </div>

      {/* Graphics on Top of Data Table */}


      {engines.length > 0 && (
        <EngineDistributionGraphic
          engines={engines}
          totalAiSessions={aiSessions}
          compact={true}
        />
      )}

      {/* AI Breakdown Table */}
      <div className="flex-1 overflow-x-auto">
        {engines.length > 0 ? (
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-2.5">AI Platform</th>
                <th className="pb-2.5 text-right">Visits</th>
                <th className="pb-2.5 text-right">Time on Site</th>
                <th className="pb-2.5 text-right">Inquiry Rate</th>
                <th className="pb-2.5 text-right">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {engines.map((e: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-2.5 font-medium text-slate-200 flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    {e.engine}
                  </td>
                  <td className="py-2.5 text-right font-bold text-white">{e.sessions.toLocaleString()}</td>
                  <td className="py-2.5 text-right text-slate-400">{e.avgTime ?? "Unavailable"}</td>
                  <td className="py-2.5 text-right text-emerald-400 font-bold">{e.goalConvRate == null ? "Unavailable" : `${e.goalConvRate}%`}</td>
                  <td className="py-2.5 text-right text-emerald-400 font-semibold">{e.growth == null ? "Unavailable" : `${e.growth}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-8 text-center text-xs sm:text-sm text-slate-500">
            No AI search engine sessions recorded yet.
          </div>
        )}
      </div>

      {/* Small business tip */}
      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-xs text-slate-400">
        <span>💡 <strong>Why AI Traffic Matters:</strong> Visitors sent by ChatGPT & Perplexity convert to paying clients 3x faster than social media visitors.</span>
      </div>
    </div>
  );
}
