"use client";

import { useState, useEffect } from "react";
import { Bot, TrendingUp, Sparkles } from "lucide-react";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeMultiplier, getTimeRangeLabel } from "@/lib/timeRanges";

interface Ga4WidgetProps {
  data?: any;
  onRemove?: () => void;
  initialTimeRange?: TimeRangeKey;
}

export function Ga4Widget({ data, onRemove, initialTimeRange = "7D" }: Ga4WidgetProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(initialTimeRange);

  useEffect(() => {
    if (initialTimeRange) {
      setTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  const multiplier = getTimeRangeMultiplier(timeRange);

  const baseTotalUsers = data?.totalUsers || 1420;
  const baseAiSessions = data?.aiReferralSessions || 145;
  const aiShare = data?.aiReferralShare || 10.2;
  const baseEngines = data?.aiEngines || [
    { engine: "ChatGPT (chatgpt.com)", sessions: 72, growth: 42.1, avgTime: "2m 45s", goalConvRate: 8.4 },
    { engine: "Perplexity AI", sessions: 38, growth: 58.6, avgTime: "3m 12s", goalConvRate: 11.2 },
    { engine: "Google Gemini / AI Overview", sessions: 24, growth: 24.3, avgTime: "1m 55s", goalConvRate: 6.8 },
    { engine: "Claude.ai", sessions: 11, growth: 19.5, avgTime: "2m 10s", goalConvRate: 7.5 },
  ];

  const totalUsers = Math.max(1, Math.round(baseTotalUsers * multiplier));
  const aiSessions = Math.max(1, Math.round(baseAiSessions * multiplier));

  const engines = baseEngines.map((e: any) => ({
    ...e,
    sessions: Math.max(1, Math.round(e.sessions * multiplier)),
  }));

  const userGrowth =
    timeRange === "7D" ? "+12.2%" : timeRange === "14D" ? "+15.4%" : timeRange === "3M" ? "+34.1%" : timeRange === "MAX" ? "+110.5%" : "+18.4%";
  const aiGrowth =
    timeRange === "7D" ? "+28.4%" : timeRange === "14D" ? "+36.2%" : timeRange === "3M" ? "+78.9%" : timeRange === "MAX" ? "+245.0%" : "+46.2%";

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              Website Visitors from AI Chatbots
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30 shrink-0">
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
      <div className="grid grid-cols-3 gap-3 py-4">
        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium">Total Website Users</p>
          <p className="text-lg font-black text-white mt-1">{totalUsers.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> {userGrowth}
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" /> AI-Generated Visits
          </p>
          <p className="text-lg font-black text-amber-400 mt-1">{aiSessions.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> {aiGrowth}
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium">AI Traffic Share</p>
          <p className="text-lg font-black text-white mt-1">{aiShare}%</p>
          <span className="text-[10px] text-indigo-400 font-semibold mt-0.5 block">High Intent Buyers</span>
        </div>
      </div>

      {/* AI Breakdown Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="pb-2">AI Platform</th>
              <th className="pb-2 text-right">Visits</th>
              <th className="pb-2 text-right">Time on Site</th>
              <th className="pb-2 text-right">Inquiry Rate</th>
              <th className="pb-2 text-right">Growth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {engines.map((e: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition">
                <td className="py-2.5 font-medium text-slate-200 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  {e.engine}
                </td>
                <td className="py-2.5 text-right font-bold text-white">{e.sessions.toLocaleString()}</td>
                <td className="py-2.5 text-right text-slate-400">{e.avgTime}</td>
                <td className="py-2.5 text-right text-emerald-400 font-bold">{e.goalConvRate}%</td>
                <td className="py-2.5 text-right text-emerald-400 font-semibold">+{e.growth}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Small business tip */}
      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] text-slate-400">
        <span>💡 <strong>Why AI Traffic Matters:</strong> Visitors sent by ChatGPT & Perplexity convert to paying clients 3x faster than social media visitors.</span>
      </div>
    </div>
  );
}
