"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, TrendingUp, MousePointerClick, Eye, Globe, Sparkles, Filter, RefreshCw, ChevronDown, Check, Plug } from "lucide-react";
import { apiFetch } from "@/lib/api";

import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeMultiplier, getTimeRangeLabel, getTimeRangeDays } from "@/lib/timeRanges";
import { PerformanceTimelineGraphic } from "@/components/charts/PerformanceTimelineGraphic";
import { QueryRankDistributionGraphic } from "@/components/charts/QueryRankDistributionGraphic";

export interface GscSite {
  siteUrl: string;
  domain: string;
  permissionLevel: string;
  isSelected?: boolean;
}

export const dynamic = "force-dynamic";

export default function GscPage() {
  const [filter, setFilter] = useState("");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<"all" | "clicks" | "impressions" | "ctr" | "position">("all");
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("7D");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sites, setSites] = useState<GscSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [gscData, setGscData] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const fetchSiteMetrics = useCallback(async (siteUrl: string, range?: TimeRangeKey) => {
    setRefreshing(true);
    try {
      const activeRange = range || timeRange;
      const days = getTimeRangeDays(activeRange);
      const data = await apiFetch<any>(`/integrations/google/search-analytics?siteUrl=${encodeURIComponent(siteUrl)}&days=${days}`);
      if (data) {
        setGscData(data);
      }
    } catch (err) {
      console.error("Failed to query site analytics:", err);
    } finally {
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    async function loadData() {
      try {
        const [bRes, sitesRes, intRes] = await Promise.all([
          apiFetch<any>("/business").catch(() => null),
          apiFetch<{ sites: GscSite[]; currentWebsite?: string }>("/integrations/google/sites").catch(() => null),
          apiFetch<any>("/integrations/status").catch(() => null),
        ]);

        if (bRes) setBusiness(bRes);

        const gscInt = intRes?.integrations?.find((i: any) => i.provider === "GOOGLE_SEARCH_CONSOLE");
        if (gscInt?.connected) {
          setIsConnected(true);
        }

        if (sitesRes?.sites && sitesRes.sites.length > 0) {
          setIsConnected(true);
          setSites(sitesRes.sites);
          const active = sitesRes.sites.find((s) => s.isSelected) || sitesRes.sites[0];
          setSelectedSite(active.siteUrl);
          setSelectedDomain(active.domain);
          fetchSiteMetrics(active.siteUrl);
        } else if (gscInt?.metricsCache) {
          setGscData(gscInt.metricsCache);
        }
      } catch (err) {
        console.error("Failed to load GSC data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [fetchSiteMetrics]);

  const handleSelectSite = async (site: GscSite) => {
    setSelectedSite(site.siteUrl);
    setSelectedDomain(site.domain);
    setSiteDropdownOpen(false);

    try {
      await apiFetch("/integrations/select-site", {
        method: "POST",
        body: JSON.stringify({ siteUrl: site.siteUrl, domain: site.domain }),
      });
    } catch {
      // ignore
    }

    fetchSiteMetrics(site.siteUrl);
  };

  const bName = business?.name || "Your Business";
  const multiplier = getTimeRangeMultiplier(timeRange);

  const baseClicks = gscData?.totalClicks ?? 2640;
  const baseImpressions = gscData?.totalImpressions ?? 48900;
  const clicks = Math.round(baseClicks * multiplier);
  const impressions = Math.round(baseImpressions * multiplier);
  const ctr = gscData?.averageCtr ?? 5.4;
  const position = gscData?.averagePosition ?? 2.8;

  const defaultQueries = [
    { query: `${bName} booking and reviews`, clicks: 610, impressions: 6800, ctr: 8.97, position: 1.1, intent: "Branded Trust" },
    { query: `dentist near me in ${business?.city || "Downtown"}`.trim(), clicks: 840, impressions: 14200, ctr: 5.92, position: 2.1, intent: "Local High Intent" },
    { query: `emergency dentist open today ${business?.city || ""}`.trim(), clicks: 490, impressions: 9800, ctr: 5.0, position: 2.4, intent: "Urgent Medical" },
    { query: `teeth whitening and dental implants cost`, clicks: 390, impressions: 12100, ctr: 3.22, position: 4.8, intent: "Commercial" },
    { query: `best rated cosmetic dental clinic`, clicks: 210, impressions: 8400, ctr: 2.50, position: 7.3, intent: "Discovery" },
    { query: `affordable root canal procedure price`, clicks: 175, impressions: 4600, ctr: 3.80, position: 9.1, intent: "Commercial" },
    { query: `how often should you get teeth cleaning`, clicks: 95, impressions: 3200, ctr: 2.96, position: 14.5, intent: "Informational" },
    { query: `dental insurance covered checkup`, clicks: 60, impressions: 2800, ctr: 2.14, position: 18.2, intent: "Informational" },
    { query: `top rated oral surgeon recommendations`, clicks: 45, impressions: 2100, ctr: 2.14, position: 23.4, intent: "Discovery" },
  ];

  const rawQueries = (gscData?.topQueries && gscData.topQueries.length > 0)
    ? gscData.topQueries
    : defaultQueries;
  const queries = rawQueries.map((q: any) => ({
    ...q,
    clicks: Math.round(q.clicks * multiplier),
    impressions: Math.round(q.impressions * multiplier),
  }));

  const filtered = queries.filter((q: any) => {
    const matchesQuery = q.query.toLowerCase().includes(filter.toLowerCase());
    if (!matchesQuery) return false;
    if (!selectedTier) return true;
    const pos = Number(q.position) || 99;
    if (selectedTier === "top3") return pos <= 3;
    if (selectedTier === "page1") return pos > 3 && pos <= 10;
    if (selectedTier === "page2") return pos > 10 && pos <= 20;
    if (selectedTier === "beyond") return pos > 20;
    return true;
  });

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header with Active Domain Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Search className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-white">Google Search Console</h1>
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold border flex items-center gap-1.5 ${isConnected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
              {isConnected ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live OAuth Connected
                </>
              ) : (
                "Not Connected"
              )}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring organic search queries, clicks, impressions and average ranking for <strong className="text-white">{selectedDomain || bName}</strong> ({getTimeRangeLabel(timeRange)})
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Site Selector Dropdown */}
          {sites.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
                className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:border-blue-500/50 transition"
              >
                <Globe className="h-3.5 w-3.5 text-blue-400" />
                <span>{selectedDomain || "Select Domain"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {siteDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl z-50">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch GSC Domain ({sites.length})
                  </p>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {sites.map((s) => (
                      <button
                        key={s.siteUrl}
                        onClick={() => handleSelectSite(s)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                          selectedDomain === s.domain ? "bg-blue-600/20 text-blue-400 font-bold" : "text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <span className="truncate">{s.domain}</span>
                        {selectedDomain === s.domain && <Check className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sync Button */}
          {isConnected && (
            <button
              onClick={() => selectedSite && fetchSiteMetrics(selectedSite, timeRange)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
              <span>Sync</span>
            </button>
          )}

          {/* Time range Filter */}
          <TimeRangeFilter
            value={timeRange}
            onChange={(val) => {
              setTimeRange(val);
              if (selectedSite) fetchSiteMetrics(selectedSite, val);
            }}
            variant="segmented"
            showIcon={true}
            accentColor="blue"
          />
        </div>
      </div>

      {/* Demo Banner when not connected */}
      {!isConnected && (
        <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-blue-950/30 p-4 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0 shadow-lg shadow-blue-500/10">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Interactive GSC Demo Mode</h3>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
                  Simulated Property
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Exploring simulated search console analytics for <strong className="text-white">{bName}</strong>. Connect your verified Google domain to stream live clicks, real search terms and ranking updates.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition shrink-0"
          >
            <Plug className="h-3.5 w-3.5" />
            <span>Connect Search Console</span>
          </Link>
        </div>
      )}

      {/* Metric Highlights with GSC-style clickable toggle */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setSelectedMetric(selectedMetric === "clicks" ? "all" : "clicks")}
          className={`text-left rounded-2xl border p-5 backdrop-blur transition-all duration-200 cursor-pointer ${
            selectedMetric === "clicks"
              ? "border-blue-500 bg-blue-950/30 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50"
              : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
          }`}
        >
          <p className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MousePointerClick className="h-4 w-4 text-blue-400" /> Total Organic Clicks
            </span>
            <span className={`h-2 w-2 rounded-full ${selectedMetric === "clicks" ? "bg-blue-400 animate-ping" : "bg-blue-400/40"}`} />
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{clicks.toLocaleString()}</span>
            <span className="text-[10px] text-blue-400 font-semibold">Volume Trend</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMetric(selectedMetric === "impressions" ? "all" : "impressions")}
          className={`text-left rounded-2xl border p-5 backdrop-blur transition-all duration-200 cursor-pointer ${
            selectedMetric === "impressions"
              ? "border-purple-500 bg-purple-950/30 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/50"
              : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
          }`}
        >
          <p className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-purple-400" /> Search Impressions
            </span>
            <span className={`h-2 w-2 rounded-full ${selectedMetric === "impressions" ? "bg-purple-400 animate-ping" : "bg-purple-400/40"}`} />
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{impressions.toLocaleString()}</span>
            <span className="text-[10px] text-purple-400 font-semibold">Reach</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMetric(selectedMetric === "ctr" ? "all" : "ctr")}
          className={`text-left rounded-2xl border p-5 backdrop-blur transition-all duration-200 cursor-pointer ${
            selectedMetric === "ctr"
              ? "border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50"
              : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
          }`}
        >
          <p className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Average CTR
            </span>
            <span className={`h-2 w-2 rounded-full ${selectedMetric === "ctr" ? "bg-emerald-400 animate-ping" : "bg-emerald-400/40"}`} />
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{ctr}%</span>
            <span className="text-xs text-slate-400">{getTimeRangeLabel(timeRange)}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedMetric(selectedMetric === "position" ? "all" : "position")}
          className={`text-left rounded-2xl border p-5 backdrop-blur transition-all duration-200 cursor-pointer ${
            selectedMetric === "position"
              ? "border-amber-500 bg-amber-950/30 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50"
              : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
          }`}
        >
          <p className="text-xs font-medium text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-amber-400" /> Average Google Rank
            </span>
            <span className={`h-2 w-2 rounded-full ${selectedMetric === "position" ? "bg-amber-400 animate-ping" : "bg-amber-400/40"}`} />
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">#{position || "—"}</span>
            <span className="text-[10px] text-amber-400 font-semibold">Top Tier</span>
          </div>
        </button>
      </div>

      {/* Graphics on Top of Data Table */}
      <div className="space-y-4">
        <PerformanceTimelineGraphic
          timeRange={timeRange}
          totalClicks={clicks}
          totalImpressions={impressions}
          avgCtr={ctr}
          avgPosition={position}
          activeMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
          variant="full"
          title="Search Performance Velocity & Ranking Trajectory"
        />

        {queries.length > 0 && (
          <QueryRankDistributionGraphic
            queries={queries}
            selectedTier={selectedTier}
            onSelectTier={setSelectedTier}
          />
        )}
      </div>

      {/* Top Search Queries Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Live Search Queries for {selectedDomain || bName}</h2>
            <span className="text-xs text-slate-400">({filtered.length} active queries)</span>
          </div>
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter keywords..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {filtered.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Search Query</th>
                  <th className="px-5 py-3 text-right">Intent</th>
                  <th className="px-5 py-3 text-right">Clicks</th>
                  <th className="px-5 py-3 text-right">Impressions</th>
                  <th className="px-5 py-3 text-right">CTR</th>
                  <th className="px-5 py-3 text-right">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map((q: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3 font-medium text-white flex items-center gap-2">
                      <span className="text-slate-500 font-mono text-[11px]">{i + 1}.</span>
                      {q.query}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700">
                        {q.intent || "Organic"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-white">{q.clicks.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-slate-400">{q.impressions.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-emerald-400 font-semibold">{q.ctr}%</td>
                    <td className="px-5 py-3 text-right">
                      <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold text-blue-400 border border-blue-500/20">
                        #{q.position}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              No search query keywords matching filter.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
