"use client";

import { BarChart3, Bot, TrendingUp, Sparkles, HelpCircle } from "lucide-react";

interface Ga4WidgetProps {
  data?: any;
  onRemove?: () => void;
}

export function Ga4Widget({ data, onRemove }: Ga4WidgetProps) {
  const totalUsers = data?.totalUsers || 14280;
  const aiSessions = data?.aiReferralSessions || 2340;
  const aiShare = data?.aiReferralShare || 16.4;
  const engines = data?.aiEngines || [
    { engine: "ChatGPT (chatgpt.com)", sessions: 1180, growth: 42.1, avgTime: "2m 45s", goalConvRate: 8.4 },
    { engine: "Perplexity AI", sessions: 640, growth: 58.6, avgTime: "3m 12s", goalConvRate: 11.2 },
    { engine: "Google Gemini / AI Overview", sessions: 390, growth: 24.3, avgTime: "1m 55s", goalConvRate: 6.8 },
    { engine: "Claude.ai", sessions: 130, growth: 19.5, avgTime: "2m 10s", goalConvRate: 7.5 },
  ];

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Website Visitors from AI Chatbots
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                AI Traffic
              </span>
            </h3>
            <p className="text-xs text-slate-400">People recommended to your site by ChatGPT, Gemini, and Claude</p>
          </div>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="text-xs text-slate-500 hover:text-red-400 transition">
            Remove
          </button>
        )}
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-3 gap-3 py-4">
        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium">Total Website Users</p>
          <p className="text-lg font-black text-white mt-1">{totalUsers.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> +18.4% this month
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-400" /> AI-Generated Visits
          </p>
          <p className="text-lg font-black text-amber-400 mt-1">{aiSessions.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> +46.2% AI growth
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
                <td className="py-2.5 text-right font-bold text-white">{e.sessions}</td>
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
