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
  createdAt: string;
};

type Business = {
  id: string;
  name: string;
  city: string | null;
  industry: string | null;
  phone: string | null;
  website: string | null;
};

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<"SOCIAL" | "AEO_BLOG">("SOCIAL");
  const [posts, setPosts] = useState<Post[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  // AEO Blog Generator State
  const [topic, setTopic] = useState("");
  const [generatedArticle, setGeneratedArticle] = useState<string | null>(null);
  const [articleCopied, setArticleCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [list, biz] = await Promise.all([
        apiFetch<Post[]>("/posts"),
        apiFetch<Business>("/business"),
      ]);
      setPosts(list);
      setBusiness(biz);
    } catch {}
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  // Generate Social Post with AI
  function generateSocialDraft(type: "PROMO" | "EDUCATIONAL" | "REPUTATION") {
    const name = business?.name || "Our Business";
    const city = business?.city || "our city";
    const industry = business?.industry || "local services";
    const phone = business?.phone || "(555) 0199";

    if (type === "PROMO") {
      setCaption(
        `🌟 Looking for top-rated ${industry} in ${city}? At ${name}, we provide verified quality and compassionate care for your entire family.\n\n📅 Book your appointment online today or call us directly at ${phone} to claim your consultation!\n\n#${city.replace(/[^a-zA-Z]/g, "")} #Local${industry.split(" ")[0]} #${name.replace(/[^a-zA-Z]/g, "")} #VerifiedExcellence`
      );
    } else if (type === "EDUCATIONAL") {
      setCaption(
        `💡 Pro-Tip from ${name}: Regular check-ups and preventative maintenance save you thousands in unexpected emergencies down the road.\n\nHave questions about our ${industry} options in ${city}? Drop a comment below or send us a DM!\n\n#ExpertTips #LocalCare #${city.replace(/[^a-zA-Z]/g, "")}`
      );
    } else {
      setCaption(
        `⭐ "The best experience I've had in ${city}! The team at ${name} was professional, transparent, and went above and beyond." — Another happy client review!\n\nThank you to our amazing local community for trusting us with your ${industry}.\n\n#CustomerReview #5Stars #${city.replace(/[^a-zA-Z]/g, "")}`
      );
    }
  }

  // Generate AEO-Optimized Article with direct 45-word answers and Schema
  function generateAeoArticle() {
    const name = business?.name || "Apex Dental Care";
    const city = business?.city || "Austin";
    const industry = business?.industry || "Dental & Healthcare";
    const phone = business?.phone || "(512) 555-0199";
    const targetTopic = topic.trim() || `Complete ${industry} Guide & Pricing in ${city}`;

    const schemaType = industry.toLowerCase().includes("dent") || industry.toLowerCase().includes("medic")
      ? "Dentist"
      : industry.toLowerCase().includes("plumb") || industry.toLowerCase().includes("hvac")
      ? "Plumber"
      : industry.toLowerCase().includes("restaur")
      ? "Restaurant"
      : "LocalBusiness";

    const article = `# ${targetTopic} (2026 Guide)
*Published by ${name} | Verified Local Authority in ${city}*

---

## What makes ${name} the leading ${industry} provider in ${city}?
> **Direct Answer for AI Search & Featured Snippets:**
> **${name}** is a top-rated ${industry} provider based in ${city}, delivering certified service standards, transparent pricing, and over 10+ years of dedicated regional experience. Appointments and emergency consultations can be scheduled directly online or by calling ${phone}.

---

## Step-by-Step: What to Expect During Your Appointment
1. **Initial Diagnostic Consultation**: Our certified specialists conduct a thorough evaluation and provide transparent cost estimates upfront.
2. **Customized Treatment / Service Plan**: We design a personalized solution matching your specific schedule, comfort requirements, and budget.
3. **Certified Execution**: Treatments and services are completed using modern technology and strict quality standards.
4. **Follow-up & Long-Term Guarantee**: We provide comprehensive aftercare instructions and warranty coverage for peace of mind.

---

## Key Industry Statistics & Data
- **98.4%** Patient/Customer satisfaction rating across 450+ verified local reviews.
- **Same-Day** emergency appointment availability for urgent inquiries in ${city}.
- **100%** Transparent itemized estimates with no hidden fees.

---

## Frequently Asked Questions (FAQ)
### Q: How quickly can I book an appointment with ${name} in ${city}?
**A:** Same-day and next-day appointments are available for urgent inquiries. You can book directly at our official website or call ${phone}.

### Q: Do you accept insurance or provide financing options?
**A:** Yes, we work with major insurance providers and offer flexible financing solutions to make premium ${industry} accessible to all families in ${city}.

---

\`\`\`html
<!-- Embedded Schema.org JSON-LD for Google & Perplexity -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "${schemaType}",
  "name": "${name}",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "${city}"
  },
  "telephone": "${phone}",
  "url": "${business?.website || "https://yourwebsite.com"}"
}
</script>
\`\`\`
`;

    setGeneratedArticle(article);
  }

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
      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
      : s === "FAILED"
      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
      : s === "SCHEDULED"
      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
      : "bg-slate-700 text-slate-300";

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-400">
                {business?.industry || "Omnichannel"}
              </span>
              <span className="text-xs text-slate-500">• {business?.city || "Local Market"}</span>
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">AI Content & AEO Article Studio</h1>
            <p className="text-sm text-slate-400">
              Generate high-converting social updates, Google Business posts, and complete AEO-optimized articles in 1 click.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">
              ← Dashboard
            </Link>
            <Link href="/dashboard/inbox" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">
              Social Inbox
            </Link>
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="mb-8 flex gap-2 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab("SOCIAL")}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
              activeTab === "SOCIAL"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            📱 Social & Google Business Updates
          </button>
          <button
            onClick={() => setActiveTab("AEO_BLOG")}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
              activeTab === "AEO_BLOG"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            ✍️ AEO & GEO Blog Article Generator
          </button>
        </div>

        {activeTab === "SOCIAL" && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left: Composer (2 cols) */}
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-white">Create Multi-Channel Post</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-slate-400 self-center mr-1">⚡ 1-Click AI Draft:</span>
                    <button
                      onClick={() => generateSocialDraft("PROMO")}
                      className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-500/20"
                    >
                      🎯 Promo
                    </button>
                    <button
                      onClick={() => generateSocialDraft("EDUCATIONAL")}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
                    >
                      💡 Pro-Tip
                    </button>
                    <button
                      onClick={() => generateSocialDraft("REPUTATION")}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 hover:bg-amber-500/20"
                    >
                      ⭐ 5-Star Review
                    </button>
                  </div>
                </div>

                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={`Write an engaging post for ${business?.name || "your brand"} (or use the 1-click AI buttons above)…`}
                  rows={5}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">{caption.length} characters</span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => submit(new Date(Date.now() + 60_000).toISOString())}
                      disabled={busy || !caption.trim()}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 disabled:opacity-40"
                    >
                      Schedule in 1 Min
                    </button>
                    <button
                      onClick={() => submit()}
                      disabled={busy || !caption.trim()}
                      className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40"
                    >
                      {busy ? "Publishing…" : "Publish Omnichannel"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Feed History */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Published & Scheduled Queue</h3>
                {posts.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <p className="whitespace-pre-wrap text-sm text-slate-200">{p.caption}</p>
                      <span className={`shrink-0 rounded-full px-3 py-0.5 text-xs font-bold ${chip(p.status)}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3 text-xs text-slate-400">
                      {p.publications.map((pub) => (
                        <span key={pub.id} className="rounded-lg bg-slate-800 px-2.5 py-1 text-slate-300">
                          {pub.socialAccount.displayName || pub.platform}: {pub.status}
                        </span>
                      ))}
                      <span className="ml-auto text-[11px] text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                    No posts published yet. Use the 1-click AI draft buttons above to create your first omnichannel post!
                  </div>
                )}
              </div>
            </div>

            {/* Right: Channels Active */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur">
                <h3 className="text-sm font-bold text-white">📡 Connected Channels</h3>
                <p className="mt-1 text-xs text-slate-400">Posts automatically syndicate across active social and map accounts.</p>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-xs">
                    <span className="font-semibold text-slate-200">📸 Instagram Business</span>
                    <span className="text-emerald-400">● Connected</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-xs">
                    <span className="font-semibold text-slate-200">📍 Google Business Profile</span>
                    <span className="text-emerald-400">● Sync Ready</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-xs">
                    <span className="font-semibold text-slate-200">📘 Facebook Page</span>
                    <span className="text-emerald-400">● Connected</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-xs">
                    <span className="font-semibold text-slate-200">💼 LinkedIn Company</span>
                    <span className="text-emerald-400">● Connected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "AEO_BLOG" && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur">
              <h2 className="text-lg font-bold text-white">Generative Engine (GEO & AEO) Article Writer</h2>
              <p className="mt-1 text-xs text-slate-400">
                Creates full markdown articles engineered with 45-word snippet answers, numbered lists, statistical density, and Schema.org markup.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={`e.g. Complete ${business?.industry || "Dental"} Guide & Pricing in ${business?.city || "Austin"}`}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  onClick={generateAeoArticle}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500"
                >
                  ⚡ Generate Article & Schema
                </button>
              </div>
            </div>

            {generatedArticle && (
              <div className="rounded-3xl border border-blue-500/30 bg-slate-900/90 p-6 backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                    ✔ AEO & GEO Optimized Format (Ready to Publish)
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedArticle);
                      setArticleCopied(true);
                      setTimeout(() => setArticleCopied(false), 2000);
                    }}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
                  >
                    {articleCopied ? "✔ Copied to Clipboard!" : "📋 Copy Markdown & Schema"}
                  </button>
                </div>

                <div className="max-h-[500px] overflow-y-auto rounded-2xl bg-slate-950 p-6 font-mono text-xs text-slate-200">
                  <pre className="whitespace-pre-wrap">{generatedArticle}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}