import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | BrandOS Eye",
  description: "Learn how BrandOS Eye collects, uses, protects, and handles your data and Google/Meta integration data.",
};

export default function PrivacyPolicyPage() {
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
            <Link href="/terms" className="text-slate-400 hover:text-white">Terms of Service</Link>
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
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Last updated: August 24, 2026 · Effective Date: August 24, 2026
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-slate-300">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">1. Introduction</h2>
            <p>
              Welcome to <strong>BrandOS Eye</strong> (&quot;BrandOS&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), operated at{" "}
              <a href="https://brandoseye.com" className="text-blue-400 underline">https://brandoseye.com</a>. We are committed to safeguarding your privacy and ensuring you have a transparent, secure experience when using our AI search visibility, SEO audit, and omnichannel growth platform.
            </p>
            <p className="mt-3">
              This Privacy Policy explains what personal data and business information we collect, how we use and protect it, and your rights regarding your information.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-white">A. Account & Profile Data:</h3>
                <p className="text-slate-400 mt-1">
                  When you register for BrandOS Eye, we collect your name, email address, company or business name, industry, website URL, phone number, and physical business address (for local NAP consistency analysis).
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white">B. Public Website & Domain Data:</h3>
                <p className="text-slate-400 mt-1">
                  When you submit a website for an automated scan, we evaluate public HTML metadata, OpenGraph tags, Schema.org structured data (JSON-LD), robots.txt rules, and llms.txt files.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white">C. Third-Party Integrations (OAuth Data):</h3>
                <p className="text-slate-400 mt-1">
                  If you voluntarily connect third-party platforms (such as Google Search Console, Google Analytics 4, Google Business Profile, Facebook, or Instagram), we collect authorized authentication tokens and aggregate performance telemetry (such as click counts, impressions, query rankings, and page review counts) to display your unified growth metrics.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-blue-400 mb-3">3. Google API User Data & Limited Use Disclosure</h2>
            <p>
              BrandOS Eye&#39;s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline font-medium"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <ul className="mt-4 list-disc pl-5 space-y-2 text-slate-300">
              <li>
                <strong>Purpose of Data Access:</strong> We request read-only access to your Google Search Console, Google Analytics 4, and Google Business Profile data solely to calculate your online search visibility score, identify indexing issues, track AI chatbot referrals, and display growth trends on your dashboard.
              </li>
              <li>
                <strong>No Selling of Data:</strong> We never sell your Google user data, search console queries, or analytics statistics to third parties, advertisers, or data brokers under any circumstances.
              </li>
              <li>
                <strong>No AI Training on Private Data:</strong> We do not use Google user data to train generalized AI or machine learning models.
              </li>
              <li>
                <strong>Human Review:</strong> No humans read your private Google data unless you provide explicit consent to our technical team for diagnostic troubleshooting.
              </li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">4. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-300">
              <li>To provide, personalize, and operate the BrandOS Eye platform and audit engine.</li>
              <li>To simulate and measure your business visibility across AI search assistants (ChatGPT, Claude, Perplexity, Gemini).</li>
              <li>To generate automated Schema.org structured data, llms.txt manifests, and review response recommendations.</li>
              <li>To send essential transactional notifications (welcome onboarding, password resets, website checkup alerts, weekly growth summaries).</li>
              <li>To maintain platform security, prevent abuse, and comply with legal obligations.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">5. Data Retention & Revocation</h2>
            <p>
              We retain your account data and historical metrics for as long as your account remains active. You can disconnect your Google or Meta accounts at any time directly from the{" "}
              <Link href="/dashboard/integrations" className="text-blue-400 underline">
                Integrations Settings
              </Link>{" "}
              page in your dashboard.
            </p>
            <p className="mt-3">
              You can also revoke BrandOS Eye&#39;s access to your Google account at any time via your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                Google Security Settings
              </a>. Upon revocation or account deletion, all associated stored tokens and metrics caches are permanently deleted from our database.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">6. Security Measures</h2>
            <p>
              We employ industry-standard security protocols, including AES-256 token encryption at rest, mandatory TLS/HTTPS encryption in transit across all endpoints, strict firewall isolation, and role-based access controls to safeguard your data.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-3">7. Contact Information</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact our Data Protection Team at:
            </p>
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-blue-300">
              <p><strong>BrandOS Eye Privacy & Security</strong></p>
              <p>Email: <a href="mailto:support@brandoseye.com" className="underline text-white">support@brandoseye.com</a></p>
              <p>Website: <a href="https://brandoseye.com" className="underline text-white">https://brandoseye.com</a></p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-8 text-center text-xs text-slate-500">
        <div className="flex justify-center gap-6 mb-3">
          <Link href="/" className="hover:text-slate-300">Home</Link>
          <Link href="/pricing" className="hover:text-slate-300">Pricing</Link>
          <Link href="/privacy" className="text-blue-400 font-semibold">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-300">Terms of Service</Link>
        </div>
        <p>© 2026 BrandOS Eye · AI Visibility Operating System for Small Business. All rights reserved.</p>
      </footer>
    </div>
  );
}
