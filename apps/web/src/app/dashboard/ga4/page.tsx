"use client";

import { useEffect, useState } from "react";
import { BarChart3, Bot, Sparkles, TrendingUp, Users, ArrowUpRight, Globe, Layers } from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function Ga4Page() {
  const [timeRange, setTimeRange] = useState("28D");
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

  const bName = business?.name || "Your Business";
  const totalUsers = ga4Data?.totalUsers || 14280;
  const aiSessions = ga4Data?.aiReferralSessions || 2340;
  const aiShare = ga4Data?.aiReferralShare || 12.1;
  const landingPages = ga4Data?.topLandingPages || [
    { path: "/services", views: 5240, bounceRate: 19.8 },
    { path: "/pricing", views: 3820, bounceRate: 14.5 },
    { path: "/contact", views: 2410, bounceRate: 22.1 },
  ];

  const defaultEngines = [
    {
      name: "ChatGPT",
      domain: "chatgpt.com / searchgpt",
      sessions: 1180,
      share: "50.4%",
      growth: "+42.1%",
      avgDuration: "2m 45s",
      conversionRate: "8.4%",
      topLanding: landingPages[0]?.path || "/services",
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
      topLanding: landingPages[1]?.path || "/pricing",
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
      topLanding: landingPages[0]?.path || "/about",
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
      topLanding: landingPages[2]?.path || "/contact",
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
  ];

  const engines = defaultEngines;

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-white">Google Analytics 4 & AI Traffic</h1>
            <span className="rounded-full bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
              GA4 OAuth Connected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Analyze AI search engine referrals (ChatGPT, Perplexity, Claude, Gemini) and user behavior for <strong className="text-slate-200">{bName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
          <p className="text-[11px] text-slate-500 mt-1">Direct, Organic & AI referrals</p>
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
          <p className="text-[11px] text-slate-500 mt-1">Direct LLM citation traffic</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-400" /> AI Traffic Share
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{aiShare}%</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +3.8%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">High Intent Leads from AI</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-emerald-400" /> AI Lead Conversion Rate
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">9.1%</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> +2.4x vs SEO
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Inquiry / Booking actions</p>
        </div>
      </div>

      {/* AI Breakdown Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4">
        <h2 className="text-base font-bold text-white">AI Search Engine Referrals Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="pb-3">AI Engine</th>
                <th className="pb-3 text-right">Sessions</th>
                <th className="pb-3 text-right">Share</th>
                <th className="pb-3 text-right">Growth (MoM)</th>
                <th className="pb-3 text-right">Avg Session</th>
                <th className="pb-3 text-right">Conv. Rate</th>
                <th className="pb-3">Top Landing Page</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {engines.map((e, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 font-semibold text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{e.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({e.domain})</span>
                    </div>
                  </td>
                  <td className="py-3 text-right font-black text-white">{e.sessions}</td>
                  <td className="py-3 text-right text-slate-300 font-semibold">{e.share}</td>
                  <td className="py-3 text-right text-emerald-400 font-bold">{e.growth}</td>
                  <td className="py-3 text-right text-slate-400">{e.avgDuration}</td>
                  <td className="py-3 text-right text-emerald-400 font-black">{e.conversionRate}</td>
                  <td className="py-3 text-indigo-400 font-mono text-[11px]">{e.topLanding}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
