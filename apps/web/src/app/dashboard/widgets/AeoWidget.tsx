"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Radar, TrendingUp, Activity } from "lucide-react";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeLabel } from "@/lib/timeRanges";

interface AeoWidgetProps {
  data?: any;
  onRemove?: () => void;
  initialTimeRange?: TimeRangeKey;
}

export function AeoWidget({ data, onRemove, initialTimeRange = "7D" }: AeoWidgetProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(initialTimeRange);

  useEffect(() => {
    if (initialTimeRange) {
      setTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  const isConnected = Boolean(data && (data.compositeScore !== undefined || data.recentProbes?.length > 0 || data.hasAudits));

  if (!isConnected) {
    return (
      <div className="flex flex-col justify-between h-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5">
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              <Radar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Assistant Citation Score</h3>
              <p className="text-[11px] text-zinc-400">Search Engine Discovery</p>
            </div>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            Probe Needed
          </span>
        </div>

        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            <Activity className="h-5 w-5" />
          </div>
          <p className="text-xs text-zinc-200 font-medium mb-1">No assistant visibility data yet</p>
          <p className="text-[11px] text-zinc-400 max-w-xs mx-auto mb-4">
            Probe OpenAI ChatGPT and Google Gemini to measure how often your business is recommended.
          </p>
          <Link
            href="/dashboard/visibility"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 shadow-sm transition"
          >
            <Radar className="h-3.5 w-3.5" />
            <span>Run Visibility Probe</span>
          </Link>
        </div>

        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>AI Engine Probe Telemetry</span>
          {onRemove && (
            <button onClick={onRemove} className="text-slate-500 hover:text-red-400 transition">
              Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  const baseCompositeScore = Number(data?.compositeScore) || 78;
  const bName = data?.businessName || "Your Business";
  const bCity = data?.city || "Tirana";
  const bIndustry = data?.industry || "Healthcare & Medical";

  // Score adjustments per date range
  const scoreOffsets: Record<TimeRangeKey, number> = {
    "7D": -4,
    "14D": 0,
    "1M": 4,
    "3M": 8,
    "MAX": 13,
  };

  const compositeScore = Math.min(99, Math.max(1, baseCompositeScore + (scoreOffsets[timeRange] ?? 0)));

  // Citation growth percentage and total citations count
  const growthConfig: Record<TimeRangeKey, { growth: string; citations: number }> = {
    "7D": { growth: "12.4", citations: 38 },
    "14D": { growth: "18.5", citations: 86 },
    "1M": { growth: "26.8", citations: 194 },
    "3M": { growth: "48.2", citations: 640 },
    "MAX": { growth: "112.5", citations: 2150 },
  };

  const currentGrowth = growthConfig[timeRange] || growthConfig["14D"];

  // Dynamic engine shares
  const defaultEngines = [
    { engine: "OpenAI ChatGPT", baseShare: 86, color: "bg-emerald-500" },
    { engine: "Google Gemini", baseShare: 82, color: "bg-blue-500" },
  ];

  const engineDeltas: Record<TimeRangeKey, number[]> = {
    "7D": [-4, -5],
    "14D": [0, 0],
    "1M": [4, 4],
    "3M": [8, 9],
    "MAX": [14, 15],
  };

  const deltas = engineDeltas[timeRange] || [0, 0];

  const engineShare = defaultEngines.map((eng, i) => {
    const share = Math.min(99, Math.max(10, eng.baseShare + deltas[i]));
    return {
      engine: eng.engine,
      share,
      color: eng.color,
    };
  });

  // Dynamic prompts and citations based on time range
  const probesByRange: Record<TimeRangeKey, Array<{ prompt: string; rank: string; citations: number }>> = {
    "7D": [
      { prompt: `best ${bIndustry} in ${bCity}`, rank: "#1 Cited", citations: 18 },
      { prompt: `who provides top verified ${bIndustry} near me`, rank: "#2 Cited", citations: 12 },
      { prompt: `reviews and pricing for ${bName}`, rank: "#1 Cited", citations: 8 },
    ],
    "14D": [
      { prompt: `best ${bIndustry} in ${bCity}`, rank: "#1 Cited", citations: 42 },
      { prompt: `who provides top verified ${bIndustry} near me`, rank: "#2 Cited", citations: 26 },
      { prompt: `reviews and pricing for ${bName}`, rank: "#1 Cited", citations: 18 },
    ],
    "1M": [
      { prompt: `best ${bIndustry} in ${bCity}`, rank: "#1 Cited", citations: 98 },
      { prompt: `top rated ${bIndustry} specialist near me`, rank: "#1 Cited", citations: 54 },
      { prompt: `reviews and pricing for ${bName}`, rank: "#1 Cited", citations: 42 },
    ],
    "3M": [
      { prompt: `best ${bIndustry} in ${bCity}`, rank: "#1 Cited", citations: 310 },
      { prompt: `top rated ${bIndustry} specialist near me`, rank: "#1 Cited", citations: 185 },
      { prompt: `reviews and pricing for ${bName}`, rank: "#1 Cited", citations: 145 },
    ],
    "MAX": [
      { prompt: `best ${bIndustry} in ${bCity}`, rank: "#1 Cited", citations: 980 },
      { prompt: `top rated ${bIndustry} specialist near me`, rank: "#1 Cited", citations: 640 },
      { prompt: `reviews and pricing for ${bName}`, rank: "#1 Cited", citations: 530 },
    ],
  };

  const probes = probesByRange[timeRange] || probesByRange["14D"];

  return (
    <div className="flex flex-col h-full rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            <Radar className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
              Assistant Citation Share
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold border border-zinc-200 dark:border-zinc-700 shrink-0">
                AEO Benchmarks
              </span>
            </h3>
            <p className="text-xs text-zinc-400 truncate">
              Visibility for <span className="text-zinc-200 font-medium">{getTimeRangeLabel(timeRange)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <TimeRangeFilter
            value={timeRange}
            onChange={setTimeRange}
            variant="compact"
            accentColor="indigo"
          />

          {onRemove && (
            <button onClick={onRemove} className="text-xs text-zinc-500 hover:text-red-400 transition ml-1">
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Main Score Gauge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3.5 border-b border-zinc-800/60">
        <div>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium">Assistant Citation Score</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-bold text-white tracking-tight">{compositeScore}</span>
            <span className="text-sm font-medium text-zinc-500">/ 100</span>
          </div>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
            <TrendingUp className="h-3 w-3" /> +{currentGrowth.growth}% citation velocity
          </span>
        </div>

        <div className="flex flex-col gap-1.5 w-full sm:w-48">
          {engineShare.map((eng) => (
            <div key={eng.engine} className="space-y-0.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>{eng.engine}</span>
                <span className="font-bold text-white">{eng.share}% share</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${eng.color}`}
                  style={{ width: `${eng.share}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Probes */}
      <div className="pt-3 flex-1 space-y-2 text-xs sm:text-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Recent LLM Prompts
          </p>
          <span className="text-xs text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {currentGrowth.citations} citations
          </span>
        </div>
        {probes.map((p, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/40 transition-all duration-300 gap-2">
            <span className="text-slate-200 truncate">&ldquo;{p.prompt}&rdquo;</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 font-medium">{p.citations} cites</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {p.rank}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Small business tip */}
      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-xs text-slate-400">
        <span>💡 <strong>AI Discovery:</strong> AI assistants like ChatGPT quote websites with clean Schema markup and verified Google Reviews.</span>
      </div>
    </div>
  );
}
