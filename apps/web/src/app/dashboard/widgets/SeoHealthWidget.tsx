"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, FileText, Code2, Cpu, Globe } from "lucide-react";
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

  const isConnected = Boolean(data && (data.score !== undefined || data.hasAudits));

  if (!isConnected) {
    return (
      <div className="flex flex-col justify-between h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Website Health & Readiness</h3>
              <p className="text-xs text-slate-400">Technical SEO & Schema</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Checkup Required
          </span>
        </div>

        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Globe className="h-5 w-5" />
          </div>
          <p className="text-xs text-slate-300 font-medium mb-1">No Website Checkup run yet</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-4">
            Audit your website for technical SEO, schema, /robots.txt and /llms.txt AI readiness in 1-click.
          </p>
          <Link
            href="/dashboard/audit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Run Website Checkup</span>
          </Link>
        </div>

        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>BrandOS Audit Engine</span>
          {onRemove && (
            <button onClick={onRemove} className="text-slate-500 hover:text-red-400 transition">
              Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  const score = data?.score || 0;
  const lcp = data?.lcp || "—";
  const cls = data?.cls || "—";

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
              Website Health & Readiness
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 shrink-0">
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
          <p className="text-xs sm:text-sm text-slate-400 font-medium">Website Health Score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-emerald-400">{score}</span>
            <span className="text-sm font-semibold text-slate-500">/ 100</span>
          </div>
          <span className="text-xs text-emerald-400 font-semibold mt-0.5 block">Audit Completed</span>
        </div>

        <div className="space-y-2 text-right">
          <div>
            <span className="text-xs text-slate-400 block">Page Load Speed</span>
            <span className="text-sm font-bold text-emerald-400">{lcp}</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Visual Stability</span>
            <span className="text-sm font-bold text-emerald-400">{cls}</span>
          </div>
        </div>
      </div>

      {/* Items Checklist */}
      <div className="pt-3 flex-1 space-y-2 text-xs sm:text-sm">
        <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/40">
          <div className="flex items-center gap-2 text-slate-200">
            <FileText className="h-4 w-4 text-blue-400" />
            <span>AI Discovery Feeds (/llms.txt)</span>
          </div>
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Ready
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/40">
          <div className="flex items-center gap-2 text-slate-200">
            <Code2 className="h-4 w-4 text-indigo-400" />
            <span>JSON-LD Schema Structured Data</span>
          </div>
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Injected
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/40">
          <div className="flex items-center gap-2 text-slate-200">
            <Cpu className="h-4 w-4 text-purple-400" />
            <span>AI Bot Crawl Permissions</span>
          </div>
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Allowed
          </span>
        </div>
      </div>
    </div>
  );
}
