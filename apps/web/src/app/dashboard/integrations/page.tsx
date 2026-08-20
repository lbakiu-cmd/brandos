"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type WPConnection = {
  connected: boolean;
  wordpressUrl: string | null;
  wordpressSiteName: string | null;
  wordpressPluginVersion: string | null;
  wordpressConnectedAt: string | null;
  wordpressLastSyncedAt: string | null;
  wordpressTelemetry: any | null;
  apiKey: string;
};

export default function IntegrationsPage() {
  const [wp, setWp] = useState<WPConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectUrl, setConnectUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchConnection = useCallback(async () => {
    try {
      const data = await apiFetch<WPConnection>("/wordpress/connection");
      setWp(data);
      if (data.wordpressUrl) setConnectUrl(data.wordpressUrl);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  async function handleConnect() {
    if (!connectUrl) return;
    setConnecting(true);
    setActionStatus(null);
    try {
      const res = await apiFetch<any>("/wordpress/connect", {
        method: "POST",
        body: JSON.stringify({ site_url: connectUrl }),
      });
      setActionStatus({ type: "success", msg: res.message || "Connected to WordPress successfully!" });
      await fetchConnection();
    } catch (err: any) {
      setActionStatus({ type: "error", msg: err.message || "Failed to connect to WordPress site." });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect this WordPress site?")) return;
    setActionStatus(null);
    try {
      await apiFetch("/wordpress/disconnect", { method: "POST" });
      setActionStatus({ type: "success", msg: "WordPress site disconnected. Plugin is now in Standalone mode." });
      await fetchConnection();
    } catch (err: any) {
      setActionStatus({ type: "error", msg: err.message || "Disconnect failed." });
    }
  }

  async function handleSync() {
    setSyncing(true);
    setActionStatus(null);
    try {
      const res = await apiFetch<any>("/wordpress/sync", { method: "POST" });
      setActionStatus({ type: "success", msg: "Telemetry and post scores successfully synchronized!" });
      await fetchConnection();
    } catch (err: any) {
      setActionStatus({ type: "error", msg: err.message || "Failed to sync with WordPress site." });
    } finally {
      setSyncing(false);
    }
  }

  async function handleRemoteFix(fixType: string, payload: any = {}) {
    setActionStatus(null);
    try {
      const res = await apiFetch<any>("/wordpress/apply-fix", {
        method: "POST",
        body: JSON.stringify({ fix_type: fixType, payload }),
      });
      setActionStatus({ type: "success", msg: `⚡ Remote Fix Applied: ${res.message || "Updated successfully!"}` });
      await fetchConnection();
    } catch (err: any) {
      setActionStatus({ type: "error", msg: err.message || "Failed to apply fix in WordPress." });
    }
  }

  function copyApiKey() {
    if (!wp?.apiKey) return;
    navigator.clipboard.writeText(wp.apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const telemetry = wp?.wordpressTelemetry?.telemetry;
  const statusData = wp?.wordpressTelemetry?.status;

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-white">Integrations &amp; CMS Connectors</h1>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 border border-blue-500/20">
                AIVision Ecosystem
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Connect your WordPress sites, local search profiles, and discovery engines for automated 1-click execution.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard/audit"
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              ← Back to Audits
            </Link>
          </div>
        </header>

        {/* Global Feedback Alert */}
        {actionStatus && (
          <div
            className={`flex items-center justify-between rounded-2xl p-4 text-sm font-medium ${
              actionStatus.type === "success"
                ? "border border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                : "border border-rose-500/30 bg-rose-950/40 text-rose-300"
            }`}
          >
            <span>{actionStatus.msg}</span>
            <button
              onClick={() => setActionStatus(null)}
              className="text-xs font-bold opacity-70 hover:opacity-100"
            >
              ✕ Dismiss
            </button>
          </div>
        )}

        {/* WordPress / AIVision SEO Integration Card */}
        <section className="rounded-3xl border border-blue-500/30 bg-gradient-to-b from-blue-950/20 via-slate-900/60 to-slate-950 p-6 backdrop-blur md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30 text-3xl shadow-lg shadow-blue-500/10">
                🔌
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">WordPress — AIVision SEO Plugin</h2>
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300">
                    v{wp?.wordpressPluginVersion || "1.4.1"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400 max-w-xl">
                  The on-site execution engine for SEO, AEO (Answer Engine), and GEO (Generative AI) discovery. Works 100% standalone or connected to BrandOS for remote 1-click fixes and AI post publishing.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {wp?.connected ? (
                <span className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Connected to WordPress
                </span>
              ) : (
                <span className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3.5 py-1.5 text-xs font-bold text-slate-300">
                  <span className="h-2 w-2 rounded-full bg-slate-500" />
                  Standalone / Ready to Connect
                </span>
              )}
            </div>
          </div>

          {/* Connected Details or Connect Form */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left: Connect or Manage (2 cols) */}
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <h3 className="text-sm font-bold text-slate-200">
                  {wp?.connected ? "1. Connected WordPress Site" : "1. Connect WordPress Site"}
                </h3>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="url"
                    value={connectUrl}
                    onChange={(e) => setConnectUrl(e.target.value)}
                    placeholder="e.g. https://mybrandwebsite.com"
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    onClick={handleConnect}
                    disabled={connecting || !connectUrl}
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500 disabled:opacity-50"
                  >
                    {connecting ? "Connecting…" : wp?.connected ? "Update URL" : "Connect Site"}
                  </button>
                  {wp?.connected && (
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
                    >
                      {syncing ? "Syncing…" : "🔄 Sync Now"}
                    </button>
                  )}
                </div>

                {wp?.connected && wp.wordpressUrl && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-4 text-xs text-slate-400">
                    <div>
                      <span>Linked URL: </span>
                      <a href={wp.wordpressUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                        {wp.wordpressUrl}
                      </a>
                    </div>
                    <div>
                      <span>Last Synced: </span>
                      <span className="text-slate-300">{wp.wordpressLastSyncedAt ? new Date(wp.wordpressLastSyncedAt).toLocaleString() : "Just now"}</span>
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className="text-rose-400 hover:text-rose-300 font-semibold"
                    >
                      Disconnect Site
                    </button>
                  </div>
                )}
              </div>

              {/* 1-Click Remote Control Actions */}
              {wp?.connected && (
                <div className="rounded-2xl border border-blue-500/20 bg-blue-950/10 p-5">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>⚡ Remote 1-Click Execution Dispatcher</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-mono">LIVE REST API</span>
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Push automated AI visibility and on-page optimization fixes directly to your WordPress site with zero manual editing.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button
                      onClick={() => handleRemoteFix("OPTIMIZE_ROBOTS")}
                      className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 text-left transition hover:border-blue-500 hover:bg-blue-500/10"
                    >
                      <p className="text-xs font-bold text-white">🤖 Push robots.txt</p>
                      <p className="mt-1 text-[11px] text-slate-400">Allow GPTBot, ClaudeBot, PerplexityBot</p>
                    </button>

                    <button
                      onClick={() => handleRemoteFix("GENERATE_FEEDS")}
                      className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 text-left transition hover:border-blue-500 hover:bg-blue-500/10"
                    >
                      <p className="text-xs font-bold text-white">📄 Sync /llms.txt</p>
                      <p className="mt-1 text-[11px] text-slate-400">Regenerate dynamic &amp; full feeds</p>
                    </button>

                    <button
                      onClick={() => handleRemoteFix("LOCAL_BUSINESS_SCHEMA", { schema_type: "LocalBusiness", schema_json: { "@context": "https://schema.org", "@type": "LocalBusiness", "name": wp.wordpressSiteName || "Business", "url": wp.wordpressUrl } })}
                      className="rounded-xl border border-slate-700/80 bg-slate-900/90 p-3 text-left transition hover:border-blue-500 hover:bg-blue-500/10"
                    >
                      <p className="text-xs font-bold text-white">🏷️ Inject Schema</p>
                      <p className="mt-1 text-[11px] text-slate-400">Push Schema.org JSON-LD graph</p>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: API Key & Plugin Download (1 col) */}
            <div className="space-y-6">
              {/* API Key Box */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <h3 className="text-sm font-bold text-slate-200">2. Business API Key</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Paste this key into the <strong>AIVision SEO → Settings</strong> screen inside WordPress.
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={wp?.apiKey || "Loading…"}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-300 outline-none"
                  />
                  <button
                    onClick={copyApiKey}
                    className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 shrink-0"
                  >
                    {copied ? "✔ Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Download Plugin Package */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                <h3 className="text-sm font-bold text-slate-200">3. Download Plugin</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Get the official, standalone-ready AIVision SEO WordPress plugin package.
                </p>

                <a
                  href="/api/wordpress/plugin-download"
                  download="aivision-seo-v1.4.1.zip"
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-500 hover:to-teal-500"
                >
                  <span>⬇️ Download AIVision SEO (v1.4.1 .ZIP)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Telemetry Summary Table (If Synced) */}
          {telemetry?.posts && telemetry.posts.length > 0 && (
            <div className="mt-8 border-t border-slate-800 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📈 Live WordPress Post Telemetry</span>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-normal">
                    {telemetry.posts.length} posts synchronized
                  </span>
                </h3>
                <div className="flex gap-4 text-xs font-semibold">
                  <span className="text-blue-400">Avg SEO: {telemetry.summary?.average_seo}%</span>
                  <span className="text-indigo-400">Avg AEO: {telemetry.summary?.average_aeo}%</span>
                  <span className="text-emerald-400">Avg GEO: {telemetry.summary?.average_geo}%</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="p-3">Title &amp; URL</th>
                      <th className="p-3">Focus Keyword</th>
                      <th className="p-3 text-center">SEO</th>
                      <th className="p-3 text-center">AEO</th>
                      <th className="p-3 text-center">GEO</th>
                      <th className="p-3 text-center">Schema</th>
                      <th className="p-3">Word Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {telemetry.posts.slice(0, 5).map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-3 font-semibold text-white max-w-xs truncate">
                          <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-blue-400">
                            {p.title}
                          </a>
                        </td>
                        <td className="p-3 text-slate-400">{p.focus_keyword || "—"}</td>
                        <td className="p-3 text-center">
                          <span className="rounded bg-blue-500/20 px-2 py-0.5 font-bold text-blue-400">
                            {p.seo_score}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-bold text-indigo-400">
                            {p.aeo_score}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-400">
                            {p.geo_score}%
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-300">
                          {p.has_schema ? "✔ Injected" : "❌ None"}
                        </td>
                        <td className="p-3 text-slate-400">{p.word_count} words</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Other Platform Channels */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <div>
                <h3 className="text-base font-bold text-white">Google Business Profile</h3>
                <p className="text-xs text-slate-400">Local Maps &amp; Knowledge Panel</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Synced directly via Google API for review sentiment and local proximity signals.
            </p>
            <div className="mt-4">
              <span className="text-xs font-semibold text-emerald-400">● Active</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="text-base font-bold text-white">AI Search Simulations</h3>
                <p className="text-xs text-slate-400">ChatGPT, Perplexity, Gemini, Claude</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Continuous synthetic query probes tracking citation rank against local competitors.
            </p>
            <div className="mt-4">
              <span className="text-xs font-semibold text-blue-400">● Multi-Engine Probing</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <h3 className="text-base font-bold text-white">Social Discovery Feeds</h3>
                <p className="text-xs text-slate-400">Instagram, Facebook, LinkedIn, TikTok</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Social channel authority indexing feeding BrandOS composite brand visibility score.
            </p>
            <div className="mt-4">
              <span className="text-xs font-semibold text-slate-400">Configured</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
