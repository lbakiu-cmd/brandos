"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Message = {
  role: "USER" | "COPILOT";
  content: string;
  suggestedActions?: string[];
  time: string;
};

type Business = {
  id: string;
  name: string;
  city: string | null;
  industry: string | null;
};

export default function CopilotPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "COPILOT",
      content: `👋 Hello! I am your **BrandOS AI Copilot & Growth Strategist**.\n\nI have full diagnostic awareness of your business profile, competitors, and omnichannel audit gaps. What would you like to optimize today?`,
      suggestedActions: [
        "Generate Schema.org JSON-LD",
        "Write AEO Direct Answer Block",
        "How to Outrank Competitors",
        "Draft Review Reply Template",
      ],
      time: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<Business>("/business").then((b) => setBusiness(b)).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(textToSend?: string) {
    const text = textToSend || input;
    if (!text.trim() || busy) return;

    const userMsg: Message = {
      role: "USER",
      content: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const res = await apiFetch<{ reply: string; suggestedActions?: string[] }>("/copilot/chat", {
        method: "POST",
        body: JSON.stringify({ message: text.trim() }),
      });

      const botMsg: Message = {
        role: "COPILOT",
        content: res.reply,
        suggestedActions: res.suggestedActions,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "COPILOT",
          content: "Sorry, I ran into an issue processing that request. Please try again.",
          time: "Just now",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-400">Online & Context Aware</span>
              <span className="text-xs text-slate-500">• {business?.name || "Your Business"}</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-white">AI Brand Copilot & Growth Strategist</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              ← Command Center
            </Link>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 space-y-4 overflow-y-auto mb-6 max-h-[60vh] pr-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === "USER" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-2xl rounded-3xl p-5 text-sm ${
                  m.role === "USER"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "border border-slate-800 bg-slate-900/80 text-slate-200 rounded-bl-none shadow-xl"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans leading-relaxed">
                  {m.content}
                </div>

                {m.suggestedActions && m.suggestedActions.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
                    {m.suggestedActions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => handleSend(act)}
                        className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-400 hover:bg-blue-500/20"
                      >
                        ⚡ {act}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="mt-1 text-[10px] text-slate-500 px-2">{m.time}</span>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        {/* Composer Input */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask anything about ${business?.name || "your brand"}'s SEO, AEO, schema, or competitors…`}
              className="flex-1 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40"
            >
              {busy ? "Thinking…" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
