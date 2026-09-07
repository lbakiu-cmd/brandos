"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  Plug,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeMultiplier, getTimeRangeLabel } from "@/lib/timeRanges";
import { PerformanceTimelineGraphic } from "@/components/charts/PerformanceTimelineGraphic";
import { EngineDistributionGraphic } from "@/components/charts/EngineDistributionGraphic";

export const dynamic = "force-dynamic";

export default function Ga4Page() {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("7D");
  const [activeTab, setActiveTab] = useState<"all" | "ai" | "social">("all");
  const [business, setBusiness] = useState<any>(null);
  const [ga4Data, setGa4Data] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

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
          if (ga4?.connected) {
            setIsConnected(true);
          }
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
  const multiplier = getTimeRangeMultiplier(timeRange);

  const baseTotalUsers = isConnected && ga4Data?.totalUsers ? ga4Data.totalUsers : 0;
  const baseAiSessions = isConnected && ga4Data?.aiReferralSessions ? ga4Data.aiReferralSessions : 0;
  const aiShare = isConnected && ga4Data?.aiReferralShare ? ga4Data.aiReferralShare : 0;
  const baseSocialSessions = isConnected && ga4Data?.socialReferralSessions ? ga4Data.socialReferralSessions : 0;
  const socialShare = isConnected && ga4Data?.socialReferralShare ? ga4Data.socialReferralShare : 0;

  const totalUsers = Math.round(baseTotalUsers * multiplier);
  const aiSessions = Math.round(baseAiSessions * multiplier);
  const socialSessions = Math.round(baseSocialSessions * multiplier);

  const engines = (isConnected && ga4Data?.aiEngines && ga4Data.aiEngines.length > 0)
    ? ga4Data.aiEngines
    : [];
  const socialSources = (isConnected && ga4Data?.socialSources && ga4Data.socialSources.length > 0)
    ? ga4Data.socialSources
    : [];

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-white">Google Analytics 4</h1>
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold border flex items-center gap-1.5 ${isConnected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
              {isConnected ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live GA4 Connected
                </>
              ) : (
                "Not Connected"
              )}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tracking visitors arriving from ChatGPT, Gemini, Perplexity and social channels for <strong className="text-white">{bName}</strong> ({getTimeRangeLabel(timeRange)})
          </p>
        </div>

        <TimeRangeFilter
          value={timeRange}
          onChange={setTimeRange}
          variant="segmented"
          showIcon={true}
          accentColor="amber"
        />
      </div>

      {!isConnected ? (
        <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-900/90 p-12 text-center backdrop-blur shadow-2xl space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Bot className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Connect Google Analytics 4 Property</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Link your GA4 property to automatically isolate and track high-intent visitors arriving from AI search engines (ChatGPT, Perplexity, Claude) and social referrals.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/integrations"
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-amber-600/30 hover:bg-amber-500 transition"
            >
              <Plug className="h-4 w-4" />
              <span>Connect in Integrations</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-400" /> Total Active Users
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">{totalUsers.toLocaleString()}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-amber-400" /> AI Referral Sessions
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-400">{aiSessions.toLocaleString()}</span>
                <span className="text-xs text-slate-400">{aiShare}% of traffic</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
              <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                <Share2 className="h-4 w-4 text-indigo-400" /> Social Referral Sessions
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">{socialSessions.toLocaleString()}</span>
                <span className="text-xs text-slate-400">{socialShare}% of traffic</span>
              </div>
            </div>
          </div>

          {/* Graphics on Top of Data Table */}
          <div className="space-y-4">
            <PerformanceTimelineGraphic
              timeRange={timeRange}
              totalClicks={aiSessions}
              totalImpressions={totalUsers}
              clicksLabel="AI Visits"
              impressionsLabel="Total Active Users"
              variant="full"
              title="AI Referral Growth Velocity vs Total Traffic"
            />

            {engines.length > 0 && (
              <EngineDistributionGraphic
                engines={engines.map((e: any) => ({
                  ...e,
                  sessions: Math.round((e.sessions || 0) * multiplier),
                }))}
                totalAiSessions={aiSessions}
                compact={false}
              />
            )}
          </div>

          {/* AI Referral Engines Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">AI Search Engines Traffic Breakdown</h2>
              <p className="text-xs text-slate-400">Visitors referred directly by LLM chat interfaces</p>
            </div>

            <div className="overflow-x-auto">
              {engines.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Platform</th>
                      <th className="px-5 py-3 text-right">Sessions</th>
                      <th className="px-5 py-3 text-right">Avg Duration</th>
                      <th className="px-5 py-3 text-right">Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {engines.map((e: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3 font-medium text-white flex items-center gap-2">
                          <Bot className="h-3.5 w-3.5 text-amber-400" />
                          {e.engine || e.name}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-white">
                          {Math.round((e.sessions || 0) * multiplier).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-400">{e.avgTime || e.avgDuration || "—"}</td>
                        <td className="px-5 py-3 text-right text-emerald-400 font-bold">{e.goalConvRate || e.conversionRate || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  No AI search engine sessions recorded in this time range yet.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
