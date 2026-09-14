"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type Plan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  features: string[];
  limits: {
    businesses: number;
    auditsPerMonth: number;
    competitors: number;
    scheduledPosts: number;
  };
};

type BillingStatus = {
  tier: string;
  status: string;
  currentPeriodEnd: string;
  hasStripeCustomer?: boolean;
  plan: Plan;
  allPlans: Plan[];
};

export default function BillingPage() {
  const [data, setData] = useState<BillingStatus | null>(null);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch<BillingStatus>("/billing/status");
      setData(res);
    } catch (err) {
      console.error("Failed to load billing status:", err);
    }
  }, []);

  useEffect(() => {
    refresh();

    // Check for success or canceled from Stripe redirect query params
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        setSuccessMessage("🎉 Subscription activated successfully! Welcome to your new plan.");
      } else if (params.get("canceled") === "true") {
        setErrorMessage("Checkout was canceled. Your plan remains unchanged.");
      }
    }
  }, [refresh]);

  async function handleUpgrade(targetTier: string) {
    setUpgradingTier(targetTier);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await apiFetch<{ url?: string }>("/billing/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({
          tier: targetTier,
          cycle: billingCycle.toLowerCase(),
          redirect: false,
        }),
      });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      throw new Error("Unable to initialize Stripe checkout session.");
    } catch (err: any) {
      console.error("Checkout creation failed:", err);
      setErrorMessage(err.message || "Failed to start checkout. Please try again or contact support.");
    } finally {
      setUpgradingTier(null);
    }
  }

  async function handleOpenPortal() {
    setOpeningPortal(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch<{ url?: string }>("/billing/create-portal-session", {
        method: "POST",
      });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      throw new Error("Unable to open customer billing portal.");
    } catch (err: any) {
      console.error("Billing portal error:", err);
      setErrorMessage(err.message || "Failed to load billing portal. Ensure you have an active subscription.");
    } finally {
      setOpeningPortal(false);
    }
  }

  const currentTier = data?.tier || "FREE";
  const plans = data?.allPlans || [];
  const hasPaidPlan = currentTier !== "FREE" || data?.hasStripeCustomer;

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Subscription & Plan Management</h1>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-bold text-blue-400">
              {currentTier} PLAN
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Scale your business discovery with higher audit frequencies, competitor intelligence, and automated AI responders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasPaidPlan && (
            <button
              onClick={handleOpenPortal}
              disabled={openingPortal}
              className="rounded-xl border border-blue-500/30 bg-blue-600/20 px-4 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 transition disabled:opacity-50"
            >
              {openingPortal ? "Loading Portal…" : "Manage Billing & Invoices ↗"}
            </button>
          )}
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {successMessage && (
        <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-400">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-400">
          {errorMessage}
        </div>
      )}

      {/* Current Plan Overview Card */}
      <section className="mb-10 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Subscription</span>
            <h2 className="mt-1 text-2xl font-black text-white">{data?.plan.name ?? "Free Discovery"}</h2>
            <p className="text-xs text-slate-400 mt-1">{data?.plan.description}</p>
          </div>

          <div className="text-right">
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
              {data?.status ? `${data.status.toUpperCase()} STATUS` : "ACTIVE STATUS"}
            </span>
            {currentTier !== "FREE" && (
              <p className="mt-2 text-xs text-slate-500">
                Renewal Date: {new Date(data?.currentPeriodEnd || Date.now()).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Quota Limits */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <span className="text-xs text-slate-400">Competitors Tracked</span>
            <p className="mt-1 text-xl font-bold text-white">Up to {data?.plan.limits.competitors ?? 1}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <span className="text-xs text-slate-400">Monthly AI Audits</span>
            <p className="mt-1 text-xl font-bold text-white">{data?.plan.limits.auditsPerMonth ?? 3} / mo</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <span className="text-xs text-slate-400">Scheduled Social Posts</span>
            <p className="mt-1 text-xl font-bold text-white">{data?.plan.limits.scheduledPosts ?? 5} / mo</p>
          </div>
        </div>
      </section>

      {/* Plan Switcher / Upgrade Grid */}
      <section>
        <div className="text-center mb-8">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-400">
            <span>✨</span> All features unlocked on every plan · Choose workspace capacity
          </div>
          <h2 className="text-2xl font-bold text-white">Available Plans & Upgrades</h2>
          <p className="mt-1 text-xs text-slate-400">All plans include 100% of platform tools & features. Starter Plan exclusively includes free website & business email.</p>

          <div className="mt-4 inline-flex items-center rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs font-semibold">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={`rounded-lg px-4 py-1.5 transition ${
                billingCycle === "MONTHLY" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("ANNUAL")}
              className={`rounded-lg px-4 py-1.5 transition ${
                billingCycle === "ANNUAL" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Annual Billing (Save 20%)
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.filter((p) => p.id !== "FREE").map((p) => {
            const isCurrent = currentTier === p.id || (p.id === "PRO" && currentTier === "GROWTH");
            const price = billingCycle === "MONTHLY" ? p.priceMonthly : Math.round(p.priceAnnual / 12);
            const isFeatured = p.id === "PRO" || p.id === "GROWTH";

            return (
              <div
                key={p.id}
                className={`rounded-3xl border p-6 flex flex-col justify-between transition ${
                  isFeatured
                    ? "border-blue-500/50 bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 shadow-2xl relative"
                    : "border-slate-800 bg-slate-900/60"
                }`}
              >
                {isFeatured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                    Most Popular
                  </span>
                )}

                <div>
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <p className="mt-1 text-xs text-slate-400 min-h-[32px]">{p.description}</p>

                  <div className="my-6">
                    <span className="text-4xl font-extrabold text-white">${price}</span>
                    <span className="text-xs text-slate-400"> / month</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-emerald-400">✔</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800/80">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 text-xs font-bold text-slate-400 cursor-default"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(p.id)}
                      disabled={upgradingTier === p.id}
                      className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition disabled:opacity-50"
                    >
                      {upgradingTier === p.id ? "Connecting to Checkout…" : `Subscribe to ${p.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
