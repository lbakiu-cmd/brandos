"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Page() {
  const [scanUrl, setScanUrl] = useState("");
  const router = useRouter();

  function handleHeroScan(e: React.FormEvent) {
    e.preventDefault();
    if (!scanUrl.trim()) return;
    router.push(`/scan?url=${encodeURIComponent(scanUrl.trim())}`);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-bold text-white shadow-lg shadow-blue-500/25">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Brand<span className="text-blue-400">OS</span></span>
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
              AI Visibility & Omnichannel Engine
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/scan"
              className="hidden sm:inline-block text-xs font-semibold text-slate-300 transition hover:text-white"
            >
              Free Scanner
            </Link>
            <Link
              href="/pricing"
              className="hidden sm:inline-block text-xs font-semibold text-slate-300 transition hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-300 transition hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.22),rgba(255,255,255,0))]"></div>
        <div className="mx-auto max-w-5xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-1.5 text-xs font-medium text-slate-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            AIO & GEO: Generative Engine Optimization is here
          </div>

          <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Own how AI search engines <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              recommend your business
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-400 sm:text-xl">
            ChatGPT, Perplexity, Claude, and Gemini shape how local customers buy. BrandOS audits your entire online footprint, calculates your unified BrandOS Score, and generates ready-to-copy code fixes.
          </p>

          {/* Instant Scan Bar Hero Widget */}
          <form
            onSubmit={handleHeroScan}
            className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-3 shadow-2xl backdrop-blur-md sm:flex-row"
          >
            <input
              type="text"
              value={scanUrl}
              onChange={(e) => setScanUrl(e.target.value)}
              placeholder="Enter your business website (e.g. acmedental.com)"
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={!scanUrl.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/30 transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
            >
              <span>⚡</span>
              <span>Audit in 10s Free</span>
            </button>
          </form>

          <p className="mt-3 text-xs text-slate-500">
            No credit card or login required · Instant 4-pillar analysis & score
          </p>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-2xl text-blue-400">
              🔮
            </div>
            <h2 className="text-lg font-bold text-white">AI Engine Benchmarking</h2>
            <p className="mt-2 text-xs text-slate-400">
              Live prompt testing against ChatGPT, Claude, Gemini, and Perplexity to measure citation frequency and sentiment.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-2xl text-cyan-400">
              🌐
            </div>
            <h2 className="text-lg font-bold text-white">Website AI & SEO Audit</h2>
            <p className="mt-2 text-xs text-slate-400">
              Validate Schema.org JSON-LD, `llms.txt` discovery manifests, AI crawler rules in `robots.txt`, and NAP signals.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-2xl text-purple-400">
              📍
            </div>
            <h2 className="text-lg font-bold text-white">Google Business Profile</h2>
            <p className="mt-2 text-xs text-slate-400">
              Local Maps ranking factors, review response velocity, profile completeness, and category optimizations.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl text-emerald-400">
              ⚡
            </div>
            <h2 className="text-lg font-bold text-white">1-Click Code & Copy Fixes</h2>
            <p className="mt-2 text-xs text-slate-400">
              Don't just view problems—get ready-to-use JSON-LD schema, `llms.txt`, and review response templates instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-8 text-center text-xs text-slate-500">
        <div className="flex justify-center gap-6 mb-3">
          <Link href="/" className="hover:text-slate-300">Home</Link>
          <Link href="/scan" className="hover:text-slate-300">Free Audit Scanner</Link>
          <Link href="/pricing" className="hover:text-slate-300">Pricing</Link>
          <Link href="/privacy" className="text-slate-400 hover:text-white transition">Privacy Policy</Link>
          <Link href="/terms" className="text-slate-400 hover:text-white transition">Terms of Service</Link>
        </div>
        <p>© 2026 BrandOS Eye · AI Visibility Operating System for Small Business. All rights reserved.</p>
      </footer>
    </div>
  );
}