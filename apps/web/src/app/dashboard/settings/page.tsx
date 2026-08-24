"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Business = {
  id: string;
  name: string;
  city: string | null;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
};

const VERTICALS = [
  {
    id: "Dental & Healthcare",
    icon: "🦷",
    label: "Dental & Healthcare",
    schema: "Dentist / MedicalClinic",
    eeat: "Patient Care & Clinical Authority",
    sampleQuery: "Emergency dentist in [City] with transparent pricing",
  },
  {
    id: "Home Services & Trades",
    icon: "🔧",
    label: "Home Services & Trades",
    schema: "Plumber / HVACBusiness / Contractor",
    eeat: "Field Experience & Licensed Trades",
    sampleQuery: "24/7 emergency plumber near me in [City]",
  },
  {
    id: "Restaurants & Food",
    icon: "🍕",
    label: "Restaurants, Cafes & Food",
    schema: "Restaurant / Cafe / Menu",
    eeat: "Culinary Authenticity & Sourcing",
    sampleQuery: "Best Italian dinner spots with outdoor seating in [City]",
  },
  {
    id: "Legal & Financial",
    icon: "⚖️",
    label: "Legal & Financial Services",
    schema: "LegalService / Attorney / Accounting",
    eeat: "Case Results & Bar Admissions",
    sampleQuery: "Top rated personal injury attorney in [City]",
  },
  {
    id: "Real Estate",
    icon: "🏡",
    label: "Real Estate & Brokerages",
    schema: "RealEstateAgent / Residence",
    eeat: "Neighborhood Market Expertise",
    sampleQuery: "Best real estate agents to sell a home in [City]",
  },
  {
    id: "Beauty & Wellness",
    icon: "💇",
    label: "Beauty Salons & Spas",
    schema: "BeautySalon / DaySpa",
    eeat: "Stylist Portfolios & Treatments",
    sampleQuery: "Top rated hair salon and facial spa in [City]",
  },
  {
    id: "Automotive & Repair",
    icon: "🚗",
    label: "Automotive & Mechanics",
    schema: "AutoRepair / AutoDealer",
    eeat: "Certified Technicians & Warranties",
    sampleQuery: "Trusted brake and transmission repair shop in [City]",
  },
  {
    id: "Professional Services",
    icon: "💼",
    label: "B2B & Consulting",
    schema: "ProfessionalService / Consulting",
    eeat: "Client Case Studies & ROI",
    sampleQuery: "Top business management consulting firm in [City]",
  },
];

const LOCAL_STORAGE_KEY = "brandos_nap_profile";

