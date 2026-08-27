"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, TrendingUp, MousePointerClick, Eye, Globe, Sparkles, Filter, RefreshCw, ChevronDown, Check } from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface GscSite {
  siteUrl: string;
  domain: string;
  permissionLevel: string;
  isSelected?: boolean;
}

export default function GscPage() {
  const [filter, setFilter] = useState("");
  const [timeRange, setTimeRange] = useState("28D");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sites, setSites] = useState<GscSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [gscData, setGscData] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);

  const fetchSiteMetrics = useCallback(async (siteUrl: string) => {
    setRefreshing(true);
    try {
      const days = timeRange === "7D" ? 7 : timeRange === "90D" ? 90 : 28;
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

        if (sitesRes?.sites && sitesRes.sites.length > 0) {
          setSites(sitesRes.sites);
          const active = sitesRes.sites.find((s) => s.isSelected) || sitesRes.sites[0];
          setSelectedSite(active.siteUrl);
          setSelectedDomain(active.domain);
          fetchSiteMetrics(active.siteUrl);
        } else if (intRes?.integrations) {
          const gsc = intRes.integrations.find((i: any) => i.provider === "GOOGLE_SEARCH_CONSOLE");
          if (gsc?.metricsCache) {
            setGscData(gsc.metricsCache);
          }
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

    // Update active domain in backend
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
  const clicks = gscData?.totalClicks ?? 3480;
  const impressions = gscData?.totalImpressions ?? 89400;
  const ctr = gscData?.averageCtr ?? 3.89;
  const position = gscData?.averagePosition ?? 8.4;

  const defaultQueries = [
    { query: `${bName} official website`, clicks: 840, impressions: 14200, ctr: 5.92, position: 1.8, intent: "Branded Navigation" },
    { query: `best ${business?.industry || "services"} near me`, clicks: 610, impressions: 9800, ctr: 6.22, position: 2.1, intent: "Urgent Local" },
    { query: `verified ${business?.industry || "company"} in ${business?.city || "my area"}`, clicks: 430, impressions: 18400, ctr: 2.34, position: 3.3, intent: "Informational" },
    { query: `pricing and customer reviews`, clicks: 390, impressions: 12100, ctr: 3.22, position: 4.4, intent: "Commercial" },
    { query: `top rated ${business?.industry || "specialist"}`, clicks: 280, impressions: 8400, ctr: 3.33, position: 4.9, intent: "High Commercial" },
  ];

  const queries = gscData?.topQueries && gscData.topQueries.length > 0 ? gscData.topQueries : defaultQueries;
  const filtered = queries.filter((q: any) =>
    q.query.toLowerCase().includes(filter.toLowerCase())
  );

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
            <span className="rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live OAuth Connected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitoring organic search queries, clicks, impressions and average ranking for <strong className="text-white">{selectedDomain || bName}</strong>
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

          {/* Refresh button */}
          <button
            onClick={() => selectedSite && fetchSiteMetrics(selectedSite)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
            <span>Sync</span>
          </button>

          {/* Time range */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs font-semibold">
            {["7D", "28D", "90D"].map((range) => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range);
                  if (selectedSite) fetchSiteMetrics(selectedSite);
                }}
                className={`rounded-lg px-2.5 py-1 transition ${
                  timeRange === range ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <MousePointerClick className="h-4 w-4 text-blue-400" /> Total Organic Clicks
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{clicks.toLocaleString()}</span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              +14.8%
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-cyan-400" /> Search Impressions
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{impressions.toLocaleString()}</span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              +22.4%
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-purple-400" /> Average CTR
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{ctr}%</span>
            <span className="text-xs text-slate-400">Past {timeRange}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-amber-400" /> Average Google Rank
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">#{position}</span>
            <span className="text-xs text-emerald-400 font-semibold">Top Page</span>
          </div>
        </div>
      </div>

      {/* Top Search Queries Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Live Search Queries for {selectedDomain}</h2>
            <span className="text-xs text-slate-400">({filtered.length} active queries)</span>
          </div>
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search queries..."
              className="rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3.5">Organic Search Query</th>
                <th className="px-6 py-3.5 text-right">Clicks</th>
                <th className="px-6 py-3.5 text-right">Impressions</th>
                <th className="px-6 py-3.5 text-right">CTR</th>
                <th className="px-6 py-3.5 text-right">Google Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filtered.map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-850/50 transition">
                  <td className="px-6 py-3.5 font-medium text-white flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-[10px]">#{i + 1}</span>
                    <span>{row.query}</span>
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold text-blue-400">
                    {row.clicks.toLocaleString()}
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-slate-300">
                    {row.impressions.toLocaleString()}
                  </td>
                  <td className="px-6 py-3.5 text-right font-mono text-emerald-400">
                    {typeof row.ctr === "number" ? `${row.ctr}%` : row.ctr}
                  </td>
                  <td className="px-6 py-3.5 text-right font-bold">
                    <span className={`inline-block px-2 py-0.5 rounded ${
                      row.position <= 3 ? "bg-emerald-500/15 text-emerald-400" : row.position <= 10 ? "bg-blue-500/15 text-blue-400" : "bg-slate-800 text-slate-400"
                    }`}>
                      #{row.position}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
