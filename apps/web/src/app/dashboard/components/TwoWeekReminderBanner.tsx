"use client";

import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  X,
  Mail,
  Flame,
  Award,
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
  };
  comparison: {
    overallDelta: number;
    websiteDelta: number;
    gbpDelta: number;
    aiDelta: number;
    socialDelta: number;
    resolvedRecommendationsCount: number;
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

interface TwoWeekReminderBannerProps {
  data: ComparisonData | null;
  onOpenComparison: () => void;
  onRefresh?: () => void;
}

export function TwoWeekReminderBanner({
  data,
  onOpenComparison,
  onRefresh,
}: TwoWeekReminderBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  if (!data || dismissed || data.milestone.reminderDismissed) {
    return null;
  }

  const { milestone, comparison, initialSnapshot, currentPresence, business } = data;
  const isDue = milestone.isDue;
  const delta = comparison.overallDelta;
  const deltaPositive = delta >= 0;

  async function handleDismiss() {
    setDismissed(true);
    try {
      await apiFetch("/business/snapshot/dismiss-reminder", { method: "POST" });
      onRefresh?.();
    } catch {
      // Ignored
    }
  }

  async function handleSendEmail(e: React.MouseEvent) {
    e.stopPropagation();
    setEmailSending(true);
    try {
      await apiFetch("/business/snapshot/send-reminder-email", { method: "POST" });
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 4000);
      onRefresh?.();
    } catch (err: any) {
      alert("Failed to send reminder email: " + (err.message || "Unknown error"));
    } finally {
      setEmailSending(false);
    }
  }

  // 1. Milestone Reached (>= 14 Days) — Celebratory Banner
  if (isDue) {
    return (
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-blue-500/40 bg-gradient-to-r from-slate-900 via-indigo-950/80 to-blue-950/70 p-5 shadow-xl shadow-blue-950/30 backdrop-blur-xl transition-all">
        {/* Ambient glow accent */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/25">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-amber-300 border border-amber-500/30">
                  🎉 2-Week Milestone Reached
                </span>
                <span className="text-xs text-slate-400">
                  Registered {milestone.daysSinceRegistration} days ago
                </span>
              </div>
              <h3 className="mt-1 text-base font-bold text-white">
                Your 14-Day Online Presence Comparison is Ready
              </h3>
              <p className="mt-0.5 text-xs text-slate-300">
                Compare your Day 1 baseline score ({initialSnapshot.overallScore}/100) with your actual presence today ({currentPresence.overallScore}/100).
                {delta !== 0 && (
                  <span className={`ml-1.5 font-semibold ${deltaPositive ? "text-emerald-400" : "text-rose-400"}`}>
                    {deltaPositive ? `+${delta}` : delta} pts overall change
                  </span>
                )}
                {comparison.resolvedRecommendationsCount > 0 && (
                  <span className="ml-1.5 text-emerald-300 font-medium">
                    • {comparison.resolvedRecommendationsCount} issues fixed!
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 md:shrink-0">
            <button
              onClick={handleSendEmail}
              disabled={emailSending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700/80 hover:text-white disabled:opacity-50"
              title="Email me the 2-week comparison digest"
            >
              <Mail className="h-3.5 w-3.5 text-blue-400" />
              {emailSuccess ? "Email Sent!" : emailSending ? "Sending..." : "Email Digest"}
            </button>

            <button
              onClick={onOpenComparison}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-500 hover:to-indigo-500"
            >
              <span>Compare Baseline vs Now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={handleDismiss}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
              title="Dismiss reminder"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Milestone Pending (< 14 Days) — Progress Tracker Card
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-indigo-950/40 p-4 shadow-lg backdrop-blur-xl transition-all">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-950 border border-indigo-500/30 text-indigo-400">
            <Clock className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-300">
                14-Day Growth Milestone: Day {milestone.daysSinceRegistration} of 14
              </span>
              <span className="text-[11px] text-slate-400">
                ({milestone.daysRemaining} {milestone.daysRemaining === 1 ? "day" : "days"} until official 2-week checkpoint)
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Registration baseline recorded at <strong className="text-white">{initialSnapshot.overallScore}/100</strong>. Live presence is currently at{" "}
              <strong className="text-blue-400">{currentPresence.overallScore}/100</strong> ({deltaPositive ? `+${delta}` : delta} pts).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:shrink-0">
          {/* Progress gauge */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-800 border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 rounded-full"
                style={{ width: `${milestone.progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400">{milestone.progressPercent}% to milestone</span>
          </div>

          <button
            onClick={onOpenComparison}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-950/60 px-3 py-1.5 text-xs font-medium text-indigo-200 transition hover:bg-indigo-900/60 hover:text-white"
          >
            <span>Preview Baseline Diff</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
