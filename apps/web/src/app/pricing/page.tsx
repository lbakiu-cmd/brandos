"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiFetch } from "@/lib/api";

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
          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-300">
            Straightforward Pricing
          </span>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Choose Your Growth Plan
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-xs text-zinc-400 sm:text-sm leading-relaxed">
            All plans include automated Search Console tracking, local presence auditing, and technical schema fixes. 14-day free trial.
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
                  <h3 className="text-base font-semibold text-white">{plan.name}</h3>
                  <p className="mt-1.5 text-xs text-zinc-400 min-h-[36px] leading-relaxed">{plan.description}</p>

                  <div className="my-6">
                    <span className="text-4xl font-semibold tracking-tight text-white">${price}</span>
                    <span className="text-xs text-zinc-500"> / month</span>
                  </div>

                  <div className="space-y-3 pt-5 border-t border-zinc-800/80">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Included Capabilities:</p>
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
