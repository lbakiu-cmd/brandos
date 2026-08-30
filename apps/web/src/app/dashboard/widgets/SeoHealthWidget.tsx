"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle2, FileText, Code2, Cpu } from "lucide-react";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeLabel } from "@/lib/timeRanges";

interface SeoHealthWidgetProps {
  data?: any;
  onRemove?: () => void;
  initialTimeRange?: TimeRangeKey;
}

export function SeoHealthWidget({ data, onRemove, initialTimeRange = "7D" }: SeoHealthWidgetProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(initialTimeRange);

  useEffect(() => {
    if (initialTimeRange) {
      setTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  const score = data?.score || 88;
  const lcp = data?.lcp || "1.4s (Fast)";
  const cls = data?.cls || "0.02 (Stable)";
  const schemaTypes = data?.schemaTypes || ["LocalBusiness", "MedicalClinic", "FAQPage", "AggregateRating"];

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              Website Health & Readiness
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 shrink-0">
                Health Check
              </span>
            </h3>
            <p className="text-xs text-slate-400 truncate">
              Audit status for <span className="text-slate-300 font-medium">{getTimeRangeLabel(timeRange)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <TimeRangeFilter
            value={timeRange}
            onChange={setTimeRange}
            variant="compact"
            accentColor="emerald"
          />

          {onRemove && (
            <button onClick={onRemove} className="text-xs text-slate-500 hover:text-red-400 transition ml-1">
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Score and Web Vitals */}
      <div className="flex items-center justify-between py-4 border-b border-slate-800/60">
        <div>
          <p className="text-xs text-slate-400">Website Health Score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-emerald-400">{score}</span>
            <span className="text-sm font-bold text-slate-500">/ 100</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">Great Website Experience</span>
        </div>

        <div className="space-y-1.5 text-right">
          <div>
            <span className="text-[10px] text-slate-500 block">Page Load Speed</span>
            <span className="text-xs font-bold text-emerald-400">{lcp}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Visual Stability</span>
            <span className="text-xs font-bold text-emerald-400">{cls}</span>
          </div>
        </div>
      </div>

      {/* Items Checklist */}
      <div className="pt-3 flex-1 space-y-2 text-xs">
        <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2 border border-slate-800/40">
          <div className="flex items-center gap-1.5 text-slate-300">
            <FileText className="h-3.5 w-3.5 text-blue-400" />
            <span>AI Discovery Feeds (/llms.txt)</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
            <CheckCircle2 className="h-3 w-3" /> Ready
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2 border border-slate-800/40">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Code2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Google Rich Snippet Tags</span>
          </div>
          <span className="text-[10px] font-bold text-indigo-400">
            {schemaTypes.length} Tags Injected
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2 border border-slate-800/40">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Cpu className="h-3.5 w-3.5 text-amber-400" />
            <span>AI Web Crawlers</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-400">Unlocked & Allowed</span>
        </div>
      </div>
    </div>
  );
}
