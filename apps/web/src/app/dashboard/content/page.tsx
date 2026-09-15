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

type CategoryItem = {
  id: number;
  name: string;
  slug: string;
  isSuggested?: boolean;
};

type GeneratedArticle = {
  title: string;
  content: string;
  category: string;
  categories: string[];
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  word_count: number;
  read_time: string;
  schemas: any[];
  tags: string[];
};

type WpConnection = {
  connected: boolean;
  wordpressUrl: string | null;
  wordpressSiteName: string | null;
  wordpressPluginVersion: string | null;
};

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<"AEO_BLOG" | "SOCIAL">("AEO_BLOG");
  const [posts, setPosts] = useState<Post[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [wpConn, setWpConn] = useState<WpConnection | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  // Categories State
  const [availableCategories, setAvailableCategories] = useState<CategoryItem[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Article Generator State
  const [publishingMode, setPublishingMode] = useState<"MANUAL_REVIEW" | "AUTOPILOT" | "SCHEDULED">("MANUAL_REVIEW");
  const [topic, setTopic] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [generatingArticle, setGeneratingArticle] = useState(false);
  const [autopilotBusy, setAutopilotBusy] = useState(false);
  const [article, setArticle] = useState<GeneratedArticle | null>(null);
  const [articleCopied, setArticleCopied] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  // Featured Image State
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Autopilot Cadence State
  const [autopilotCadence, setAutopilotCadence] = useState<"WEEKLY" | "BIWEEKLY" | "MONTHLY">("WEEKLY");
  const [autopilotDefaultStatus, setAutopilotDefaultStatus] = useState<"draft" | "publish">("draft");
  const [autopilotSaved, setAutopilotSaved] = useState(false);
  const [autopilotConfig, setAutopilotConfig] = useState<any>(null);
  const [autopilotRunning, setAutopilotRunning] = useState(false);

  // WordPress Publish State
  const [publishStatus, setPublishStatus] = useState<"draft" | "publish" | "pending">("draft");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    permalink?: string;
    postId?: number;
    message?: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [list, biz, conn, autoRes] = await Promise.all([
        apiFetch<Post[]>("/posts"),
        apiFetch<Business>("/business"),
        apiFetch<WpConnection>("/wordpress/connection").catch(() => null),
        apiFetch<any>("/wordpress/autopilot-settings").catch(() => null),
      ]);
      setPosts(list);
      setBusiness(biz);
      if (conn) setWpConn(conn);
      if (autoRes?.autopilot) {
        setAutopilotConfig(autoRes.autopilot);
        if (autoRes.autopilot.cadence) setAutopilotCadence(autoRes.autopilot.cadence);
        if (autoRes.autopilot.defaultStatus) setAutopilotDefaultStatus(autoRes.autopilot.defaultStatus);
        if (Array.isArray(autoRes.autopilot.selectedCategories) && autoRes.autopilot.selectedCategories.length > 0) {
          setSelectedCategories(autoRes.autopilot.selectedCategories);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  // Load Categories on mount
  useEffect(() => {
    async function loadCategories() {
      setLoadingCategories(true);
      try {
        const res = await apiFetch<{ categories: CategoryItem[] }>("/wordpress/categories");
        if (res && Array.isArray(res.categories)) {
          setAvailableCategories(res.categories);
          // Pre-select first category if none selected
          if (res.categories.length > 0 && selectedCategories.length === 0) {
            setSelectedCategories([res.categories[0].name]);
          }
        }
      } catch (e) {
        // Fallback default services categories
        const defaults: CategoryItem[] = [
          { id: 1, name: "Services & Solutions Guide", slug: "services-guide", isSuggested: true },
          { id: 2, name: "Pricing & Cost Breakdown", slug: "pricing-breakdown", isSuggested: true },
          { id: 3, name: "Client Case Studies & Results", slug: "case-studies", isSuggested: true },
          { id: 4, name: "Frequently Asked Questions", slug: "faqs", isSuggested: true },
          { id: 5, name: "Expert Tips & Industry Insights", slug: "expert-tips", isSuggested: true },
          { id: 6, name: "Local Service Guide", slug: "local-guide", isSuggested: true },
        ];
        setAvailableCategories(defaults);
        if (selectedCategories.length === 0) setSelectedCategories([defaults[0].name]);
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  function toggleCategory(catName: string) {
    if (selectedCategories.includes(catName)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((c) => c !== catName));
      }
    } else {
      setSelectedCategories([...selectedCategories, catName]);
    }
  }

  function addCustomCategory() {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    if (!availableCategories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      const newCat: CategoryItem = {
        id: Date.now(),
        name: trimmed,
        slug: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        isSuggested: false,
      };
      setAvailableCategories([newCat, ...availableCategories]);
    }
    if (!selectedCategories.includes(trimmed)) {
      setSelectedCategories([...selectedCategories, trimmed]);
    }
    setCustomCategoryInput("");
  }

  // Generate Suggested Headlines based on Selected Categories
  const primaryCat = selectedCategories[0] || "Services Guide";
  const city = business?.city || "your area";
  // Omit the "at <business>" clause entirely rather than falling back to a
  // fake "Your Business" placeholder that could get used before real business
  // data finishes loading.
  const bizSuffix = business?.name ? ` at ${business.name}` : "";

  const suggestedHeadlines = [
    `The Complete 2026 ${primaryCat} in ${city}`,
    `${primaryCat}: Step-by-Step Overview and Key Benefits${bizSuffix}`,
    `How to Choose the Best Specialist for ${primaryCat} in ${city} (Checklist and FAQs)`,
  ];

  // Trigger AI Article Generation
  async function handleGenerateArticle(customTopic?: string) {
    if (selectedCategories.length === 0) return;
    setGeneratingArticle(true);
    setPublishResult(null);

    const chosenTopic = customTopic || topic || suggestedHeadlines[0];

    try {
      const res = await apiFetch<GeneratedArticle>("/wordpress/generate-article", {
        method: "POST",
        body: JSON.stringify({
          categories: selectedCategories,
          topic: chosenTopic,
          focusKeyword: focusKeyword || `${primaryCat.toLowerCase()} ${city.toLowerCase()}`,
        }),
      });

      setArticle(res);
      setTopic(res.title);
      setFocusKeyword(res.focus_keyword);
      setTagsInput((res.tags || []).join(", "));
      setFeaturedImage(null);
      setImageError(null);
    } catch (err: any) {
      alert(`Error generating article: ${err?.message || "Please check backend connection."}`);
    } finally {
      setGeneratingArticle(false);
    }
  }

  // Trigger AI Featured Image Generation
  async function handleGenerateImage() {
    setGeneratingImage(true);
    setImageError(null);
    try {
      const res = await apiFetch<{ imageBase64: string }>("/wordpress/generate-image", {
        method: "POST",
        body: JSON.stringify({
          topic: article?.title || topic,
          category: selectedCategories[0],
        }),
      });
      setFeaturedImage(res.imageBase64);
    } catch (err: any) {
      setImageError(err?.message || "Failed to generate image.");
    } finally {
      setGeneratingImage(false);
    }
  }

  // 1-Click Instant Autopilot: Generate & Push directly to WordPress
  async function handleAutopilotPublish(targetStatus: "draft" | "publish") {
    if (selectedCategories.length === 0) return;
    setAutopilotBusy(true);
    setPublishResult(null);

    const chosenTopic = topic || suggestedHeadlines[0];

    try {
      // 1. Generate Article
      const genRes = await apiFetch<GeneratedArticle>("/wordpress/generate-article", {
        method: "POST",
        body: JSON.stringify({
          categories: selectedCategories,
          topic: chosenTopic,
          focusKeyword: focusKeyword || `${primaryCat.toLowerCase()} ${city.toLowerCase()}`,
        }),
      });

      setArticle(genRes);
      setTopic(genRes.title);
      setFocusKeyword(genRes.focus_keyword);
      setTagsInput((genRes.tags || []).join(", "));

      // 2. Generate a low-cost featured image -- best-effort, never blocks publishing
      let instantImage: string | undefined;
      try {
        const imgRes = await apiFetch<{ imageBase64: string }>("/wordpress/generate-image", {
          method: "POST",
          body: JSON.stringify({ topic: genRes.title, category: selectedCategories[0] }),
        });
        instantImage = imgRes.imageBase64;
        setFeaturedImage(imgRes.imageBase64);
      } catch (imgErr: any) {
        setImageError(imgErr?.message || "Featured image generation failed -- publishing without one.");
      }

      // 3. Immediately Publish to WordPress
      const pubRes = await apiFetch<{
        success: boolean;
        post: {
          post_id: number;
          permalink: string;
          status: string;
          scores?: { seo: number; aeo: number; geo: number };
        };
        message: string;
      }>("/wordpress/publish", {
        method: "POST",
        body: JSON.stringify({
          title: genRes.title,
          content: genRes.content,
          status: targetStatus,
          meta_title: genRes.meta_title,
          meta_description: genRes.meta_description,
          focus_keyword: genRes.focus_keyword,
          categories: selectedCategories,
          schemas: genRes.schemas,
          tags: genRes.tags,
          featured_image_base64: instantImage,
        }),
        signal: AbortSignal.timeout(75000),
      });

      setPublishResult({
        success: true,
        permalink: pubRes.post?.permalink,
        postId: pubRes.post?.post_id,
        message: `⚡ Autopilot: Article successfully generated & pushed as ${targetStatus.toUpperCase()} to WordPress!`,
      });
    } catch (err: any) {
      setPublishResult({
        success: false,
        message: `Autopilot failed: ${err?.message || "Please verify WordPress connection."}`,
      });
    } finally {
      setAutopilotBusy(false);
    }
  }

  // Save Recurring Autopilot Schedule to Platform
  async function handleSaveAutopilotSchedule() {
    try {
      const res = await apiFetch<any>("/wordpress/autopilot-settings", {
        method: "POST",
        body: JSON.stringify({
          enabled: true,
          cadence: autopilotCadence,
          defaultStatus: autopilotDefaultStatus,
          selectedCategories,
        }),
      });
      setAutopilotConfig(res.autopilot);
      setAutopilotSaved(true);
      setTimeout(() => setAutopilotSaved(false), 4000);
    } catch (err: any) {
      alert("Error saving autopilot schedule: " + (err?.message || "Failed"));
    }
  }

  // Autonomous Instant Trigger of Next Autopilot Post
  async function handleTriggerAutopilotNow() {
    setAutopilotRunning(true);
    setPublishResult(null);
    try {
      const res = await apiFetch<any>("/wordpress/run-autopilot", {
        method: "POST",
      });
      setArticle(res.article);
      setPublishResult({
        success: true,
        message: res.message,
        permalink: res.post?.permalink,
        postId: res.post?.post_id,
      });
      setAutopilotConfig(res.autopilot);
    } catch (err: any) {
      setPublishResult({
        success: false,
        message: `Autopilot execution error: ${err?.message || "Failed"}`,
      });
    } finally {
      setAutopilotRunning(false);
    }
  }

  // Publish Generated Article to WordPress manually
  async function handlePublishToWordpress() {
    if (!article) return;
    setPublishing(true);
    setPublishResult(null);

    try {
      const res = await apiFetch<{
        success: boolean;
        post: {
          post_id: number;
          permalink: string;
          status: string;
          scores?: { seo: number; aeo: number; geo: number };
        };
        message: string;
      }>("/wordpress/publish", {
        method: "POST",
        body: JSON.stringify({
          title: article.title,
          content: article.content,
          status: publishStatus,
          meta_title: article.meta_title,
          meta_description: article.meta_description,
          focus_keyword: article.focus_keyword,
          categories: selectedCategories,
          schemas: article.schemas,
          tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
          featured_image_base64: featuredImage || undefined,
        }),
        signal: AbortSignal.timeout(75000),
      });

      setPublishResult({
        success: true,
        permalink: res.post?.permalink,
        postId: res.post?.post_id,
        message: res.message || `Successfully published article as ${publishStatus}!`,
      });
    } catch (err: any) {
      setPublishResult({
        success: false,
        message: err?.message || "Failed to publish to WordPress. Make sure the WordPress plugin is active.",
      });
    } finally {
      setPublishing(false);
    }
  }

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

  async function submitSocialPost(scheduledFor?: string) {
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
        {/* Page Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-400">
                {business?.industry || "Professional Services"}
              </span>
              <span className="text-xs text-slate-500">• {business?.city || "Local Market"}</span>
              {wpConn?.connected && (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                  WordPress Connected
                </span>
              )}
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">AI Content & Blog Article Studio</h1>
            <p className="text-sm text-slate-400">
              Generate category-targeted, SEO & AEO-optimized blog articles and publish them to your WordPress website in 1 click.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/integrations" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">
              🔌 WordPress Settings
            </Link>
            <Link href="/dashboard" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">
              ← Dashboard
            </Link>
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="mb-8 flex gap-2 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab("AEO_BLOG")}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
              activeTab === "AEO_BLOG"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            ✍️ WordPress Blog Article Studio
          </button>
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
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: WORDPRESS BLOG ARTICLE STUDIO (CATEGORY GATED)                     */}
        {/* ========================================================================= */}
        {activeTab === "AEO_BLOG" && (
          <div className="space-y-8">
            {/* STEP 1: CATEGORY SELECTION (GATED) */}
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-400">Step 1 • Required</span>
                  <h2 className="text-lg font-bold text-white">Select Business Categories for Blog Article</h2>
                </div>
                <span className="text-xs text-slate-400">
                  {selectedCategories.length} categor{selectedCategories.length === 1 ? "y" : "ies"} selected
                </span>
              </div>

              <p className="text-xs text-slate-400">
                The AI article generator will craft content strictly aligned with your chosen business vertical and category focus.
              </p>

              {/* Category Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {availableCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.name)}
                      className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold border transition ${
                        isSelected
                          ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/30 font-bold"
                          : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      <span>{isSelected ? "✓" : "+"}</span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Category */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <input
                  type="text"
                  value={customCategoryInput}
                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomCategory();
                    }
                  }}
                  placeholder="Add custom category (e.g. Laser Gum Treatment, Sleep Apnea)…"
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addCustomCategory}
                  disabled={!customCategoryInput.trim()}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                >
                  + Add Category
                </button>
              </div>

              {selectedCategories.length === 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-300">
                  ⚠️ Please select or type at least one business category to enable AI article generation.
                </div>
              )}
            </div>

            {/* STEP 2: TOPIC & HEADLINE FORMULATION */}
            {selectedCategories.length > 0 && (
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-400">Step 2</span>
                    <h2 className="text-lg font-bold text-white">Choose Topic Headline & Focus Keyword</h2>
                  </div>
                  <span className="text-xs text-slate-400">
                    Primary: <strong className="text-blue-300">{primaryCat}</strong>
                  </span>
                </div>

                {/* AI Suggested Headlines */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">💡 1-Click AI Suggested Angles for {primaryCat}:</span>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                    {suggestedHeadlines.map((headline, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setTopic(headline);
                          handleGenerateArticle(headline);
                        }}
                        disabled={generatingArticle}
                        className="flex flex-col justify-between text-left rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs text-slate-300 hover:border-blue-500/60 hover:bg-blue-950/20 hover:text-white transition group"
                      >
                        <span className="font-semibold group-hover:text-blue-300">{headline}</span>
                        <span className="mt-3 inline-flex items-center text-[10px] font-bold text-blue-400">
                          ⚡ Generate This Angle →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Headline & Focus Keyword Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Custom Article Title / Topic</label>
                    <input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder={suggestedHeadlines[0]}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">Target Focus Keyword</label>
                    <input
                      value={focusKeyword}
                      onChange={(e) => setFocusKeyword(e.target.value)}
                      placeholder={`${primaryCat.toLowerCase()} ${city.toLowerCase()}`}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Publishing Mode Selector */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Publishing Strategy & Workflow Decision
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Mode 1: Review Draft */}
                    <button
                      type="button"
                      onClick={() => setPublishingMode("MANUAL_REVIEW")}
                      className={`flex flex-col text-left rounded-2xl border p-4 transition ${
                        publishingMode === "MANUAL_REVIEW"
                          ? "border-blue-500 bg-blue-500/10 text-white shadow-md shadow-blue-500/20"
                          : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          ✍️ Review Draft & Publish
                        </span>
                        {publishingMode === "MANUAL_REVIEW" && (
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse"></span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
                        Inspect, edit text, adjust SEO keywords & Schema, then manually choose when to push to WordPress.
                      </p>
                    </button>

                    {/* Mode 2: 1-Click Autopilot */}
                    <button
                      type="button"
                      onClick={() => setPublishingMode("AUTOPILOT")}
                      className={`flex flex-col text-left rounded-2xl border p-4 transition ${
                        publishingMode === "AUTOPILOT"
                          ? "border-emerald-500 bg-emerald-500/10 text-white shadow-md shadow-emerald-500/20"
                          : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          ⚡ 1-Click Autopilot
                        </span>
                        {publishingMode === "AUTOPILOT" && (
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
                        Zero manual editing. AI crafts the article and immediately pushes it to WordPress in 1 click.
                      </p>
                    </button>

                    {/* Mode 3: Scheduled Cadence */}
                    <button
                      type="button"
                      onClick={() => setPublishingMode("SCHEDULED")}
                      className={`flex flex-col text-left rounded-2xl border p-4 transition ${
                        publishingMode === "SCHEDULED"
                          ? "border-purple-500 bg-purple-500/10 text-white shadow-md shadow-purple-500/20"
                          : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          📅 Scheduled Autopilot
                        </span>
                        {publishingMode === "SCHEDULED" && (
                          <span className="h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse"></span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
                        Set a recurring schedule (e.g. Weekly) to publish articles automatically across your categories.
                      </p>
                    </button>
                  </div>
                </div>

                {/* MODE 1 ACTION BUTTONS: MANUAL REVIEW */}
                {publishingMode === "MANUAL_REVIEW" && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleGenerateArticle()}
                      disabled={generatingArticle || selectedCategories.length === 0}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 transition"
                    >
                      {generatingArticle ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                          <span>Crafting AEO & GEO Optimized Article…</span>
                        </>
                      ) : (
                        <>
                          <span>⚡ Generate Article & Review Draft Below</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* MODE 2 ACTION BUTTONS: 1-CLICK AUTOPILOT */}
                {publishingMode === "AUTOPILOT" && (
                  <div className="space-y-3">
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🚀</span>
                        <div>
                          <h4 className="text-xs font-bold text-emerald-300">Instant Autopilot Dispatch</h4>
                          <p className="text-[11px] text-slate-400">Choose whether to publish live immediately or save as a draft in WordPress.</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleAutopilotPublish("draft")}
                          disabled={autopilotBusy || selectedCategories.length === 0}
                          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-40 transition"
                        >
                          {autopilotBusy ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                          ) : (
                            "⚡ Auto-Generate & Save as WP Draft"
                          )}
                        </button>
                        <button
                          onClick={() => handleAutopilotPublish("publish")}
                          disabled={autopilotBusy || selectedCategories.length === 0}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 transition"
                        >
                          {autopilotBusy ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                          ) : (
                            "🚀 Auto-Generate & PUBLISH LIVE on WordPress"
                          )}
                        </button>
                      </div>
                    </div>

                    {publishResult && (
                      <div
                        className={`rounded-2xl border p-4 text-xs ${
                          publishResult.success
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{publishResult.success ? "🎉" : "❌"}</span>
                            <span className="font-bold">{publishResult.message}</span>
                          </div>
                          {publishResult.permalink && (
                            <a
                              href={publishResult.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl bg-emerald-600 px-3.5 py-1.5 font-bold text-white hover:bg-emerald-500 transition shadow"
                            >
                              View Live Post on WordPress ↗
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* MODE 3: SCHEDULED AUTOPILOT CADENCE */}
                {publishingMode === "SCHEDULED" && (
                  <div className="pt-2 space-y-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-purple-300">Continuous Autonomous Publishing Cadence</h4>
                        <p className="text-[11px] text-slate-400">
                          AIVisibility SEO Worker will autonomously generate and push articles rotating through your selected categories ({selectedCategories.join(", ")}).
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300">Posting Cadence</label>
                        <select
                          value={autopilotCadence}
                          onChange={(e) => setAutopilotCadence(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs font-bold text-white outline-none"
                        >
                          <option value="WEEKLY">1 Article / Week (Recommended)</option>
                          <option value="BIWEEKLY">2 Articles / Week (Accelerated Growth)</option>
                          <option value="MONTHLY">1 Article / Month</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-300">Default Post Status in WordPress</label>
                        <select
                          value={autopilotDefaultStatus}
                          onChange={(e) => setAutopilotDefaultStatus(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs font-bold text-white outline-none"
                        >
                          <option value="draft">Draft (Ready for Review in WP)</option>
                          <option value="publish">Publish Live Immediately</option>
                        </select>
                      </div>
                    </div>

                    {/* Autopilot Status Bar */}
                    {autopilotConfig && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-slate-950/60 p-3 border border-purple-500/20 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Status</span>
                          <span className="font-semibold text-emerald-400">
                            {autopilotConfig.enabled ? "Active Autonomous Worker" : "Paused"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Autonomously Generated</span>
                          <span className="font-semibold text-white">
                            {autopilotConfig.articlesGeneratedCount || 0} Articles
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Next Scheduled Post</span>
                          <span className="font-semibold text-purple-300">
                            {autopilotConfig.nextRunAt ? new Date(autopilotConfig.nextRunAt).toLocaleDateString() : "Pending Activation"}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <span className="text-xs text-purple-300 font-semibold">
                        {autopilotSaved ? "✔ Autopilot Schedule Active & Synced with AIVisibility SEO Engine!" : ""}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleTriggerAutopilotNow}
                          disabled={autopilotRunning || selectedCategories.length === 0}
                          className="rounded-xl border border-purple-500/40 bg-purple-950/60 hover:bg-purple-900/60 px-4 py-2.5 text-xs font-bold text-purple-300 hover:text-white transition flex items-center gap-1.5 disabled:opacity-40 shadow"
                        >
                          {autopilotRunning ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-purple-300 border-t-transparent"></span>
                          ) : (
                            "⚡"
                          )}
                          <span>{autopilotRunning ? "Running Autopilot..." : "Trigger Next Autopilot Post Now"}</span>
                        </button>
                        <button
                          onClick={handleSaveAutopilotSchedule}
                          className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-500 transition shadow-lg shadow-purple-500/20"
                        >
                          💾 Save Autopilot Publishing Schedule
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: GENERATED ARTICLE REVIEW & EDIT */}
            {article && (
              <div className="space-y-6">
                {/* Meta Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</span>
                    <p className="mt-1 text-sm font-bold text-blue-400 truncate">{article.category}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Word Count</span>
                    <p className="mt-1 text-sm font-bold text-emerald-400">{article.word_count} words</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Est. Read Time</span>
                    <p className="mt-1 text-sm font-bold text-indigo-400">{article.read_time}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Schema Markup</span>
                    <p className="mt-1 text-sm font-bold text-purple-400">FAQPage + LocalBusiness</p>
                  </div>
                </div>

                {/* Article Editor / Preview */}
                <div className="rounded-3xl border border-blue-500/30 bg-slate-900/90 p-6 backdrop-blur space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                        Step 3 • Review & Edit
                      </span>
                      <h3 className="text-base font-bold text-white">Generated Blog Article Preview</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(article.content);
                          setArticleCopied(true);
                          setTimeout(() => setArticleCopied(false), 2000);
                        }}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
                      >
                        {articleCopied ? "✔ Copied!" : "📋 Copy Markdown"}
                      </button>
                    </div>
                  </div>

                  {/* Editable Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Post Title</label>
                    <input
                      value={article.title}
                      onChange={(e) => setArticle({ ...article, title: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm font-bold text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Meta Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">Meta Title (SEO)</label>
                      <input
                        value={article.meta_title}
                        onChange={(e) => setArticle({ ...article, meta_title: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400">Focus Keyword</label>
                      <input
                        value={article.focus_keyword}
                        onChange={(e) => setArticle({ ...article, focus_keyword: e.target.value })}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Meta Description */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Meta Description (AEO & SERP)</label>
                    <textarea
                      value={article.meta_description}
                      onChange={(e) => setArticle({ ...article, meta_description: e.target.value })}
                      rows={2}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Tags (comma-separated, applied as WordPress post tags)</label>
                    <input
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="e.g. dental implants, Tirana, cosmetic dentistry"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Article Content Textarea */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400">Article Body (Markdown / HTML)</label>
                    <textarea
                      value={article.content}
                      onChange={(e) => setArticle({ ...article, content: e.target.value })}
                      rows={14}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-200 leading-relaxed outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Featured Image */}
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                        Featured Image
                      </span>
                      <h3 className="text-base font-bold text-white">AI-Generated Post Thumbnail</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Optional -- generates an image with OpenAI and sets it as this post&apos;s featured image on publish.</p>
                    </div>
                    <button
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      className="rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-amber-600/20 transition disabled:opacity-50"
                    >
                      {generatingImage ? "Generating…" : featuredImage ? "🔄 Regenerate Image" : "🎨 Generate Image"}
                    </button>
                  </div>

                  {imageError && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
                      ❌ {imageError}
                    </div>
                  )}

                  {featuredImage ? (
                    <div className="space-y-2">
                      <img
                        src={featuredImage}
                        alt="Generated featured image preview"
                        className="w-full max-w-md rounded-2xl border border-slate-800"
                      />
                      <button
                        onClick={() => setFeaturedImage(null)}
                        className="text-xs font-semibold text-slate-400 hover:text-rose-400 transition"
                      >
                        Remove image
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No featured image yet -- the post will publish without one unless you generate one.</p>
                  )}
                </div>

                {/* STEP 4: 1-CLICK PUBLISH TO WORDPRESS */}
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">
                        Step 4 • 1-Click Publishing
                      </span>
                      <h3 className="text-base font-bold text-white">Push to Connected WordPress Website</h3>
                    </div>
                    {wpConn?.connected ? (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                        <span>{wpConn.wordpressSiteName || wpConn.wordpressUrl} (AIVision SEO active)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs text-amber-300">
                        <span>⚠️ WordPress Not Connected</span>
                        <Link href="/dashboard/integrations" className="underline font-bold">
                          Connect Now
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-slate-300">Publish as Status:</label>
                      <select
                        value={publishStatus}
                        onChange={(e) => setPublishStatus(e.target.value as any)}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                      >
                        <option value="draft">Draft (Review in WordPress)</option>
                        <option value="publish">Publish Immediately (Live on Site)</option>
                        <option value="pending">Pending Review</option>
                      </select>
                    </div>

                    <button
                      onClick={handlePublishToWordpress}
                      disabled={publishing || !article}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 transition"
                    >
                      {publishing ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                          <span>Pushing to WordPress Site…</span>
                        </>
                      ) : (
                        <>
                          <span>🚀 1-Click Publish Article to WordPress</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Publish Success / Error Banner */}
                  {publishResult && (
                    <div
                      className={`mt-4 rounded-2xl border p-4 text-xs ${
                        publishResult.success
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{publishResult.success ? "🎉" : "❌"}</span>
                          <span className="font-bold">{publishResult.message}</span>
                        </div>
                        {publishResult.permalink && (
                          <a
                            href={publishResult.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl bg-emerald-600 px-3.5 py-1.5 font-bold text-white hover:bg-emerald-500 transition shadow"
                          >
                            View Live Post on WordPress ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SOCIAL & GOOGLE BUSINESS POSTS                                     */}
        {/* ========================================================================= */}
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
                      onClick={() => submitSocialPost(new Date(Date.now() + 60_000).toISOString())}
                      disabled={busy || !caption.trim()}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 disabled:opacity-40"
                    >
                      Schedule in 1 Min
                    </button>
                    <button
                      onClick={() => submitSocialPost()}
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
      </div>
    </main>
  );
}