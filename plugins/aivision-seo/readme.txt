=== AIVision SEO ===
Contributors:      aivisionseo
Tags:              seo, aeo, geo, ai, schema, generative engine optimization, answer engine optimization, structured data, sitemap, llms-txt
Requires at least: 6.0
Tested up to:      6.5
Requires PHP:      8.0
Stable tag:        1.6.3
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

The first all-in-one plugin built for Search Engines (SEO), Answer Engines (AEO), and Generative AI Engines (GEO).

== Description ==

**AIVision SEO** analyzes your WordPress content across the 3 modern discovery pillars and provides a prioritized **Action Plan ("What to Do")**:

* **📊 SEO Score (Search Engine Optimization)** — Classic on-page optimization for Google & Bing: title, meta description, keyword density, heading hierarchy, image alts, and internal linking.
* **💬 AEO Score (Answer Engine Optimization)** — Winning Featured Snippets & Voice Search (Google AI Overviews, Siri, Perplexity): direct 40–60 word answer paragraphs, question-led H2/H3s, step-by-step ordered lists (`<ol>`), and FAQPage schemas.
* **🤖 GEO Score (Generative Engine Optimization)** — Maximizing citation and synthesis in LLMs (OpenAI ChatGPT/SearchGPT & Google Gemini): high statistical data density, authoritative citations, E-E-A-T credentials, `/llms.txt` machine feeds, and AI crawler access.

=== Core Features ===

**🎯 3-Pillar Dual Scoring & Real-time Gauges**
Real-time **SEO**, **AEO**, and **GEO** scores displayed in circular SVG gauges inside the post editor. Every check is weighted, explained, and live-updated as you write.

**💡 Prioritized Action Plan ("What to Do")**
Direct actionable advice categorized into:
* 🔴 **High Priority**: Immediate rank & AI citation boosters (e.g., adding direct answer blocks or critical schemas).
* 🟡 **Medium Priority**: Structural and depth enhancements (e.g., statistical data points, ordered lists).
* 🟢 **Passed Signals**: Factors already meeting top industry standards.

