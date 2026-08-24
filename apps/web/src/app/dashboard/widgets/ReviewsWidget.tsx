"use client";

import { useState, useEffect } from "react";
import { Star, Sparkles, Check, Send, ThumbsUp } from "lucide-react";

interface ReviewsWidgetProps {
  data?: any;
  onRemove?: () => void;
}

export function ReviewsWidget({ data, onRemove }: ReviewsWidgetProps) {
  const bName = data?.businessName || "Your Business";
  const defaultReviews = [
    {
      id: "1",
      author: "Alex P.",
      rating: 5,
      time: "2 days ago",
      comment: `Outstanding service from ${bName}! Staff was remarkably professional and fast.`,
      replied: true,
      reply: `Thank you Alex! We are thrilled to provide you with top quality service.`,
    },
    {
      id: "2",
      author: "Maria G.",
      rating: 5,
      time: "4 days ago",
      comment: `The online booking and communication were super quick. Highly recommend ${bName}.`,
      replied: true,
      reply: `Thanks Maria! We appreciate your trust in our team.`,
    },
    {
      id: "3",
      author: "Chris D.",
      rating: 4,
      time: "1 week ago",
      comment: `Great experience overall, high quality results and smooth process.`,
      replied: false,
      aiDraft: `Hi Chris, thank you for your wonderful review! We appreciate your feedback and look forward to serving you again.`,
    },
  ];

  const [reviews, setReviews] = useState<any[]>(data?.recentReviews || defaultReviews);
  const [answeringId, setAnsweringId] = useState<string | null>(null);

  useEffect(() => {
    if (data?.recentReviews && data.recentReviews.length > 0) {
      setReviews(data.recentReviews);
    }
  }, [data?.recentReviews]);

  const handleSendReply = (id: string, replyText: string) => {
    setReviews((prev: any[]) =>
      prev.map((r) =>
        r.id === id ? { ...r, replied: true, reply: replyText, aiDraft: undefined } : r
      )
    );
    setAnsweringId(null);
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Star className="h-4 w-4 fill-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Google Reviews & AI Reply
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                Live Auto-Responder
              </span>
            </h3>
            <p className="text-xs text-slate-400">Manage reputation & 1-click AI approvals</p>
          </div>
        </div>
        {onRemove && (
          <button onClick={onRemove} className="text-xs text-slate-500 hover:text-red-400 transition">
            Remove
          </button>
        )}
      </div>

      {/* Review List */}
      <div className="flex-1 overflow-y-auto space-y-3 py-3 divide-y divide-slate-800/40">
        {reviews.map((r: any, idx: number) => (
          <div key={r.id || idx} className="pt-3 first:pt-0 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">{r.author}</span>
                <div className="flex text-amber-400">
                  {Array.from({ length: r.rating || 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400" />
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-slate-500">{r.time}</span>
            </div>

            <p className="text-xs text-slate-300 italic">"{r.comment}"</p>

            {/* Replied Badge or AI Draft Box */}
            {r.replied ? (
              <div className="rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/50 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px] mb-1">
                  <Check className="h-3 w-3" /> Business Reply:
                </div>
                <p className="text-slate-400 text-[11px]">{r.reply}</p>
              </div>
            ) : (
              <div className="rounded-lg bg-indigo-950/40 p-2.5 border border-indigo-500/30 text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-indigo-400 font-bold">
                    <Sparkles className="h-3 w-3" /> AI Suggested Response
                  </span>
                  <span className="text-[10px] text-slate-400">Ready to publish</span>
                </div>
                <p className="text-slate-300 text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800">
                  {r.aiDraft}
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleSendReply(r.id || idx.toString(), r.aiDraft)}
                    className="flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-500 transition"
                  >
                    <Send className="h-2.5 w-2.5" /> Approve & Post to Google
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
