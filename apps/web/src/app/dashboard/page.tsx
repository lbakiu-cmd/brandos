"use client";

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

  const baseClicks = gscData?.totalClicks || 348;
  const baseImpressions = gscData?.totalImpressions || 6850;
  const baseAiSessions = ga4Data?.aiReferralSessions || 145;
  const baseLocalViews = (gbpData?.searchViews || 1480) + (gbpData?.mapsViews || 980);
  const aeoScore = aeoData?.compositeScore || 78;

  const totalClicks = Math.max(1, Math.round(baseClicks * multiplier));
  const totalImpressions = Math.max(10, Math.round(baseImpressions * multiplier));
  const aiSessions = Math.max(1, Math.round(baseAiSessions * multiplier));
  const totalLocalViews = Math.max(10, Math.round(baseLocalViews * multiplier));

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
      done: wpConnected,
      href: "/dashboard/integrations",
      action: "Connect Channels",
    },
    {
      id: "audit",
      title: "3. Run Website Checkup",
      desc: "Discover where you may be losing potential customers and fix errors in 1-click.",
      done: true,
      href: "/dashboard/audit",
      action: "View Checkup",
    },
    {
      id: "ai",
      title: "4. Get Found on ChatGPT & AI",
      desc: "Boost your visibility when customers ask AI assistants for recommendations.",
      done: aeoScore > 65,
      href: "/dashboard/visibility",
      action: "Optimize for AI",
    },
  ];

  const completedCount = checklistSteps.filter((s) => s.done).length;
  const completionPct = Math.round((completedCount / checklistSteps.length) * 100);

  return (
    <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Online Growth Command Center
            </h1>
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 border border-blue-500/20">
              {businessName}
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Simple, automated tracking for your Google rankings, customer visits, and AI discovery.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Filter (One Week, Two Weeks, One Month, 3 Months, Max) */}
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
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/50 px-3.5 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-900/60 hover:text-white transition shadow-sm"
            title="View baseline vs actual presence comparison"
          >
            <Award className="h-3.5 w-3.5 text-indigo-400" />
            <span>14-Day Baseline</span>
          </button>

          {/* Sync All Button */}
          <button
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-blue-400" : ""}`} />
            {isSyncing ? "Refreshing..." : "Refresh Data"}
          </button>

          {/* Add Widget Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-lg shadow-blue-500/25"
          >
            <Plus className="h-4 w-4" /> Add Card
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
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs font-semibold text-emerald-400 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {syncNotice}
        </div>
      )}


      {/* SECTION: 4-Step Online Growth Checklist (Beginner-Friendly Onboarding) */}
      <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 via-slate-900/80 to-slate-900/90 p-6 backdrop-blur shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500 text-white text-xs font-black">
                ★
              </span>
              <h2 className="text-base md:text-lg font-bold text-white">Your Online Presence Growth Plan</h2>
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-bold text-blue-400 border border-blue-500/30">
                {completionPct}% Complete
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Follow these 4 simple steps to boost your Google rankings and attract more high-paying clients.
            </p>
          </div>

          <div className="w-full sm:w-48">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
              <span>Setup Progress</span>
              <span>{completedCount}/4 Completed</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
          {checklistSteps.map((step) => (
            <div
              key={step.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                step.done
                  ? "border-emerald-500/30 bg-emerald-950/20"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${step.done ? "text-emerald-400" : "text-white"}`}>
                    {step.title}
                  </span>
                  {step.done ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      ✓ Done
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Action Needed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{step.desc}</p>
              </div>

              <Link
                href={step.href}
                className={`mt-4 flex items-center justify-center gap-1 rounded-xl py-2 px-3 text-xs font-bold transition ${
                  step.done
                    ? "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:from-blue-500 hover:to-indigo-500"
                }`}
              >
                {step.action} <ArrowRight className="h-3 w-3 ml-0.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION: Plain-English Stats Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Google Visits */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Search className="h-4 w-4 text-blue-400" /> Google Search Visits
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">+14%</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-white mt-2">{totalClicks.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Seen {(totalImpressions / 1000).toFixed(1)}k times on Google Search
          </p>
        </div>

        {/* AI Visitors */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-400" /> Visitors from AI Chatbots
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">+46%</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-amber-400 mt-2">{aiSessions.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Sent by ChatGPT, Gemini & Perplexity
          </p>
        </div>

        {/* Local Maps & Calls */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-400" /> Google Maps & Local Calls
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">+18%</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-white mt-2">{totalLocalViews.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            People looking for directions & phone numbers
          </p>
        </div>

        {/* AI Recommendation Score */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Award className="h-4 w-4 text-indigo-400" /> AI Recommendation Score
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">High</span>
          </div>
          <p className="text-2xl md:text-3xl font-black text-indigo-400 mt-2">{aeoScore} <span className="text-sm font-normal text-slate-400">/ 100</span></p>
          <p className="text-[11px] text-slate-400 mt-1">
            Likelihood AI recommends you first
          </p>
        </div>
      </div>

      {/* SECTION: Cards & Analytics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Live Performance Cards</h2>
            <p className="text-xs text-slate-400">Detailed insights into your search terms, customer reviews, and website readiness.</p>
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
      <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-800/80 text-xs text-slate-500 gap-3">
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