**🤖 Auto-Optimized robots.txt**
1-click automated rule generator that configures the optimal Allow/Disallow policies for 20+ search and AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`, `Meta-ExternalAgent`), while preventing crawler traps.

**📄 Standard LLMs.txt & LLMs-Full.txt Feeds**
Dynamic `/llms.txt` and `/llms-full.txt` endpoints adhering to the official [llmstxt.org](https://llmstxt.org/) specification, including automatic sitewide FAQ extraction from schemas.

**🏷️ Schema.org Generator (14 types)**
One-click JSON-LD generation for:
FAQPage, Article, BlogPosting, LocalBusiness, MedicalBusiness, Product, Service, HowTo, BreadcrumbList, Organization, Person (Author/Expert), WebSite, Review, Event, VideoObject.

**🗺️ Native XML Sitemap**
Built-in dynamic `/sitemap.xml` with automatic homepage duplicate suppression and fast cached SQL queries.

**⚡ Auto-Pilot Blog Generator**
Automated keyword, topic, and YouTube transcript-based content creation optimized for both search rankings and GEO visibility.

**📣 Social / Open Graph**
OG image picker with featured image fallback, Twitter Card settings, and live SERP preview.

**📈 Content Dashboard & Post Columns**
Overview of all published posts with `SEO | AEO | GEO` score badge columns directly inside the standard WordPress "All Posts" and "All Pages" list tables.

== Installation ==

1. Upload the `aivision-seo` folder to `/wp-content/plugins/`
2. Activate the plugin through the **Plugins** menu
3. Visit **AIVision SEO → Settings** to configure your site type and Site AI Bio
4. Click **⚡ Auto-Optimize robots.txt** to set optimal crawler policies
5. Open any post/page and use the **AIVision SEO** meta box to view your SEO, AEO, and GEO scores and follow the **Action Plan**

== Frequently Asked Questions ==

= What is the difference between SEO, AEO, and GEO? =
* **SEO**: Ranks your pages in classic search engine result pages (Google, Bing).
* **AEO**: Optimizes content for direct answers, featured snippets, and voice assistants (Siri, Alexa, Google AI Overviews).
* **GEO**: Optimizes content to be synthesized, cited, and referenced by LLMs (OpenAI ChatGPT & Google Gemini).

= Does it include standard /llms.txt and /llms-full.txt feeds? =
Yes! AIVision SEO dynamically generates both `/llms.txt` (curated index with aggregated FAQs) and `/llms-full.txt` (full markdown body feed) conforming to the llmstxt.org standard.

= Does this conflict with RankMath or Yoast? =
AIVision SEO can be used alongside other SEO plugins, but you should disable duplicate meta tag output. We recommend using AIVision SEO as your primary SEO, AEO, and GEO optimizer.

== Changelog ==

= 1.6.6 =
* Fixed 1-Click Fix admin actions (Generate Sitemap XML, llms.txt, robots.txt, etc.) showing the unhelpful message "Error generating [x]: error" whenever the AJAX request itself failed. Now shows the real HTTP status and response snippet (e.g. a 403 from a security plugin, a 500 from a PHP error, or a timeout) so the actual cause is visible instead of jQuery's generic "error" placeholder.

= 1.6.5 =
* Fixed "Unknown fix_type" errors on every 1-Click Fix / Auto-Fix All on WordPress action -- the AIVisibility SEO dashboard was calling this plugin's apply-fix endpoint with fix type names it never recognized, so schema, robots.txt, and llms.txt fixes always failed.
* Fixed the Schema.org 1-Click Fix silently doing nothing on the live site -- it saved settings that nothing ever read back out. Site-wide LocalBusiness/Organization/FAQPage JSON-LD now actually renders in the page head.
* Multiple site-wide schema types (e.g. LocalBusiness and FAQPage) can now be active at the same time instead of the latest one overwriting the other.

= 1.6.4 =
* Fixed a fatal PHP error in the /status and /telemetry REST endpoints on any request without a valid API token (hash_equals() was called with a non-string argument on PHP 8, crashing the site instead of returning a clean 401).
* Fixed telemetry sync calling a removed AIVision_Analyzer::analyze() method, which fatally crashed every /telemetry request since v1.6.2 -- content SEO/AEO/GEO scores were never actually reaching the AIVisibility SEO dashboard even though they computed correctly in the WordPress admin.

= 1.6.3 =
* Added native WordPress Core automatic updates integration with remote version checker.
* Direct integration with pre_set_site_transient_update_plugins and plugins_api for seamless 1-click updates.
* Enabled automated background updates via WordPress WP-Cron (auto_update_plugin).
* Added 1-Click "Check for Updates" button and "Auto-Updates Enabled" status badge in Settings.
* In-app admin update banner notifications when a new release is available on AIVisibility Cloud.

= 1.6.2 =
* Added dynamic version indicator badge next to plugin and cloud integration titles in admin settings.
* Enhanced UI clarity displaying active plugin release across all administration views.

= 1.6.1 =
* Rebranded all cloud integration interfaces, cards, and endpoints to AIVisibility SEO.
* Replaced BrandOS integration module with unified AIVisibility_Integration controller.
* Seamless migration preserving existing active API keys and connection tokens.
* Added bidirectional telemetry sync and remote fix dispatcher under AIVisibility SEO branding.

= 1.6.0 =
* Integrated autonomous AIVisibility SEO platform-side audit remediation with 1-click execution.
* Added Autonomous Content Autopilot execution engine with scheduled background sync via BullMQ.
* Added live REST bridge endpoint for bidirectional audit synchronization and status telemetry.
* Standardized version tracking registry (versions.json) and versioned zip distribution archives (aivision-seo-v1.6.0.zip).

= 1.5.0 =
* Streamlined GEO LLM Platform scoring to focus on OpenAI (ChatGPT/SearchGPT) and Google Gemini.
* Removed legacy Perplexity and Claude platform readiness cards to maintain parity with AIVisibility SEO SaaS platform.
* Updated AI crawler recommendations to prioritize GPTBot, OAI-SearchBot, and Google-Extended.
* Automated version control across plugin metadata and build artifact filenames.

= 1.4.1 =
* Added dynamic Content Optimization & Quality filter center to Dashboard.
* Filter content by Quality / Score Status (Low Quality < 50%, Needs Optimization, Fair 50-74%, Highly Optimized 75%+, Missing Schema, Missing Focus Keyword).
* Filter content by Post Type (Posts, Pages, or All).
* Sort content by Lowest Overall Score, Lowest SEO, Lowest AEO, Lowest GEO, Highest Score, or Latest Date.
* Live real-time title & keyword search with responsive counts and quick-filter pills.

= 1.4.0 =
* Streamlined Dashboard: unified Overview with 3-Pillar core stats, recent content optimization table, and actionable AEO/GEO guidelines.
* Removed legacy Auto-Pilot blog module and standalone Schema Generator page in favor of the direct in-editor visual and code schema builder on single post/page views.
* Enhanced asset versioning and cache busting for instant live admin updates.

= 1.3.0 =
* Full 3-Pillar Content Analysis (SEO, AEO, GEO) with real-time SVG circular scoring gauges.
* Added Prioritized Action Plan ("What to Do") with actionable High, Medium, and Good recommendations.
* Added 1-Click Auto-Optimized `robots.txt` generator and preview for top AI bots and search engines.
* Added `/llms.txt` and dynamic `/llms-full.txt` feeds conforming to the llmstxt.org standard.
* Added SEO, AEO, and GEO score columns to standard WordPress "All Posts" and "All Pages" list tables.
* Added generator tag removal hook, default robots fallback, and automatic featured image OpenGraph fallback.
* Added UTF-8 multibyte character support and phrase-weighted keyword density analysis.
* Hardened post meta saving against autosaves and revisions, and ensured clean schema deletion.

= 1.2.0 =
* Added AI Auto-Pilot generator and schema enhancements.
* Added support for Applebot-Extended, OAI-SearchBot, and Claude-Web crawler directives.

= 1.1.0 =
* Added dynamic XML Sitemap and robots.txt preview tool.
* Added OpenGraph and Twitter Card social preview metadata.

= 1.0.0 =
* Initial release.

== Upgrade Notice ==

= 1.4.1 =
Added dynamic Content Optimization & Quality filtering and sorting to the Dashboard with real-time search and quality status pills.
