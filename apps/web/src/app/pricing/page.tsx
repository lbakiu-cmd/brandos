"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiFetch } from "@/lib/api";

const COMMON_FEATURES = [
  "4-Pillar AI & Local SEO Presence Scanner",
  "Simulated Prompt Benchmarking (ChatGPT, Perplexity, Gemini, Claude)",
  "Google Search Console & GA4 AI Traffic Analytics",
  "Google Business Profile & Automated AI Review Responder",
  "1-Click Code Generation (Schema JSON-LD, /llms.txt, WordPress sync)",
  "Multi-Channel Content Studio & Scheduled Auto-Publishing",
  "Unified Customer Inbox (Instagram, Messenger)",
  "Multi-Engine LLM Citation Monitoring & Alerts",
  "Executive White-Label PDF Reports",
];

const PLANS = [
  {
    id: "STARTER",
    name: "Starter",
    priceMonthly: 25,
    priceAnnual: 240,
    badge: null,
    headline: "1 Business Workspace",
    description: "Single workspace/business with free website and business email. Full feature suite included.",
    features: [
      "1 Business Profile / Workspace",
      "Free Professional Website & Business Email",
      ...COMMON_FEATURES,
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    priceMonthly: 45,
    priceAnnual: 430,
    badge: "Most Popular",
    headline: "Up to 10 Businesses",
    description: "For multi-brand operators and growing teams managing up to 10 businesses with all features.",
    features: [
      "Up to 10 Business Profiles / Workspaces",
      ...COMMON_FEATURES,
    ],
  },
  {
    id: "AGENCY",
    name: "Agency",
    priceMonthly: 220,
    priceAnnual: 2100,
    badge: "For Agencies",
    headline: "Up to 50 Businesses",
    description: "Scale agency client management across up to 50 businesses with identical full capabilities.",
    features: [
      "Up to 50 Business Profiles / Workspaces",
      ...COMMON_FEATURES,
    ],
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  async function handleSelectPlan(tierId: string) {
    setLoadingTier(tierId);
    try {
      const res = await apiFetch<{ url?: string }>("/billing/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({
          tier: tierId,
          cycle: billingCycle.toLowerCase(),
          redirect: false,
        }),
      });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
    } catch {
      // If unauthorized or not logged in, route through login/signup with plan
    }
    window.location.href = `/login?plan=${tierId}&cycle=${billingCycle.toLowerCase()}`;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950 font-bold text-xs shadow-sm">
              AI
            </div>
            <span className="text-base font-semibold tracking-tight text-white">AIVisibility SEO</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/scan" className="text-xs font-medium text-zinc-400 hover:text-white transition">
              Free Scanner
            </Link>
            <ThemeToggle />
            <Link href="/login" className="text-xs font-medium text-zinc-300 hover:text-white transition">
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-12 text-center border-b border-zinc-900">
        <div className="mx-auto max-w-4xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 shadow-sm">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            All Features Included Across Every Plan · Same Full Power
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Choose Your Growth Plan
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-xs text-zinc-400 sm:text-sm leading-relaxed">
            All plans include 100% of our AI benchmarking, Search Console tracking, review automation, and technical schema tools. Starter Plan exclusively includes a free website and business email.
          </p>

          {/* Billing Switcher */}
          <div className="mt-8 inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-xs font-medium">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={`rounded-md px-4 py-1.5 transition ${
                billingCycle === "MONTHLY" ? "bg-white text-zinc-950 font-semibold shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("ANNUAL")}
              className={`rounded-md px-4 py-1.5 transition ${
                billingCycle === "ANNUAL" ? "bg-white text-zinc-950 font-semibold shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              Annual Billing (Save 20%)
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = billingCycle === "MONTHLY" ? plan.priceMonthly : Math.round(plan.priceAnnual / 12);

            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-7 flex flex-col justify-between transition ${
                  plan.badge
                    ? "border-zinc-700 bg-zinc-900/80 shadow-xl relative"
                    : "border-zinc-800/80 bg-zinc-900/40"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-0.5 text-[10px] font-medium text-zinc-200">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">{plan.name}</h3>
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      {plan.headline}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-zinc-400 min-h-[36px] leading-relaxed">{plan.description}</p>

                  <div className="my-6">
                    <span className="text-4xl font-semibold tracking-tight text-white">${price}</span>
                    <span className="text-xs text-zinc-500"> / month</span>
                    {billingCycle === "ANNUAL" && (
                      <span className="block text-[11px] text-zinc-400 mt-1">Billed annually (${plan.priceAnnual}/yr)</span>
                    )}
                  </div>

                  <div className="space-y-3 pt-5 border-t border-zinc-800/80">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Included In This Plan:</p>
                    <ul className="space-y-2 text-xs text-zinc-300">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-400 font-medium shrink-0">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loadingTier === plan.id}
                    className={`block w-full text-center rounded-lg py-2.5 text-xs font-semibold transition shadow-sm cursor-pointer ${
                      plan.badge
                        ? "bg-white text-zinc-950 hover:bg-zinc-200"
                        : "border border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-900"
                    } ${loadingTier === plan.id ? "opacity-75 cursor-wait" : ""}`}
                  >
                    {loadingTier === plan.id ? "Redirecting to Stripe..." : "Start 14-Day Free Trial"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 px-6 py-10 text-center text-xs text-zinc-500">
        <div className="flex justify-center gap-6 mb-3">
          <Link href="/" className="hover:text-zinc-300 transition">Home</Link>
          <Link href="/scan" className="hover:text-zinc-300 transition">Free Scanner</Link>
          <Link href="/pricing" className="hover:text-zinc-300 transition">Pricing</Link>
          <Link href="/privacy" className="hover:text-zinc-300 transition">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-zinc-300 transition">Terms of Service</Link>
        </div>
        <p>© 2026 AIVisibility SEO · Search Visibility & Presence Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
