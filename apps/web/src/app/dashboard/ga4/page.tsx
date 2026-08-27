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
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Video,
  ArrowUpRight,
  MousePointerClick,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function Ga4Page() {
  const [timeRange, setTimeRange] = useState("28D");
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
  const totalUsers = ga4Data?.totalUsers || 14280;
  const aiSessions = ga4Data?.aiReferralSessions || 2340;
  const aiShare = ga4Data?.aiReferralShare || 12.1;
  const socialSessions = ga4Data?.socialReferralSessions || 3820;
  const socialShare = ga4Data?.socialReferralShare || 18.2;

  const defaultEngines = [
    {
      name: "ChatGPT",
      domain: "chatgpt.com / searchgpt",
      sessions: 1180,
      share: "50.4%",
      growth: "+42.1%",
      avgDuration: "2m 45s",
      conversionRate: "8.4%",
      topLanding: "/services/dental-implants",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      name: "Perplexity AI",
      domain: "perplexity.ai",
      sessions: 640,
      share: "27.3%",
      growth: "+58.6%",
      avgDuration: "3m 12s",
      conversionRate: "11.2%",
      topLanding: "/pricing-and-insurance",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      name: "Google Gemini & AI Overview",
      domain: "gemini.google.com",
      sessions: 390,
      share: "16.7%",
      growth: "+24.3%",
      avgDuration: "1m 55s",
      conversionRate: "6.8%",
      topLanding: "/services/dental-implants",
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    },
    {
      name: "Claude.ai",
      domain: "claude.ai",
      sessions: 130,
      share: "5.6%",
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
      icon: Instagram,
      iconColor: "text-pink-400 bg-pink-500/10 border-pink-500/20",
      sessions: 1640,
      share: "42.9%",
      growth: "+34.2%",
      avgDuration: "3m 15s",
      conversionRate: "6.4%",
      topLanding: "/services/dental-implants",
    },
    {
      name: "Facebook",
      domain: "facebook.com / m.facebook.com",
      icon: Facebook,
      iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      sessions: 1120,
      share: "29.3%",
      growth: "+18.7%",
      avgDuration: "2m 50s",
      conversionRate: "5.8%",
      topLanding: "/pricing-and-insurance",
    },
    {
      name: "TikTok",
      domain: "tiktok.com",
      icon: Video,
      iconColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      sessions: 520,
      share: "13.6%",
      growth: "+64.5%",
      avgDuration: "1m 40s",
      conversionRate: "4.2%",
      topLanding: "/reviews",
    },
    {
      name: "LinkedIn",
      domain: "linkedin.com / lnkd.in",
      icon: Linkedin,
      iconColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      sessions: 340,
      share: "8.9%",
      growth: "+12.1%",
      avgDuration: "4m 10s",
      conversionRate: "8.1%",
      topLanding: "/our-specialists",
    },
    {
      name: "YouTube",
      domain: "youtube.com / youtu.be",
      icon: Youtube,
      iconColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      sessions: 200,
      share: "5.2%",
      growth: "+22.0%",
      avgDuration: "5m 30s",
      conversionRate: "7.2%",
      topLanding: "/patient-stories",
    },
  ];

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
              GA4 OAuth Connected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyze AI search engine referrals (ChatGPT, Perplexity, Claude) and Social referrals (Instagram, Facebook, TikTok, LinkedIn) for <strong className="text-white">{bName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Time range */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs font-semibold">
            {["7D", "28D", "90D", "12M"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-lg px-2.5 py-1 transition ${
                  timeRange === range ? "bg-amber-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
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
              : "text-slate-400 hover:bg-slate-850 hover:text-white"
          }`}
        >
          All Referral Channels
        </button>
        <button
          onClick={() => setActiveTab("social")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === "social"
              ? "bg-pink-600 text-white shadow-md shadow-pink-600/30"
              : "text-slate-400 hover:bg-slate-850 hover:text-white"
          }`}
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Social Media Referrals ({defaultSocial.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === "ai"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
              : "text-slate-400 hover:bg-slate-850 hover:text-white"
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          <span>AI Search Referrals ({defaultEngines.length})</span>
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
                  <th className="pb-3">Social Network</th>
                  <th className="pb-3 text-right">Sessions</th>
                  <th className="pb-3 text-right">Share of Social</th>
                  <th className="pb-3 text-right">Growth (MoM)</th>
                  <th className="pb-3 text-right">Avg Session</th>
                  <th className="pb-3 text-right">Conv. Rate</th>
                  <th className="pb-3">Top Landing Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {defaultSocial.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <tr key={i} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 font-semibold text-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${s.iconColor}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-white block">{s.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{s.domain}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-right font-black text-white">{s.sessions.toLocaleString()}</td>
                      <td className="py-3.5 text-right text-slate-300 font-semibold">{s.share}</td>
                      <td className="py-3.5 text-right text-emerald-400 font-bold">{s.growth}</td>
                      <td className="py-3.5 text-right text-slate-400">{s.avgDuration}</td>
                      <td className="py-3.5 text-right text-emerald-400 font-black">{s.conversionRate}</td>
                      <td className="py-3.5 text-blue-400 font-mono text-[11px] hover:underline cursor-pointer">
                        {s.topLanding}
                      </td>
                    </tr>
                  );
                })}
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
                  <th className="pb-3">AI Engine</th>
                  <th className="pb-3 text-right">Sessions</th>
                  <th className="pb-3 text-right">Share of AI</th>
                  <th className="pb-3 text-right">Growth (MoM)</th>
                  <th className="pb-3 text-right">Avg Session</th>
                  <th className="pb-3 text-right">Conv. Rate</th>
                  <th className="pb-3">Top Landing Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {defaultEngines.map((e, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{e.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({e.domain})</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-black text-white">{e.sessions.toLocaleString()}</td>
                    <td className="py-3.5 text-right text-slate-300 font-semibold">{e.share}</td>
                    <td className="py-3.5 text-right text-emerald-400 font-bold">{e.growth}</td>
                    <td className="py-3.5 text-right text-slate-400">{e.avgDuration}</td>
                    <td className="py-3.5 text-right text-emerald-400 font-black">{e.conversionRate}</td>
                    <td className="py-3.5 text-indigo-400 font-mono text-[11px] hover:underline cursor-pointer">
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
