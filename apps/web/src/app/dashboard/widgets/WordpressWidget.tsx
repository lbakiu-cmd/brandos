"use client";

import { Plug, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeLabel } from "@/lib/timeRanges";

interface WordpressWidgetProps {
  data?: any;
  onRemove?: () => void;
  initialTimeRange?: TimeRangeKey;
}

export function WordpressWidget({ data, onRemove, initialTimeRange = "7D" }: WordpressWidgetProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(initialTimeRange);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  useEffect(() => {
    if (initialTimeRange) {
      setTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  const siteUrl = data?.siteUrl || "https://yourdomain.com";
  const pluginVersion = data?.pluginVersion || "1.4.1";
  const seo = data?.avgSeo || 92;
  const aeo = data?.avgAeo || 85;
  const geo = data?.avgGeo || 89;
  const postsCount = data?.postsIndexed || 14;

  const handleTriggerSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Plug className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              WordPress AIVision Engine
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 shrink-0">
                Connected
              </span>
            </h3>
            <p className="text-xs text-slate-400 truncate">{siteUrl} (v{pluginVersion})</p>
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
            <button onClick={onRemove} className="text-xs text-slate-500 hover:text-red-400 transition ml-1">
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-3 py-4">
        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60 text-center">
          <p className="text-[11px] text-slate-400 font-medium">On-Page SEO</p>
          <p className="text-xl font-black text-blue-400 mt-1">{seo}/100</p>
          <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">Optimized</span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60 text-center">
          <p className="text-[11px] text-slate-400 font-medium">AEO / LLM Score</p>
          <p className="text-xl font-black text-indigo-400 mt-1">{aeo}/100</p>
          <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">LLMs.txt Active</span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60 text-center">
          <p className="text-[11px] text-slate-400 font-medium">GEO Local Score</p>
          <p className="text-xl font-black text-purple-400 mt-1">{geo}/100</p>
          <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">Local Schema Injected</span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-auto flex items-center justify-between rounded-xl bg-slate-950/40 border border-slate-800/60 p-3">
        <div className="text-xs text-slate-300">
          <span className="font-semibold text-white">{postsCount} Articles</span> Synced ({getTimeRangeLabel(timeRange)})
        </div>
        <button
          onClick={handleTriggerSync}
          disabled={syncing}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncSuccess ? "Telemetry Synced!" : syncing ? "Syncing..." : "Sync Plugin"}
        </button>
      </div>
    </div>
  );
}
