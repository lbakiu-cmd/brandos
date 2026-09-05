"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Review = {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
  aiReplyDraft: string | null;
  replyText: string | null;
  repliedAt: string | null;
  reviewDate: string;
};

type ReviewData = {
  business: any;
  stats: {
    totalReviews: number;
    repliedCount: number;
    pendingCount: number;
    averageRating: number;
    responseRatePercent: number;
  };
  reviews: Review[];
};

export default function ReviewsPage() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch<ReviewData>("/reviews");
      setData(res);
      const initialDrafts: Record<string, string> = {};
      res.reviews.forEach((r) => {
        if (r.aiReplyDraft) initialDrafts[r.id] = r.aiReplyDraft;
        else if (r.replyText) initialDrafts[r.id] = r.replyText;
      });
      setDrafts(initialDrafts);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleGenerateReply(reviewId: string) {
    setGeneratingId(reviewId);
    try {
      const updated = await apiFetch<Review>(`/reviews/${reviewId}/generate-reply`, { method: "POST" });
      setDrafts((prev) => ({ ...prev, [reviewId]: updated.aiReplyDraft || "" }));
      await refresh();
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleSaveReply(reviewId: string) {
    const text = drafts[reviewId];
    if (!text || !text.trim()) return;
    setSavingId(reviewId);
    try {
      await apiFetch(`/reviews/${reviewId}/reply`, {
        method: "PATCH",
        body: JSON.stringify({ replyText: text }),
      });
      await refresh();
    } finally {
      setSavingId(null);
    }
  }

  function handleCopy(reviewId: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(reviewId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const reviews = data?.reviews ?? [];
  const filtered = reviews.filter((r) => {
    if (filter === "ALL") return true;
    if (filter === "5_STAR") return r.rating === 5;
    if (filter === "CRITICAL") return r.rating <= 3;
    if (filter === "UNANSWERED") return !r.replyText;
    if (filter === "ANSWERED") return !!r.replyText;
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">AI Review Responder & Reputation</h1>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-bold text-emerald-400">
              Google Maps SEO
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Maintain an 80%+ response rate and boost Google Local ranking with star-aware, keyword-optimized AI replies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800">
            ← Dashboard
          </Link>
          <Link href="/dashboard/audit" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800">
            Google Profile Audit
          </Link>
        </div>
      </header>

      {/* Stats Summary Bar */}
      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <span className="text-xs text-slate-400">Average Rating</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">
              {data?.stats?.averageRating ? `${data.stats.averageRating}★` : "—"}
            </span>
            <span className="text-xs text-slate-500">Google Verified</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <span className="text-xs text-slate-400">Response Rate</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">
              {data?.stats?.responseRatePercent ? `${data.stats.responseRatePercent}%` : "—"}
            </span>
            <span className="text-xs text-slate-500">Target: 80%+</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <span className="text-xs text-slate-400">Total Reviews</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {data?.stats.totalReviews ?? 0}
            </span>
            <span className="text-xs text-slate-500">Managed</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <span className="text-xs text-slate-400">Unanswered Reviews</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400">
              {data?.stats.pendingCount ?? 0}
            </span>
            <span className="text-xs text-slate-500">Action required</span>
          </div>
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 text-xs font-semibold">
        {[
          { id: "ALL", label: "All Reviews" },
          { id: "UNANSWERED", label: "⚡ Needs Reply" },
          { id: "5_STAR", label: "★★★★★ 5-Star" },
          { id: "CRITICAL", label: "⚠️ 1–3 Star Feedback" },
          { id: "ANSWERED", label: "✔ Replied" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`rounded-xl px-4 py-2 transition ${
              filter === tab.id
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <section className="space-y-4">
        {filtered.map((rev) => (
          <div
            key={rev.id}
            className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl space-y-4"
          >
            {/* Top Review Row */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-400">
                    {rev.authorName.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{rev.authorName}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-400 font-bold">
                        {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(rev.reviewDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
                {rev.comment && (
                  <p className="mt-3 text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    "{rev.comment}"
                  </p>
                )}
              </div>

              <div>
                {rev.replyText ? (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400">
                    ✔ Replied
                  </span>
                ) : (
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[10px] font-bold text-rose-400">
                    Awaiting Reply
                  </span>
                )}
              </div>
            </div>

            {/* AI Reply Generator Area */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                  {rev.replyText ? "Published Business Response" : "AI Response Generator"}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateReply(rev.id)}
                    disabled={generatingId === rev.id}
                    className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/20 transition disabled:opacity-50"
                  >
                    <span>⚡</span>
                    <span>{generatingId === rev.id ? "Drafting…" : "Draft with AI"}</span>
                  </button>

                  {drafts[rev.id] && (
                    <button
                      onClick={() => handleCopy(rev.id, drafts[rev.id])}
                      className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white"
                    >
                      {copiedId === rev.id ? "✔ Copied" : "📋 Copy"}
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={drafts[rev.id] || ""}
                onChange={(e) => setDrafts({ ...drafts, [rev.id]: e.target.value })}
                placeholder="Click 'Draft with AI' to generate an optimized response, or type directly here…"
                rows={3}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />

              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleSaveReply(rev.id)}
                  disabled={savingId === rev.id || !drafts[rev.id]?.trim()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 transition disabled:opacity-50"
                >
                  {savingId === rev.id ? "Saving…" : "Save & Post Response"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400 space-y-3">
            <p className="text-sm font-semibold text-white">No Google Reviews Found</p>
            <p className="text-xs max-w-sm mx-auto">Connect your Google Business Profile in Integrations to start monitoring and auto-replying to customer feedback.</p>
            <div className="pt-2">
              <Link href="/dashboard/integrations" className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500">
                Connect Google Business Profile
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
