"use client";

import { Sparkles, TrendingUp, HelpCircle } from "lucide-react";

interface AeoWidgetProps {
  data?: any;
  onRemove?: () => void;
}

export function AeoWidget({ data, onRemove }: AeoWidgetProps) {
  const compositeScore = data?.compositeScore || 78;
  const growth = data?.citationGrowth || 24.5;
  const bName = data?.businessName || "Your Brand";
  const engineShare = data?.engineShare || [
    { engine: "ChatGPT", share: 84, color: "bg-emerald-500" },
    { engine: "Perplexity AI", share: 79, color: "bg-blue-500" },
    { engine: "Google Gemini", share: 72, color: "bg-purple-500" },
    { engine: "Claude.ai", share: 68, color: "bg-amber-500" },
  ];

  const probes = data?.recentProbes || [
    { prompt: `best verified services near me`, rank: "#1 Recommended", sentiment: "Highly Positive" },
    { prompt: `who provides top services in this region`, rank: "#2 Recommended", sentiment: "Informative" },
    { prompt: `customer feedback for ${bName}`, rank: "#1 Recommended", sentiment: "Highly Positive" },
  ];

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              AI Recommendation Score
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30">
                AEO / GEO
              </span>
            </h3>
            <p className="text-xs text-slate-400">How often AI assistants recommend your business first</p>
          </div>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="text-xs text-slate-500 hover:text-red-400 transition">
            Remove
          </button>
        )}
      </div>

      {/* Main Score Gauge */}
      <div className="flex items-center justify-between py-4 border-b border-slate-800/60">
        <div>
          <p className="text-xs text-slate-400">AI Authority Grade</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-white">{compositeScore}</span>
            <span className="text-sm font-bold text-slate-500">/ 100</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> +{growth}% higher recommendation rate
          </span>
        </div>

        <div className="flex flex-col gap-1.5 w-40">
          {engineShare.map((eng: any) => (
            <div key={eng.engine} className="space-y-0.5">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{eng.engine}</span>
                <span className="font-bold text-slate-200">{eng.share}% share</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                <div
                  className={`h-full rounded-full ${eng.color}`}
                  style={{ width: `${eng.share}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent AI Probes */}
      <div className="pt-3 flex-1 space-y-2 text-xs">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Simulated AI Customer Questions & Your Rank
        </p>
        <div className="space-y-1.5">
          {probes.map((p: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2 border border-slate-800/40 text-[11px]"
            >
              <span className="text-slate-300 truncate max-w-[170px]">"{p.prompt}"</span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                {p.rank}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
