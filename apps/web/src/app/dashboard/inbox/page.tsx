"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Conversation = {
  id: string;
  participantName: string | null;
  unreadCount: number;
  socialAccount: { platform: string; displayName: string | null };
};

type Message = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  body: string | null;
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshConversations = useCallback(async () => {
    const list = await apiFetch<Conversation[]>("/inbox");
    setConversations(list);
  }, []);

  useEffect(() => {
    refreshConversations().catch(() => {});
  }, [refreshConversations]);

  async function openConversation(c: Conversation) {
    setSelected(c);
    const msgs = await apiFetch<Message[]>(`/inbox/${c.id}/messages`);
    setMessages(msgs);
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/inbox/${selected.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ text: replyText.trim() }),
      });
      setReplyText("");
      const msgs = await apiFetch<Message[]>(`/inbox/${selected.id}/messages`);
      setMessages(msgs);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex h-screen flex-col bg-slate-900 text-white">
      <header className="flex items-center justify-between border-b border-slate-800 p-4">
        <h1 className="text-2xl font-bold text-blue-400">Unified Inbox</h1>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 overflow-y-auto border-r border-slate-800">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-slate-400">
              No conversations yet. Connect your channels in Integrations to receive incoming customer messages.
            </p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c)}
              className={`block w-full p-4 text-left hover:bg-slate-800 ${
                selected?.id === c.id ? "bg-slate-800" : ""
              }`}
            >
              <p className="font-semibold">{c.participantName ?? "Unknown"}</p>
              <p className="text-xs text-slate-400">
                {c.socialAccount?.displayName} · {c.unreadCount} unread
              </p>
            </button>
          ))}
        </aside>

        <section className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto p-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-md rounded-2xl p-3 text-sm ${
                  m.direction === "INBOUND" ? "bg-slate-800" : "ml-auto bg-blue-600"
                }`}
              >
                {m.body}
              </div>
            ))}
            {selected === null && (
              <p className="text-slate-500">Select a conversation…</p>
            )}
          </div>

          <div className="flex gap-2 border-t border-slate-800 p-4">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
              placeholder="Type a reply…"
              className="flex-1 rounded-lg bg-slate-800 p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendReply}
              disabled={busy || !replyText.trim()}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}