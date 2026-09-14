"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Star,
  PhoneCall,
  Navigation,
  Globe,
  Send,
  Sparkles,
  Check,
  TrendingUp,
  MessageSquare,
  Plug,
  Wand2,
  Copy,
  Layers,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Share2,
  ListPlus,
  ArrowRight,
  X,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { TimeRangeFilter } from "@/components/TimeRangeFilter";
import { TimeRangeKey, getTimeRangeLabel, getTimeRangeDays } from "@/lib/timeRanges";

export const dynamic = "force-dynamic";

export default function GbpPage() {
  const [activeView, setActiveView] = useState<"tools" | "overview">("tools");
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("7D");
  const [business, setBusiness] = useState<any>(null);
  const [gbpData, setGbpData] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({});

  // Active Tool Modal
  const [activeModal, setActiveModal] = useState<
    "category" | "post" | "qa" | "description" | "services" | "facebook" | "image" | null
  >(null);

  // Tool States
  const [toolLoading, setToolLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Category Finder State
  const [categoryData, setCategoryData] = useState<any>(null);

  // Post Generator State
  const [postType, setPostType] = useState<"WHATS_NEW" | "OFFER" | "EVENT">("WHATS_NEW");
  const [postTopic, setPostTopic] = useState("");
  const [postTone, setPostTone] = useState("Friendly & Authoritative");
  const [postResult, setPostResult] = useState<any>(null);

  // Q&A State
  const [qaData, setQaData] = useState<any>(null);

  // Description State
  const [descResult, setDescResult] = useState<any>(null);

  // Services State
  const [servicesData, setServicesData] = useState<any>(null);

  // Facebook Post State
  const [fbResult, setFbResult] = useState<any>(null);

  const fetchGbpForRange = useCallback(async (range: TimeRangeKey) => {
    try {
      const days = range === "MAX" ? 0 : getTimeRangeDays(range);
      const data = await apiFetch<any>(`/integrations/google/gbp?days=${days}`);
      if (data) setGbpData(data);
    } catch (err) {
      console.error("Failed to query GBP metrics:", err);
    }
  }, []);

  const [locations, setLocations] = useState<Array<{ name: string; title: string; accountName: string }>>([]);
  const [currentLocationName, setCurrentLocationName] = useState<string | null>(null);
  const [switchingLocation, setSwitchingLocation] = useState(false);

  useEffect(() => {
    if (!isConnected) return;
    apiFetch<{ locations: typeof locations; currentLocationName: string | null }>("/integrations/google/gbp-locations")
      .then((res) => {
        if (res?.locations) setLocations(res.locations);
        setCurrentLocationName(res?.currentLocationName ?? null);
      })
      .catch(() => {});
  }, [isConnected]);

  const handleSelectLocation = async (locationName: string) => {
    if (!locationName || locationName === currentLocationName) return;
    const chosen = locations.find((l) => l.name === locationName);
    const confirmed = window.confirm(
      `Switch this business's Google Business Profile data source to "${chosen?.title || locationName}"?\n\n` +
      `This changes which listing's map views, calls, and reviews are shown across the whole dashboard for ${business?.name || "this business"}. ` +
      `Only do this if you're sure -- if you picked the wrong one by accident, you can always switch back.`
    );
    if (!confirmed) return;

    setSwitchingLocation(true);
    try {
      await apiFetch("/integrations/google/select-gbp-location", {
        method: "POST",
        body: JSON.stringify({ locationName }),
      });
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch GBP location:", err);
      setSwitchingLocation(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [bRes, intRes, revRes] = await Promise.all([
          apiFetch<any>("/business").catch(() => null),
          apiFetch<any>("/integrations/status").catch(() => null),
          apiFetch<any>("/reviews").catch(() => null),
        ]);

        if (bRes) setBusiness(bRes);

        let initialReviews: any[] = [];

        if (intRes?.integrations) {
          const gbp = intRes.integrations.find((i: any) => i.provider === "GOOGLE_BUSINESS_PROFILE");
          setIsConnected(Boolean(gbp?.connected));
        }

        if (revRes?.reviews && revRes.reviews.length > 0) {
          initialReviews = revRes.reviews.map((r: any) => ({
            id: r.id,
            author: r.authorName,
            rating: r.rating,
            time: new Date(r.reviewDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            comment: r.comment,
            replied: Boolean(r.replyText),
            reply: r.replyText || undefined,
            aiDraft: r.aiReplyDraft || undefined,
          }));
        }

        if (revRes?.reviews && revRes.reviews.length > 0) {
          const dbRepliedMap = new Map<string, string>();
          revRes.reviews.forEach((d: any) => {
            if (d.replyText) {
              if (d.id) dbRepliedMap.set(d.id, d.replyText);
              if (d.authorName) dbRepliedMap.set(d.authorName.toLowerCase(), d.replyText);
            }
          });

          initialReviews = initialReviews.map((r: any) => {
            const match =
              (r.id && dbRepliedMap.get(r.id)) ||
              (r.author && dbRepliedMap.get(r.author.toLowerCase())) ||
              (r.authorName && dbRepliedMap.get(r.authorName.toLowerCase()));

            if (match) {
              return {
                ...r,
                replied: true,
                reply: match,
                aiDraft: undefined,
              };
            }
            return r;
          });
        }

        try {
          const storedReplies = JSON.parse(localStorage.getItem("brandos_approved_reviews") || "{}");
          initialReviews = initialReviews.map((r: any, idx: number) => {
            const authorKey = (r.author || r.authorName || "").toLowerCase();
            const idKey = r.id || idx.toString();
            const storedReply = storedReplies[idKey] || (authorKey && storedReplies[authorKey]);
            if (storedReply) {
              return {
                ...r,
                replied: true,
                reply: storedReply,
                aiDraft: undefined,
              };
            }
            return r;
          });
        } catch {}

        setReviews(initialReviews);
      } catch (err) {
        console.error("Failed to load GBP data:", err);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (isConnected) fetchGbpForRange(timeRange);
  }, [isConnected, timeRange, fetchGbpForRange]);

  const bName = business?.name || "Your Business";
  const bCity = business?.city || "";
  const bIndustry = business?.industry || "Services";

  const searchViews = isConnected && gbpData?.searchViews ? gbpData.searchViews : 0;
  const mapsViews = isConnected && gbpData?.mapsViews ? gbpData.mapsViews : 0;
  const callClicks = isConnected && gbpData?.callClicks ? gbpData.callClicks : 0;
  const directionRequests = isConnected && gbpData?.directionRequests ? gbpData.directionRequests : 0;
  const rating = isConnected && gbpData?.averageRating ? Number(gbpData.averageRating) : (reviews.length > 0 ? Number((reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)) : 0);
  const totalReviews = isConnected && gbpData?.totalReviews ? gbpData.totalReviews : reviews.length;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Trigger Category Finder
  const handleOpenCategories = async () => {
    setActiveModal("category");
    if (!categoryData) {
      setToolLoading(true);
      try {
        const res = await apiFetch<any>("/local-seo-tools/categories", {
          method: "POST",
          body: JSON.stringify({ industry: bIndustry }),
        });
        setCategoryData(res);
      } catch (err) {
        console.error("Categories fetch error:", err);
      } finally {
        setToolLoading(false);
      }
    }
  };

  // Trigger Post Generator
  const handleGeneratePost = async () => {
    setToolLoading(true);
    try {
      const res = await apiFetch<any>("/local-seo-tools/post", {
        method: "POST",
        body: JSON.stringify({ postType, topic: postTopic, tone: postTone }),
      });
      setPostResult(res);
    } catch (err) {
      console.error("Post generation error:", err);
    } finally {
      setToolLoading(false);
    }
  };

  // Trigger Q&A Generator
  const handleOpenQa = async () => {
    setActiveModal("qa");
    if (!qaData) {
      setToolLoading(true);
      try {
        const res = await apiFetch<any>("/local-seo-tools/qa", {
          method: "POST",
          body: JSON.stringify({}),
        });
        setQaData(res);
      } catch (err) {
        console.error("QA fetch error:", err);
      } finally {
        setToolLoading(false);
      }
    }
  };

  // Trigger Description Generator
  const handleOpenDescription = async () => {
    setActiveModal("description");
    if (!descResult) {
      setToolLoading(true);
      try {
        const res = await apiFetch<any>("/local-seo-tools/description", {
          method: "POST",
          body: JSON.stringify({}),
        });
        setDescResult(res);
      } catch (err) {
        console.error("Description fetch error:", err);
      } finally {
        setToolLoading(false);
      }
    }
  };

  // Trigger Service Finder
  const handleOpenServices = async () => {
    setActiveModal("services");
    if (!servicesData) {
      setToolLoading(true);
      try {
        const res = await apiFetch<any>("/local-seo-tools/services", {
          method: "POST",
          body: JSON.stringify({}),
        });
        setServicesData(res);
      } catch (err) {
        console.error("Services fetch error:", err);
      } finally {
        setToolLoading(false);
      }
    }
  };

  // Trigger Facebook Post
  const handleOpenFacebook = async () => {
    setActiveModal("facebook");
    if (!fbResult) {
      setToolLoading(true);
      try {
        const res = await apiFetch<any>("/local-seo-tools/post", {
          method: "POST",
          body: JSON.stringify({ postType: "OFFER", topic: "Facebook Community Announcement", tone: "Engaging & Friendly" }),
        });
        setFbResult(res);
      } catch (err) {
        console.error("Facebook post error:", err);
      } finally {
        setToolLoading(false);
      }
    }
  };

  const handleApproveReply = async (id: string, replyText: string, author?: string) => {
    setApprovingId(id);
    try {
      const stored = JSON.parse(localStorage.getItem("brandos_approved_reviews") || "{}");
      stored[id] = replyText;
      if (author) stored[author.toLowerCase()] = replyText;
      localStorage.setItem("brandos_approved_reviews", JSON.stringify(stored));
    } catch {}

    setReviews((prev) =>
      prev.map((r, i) =>
        r.id === id || i.toString() === id || (author && (r.author === author || r.authorName === author))
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
      console.error("Failed to persist reply to backend:", err);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAF7F2] dark:bg-zinc-950 text-[#1C1917] dark:text-zinc-100 p-6 sm:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8A5333] text-white font-black text-sm shadow-sm">
                <MapPin className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-extrabold text-[#1C1917] dark:text-white tracking-tight">
                Google Business Profile & Local Search
              </h1>
              <span className={`rounded-full px-3 py-0.5 text-xs font-bold border flex items-center gap-1.5 ${isConnected ? "border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" : "border-slate-300 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
                {isConnected ? `${bName} (Live Connected)` : "Profile Not Connected"}
              </span>
            </div>
            <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-1">
              Optimize Google Maps 3-Pack, local justifications, and generative AI search visibility{bCity ? ` in ${bCity}` : ""}.
            </p>
            {isConnected && locations.length > 1 && (
              <div className="mt-2 flex items-center gap-2">
                <label htmlFor="gbp-location-select" className="text-[11px] text-[#78716C] dark:text-zinc-500">
                  Business Profile Location:
                </label>
                <select
                  id="gbp-location-select"
                  value={currentLocationName || ""}
                  disabled={switchingLocation}
                  onChange={(e) => handleSelectLocation(e.target.value)}
                  className="rounded-lg bg-white dark:bg-zinc-900 border border-[#DECDBB] dark:border-zinc-700 px-2 py-1 text-[11px] text-[#1C1917] dark:text-zinc-200 focus:outline-none focus:border-[#8A5333] disabled:opacity-50"
                >
                  {!currentLocationName && <option value="">Select a location…</option>}
                  {locations.map((l) => (
                    <option key={l.name} value={l.name}>
                      {l.title} {l.accountName ? `(${l.accountName})` : ""}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-[#78716C] dark:text-zinc-500">{locations.length} locations found on this Google account</span>
              </div>
            )}
          </div>

          {/* View Switcher Tabs */}
          <div className="flex items-center gap-2 bg-[#EFE8DE] dark:bg-zinc-900 p-1 rounded-xl border border-[#E8DFD3] dark:border-zinc-800">
            <button
              onClick={() => setActiveView("tools")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeView === "tools"
                  ? "bg-white dark:bg-zinc-800 text-[#1C1917] dark:text-white shadow-xs"
                  : "text-[#78716C] dark:text-zinc-400 hover:text-[#1C1917]"
              }`}
            >
              <Wand2 className="h-3.5 w-3.5 text-[#8A5333] dark:text-amber-400" />
              <span>AI Local SEO Tools</span>
            </button>

            <button
              onClick={() => setActiveView("overview")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeView === "overview"
                  ? "bg-white dark:bg-zinc-800 text-[#1C1917] dark:text-white shadow-xs"
                  : "text-[#78716C] dark:text-zinc-400 hover:text-[#1C1917]"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Maps Metrics & Reviews</span>
            </button>
          </div>
        </div>

        {/* ----------------- VIEW 1: AI LOCAL SEO TOOLS ----------------- */}
        {activeView === "tools" && (
          <div className="space-y-6 pt-2">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-[#78716C] dark:text-zinc-400">
                Audit and update GMB using AI.
              </p>
            </div>

            {/* The 9-Card Tool Grid matching screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: GMB Post Generator */}
              <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition">
                <div className="space-y-2">
                  <h3 className="text-base font-black text-[#1C1917] dark:text-white leading-tight">
                    GMB Post Generator
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 leading-relaxed">
                    Use this tool to create GMB Posts for a business.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveModal("post");
                    if (!postResult) handleGeneratePost();
                  }}
                  className="w-full rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white py-2.5 px-4 text-xs font-bold shadow-xs transition"
                >
                  Generate GMB Post
                </button>
              </div>

              {/* Card 2: GMB Category Finder */}
              <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition">
                <div className="space-y-2">
                  <h3 className="text-base font-black text-[#1C1917] dark:text-white leading-tight">
                    GMB Category Finder
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 leading-relaxed">
                    Use this tool to find additional category based on your existing categories.
                  </p>
                </div>
                <button
                  onClick={handleOpenCategories}
                  className="w-full rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white py-2.5 px-4 text-xs font-bold shadow-xs transition"
                >
                  Find GMB Categories
                </button>
              </div>

              {/* Card 3: GMB Service Finder */}
              <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition">
                <div className="space-y-2">
                  <h3 className="text-base font-black text-[#1C1917] dark:text-white leading-tight">
                    GMB Service Finder
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 leading-relaxed">
                    Use this tool to find services based on your existing categories.
                  </p>
                </div>
                <button
                  onClick={handleOpenServices}
                  className="w-full rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white py-2.5 px-4 text-xs font-bold shadow-xs transition"
                >
                  Find GMB Services
                </button>
              </div>

              {/* Card 4: GMB Review Response Generator */}
              <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition">
                <div className="space-y-2">
                  <h3 className="text-base font-black text-[#1C1917] dark:text-white leading-tight">
                    GMB Review Response Generator
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 leading-relaxed">
                    Generate responses to Google Reviews.
                  </p>
                </div>
                <button
                  onClick={() => setActiveView("overview")}
                  className="w-full rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white py-2.5 px-4 text-xs font-bold shadow-xs transition"
                >
                  Generate Review Response
                </button>
              </div>

              {/* Card 5: GMB Description Generator */}
              <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition">
                <div className="space-y-2">
                  <h3 className="text-base font-black text-[#1C1917] dark:text-white leading-tight">
                    GMB Description Generator
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 leading-relaxed">
                    Use this tool to create a description section for your GMB.
                  </p>
                </div>
                <button
                  onClick={handleOpenDescription}
                  className="w-full rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white py-2.5 px-4 text-xs font-bold shadow-xs transition"
                >
                  Generate GMB Description
                </button>
              </div>

              {/* Card 6: Facebook Post Generator */}
              <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition">
                <div className="space-y-2">
                  <h3 className="text-base font-black text-[#1C1917] dark:text-white leading-tight">
                    Facebook Post Generator
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 leading-relaxed">
                    Use this tool to create a Facebook post for your business.
                  </p>
                </div>
                <button
                  onClick={handleOpenFacebook}
                  className="w-full rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white py-2.5 px-4 text-xs font-bold shadow-xs transition"
                >
                  Generate Facebook Post
                </button>
              </div>

              {/* Card 7: Q & A Section Generator */}
              <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition">
                <div className="space-y-2">
                  <h3 className="text-base font-black text-[#1C1917] dark:text-white leading-tight">
                    Q & A Section Generator
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 leading-relaxed">
                    Use this tool to get content for your GMB's Q&A section.
                  </p>
                </div>
                <button
                  onClick={handleOpenQa}
                  className="w-full rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white py-2.5 px-4 text-xs font-bold shadow-xs transition"
                >
                  Generate Q&A Section
                </button>
              </div>

              {/* Card 8: GBP Image Generator (New) */}
              <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between space-y-4 shadow-xs relative overflow-hidden hover:shadow-md transition">
                <span className="absolute top-2.5 right-3 rounded-md bg-amber-400 text-stone-900 text-[10px] font-black uppercase px-2 py-0.5 tracking-wider">
                  New
                </span>
                <div className="space-y-2">
                  <h3 className="text-base font-black text-[#1C1917] dark:text-white leading-tight">
                    GBP Image Generator
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 leading-relaxed">
                    Create on-brand images for your profile, Google Posts and social.
                  </p>
                </div>
                <button
                  onClick={() => setActiveModal("image")}
                  className="w-full rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white py-2.5 px-4 text-xs font-bold shadow-xs transition"
                >
                  Generate Images
                </button>
              </div>

              {/* Card 9: GBP AI Visibility Checker (New) */}
              <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between space-y-4 shadow-xs relative overflow-hidden hover:shadow-md transition">
                <span className="absolute top-2.5 right-3 rounded-md bg-amber-400 text-stone-900 text-[10px] font-black uppercase px-2 py-0.5 tracking-wider">
                  New
                </span>
                <div className="space-y-2">
                  <h3 className="text-base font-black text-[#1C1917] dark:text-white leading-tight">
                    GBP AI Visibility Checker
                  </h3>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400 leading-relaxed">
                    Check where AI recommends your business across Google AI Mode and ChatGPT.
                  </p>
                </div>
                <Link
                  href="/dashboard/visibility"
                  className="w-full rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white py-2.5 px-4 text-xs font-bold text-center shadow-xs transition block"
                >
                  Check AI Visibility
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- VIEW 2: LIVE METRICS & REVIEWS ----------------- */}
        {activeView === "overview" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#78716C] dark:text-zinc-400">
                Data for <strong className="text-[#1C1917] dark:text-white">{bName}</strong> ({getTimeRangeLabel(timeRange)})
              </span>
              <TimeRangeFilter
                value={timeRange}
                onChange={setTimeRange}
                variant="segmented"
                showIcon={true}
                accentColor="emerald"
              />
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
                <p className="text-xs font-medium text-[#78716C] dark:text-zinc-400 flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-blue-600" /> Google Search Views
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-black text-[#1C1917] dark:text-white">{searchViews.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
                <p className="text-xs font-medium text-[#78716C] dark:text-zinc-400 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-600" /> Google Maps Views
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-black text-[#1C1917] dark:text-white">{mapsViews.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
                <p className="text-xs font-medium text-[#78716C] dark:text-zinc-400 flex items-center gap-1.5">
                  <PhoneCall className="h-4 w-4 text-amber-600" /> Direct Phone Calls
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-black text-[#1C1917] dark:text-white">{callClicks.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
                <p className="text-xs font-medium text-[#78716C] dark:text-zinc-400 flex items-center gap-1.5">
                  <Navigation className="h-4 w-4 text-purple-600" /> Direction Requests
                </p>
                <div className="mt-2">
                  <span className="text-2xl font-black text-[#1C1917] dark:text-white">{directionRequests.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Customer Reviews Feed */}
            <div className="rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#1C1917] dark:text-white">
                    Google Reviews & AI Auto-Reply Feed
                  </h2>
                  <p className="text-xs text-[#78716C] dark:text-zinc-400">
                    Manage real customer sentiment and auto-publish personalized responses
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#78716C]">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-[#1C1917] dark:text-white">{rating > 0 ? rating : "—"}</span>
                  {totalReviews > 0 && <span>({totalReviews} reviews)</span>}
                </div>
              </div>

              <div className="space-y-3">
                {reviews.length > 0 ? (
                  reviews.map((r, idx) => {
                    const starCount = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
                    const authorName = String(r.author || r.authorName || "Verified Patient");
                    const dateStr = String(r.date || r.time || "Recent");
                    const commentStr = String(r.comment || "");
                    const replyStr = r.reply ? String(r.reply) : "";
                    const aiDraftStr = r.aiDraft ? String(r.aiDraft) : "";

                    return (
                      <div key={r.id || idx} className="rounded-xl bg-[#FAF7F2] dark:bg-zinc-950/60 p-4 border border-[#EFE8DE] dark:border-zinc-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1C1917] dark:text-white">{authorName}</span>
                            <div className="flex items-center text-amber-500">
                              {Array.from({ length: starCount }).map((_, i) => (
                                <Star key={i} className="h-3 w-3 fill-amber-400" />
                              ))}
                            </div>
                          </div>
                          <span className="text-[10px] text-[#78716C]">{dateStr}</span>
                        </div>

                        {commentStr && (
                          <p className="text-xs text-[#57534E] dark:text-zinc-300 italic">&ldquo;{commentStr}&rdquo;</p>
                        )}

                        {r.replied ? (
                          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-300">
                            <span className="font-bold flex items-center gap-1 mb-1">
                              <Check className="h-3 w-3" /> Responded:
                            </span>
                            {replyStr}
                          </div>
                        ) : (
                          <div className="rounded-lg bg-[#F5EBE1] dark:bg-amber-950/20 border border-[#E8DFD3] dark:border-amber-900/40 p-2.5 space-y-2">
                            <div className="flex items-center justify-between text-[11px] text-[#7A4B2A] dark:text-amber-300 font-semibold">
                              <span className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-[#8A5333]" /> AI Drafted Response:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const idKey = r.id || idx.toString();
                                  setEditingId(editingId === idKey ? null : idKey);
                                  if (!customDrafts[idKey]) {
                                    setCustomDrafts((prev) => ({ ...prev, [idKey]: aiDraftStr }));
                                  }
                                }}
                                className="text-[10px] text-[#8A5333] hover:underline font-normal"
                              >
                                {editingId === (r.id || idx.toString()) ? "Cancel" : "Edit Response"}
                              </button>
                            </div>

                            {editingId === (r.id || idx.toString()) ? (
                              <textarea
                                rows={3}
                                value={customDrafts[r.id || idx.toString()] ?? aiDraftStr}
                                onChange={(e) => {
                                  const idKey = r.id || idx.toString();
                                  setCustomDrafts((prev) => ({ ...prev, [idKey]: e.target.value }));
                                }}
                                className="w-full rounded-lg border border-[#DECDBB] dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2 text-xs text-[#1C1917] dark:text-zinc-200 outline-hidden focus:ring-1 focus:ring-[#8A5333]"
                              />
                            ) : (
                              <p className="text-[11px] text-[#57534E] dark:text-zinc-300">
                                {customDrafts[r.id || idx.toString()] || aiDraftStr || "Thank you for your feedback!"}
                              </p>
                            )}

                            <button
                              onClick={() => {
                                const idKey = r.id || idx.toString();
                                const textToSend = customDrafts[idKey] || aiDraftStr || "Thank you for your feedback!";
                                handleApproveReply(idKey, textToSend, authorName);
                              }}
                              disabled={approvingId === (r.id || idx.toString())}
                              className="flex items-center gap-1.5 rounded-lg bg-[#A15D39] hover:bg-[#8A4F30] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition disabled:opacity-50"
                            >
                              <Send className="h-3 w-3" />
                              <span>{approvingId === (r.id || idx.toString()) ? "Publishing..." : "Approve & Post to Google"}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-[#78716C]">
                    No Google reviews recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* --------------------------- TOOL MODALS ---------------------------------- */}
      {/* ========================================================================= */}

      {/* 1. GMB Category Finder Modal */}
      {activeModal === "category" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#F5EBE1] dark:bg-amber-950/40 border border-[#E8DFD3] dark:border-amber-900/50 px-2 py-0.5 text-[10px] font-bold text-[#7A4B2A] dark:text-amber-300 uppercase">
                    #1 Local Ranking Factor
                  </span>
                </div>
                <h3 className="text-lg font-black text-[#1C1917] dark:text-white mt-1">
                  Google Business Profile Category Optimizer
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  Optimize primary and secondary categories from Google's official taxonomy to rank in Maps 3-Pack.
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {toolLoading && !categoryData ? (
              <div className="py-12 text-center text-xs text-[#78716C] flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-[#8A5333]" />
                <span>Auditing Google categories taxonomy…</span>
              </div>
            ) : (
              categoryData && (
                <div className="space-y-4">
                  {/* Primary Category Banner */}
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                        Recommended Primary Category
                      </span>
                      <h4 className="text-base font-extrabold text-emerald-900 dark:text-emerald-200 mt-0.5">
                        {categoryData.primaryCategory}
                      </h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Retain as your primary category. Changing this category carries the greatest ranking volatility.
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(categoryData.primaryCategory, "primary")}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      {copiedKey === "primary" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey === "primary" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Secondary Category Recommendations */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#78716C] dark:text-zinc-400">
                      High-Impact Secondary Categories
                    </h4>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {categoryData.secondaryCategories?.map((item: any) => (
                        <div
                          key={item.category}
                          className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4 space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[#1C1917] dark:text-white">
                              {item.category}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                item.searchVolumeIndex === "VERY HIGH"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                              }`}
                            >
                              {item.searchVolumeIndex} VOL
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[#78716C] text-[11px]">Relevance Score:</span>
                            <span className="font-bold text-[#8A5333] dark:text-amber-400">
                              {item.relevanceScore}%
                            </span>
                          </div>

                          <p className="text-[11px] text-[#57534E] dark:text-zinc-300 leading-relaxed">
                            {item.whyItRanks}
                          </p>

                          <div className="pt-2 border-t border-[#F2E8DC] dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                            <span className="text-[#78716C] italic">{item.competitorAdoption}</span>
                            <button
                              onClick={() => copyToClipboard(item.category, item.category)}
                              className="text-xs font-semibold text-[#8A5333] dark:text-amber-400 hover:underline flex items-center gap-1"
                            >
                              {copiedKey === item.category ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pro Tips */}
                  <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FAF7F2] dark:bg-zinc-950/80 p-4 space-y-1.5 text-xs">
                    <span className="font-bold text-[#1C1917] dark:text-white flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-[#8A5333]" /> Pro Ranking Strategy:
                    </span>
                    <ul className="list-disc list-inside text-[#78716C] dark:text-zinc-400 space-y-1 text-[11px]">
                      {categoryData.tips?.map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white px-4 py-2 text-xs font-bold transition"
              >
                Close Optimizer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. GMB Post Generator Modal */}
      {activeModal === "post" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-[#1C1917] dark:text-white">
                  AI Google Business Post Generator
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  Generate keyword-rich posts that trigger Google Maps Local Justifications.
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Customization Inputs */}
            <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-[#1C1917] dark:text-zinc-200 block mb-1">
                    Post Type
                  </label>
                  <select
                    value={postType}
                    onChange={(e: any) => setPostType(e.target.value)}
                    className="w-full rounded-lg border border-[#DECDBB] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-[#1C1917] dark:text-zinc-200"
                  >
                    <option value="WHATS_NEW">What's New / Update</option>
                    <option value="OFFER">Special Offer / Promo</option>
                    <option value="EVENT">Event / Clinic Notice</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#1C1917] dark:text-zinc-200 block mb-1">
                    Topic / Service
                  </label>
                  <input
                    type="text"
                    value={postTopic}
                    onChange={(e) => setPostTopic(e.target.value)}
                    placeholder="e.g. Checkup & Ultrasonic Cleaning"
                    className="w-full rounded-lg border border-[#DECDBB] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-[#1C1917] dark:text-zinc-200"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1C1917] dark:text-zinc-200 block mb-1">
                    Tone
                  </label>
                  <select
                    value={postTone}
                    onChange={(e) => setPostTone(e.target.value)}
                    className="w-full rounded-lg border border-[#DECDBB] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs text-[#1C1917] dark:text-zinc-200"
                  >
                    <option>Friendly & Authoritative</option>
                    <option>Clinical & Reassuring</option>
                    <option>Urgent / Limited Availability</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleGeneratePost}
                  disabled={toolLoading}
                  className="rounded-lg bg-[#A15D39] hover:bg-[#8A4F30] text-white px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {toolLoading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Writing Post…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Generate Fresh Post</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Post Result */}
            {postResult && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#8A5333] dark:text-amber-400">
                      {postResult.headline}
                    </span>
                    <button
                      onClick={() => copyToClipboard(postResult.postContent, "postCopy")}
                      className="text-xs font-bold text-[#8A5333] hover:underline flex items-center gap-1"
                    >
                      {copiedKey === "postCopy" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey === "postCopy" ? "Copied" : "Copy Post"}</span>
                    </button>
                  </div>

                  <div className="rounded-lg bg-[#FCFAF7] dark:bg-zinc-900/60 p-4 text-xs text-[#1C1917] dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {postResult.postContent}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F2E8DC] dark:border-zinc-800 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#78716C]">Call to Action:</span>
                      <span className="rounded bg-[#F5EBE1] dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-[#7A4B2A] dark:text-amber-300">
                        {postResult.ctaType}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[#78716C]">
                      <span>Geo-anchored in:</span>
                      <span className="font-semibold text-[#1C1917] dark:text-white">
                        {postResult.geoAnchors?.join(", ")}
                      </span>
                    </div>
                  </div>

                  {postResult.suggestedImagePrompt && (
                    <div className="rounded-lg bg-[#FAF7F2] dark:bg-zinc-900/40 p-3 text-[11px] text-[#78716C] space-y-1">
                      <span className="font-bold text-[#1C1917] dark:text-white flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> Recommended Photo Prompt:
                      </span>
                      <p className="italic">{postResult.suggestedImagePrompt}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white px-4 py-2 text-xs font-bold transition"
              >
                Close Generator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Q & A Section Generator Modal */}
      {activeModal === "qa" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded bg-[#F5EBE1] dark:bg-amber-950/40 border border-[#E8DFD3] dark:border-amber-900/50 px-2 py-0.5 text-[10px] font-bold text-[#7A4B2A] dark:text-amber-300 uppercase">
                  AI Entity Authority
                </span>
                <h3 className="text-lg font-black text-[#1C1917] dark:text-white mt-1">
                  Google Q&A Pre-Emptive Generator
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  Pre-seed common customer questions with authoritative owner answers to rank higher in Google AI Overviews and ChatGPT.
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {toolLoading && !qaData ? (
              <div className="py-12 text-center text-xs text-[#78716C] flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-[#8A5333]" />
                <span>Formulating authoritative Q&As…</span>
              </div>
            ) : (
              qaData && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {qaData.qaItems?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded bg-[#F5EBE1] dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-[#7A4B2A] dark:text-amber-300">
                            Intent: {item.intent}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                `Q: ${item.question}\n\nA: ${item.answer}`,
                                `qa_${idx}`
                              )
                            }
                            className="text-xs font-bold text-[#8A5333] hover:underline flex items-center gap-1"
                          >
                            {copiedKey === `qa_${idx}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            <span>{copiedKey === `qa_${idx}` ? "Copied" : "Copy Q&A"}</span>
                          </button>
                        </div>

                        <h4 className="text-xs font-bold text-[#1C1917] dark:text-white">
                          Q: {item.question}
                        </h4>

                        <div className="rounded-lg bg-white dark:bg-zinc-900 border border-[#EBE3D5] dark:border-zinc-800 p-3 text-xs text-[#57534E] dark:text-zinc-300 leading-relaxed">
                          <strong className="text-[#1C1917] dark:text-white">Owner Response: </strong>
                          {item.answer}
                        </div>

                        <p className="text-[10px] text-[#78716C] dark:text-zinc-400 italic">
                          💡 {item.localRelevanceNote}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FAF7F2] dark:bg-zinc-950/80 p-4 space-y-1 text-xs">
                    <span className="font-bold text-[#1C1917] dark:text-white">Instructions:</span>
                    <ul className="list-disc list-inside text-[#78716C] dark:text-zinc-400 text-[11px] space-y-0.5">
                      {qaData.instructions?.map((inst: string, i: number) => (
                        <li key={i}>{inst}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white px-4 py-2 text-xs font-bold transition"
              >
                Close Q&A Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. GMB Description Generator Modal */}
      {activeModal === "description" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-[#1C1917] dark:text-white">
                  750-Character Geo-Optimized Description
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  Google limits descriptions to 750 characters. This generator optimizes keyword density and local landmarks.
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {toolLoading && !descResult ? (
              <div className="py-12 text-center text-xs text-[#78716C] flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-[#8A5333]" />
                <span>Crafting geo-anchored description…</span>
              </div>
            ) : (
              descResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1C1917] dark:text-white">
                      Length: {descResult.characterCount} / 750 characters
                    </span>
                    <button
                      onClick={() => copyToClipboard(descResult.description, "desc")}
                      className="font-bold text-[#8A5333] hover:underline flex items-center gap-1"
                    >
                      {copiedKey === "desc" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey === "desc" ? "Copied" : "Copy Description"}</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4 text-xs text-[#1C1917] dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {descResult.description}
                  </div>

                  <div className="space-y-2 text-xs">
                    <span className="text-[11px] font-semibold text-[#78716C]">
                      Target Local Anchors & Keywords Included:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {descResult.localAnchors?.map((anc: string) => (
                        <span
                          key={anc}
                          className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium"
                        >
                          📍 {anc}
                        </span>
                      ))}
                      {descResult.highlightedKeywords?.map((kw: string) => (
                        <span
                          key={kw}
                          className="rounded-full bg-[#F5EBE1] dark:bg-zinc-800 text-[#7A4B2A] dark:text-zinc-300 border border-[#DECDBB] px-2 py-0.5 text-[10px] font-medium"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white px-4 py-2 text-xs font-bold transition"
              >
                Close Description Generator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. GMB Service Finder Modal */}
      {activeModal === "services" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-[#1C1917] dark:text-white">
                  GMB Service Catalog Finder
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  Adding granular services with itemized descriptions directly increases Google Search keyword matching.
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {toolLoading && !servicesData ? (
              <div className="py-12 text-center text-xs text-[#78716C] flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-[#8A5333]" />
                <span>Auditing high-intent local services…</span>
              </div>
            ) : (
              servicesData && (
                <div className="space-y-3">
                  {servicesData.services?.map((svc: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#1C1917] dark:text-white">
                          {svc.serviceName}
                        </span>
                        <span className="rounded bg-[#F5EBE1] dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-[#7A4B2A] dark:text-amber-300">
                          {svc.typicalPricing}
                        </span>
                      </div>
                      <p className="text-xs text-[#57534E] dark:text-zinc-300">
                        {svc.shortDescription}
                      </p>
                      <div className="pt-2 flex justify-between items-center text-[11px] text-[#78716C]">
                        <span>Section: {svc.category}</span>
                        <button
                          onClick={() => copyToClipboard(`${svc.serviceName}: ${svc.shortDescription}`, `svc_${idx}`)}
                          className="font-bold text-[#8A5333] hover:underline flex items-center gap-1"
                        >
                          {copiedKey === `svc_${idx}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedKey === `svc_${idx}` ? "Copied" : "Copy Service"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white px-4 py-2 text-xs font-bold transition"
              >
                Close Services
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Facebook Post Generator Modal */}
      {activeModal === "facebook" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-[#1C1917] dark:text-white">
                  Facebook Community Post Generator
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  Generate high-engagement social posts with hashtags and community hooks.
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {fbResult && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4 text-xs text-[#1C1917] dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {fbResult.postContent}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => copyToClipboard(fbResult.postContent, "fb")}
                    className="rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white px-4 py-2 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    {copiedKey === "fb" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedKey === "fb" ? "Copied" : "Copy Facebook Post"}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-[#78716C] hover:bg-[#F2E8DC] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Image Generator Guidelines Modal */}
      {activeModal === "image" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#EBE3D5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="rounded-md bg-amber-400 text-stone-900 text-[10px] font-black uppercase px-2 py-0.5 tracking-wider">
                  New Feature
                </span>
                <h3 className="text-lg font-black text-[#1C1917] dark:text-white mt-1">
                  Google Business Profile Image Strategy
                </h3>
                <p className="text-xs text-[#78716C] dark:text-zinc-400 mt-0.5">
                  High-converting photo guidelines for Google Maps (Businesses with 100+ photos receive 520% more calls).
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-[#78716C] hover:text-[#1C1917] dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4 space-y-2">
                <span className="font-bold text-[#1C1917] dark:text-white">
                  1. Exterior & Street View Photo
                </span>
                <p className="text-[#57534E] dark:text-zinc-300">
                  Take a wide shot showing the building entrance, signage, and street context. This directly assists patients driving or walking via Google Maps Navigation.
                </p>
              </div>

              <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4 space-y-2">
                <span className="font-bold text-[#1C1917] dark:text-white">
                  2. Reception & Treatment Suites
                </span>
                <p className="text-[#57534E] dark:text-zinc-300">
                  Showcase immaculate sterilization, modern medical chairs, and friendly reception greeting areas to eliminate patient hesitation.
                </p>
              </div>

              <div className="rounded-xl border border-[#EBE3D5] dark:border-zinc-800 bg-[#FCFAF7] dark:bg-zinc-950 p-4 space-y-2">
                <span className="font-bold text-[#1C1917] dark:text-white">
                  3. Team & Doctor Portraits
                </span>
                <p className="text-[#57534E] dark:text-zinc-300">
                  Professional headshots of doctors in clinical coats. Real human faces receive 35% more click-throughs in Google Local Pack results.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-[#A15D39] hover:bg-[#8A4F30] text-white px-4 py-2 text-xs font-bold transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
