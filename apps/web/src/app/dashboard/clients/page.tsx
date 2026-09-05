"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type ClientBusiness = {
  id: string;
  name: string;
  city: string | null;
  industry: string | null;
  website: string | null;
  phone: string | null;
  subscriptionTier: string;
  role: string;
  latestScore: number | null;
  reviewsCount: number;
  competitorsCount: number;
  createdAt: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [busy, setBusy] = useState(false);

  // New Client Form
  const [form, setForm] = useState({
    name: "",
    website: "",
    city: "",
    industry: "Professional Services",
    phone: "",
  });

  // White-Label Settings
  const [agencyName, setAgencyName] = useState("Acme Brand Agency");
  const [agencySaved, setAgencySaved] = useState(false);

  async function loadClients() {
    try {
      const list = await apiFetch<ClientBusiness[]>("/business/list");
      setClients(list);
    } catch {} finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function handleCreateClient() {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      await apiFetch("/business", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ name: "", website: "", city: "", industry: "Professional Services", phone: "" });
      setShowAddModal(false);
      await loadClients();
    } catch (err: any) {
      alert(err.message || "Failed to create client workspace.");
    } finally {
      setBusy(false);
    }
  }

  const scoreColor = (s: number | null) =>
    s === null
      ? "text-slate-500"
      : s >= 75
      ? "text-emerald-400"
      : s >= 50
      ? "text-amber-400"
      : "text-rose-400";

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100 md:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-400">
                Agency Tier Hub
              </span>
              <span className="text-xs text-slate-500">• {clients.length} Client Workspaces</span>
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Multi-Client Agency Management</h1>
            <p className="text-sm text-slate-400">
              Manage all client businesses, white-label client PDF reports, and switch workspaces in 1 click.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              ← Command Center
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500"
            >
              + Add Client Business
            </button>
          </div>
        </header>

        {/* White Label Agency Customization Banner */}
        <div className="mb-8 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-base font-bold text-white">🏢 White-Label Agency Branding</h2>
              <p className="mt-1 text-xs text-slate-400 max-w-xl">
                This agency header and custom branding will appear on all generated client audit PDFs and public scan links.
              </p>
            </div>
            <div className="flex w-full max-w-md items-center gap-3">
              <input
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Agency Name"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
              />
              <button
                onClick={() => {
                  setAgencySaved(true);
                  setTimeout(() => setAgencySaved(false), 2000);
                }}
                className="shrink-0 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
              >
                {agencySaved ? "✔ Saved" : "Save Branding"}
              </button>
            </div>
          </div>
        </div>

        {/* Client Roster Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Active Client Workspaces</h2>

          {loading ? (
            <p className="text-sm text-slate-500">Loading client workspaces…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {clients.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur transition hover:border-slate-700 hover:bg-slate-900/90"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                          {c.industry || "Local Business"}
                        </span>
                        <h3 className="mt-2 text-lg font-bold text-white">{c.name}</h3>
                        <p className="text-xs text-slate-400">{c.city || "City Unset"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500">Brand Score</span>
                        <p className={`text-2xl font-black ${scoreColor(c.latestScore)}`}>
                          {c.latestScore !== null ? `${c.latestScore}%` : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 border-t border-slate-800/60 pt-4 text-xs text-slate-400">
                      <p className="truncate">
                        🌐 {c.website ? <span className="text-slate-300">{c.website}</span> : "No website linked"}
                      </p>
                      <p>📞 {c.phone || "No phone listed"}</p>
                      <p>⭐ {c.reviewsCount} Reviews Tracked</p>
                      <p>🥊 {c.competitorsCount} Competitors Monitored</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2 border-t border-slate-800/60 pt-4">
                    <Link
                      href="/dashboard"
                      className="flex-1 rounded-xl bg-blue-600/20 py-2 text-center text-xs font-bold text-blue-400 hover:bg-blue-600/30"
                    >
                      Open Workspace →
                    </Link>
                    <Link
                      href="/dashboard/report"
                      className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                    >
                      PDF
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Add New Client Business</h3>
                <p className="text-xs text-slate-400">Creates a dedicated workspace with omnichannel audits & AI benchmarks.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Client Business Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Miami Horizon Law Firm"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300">City & State</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Miami, FL"
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-300">Industry / Vertical</label>
                  <select
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500"
                  >
                    <option>Dental & Healthcare</option>
                    <option>Home Services & Trades</option>
                    <option>Restaurants & Food</option>
                    <option>Legal & Financial</option>
                    <option>Real Estate</option>
                    <option>Beauty & Wellness</option>
                    <option>Automotive & Repair</option>
                    <option>Professional Services</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Website URL</label>
                <input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="e.g. https://miamihonorlaw.com"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Direct Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. (305) 555-0182"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-xl border border-slate-800 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateClient}
                disabled={busy || !form.name.trim()}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50"
              >
                {busy ? "Creating Client Workspace…" : "Create Workspace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
