import Link from "next/link";

export const metadata = {
  title: "Terms of Service | BrandOS Eye",
  description: "Read the Terms and Conditions for using BrandOS Eye's AI search visibility and audit platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 font-bold text-white shadow-lg shadow-blue-500/25">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Brand<span className="text-blue-400">OS</span> Eye
            </span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/" className="text-slate-400 hover:text-white">Home</Link>
            <Link href="/pricing" className="text-slate-400 hover:text-white">Pricing</Link>
            <Link href="/privacy" className="text-slate-400 hover:text-white">Privacy Policy</Link>
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500 shadow-md shadow-blue-600/30"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
            Legal & Compliance
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Last updated: August 24, 2026 · Effective Date: August 24, 2026
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-slate-300">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using <strong>BrandOS Eye</strong> (&quot;the Platform&quot;), available at{" "}
              <a href="https://onlinepresence.space" className="text-blue-400 underline">https://onlinepresence.space</a>, you agree to be bound by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy. If you do not agree to these Terms, please do not use our Platform.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">2. Description of Services</h2>
            <p>
              BrandOS Eye provides small businesses, agencies, and marketers with AI search engine optimization (AIO/GEO) audits, Google Search Console & Google Analytics telemetry, Google Business Profile local rankings tracking, Schema.org code generation, automated WordPress integration, and omnichannel visibility diagnostics.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">3. Account Registration & Security</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>You must provide accurate, current, and complete information during registration.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.</li>
              <li>You agree to notify us immediately at <a href="mailto:support@onlinepresence.space" className="text-blue-400 underline">support@onlinepresence.space</a> of any unauthorized use of your account.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">4. Third-Party Integrations & APIs</h2>
            <p>
              Our platform allows you to connect third-party services including Google (Search Console, Analytics 4, Business Profile) and Meta. By connecting these accounts, you grant BrandOS Eye the authorized permissions necessary to fetch and display your marketing metrics. You can revoke this access at any time through your integration settings or third-party provider settings.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">5. Intellectual Property Rights</h2>
            <p>
              All code, designs, algorithms, user interfaces, trademarks, and documentation provided on BrandOS Eye are the exclusive property of BrandOS Eye and its licensors. You are granted a non-exclusive, non-transferable, revocable license to access and use the platform for your legitimate business operations.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">6. Subscription & Billing Terms</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>Paid subscriptions are billed on a recurring monthly or annual basis via Stripe.</li>
              <li>You may cancel your subscription at any time via your billing dashboard. Cancellations take effect at the end of the current paid billing period.</li>
              <li>Refunds are evaluated on a case-by-case basis according to our fair billing policy.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">7. Limitation of Liability</h2>
            <p>
              BrandOS Eye provides SEO recommendations, AI visibility assessments, and code snippets on an &quot;as-is&quot; and &quot;as-available&quot; basis. While our tools adhere to modern search engine guidelines and Schema.org standards, we do not guarantee specific organic ranking positions or traffic volumes, as third-party search engine algorithms are subject to autonomous change.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account if you violate these Terms or engage in abusive, illegal, or disruptive conduct on the Platform.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">9. Contact Us</h2>
            <p>
              If you have any questions regarding these Terms of Service, please contact our legal and support team:
            </p>
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-blue-300">
              <p><strong>BrandOS Eye Legal & Support</strong></p>
              <p>Email: <a href="mailto:support@onlinepresence.space" className="underline text-white">support@onlinepresence.space</a></p>
              <p>Website: <a href="https://onlinepresence.space" className="underline text-white">https://onlinepresence.space</a></p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-8 text-center text-xs text-slate-500">
        <div className="flex justify-center gap-6 mb-3">
          <Link href="/" className="hover:text-slate-300">Home</Link>
          <Link href="/pricing" className="hover:text-slate-300">Pricing</Link>
          <Link href="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
          <Link href="/terms" className="text-blue-400 font-semibold">Terms of Service</Link>
        </div>
        <p>© 2026 BrandOS Eye · AI Visibility Operating System for Small Business. All rights reserved.</p>
      </footer>
    </div>
  );
}
