"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  TrendingUp,
  Award,
  Globe,
  MapPin,
  Bot,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Mail,
  RefreshCw,
  Camera,
  Sparkles,
  Calendar,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type ComparisonData = {
  business: {
    id: string;
    name: string;
    website: string | null;
    city: string | null;
    industry: string | null;
  };
  initialSnapshot: {
    id: string;
    capturedAt: string;
    overallScore: number;
    grade: string;
    gradeLabel: string;
    pillars: {
      website: { score: number; status: string };
      gbp: { score: number; status: string };
      aiVisibility: { score: number; status: string };
      social: { score: number; status: string };
    };
    metrics?: any;
  };
  currentPresence: {
    overallScore: number;
    grade: string;
    gradeLabel: string;
    pillars: {
      website: { score: number; status: string };
      gbp: { score: number; status: string };
      aiVisibility: { score: number; status: string };
      social: { score: number; status: string };
    };
    latestWebScore?: number;
    latestGbpScore?: number;
    latestAiScore?: number;
    latestSocialScore?: number;
    latestAuditDate?: string;
  };
  comparison: {
    overallDelta: number;
    websiteDelta: number;
    gbpDelta: number;
    aiDelta: number;
    socialDelta: number;
    resolvedRecommendationsCount: number;
    resolvedRecommendations: Array<{
      id: string;
      title: string;
      category: string | null;
      priority: string;
      expectedImpact: number;
    }>;
    openRecommendationsCount: number;
  };
  milestone: {
    daysSinceRegistration: number;
    daysRemaining: number;
    progressPercent: number;
    isDue: boolean;
    reminderDate: string;
    reminderSentAt: string | null;
    reminderDismissed: boolean;
  };
};

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ComparisonData | null;
  onRefresh?: () => void;
}

