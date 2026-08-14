"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Publication = {
  id: string;
  platform: string;
  status: string;
  externalUrl: string | null;
  socialAccount: { displayName: string | null };
};

type Post = {
  id: string;
  caption: string | null;
  status: string;
  scheduledFor: string | null;
  publications: Publication[];
};

export default function ContentPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const list = await apiFetch<Post[]>("/posts");
    setPosts(list);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [refresh]);

  async function submit(scheduledFor?: string) {
    if (!caption.trim()) return;
    setBusy(true);
    try {
      await apiFetch("/posts", {
        method: "POST",
        body: JSON.stringify({ caption: caption.trim(), scheduledFor }),
      });
      setCaption("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const chip = (s: string) =>
    s === "PUBLISHED"
      ? "bg-green-600"
      : s === "FAILED"
        ? "bg-red-600"
        : s === "SCHEDULED"
          ? "bg-amber-600"
          : "bg-slate-600";

  return (
    <main className="min-h-screen bg-slate-900 p-8 text-white">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-blue-400">Content Studio</h1>
        <div className="flex gap-3 text-sm">
          <Link href="/dashboard" className="rounded-lg bg-slate-800 px-4 py-2 hover:bg-slate-700">Dashboard</Link>
          <Link href="/dashboard/inbox" className="rounded-lg bg-slate-800 px-4 py-2 hover:bg-slate-700">Inbox</Link>
        </div>
      </header>

      <div className="mb-8 rounded-2xl bg-slate-800 p-6">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write your post caption…"
          rows={3}
          className="mb-4 w-full rounded-lg bg-slate-700 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-3">
          <button
            onClick={() => submit()}
            disabled={busy || !caption.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Publish now
          </button>
          <button
            onClick={() => submit(new Date(Date.now() + 10_000).toISOString())}
            disabled={busy || !caption.trim()}
            className="rounded-lg bg-amber-600 px-5 py-2 text-sm hover:bg-amber-700 disabled:opacity-50"
          >
            Schedule in 10s
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {posts.map((p) => (
          <div key={p.id} className="rounded-2xl bg-slate-800 p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-slate-300">{p.caption}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${chip(p.status)}`}>
                {p.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.publications.map((pub) => (
                <span key={pub.id} className="rounded-full bg-slate-700 px-3 py-1 text-xs">
                  {pub.socialAccount.displayName}: {pub.status}
                </span>
              ))}
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="text-slate-500">No posts yet. Write your first one above!</p>
        )}
      </div>
    </main>
  );
}