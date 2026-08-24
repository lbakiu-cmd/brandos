"use client";

import { useState } from "react";
import {
  X,
  Search,
  Plus,
  Check,
  Sparkles,
  BarChart3,
  MapPin,
  ShieldCheck,
  Star,
  Plug,
  Users,
  Camera,
  Share2,
  Flame,
  Globe,
} from "lucide-react";

export type WidgetItem = {
  type: string;
  title: string;
  category: string;
  description: string;
  icon: any;
  defaultWidth: number;
  tags: string[];
  providerRequired?: string;
};

const WIDGET_CATALOG: WidgetItem[] = [
  // Google
  {
    type: "GSC_QUERIES_TABLE",
    title: "Google Search Console — Top Queries",
    category: "Google",
    description: "Real-time organic search queries, clicks, impressions, CTR, and average position.",
    icon: Search,
    defaultWidth: 2,
    tags: ["SEO", "Google", "Rankings", "Clicks"],
    providerRequired: "GOOGLE_SEARCH_CONSOLE",
  },
  {
    type: "GA4_AI_TRAFFIC",
    title: "Google Analytics 4 — AI Referrals",
    category: "Google",
    description: "Traffic originating specifically from ChatGPT, Perplexity AI, Claude.ai, and Google Gemini.",
    icon: BarChart3,
    defaultWidth: 2,
    tags: ["AEO", "AI", "Traffic", "Referrals"],
    providerRequired: "GOOGLE_ANALYTICS_4",
  },
  {
    type: "GBP_LOCAL_PERFORMANCE",
    title: "Google Business Profile — Local Discovery",
    category: "Google",
    description: "Search impressions, map views, direct phone call clicks, and driving direction requests.",
    icon: MapPin,
    defaultWidth: 2,
    tags: ["Local SEO", "Maps", "Calls", "Google"],
    providerRequired: "GOOGLE_BUSINESS_PROFILE",
  },
  {
    type: "GBP_REVIEWS_FEED",
    title: "Google Reviews & AI Auto-Reply Feed",
    category: "Reviews",
    description: "Live stream of customer reviews with sentiment tags and 1-click AI response generation.",
    icon: Star,
    defaultWidth: 2,
    tags: ["Reviews", "Reputation", "AI Reply"],
    providerRequired: "GOOGLE_BUSINESS_PROFILE",
  },

  // AI & AEO
  {
    type: "AEO_CITATION_SHARE",
    title: "AEO / GEO — AI Citation Share of Voice",
    category: "AI Discovery",
    description: "Brand mention and citation probability score across ChatGPT, Perplexity, Gemini, and Claude.",
    icon: Sparkles,
    defaultWidth: 1,
    tags: ["AEO", "GEO", "ChatGPT", "Perplexity"],
  },

  // SEO & Indexing
  {
    type: "SEO_HEALTH_GAUGE",
    title: "Technical SEO & Schema Health",
    category: "SEO",
    description: "Core Web Vitals, Schema.org entity validation, robots.txt, and dynamic /llms.txt status.",
    icon: ShieldCheck,
    defaultWidth: 1,
    tags: ["SEO", "Schema", "Audit"],
  },
  {
    type: "WORDPRESS_AIVISION_STATUS",
    title: "WordPress AIVision SEO Live Telemetry",
    category: "Custom",
    description: "Connected site scores, schema injection state, /llms.txt synchronization, and remote fix status.",
    icon: Plug,
    defaultWidth: 2,
    tags: ["WordPress", "Plugin", "AIVision"],
    providerRequired: "WORDPRESS",
  },

  // Social Analytics
  {
    type: "META_PAGE_REACH",
    title: "Facebook Page Reach & Engagement",
    category: "Social Analytics",
    description: "Page impressions, reach, total page likes, and audience engagement rates.",
    icon: Users,
    defaultWidth: 1,
    tags: ["Social", "Meta", "Reach"],
    providerRequired: "FACEBOOK_PAGE",
  },
  {
    type: "INSTAGRAM_AUDIENCE",
    title: "Instagram Audience & Profile Visits",
    category: "Social Analytics",
    description: "Follower growth, profile interactions, reach, and demographic insights.",
    icon: Camera,
    defaultWidth: 1,
    tags: ["Social", "Instagram", "Followers"],
    providerRequired: "INSTAGRAM_INSIGHTS",
  },
  {
    type: "LINKEDIN_PAGE_STATS",
    title: "LinkedIn Company Authority & Followers",
    category: "Social Analytics",
    description: "Follower growth, page views, visitor demographics, and post impressions.",
    icon: Share2,
    defaultWidth: 1,
    tags: ["Social", "LinkedIn", "B2B"],
    providerRequired: "LINKEDIN_COMPANY",
  },
];

const CATEGORIES = [
  "Popular",
  "Google",
  "AI Discovery",
  "SEO",
  "Reviews",
  "Social Analytics",
  "Custom",
];

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (widget: WidgetItem) => void;
  activeWidgetTypes: string[];
}

export function AddWidgetModal({
  isOpen,
  onClose,
  onAddWidget,
  activeWidgetTypes,
}: AddWidgetModalProps) {
  const [selectedCategory, setSelectedCategory] = useState("Popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [addedTypes, setAddedTypes] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const filteredWidgets = WIDGET_CATALOG.filter((w) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedCategory === "Popular") {
      return (
        w.type === "GSC_QUERIES_TABLE" ||
        w.type === "GA4_AI_TRAFFIC" ||
        w.type === "GBP_LOCAL_PERFORMANCE" ||
        w.type === "AEO_CITATION_SHARE" ||
        w.type === "GBP_REVIEWS_FEED" ||
        w.type === "WORDPRESS_AIVISION_STATUS"
      );
    }

    return w.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const handleAdd = (widget: WidgetItem) => {
    onAddWidget(widget);
    setAddedTypes((prev) => new Set([...prev, widget.type]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex h-[620px] w-full max-w-4xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-blue-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add Monitoring Widget</h2>
              <p className="text-xs text-slate-400">
                Connect and pin live intelligence metrics to your executive dashboard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="border-b border-slate-800 px-6 py-3 bg-slate-950/40">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search widgets (e.g. Google Search Console, AI referrals, Map views, Reviews...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content Body: Sidebar Categories + Grid */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Category Sidebar (Cyfe-style) */}
          <div className="w-52 border-r border-slate-800 bg-slate-950/50 p-3 space-y-1 overflow-y-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full text-left rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Right Widget List */}
          <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-900/40">
            {filteredWidgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Globe className="h-8 w-8 mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium">No widgets found in this category.</p>
              </div>
            ) : (
              filteredWidgets.map((widget) => {
                const Icon = widget.icon;
                const isAdded = activeWidgetTypes.includes(widget.type) || addedTypes.has(widget.type);

                return (
                  <div
                    key={widget.type}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 transition hover:border-slate-700 hover:bg-slate-850"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{widget.title}</h4>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            {widget.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {widget.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          {widget.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-slate-950 px-1.5 py-0.5 text-[10px] text-slate-500"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAdd(widget)}
                      disabled={isAdded}
                      className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                        isAdded
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default"
                          : "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/20"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" /> Add
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