export default function SettingsPage() {
  const [form, setForm] = useState<Record<string, string>>({
    name: "",
    city: "",
    industry: "Dental & Healthcare",
    website: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 1. Preload from localStorage on mount, then sync with backend
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          setForm((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // Ignore localStorage read errors
    }

    apiFetch<Business>("/business")
      .then((b) => {
        if (b) {
          const freshData: Record<string, string> = {
            name: b.name || "",
            city: b.city || "",
            industry: b.industry || "Dental & Healthcare",
            website: b.website || "",
            phone: b.phone || "",
            email: b.email || "",
          };
          setForm(freshData);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(freshData));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn("Could not fetch business from API, using cached data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function save() {
    setBusy(true);
    setErrorMessage(null);
    try {
      const updated = await apiFetch<Business>("/business", {
        method: "PATCH",
        body: JSON.stringify(form),
      });

      if (updated) {
        const freshData: Record<string, string> = {
          name: updated.name || form.name || "",
          city: updated.city || form.city || "",
          industry: updated.industry || form.industry || "Dental & Healthcare",
          website: updated.website || form.website || "",
          phone: updated.phone || form.phone || "",
          email: updated.email || form.email || "",
        };
        setForm(freshData);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(freshData));
        } catch {}
      } else {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(form));
        } catch {}
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save changes. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const selectedVertical =
    VERTICALS.find((v) => v.id.toLowerCase() === (form.industry || "").toLowerCase()) ||
    VERTICALS.find((v) => (form.industry || "").toLowerCase().includes(v.id.toLowerCase().split(" ")[0])) ||
    VERTICALS[0];

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Business Settings & Vertical Intelligence</h1>
            <p className="mt-1 text-sm text-slate-400">
              Configure your business profile, contact details, and industry-specific AI discovery parameters.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">
              ← Back to Command Center
            </Link>
          </div>
        </header>

        {/* Status Alerts */}
        {saved && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Business profile & NAP settings updated and synchronized across all dashboards!
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm font-semibold text-red-400 animate-in fade-in">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Form (2 Cols) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Industry Vertical Selector */}
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur">
              <h2 className="text-lg font-bold text-white">1. Select Business Vertical / Industry</h2>
              <p className="mt-1 text-xs text-slate-400">
                BrandOS customizes all Schema.org markup, E-E-A-T audits, and AI search simulation prompts to this vertical.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {VERTICALS.map((v) => {
                  const isSelected = selectedVertical.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setForm({ ...form, industry: v.id })}
                      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                          : "border-slate-800/80 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40"
                      }`}
                    >
                      <span className="text-2xl">{v.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-white">{v.label}</p>
                          {isSelected && <span className="text-xs text-blue-400">● Active</span>}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{v.schema}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Core Details (NAP) */}
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">2. Business NAP & Identity</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Machine-readable Name, Address, Phone, and website used across audits, AI reports, and client PDFs.
                  </p>
                </div>
                {loading && (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">Business Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Apex Legal Group or Nobel Dental"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">City & Region</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Austin, TX or Tirana, Albania"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">Official Website URL</label>
                  <input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="e.g. https://apexlegalgroup.com"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">Direct Phone (NAP)</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. (512) 555-0199"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">Contact Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. contact@apexlegalgroup.com"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <button
                  onClick={save}
                  disabled={busy}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
                >
                  {busy ? "Saving Changes…" : "Save Business Profile"}
                </button>
                {saved && <span className="text-sm font-semibold text-emerald-400">✔ Saved successfully!</span>}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Active Vertical Preview (1 Col) */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-b from-blue-950/30 to-slate-900/60 p-6 backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedVertical.icon}</span>
                <div>
                  <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    Active Vertical Engine
                  </span>
                  <h3 className="text-lg font-bold text-white">{selectedVertical.label}</h3>
                </div>
              </div>

              <div className="mt-5 space-y-4 border-t border-slate-800 pt-4 text-xs">
                <div>
                  <p className="font-semibold text-slate-400">Target Schema.org Type</p>
                  <p className="mt-0.5 font-mono text-emerald-400">{selectedVertical.schema}</p>
                </div>

                <div>
                  <p className="font-semibold text-slate-400">E-E-A-T Focus Area</p>
                  <p className="mt-0.5 text-slate-200">{selectedVertical.eeat}</p>
                </div>

                <div>
                  <p className="font-semibold text-slate-400">Simulated High-Intent Query</p>
                  <p className="mt-0.5 rounded-lg bg-slate-950/80 p-2.5 italic text-slate-300">
                    "{selectedVertical.sampleQuery.replace("[City]", form.city || "your city")}"
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur">
              <h3 className="text-sm font-bold text-white">⚡ Quick Actions</h3>
              <ul className="mt-3 space-y-2 text-xs">
                <li>
                  <Link href="/dashboard/audit" className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-slate-300 hover:text-white">
                    <span>Re-run Omnichannel Audit</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/report" className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-slate-300 hover:text-white">
                    <span>View Executive Pitch PDF</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/integrations" className="flex items-center justify-between rounded-xl bg-blue-950/40 border border-blue-500/20 p-3 text-blue-300 hover:text-white">
                    <span className="font-semibold">🔌 WordPress &amp; AIVision SEO</span>
                    <span>→</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/competitors" className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 text-slate-300 hover:text-white">
                    <span>Benchmark Competitors</span>
                    <span>→</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}