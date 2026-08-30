import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@brandos/database";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class WordpressService {
  /**
   * Get or generate active WordPress connection details and API key for a business
   */
  async getConnection(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundException("Business not found.");
    }

    // Auto-generate API key if not set
    let apiKey = business.wordpressApiKey;
    if (!apiKey) {
      apiKey = `bos_live_${crypto.randomBytes(16).toString("hex")}`;
      await prisma.business.update({
        where: { id: businessId },
        data: { wordpressApiKey: apiKey },
      });
    }

    return {
      connected: !!(business.wordpressUrl && business.wordpressConnectedAt),
      wordpressUrl: business.wordpressUrl,
      wordpressSiteName: business.wordpressSiteName,
      wordpressPluginVersion: business.wordpressPluginVersion || "1.4.1",
      wordpressConnectedAt: business.wordpressConnectedAt,
      wordpressLastSyncedAt: business.wordpressLastSyncedAt,
      wordpressTelemetry: business.wordpressTelemetry,
      apiKey,
    };
  }

  /**
   * Regenerate API key for a business
   */
  async rotateApiKey(businessId: string) {
    const newApiKey = `bos_live_${crypto.randomBytes(16).toString("hex")}`;
    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        wordpressApiKey: newApiKey,
      },
    });

    return { apiKey: newApiKey };
  }

  /**
   * Handshake verification called by WordPress Plugin (POST /wordpress/verify)
   */
  async verifyFromPlugin(apiKey: string, payload: { site_url: string; site_name?: string; plugin_version?: string }) {
    if (!apiKey) {
      throw new BadRequestException("Missing API key.");
    }

    const cleanKey = apiKey.replace(/^Bearer\s+/i, "").trim();

    const business = await prisma.business.findFirst({
      where: { wordpressApiKey: cleanKey },
    });

    if (!business) {
      throw new BadRequestException("Invalid BrandOS API Key. Please verify in BrandOS settings.");
    }

    const cleanSiteUrl = payload.site_url ? payload.site_url.replace(/\/+$/, "") : "";

    await prisma.business.update({
      where: { id: business.id },
      data: {
        wordpressUrl: cleanSiteUrl,
        wordpressSiteName: payload.site_name || "WordPress Site",
        wordpressPluginVersion: payload.plugin_version || "1.4.1",
        wordpressConnectedAt: new Date(),
        wordpressLastSyncedAt: new Date(),
      },
    });

    return {
      success: true,
      business_id: business.id,
      business_name: business.name,
      message: `Successfully connected ${business.name} with AIVision SEO Plugin!`,
    };
  }

  /**
   * Connect initiated from BrandOS Dashboard
   */
  async connectFromDashboard(businessId: string, siteUrl: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException("Business not found.");

    let targetUrl = siteUrl.trim().replace(/\/+$/, "");
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    let apiKey = business.wordpressApiKey;
    if (!apiKey) {
      apiKey = `bos_live_${crypto.randomBytes(16).toString("hex")}`;
      await prisma.business.update({
        where: { id: businessId },
        data: { wordpressApiKey: apiKey },
      });
    }

    // Ping WordPress plugin handshake endpoint
    const endpoint = `${targetUrl}/wp-json/aivision-seo/v1/verify`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          api_key: apiKey,
          business_id: businessId,
          api_url: process.env.API_URL || "http://localhost:4000",
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`WordPress responded with status ${res.status}`);
      }

      const data = (await res.json()) as any;

      await prisma.business.update({
        where: { id: businessId },
        data: {
          wordpressUrl: targetUrl,
          wordpressSiteName: data.site_name || "WordPress Site",
          wordpressPluginVersion: data.plugin_version || "1.4.1",
          wordpressConnectedAt: new Date(),
          wordpressLastSyncedAt: new Date(),
        },
      });

      return {
        success: true,
        message: "Successfully connected to WordPress site!",
        site: data,
      };
    } catch (err: any) {
      // In local dev/offline, save connection anyway with pending status
      await prisma.business.update({
        where: { id: businessId },
        data: {
          wordpressUrl: targetUrl,
          wordpressSiteName: "WordPress Site",
          wordpressPluginVersion: "1.4.1",
          wordpressConnectedAt: new Date(),
          wordpressLastSyncedAt: new Date(),
        },
      });

      return {
        success: true,
        message: `Registered WordPress URL. (Note: could not verify remote endpoint directly: ${err?.message || "timeout"}. Make sure AIVision SEO plugin is active).`,
      };
    }
  }

  /**
   * Disconnect WordPress site
   */
  async disconnect(businessId: string) {
    await prisma.business.update({
      where: { id: businessId },
      data: {
        wordpressUrl: null,
        wordpressConnectedAt: null,
        wordpressLastSyncedAt: null,
        wordpressSiteName: null,
        wordpressTelemetry: null,
      },
    });

    return { success: true, message: "WordPress site disconnected." };
  }

  /**
   * Sync telemetry and post scoring from connected WordPress site
   */
  async sync(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.wordpressUrl) {
      throw new BadRequestException("WordPress is not connected for this business.");
    }

    const siteUrl = business.wordpressUrl.replace(/\/+$/, "");
    const apiKey = business.wordpressApiKey;

    try {
      const [statusRes, telemetryRes] = await Promise.all([
        fetch(`${siteUrl}/wp-json/aivision-seo/v1/status`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(8000),
        }).catch(() => null),
        fetch(`${siteUrl}/wp-json/aivision-seo/v1/telemetry`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(8000),
        }).catch(() => null),
      ]);

      const statusData = statusRes && statusRes.ok ? await statusRes.json() : null;
      const telemetryData = telemetryRes && telemetryRes.ok ? await telemetryRes.json() : null;

      const combinedTelemetry = {
        status: statusData,
        telemetry: telemetryData,
        syncedAt: new Date().toISOString(),
      };

      await prisma.business.update({
        where: { id: businessId },
        data: {
          wordpressLastSyncedAt: new Date(),
          wordpressPluginVersion: statusData?.plugin_version || business.wordpressPluginVersion || "1.4.1",
          wordpressSiteName: statusData?.site_name || business.wordpressSiteName,
          wordpressTelemetry: combinedTelemetry as any,
        },
      });

      return {
        success: true,
        message: "Successfully synchronized with WordPress site!",
        data: combinedTelemetry,
      };
    } catch (err: any) {
      throw new BadRequestException(`Failed to sync with WordPress: ${err?.message || "Unknown error"}`);
    }
  }

  /**
   * 1-Click Remote Fix Dispatcher: Send fix to connected WordPress site
   */
  async applyRemoteFix(
    businessId: string,
    fixPayload: {
      fix_type: "ROBOTS_TXT" | "LLMS_TXT_BIO" | "ADD_SCHEMA" | "FAQ_SCHEMA" | "LOCAL_BUSINESS_SCHEMA" | "GENERATE_FEEDS" | string;
      payload?: any;
    }
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.wordpressUrl) {
      throw new BadRequestException("WordPress site is not connected for this business. Please connect AIVision SEO plugin first.");
    }

    const siteUrl = business.wordpressUrl.replace(/\/+$/, "");
    const apiKey = business.wordpressApiKey;

    const endpoint = `${siteUrl}/wp-json/aivision-seo/v1/apply-fix`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(fixPayload),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.message || `WordPress HTTP status ${res.status}`);
      }

      const result = await res.json();
      return {
        success: true,
        message: result.message || "Fix successfully applied to WordPress site!",
        result,
      };
    } catch (err: any) {
      throw new BadRequestException(`Failed to apply fix in WordPress: ${err?.message || "Remote connection failed"}`);
    }
  }

  /**
   * AI Copilot & Content Auto-Publisher: Send post to WordPress
   */
  async publishPost(
    businessId: string,
    postData: {
      title: string;
      content: string;
      status?: "draft" | "publish" | "pending";
      meta_title?: string;
      meta_description?: string;
      focus_keyword?: string;
      schemas?: any[];
      categories?: (number | string)[];
      tags?: string[];
    }
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business || !business.wordpressUrl) {
      throw new BadRequestException("WordPress is not connected for this business.");
    }

    const siteUrl = business.wordpressUrl.replace(/\/+$/, "");
    const apiKey = business.wordpressApiKey;

    const endpoint = `${siteUrl}/wp-json/aivision-seo/v1/publish-post`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(postData),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `WordPress returned status ${res.status}`);
      }

      const result = await res.json();
      return {
        success: true,
        post: result,
        message: `Successfully pushed article to WordPress (${result.status || "draft"})!`,
      };
    } catch (err: any) {
      throw new BadRequestException(`Failed to publish post to WordPress: ${err?.message || "Connection error"}`);
    }
  }

  /**
   * Get Suggested & Live WordPress Categories for a Business
   */
  async getCategories(businessId: string) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException("Business not found.");

    const industry = (business.industry || "").toLowerCase();
    let suggested: string[] = [];

    if (industry.includes("dent") || industry.includes("medic") || industry.includes("clinic") || industry.includes("health")) {
      suggested = [
        "Dental Implants & Restorations",
        "Cosmetic Dentistry & Smile Design",
        "Teeth Whitening & Hygiene",
        "Emergency Dental Care",
        "Orthodontics & Clear Aligners",
        "Pediatric & Family Dentistry",
        "Preventative Care & Checkups",
        "Root Canal & Endodontics",
      ];
    } else if (industry.includes("plumb") || industry.includes("hvac") || industry.includes("roof") || industry.includes("contract") || industry.includes("home")) {
      suggested = [
        "Emergency 24/7 Repairs",
        "Seasonal Maintenance & Inspections",
        "Energy Efficiency & Upgrades",
        "New Installations & Replacements",
        "Pricing & Cost Breakdown Guides",
        "Troubleshooting & Pro Tips",
      ];
    } else if (industry.includes("law") || industry.includes("legal") || industry.includes("attorney") || industry.includes("tax") || industry.includes("finance")) {
      suggested = [
        "Personal Injury & Claims",
        "Estate Planning & Wills",
        "Business Law & Compliance",
        "Tax Strategies & Filings",
        "Legal Rights & Case Studies",
      ];
    } else if (industry.includes("restaur") || industry.includes("cafe") || industry.includes("food") || industry.includes("bistro")) {
      suggested = [
        "Seasonal Menus & Specials",
        "Farm-to-Table & Fresh Ingredients",
        "Private Events & Catering",
        "Chef Recipes & Behind the Scenes",
      ];
    } else if (industry.includes("salon") || industry.includes("spa") || industry.includes("beauty") || industry.includes("wellness")) {
      suggested = [
        "Skincare & Facial Treatments",
        "Hair Trends & Color Care",
        "Holistic Massage & Relaxation",
        "Daily Beauty Routines & Advice",
      ];
    } else if (industry.includes("auto") || industry.includes("car") || industry.includes("mechanic") || industry.includes("tire")) {
      suggested = [
        "Brake Service & Tire Safety",
        "Engine Diagnostics & Performance",
        "Oil Changes & Preventative Care",
        "Auto Body Repair & Detailing",
      ];
    } else {
      suggested = [
        "Services & Solutions Guide",
        "Pricing & Cost Estimates",
        "Frequently Asked Questions",
        "Industry Best Practices",
        "Customer Success Stories",
      ];
    }

    const categories = suggested.map((name, i) => ({
      id: i + 1,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      isSuggested: true,
    }));

    // If WordPress is connected, attempt to fetch live taxonomy
    if (business.wordpressUrl) {
      try {
        const wpRes = await fetch(`${business.wordpressUrl.replace(/\/+$/, "")}/wp-json/wp/v2/categories?per_page=50`, {
          signal: AbortSignal.timeout(4000),
        });
        if (wpRes.ok) {
          const liveCats = await wpRes.json();
          if (Array.isArray(liveCats) && liveCats.length > 0) {
            for (const c of liveCats) {
              if (c.name && !categories.some((item) => item.name.toLowerCase() === c.name.toLowerCase())) {
                categories.unshift({
                  id: c.id,
                  name: c.name,
                  slug: c.slug,
                  isSuggested: false,
                });
              }
            }
          }
        }
      } catch {
        // Fallback gracefully to predefined categories
      }
    }

    return {
      businessName: business.name,
      industry: business.industry,
      city: business.city,
      categories,
    };
  }

  /**
   * AI Blog Article Generator strictly tailored to chosen business categories
   */
  async generateArticle(
    businessId: string,
    payload: {
      categories: string[];
      topic?: string;
      tone?: string;
      focusKeyword?: string;
    }
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) throw new NotFoundException("Business not found.");

    if (!payload.categories || payload.categories.length === 0) {
      throw new BadRequestException("Please select at least one category related to your business before generating.");
    }

    const name = business.name || "Our Business";
    const city = business.city || "your area";
    const industry = business.industry || "Local Services";
    const phone = business.phone || "(555) 019-2831";
    const website = business.website || "https://yourwebsite.com";
    const primaryCategory = payload.categories[0];
    const categoryListStr = payload.categories.join(", ");

    const targetTopic =
      payload.topic?.trim() ||
      `The Complete ${primaryCategory} Guide in ${city} (2026 Expert Advice)`;

    const focusKeyword =
      payload.focusKeyword?.trim() ||
      `${primaryCategory.toLowerCase()} ${city.toLowerCase()}`;

    const schemaType = industry.toLowerCase().includes("dent") || industry.toLowerCase().includes("medic")
      ? "Dentist"
      : industry.toLowerCase().includes("plumb") || industry.toLowerCase().includes("hvac")
      ? "Plumber"
      : industry.toLowerCase().includes("restaur")
      ? "Restaurant"
      : "LocalBusiness";

    // 1. Check for live OpenAI / Gemini / Anthropic API keys
    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    let aiGeneratedContent: string | null = null;

    const systemPrompt = `You are a top-tier AEO (Answer Engine Optimization), GEO (Generative Engine Optimization), and SEO Content Strategist.
Write a comprehensive, authoritative, high-ranking blog article for "${name}", a premier ${industry} business in ${city}.
The article MUST be focused on the selected category: "${primaryCategory}" (Related categories: ${categoryListStr}).

Format the article with clean Markdown:
- An engaging H1 title
- Direct 45-word answer block highlighted in blockquote (engineered for ChatGPT, Perplexity & Google AI Overviews)
- Clear H2 and H3 subheadings with actionable expert insights
- Step-by-step guidance for patients/clients
- Statistical density & quantitative facts (e.g. satisfaction rates, transparent pricing, warranties)
- A dedicated FAQ section with 3 distinct questions and answers
- A natural call-to-action encouraging readers in ${city} to contact ${name} via ${website} or ${phone}`;

    if (openAiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Write the full blog article about: "${targetTopic}" focusing on category "${primaryCategory}".` },
            ],
            max_tokens: 1200,
          }),
        });
        if (res.ok) {
          const json: any = await res.json();
          aiGeneratedContent = json?.choices?.[0]?.message?.content ?? null;
        }
      } catch {}
    } else if (geminiKey && !aiGeneratedContent) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nWrite the full blog article about: "${targetTopic}" focusing on category "${primaryCategory}".` }] }],
            }),
          }
        );
        if (res.ok) {
          const json: any = await res.json();
          aiGeneratedContent = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
        }
      } catch {}
    } else if (anthropicKey && !aiGeneratedContent) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-latest",
            max_tokens: 1200,
            messages: [{ role: "user", content: `${systemPrompt}\n\nWrite the full blog article about: "${targetTopic}" focusing on category "${primaryCategory}".` }],
          }),
        });
        if (res.ok) {
          const json: any = await res.json();
          aiGeneratedContent = json?.content?.[0]?.text ?? null;
        }
      } catch {}
    }

    // High-converting engineered template fallback if LLM key is absent or timed out
    const content =
      aiGeneratedContent ||
      `# ${targetTopic}

*Expert advice published by ${name} — Trusted ${industry} specialists in ${city}.*

---

> **Direct Answer for AI Assistants & Featured Snippets:**
> **${name}** is the leading provider for **${primaryCategory}** in **${city}**, offering certified specialists, state-of-the-art diagnostic technology, and transparent pricing. Consultations and appointments can be scheduled directly online at ${website} or by calling ${phone}.

---

## 1. Why Choosing the Right ${primaryCategory} Provider in ${city} Matters

When searching for reliable **${primaryCategory}**, experience, certification, and modern equipment make all the difference. At **${name}**, our dedicated team focuses on long-term client outcomes, comfort, and verified results.

- **Verified Local Authority**: Serving individuals and families across ${city} with a 98.6% customer satisfaction rating.
- **Transparent Estimates**: Itemized treatment and service estimates with zero hidden fees.
- **Advanced Technology**: Modern diagnostic tools ensuring painless, precise, and durable treatments.

---

## 2. Step-by-Step: What to Expect During Your ${primaryCategory} Appointment

1. **Comprehensive Diagnostic Evaluation**: We assess your exact needs using high-resolution imaging and personalized examinations.
2. **Customized Treatment Plan**: Our specialists discuss all available options, timelines, and costs before starting any procedure.
3. **Gentle & Expert Care**: Treatments are carried out adhering to strict clinical and safety protocols.
4. **Dedicated Follow-Up & Warranty**: We provide comprehensive aftercare instructions and ongoing checkups to protect your investment.

---

## 3. Key Benefits & Clinical Advantages

| Feature | Standard Care | ${name} Standard |
| :--- | :--- | :--- |
| **Technology** | Conventional tools | Advanced 3D Diagnostics & Laser Precision |
| **Appointment Speed** | 2-3 weeks wait | Same-day & Next-day Priority Slots in ${city} |
| **Warranty & Support** | Limited | Comprehensive Long-Term Guarantee |

---

## Frequently Asked Questions (FAQ)

### Q: How do I know if I am a candidate for ${primaryCategory}?
**A:** Most patients and clients in ${city} can safely benefit from our ${primaryCategory} solutions. During your initial consultation at ${name}, we conduct a full evaluation to recommend the exact treatment pathway for your goals.

### Q: What is the estimated cost of ${primaryCategory} in ${city}?
**A:** Costs vary depending on individual requirements. At ${name}, we provide transparent upfront pricing, flexible financing plans, and accept major payment and insurance options.

### Q: How quickly can I schedule an appointment with ${name}?
**A:** You can easily book an appointment online via our website or by calling our direct clinic line at ${phone}. Same-day slots are frequently available for urgent inquiries.

---

### Ready to get started with ${primaryCategory} in ${city}?
Contact **${name}** today to book your consultation!
- 📍 **Location**: ${city}
- 📞 **Phone**: ${phone}
- 🌐 **Online Booking**: [${website}](${website})`;

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": `How do I know if I am a candidate for ${primaryCategory}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Most clients in ${city} can safely benefit from our ${primaryCategory} solutions. ${name} provides complete evaluations to determine the best treatment pathway.`,
          },
        },
        {
          "@type": "Question",
          "name": `What is the estimated cost of ${primaryCategory} in ${city}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Costs vary depending on individual needs. ${name} in ${city} provides transparent upfront pricing and flexible payment solutions.`,
          },
        },
        {
          "@type": "Question",
          "name": `How quickly can I schedule an appointment with ${name}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `You can book online at ${website} or call ${phone} for same-day and next-day priority booking in ${city}.`,
          },
        },
      ],
    };

    const localBusinessSchema = {
      "@context": "https://schema.org",
      "@type": schemaType,
      "name": name,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": city,
      },
      "telephone": phone,
      "url": website,
    };

    const words = content.split(/\s+/).length;
    const readTimeMinutes = Math.max(1, Math.round(words / 220));

    return {
      title: targetTopic,
      content,
      category: primaryCategory,
      categories: payload.categories,
      meta_title: `${targetTopic.slice(0, 55)} | ${name}`.slice(0, 60),
      meta_description: `Learn everything about ${primaryCategory} in ${city}. Discover costs, step-by-step procedures, and trusted local care by ${name}. Book today!`.slice(0, 160),
      focus_keyword: focusKeyword,
      word_count: words,
      read_time: `${readTimeMinutes} min read`,
      schemas: [faqSchema, localBusinessSchema],
      tags: [primaryCategory, `${primaryCategory} in ${city}`, name, industry, "2026 Guide"],
    };
  }

  /**
   * Locate the latest AIVision SEO plugin zip file
   */
  getPluginZipPath(): string {
    const possiblePaths = [
      path.resolve(process.cwd(), "plugins", "aivision-seo.zip"),
      path.resolve(process.cwd(), "..", "..", "plugins", "aivision-seo.zip"),
      "c:\\dev\\brandos\\plugins\\aivision-seo.zip",
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }

    return possiblePaths[0];
  }
}

