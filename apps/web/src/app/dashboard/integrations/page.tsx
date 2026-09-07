"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  BarChart3,
  MapPin,
  Plug,
  Users,
  Camera,
  Share2,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Sparkles,
  Zap,
  Globe,
  ExternalLink,
  Key,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type IntegrationItem = {
  provider: string;
  name: string;
  category: string;
  description: string;
  connected: boolean;
  accountName?: string | null;
  status: string;
  lastSyncedAt?: string | null;
  metricsAvailable: string[];
};

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
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [wp, setWp] = useState<WPConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedGoogleUri, setCopiedGoogleUri] = useState(false);
  const [copiedMetaUri, setCopiedMetaUri] = useState(false);
  const [wpUrl, setWpUrl] = useState("");
  const [connectingWp, setConnectingWp] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const brandosApiUrl = typeof window !== "undefined" ? window.location.origin : "https://brandoseye.com";
  const googleCallbackUri = `${brandosApiUrl}/api/oauth/google/callback`;
  const metaCallbackUri = `${brandosApiUrl}/api/oauth/meta/callback`;

  const copyApiUrl = () => {
    navigator.clipboard.writeText(brandosApiUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyGoogleUri = () => {
    navigator.clipboard.writeText(googleCallbackUri);
    setCopiedGoogleUri(true);
    setTimeout(() => setCopiedGoogleUri(false), 2000);
  };

  const copyMetaUri = () => {
    navigator.clipboard.writeText(metaCallbackUri);
    setCopiedMetaUri(true);
    setTimeout(() => setCopiedMetaUri(false), 2000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const [intRes, wpRes, bRes] = await Promise.all([
        apiFetch<any>("/integrations/status"),
        apiFetch<WPConnection>("/wordpress/connection"),
        apiFetch<any>("/business"),
      ]);

      if (bRes) setBusiness(bRes);
      if (intRes?.integrations) {
        setIntegrations(intRes.integrations);
      }
      if (wpRes) {
        setWp(wpRes);
        if (wpRes.wordpressUrl) {
          setWpUrl(wpRes.wordpressUrl);
        } else if (bRes?.website) {
          setWpUrl(bRes.website);
        }
      }
    } catch {
      // Ignored fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Check URL query parameters for OAuth returns
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "google_connected") {
        setNotice("🎉 Google Account connected successfully via OAuth! Real search and analytics data are now live.");
      } else if (params.get("success") === "meta_connected") {
        setNotice("🎉 Meta (Facebook & Instagram) connected successfully via OAuth! Real social reach and audience data are now live.");
      } else if (params.get("error")) {
        setNotice(`⚠️ Connection note: ${params.get("error")}`);
      }
    }
  }, [fetchStatus]);

  const handleOAuthConnect = async (provider: "google" | "meta") => {
    try {
      const res = await apiFetch<{ url: string }>(`/oauth/${provider}/url`);
      if (res?.url) {
        window.location.assign(res.url);
      } else {
        window.location.assign(`/api/oauth/${provider}/authorize`);
      }
    } catch {
      window.location.assign(`/api/oauth/${provider}/authorize`);
    }
  };


  const handleDisconnect = async (provider: string) => {
    try {
      await apiFetch(`/integrations/disconnect/${provider.toLowerCase()}`, {
        method: "POST",
      });
      setNotice(`Disconnected ${provider}.`);
      await fetchStatus();
    } catch (e: any) {
      setNotice(`Error: ${e.message}`);
    } finally {
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleSync = async (provider: string) => {
    setSyncingProvider(provider);
    try {
      await apiFetch(`/integrations/sync/${provider.toLowerCase()}`, {
        method: "POST",
      });
      setNotice(`Refreshed telemetry for ${provider}.`);
      await fetchStatus();
    } catch (e: any) {
      setNotice(`Sync error: ${e.message}`);
    } finally {
      setSyncingProvider(null);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleConnectWp = async () => {
    if (!wpUrl) return;
    setConnectingWp(true);
    try {
      const res = await apiFetch<any>("/wordpress/connect", {
        method: "POST",
        body: JSON.stringify({ site_url: wpUrl }),
      });
      setNotice(res.message || "Connected to WordPress!");
      await fetchStatus();
    } catch (err: any) {
      setNotice(err.message || "Failed to connect to WordPress.");
    } finally {
      setConnectingWp(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const copyApiKey = () => {
    if (wp?.apiKey) {
      navigator.clipboard.writeText(wp.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "GOOGLE_SEARCH_CONSOLE":
        return <Search className="h-5 w-5 text-blue-400" />;
      case "GOOGLE_ANALYTICS_4":
        return <BarChart3 className="h-5 w-5 text-amber-400" />;
      case "GOOGLE_BUSINESS_PROFILE":
        return <MapPin className="h-5 w-5 text-emerald-400" />;
      case "FACEBOOK_PAGE":
        return <Users className="h-5 w-5 text-blue-500" />;
      case "INSTAGRAM_INSIGHTS":
        return <Camera className="h-5 w-5 text-pink-400" />;
      case "LINKEDIN_COMPANY":
        return <Share2 className="h-5 w-5 text-sky-400" />;
      default:
        return <Plug className="h-5 w-5 text-indigo-400" />;
    }
  };

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Plug className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-white">Connected Accounts & OAuth</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Connect your real Google accounts, Meta pages, and WordPress site to monitor your actual traffic, rankings, and customer calls for <strong className="text-slate-200">{business?.name || "your business"}</strong>.
          </p>
        </div>

        <button
          onClick={() => setShowSetupGuide(!showSetupGuide)}
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <Key className="h-4 w-4 text-amber-400" />
          <span>OAuth Developer Setup Guide</span>
          {showSetupGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-xs font-semibold text-blue-400 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      {/* Expandable Developer App Setup Guide */}
      {showSetupGuide && (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-950/10 p-6 space-y-5">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <ShieldCheck className="h-5 w-5" />
            <h3>Google & Meta OAuth App Credentials Setup</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            To pull 100% real live data from your production accounts, add the following <strong>Authorized Redirect URIs</strong> to your Google Cloud Project and Meta Developer App:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Google OAuth URI */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-400">1. Google Cloud Console Redirect URI</span>
                <button
                  onClick={copyGoogleUri}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedGoogleUri ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedGoogleUri ? "Copied" : "Copy"}
                </button>
              </div>
              <code className="block rounded-lg bg-slate-900 p-2 text-[11px] text-slate-300 break-all select-all border border-slate-800">
                {googleCallbackUri}
              </code>
              <p className="text-[11px] text-slate-500">
                Enable: <em>Google Search Console API</em>, <em>Google Analytics Data API</em>, <em>Google Business Information API</em>.
              </p>
            </div>

            {/* Meta OAuth URI */}
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-400">2. Meta Developer Portal Redirect URI</span>
                <button
                  onClick={copyMetaUri}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedMetaUri ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copiedMetaUri ? "Copied" : "Copy"}
                </button>
              </div>
              <code className="block rounded-lg bg-slate-900 p-2 text-[11px] text-slate-300 break-all select-all border border-slate-800">
                {metaCallbackUri}
              </code>
              <p className="text-[11px] text-slate-500">
                Permissions: <em>pages_show_list</em>, <em>pages_read_engagement</em>, <em>instagram_basic</em>, <em>instagram_manage_insights</em>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Google OAuth Ecosystem */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" /> Google Search & Local Ecosystem
          </h2>
          <button
            onClick={() => handleOAuthConnect("google")}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold !text-white shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Globe className="h-4 w-4 !text-white" />
            <span className="!text-white">Connect Google Account via OAuth</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {integrations
            .filter((i) => i.category === "Google")
            .map((item) => (
              <div
                key={item.provider}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 border border-slate-800">
                      {getProviderIcon(item.provider)}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        item.connected
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {item.connected ? "Connected" : "Disconnected"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-3">{item.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.metricsAvailable.map((m) => (
                      <span
                        key={m}
                        className="rounded bg-slate-950 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-800"
                      >
                        {m}
                      </span>
                    ))}
                  </div>

                  {item.connected && (
                    <div className="mt-4 rounded-xl bg-slate-950/80 border border-slate-800/80 p-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Linked Property:</span>
                        <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                          {item.accountName || "Google Account"}
                        </span>
                      </div>
                      {item.lastSyncedAt && (
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Last Synced:</span>
                          <span>{new Date(item.lastSyncedAt).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {item.connected ? (
                    <>
                      <button
                        onClick={() => handleSync(item.provider)}
                        disabled={syncingProvider === item.provider}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${syncingProvider === item.provider ? "animate-spin text-blue-400" : ""}`}
                        />
                        <span>Sync</span>
                      </button>
                      <button
                        onClick={() => handleDisconnect(item.provider)}
                        className="text-xs font-medium text-rose-400/80 hover:text-rose-300 transition"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <div className="w-full">
                      <button
                        onClick={() => handleOAuthConnect("google")}
                        className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-xs font-bold text-white transition shadow-sm"
                      >
                        Connect OAuth
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* SECTION 2: Meta Social Ecosystem */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-400" /> Meta (Facebook & Instagram)
          </h2>
          <button
            onClick={() => handleOAuthConnect("meta")}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold !text-white shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Users className="h-4 w-4 !text-white" />
            <span className="!text-white">Connect Meta via OAuth</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations
            .filter((i) => i.category === "Meta")
            .map((item) => (
              <div
                key={item.provider}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 border border-slate-800">
                      {getProviderIcon(item.provider)}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        item.connected
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {item.connected ? "Connected" : "Disconnected"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-3">{item.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.description}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.metricsAvailable.map((m) => (
                      <span
                        key={m}
                        className="rounded bg-slate-950 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-800"
                      >
                        {m}
                      </span>
                    ))}
                  </div>

                  {item.connected && (
                    <div className="mt-4 rounded-xl bg-slate-950/80 border border-slate-800/80 p-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Account:</span>
                        <span className="font-semibold text-slate-200 truncate max-w-[150px]">
                          {item.accountName || "Meta Account"}
                        </span>
                      </div>
                      {item.lastSyncedAt && (
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Last Synced:</span>
                          <span>{new Date(item.lastSyncedAt).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  {item.connected ? (
                    <>
                      <button
                        onClick={() => handleSync(item.provider)}
                        disabled={syncingProvider === item.provider}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                      >
                        <RefreshCw
                          className={`h-3 w-3 ${syncingProvider === item.provider ? "animate-spin text-blue-400" : ""}`}
                        />
                        <span>Sync</span>
                      </button>
                      <button
                        onClick={() => handleDisconnect(item.provider)}
                        className="text-xs font-medium text-rose-400/80 hover:text-rose-300 transition"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <div className="w-full">
                      <button
                        onClick={() => handleOAuthConnect("meta")}
                        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-xs font-bold text-white transition shadow-sm"
                      >
                        Connect Meta OAuth
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* SECTION 3: WordPress Bi-Directional Bridge */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl backdrop-blur space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">WordPress Live Bridge & Plugin</h2>
              <p className="text-xs text-slate-400">
                1-Click Execution Plugin: Synchronize /llms.txt AI bio, LocalBusiness Schema JSON-LD, and robots.txt
              </p>
            </div>
          </div>

          <a
            href="/aivision-seo.zip"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold !text-white shadow-lg shadow-blue-600/20 transition cursor-pointer"
          >
            <Download className="h-4 w-4 !text-white" />
            <span className="!text-white">Download AIVision SEO Plugin v1.5.0 (.zip)</span>
          </a>
        </div>

        {/* 3 Step Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 space-y-2">
            <span className="font-bold text-blue-400">1. Install in WordPress</span>
            <p className="text-slate-400">Go to WP Admin → Plugins → Add New → Upload Plugin and upload the downloaded <code>.zip</code> file.</p>
          </div>
          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 space-y-2">
            <span className="font-bold text-indigo-400">2. Enter BrandOS API URL</span>
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
              <code className="text-[11px] text-slate-200 font-mono select-all truncate">{brandosApiUrl}</code>
              <button onClick={copyApiUrl} className="text-slate-400 hover:text-white pl-2">
                {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 space-y-2">
            <span className="font-bold text-emerald-400">3. Paste your API Key</span>
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
              <code className="text-[11px] text-slate-200 font-mono select-all truncate">{wp?.apiKey || "Loading..."}</code>
              <button onClick={copyApiKey} className="text-slate-400 hover:text-white pl-2">
                {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
