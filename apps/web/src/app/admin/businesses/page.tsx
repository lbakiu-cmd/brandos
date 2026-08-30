"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Globe,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type BusinessItem = {
  id: string;
  name: string;
  city: string | null;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  subscriptionTier: string;
  role: string;
  latestScore: number | null;
  reviewsCount: number;
  competitorsCount: number;
  createdAt: string;
};

const SEED_BUSINESSES: BusinessItem[] = [
  {
    id: "biz_hq",
    name: "BrandOS Global Headquarters",
    city: "Austin, TX",
    industry: "SaaS & AI Technology",
    website: "https://brandoseye.com",
    phone: "(512) 555-0100",
    email: "superadmin@brandoseye.com",
    subscriptionTier: "ENTERPRISE",
    role: "SUPER_ADMIN",
    latestScore: 98,
    reviewsCount: 142,
    competitorsCount: 10,
    createdAt: new Date().toISOString(),
  },
  {
    id: "biz_1",
    name: "Nobel Dental Clinic",
    city: "Austin, TX",
    industry: "Dental & Healthcare",
    website: "https://dental-nobel.com",
    phone: "(512) 555-0199",
    email: "admin@dental-nobel.com",
    subscriptionTier: "PRO",
    role: "OWNER",
    latestScore: 78,
    reviewsCount: 38,
    competitorsCount: 4,
    createdAt: new Date(Date.now() - 3600000 * 24 * 14).toISOString(),
  },
  {
    id: "biz_2",
    name: "Apex Health Partners",
    city: "Dallas, TX",
    industry: "Medical & Specialist",
    website: "https://apexhealth.com",
    phone: "(512) 555-0144",
    email: "contact@apexhealth.com",
    subscriptionTier: "STARTER",
    role: "ADMIN",
    latestScore: 62,
    reviewsCount: 19,
    competitorsCount: 3,
    createdAt: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
  },
];

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>(SEED_BUSINESSES);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    website: "",
    city: "",
    industry: "Dental & Healthcare",
    phone: "",
    email: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await apiFetch<BusinessItem[]>("/business/list").catch(() => null);
      if (list && Array.isArray(list) && list.length > 0) {
        setBusinesses(list);
      }
    } catch (err: any) {
      console.error("Failed to load workspaces from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await apiFetch("/business", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setSuccessMsg(`Workspace "${form.name}" created successfully.`);
      setShowAddModal(false);
      setForm({
        name: "",
        website: "",
        city: "",
        industry: "Dental & Healthcare",
        phone: "",
        email: "",
      });
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create business workspace.");
    } finally {
      setBusy(false);
    }
  };

  const filtered = businesses.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.city && b.city.toLowerCase().includes(q)) ||
      (b.industry && b.industry.toLowerCase().includes(q)) ||
      (b.website && b.website.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Building2 className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Client Workspaces & Tenancy
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Overview of all active multi-tenant businesses, brand health scores, and subscription allocations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-purple-400" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Workspace</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/50 border border-emerald-800/60 p-4 text-xs text-emerald-200 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-950/50 border border-rose-800/60 p-4 text-xs text-rose-200 animate-in fade-in">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search & Grid */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search workspaces by name, city, industry, website..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-700/80 bg-slate-850 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between hover:border-purple-500/40 transition"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs border border-purple-400/30">
                      {b.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{b.name}</h3>
                      <p className="text-xs text-slate-400">{b.city || "No location set"}</p>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {b.subscriptionTier || "FREE"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 mt-4 border-t border-slate-800 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Industry:</span>
                    <span className="text-slate-300 font-medium">{b.industry || "General"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Website:</span>
                    <span className="text-slate-300 font-mono truncate max-w-[160px]">{b.website || "None"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Reviews & Competitors:</span>
                    <span className="text-slate-300 font-medium">
                      {b.reviewsCount} reviews • {b.competitorsCount} tracked
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Score: <strong className="text-purple-400">{b.latestScore !== null ? `${b.latestScore}/100` : "Baseline (45)"}</strong>
                </span>

                <Link
                  href="/dashboard"
                  className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300"
                >
                  <span>Open in App</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 text-xs">
              No workspaces found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Add Workspace Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-purple-900/40 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-400" />
                Create Business Workspace
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Health Clinic"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Website URL</label>
                <input
                  type="url"
                  placeholder="https://apexhealth.com"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Austin, TX"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="(512) 555-0199"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition disabled:opacity-50"
                >
                  {busy ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
