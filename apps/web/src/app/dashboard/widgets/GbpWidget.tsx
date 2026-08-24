"use client";

import { MapPin, PhoneCall, Navigation, Globe, Star, TrendingUp } from "lucide-react";

interface GbpWidgetProps {
  data?: any;
  onRemove?: () => void;
}

export function GbpWidget({ data, onRemove }: GbpWidgetProps) {
  const searchViews = data?.searchViews || 14800;
  const mapsViews = data?.mapsViews || 9800;
  const calls = data?.callClicks || 430;
  const directions = data?.directionRequests || 680;
  const websiteClicks = data?.websiteClicks || 1190;
  const rating = data?.averageRating || 4.9;
  const totalReviews = data?.totalReviews || 142;

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Google Maps & Local Discovery
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                Google Business
              </span>
            </h3>
            <p className="text-xs text-slate-400">Calls, driving directions, and local map views</p>
          </div>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="text-xs text-slate-500 hover:text-red-400 transition">
            Remove
          </button>
        )}
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-3 gap-3 py-4">
        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium">Google Search Views</p>
          <p className="text-lg font-black text-white mt-1">{searchViews.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> +16.5% Local views
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium">Google Maps Views</p>
          <p className="text-lg font-black text-white mt-1">{mapsViews.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            <TrendingUp className="h-2.5 w-2.5" /> +21.0% Mobile maps
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
          <p className="text-[11px] text-slate-400 font-medium">Customer Rating</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-lg font-black text-white">{rating}</span>
            <span className="text-xs text-slate-400">({totalReviews})</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">Top Rated in Area</span>
        </div>
      </div>

      {/* Customer Action Breakdown */}
      <div className="rounded-xl bg-slate-950/40 p-3 border border-slate-800/60 flex items-center justify-around text-center">
        <div>
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
            <PhoneCall className="h-3.5 w-3.5 text-emerald-400" /> Direct Phone Calls
          </div>
          <p className="text-base font-black text-white mt-1">{calls}</p>
        </div>
        <div className="h-8 w-px bg-slate-800" />
        <div>
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
            <Navigation className="h-3.5 w-3.5 text-blue-400" /> Driving Directions
          </div>
          <p className="text-base font-black text-white mt-1">{directions}</p>
        </div>
        <div className="h-8 w-px bg-slate-800" />
        <div>
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400">
            <Globe className="h-3.5 w-3.5 text-indigo-400" /> Website Clicks
          </div>
          <p className="text-base font-black text-white mt-1">{websiteClicks}</p>
        </div>
      </div>

      {/* Small business tip */}
      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-[11px] text-slate-400">
        <span>💡 <strong>Local Rank Tip:</strong> Uploading 2 new real photos to Google Maps each month boosts direction requests by 35%.</span>
      </div>
    </div>
  );
}
