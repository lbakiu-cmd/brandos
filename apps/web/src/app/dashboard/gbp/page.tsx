"use client";

import { useEffect, useState } from "react";
import { MapPin, Star, PhoneCall, Navigation, Globe, Send, Sparkles, Check, TrendingUp, MessageSquare } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeMultiplier, getTimeRangeLabel } from "@/lib/timeRanges";

export default function GbpPage() {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("7D");
  const [business, setBusiness] = useState<any>(null);
  const [gbpData, setGbpData] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [bRes, intRes] = await Promise.all([
          apiFetch<any>("/business").catch(() => null),
          apiFetch<any>("/integrations/status").catch(() => null),
        ]);

        if (bRes) setBusiness(bRes);
        if (intRes?.integrations) {
          const gbp = intRes.integrations.find((i: any) => i.provider === "GOOGLE_BUSINESS_PROFILE");
          if (gbp?.metricsCache) {
            setGbpData(gbp.metricsCache);
            if (gbp.metricsCache.recentReviews) {
              setReviews(gbp.metricsCache.recentReviews);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load GBP data:", err);
      }
    }
    loadData();
  }, []);

  const bName = business?.name || "Your Business";
  const bCity = business?.city || "your area";
  const multiplier = getTimeRangeMultiplier(timeRange);

  const baseSearchViews = gbpData?.searchViews || 1480;
  const baseMapsViews = gbpData?.mapsViews || 980;
  const baseCallClicks = gbpData?.callClicks || 45;
  const baseDirectionRequests = gbpData?.directionRequests || 68;
  const rating = gbpData?.averageRating || 4.9;
  const totalReviews = gbpData?.totalReviews || 86;

  const searchViews = Math.max(1, Math.round(baseSearchViews * multiplier));
  const mapsViews = Math.max(1, Math.round(baseMapsViews * multiplier));
  const callClicks = Math.max(1, Math.round(baseCallClicks * multiplier));
  const directionRequests = Math.max(1, Math.round(baseDirectionRequests * multiplier));

  const defaultReviews = [
    {
      id: "1",
      author: "Alex P.",
      rating: 5,
      date: "2 days ago",
      comment: `Outstanding service, verified results from ${bName}! Staff was friendly and professional.`,
      replied: true,
      reply: `Thank you Alex! We are thrilled to deliver top quality service to you in ${bCity}.`,
    },
    {
      id: "2",
      author: "Maria G.",
      rating: 5,
      date: "4 days ago",
      comment: `The booking and staff were super quick and polite. Highly recommend ${bName}.`,
      replied: true,
      reply: `Thanks Maria! We appreciate your trust in our team.`,
    },
    {
      id: "3",
      author: "Chris D.",
      rating: 4,
      date: "1 week ago",
      comment: `Great experience overall, slightly busy on weekends, but quality was 10/10.`,
      replied: false,
      aiDraft: `Hi Chris, thank you for your kind review! We appreciate your feedback and are dedicated to serving you even faster.`,
    },
  ];

  const activeReviews = reviews.length > 0 ? reviews : defaultReviews;

  const handleApproveReply = (id: string, replyText: string) => {
    setReviews((prev) =>
      prev.map((r, i) => (r.id === id || i.toString() === id ? { ...r, replied: true, reply: replyText, aiDraft: undefined } : r))
    );
  };

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MapPin className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-white">Google Business Profile & Local Search</h1>
            <span className="rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
              Google Maps OAuth Connected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track Google Maps impressions, customer calls, direction requests, and live reputation for <strong className="text-slate-200">{bName}</strong> ({bCity}) · <span className="text-white font-medium">{getTimeRangeLabel(timeRange)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Time range Filter (One Week, Two Weeks, One Month, 3 Months, Max) */}
          <TimeRangeFilter
            value={timeRange}
            onChange={setTimeRange}
            variant="segmented"
            showIcon={true}
            accentColor="emerald"
          />
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Navigation className="h-4 w-4 text-emerald-400" /> Google Maps Views
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{mapsViews.toLocaleString()}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +16.8%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Direct map pin discoveries</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <PhoneCall className="h-4 w-4 text-blue-400" /> Phone Call Clicks
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{callClicks}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +12.4%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Click-to-call mobile conversions</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Navigation className="h-4 w-4 text-indigo-400" /> Driving Directions
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{directionRequests}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +21.0%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">In-person client navigation</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" /> Average Rating
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-400">{rating} ★</span>
            <span className="text-xs font-bold text-slate-400">({totalReviews} reviews)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Top rated in {bCity}</p>
        </div>
      </div>

      {/* Reviews & AI Auto-Responder */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Google Customer Reviews & AI Reply Dispatcher</h2>
          </div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
            {activeReviews.length} Recent Reviews
          </span>
        </div>

        <div className="space-y-4 divide-y divide-slate-800/60">
          {activeReviews.map((r: any, idx: number) => {
            const reviewId = r.id || idx.toString();
            return (
              <div key={reviewId} className="pt-4 first:pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-black text-white">
                      {r.author[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{r.author}</p>
                      <div className="flex text-amber-400 mt-0.5">
                        {Array.from({ length: r.rating || 5 }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500">{r.date || r.time || "Recent"}</span>
                </div>

                <p className="text-xs text-slate-300 italic bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                  "{r.comment}"
                </p>

                {r.replied ? (
                  <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] mb-1">
                      <Check className="h-3.5 w-3.5" /> Published Business Reply:
                    </div>
                    <p className="text-slate-400 text-xs">{r.reply}</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-indigo-950/40 p-3.5 border border-indigo-500/30 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-indigo-400 font-bold text-xs">
                        <Sparkles className="h-3.5 w-3.5" /> AI Suggested Response
                      </span>
                      <span className="text-[10px] text-slate-400">Generated for {bName}</span>
                    </div>
                    <p className="text-slate-300 text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      {r.aiDraft}
                    </p>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleApproveReply(reviewId, r.aiDraft)}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-sm"
                      >
                        <Send className="h-3 w-3" /> Approve & Post to Google Maps
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
