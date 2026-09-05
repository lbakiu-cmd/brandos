"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Camera, Share2, TrendingUp, Plug } from "lucide-react";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeMultiplier, getTimeRangeLabel } from "@/lib/timeRanges";

interface SocialWidgetProps {
  type: "META_PAGE_REACH" | "INSTAGRAM_AUDIENCE" | "LINKEDIN_PAGE_STATS";
  data?: any;
  onRemove?: () => void;
  initialTimeRange?: TimeRangeKey;
}

export function SocialWidget({ type, data, onRemove, initialTimeRange = "7D" }: SocialWidgetProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(initialTimeRange);

  useEffect(() => {
    if (initialTimeRange) {
      setTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  const isConnected = Boolean(data && (data.connected || data.reach || data.followers));

  let title = "Facebook Page Reach";
  let icon = Users;
  let iconColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
  let accent: "blue" | "amber" | "emerald" | "indigo" | "purple" = "blue";
  let badge = "Meta Graph";

  if (type === "INSTAGRAM_AUDIENCE") {
    title = "Instagram Professional Insights";
    icon = Camera;
    iconColor = "text-pink-400 bg-pink-500/10 border-pink-500/20";
    accent = "purple";
    badge = "IG Graph API";
  } else if (type === "LINKEDIN_PAGE_STATS") {
    title = "LinkedIn Company Authority";
    icon = Share2;
    iconColor = "text-sky-400 bg-sky-500/10 border-sky-500/20";
    accent = "indigo";
    badge = "LinkedIn OAuth";
  }

  const IconComponent = icon;

  if (!isConnected) {
    return (
      <div className="flex flex-col justify-between h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${iconColor}`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400">Social Analytics Channel</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Not Connected
          </span>
        </div>

        <div className="py-6 text-center">
          <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${iconColor}`}>
            <Plug className="h-5 w-5" />
          </div>
          <p className="text-xs text-slate-300 font-medium mb-1">Channel not connected</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-4">
            Connect this social account to stream real follower growth, impressions and reach.
          </p>
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
          >
            <Plug className="h-3.5 w-3.5" />
            <span>Connect Channel</span>
          </Link>
        </div>

        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>Social Graph API</span>
          {onRemove && (
            <button onClick={onRemove} className="text-slate-500 hover:text-red-400 transition">
              Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  const multiplier = getTimeRangeMultiplier(timeRange);
  const baseReach = data?.reach || 0;
  const baseEng = data?.engagement || 0;
  const baseFollowers = data?.followers || 0;

  const stats = [
    { label: "Reach", value: Math.round(baseReach * multiplier).toLocaleString(), growth: "+18.4%" },
    { label: "Engagement", value: Math.round(baseEng * multiplier).toLocaleString(), growth: "+9.2%" },
    { label: "Followers", value: baseFollowers.toLocaleString(), growth: "+4.1%" },
  ];

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${iconColor}`}>
            <IconComponent className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
              {title}
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700 shrink-0">
                {badge}
              </span>
            </h3>
            <p className="text-xs text-slate-400 truncate">
              Audience metrics for <span className="text-slate-300 font-medium">{getTimeRangeLabel(timeRange)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <TimeRangeFilter
            value={timeRange}
            onChange={setTimeRange}
            variant="compact"
            accentColor={accent}
          />

          {onRemove && (
            <button onClick={onRemove} className="text-xs text-slate-500 hover:text-red-400 transition ml-1">
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4">
        {stats.map((s, idx) => (
          <div key={idx} className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60 text-center">
            <p className="text-xs text-slate-400 font-medium">{s.label}</p>
            <p className="text-xl font-bold text-white mt-1">{s.value}</p>
            <span className="text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1 mt-0.5">
              <TrendingUp className="h-3 w-3" /> {s.growth}
            </span>
          </div>
        ))}
      </div>

      {/* Small business tip */}
      <div className="mt-auto pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-xs text-slate-400">
        <span>💡 Social signals contribute to local authority in AI citation models.</span>
      </div>
    </div>
  );
}
