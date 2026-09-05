"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Radar,
  ShieldCheck,
  MapPin,
  Code2,
  ArrowRight,
  Search,
  CheckCircle2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Page() {
  const [scanUrl, setScanUrl] = useState("");
  const router = useRouter();

  function handleHeroScan(e: React.FormEvent) {
    e.preventDefault();
    if (!scanUrl.trim()) return;
    router.push(`/scan?url=${encodeURIComponent(scanUrl.trim())}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 selection:bg-zinc-800 selection:text-white transition-colors duration-200">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold text-sm shadow-sm">
              B
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">BrandOS</span>
            <span className="hidden sm:inline-flex rounded-full border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-zinc-400">
              Presence & Search Engine
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/scan"
              className="hidden sm:inline-block text-xs font-medium text-slate-600 dark:text-zinc-400 transition hover:text-slate-950 dark:hover:text-white"
            >
              Free Scanner
            </Link>
            <Link
              href="/pricing"
              className="hidden sm:inline-block text-xs font-medium text-slate-600 dark:text-zinc-400 transition hover:text-slate-950 dark:hover:text-white"
            >
              Pricing
            </Link>
            <ThemeToggle />
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 transition hover:text-slate-950 dark:hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 px-3.5 py-1.5 text-xs font-semibold shadow-sm transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 border-b border-slate-200 dark:border-zinc-900">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 px-3.5 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300 shadow-sm">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Unified Search & Assistant Intelligence
          </div>

          <h1 className="mt-8 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-6xl sm:leading-[1.15]">
            Command how modern search <br />
            <span className="text-slate-500 dark:text-zinc-400">recommends your business.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-zinc-400 sm:text-base">
            Customers discover local businesses through Google Search, Maps, and AI-powered assistants. BrandOS audits your digital footprint, tracks ranking signals, and produces copy-paste code optimizations.
          </p>

          {/* Instant Scan Bar Hero Widget */}
          <form
            onSubmit={handleHeroScan}
            className="mx-auto mt-10 flex max-w-xl flex-col gap-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-2 shadow-xl dark:shadow-2xl sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                value={scanUrl}
                onChange={(e) => setScanUrl(e.target.value)}
                placeholder="Enter your business website (e.g. yourbusiness.com)"
                className="w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 py-2.5 pl-10 pr-4 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-slate-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-600"
              />
            </div>
            <button
              type="submit"
              disabled={!scanUrl.trim()}
              className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 px-5 py-2.5 text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <span>Run Presence Audit</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-6 text-[11px] text-slate-500 dark:text-zinc-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-zinc-400" /> Instant 4-pillar analysis
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-zinc-400" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-zinc-400" /> Ready-to-use schema fixes
            </span>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
            Engineered Capabilities
          </h2>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Built for performance, precision, and search visibility.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-6 transition hover:border-slate-300 dark:hover:border-zinc-700/80 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-300">
              <Radar className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Assistant Benchmarking</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
              Simulated customer prompt tests across ChatGPT, Claude, Gemini, and Perplexity to quantify citation frequency and brand sentiment.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-6 transition hover:border-slate-300 dark:hover:border-zinc-700/80 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Website & Schema Health</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
              Deep technical validation of Schema.org JSON-LD, `llms.txt` discovery manifests, AI crawler permissions in `robots.txt`, and mobile vitals.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-6 transition hover:border-slate-300 dark:hover:border-zinc-700/80 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-300">
              <MapPin className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Google Business & Maps</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
              Local Maps ranking signals, customer review velocity, profile completeness, and category optimization to capture local call intent.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-6 transition hover:border-slate-300 dark:hover:border-zinc-700/80 shadow-sm">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 text-slate-800 dark:text-zinc-300">
              <Code2 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">1-Click Code Fixes</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
              Actionable solutions generated directly for your CMS. Copy ready-to-paste JSON-LD structured data and automated review responses.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-zinc-900 px-6 py-10 text-center text-xs text-slate-500 dark:text-zinc-500 bg-white/50 dark:bg-zinc-950">
        <div className="flex justify-center gap-6 mb-3">
          <Link href="/" className="hover:text-slate-900 dark:hover:text-zinc-300 transition">Home</Link>
          <Link href="/scan" className="hover:text-slate-900 dark:hover:text-zinc-300 transition">Free Audit Scanner</Link>
          <Link href="/pricing" className="hover:text-slate-900 dark:hover:text-zinc-300 transition">Pricing</Link>
          <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-zinc-300 transition">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-900 dark:hover:text-zinc-300 transition">Terms of Service</Link>
        </div>
        <p>© 2026 BrandOS · Search Visibility & Presence Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}