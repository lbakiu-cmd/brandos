"use client";

import { useState } from "react";
import Link from "next/link";

const PLANS = [
  {
    id: "STARTER",
    name: "Starter Growth",
    priceMonthly: 49,
    priceAnnual: 470,
    badge: null,
    description: "Everything a single local business needs to dominate AI search and organic discovery.",
    features: [
      "1 Business Profile",
      "Unlimited 4-Channel AI & SEO Audits",
      "1-Click Code Artifacts (Schema JSON-LD, llms.txt)",
      "Multi-Channel Content Studio (50 posts/mo)",
      "Unified Customer Inbox (Instagram, Messenger)",
      "Standard LLM Citation Monitoring",
    ],
  },
  {
    id: "GROWTH",
    name: "AI Dominance",
    priceMonthly: 99,
    priceAnnual: 950,
    badge: "Most Popular",
    description: "For ambitious businesses that want to systematically outperform competitors in ChatGPT & Perplexity.",
    features: [
      "3 Business Locations / Profiles",
      "Competitor AI Head-to-Head Benchmarking",
      "Automated AI Google Review Responder",
      "Daily Multi-Engine LLM Citation Tracking",
      "Priority BullMQ Publishing Pipeline",
      "Executive PDF White-Label Reports",
      "Weekly AI Discovery Alerts",
    ],
  },
  {
    id: "AGENCY",
    name: "Agency & Enterprise",
    priceMonthly: 299,
    priceAnnual: 2870,
    badge: "For Agencies",
    description: "Scale AI optimization services across multiple client locations and agency teams.",
    features: [
      "15 Client Business Profiles",
      "Unlimited Competitor Tracking",
      "Full White-Label PDF Client Reports",
      "Custom Brand Logo on Client Audits",
      "Team Role Permissions (10 Seats)",
      "Dedicated Account Onboarding",
      "Priority API & Worker Queues",
    ],
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-bold text-white shadow-lg shadow-blue-500/25">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Brand<span className="text-blue-400">OS</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/scan" className="text-xs font-semibold text-slate-300 hover:text-white">
              Free Scanner
            </Link>
            <Link href="/login" className="text-xs font-semibold text-slate-300 hover:text-white">
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-12 text-center">
        <div className="mx-auto max-w-4xl px-6">
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-400">
            Simple, Transparent Pricing
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            Choose Your <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Growth Plan</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-400 sm:text-base">
            Start with our 14-day free trial. Cancel or switch plans anytime.
          </p>

          {/* Billing Switcher */}
          <div className="mt-8 inline-flex items-center rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs font-semibold">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={`rounded-lg px-5 py-2 transition ${
                billingCycle === "MONTHLY" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("ANNUAL")}
              className={`rounded-lg px-5 py-2 transition ${
                billingCycle === "ANNUAL" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              Annual Billing (Save 20%)
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-8 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const price = billingCycle === "MONTHLY" ? plan.priceMonthly : Math.round(plan.priceAnnual / 12);

            return (
              <div
                key={plan.id}
                className={`rounded-3xl border p-8 flex flex-col justify-between transition ${
                  plan.badge
                    ? "border-blue-500/50 bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 shadow-2xl relative"
                    : "border-slate-800 bg-slate-900/60"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <p className="mt-2 text-xs text-slate-400 min-h-[36px]">{plan.description}</p>

                  <div className="my-6">
                    <span className="text-5xl font-black text-white">${price}</span>
                    <span className="text-xs text-slate-400"> / month</span>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-800/80">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Included Features:</p>
                    <ul className="space-y-2.5 text-xs text-slate-300">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="text-emerald-400 font-bold shrink-0">✔</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800/80">
                  <Link
                    href={`/login?plan=${plan.id}`}
                    className={`block w-full text-center rounded-xl py-3.5 text-xs font-bold transition shadow-lg ${
                      plan.badge
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500"
                        : "border border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                    }`}
                  >
                    Start 14-Day Free Trial →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-8 text-center text-xs text-slate-500">
        <p>© 2026 BrandOS · AI Visibility & Small Business SaaS Platform.</p>
      </footer>
    </div>
  );
}
