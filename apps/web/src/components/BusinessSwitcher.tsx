"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Search,
  ExternalLink,
  Settings,
  Sparkles,
  RefreshCw,
  X,
  AlertCircle,
  Briefcase,
  Layers,
} from "lucide-react";
import { businessApi, BusinessItem } from "@/lib/api";

const TIER_LIMITS: Record<string, { max: number; label: string; color: string }> = {
  FREE: { max: 1, label: "Free", color: "bg-zinc-800 text-zinc-400 border-zinc-700" },
  STARTER: { max: 1, label: "Starter", color: "bg-zinc-800 text-zinc-300 border-zinc-700" },
  GROWTH: { max: 3, label: "Pro Growth", color: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  AGENCY: { max: 15, label: "Agency", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
};

export function BusinessSwitcher() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [currentBusiness, setCurrentBusiness] = useState<BusinessItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Business Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    website: "",
    city: "",
    industry: "Professional Services",
  });
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadBusinesses = async () => {
    try {
      const [listRes, curRes] = await Promise.all([
        businessApi.list().catch(() => []),
        businessApi.current().catch(() => null),
      ]);

      const list = Array.isArray(listRes) && listRes.length > 0 ? listRes : [];
      setBusinesses(list);

      // Determine active business
      let savedId: string | null = null;
      try {
        savedId = localStorage.getItem("brandos_active_business_id");
      } catch {
        // ignore
      }

      let active = list.find((b) => b.id === savedId);
      if (!active && curRes?.id) {
        active = list.find((b) => b.id === curRes.id) || curRes;
      }
      if (!active && list.length > 0) {
        active = list[0];
      }

      if (active) {
        setCurrentBusiness(active);
        try {
          localStorage.setItem("brandos_active_business_id", active.id);
          document.cookie = `brandos_active_business_id=${active.id}; path=/; max-age=31536000; SameSite=Lax`;
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error("Failed to load businesses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setShowAddModal(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelectBusiness = async (biz: BusinessItem) => {
    if (currentBusiness?.id === biz.id) {
      setIsOpen(false);
      return;
    }

    setSwitching(true);
    setCurrentBusiness(biz);
    setIsOpen(false);

    try {
      localStorage.setItem("brandos_active_business_id", biz.id);
      document.cookie = `brandos_active_business_id=${biz.id}; path=/; max-age=31536000; SameSite=Lax`;
      await businessApi.switch(biz.id).catch(() => {});

      window.dispatchEvent(new CustomEvent("brandos:business-changed", { detail: biz }));
      // Reload page to rehydrate all widgets and active views
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch workspace:", err);
      setSwitching(false);
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;

    setAddBusy(true);
    setAddError("");

    try {
      const newBiz = await businessApi.create({
        name: addForm.name.trim(),
        website: addForm.website.trim() || undefined,
        city: addForm.city.trim() || undefined,
        industry: addForm.industry || "Professional Services",
      });

      localStorage.setItem("brandos_active_business_id", newBiz.id);
      document.cookie = `brandos_active_business_id=${newBiz.id}; path=/; max-age=31536000; SameSite=Lax`;

      setShowAddModal(false);
      window.dispatchEvent(new CustomEvent("brandos:business-changed", { detail: newBiz }));
      window.location.reload();
    } catch (err: any) {
      setAddError(err?.message || "Failed to create workspace.");
      setAddBusy(false);
    }
  };

  const currentTier = (currentBusiness?.subscriptionTier as string) || "STARTER";
  const tierConfig = TIER_LIMITS[currentTier] || TIER_LIMITS.STARTER;
  const filtered = businesses.filter((b) =>
    (b.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.city || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.industry || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.website || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={switching}
          className="flex items-center gap-2 sm:gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-zinc-100 shadow-sm backdrop-blur-md transition hover:border-zinc-700 hover:bg-zinc-850 focus:outline-none"
          title="Switch active business workspace"
        >
          {loading ? (
            <div className="flex items-center gap-2 py-0.5">
              <RefreshCw className="h-4 w-4 animate-spin text-zinc-400" />
              <span className="text-zinc-400 text-xs sm:text-sm">Loading...</span>
            </div>
          ) : (
            <>
              {/* Business Monogram Avatar */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 text-xs font-bold text-white shadow-sm border border-violet-400/30">
                {(currentBusiness?.name || "B").substring(0, 2).toUpperCase()}
              </div>

              {/* Business Name & Indicator */}
              <div className="flex flex-col text-left max-w-[110px] min-[400px]:max-w-[150px] sm:max-w-[210px]">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="truncate font-semibold text-white text-xs sm:text-sm">
                    {currentBusiness?.name || "Select Workspace"}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs text-zinc-400 font-normal truncate">
                  {currentBusiness?.website
                    ? currentBusiness.website.replace(/^https?:\/\//, "").replace(/\/$/, "")
                    : currentBusiness?.city || "Active Workspace"}
                </span>
              </div>

              {/* Plan Pill */}
              <span
                className={`hidden md:inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-wider ${tierConfig.color}`}
              >
                {tierConfig.label}
              </span>

              <ChevronDown
                className={`h-4 w-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
                  isOpen ? "rotate-180 text-white" : ""
                }`}
              />
            </>
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl border border-zinc-800 bg-zinc-950 p-2.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header & Quota */}
            <div className="px-2 py-2 border-b border-zinc-850 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-violet-400" />
                  Your Workspaces ({businesses.length})
                </span>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {tierConfig.label} Plan: {businesses.length} of {tierConfig.max} profiles used
                </p>
              </div>

              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tierConfig.color}`}
              >
                {tierConfig.label}
              </span>
            </div>

            {/* Search Filter if more than 3 businesses */}
            {businesses.length > 3 && (
              <div className="relative mt-2 mb-1 px-1">
                <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter businesses by name, city, website..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-violet-500"
                />
              </div>
            )}

            {/* List of Businesses */}
            <div className="max-h-64 overflow-y-auto py-1 space-y-1 pr-0.5">
              {filtered.map((b) => {
                const isActive = currentBusiness?.id === b.id;
                const bTier = TIER_LIMITS[b.subscriptionTier || "STARTER"] || TIER_LIMITS.STARTER;

                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBusiness(b)}
                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                      isActive
                        ? "bg-violet-600/15 text-violet-200 font-semibold border border-violet-500/30"
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isActive
                            ? "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-sm"
                            : "bg-zinc-850 text-zinc-400 border border-zinc-700"
                        }`}
                      >
                        {(b.name || "B").substring(0, 2).toUpperCase()}
                      </div>

                      <div className="flex flex-col truncate">
                        <span className="font-semibold text-white truncate text-xs">{b.name}</span>
                        <span className="text-[10px] text-zinc-400 truncate">
                          {b.website
                            ? b.website.replace(/^https?:\/\//, "").replace(/\/$/, "")
                            : b.city || b.industry || "Workspace"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${bTier.color}`}
                      >
                        {bTier.label}
                      </span>
                      {isActive && <Check className="h-4 w-4 text-violet-400" />}
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="py-6 text-center text-xs text-zinc-500">
                  No workspaces match "{searchQuery}"
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="mt-2 border-t border-zinc-850 pt-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowAddModal(true);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 py-2 text-xs font-semibold text-violet-300 hover:text-violet-200 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create New Business Workspace</span>
              </button>

              <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-zinc-400">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-1 hover:text-white transition"
                >
                  <Settings className="h-3 w-3 text-zinc-500" />
                  <span>Workspace Settings & NAP</span>
                </Link>

                <Link
                  href="/pricing"
                  onClick={() => setIsOpen(false)}
                  className="text-violet-400 hover:text-violet-300 transition flex items-center gap-1 font-medium"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Upgrade Plan</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Business Workspace Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create New Business Workspace</h3>
                <p className="text-xs text-zinc-400">
                  Add another business profile or client website to your AIVisibility SEO account.
                </p>
              </div>
            </div>

            {addError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBusiness} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Business / Brand Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Health Partners"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://apexhealth.com"
                  value={addForm.website}
                  onChange={(e) => setAddForm({ ...addForm, website: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    City & State
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Austin, TX"
                    value={addForm.city}
                    onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Industry Vertical
                  </label>
                  <select
                    value={addForm.industry}
                    onChange={(e) => setAddForm({ ...addForm, industry: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-violet-500"
                  >
                    <option value="Professional Services">Professional Services</option>
                    <option value="Dental & Healthcare">Dental & Healthcare</option>
                    <option value="Home Services & Trades">Home Services & Trades</option>
                    <option value="Restaurants & Food">Restaurants & Food</option>
                    <option value="Legal & Financial">Legal & Financial</option>
                    <option value="Automotive & Transport">Automotive & Transport</option>
                    <option value="General Business">General Business</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-850 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBusy || !addForm.name.trim()}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 transition disabled:opacity-50"
                >
                  {addBusy ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create Workspace</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
