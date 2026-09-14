"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Globe,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  Layers,
  Users,
  FileText,
  AlertTriangle,
  RefreshCw,
  Bell,
  X,
  Copy,
  Download,
  Check,
  Code,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type EngineAnswerDetail = {
  mentioned: boolean;
  rank: number | null;
  statusLabel: string;
  sentiment: "positive" | "neutral" | "negative" | "absent";
  quote: string;
  competitors: string[];
  sourcesCited?: number;
  fullAnswer: string;
};

type QuestionItem = {
  id: string;
  question: string;
  category:
    | "Seed"
    | "Comparison"
    | "Budget"
    | "Persona"
    | "How to"
    | "Best"
    | "Near me"
    | "Alternative"
    | "Review"
    | "Other";
  gemini?: EngineAnswerDetail;
  googleAi?: EngineAnswerDetail;
  chatGpt: EngineAnswerDetail;
};

type EngineMetric = {
  name: string;
  percentage: number;
  mentionedCount: number;
  totalCount: number;
};

type CompetitorStats = {
  name: string;
  mentionsCount: number;
  shareOfVoice: number;
  engines: string[];
  categories: string[];
};

type ReferralSource = {
  domain: string;
  title: string;
  citationsCount: number;
  category: "Directory" | "Reviews" | "Maps" | "Industry Guide" | "Social";
  status: "linked" | "missing";
};

type ContentGapItem = {
  topic: string;
  category: string;
  impact: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  recommendation: string;
  competitorsCovering: string[];
};

type VisibilityReportPayload = {
  targetQuery: string;
  businessInfo: {
    name: string;
    address: string;
    tags: string[];
    initials: string;
  };
  headline: string;
  subtext: string;
  engineStats: {
    gemini?: EngineMetric;
    googleAi?: EngineMetric;
    chatGpt: EngineMetric;
  };
  questions: QuestionItem[];
  competitors: CompetitorStats[];
  referrals: ReferralSource[];
  contentGaps: ContentGapItem[];
};

type Report = {
  id: string;
  overallScore: number | null;
  engineScores: Record<string, number> | null;
  mentions: VisibilityReportPayload | any;
  promptsRun: number;
  createdAt: string;
};

type Business = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  industry: string | null;
  website?: string | null;
  phone?: string | null;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "warning" | "info" | "success";
  tab?: "questions" | "competitors" | "referrals" | "gaps";
};

