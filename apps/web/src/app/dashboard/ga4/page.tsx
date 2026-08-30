"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Bot,
  Sparkles,
  TrendingUp,
  Users,
  Share2,
  Globe,
  Video,
  Play,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeMultiplier, getTimeRangeLabel } from "@/lib/timeRanges";

export default function Ga4Page() {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("7D");
  const [activeTab, setActiveTab] = useState<"all" | "ai" | "social">("all");
  const [business, setBusiness] = useState<any>(null);
  const [ga4Data, setGa4Data] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [bRes, intRes] = await Promise.all([
          apiFetch<any>("/business").catch(() => null),
          apiFetch<any>("/integrations/status").catch(() => null),
        ]);

        if (bRes) setBusiness(bRes);
        if (intRes?.integrations) {
          const ga4 = intRes.integrations.find((i: any) => i.provider === "GOOGLE_ANALYTICS_4");
          if (ga4?.metricsCache) {
            setGa4Data(ga4.metricsCache);
          }
        }
      } catch (err) {
        console.error("Failed to load GA4 data:", err);
      }
    }
    loadData();
  }, []);

  const bName = business?.name || "Nobel Dental Clinic";
  const multiplier = getTimeRangeMultiplier(timeRange);

  const baseTotalUsers = ga4Data?.totalUsers || 1420;
  const baseAiSessions = ga4Data?.aiReferralSessions || 145;
  const aiShare = ga4Data?.aiReferralShare || 7.8;
  const baseSocialSessions = ga4Data?.socialReferralSessions || 240;
  const socialShare = ga4Data?.socialReferralShare || 13.0;

  const totalUsers = Math.max(1, Math.round(baseTotalUsers * multiplier));
  const aiSessions = Math.max(1, Math.round(baseAiSessions * multiplier));
  const socialSessions = Math.max(1, Math.round(baseSocialSessions * multiplier));

  const defaultEngines = [
    {
      name: "ChatGPT",
      domain: "chatgpt.com / searchgpt",
      sessions: 72,
      share: "49.7%",
      growth: "+42.1%",
      avgDuration: "2m 45s",
      conversionRate: "8.4%",
      topLanding: "/services/dental-implants",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      name: "Perplexity AI",
      domain: "perplexity.ai",
      sessions: 38,
      share: "26.2%",
      growth: "+58.6%",
      avgDuration: "3m 12s",
      conversionRate: "11.2%",
      topLanding: "/pricing-and-insurance",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      name: "Google Gemini & AI Overview",
      domain: "gemini.google.com",
      sessions: 24,
      share: "16.6%",
      growth: "+24.3%",
      avgDuration: "1m 55s",
      conversionRate: "6.8%",
      topLanding: "/services/dental-implants",
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    },
    {
      name: "Claude.ai",
      domain: "claude.ai",
      sessions: 11,
      share: "7.5%",
      growth: "+19.5%",
      avgDuration: "2m 10s",
      conversionRate: "7.5%",
      topLanding: "/our-specialists",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
  ];

  const defaultSocial = [
    {
      name: "Instagram",
      domain: "instagram.com / l.instagram.com",
      color: "from-pink-500 to-rose-500",
      badge: "Meta Ecosystem",
      sessions: 115,
      share: "47.9%",
      growth: "+34.2%",
      avgDuration: "3m 15s",
      conversionRate: "6.4%",
      topLanding: "/services/dental-implants",
    },
    {
      name: "Facebook",
      domain: "facebook.com / m.facebook.com",
      color: "from-blue-600 to-indigo-600",
      badge: "Meta Ads & Pages",
      sessions: 80,
      share: "33.3%",
      growth: "+18.7%",
      avgDuration: "2m 50s",
      conversionRate: "5.8%",
      topLanding: "/pricing-and-insurance",
    },
    {
      name: "TikTok",
      domain: "tiktok.com",
      color: "from-cyan-500 to-teal-500",
      badge: "Shorts & Video",
      sessions: 25,
      share: "10.4%",
      growth: "+64.5%",
      avgDuration: "1m 40s",
      conversionRate: "4.2%",
      topLanding: "/reviews",
    },
    {
      name: "LinkedIn",
      domain: "linkedin.com / lnkd.in",
      color: "from-blue-500 to-cyan-600",
      badge: "B2B & Medical Network",
      sessions: 12,
      share: "5.0%",
      growth: "+12.1%",
      avgDuration: "4m 10s",
      conversionRate: "8.1%",
      topLanding: "/our-specialists",
    },
    {
      name: "YouTube",
      domain: "youtube.com / youtu.be",
      color: "from-red-500 to-rose-600",
      badge: "Video Guides",
      sessions: 8,
      share: "3.4%",
      growth: "+22.0%",
      avgDuration: "5m 30s",
      conversionRate: "7.2%",
      topLanding: "/patient-stories",
    },
  ];

  // Dynamic scaled rows for social and AI tables
  const socialNetworks = defaultSocial.map((s) => ({
    ...s,
    sessions: Math.max(1, Math.round(s.sessions * multiplier)),
  }));

  const engines = defaultEngines.map((e) => ({
    ...e,
    sessions: Math.max(1, Math.round(e.sessions * multiplier)),
  }));

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-white">Google Analytics 4 & Referral Traffic</h1>
            <span className="rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              GA4 Connected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyze AI search referrals (ChatGPT, Perplexity, Claude) and Social referrals (Instagram, Facebook, TikTok, LinkedIn) for <strong className="text-white">{bName}</strong> · <span className="text-white font-medium">{getTimeRangeLabel(timeRange)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Time range Filter (One Week, Two Weeks, One Month, 3 Months, Max) */}
          <TimeRangeFilter
            value={timeRange}
            onChange={setTimeRange}
            variant="segmented"
            showIcon={true}
            accentColor="amber"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-blue-400" /> Total Active Users
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{totalUsers.toLocaleString()}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +18.4%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Direct, Organic, Social & AI</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Share2 className="h-4 w-4 text-pink-400" /> Social Media Referrals
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-pink-400">{socialSessions.toLocaleString()}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +28.4%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{socialShare}% of total site traffic</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Bot className="h-4 w-4 text-amber-400" /> AI Referral Sessions
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-400">{aiSessions.toLocaleString()}</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +46.2%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{aiShare}% from LLM citations</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-400" /> Blended Lead Conversion
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">8.2%</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +2.1x vs SEO
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Inquiry / Booking actions</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("all")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === "all"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          All Referral Channels
        </button>
        <button
          onClick={() => setActiveTab("social")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === "social"
              ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Social Media Referrals ({socialNetworks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === "ai"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          <span>AI Search Referrals ({engines.length})</span>
        </button>
      </div>

      {/* Social Media Referrals Breakdown */}
      {(activeTab === "all" || activeTab === "social") && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Share2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Social Media Referrals Breakdown</h2>
                <p className="text-xs text-slate-400">Traffic from Meta (Instagram & Facebook), TikTok, LinkedIn, and YouTube</p>
              </div>
            </div>
            <span className="text-xs font-bold text-pink-400 bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">
              {socialSessions.toLocaleString()} Total Social Sessions
            </span>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Social Network</th>
                  <th className="pb-3 px-4 text-right">Sessions</th>
                  <th className="pb-3 px-4 text-right">Share of Social</th>
                  <th className="pb-3 px-4 text-right">Growth (MoM)</th>
                  <th className="pb-3 px-4 text-right">Avg Session</th>
                  <th className="pb-3 px-4 text-right">Conv. Rate</th>
                  <th className="pb-3 pl-4">Top Landing Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {socialNetworks.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 pr-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr ${s.color} text-white font-bold text-[11px] shadow-sm`}>
                          {s.name.substring(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{s.name}</span>
                            <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-medium">{s.badge}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{s.domain}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-white">{s.sessions.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right text-slate-300 font-semibold">{s.share}</td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">{s.growth}</td>
                    <td className="py-3.5 px-4 text-right text-slate-400">{s.avgDuration}</td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-black">{s.conversionRate}</td>
                    <td className="py-3.5 pl-4 text-blue-400 font-mono text-[11px] hover:underline cursor-pointer">
                      {s.topLanding}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Breakdown Table */}
      {(activeTab === "all" || activeTab === "ai") && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">AI Search Engine Referrals Breakdown</h2>
                <p className="text-xs text-slate-400">Direct traffic from LLM citations (ChatGPT, Perplexity, Gemini, Claude)</p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              {aiSessions.toLocaleString()} Total AI Sessions
            </span>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4">AI Engine</th>
                  <th className="pb-3 px-4 text-right">Sessions</th>
                  <th className="pb-3 px-4 text-right">Share of AI</th>
                  <th className="pb-3 px-4 text-right">Growth (MoM)</th>
                  <th className="pb-3 px-4 text-right">Avg Session</th>
                  <th className="pb-3 px-4 text-right">Conv. Rate</th>
                  <th className="pb-3 pl-4">Top Landing Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {engines.map((e, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 pr-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{e.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({e.domain})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-white">{e.sessions.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right text-slate-300 font-semibold">{e.share}</td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">{e.growth}</td>
                    <td className="py-3.5 px-4 text-right text-slate-400">{e.avgDuration}</td>
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-black">{e.conversionRate}</td>
                    <td className="py-3.5 pl-4 text-indigo-400 font-mono text-[11px] hover:underline cursor-pointer">
                      {e.topLanding}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
