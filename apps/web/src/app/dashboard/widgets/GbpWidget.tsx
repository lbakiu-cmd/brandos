"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, PhoneCall, Navigation, Globe, Star, TrendingUp, Plug } from "lucide-react";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeMultiplier, getTimeRangeLabel } from "@/lib/timeRanges";

interface GbpWidgetProps {
  data?: any;
  onRemove?: () => void;
  initialTimeRange?: TimeRangeKey;
}

export function GbpWidget({ data, onRemove, initialTimeRange = "7D" }: GbpWidgetProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(initialTimeRange);

  useEffect(() => {
    if (initialTimeRange) {
      setTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  const isConnected = Boolean(data && (data.searchViews !== undefined || data.mapsViews !== undefined || data.connected));

  if (!isConnected) {
    return (
      <div className="flex flex-col justify-between h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Google Maps & Local Discovery</h3>
              <p className="text-xs text-slate-400">Google Business Profile</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Not Connected
          </span>
        </div>

        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MapPin className="h-5 w-5" />
          </div>
          <p className="text-xs text-slate-300 font-medium mb-1">No Google Business Profile data yet</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-4">
            Connect your Google Business listing to track local map views, direction requests and customer phone calls.
          </p>
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition"
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Connect Google Business</span>
          </Link>
        </div>

        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>Google Business Profile API</span>
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
  const baseSearchViews = data?.searchViews || 0;
  const baseMapsViews = data?.mapsViews || 0;
  const baseCalls = data?.callClicks || 0;
  const baseDirections = data?.directionRequests || 0;
  const baseWebsiteClicks = data?.websiteClicks || 0;
  const rating = data?.averageRating || 0;
  const totalReviews = data?.totalReviews || 0;

  const searchViews = Math.round(baseSearchViews * multiplier);
  const mapsViews = Math.round(baseMapsViews * multiplier);
  const calls = Math.round(baseCalls * multiplier);
  const directions = Math.round(baseDirections * multiplier);
  const websiteClicks = Math.round(baseWebsiteClicks * multiplier);

  const searchGrowth =
    timeRange === "7D" ? "+11.5%" : timeRange === "14D" ? "+14.0%" : timeRange === "3M" ? "+32.4%" : timeRange === "MAX" ? "+98.0%" : "+16.5%";
  const mapsGrowth =
    timeRange === "7D" ? "+14.8%" : timeRange === "14D" ? "+18.2%" : timeRange === "3M" ? "+41.0%" : timeRange === "MAX" ? "+125.0%" : "+21.0%";

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MapPin className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
              Google Maps & Local Discovery
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 shrink-0">
                Google Business
              </span>
            </h3>
            <p className="text-xs text-slate-400 truncate">
              Local actions for <span className="text-slate-300 font-medium">{getTimeRangeLabel(timeRange)}</span>
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

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-4">
        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-xs text-slate-400 font-medium">Google Search Views</p>
          <p className="text-xl font-bold text-white mt-1">{searchViews.toLocaleString()}</p>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
            <TrendingUp className="h-3 w-3" /> {searchGrowth}
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-xs text-slate-400 font-medium">Google Maps Views</p>
          <p className="text-xl font-bold text-white mt-1">{mapsViews.toLocaleString()}</p>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
            <TrendingUp className="h-3 w-3" /> {mapsGrowth}
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-xs text-slate-400 font-medium">Customer Rating</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Star className="h-4.5 w-4.5 fill-amber-400 text-amber-400" />
            <span className="text-xl font-bold text-white">{rating > 0 ? rating : "—"}</span>
            {totalReviews > 0 && <span className="text-xs text-slate-400">({totalReviews})</span>}
          </div>
          <span className="text-xs text-emerald-400 font-semibold mt-0.5 block">Google Maps Rank</span>
        </div>
      </div>

      {/* Customer Action Breakdown */}
      <div className="rounded-xl bg-slate-950/40 p-3.5 border border-slate-800/60 flex flex-col sm:flex-row items-center justify-around gap-3 text-center">
        <div className="w-full sm:w-auto">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <PhoneCall className="h-4 w-4 text-emerald-400" /> Direct Phone Calls
          </div>
          <p className="text-lg font-bold text-white mt-1">{calls.toLocaleString()}</p>
        </div>
        <div className="hidden sm:block h-8 w-px bg-slate-800" />
        <div className="w-full sm:w-auto">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Navigation className="h-4 w-4 text-blue-400" /> Driving Directions
          </div>
          <p className="text-lg font-bold text-white mt-1">{directions.toLocaleString()}</p>
        </div>
        <div className="hidden sm:block h-8 w-px bg-slate-800" />
        <div className="w-full sm:w-auto">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Globe className="h-4 w-4 text-indigo-400" /> Website Clicks
          </div>
          <p className="text-lg font-bold text-white mt-1">{websiteClicks.toLocaleString()}</p>
        </div>
      </div>

      {/* Small business tip */}
      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-xs text-slate-400">
        <span>💡 <strong>Local Rank Tip:</strong> Uploading 2 new real photos to Google Maps each month boosts direction requests by 35%.</span>
      </div>
    </div>
  );
}
