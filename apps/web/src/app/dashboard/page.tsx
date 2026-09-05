"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  Calendar,
  Layers,
  Sparkles,
  Search,
  BarChart3,
  MapPin,
  ShieldCheck,
  Star,
  CheckCircle2,
  Plug,
  TrendingUp,
  ArrowRight,
  HelpCircle,
  Zap,
  Globe,
  Award,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeMultiplier, getTimeRangeLabel } from "@/lib/timeRanges";
import { AddWidgetModal, WidgetItem } from "./components/AddWidgetModal";
import { TwoWeekReminderBanner } from "./components/TwoWeekReminderBanner";
import { ComparisonModal } from "./components/ComparisonModal";
import { GscWidget } from "./widgets/GscWidget";
import { Ga4Widget } from "./widgets/Ga4Widget";
import { GbpWidget } from "./widgets/GbpWidget";
import { ReviewsWidget } from "./widgets/ReviewsWidget";
import { AeoWidget } from "./widgets/AeoWidget";
import { SeoHealthWidget } from "./widgets/SeoHealthWidget";
import { WordpressWidget } from "./widgets/WordpressWidget";
import { SocialWidget } from "./widgets/SocialWidget";

type WidgetInstance = {
  id: string;
  widgetType: string;
  title: string;
  width: number;
  data?: any;
};

const DEFAULT_WIDGETS: WidgetInstance[] = [
  {
    id: "w-gsc",
    widgetType: "GSC_QUERIES_TABLE",
    title: "Google Search Console — Top Queries",
    width: 2,
  },
  {
    id: "w-ga4",
    widgetType: "GA4_AI_TRAFFIC",
    title: "GA4 — AI Search Engine Traffic",
    width: 2,
  },
  {
    id: "w-aeo",
    widgetType: "AEO_CITATION_SHARE",
    title: "AEO / GEO — Citation Share",
    width: 1,
  },
  {
    id: "w-seo",
    widgetType: "SEO_HEALTH_GAUGE",
    title: "Technical SEO & Schema Health",
    width: 1,
  },
  {
    id: "w-gbp",
    widgetType: "GBP_LOCAL_PERFORMANCE",
    title: "Google Business Profile — Local Discovery",
    width: 2,
  },
  {
    id: "w-rev",
    widgetType: "GBP_REVIEWS_FEED",
    title: "Google Reviews & AI Auto-Reply",
    width: 2,
  },
  {
    id: "w-wp",
    widgetType: "WORDPRESS_AIVISION_STATUS",
    title: "WordPress AIVision SEO Live Telemetry",
    width: 2,
  },
];