export default function VisibilityPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"questions" | "competitors" | "referrals" | "gaps">("questions");

  // Accordion state: question ids that are expanded
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  // Notifications state
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      title: "High Impact Content Gap",
      message: "Sedation & emergency hours are missing from your site, reducing AI visibility rankings.",
      time: "15m ago",
      read: false,
      type: "warning",
      tab: "gaps",
    },
    {
      id: "notif-2",
      title: "Competitor Lead Detected",
      message: "Competitors are winning 65% share of voice on local dental queries.",
      time: "1h ago",
      read: false,
      type: "info",
      tab: "competitors",
    },
  ]);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
      }
    }
    if (notificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen]);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    if (notif.tab) {
      setActiveTab(notif.tab);
      const section = document.getElementById("tabs-section");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
    setNotificationsOpen(false);
  };

  // Modals state
  const [newSearchModalOpen, setNewSearchModalOpen] = useState(false);
  const [searchQueryInput, setSearchQueryInput] = useState("");
  const [selectedAnswerModal, setSelectedAnswerModal] = useState<{
    engine: string;
    question: string;
    detail: EngineAnswerDetail;
  } | null>(null);

  // Live OpenRouter Mention Audit Modal
  const [liveAuditModalOpen, setLiveAuditModalOpen] = useState(false);
  const [liveAuditCustomize, setLiveAuditCustomize] = useState(false);
  const [liveBizName, setLiveBizName] = useState("");
  const [liveCity, setLiveCity] = useState("");
  const [liveIndustry, setLiveIndustry] = useState("");
  const [liveAuditLoading, setLiveAuditLoading] = useState(false);
  const [liveAuditResults, setLiveAuditResults] = useState<any>(null);
  const [liveAuditError, setLiveAuditError] = useState<string | null>(null);

  // Auto-Fix state
  const [autoFixModalOpen, setAutoFixModalOpen] = useState(false);
  const [autoFixLoading, setAutoFixLoading] = useState(false);
  const [autoFixData, setAutoFixData] = useState<any>(null);
  const [autoFixActiveTab, setAutoFixActiveTab] = useState<"schema" | "llms" | "robots" | "aeo" | "citation">("schema");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const downloadFile = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  async function handleGenerateAutoFix() {
    setAutoFixLoading(true);
    try {
      const data = await apiFetch<any>("/ai-reports/auto-fix", {
        method: "POST",
        body: JSON.stringify({
          businessName: liveAuditResults?.businessName || liveBizName || business?.name || "Your Business",
          city: liveAuditResults?.city || liveCity || business?.city || "",
          industry: liveAuditResults?.industry || liveIndustry || business?.industry || "Services",
          website: business?.website || "https://yourwebsite.com",
          phone: business?.phone || "",
        }),
      });
      setAutoFixData(data);
      setAutoFixModalOpen(true);
    } catch (err: any) {
      alert("Failed to generate auto-fix package: " + err.message);
    } finally {
      setAutoFixLoading(false);
    }
  }

  // Competitor filter in tab 2
  const [compSearch, setCompSearch] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [list, biz] = await Promise.all([
        apiFetch<Report[]>("/ai-reports"),
        apiFetch<Business>("/business"),
      ]);
      setReports(list);
      setBusiness(biz);
    } catch {}
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(() => refresh().catch(() => {}), 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const latest = reports[0] ?? null;
  // Extract structured report payload strictly from real database reports (no mock static data)
  const reportData: VisibilityReportPayload | null = useMemo(() => {
    if (latest?.mentions && (latest.mentions as any).questions && Array.isArray((latest.mentions as any).questions)) {
      return latest.mentions as VisibilityReportPayload;
    }
    return null;
  }, [latest]);

  // Set all questions expanded by default when report loads
  useEffect(() => {
    if (reportData?.questions && reportData.questions.length > 0) {
      const exp: Record<string, boolean> = {};
      for (const q of reportData.questions) {
        exp[q.id] = true;
      }
      setExpandedQuestions(exp);
    }
  }, [reportData?.questions]);

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    if (!reportData?.questions) return;
    const exp: Record<string, boolean> = {};
    for (const q of reportData.questions) {
      exp[q.id] = true;
    }
    setExpandedQuestions(exp);
  };

  const collapseAll = () => {
    setExpandedQuestions({});
  };

  // 2-Engine Stats Resolution (Google Gemini & OpenAI ChatGPT)
  const geminiStat = reportData?.engineStats?.gemini || reportData?.engineStats?.googleAi || {
    name: "Google Gemini",
    percentage: 0,
    mentionedCount: 0,
    totalCount: reportData?.questions?.length || 0,
  };
  const chatGptStat = reportData?.engineStats?.chatGpt || {
    name: "OpenAI ChatGPT",
    percentage: 0,
    mentionedCount: 0,
    totalCount: reportData?.questions?.length || 0,
  };

  const totalEnginesAnalyzed = 2;
  const totalAnswersPossible = (reportData?.questions?.length || 0) * totalEnginesAnalyzed;
  const totalMentionedAllEngines = geminiStat.mentionedCount + chatGptStat.mentionedCount;
  const aggregateScore = totalAnswersPossible > 0 ? Math.round((totalMentionedAllEngines / totalAnswersPossible) * 100) : 0;

  async function handleRunProbe(customQuery?: string) {
    setBusy(true);
    try {
      await apiFetch("/ai-reports", {
        method: "POST",
        body: JSON.stringify({ query: customQuery }),
      });
      await refresh();
      setNewSearchModalOpen(false);
      setSearchQueryInput("");
    } finally {
      setBusy(false);
    }
  }

  async function handleRunLiveAudit() {
    setLiveAuditLoading(true);
    setLiveAuditError(null);
    try {
      const data = await apiFetch<any>("/ai-reports/live-check", {
        method: "POST",
        body: JSON.stringify({
          businessName: liveBizName.trim() || business?.name || "Your Business",
          city: liveCity.trim() || business?.city || "",
          industry: liveIndustry.trim() || business?.industry || "Services",
        }),
      });
      setLiveAuditResults(data);
      await refresh();
    } catch (err: any) {
      setLiveAuditError(err.message || "Failed to audit AI mentions.");
    } finally {
      setLiveAuditLoading(false);
    }
  }

  const filteredCompetitors = useMemo(() => {
    if (!reportData?.competitors) return [];
    if (!compSearch.trim()) return reportData.competitors;
    return reportData.competitors.filter((c) =>
      c.name.toLowerCase().includes(compSearch.toLowerCase())
    );
  }, [reportData?.competitors, compSearch]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-zinc-950 text-[#1C1917] dark:text-zinc-100 font-sans pb-24">
      {/* Top Bar Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#EFE8DE] dark:border-zinc-800/80 bg-[#FAF7F2]/90 dark:bg-zinc-950/90 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-[#8A5333] dark:text-amber-400 hover:text-[#6D3F24] transition flex items-center gap-1.5"
          >
            ‹ Back to AI Tools
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8A5333] text-white font-black text-sm shadow-sm">
              G
            </div>
          </div>

          <div className="relative flex items-center" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className="relative p-1.5 rounded-lg text-[#8A5333] dark:text-zinc-400 hover:text-[#5B3722] hover:bg-[#F2E8DC]/60 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Notifications"
              aria-label="View notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs animate-in zoom-in-50">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {notificationsOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                role="dialog"
                aria-label="Notifications"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#EFE8DE] dark:border-zinc-800/80 bg-[#FCFAF7] dark:bg-zinc-950/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1C1917] dark:text-white">
                      Notifications
                    </span>
                    {unreadCount > 0 ? (
                      <span className="rounded-full bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.2 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                        {unreadCount} unread
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        All read
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] font-semibold text-[#8A5333] dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white p-1 rounded-md transition cursor-pointer"
                      aria-label="Close notifications"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="max-h-80 overflow-y-auto divide-y divide-[#EFE8DE]/60 dark:divide-zinc-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center space-y-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                      <p className="text-xs font-medium text-[#1C1917] dark:text-zinc-200">
                        No notifications
                      </p>
                      <p className="text-[11px] text-[#78716C] dark:text-zinc-400">
                        You're all caught up with your AI visibility alerts.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                          notif.read
                            ? "hover:bg-[#FCFAF7] dark:hover:bg-zinc-800/40 opacity-75"
                            : "bg-[#FDFBF7] dark:bg-zinc-900/90 hover:bg-[#F8F3EB] dark:hover:bg-zinc-800/70"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            notif.type === "warning"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : notif.type === "info"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}
                        >
                          {notif.type === "warning" && <AlertTriangle className="h-3.5 w-3.5" />}
                          {notif.type === "info" && <Sparkles className="h-3.5 w-3.5" />}
                          {notif.type === "success" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className={`text-xs font-semibold truncate ${
                                notif.read
                                  ? "text-[#57534E] dark:text-zinc-300"
                                  : "text-[#1C1917] dark:text-white font-bold"
                              }`}
                            >
                              {notif.title}
                            </h4>
                            <span className="text-[10px] text-[#78716C] dark:text-zinc-400 shrink-0">
                              {notif.time}
                            </span>
                          </div>

                          <p className="text-[11px] text-[#57534E] dark:text-zinc-300 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>

                          {notif.tab && (
                            <div className="pt-1 flex items-center gap-1 text-[10px] font-semibold text-[#8A5333] dark:text-amber-400">
                              <span>
                                {notif.tab === "gaps" && "View Content Gaps"}
                                {notif.tab === "competitors" && "Inspect Competitors"}
                                {notif.tab === "questions" && "View Answers"}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                            </div>
                          )}
                        </div>

                        {!notif.read && (
                          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#8A5333] dark:bg-amber-400" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2 bg-[#FCFAF7] dark:bg-zinc-950/40 border-t border-[#EFE8DE] dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-[#78716C] dark:text-zinc-400">
                      AI Visibility Monitor
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAllAsRead();
                      }}
                      className="text-[#8A5333] dark:text-amber-400 hover:underline font-medium cursor-pointer"
                    >
                      Clear unread
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-8 pt-6 space-y-6">
        {/* Beta Banner */}
        <div className="rounded-xl border border-[#F6DEBB] dark:border-amber-900/50 bg-[#FEF9EE] dark:bg-amber-950/20 px-4 py-2.5 flex items-center gap-3 text-xs text-[#8A5333] dark:text-amber-300 shadow-sm">
          <span className="rounded-full bg-[#C2410C] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
            BETA
          </span>
          <span className="font-medium">
            This tool is in beta and the results can vary.
          </span>
        </div>

        {/* Action / Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <div className="space-y-1.5">
            <button
              onClick={() => {
                const q = reportData?.targetQuery || (business?.name ? `"${business.name} in ${business.city || "your area"}"` : "");
                setSearchQueryInput(q.replace(/^["']|["']$/g, ""));
                setNewSearchModalOpen(true);
              }}
              className="text-xs font-semibold text-[#8A5333] dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              ← New search
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1917] dark:text-white">
              Your visibility report
            </h1>
            <p className="text-xs text-[#78716C] dark:text-zinc-400">
              Business and intent are locked for this report. Start a fresh run with{" "}
              <button
                onClick={() => setNewSearchModalOpen(true)}
                className="font-semibold text-[#8A5333] dark:text-amber-400 hover:underline inline cursor-pointer"
              >
                ← New search
              </button>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setLiveBizName(business?.name || "");
                setLiveCity(business?.city || "");
                setLiveIndustry(business?.industry || "");
                setLiveAuditCustomize(false);
                setLiveAuditModalOpen(true);
                handleRunLiveAudit();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-4 py-2.5 text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              Live OpenRouter Audit
            </button>

            <button
              onClick={handleGenerateAutoFix}
              disabled={autoFixLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2.5 text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50"
            >
              {autoFixLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating Fix…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  ⚡ 1-Click Auto-Fix
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step 1 & Step 2 Setup Card */}
        <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 sm:p-6 space-y-5 shadow-xs">
          {/* STEP 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#F5EBE1] dark:bg-amber-950/40 border border-[#E8DFD3] dark:border-amber-900/50 px-1.5 py-0.5 text-[10px] font-bold text-[#7A4B2A] dark:text-amber-300 uppercase tracking-wider">
                STEP 1
              </span>
              <span className="text-xs font-bold text-[#1C1917] dark:text-zinc-200">
                Your business
              </span>
            </div>

            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8A5333] text-white font-bold text-base shadow-sm">
                  {reportData?.businessInfo?.initials || (business?.name ? business.name.slice(0, 2).toUpperCase() : "--")}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1C1917] dark:text-white leading-snug">
                    {reportData?.businessInfo?.name || business?.name || "Your Business"}
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400">
                    {reportData?.businessInfo?.address || (business?.city ? `${business.name}, ${business.city}` : "Location not set")}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {(reportData?.businessInfo?.tags || (business?.industry ? [business.industry, `${business.industry} in ${business.city || ""}`] : ["Local Business"])).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-[#F2E8DC] dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-[#7A4B2A] dark:text-amber-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#F5EBE1] dark:bg-amber-950/40 border border-[#E8DFD3] dark:border-amber-900/50 px-1.5 py-0.5 text-[10px] font-bold text-[#7A4B2A] dark:text-amber-300 uppercase tracking-wider">
                STEP 2
              </span>
              <span className="text-xs font-bold text-[#1C1917] dark:text-zinc-200">
                What should customers find you for?
              </span>
            </div>

            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950/60 px-4 py-3 font-medium text-xs sm:text-sm text-[#1C1917] dark:text-zinc-200">
              {reportData?.targetQuery || (business?.name ? `"${business.name} in ${business.city || "your area"}"` : '"Best local business"')}
            </div>
          </div>
        </div>

        {!reportData || !reportData.questions || reportData.questions.length === 0 ? (
          <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-8 sm:p-12 text-center space-y-6 shadow-xs my-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-[#8A5333] dark:text-amber-400">
              <Sparkles className="h-8 w-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl font-bold text-[#1C1917] dark:text-white">
                No Live AI Visibility Scan Recorded Yet
              </h2>
              <p className="text-sm text-[#78716C] dark:text-zinc-400">
                Audit your brand across <strong className="text-zinc-900 dark:text-zinc-200">Google Gemini & OpenAI ChatGPT</strong> with live AI models. Focused on the two highest-volume consumer AI search engines.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => handleRunLiveAudit()}
                disabled={liveAuditLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 px-6 py-3 text-sm font-semibold text-white shadow hover:opacity-95 transition cursor-pointer"
              >
                {liveAuditLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Auditing AI Visibility Live...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Run Live AI Visibility Audit
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  const q = business?.name ? `"${business.name} in ${business.city || "your area"}"` : "";
                  setSearchQueryInput(q.replace(/^["']|["']$/g, ""));
                  setNewSearchModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#EBE3D5] dark:border-zinc-700 px-5 py-3 text-sm font-medium text-[#1C1917] dark:text-zinc-200 hover:bg-[#FAF8F5] dark:hover:bg-zinc-850 transition cursor-pointer"
              >
                <Search className="h-4 w-4 text-[#8A5333]" />
                Custom Query Probe
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* Executive Summary Card */}
        <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 sm:p-6 space-y-4 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-[#1C1917] dark:text-white tracking-tight leading-snug">
            {reportData.headline}
          </h2>

          <p className="text-xs sm:text-sm text-[#78716C] dark:text-zinc-300 leading-relaxed">
            We asked{" "}
            <strong className="font-semibold text-[#1C1917] dark:text-white">
              {reportData.questions?.length || 0} questions
            </strong>{" "}
            about {reportData.targetQuery} across 2 primary AI engines:{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">Google Gemini</span> and{" "}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">OpenAI ChatGPT</span>.{" "}
            {reportData.businessInfo?.name} appeared in{" "}
            <strong className="font-semibold text-[#1C1917] dark:text-white">
              {totalMentionedAllEngines} of {totalAnswersPossible} answers
            </strong>{" "}
            —{" "}
            <strong className="font-semibold text-[#1C1917] dark:text-white">
              {aggregateScore}% visibility
            </strong>
            . There are{" "}
            <strong className="font-semibold text-[#1C1917] dark:text-white">
              {reportData.contentGaps?.length || 0} topics
            </strong>{" "}
            your site does not cover yet — see the{" "}
            <button
              onClick={() => setActiveTab("gaps")}
              className="font-semibold text-[#8A5333] dark:text-amber-400 hover:underline"
            >
              Content gaps
            </button>{" "}
            tab.
          </p>

          {/* 2 Engine Progress Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
            {/* Google Gemini */}
            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950/60 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C1917] dark:text-white">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                <span className="text-sm font-bold">Google Gemini</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium">Google Search & AI</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] dark:text-white tracking-tight">
                  {geminiStat.percentage}%
                </span>
                <span className="text-xs text-[#78716C] dark:text-zinc-400 font-medium">
                  · {geminiStat.mentionedCount}/{geminiStat.totalCount} answers cited
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-blue-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-700"
                  style={{ width: `${geminiStat.percentage}%` }}
                />
              </div>
            </div>

            {/* OpenAI ChatGPT */}
            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950/60 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C1917] dark:text-white">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
                <span className="text-sm font-bold">OpenAI ChatGPT</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium">SearchGPT & ChatGPT</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] dark:text-white tracking-tight">
                  {chatGptStat.percentage}%
                </span>
                <span className="text-xs text-[#78716C] dark:text-zinc-400 font-medium">
                  · {chatGptStat.mentionedCount}/{chatGptStat.totalCount} answers cited
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-emerald-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-700"
                  style={{ width: `${chatGptStat.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div id="tabs-section" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#EFE8DE] dark:border-zinc-800 pb-2">
            <button
              onClick={() => setActiveTab("questions")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "questions"
                  ? "bg-white dark:bg-zinc-900 border border-[#DECDBB] dark:border-zinc-700 text-[#1C1917] dark:text-white shadow-xs"
                  : "text-[#78716C] dark:text-zinc-400 hover:text-[#1C1917] hover:bg-[#F2E8DC]/50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <span>Every question we checked</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                  activeTab === "questions"
                    ? "bg-[#8A5333] text-white"
                    : "bg-[#EAE0D3] dark:bg-zinc-800 text-[#7A4B2A] dark:text-zinc-300"
                }`}
              >
                {reportData.questions?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("competitors")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "competitors"
                  ? "bg-white dark:bg-zinc-900 border border-[#DECDBB] dark:border-zinc-700 text-[#1C1917] dark:text-white shadow-xs"
                  : "text-[#78716C] dark:text-zinc-400 hover:text-[#1C1917] hover:bg-[#F2E8DC]/50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <span>Other competitors mentioned</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                  activeTab === "competitors"
                    ? "bg-[#8A5333] text-white"
                    : "bg-[#EAE0D3] dark:bg-zinc-800 text-[#7A4B2A] dark:text-zinc-300"
                }`}
              >
                {reportData.competitors?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("referrals")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "referrals"
                  ? "bg-white dark:bg-zinc-900 border border-[#DECDBB] dark:border-zinc-700 text-[#1C1917] dark:text-white shadow-xs"
                  : "text-[#78716C] dark:text-zinc-400 hover:text-[#1C1917] hover:bg-[#F2E8DC]/50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <span>Top referrals</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                  activeTab === "referrals"
                    ? "bg-[#8A5333] text-white"
                    : "bg-[#EAE0D3] dark:bg-zinc-800 text-[#7A4B2A] dark:text-zinc-300"
                }`}
              >
                {reportData.referrals?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("gaps")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "gaps"
                  ? "bg-white dark:bg-zinc-900 border border-[#DECDBB] dark:border-zinc-700 text-[#1C1917] dark:text-white shadow-xs"
                  : "text-[#78716C] dark:text-zinc-400 hover:text-[#1C1917] hover:bg-[#F2E8DC]/50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <span>Content gaps</span>
              <span
                className={`rounded-full px-2 py-0.2 text-[11px] font-bold ${
                  activeTab === "gaps"
                    ? "bg-[#8A5333] text-white"
                    : "bg-[#EAE0D3] dark:bg-zinc-800 text-[#7A4B2A] dark:text-zinc-300"
                }`}
              >
                {reportData.contentGaps?.length || 0}
              </span>
            </button>
          </div>

          {/* TAB 1: Questions List */}
          {activeTab === "questions" && (
            <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-xs">
              {/* Header row */}
              <div className="border-b border-[#EBE3D5] dark:border-zinc-800 bg-[#FAF7F2] dark:bg-zinc-950/80 px-5 py-3">
                <div className="text-[11px] text-[#78716C] dark:text-zinc-400 mb-1">
                  {reportData.questions?.length || 0} questions × 2 AI engines
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold tracking-wider text-[#78716C] dark:text-zinc-400 uppercase">
                  <div className="flex flex-1 min-w-0 items-center justify-between gap-3 pr-4">
                    <span>QUESTION (CLICK ROW TO EXPAND / COLLAPSE)</span>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={expandAll}
                        className="text-[10px] lowercase text-[#8A5333] dark:text-amber-400 hover:underline"
                      >
                        expand all
                      </button>
                      <span>·</span>
                      <button
                        onClick={collapseAll}
                        className="text-[10px] lowercase text-[#8A5333] dark:text-amber-400 hover:underline"
                      >
                        collapse
                      </button>
                    </div>
                  </div>
                  <div className="w-28 sm:w-32 shrink-0 text-center text-blue-600 dark:text-blue-400 font-bold tracking-wider text-xs">
                    GOOGLE GEMINI
                  </div>
                  <div className="w-28 sm:w-32 shrink-0 text-center text-emerald-600 dark:text-emerald-400 font-bold tracking-wider text-xs">
                    OPENAI CHATGPT
                  </div>
                </div>
              </div>

              {/* Questions table list */}
              <div className="divide-y divide-[#EFE8DE] dark:divide-zinc-800/80">
                {reportData.questions.map((q, qIdx) => {
                  const isExpanded = !!expandedQuestions[q.id];

                  const geminiDetail: EngineAnswerDetail = q.gemini || q.googleAi || q.chatGpt;
                  const chatGptDetail = q.chatGpt;

                  return (
                    <div key={q.id} className="transition-colors hover:bg-[#FDFCFB] dark:hover:bg-zinc-900/30">
                      {/* Summary Row */}
                      <div
                        onClick={() => toggleQuestion(q.id)}
                        className="flex items-start gap-3 px-5 py-4 cursor-pointer select-none"
                      >
                        <div className="flex-1 min-w-0 pr-4 space-y-0.5">
                          <h4 className="text-sm font-bold text-[#1C1917] dark:text-white flex items-center gap-2">
                            {q.question}
                          </h4>
                          <span className="text-[11px] font-medium text-[#78716C] dark:text-zinc-400">
                            {q.category}
                          </span>
                        </div>

                        {/* Google Gemini Indicator */}
                        <div className="w-28 sm:w-32 shrink-0 flex justify-center pt-0.5">
                          {geminiDetail?.mentioned ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                              ✓ Mentioned
                            </span>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500 font-bold text-sm">
                              —
                            </span>
                          )}
                        </div>

                        {/* ChatGPT Indicator */}
                        <div className="w-28 sm:w-32 shrink-0 flex justify-center pt-0.5">
                          {chatGptDetail?.mentioned ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                              ✓ Mentioned
                            </span>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500 font-bold text-sm">
                              —
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded Comparison Detail */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Google Gemini Box */}
                            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 relative overflow-hidden shadow-2xs">
                              <div className="h-0.5 w-full bg-blue-500 absolute top-0 left-0"></div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C1917] dark:text-white">
                                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                                  <span className="font-bold">Google Gemini</span>
                                </div>
                                <span className="text-[10px] text-[#78716C] dark:text-zinc-400">
                                  {geminiDetail?.sourcesCited ?? 6} sources cited
                                </span>
                              </div>

                              <div>
                                <span
                                  className={`text-xs font-bold ${
                                    geminiDetail?.mentioned
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {geminiDetail?.statusLabel || (geminiDetail?.mentioned ? "Mentioned in Answer" : "Not mentioned")}
                                </span>
                              </div>

                              <p className="text-xs italic text-[#57534E] dark:text-zinc-300 leading-relaxed">
                                &ldquo;{geminiDetail?.quote}&rdquo;
                              </p>

                              {geminiDetail?.competitors && geminiDetail.competitors.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  <span className="text-[10px] font-medium text-[#78716C] dark:text-zinc-400">
                                    Competitors cited alongside:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {geminiDetail.competitors.slice(0, 4).map((comp) => (
                                      <span
                                        key={comp}
                                        className="rounded-full border border-[#DECDBB] dark:border-zinc-700 bg-[#FCFAF7] dark:bg-zinc-900 px-2 py-0.2 text-[9px] font-medium text-[#7A4B2A] dark:text-amber-200"
                                      >
                                        {comp}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="pt-2 border-t border-[#F2E8DC] dark:border-zinc-800/80 flex items-center justify-end text-xs">
                                <button
                                  onClick={() =>
                                    setSelectedAnswerModal({
                                      engine: "Google Gemini",
                                      question: q.question,
                                      detail: geminiDetail,
                                    })
                                  }
                                  className="text-xs font-semibold text-[#8A5333] dark:text-amber-400 hover:underline cursor-pointer"
                                >
                                  View full answer →
                                </button>
                              </div>
                            </div>

                            {/* ChatGPT Box */}
                            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3 relative overflow-hidden shadow-2xs">
                              <div className="h-0.5 w-full bg-emerald-500 absolute top-0 left-0"></div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1C1917] dark:text-white">
                                  <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                                  <span className="font-bold">OpenAI ChatGPT</span>
                                </div>
                                <span className="text-[10px] text-[#78716C] dark:text-zinc-400">
                                  {chatGptDetail?.sourcesCited ?? 8} sources cited
                                </span>
                              </div>

                              <div>
                                <span
                                  className={`text-xs font-bold ${
                                    chatGptDetail?.mentioned
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-600 dark:text-rose-400"
                                  }`}
                                >
                                  {chatGptDetail?.statusLabel || (chatGptDetail?.mentioned ? "Mentioned in Answer" : "Not mentioned")}
                                </span>
                              </div>

                              <p className="text-xs italic text-[#57534E] dark:text-zinc-300 leading-relaxed">
                                &ldquo;{chatGptDetail?.quote}&rdquo;
                              </p>

                              {chatGptDetail?.competitors && chatGptDetail.competitors.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  <span className="text-[10px] font-medium text-[#78716C] dark:text-zinc-400">
                                    Competitors cited alongside:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {chatGptDetail.competitors.slice(0, 4).map((comp) => (
                                      <span
                                        key={comp}
                                        className="rounded-full border border-[#DECDBB] dark:border-zinc-700 bg-[#FCFAF7] dark:bg-zinc-900 px-2 py-0.2 text-[9px] font-medium text-[#7A4B2A] dark:text-amber-200"
                                      >
                                        {comp}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="pt-2 border-t border-[#F2E8DC] dark:border-zinc-800/80 flex items-center justify-end text-xs">
                                <button
                                  onClick={() =>
                                    setSelectedAnswerModal({
                                      engine: "OpenAI ChatGPT",
                                      question: q.question,
                                      detail: chatGptDetail,
                                    })
                                  }
                                  className="text-xs font-semibold text-[#8A5333] dark:text-amber-400 hover:underline cursor-pointer"
                                >
                                  View full answer →
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Other Competitors Mentioned */}
          {activeTab === "competitors" && (
            <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[#1C1917] dark:text-white">
                    Competitors Cited by AI Engines ({reportData.competitors.length})
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                    Local businesses recommended alongside or ahead of your brand across all evaluated prompts.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#78716C]" />
                  <input
                    type="text"
                    value={compSearch}
                    onChange={(e) => setCompSearch(e.target.value)}
                    placeholder="Filter competitors…"
                    className="w-full rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 pl-8 pr-3 py-1.5 text-xs text-[#1C1917] dark:text-zinc-200 placeholder:text-[#A8A29E] focus:outline-hidden focus:ring-1 focus:ring-[#8A5333]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EFE8DE] dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-[#78716C] dark:text-zinc-400">
                      <th className="pb-3 pr-4 font-bold">Competitor Business</th>
                      <th className="pb-3 px-4 font-bold">Mentions</th>
                      <th className="pb-3 px-4 font-bold">Share of Voice</th>
                      <th className="pb-3 px-4 font-bold">Engines Cited</th>
                      <th className="pb-3 pl-4 font-bold">Winning Categories</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2E8DC] dark:divide-zinc-800/80">
                    {filteredCompetitors.map((comp, idx) => (
                      <tr key={comp.name} className="hover:bg-[#FCFAF7] dark:hover:bg-zinc-950/40">
                        <td className="py-3.5 pr-4 font-bold text-[#1C1917] dark:text-white">
                          <span className="text-[11px] font-normal text-[#78716C] dark:text-zinc-500 mr-2">
                            #{idx + 1}
                          </span>
                          {comp.name}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#57534E] dark:text-zinc-300">
                          {comp.mentionsCount} of 20 answers
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1C1917] dark:text-white w-8">
                              {comp.shareOfVoice}%
                            </span>
                            <div className="h-1.5 w-16 rounded-full bg-[#EAE0D3] dark:bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#8A5333] dark:bg-amber-400"
                                style={{ width: `${Math.min(comp.shareOfVoice * 2, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex gap-1.5">
                            {comp.engines.map((eng) => (
                              <span
                                key={eng}
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                  eng === "ChatGPT"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                }`}
                              >
                                {eng}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 pl-4">
                          <div className="flex flex-wrap gap-1">
                            {comp.categories.slice(0, 3).map((cat) => (
                              <span
                                key={cat}
                                className="rounded bg-[#F5EBE1] dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-[#7A4B2A] dark:text-zinc-300"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Top Referrals */}
          {activeTab === "referrals" && (
            <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 space-y-5 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-[#1C1917] dark:text-white">
                  Top AI Knowledge Sources & Citations
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  The primary external domains and directory profiles cited by Google AI Mode and ChatGPT when verifying local business recommendations.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reportData.referrals.map((ref) => (
                  <div
                    key={ref.domain}
                    className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-[#F2E8DC] dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-[#7A4B2A] dark:text-amber-300">
                        {ref.category}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          ref.status === "linked"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        }`}
                      >
                        {ref.status === "linked" ? "Profile Verified" : "Missing / Unclaimed"}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#1C1917] dark:text-white">
                        {ref.title}
                      </h4>
                      <p className="text-xs text-[#78716C] dark:text-zinc-400 font-mono mt-0.5">
                        {ref.domain}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#F2E8DC] dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-[#78716C] dark:text-zinc-400">Total Citations:</span>
                      <span className="font-extrabold text-[#1C1917] dark:text-white text-sm">
                        {ref.citationsCount} references
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Content Gaps */}
          {activeTab === "gaps" && (
            <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 space-y-5 shadow-xs">
              <div>
                <h3 className="text-base font-bold text-[#1C1917] dark:text-white">
                  Identified Content & Schema Gaps ({reportData.contentGaps.length})
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  High-intent queries where competitors were chosen over your brand due to missing website content, structured FAQs, or schema markup.
                </p>
              </div>

              <div className="space-y-4">
                {reportData.contentGaps.map((gap, idx) => (
                  <div
                    key={gap.topic}
                    className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-5 space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#8A5333] dark:text-amber-400">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-[#1C1917] dark:text-white">
                          {gap.topic}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#F2E8DC] dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-[#7A4B2A] dark:text-zinc-300">
                          Category: {gap.category}
                        </span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            gap.impact === "HIGH"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200"
                              : gap.impact === "MEDIUM"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200"
                          }`}
                        >
                          {gap.impact} IMPACT
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#57534E] dark:text-zinc-300 leading-relaxed">
                      {gap.description}
                    </p>

                    <div className="rounded-lg bg-white dark:bg-zinc-900 border border-[#EBE3D5] dark:border-zinc-800 p-3 text-xs space-y-1">
                      <div className="font-semibold text-[#8A5333] dark:text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Recommended Action:
                      </div>
                      <p className="text-[#1C1917] dark:text-zinc-200">
                        {gap.recommendation}
                      </p>
                    </div>

                    {gap.competitorsCovering.length > 0 && (
                      <div className="flex items-center gap-2 text-[11px] text-[#78716C] dark:text-zinc-400 pt-1">
                        <span>Competitors winning this topic:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {gap.competitorsCovering.map((c) => (
                            <span
                              key={c}
                              className="rounded bg-[#F2E8DC] dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-[#7A4B2A] dark:text-amber-300"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* New Search Intent Modal */}
      {newSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1C1917] dark:text-white">
                Run Fresh Visibility Scan
              </h3>
              <button
                onClick={() => setNewSearchModalOpen(false)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#78716C] dark:text-zinc-400 leading-relaxed">
              Define the customer intent keyword to benchmark against Google AI Mode and ChatGPT across 10 discovery questions.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#1C1917] dark:text-zinc-200">
                Target Search Intent:
              </label>
              <input
                type="text"
                value={searchQueryInput}
                onChange={(e) => setSearchQueryInput(e.target.value)}
                placeholder='e.g. "best services in my area", "consulting firm near me"'
                className="w-full rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 px-3.5 py-2.5 text-xs text-[#1C1917] dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-[#8A5333]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNewSearchModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[#78716C] hover:bg-[#F2E8DC] dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRunProbe(searchQueryInput)}
                disabled={busy}
                className="rounded-xl bg-[#8A5333] hover:bg-[#724124] text-white px-4 py-2 text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {busy ? "Running Scan…" : "Run Visibility Probe"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Full Answer Modal */}
      {selectedAnswerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      selectedAnswerModal.engine === "ChatGPT" ? "bg-emerald-600" : "bg-blue-600"
                    }`}
                  ></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#78716C] dark:text-zinc-400">
                    {selectedAnswerModal.engine}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#1C1917] dark:text-white mt-1">
                  {selectedAnswerModal.question}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAnswerModal(null)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  selectedAnswerModal.detail.mentioned
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                }`}
              >
                {selectedAnswerModal.detail.statusLabel}
              </span>
              <span className="text-xs text-[#78716C] dark:text-zinc-400">
                · {selectedAnswerModal.detail.sourcesCited ?? 8} sources verified
              </span>
            </div>

            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-[#1C1917] dark:text-zinc-200 whitespace-pre-wrap font-sans">
                {selectedAnswerModal.detail.fullAnswer}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAnswerModal(null)}
                className="rounded-xl bg-[#8A5333] hover:bg-[#724124] text-white px-4 py-2 text-xs font-bold transition"
              >
                Close Answer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live OpenRouter Mention Audit Modal */}
      {liveAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    OpenRouter.ai Live Gateway
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#1C1917] dark:text-white mt-1">
                  Live AI Mention Auditor
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  Query Google Gemini and OpenAI ChatGPT simultaneously using your OpenRouter key.
                </p>
              </div>
              <button
                onClick={() => setLiveAuditModalOpen(false)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white p-1 rounded-lg hover:bg-[#F2E8DC]/60 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Business info used for this audit -- pulled from Business Settings by default */}
            <div className="rounded-xl border border-[#E8DFD3] dark:border-zinc-700 bg-[#FCFAF7] dark:bg-zinc-950/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[#1C1917] dark:text-zinc-200">
                  Auditing as{" "}
                  <strong className="font-bold">{liveBizName || business?.name || "Your Business"}</strong>
                  {(liveCity || business?.city) && <> in {liveCity || business?.city}</>}
                  {(liveIndustry || business?.industry) && <> ({liveIndustry || business?.industry})</>}
                  <span className="text-[#78716C] dark:text-zinc-500"> — from your Business Settings.</span>
                </p>
                <button
                  onClick={() => setLiveAuditCustomize((v) => !v)}
                  className="shrink-0 text-[11px] font-semibold text-[#8A5333] dark:text-amber-400 hover:underline cursor-pointer"
                >
                  {liveAuditCustomize ? "Hide" : "Customize"}
                </button>
              </div>

              {liveAuditCustomize && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#E8DFD3] dark:border-zinc-800">
                  <div>
                    <label className="block text-[11px] font-bold text-[#78716C] dark:text-zinc-400 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={liveBizName}
                      onChange={(e) => setLiveBizName(e.target.value)}
                      placeholder="e.g. Acme Services"
                      className="w-full rounded-xl border border-[#E8DFD3] dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#78716C] dark:text-zinc-400 mb-1">
                      City / Location
                    </label>
                    <input
                      type="text"
                      value={liveCity}
                      onChange={(e) => setLiveCity(e.target.value)}
                      placeholder="e.g. New York"
                      className="w-full rounded-xl border border-[#E8DFD3] dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#78716C] dark:text-zinc-400 mb-1">
                      Industry / Service
                    </label>
                    <input
                      type="text"
                      value={liveIndustry}
                      onChange={(e) => setLiveIndustry(e.target.value)}
                      placeholder="e.g. Legal Consulting"
                      className="w-full rounded-xl border border-[#E8DFD3] dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-xs text-[#1C1917] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Run Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#78716C] dark:text-zinc-400">
                Audits 2 core models: <code className="font-mono text-[10px] bg-amber-50 dark:bg-zinc-800 px-1 py-0.5 rounded">gpt-4o-mini</code> (OpenAI) & <code className="font-mono text-[10px] bg-amber-50 dark:bg-zinc-800 px-1 py-0.5 rounded">gemini-2.5-flash</code> (Google)
              </span>
              <button
                onClick={handleRunLiveAudit}
                disabled={liveAuditLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-4 py-2 text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {liveAuditLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Querying OpenAI & Gemini…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {liveAuditResults ? "Re-run Audit" : "Audit AI Visibility"}
                  </>
                )}
              </button>
            </div>

            {/* Error message */}
            {liveAuditError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
                {liveAuditError}
              </div>
            )}

            {/* Results Grid */}
            {liveAuditResults && (() => {
              const filteredResults = (liveAuditResults.results || []).filter(
                (res: any) =>
                  res.engine !== "CLAUDE" &&
                  res.engine !== "PERPLEXITY" &&
                  !res.name?.toLowerCase().includes("claude") &&
                  !res.name?.toLowerCase().includes("perplexity") &&
                  !res.model?.toLowerCase().includes("claude") &&
                  !res.model?.toLowerCase().includes("sonar")
              );
              const mentionedCount = filteredResults.filter((r: any) => r.mentioned).length;
              const totalEngines = filteredResults.length || 2;
              const visibilityScore = totalEngines > 0 ? Math.round((mentionedCount / totalEngines) * 100) : 0;

              return (
                <div className="space-y-4 pt-2 border-t border-[#EBE3D5] dark:border-zinc-800">
                  {/* Summary bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-[#FCFAF7] dark:bg-zinc-950 p-4 border border-[#E8DFD3] dark:border-zinc-800 shadow-xs">
                    <div>
                      <h4 className="text-xs font-bold text-[#1C1917] dark:text-white">
                        Audit Results for &ldquo;{liveAuditResults.businessName}&rdquo; ({liveAuditResults.city})
                      </h4>
                      <p className="text-[11px] text-[#78716C] dark:text-zinc-400 mt-0.5">
                        {mentionedCount} of {totalEngines} engines cited or referenced your business.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                          {visibilityScore}%
                        </span>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#78716C] dark:text-zinc-400">
                          Visibility
                        </span>
                      </div>

                      <button
                        onClick={handleGenerateAutoFix}
                        disabled={autoFixLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3.5 py-2 text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {autoFixLoading ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Generating Fix…
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            ⚡ 1-Click Auto-Fix Gaps
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 2 Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredResults.map((res: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-[#E8DFD3] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4 space-y-2.5 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1C1917] dark:text-white">
                            {res.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                res.mentioned
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                            >
                              {res.mentioned ? "✓ Mentioned" : "✗ Not Found"}
                            </span>
                            <span className="text-[10px] text-[#78716C] dark:text-zinc-400 font-mono">
                              {(res.latencyMs / 1000).toFixed(1)}s
                            </span>
                          </div>
                        </div>

                        <div className="rounded-lg bg-white dark:bg-zinc-900 border border-[#EBE3D5] dark:border-zinc-800/80 p-3 max-h-48 overflow-y-auto">
                          <p className="text-[11px] leading-relaxed text-[#57534E] dark:text-zinc-300 whitespace-pre-wrap">
                            {res.answer}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ⚡ 1-Click Auto-Fix Solution Modal */}
      {autoFixModalOpen && autoFixData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Auto-Fix AI Visibility Package
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#1C1917] dark:text-white mt-1">
                  Bridge OpenAI & Google Gemini Gaps for &ldquo;{autoFixData.businessName}&rdquo;
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  Deploy these structured entity assets to ensure OpenAI ChatGPT and Google Gemini index and cite your business.
                </p>
              </div>
              <button
                onClick={() => setAutoFixModalOpen(false)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white p-1 rounded-lg hover:bg-[#F2E8DC]/60 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E8DFD3] dark:border-zinc-800 pb-2">
              <button
                onClick={() => setAutoFixActiveTab("schema")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  autoFixActiveTab === "schema"
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs"
                    : "text-[#78716C] hover:bg-[#F4EEE5] dark:hover:bg-zinc-800"
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                Schema.org JSON-LD
              </button>

              <button
                onClick={() => setAutoFixActiveTab("llms")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  autoFixActiveTab === "llms"
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs"
                    : "text-[#78716C] hover:bg-[#F4EEE5] dark:hover:bg-zinc-800"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                /llms.txt
              </button>

              <button
                onClick={() => setAutoFixActiveTab("robots")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  autoFixActiveTab === "robots"
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs"
                    : "text-[#78716C] hover:bg-[#F4EEE5] dark:hover:bg-zinc-800"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                Robots.txt Crawler Rules
              </button>

              <button
                onClick={() => setAutoFixActiveTab("aeo")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  autoFixActiveTab === "aeo"
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs"
                    : "text-[#78716C] hover:bg-[#F4EEE5] dark:hover:bg-zinc-800"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                AEO Answer Block
              </button>

              <button
                onClick={() => setAutoFixActiveTab("citation")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  autoFixActiveTab === "citation"
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs"
                    : "text-[#78716C] hover:bg-[#F4EEE5] dark:hover:bg-zinc-800"
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                AI Citation Pitch
              </button>
            </div>

            {/* Tab 1: Schema.org */}
            {autoFixActiveTab === "schema" && autoFixData.schemaFix && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#78716C] dark:text-zinc-400">
                    {autoFixData.schemaFix.instructions}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard("schema", autoFixData.schemaFix.code)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {copiedKey === "schema" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedKey === "schema" ? "Copied!" : "Copy Schema"}
                    </button>
                    <button
                      onClick={() => downloadFile("schema.json", autoFixData.schemaFix.code)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#8A5333] dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </div>
                </div>
                <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800 max-h-96 overflow-y-auto">
                  <pre className="text-[11px] font-mono text-zinc-200 leading-relaxed whitespace-pre">
                    {autoFixData.schemaFix.code}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 2: llms.txt */}
            {autoFixActiveTab === "llms" && autoFixData.llmsFix && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#78716C] dark:text-zinc-400">
                    {autoFixData.llmsFix.instructions}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard("llms", autoFixData.llmsFix.code)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {copiedKey === "llms" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedKey === "llms" ? "Copied!" : "Copy Content"}
                    </button>
                    <button
                      onClick={() => downloadFile("llms.txt", autoFixData.llmsFix.code)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#8A5333] dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download llms.txt
                    </button>
                  </div>
                </div>
                <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800 max-h-96 overflow-y-auto">
                  <pre className="text-[11px] font-mono text-emerald-300 leading-relaxed whitespace-pre">
                    {autoFixData.llmsFix.code}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 3: Robots.txt */}
            {autoFixActiveTab === "robots" && autoFixData.robotsFix && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#78716C] dark:text-zinc-400">
                    Ensure AI search bots (GPTBot, Google-Extended, OAI-SearchBot) can crawl your public pages.
                  </p>
                  <button
                    onClick={() => copyToClipboard("robots", autoFixData.robotsFix.code)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {copiedKey === "robots" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === "robots" ? "Copied!" : "Copy Robots.txt"}
                  </button>
                </div>
                <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800 max-h-96 overflow-y-auto">
                  <pre className="text-[11px] font-mono text-zinc-300 leading-relaxed whitespace-pre">
                    {autoFixData.robotsFix.code}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 4: AEO Snippet */}
            {autoFixActiveTab === "aeo" && autoFixData.aeoFix && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#78716C] dark:text-zinc-400">
                    Embed this concise 45-word blockquote into your homepage or About page for direct LLM quote extraction.
                  </p>
                  <button
                    onClick={() => copyToClipboard("aeo", autoFixData.aeoFix.code)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {copiedKey === "aeo" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === "aeo" ? "Copied!" : "Copy Snippet"}
                  </button>
                </div>
                <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800 max-h-96 overflow-y-auto">
                  <pre className="text-[11px] font-mono text-amber-200 leading-relaxed whitespace-pre-wrap">
                    {autoFixData.aeoFix.code}
                  </pre>
                </div>
              </div>
            )}

            {/* Tab 5: Citation Pitch */}
            {autoFixActiveTab === "citation" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#78716C] dark:text-zinc-400">
                    AI-engineered citation strategy generated via OpenRouter for high-authority third-party indexing.
                  </p>
                  {autoFixData.aiEntityPitch && (
                    <button
                      onClick={() => copyToClipboard("citation", autoFixData.aiEntityPitch)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {copiedKey === "citation" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedKey === "citation" ? "Copied!" : "Copy Citation Guide"}
                    </button>
                  )}
                </div>
                <div className="rounded-xl bg-zinc-950 p-4 border border-zinc-800 max-h-96 overflow-y-auto">
                  <pre className="text-[11px] font-mono text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {autoFixData.aiEntityPitch || "Generating entity pitch..."}
                  </pre>
                </div>
              </div>
            )}

            {/* Bottom notification */}
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Actionable recommendations have also been saved to your AIVisibility SEO workspace.</span>
              </div>
              <button
                onClick={() => setAutoFixModalOpen(false)}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}