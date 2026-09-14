"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Sparkles, Check, Send, MessageSquare } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeLabel } from "@/lib/timeRanges";

interface ReviewsWidgetProps {
  data?: any;
  onRemove?: () => void;
  initialTimeRange?: TimeRangeKey;
}

export function ReviewsWidget({ data, onRemove, initialTimeRange = "7D" }: ReviewsWidgetProps) {
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(initialTimeRange);

  useEffect(() => {
    if (initialTimeRange) {
      setTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  const isConnected = Boolean(data && (data.recentReviews?.length > 0 || data.totalReviews > 0 || data.connected));

  const rawReviews = data?.recentReviews || [];
  const maxDays =
    timeRange === "7D" ? 7 : timeRange === "14D" ? 14 : timeRange === "1M" ? 30 : timeRange === "3M" ? 90 : 365;

  const filteredReviews = rawReviews.filter((r: any) => (r.daysAgo !== undefined ? r.daysAgo <= maxDays : true));
  const displayedReviews = filteredReviews.length > 0 ? filteredReviews : rawReviews.slice(0, 2);

  // Hooks must run unconditionally on every render (Rules of Hooks) -- declared
  // here, before the early return below, rather than after it.
  const [reviews, setReviews] = useState<any[]>(displayedReviews);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    let list = displayedReviews;
    try {
      const storedReplies = JSON.parse(localStorage.getItem("brandos_approved_reviews") || "{}");
      list = list.map((r: any, idx: number) => {
        const authorKey = (r.author || "").toLowerCase();
        const idKey = r.id || idx.toString();
        const stored = storedReplies[idKey] || (authorKey && storedReplies[authorKey]);
        if (stored) {
          return {
            ...r,
            replied: true,
            reply: stored,
            aiDraft: undefined,
          };
        }
        return r;
      });
    } catch {}
    setReviews(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, data?.recentReviews]);

  if (!isConnected) {
    return (
      <div className="flex flex-col justify-between h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Star className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Google Reviews & AI Auto-Reply</h3>
              <p className="text-xs text-slate-400">Reputation Management</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Not Connected
          </span>
        </div>

        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MessageSquare className="h-5 w-5" />
          </div>
          <p className="text-xs text-slate-300 font-medium mb-1">No Google Reviews connected yet</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-4">
            Connect your Google Business listing to monitor new reviews in real time and generate instant AI replies.
          </p>
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition"
          >
            <Star className="h-3.5 w-3.5" />
            <span>Connect Reviews</span>
          </Link>
        </div>

        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>Google Business Profile API</span>
          {onRemove && (
            <button onClick={onRemove} className="text-slate-500 hover:text-red-400 transition">
              Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleSendReply = async (id: string, replyText: string, author?: string) => {
    setApprovingId(id);

    try {
      const stored = JSON.parse(localStorage.getItem("brandos_approved_reviews") || "{}");
      stored[id] = replyText;
      if (author) stored[author.toLowerCase()] = replyText;
      localStorage.setItem("brandos_approved_reviews", JSON.stringify(stored));
    } catch {}

    setReviews((prev: any[]) =>
      prev.map((r, i) =>
        r.id === id || i.toString() === id || (author && r.author === author)
          ? { ...r, replied: true, reply: replyText, aiDraft: undefined }
          : r
      )
    );

    try {
      const targetId = id || author || "review";
      await apiFetch(`/reviews/${encodeURIComponent(targetId)}/reply`, {
        method: "PATCH",
        body: JSON.stringify({ replyText }),
      });
    } catch (err) {
      console.error("Failed to approve review on server:", err);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Star className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate">
              Google Reviews & AI Auto-Reply
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 shrink-0">
                Auto-Pilot
              </span>
            </h3>
            <p className="text-xs text-slate-400 truncate">
              Customer sentiment for <span className="text-slate-300 font-medium">{getTimeRangeLabel(timeRange)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <TimeRangeFilter
            value={timeRange}
            onChange={setTimeRange}
            variant="compact"
            accentColor="emerald"
          />

          {onRemove && (
            <button onClick={onRemove} className="text-xs text-slate-500 hover:text-red-400 transition ml-1">
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Review List */}
      <div className="flex-1 space-y-3 py-3 overflow-y-auto max-h-[340px] pr-1">
        {reviews.length > 0 ? (
          reviews.map((r, idx) => (
            <div key={r.id || idx} className="rounded-xl bg-slate-950/60 p-4 border border-slate-800/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-white">
                    {r.author ? r.author[0] : "C"}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-white">{r.author || "Customer"}</span>
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: r.rating || 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-slate-400">{r.time}</span>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 italic">&ldquo;{r.comment}&rdquo;</p>

              {r.replied ? (
                <div className="rounded-xl bg-emerald-950/30 border border-emerald-800/40 p-3 text-xs sm:text-sm text-emerald-300">
                  <span className="font-bold flex items-center gap-1.5 mb-1">
                    <Check className="h-3.5 w-3.5" /> Responded:
                  </span>
                  {r.reply}
                </div>
              ) : (
                <div className="rounded-xl bg-indigo-950/40 border border-indigo-800/50 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> AI Drafted Response:
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200">{r.aiDraft}</p>
                  <button
                    onClick={() => handleSendReply(r.id || idx.toString(), r.aiDraft || "Thank you for your feedback!", r.author)}
                    disabled={approvingId === (r.id || idx.toString())}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{approvingId === (r.id || idx.toString()) ? "Publishing to Google..." : "Approve & Post to Google"}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-xs sm:text-sm text-slate-500">
            No reviews received in this time range.
          </div>
        )}
      </div>

      {/* Small business tip */}
      <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-1.5 text-xs text-slate-400">
        <span>💡 <strong>Review Impact:</strong> Replying to reviews within 24 hours increases Google Business Profile conversion by 16%.</span>
      </div>
    </div>
  );
}
