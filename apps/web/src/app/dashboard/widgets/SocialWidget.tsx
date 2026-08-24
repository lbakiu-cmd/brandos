"use client";

import { Users, Camera, Share2, TrendingUp, Eye } from "lucide-react";

interface SocialWidgetProps {
  type: "META_PAGE_REACH" | "INSTAGRAM_AUDIENCE" | "LINKEDIN_PAGE_STATS";
  data?: any;
  onRemove?: () => void;
}

export function SocialWidget({ type, data, onRemove }: SocialWidgetProps) {
  let title = "Social Authority";
  let icon = Users;
  let iconColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
  let badge = "Meta OAuth";
  let stats = [
    { label: "Page Reach", value: "38.2K", growth: "+18.4%" },
    { label: "Post Engagement", value: "4.12K", growth: "+9.2%" },
    { label: "Followers", value: "8,940", growth: "+4.1%" },
  ];

  if (type === "INSTAGRAM_AUDIENCE") {
    title = "Instagram Professional Insights";
    icon = Camera;
    iconColor = "text-pink-400 bg-pink-500/10 border-pink-500/20";
    badge = "IG Graph API";
    stats = [
      { label: "Followers", value: "12.4K", growth: "+21.2%" },
      { label: "Profile Visits", value: "3,840", growth: "+14.8%" },
      { label: "Account Reach", value: "48.2K", growth: "+31.0%" },
    ];
  } else if (type === "LINKEDIN_PAGE_STATS") {
    title = "LinkedIn Company Authority";
    icon = Share2;
    iconColor = "text-sky-400 bg-sky-500/10 border-sky-500/20";
    badge = "LinkedIn OAuth";
    stats = [
      { label: "Followers", value: "3,420", growth: "+8.9%" },
      { label: "Page Views", value: "14.2K", growth: "+24.5%" },
      { label: "Avg CTR", value: "5.2%", growth: "Top 10%" },
    ];
  }

  const IconComponent = icon;

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${iconColor}`}>
            <IconComponent className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {title}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                {badge}
              </span>
            </h3>
            <p className="text-xs text-slate-400">Audience & Engagement Metrics</p>
          </div>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="text-xs text-slate-500 hover:text-red-400 transition">
            Remove
          </button>
        )}
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
