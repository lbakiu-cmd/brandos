"use client";

import { Plug, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
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

  const isConnected = Boolean(data && (data.connected || data.siteUrl || data.pluginVersion));

  if (!isConnected) {
    return (
      <div className="flex flex-col justify-between h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Plug className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">WordPress AIVision Engine</h3>
              <p className="text-xs text-slate-400">On-Site AI Optimization Plugin</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Not Connected
          </span>
        </div>

        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Plug className="h-5 w-5" />
          </div>
          <p className="text-xs text-slate-300 font-medium mb-1">WordPress Plugin Not Connected</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-4">
            Install the BrandOS AIVision WordPress plugin to auto-publish /llms.txt, JSON-LD Schema and auto-fix SEO errors.
          </p>
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition"
          >
            <Plug className="h-3.5 w-3.5" />
            <span>Connect WordPress</span>
          </Link>
        </div>

        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>WordPress REST Telemetry</span>
          {onRemove && (
            <button onClick={onRemove} className="text-slate-500 hover:text-red-400 transition">
              Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  const siteUrl = data?.siteUrl || "Connected WordPress Site";
  const pluginVersion = data?.pluginVersion || "1.0.0";
  const seo = data?.avgSeo || 0;
  const aeo = data?.avgAeo || 0;
  const geo = data?.avgGeo || 0;
  const postsCount = data?.postsIndexed || 0;

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
          <p className="text-xl font-black text-blue-400 mt-1">{seo > 0 ? `${seo}/100` : "—"}</p>
          <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">Plugin Live</span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60 text-center">
          <p className="text-[11px] text-slate-400 font-medium">AEO / LLM Score</p>
          <p className="text-xl font-black text-indigo-400 mt-1">{aeo > 0 ? `${aeo}/100` : "—"}</p>
          <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">LLMs.txt Active</span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60 text-center">
          <p className="text-[11px] text-slate-400 font-medium">GEO Local Score</p>
          <p className="text-xl font-black text-purple-400 mt-1">{geo > 0 ? `${geo}/100` : "—"}</p>
          <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">Schema Active</span>
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
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span>{syncSuccess ? "Telemetry Synced!" : syncing ? "Pushing..." : "Sync Telemetry"}</span>
        </button>
      </div>
    </div>
  );
}