export function ComparisonModal({
  isOpen,
  onClose,
  data,
  onRefresh,
}: ComparisonModalProps) {
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [savingCheckpoint, setSavingCheckpoint] = useState(false);
  const [checkpointSaved, setCheckpointSaved] = useState(false);

  if (!isOpen || !data) return null;

  const { business, initialSnapshot, currentPresence, comparison, milestone } = data;

  const delta = comparison.overallDelta;
  const deltaPositive = delta >= 0;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const getScoreColor = (score: number) =>
    score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400";

  const getScoreBg = (score: number) =>
    score >= 75 ? "bg-emerald-500/10 border-emerald-500/30" : score >= 50 ? "bg-amber-500/10 border-amber-500/30" : "bg-rose-500/10 border-rose-500/30";

  async function handleSendEmail() {
    setEmailSending(true);
    try {
      await apiFetch("/business/snapshot/send-reminder-email", { method: "POST" });
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 4000);
      onRefresh?.();
    } catch (err: any) {
      alert("Failed to send email: " + (err.message || "Unknown error"));
    } finally {
      setEmailSending(false);
    }
  }

  async function handleSaveCheckpoint() {
    setSavingCheckpoint(true);
    try {
      await apiFetch("/business/snapshot/checkpoint", {
        method: "POST",
        body: JSON.stringify({ type: "TWO_WEEK_CHECKPOINT" }),
      });
      setCheckpointSaved(true);
      setTimeout(() => setCheckpointSaved(false), 4000);
      onRefresh?.();
    } catch (err: any) {
      alert("Failed to save checkpoint: " + (err.message || "Unknown error"));
    } finally {
      setSavingCheckpoint(false);
    }
  }

  const pillars = [
    {
      name: "Technical SEO & Website",
      icon: Globe,
      initial: initialSnapshot.pillars.website.score,
      current: currentPresence.pillars.website.score,
      delta: comparison.websiteDelta,
      weight: "30% weight",
      desc: "Speed, Schema.org JSON-LD, /llms.txt, mobile & metadata readiness",
    },
    {
      name: "Google Business & Maps",
      icon: MapPin,
      initial: initialSnapshot.pillars.gbp.score,
      current: currentPresence.pillars.gbp.score,
      delta: comparison.gbpDelta,
      weight: "25% weight",
      desc: "NAP consistency, profile completeness, local discovery & reviews",
    },
    {
      name: "AI Discoverability (AEO)",
      icon: Bot,
      initial: initialSnapshot.pillars.aiVisibility.score,
      current: currentPresence.pillars.aiVisibility.score,
      delta: comparison.aiDelta,
      weight: "25% weight",
      desc: "Citation in ChatGPT, Gemini, Perplexity & Google AI Overviews",
    },
    {
      name: "Social & Local Authority",
      icon: Layers,
      initial: initialSnapshot.pillars.social.score,
      current: currentPresence.pillars.social.score,
      delta: comparison.socialDelta,
      weight: "20% weight",
      desc: "Social channels connected, brand activity, backlinks & authority",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-8">
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Online Presence Comparison
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal border border-slate-700">
                  {business.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Day 1 Registration Baseline ({formatDate(initialSnapshot.capturedAt)}) vs Today ({milestone.daysSinceRegistration} days elapsed)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          {/* Executive Side-by-Side Hero Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {/* Left Card: Day 1 Baseline */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Day 1 Baseline
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(initialSnapshot.capturedAt)}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-300">
                    {initialSnapshot.overallScore}
                  </span>
                  <span className="text-sm text-slate-400">/ 100</span>
                </div>
                <p className="mt-1 text-xs text-slate-400 font-medium">
                  Grade {initialSnapshot.grade} • {initialSnapshot.gradeLabel}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                Initial registration baseline status
              </div>
            </div>

            {/* Middle Badge: Growth Delta */}
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-950/50 to-indigo-950/40 p-5 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">
                Brand Score Delta
              </span>
              <div
                className={`flex items-center gap-1.5 text-3xl font-black ${
                  deltaPositive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                <TrendingUp className="h-6 w-6" />
                <span>{deltaPositive ? `+${delta}` : delta} pts</span>
              </div>
              <p className="mt-2 text-xs text-slate-300">
                {deltaPositive
                  ? `Your online footprint improved by ${delta} points across AI and search channels!`
                  : "Continuous optimization recommended to maintain high visibility."}
              </p>
              <div className="mt-3 rounded-full bg-blue-500/20 px-3 py-1 text-[11px] font-semibold text-blue-200 border border-blue-500/30">
                {milestone.daysSinceRegistration} Days Elapsed
              </div>
            </div>

            {/* Right Card: Actual Presence Today */}
            <div className="rounded-2xl border border-blue-500/40 bg-gradient-to-br from-slate-950 to-blue-950/40 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                    Current Online Presence
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Live State
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-extrabold ${getScoreColor(currentPresence.overallScore)}`}>
                    {currentPresence.overallScore}
                  </span>
                  <span className="text-sm text-slate-400">/ 100</span>
                </div>
                <p className="mt-1 text-xs text-slate-200 font-medium">
                  Grade {currentPresence.grade} • {currentPresence.gradeLabel}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-300 flex items-center justify-between">
                <span>4-Pillar Composite</span>
                <span className="text-emerald-400 font-medium">Updated Today</span>
              </div>
            </div>
          </div>

          {/* 4 Pillars Detailed Comparison */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
                4-Pillar Online Presence Breakdown
              </h3>
              <span className="text-xs text-slate-400">Day 1 vs Actual</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {pillars.map((p) => {
                const Icon = p.icon;
                const pDeltaPos = p.delta >= 0;
                return (
                  <div
                    key={p.name}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-blue-400">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{p.name}</h4>
                          <span className="text-[10px] text-slate-400">{p.weight}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400">{p.initial}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className={`font-bold ${getScoreColor(p.current)}`}>{p.current}</span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold ${
                            pDeltaPos ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {pDeltaPos ? `+${p.delta}` : p.delta} pts
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] text-slate-400">{p.desc}</p>

                    {/* Visual Multi-Bar Gauge */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Baseline: {p.initial}%</span>
                        <span className="text-slate-200">Current: {p.current}%</span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="absolute h-full bg-slate-600 rounded-full opacity-40"
                          style={{ width: `${p.initial}%` }}
                        />
                        <div
                          className="absolute h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${p.current}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resolved Issues & Key Wins */}
          {comparison.resolvedRecommendations.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
              <h3 className="text-xs font-bold text-emerald-300 flex items-center gap-2 mb-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Optimizations & Fixes Resolved Since Day 1 ({comparison.resolvedRecommendationsCount} completed)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {comparison.resolvedRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center gap-2 rounded-xl bg-slate-900/80 border border-emerald-500/20 px-3 py-2 text-xs text-slate-200"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{rec.title}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-emerald-400 font-semibold">
                      +{rec.expectedImpact} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remaining Open Gaps */}
          {comparison.openRecommendationsCount > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {comparison.openRecommendationsCount} Additional High-Impact Growth Fixes Available
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Apply 1-click code fixes to push your Brand Score above 90 (Grade A+).
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/audit"
                onClick={onClose}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 px-3.5 py-1.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-600 hover:text-white"
              >
                <span>View Action Plan</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 bg-slate-950/60 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendEmail}
              disabled={emailSending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
            >
              <Mail className="h-3.5 w-3.5 text-blue-400" />
              {emailSuccess ? "Email Dispatched!" : emailSending ? "Sending..." : "Email Comparison Report"}
            </button>

            <button
              onClick={handleSaveCheckpoint}
              disabled={savingCheckpoint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5 text-indigo-400" />
              {checkpointSaved ? "Checkpoint Saved!" : savingCheckpoint ? "Saving..." : "Save Checkpoint Snapshot"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              Close
            </button>
            <Link
              href="/dashboard/audit"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-500 hover:to-indigo-500"
            >
              <span>Run Deep Audit Scan</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
