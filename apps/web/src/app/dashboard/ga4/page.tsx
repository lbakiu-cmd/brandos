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
import { TimeRangeKey, getTimeRangeLabel } from "@/lib/timeRanges";
import { useGa4Metrics } from "@/lib/useGa4Metrics";
import { EngineDistributionGraphic } from "@/components/charts/EngineDistributionGraphic";

export const dynamic = "force-dynamic";

export default function Ga4Page() {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("7D");
  const [activeTab, setActiveTab] = useState<"all" | "ai" | "social">("all");
  const [business, setBusiness] = useState<any>(null);
  const { data: ga4Data, error, loading } = useGa4Metrics(timeRange);
  const [isConnected, setIsConnected] = useState(false);
  const [properties, setProperties] = useState<Array<{ property: string; displayName: string; accountName: string }>>([]);
  const [currentPropertyId, setCurrentPropertyId] = useState<string | null>(null);
  const [switchingProperty, setSwitchingProperty] = useState(false);

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
        }
      } catch (err) {
        console.error("Failed to load GA4 data:", err);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    apiFetch<{ properties: typeof properties; currentPropertyId: string | null }>("/integrations/google/ga4-properties")
      .then((res) => {
        if (res?.properties) setProperties(res.properties);
        setCurrentPropertyId(res?.currentPropertyId ?? null);
      })
      .catch(() => {});
  }, [isConnected]);

  const handleSelectProperty = async (propertyId: string) => {
    if (!propertyId || propertyId === currentPropertyId) return;
    const chosen = properties.find((p) => p.property === propertyId);
    const confirmed = window.confirm(
      `Switch this business's Google Analytics data source to "${chosen?.displayName || propertyId}"?\n\n` +
      `This changes which property's traffic data is shown across the whole dashboard for ${business?.name || "this business"}. ` +
      `Only do this if you're sure -- if you picked the wrong one by accident, you can always switch back.`
    );
    if (!confirmed) return;

    setSwitchingProperty(true);
    try {
      await apiFetch("/integrations/google/select-ga4-property", {
        method: "POST",
        body: JSON.stringify({ propertyId }),
      });
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch GA4 property:", err);
      setSwitchingProperty(false);
    }
  };

  const bName = business?.name || "Your Business";


  const baseTotalUsers = isConnected && ga4Data?.totalUsers ? ga4Data.totalUsers : 0;
  const baseAiSessions = isConnected && ga4Data?.aiReferralSessions ? ga4Data.aiReferralSessions : 0;
  const aiShare = isConnected && ga4Data?.aiReferralShare ? ga4Data.aiReferralShare : 0;
  const baseSocialSessions = isConnected && ga4Data?.socialReferralSessions ? ga4Data.socialReferralSessions : 0;
  const socialShare = isConnected && ga4Data?.socialReferralShare ? ga4Data.socialReferralShare : 0;

  const totalUsers = Math.round(baseTotalUsers);
  const aiSessions = Math.round(baseAiSessions);
  const socialSessions = Math.round(baseSocialSessions);

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
          {isConnected && properties.length > 1 && (
            <div className="mt-2 flex items-center gap-2">
              <label htmlFor="ga4-property-select" className="text-[11px] text-slate-500">GA4 Property:</label>
              <select
                id="ga4-property-select"
                value={currentPropertyId || ""}
                disabled={switchingProperty}
                onChange={(e) => handleSelectProperty(e.target.value)}
                className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-50"
              >
                {!currentPropertyId && <option value="">Select a property…</option>}
                {properties.map((p) => (
                  <option key={p.property} value={p.property}>
                    {p.displayName} {p.accountName ? `(${p.accountName})` : ""}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500">{properties.length} properties found on this Google account</span>
            </div>
          )}
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
      ) : loading || error || !ga4Data ? (
        <p role="status" className="py-8 text-sm text-zinc-400">{loading ? "Loading analytics..." : error || "Analytics unavailable."}</p>
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

            {engines.length > 0 && (
              <EngineDistributionGraphic
                engines={engines.map((e: any) => ({
                  ...e,
                  sessions: Math.round((e.sessions || 0)),
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
                          {Math.round((e.sessions || 0)).toLocaleString()}
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
