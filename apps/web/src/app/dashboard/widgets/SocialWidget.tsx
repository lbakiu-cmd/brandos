"use client";

import { useState, useEffect } from "react";
import { Users, Camera, Share2, TrendingUp } from "lucide-react";
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

  const multiplier = getTimeRangeMultiplier(timeRange);

  let title = "Social Authority";
  let icon = Users;
  let iconColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
  let accent: "blue" | "amber" | "emerald" | "indigo" | "purple" = "blue";
  let badge = "Meta OAuth";

  const baseReach = 38200;
  const baseEng = 4120;
  const baseFollowers = 8940;

  let stats = [
    { label: "Page Reach", value: (Math.round(baseReach * multiplier)).toLocaleString(), growth: "+18.4%" },
    { label: "Post Engagement", value: (Math.round(baseEng * multiplier)).toLocaleString(), growth: "+9.2%" },
    { label: "Followers", value: baseFollowers.toLocaleString(), growth: "+4.1%" },
  ];

  if (type === "INSTAGRAM_AUDIENCE") {
    title = "Instagram Professional Insights";
    icon = Camera;
    iconColor = "text-pink-400 bg-pink-500/10 border-pink-500/20";
    accent = "purple";
    badge = "IG Graph API";
    const igFollowers = 12400;
    const igVisits = 3840;
    const igReach = 48200;
    stats = [
      { label: "Followers", value: igFollowers.toLocaleString(), growth: "+21.2%" },
      { label: "Profile Visits", value: (Math.round(igVisits * multiplier)).toLocaleString(), growth: "+14.8%" },
      { label: "Account Reach", value: (Math.round(igReach * multiplier)).toLocaleString(), growth: "+31.0%" },
    ];
  } else if (type === "LINKEDIN_PAGE_STATS") {
    title = "LinkedIn Company Authority";
    icon = Share2;
    iconColor = "text-sky-400 bg-sky-500/10 border-sky-500/20";
    accent = "indigo";
    badge = "LinkedIn OAuth";
    const liFollowers = 3420;
    const liViews = 14200;
    stats = [
      { label: "Followers", value: liFollowers.toLocaleString(), growth: "+8.9%" },
      { label: "Page Views", value: (Math.round(liViews * multiplier)).toLocaleString(), growth: "+24.5%" },
      { label: "Avg CTR", value: "5.2%", growth: "Top 10%" },
    ];
  }

  const IconComponent = icon;

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${iconColor}`}>
            <IconComponent className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              {title}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700 shrink-0">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 py-4">
        {stats.map((s, i) => (
          <div key={i} className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
            <p className="text-[11px] text-slate-400 font-medium">{s.label}</p>
            <p className="text-lg font-black text-white mt-1">{s.value}</p>
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="h-2.5 w-2.5" /> {s.growth}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