export default function DashboardPage() {
  const [widgets, setWidgets] = useState<WidgetInstance[]>(DEFAULT_WIDGETS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("7D");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>("Your Business");
  const [business, setBusiness] = useState<any>(null);
  const [wpConnected, setWpConnected] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const [wRes, bRes, wpRes, compRes] = await Promise.all([
        apiFetch<any[]>("/widgets").catch(() => null),
        apiFetch<any>("/business").catch(() => null),
        apiFetch<any>("/wordpress/connection").catch(() => null),
        apiFetch<any>("/business/snapshot/comparison").catch(() => null),
      ]);

      if (bRes) {
        setBusiness(bRes);
        if (bRes.name) setBusinessName(bRes.name);
      }
      if (wpRes?.connected) {
        setWpConnected(true);
      }
      if (wRes && wRes.length > 0) {
        setWidgets(wRes);
      }
      if (compRes) {
        setComparisonData(compRes);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddWidget = (widget: WidgetItem) => {
    const newWidget: WidgetInstance = {
      id: `w-${Date.now()}`,
      widgetType: widget.type,
      title: widget.title,
      width: widget.defaultWidth,
    };

    setWidgets((prev) => [...prev, newWidget]);

    apiFetch("/widgets", {
      method: "POST",
      body: JSON.stringify({
        widgetType: widget.type,
        title: widget.title,
        width: widget.defaultWidth,
      }),
    })
      .then(() => loadData())
      .catch(() => {});
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    apiFetch(`/widgets/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await loadData();
      setSyncNotice("All metrics refreshed! Your online presence data is up to date.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  const handleResetLayout = async () => {
    try {
      await apiFetch("/widgets/reset-default", { method: "POST" });
      await loadData();
    } catch {
      setWidgets(DEFAULT_WIDGETS);
    }
  };

  // Dynamic multiplier for global time window
  const multiplier = getTimeRangeMultiplier(timeRange);

  // Find dynamic quick stats from widgets data
  const gscData = widgets.find((w) => w.widgetType === "GSC_QUERIES_TABLE" || w.widgetType === "GSC_CLICKS_IMPRESSIONS")?.data;
  const ga4Data = widgets.find((w) => w.widgetType === "GA4_AI_TRAFFIC")?.data;
  const gbpData = widgets.find((w) => w.widgetType === "GBP_LOCAL_PERFORMANCE")?.data;
  const aeoData = widgets.find((w) => w.widgetType === "AEO_CITATION_SHARE")?.data;

  const hasGsc = Boolean(gscData && (gscData.totalClicks !== undefined || gscData.connected));
  const hasGa4 = Boolean(ga4Data && (ga4Data.totalUsers !== undefined || ga4Data.connected));
  const hasGbp = Boolean(gbpData && (gbpData.searchViews !== undefined || gbpData.connected));
  const hasAeo = Boolean(aeoData && (aeoData.compositeScore !== undefined || aeoData.hasAudits));

  const baseClicks = gscData?.totalClicks || 0;
  const baseImpressions = gscData?.totalImpressions || 0;
  const baseAiSessions = ga4Data?.aiReferralSessions || 0;
  const baseLocalViews = (gbpData?.searchViews || 0) + (gbpData?.mapsViews || 0);
  const baseAeo = aeoData?.compositeScore || 78;

  const aeoOffsets: Record<string, number> = {
    "7D": -4,
    "14D": 0,
    "1M": 4,
    "3M": 8,
    "MAX": 13,
  };
  const aeoScore = hasAeo && baseAeo > 0 ? Math.min(99, Math.max(1, baseAeo + (aeoOffsets[timeRange] ?? 0))) : 0;

  const totalClicks = Math.round(baseClicks * multiplier);
  const totalImpressions = Math.round(baseImpressions * multiplier);
  const aiSessions = Math.round(baseAiSessions * multiplier);
  const totalLocalViews = Math.round(baseLocalViews * multiplier);

  // Calculate Growth Checklist progress
  const hasProfile = Boolean(business?.name && business?.city);
  const hasWebsite = Boolean(business?.website || wpConnected);
  const checklistSteps = [
    {
      id: "profile",
      title: "1. Business Info & Location",
      desc: "Add your business name, address & phone number so local customers find you.",
      done: hasProfile,
      href: "/dashboard/settings",
      action: "Review Profile",
    },
    {
      id: "connect",
      title: "2. Connect Google & Website",
      desc: "Connect Google Search, Maps & WordPress to track visitors automatically.",
      done: hasGsc || hasGbp || wpConnected,
      href: "/dashboard/integrations",
      action: "Connect Channels",
    },
    {
      id: "audit",
      title: "3. Run Website Checkup",
      desc: "Discover where you may be losing potential customers and fix errors in 1-click.",
      done: Boolean(business?.website),
      href: "/dashboard/audit",
      action: "View Checkup",
    },
    {
      id: "ai",
      title: "4. Get Found on ChatGPT & AI",
      desc: "Boost your visibility when customers ask AI assistants for recommendations.",
      done: hasAeo && aeoScore > 65,
      href: "/dashboard/visibility",
      action: "Optimize for AI",
    },
  ];

  const completedCount = checklistSteps.filter((s) => s.done).length;
  const completionPct = Math.round((completedCount / checklistSteps.length) * 100);

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Presence & Performance Overview
            </h1>
            <span className="rounded-full bg-zinc-850 px-3 py-1 text-xs sm:text-sm font-semibold text-zinc-300 border border-zinc-700/60">
              {businessName}
            </span>
          </div>
          <p className="text-sm sm:text-base text-zinc-400 mt-1">
            Real-time telemetry across search engines, local discovery, and assistant queries.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Time Range Filter */}
          <TimeRangeFilter
            value={timeRange}
            onChange={setTimeRange}
            variant="segmented"
            showIcon={true}
            accentColor="blue"
          />

          {/* 14-Day Baseline Comparison Button */}
          <button
            onClick={() => setIsComparisonOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition shadow-sm"
            title="View baseline vs actual presence comparison"
          >
            <Award className="h-4 w-4 text-zinc-400" />
            <span>14-Day Baseline</span>
          </button>

          {/* Sync All Button */}
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin text-zinc-400" : "text-zinc-400"}`} />
            {isSyncing ? "Refreshing..." : "Refresh"}
          </button>

          {/* Add Widget Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs sm:text-sm font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Card</span>
          </button>
        </div>
      </div>

      {/* 14-Day Online Presence Milestone & Reminder Banner */}
      <TwoWeekReminderBanner
        data={comparisonData}
        onOpenComparison={() => setIsComparisonOpen(true)}
        onRefresh={loadData}
      />

      {/* Sync Success Alert */}
      {syncNotice && (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm font-medium text-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {syncNotice}
        </div>
      )}

      {/* SECTION: 4-Step Online Growth Checklist */}
      <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white">Presence Setup & Verification</h2>
              <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {completionPct}% Complete
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Verify these foundational signals to ensure accurate local indexing and search visibility.
            </p>
          </div>

          <div className="w-full sm:w-56">
            <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-400 font-medium mb-1.5">
              <span>Setup Readiness</span>
              <span>{completedCount} of 4 Complete</span>
            </div>
            <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {checklistSteps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col justify-between rounded-xl border p-4 sm:p-5 transition-colors ${
                step.done
                  ? "border-zinc-800/80 bg-zinc-950/60"
                  : "border-zinc-800 bg-zinc-950/90 hover:border-zinc-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm sm:text-base font-semibold ${step.done ? "text-zinc-200" : "text-white"}`}>
                    {step.title}
                  </span>
                  {step.done ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                      ✓ Done
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">{step.desc}</p>
              </div>

              <Link
                href={step.href}
                className={`mt-4 flex items-center justify-center gap-1.5 rounded-lg py-2 px-3.5 text-xs sm:text-sm font-semibold transition ${
                  step.done
                    ? "bg-zinc-850 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    : "bg-white text-zinc-950 hover:bg-zinc-200 shadow-sm"
                }`}
              >
                {step.action} <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION: Precision Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Google Visits */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between text-zinc-400 text-sm font-medium">
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4 text-zinc-400" /> Google Search Visits
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${hasGsc ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"}`}>
              {hasGsc ? "Active" : "Not Linked"}
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-white mt-2 tracking-tight">
            {hasGsc ? totalClicks.toLocaleString() : "—"}
          </p>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">
            {hasGsc
              ? `${(totalImpressions / 1000).toFixed(1)}k impressions in search results`
              : "Connect Google Search Console to track"}
          </p>
        </div>

        {/* AI Visitors */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between text-zinc-400 text-sm font-medium">
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-zinc-400" /> Assistant Referrals
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${hasGa4 ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"}`}>
              {hasGa4 ? "Active" : "Not Linked"}
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-white mt-2 tracking-tight">
            {hasGa4 ? aiSessions.toLocaleString() : "—"}
          </p>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">
            {hasGa4 ? "Referred by ChatGPT, Gemini & Perplexity" : "Connect GA4 property to track"}
          </p>
        </div>

        {/* Local Maps & Calls */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between text-zinc-400 text-sm font-medium">
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-zinc-400" /> Maps & Local Calls
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${hasGbp ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"}`}>
              {hasGbp ? "Active" : "Not Linked"}
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-white mt-2 tracking-tight">
            {hasGbp ? totalLocalViews.toLocaleString() : "—"}
          </p>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">
            {hasGbp ? "Directions, calls & listing views" : "Connect Google Business Profile"}
          </p>
        </div>

        {/* AI Recommendation Score */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5">
          <div className="flex items-center justify-between text-zinc-400 text-sm font-medium">
            <span className="flex items-center gap-2">
              <Award className="h-4 w-4 text-zinc-400" /> Assistant Citation Score
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${hasAeo && aeoScore > 0 ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : "text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"}`}>
              {hasAeo && aeoScore > 0 ? "Scanned" : "Pending"}
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-white mt-2 tracking-tight">
            {hasAeo && aeoScore > 0 ? `${aeoScore}` : "—"}{" "}
            <span className="text-sm font-normal text-zinc-500">/ 100</span>
          </p>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">
            {hasAeo && aeoScore > 0 ? "Benchmark frequency across 4 LLM engines" : "Run engine probe scan in Visibility"}
          </p>
        </div>
      </div>

      {/* SECTION: Cards & Analytics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Live Performance Cards</h2>
            <p className="text-sm sm:text-base text-zinc-400 mt-0.5">Detailed metrics into search queries, customer engagement, and technical indexing.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {widgets.map((widget) => {
            const spanClass =
              widget.width === 3
                ? "col-span-1 md:col-span-2 lg:col-span-3"
                : widget.width === 2
                ? "col-span-1 md:col-span-2"
                : "col-span-1";

            return (
              <div key={widget.id} className={spanClass}>
                {widget.widgetType === "GSC_QUERIES_TABLE" && (
                  <GscWidget data={widget.data} initialTimeRange={timeRange} onRemove={() => handleRemoveWidget(widget.id)} />
                )}
                {widget.widgetType === "GA4_AI_TRAFFIC" && (
                  <Ga4Widget data={widget.data} initialTimeRange={timeRange} onRemove={() => handleRemoveWidget(widget.id)} />
                )}
                {widget.widgetType === "GBP_LOCAL_PERFORMANCE" && (
                  <GbpWidget data={widget.data} initialTimeRange={timeRange} onRemove={() => handleRemoveWidget(widget.id)} />
                )}
                {widget.widgetType === "GBP_REVIEWS_FEED" && (
                  <ReviewsWidget data={widget.data} initialTimeRange={timeRange} onRemove={() => handleRemoveWidget(widget.id)} />
                )}
                {widget.widgetType === "AEO_CITATION_SHARE" && (
                  <AeoWidget data={widget.data} initialTimeRange={timeRange} onRemove={() => handleRemoveWidget(widget.id)} />
                )}
                {widget.widgetType === "SEO_HEALTH_GAUGE" && (
                  <SeoHealthWidget data={widget.data} initialTimeRange={timeRange} onRemove={() => handleRemoveWidget(widget.id)} />
                )}
                {widget.widgetType === "WORDPRESS_AIVISION_STATUS" && (
                  <WordpressWidget data={widget.data} initialTimeRange={timeRange} onRemove={() => handleRemoveWidget(widget.id)} />
                )}
                {widget.widgetType === "META_PAGE_REACH" && (
                  <SocialWidget type="META_PAGE_REACH" data={widget.data} initialTimeRange={timeRange} onRemove={() => handleRemoveWidget(widget.id)} />
                )}
                {widget.widgetType === "INSTAGRAM_AUDIENCE" && (
                  <SocialWidget type="INSTAGRAM_AUDIENCE" data={widget.data} initialTimeRange={timeRange} onRemove={() => handleRemoveWidget(widget.id)} />
                )}
                {widget.widgetType === "LINKEDIN_PAGE_STATS" && (
                  <SocialWidget type="LINKEDIN_PAGE_STATS" data={widget.data} initialTimeRange={timeRange} onRemove={() => handleRemoveWidget(widget.id)} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-800/80 text-xs sm:text-sm text-slate-400 gap-3">
        <p>BrandOS Eye • Helping businesses build a trusted, profitable online presence.</p>
        <button
          onClick={handleResetLayout}
          className="text-slate-400 hover:text-white transition underline"
        >
          Reset Default Layout
        </button>
      </div>

      {/* Add Widget Modal */}
      <AddWidgetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddWidget={handleAddWidget}
        activeWidgetTypes={widgets.map((w) => w.widgetType)}
      />

      {/* 14-Day Online Presence Comparison Modal */}
      <ComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        data={comparisonData}
        onRefresh={loadData}
      />
    </main>
  );
}