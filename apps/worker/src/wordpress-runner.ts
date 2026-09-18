import { prisma } from "@brandos/database";
import { scoreArticle } from "@brandos/audit-engine";

/**
 * Worker-side automated runner for WordPress Telemetry Sync
 */
export async function runWordpressSync(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business || !business.wordpressUrl || !business.wordpressApiKey) {
    console.log(`[WordpressWorker] Site not connected for business ${businessId}, skipping sync.`);
    return;
  }

  const siteUrl = business.wordpressUrl.replace(/\/+$/, "");
  const apiKey = business.wordpressApiKey;

  try {
    const [statusRes, telemetryRes] = await Promise.all([
      fetch(`${siteUrl}/wp-json/aivision-seo/v1/status`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      }).catch(() => null),
      fetch(`${siteUrl}/wp-json/aivision-seo/v1/telemetry`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      }).catch(() => null),
    ]);

    const statusData = statusRes && statusRes.ok ? await statusRes.json() : null;
    const telemetryData = telemetryRes && telemetryRes.ok ? await telemetryRes.json() : null;

    const existingTelemetry = (business.wordpressTelemetry as any) || {};
    const combinedTelemetry = {
      ...existingTelemetry,
      status: statusData,
      telemetry: telemetryData,
      syncedAt: new Date().toISOString(),
    };

    const pluginVersion = statusData?.plugin_version || business.wordpressPluginVersion || "1.6.0";

    await prisma.business.update({
      where: { id: businessId },
      data: {
        wordpressLastSyncedAt: new Date(),
        wordpressPluginVersion: pluginVersion,
        wordpressSiteName: statusData?.site_name || business.wordpressSiteName,
        wordpressTelemetry: combinedTelemetry as any,
      },
    });

    // Auto-update plugin if site is running an outdated version
    try {
      const versionsRes = await fetch("https://icandothat.online/api/wordpress/plugin-versions", {
        signal: AbortSignal.timeout(5000),
      }).catch(() => null);
      if (versionsRes && versionsRes.ok) {
        const verData = (await versionsRes.json()) as any;
        const latestVersion = verData?.latest;
        if (latestVersion && pluginVersion && pluginVersion !== latestVersion) {
          console.log(`[WordpressWorker] Site ${siteUrl} is running v${pluginVersion}, latest is v${latestVersion}. Triggering auto-update...`);
          await fetch(`${siteUrl}/wp-json/aivision-seo/v1/remote-update`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              download_url: `https://icandothat.online/api/wordpress/plugin-download?version=${latestVersion}`,
              version: latestVersion,
            }),
            signal: AbortSignal.timeout(25000),
          }).catch(() => null);
        }
      }
    } catch (e) {
      // Ignore background auto-update attempt error
    }

    if (telemetryData?.summary) {
      const avgSeo = Number(telemetryData.summary.average_seo || 0);
      const avgAeo = Number(telemetryData.summary.average_aeo || 0);
      const avgGeo = Number(telemetryData.summary.average_geo || 0);
      const count = Number(telemetryData.summary.count || 0);

      await prisma.dashboardWidget.updateMany({
        where: { businessId, widgetType: "WORDPRESS_AIVISION_STATUS" },
        data: {
          config: {
            connected: true,
            siteUrl: business.wordpressUrl,
            pluginVersion,
            avgSeo,
            avgAeo,
            avgGeo,
            postsIndexed: count,
            lastSyncedAt: new Date().toISOString(),
          },
        },
      }).catch(() => {});

      const now = new Date();
      await prisma.metricSnapshot.createMany({
        data: [
          { businessId, provider: "WORDPRESS", metricKey: "seo_score", value: avgSeo, date: now },
          { businessId, provider: "WORDPRESS", metricKey: "aeo_score", value: avgAeo, date: now },
          { businessId, provider: "WORDPRESS", metricKey: "geo_score", value: avgGeo, date: now },
        ],
      }).catch(() => {});
    }

    console.log(`[WordpressWorker] Successfully synchronized telemetry for business ${business.name} (${businessId})`);
  } catch (err: any) {
    console.error(`[WordpressWorker] Sync failed for business ${businessId}:`, err?.message);
  }
}

/**
 * Generates a full SEO/AEO/GEO blog article via OpenRouter/OpenAI/Gemini (mirrors
 * WordpressService#generateArticle in apps/api), falling back to an engineered
 * template only if no AI provider key is configured or every call fails.
 */
async function generateAutopilotArticle(business: {
  name: string | null;
  city: string | null;
  industry: string | null;
  phone: string | null;
  website: string | null;
}, targetCategory: string) {
  const name = business.name || "Our Business";
  const city = business.city || "your area";
  const industry = business.industry || "Local Services";
  const phone = business.phone || "(555) 019-2831";
  const website = business.website || "https://yourwebsite.com";

  const targetTopic = `The Complete ${targetCategory} Guide in ${city} (2026 Expert Advice)`;
  const focusKeyword = `${targetCategory.toLowerCase()} ${city.toLowerCase()}`;

  const systemPrompt = `You are a top-tier AEO (Answer Engine Optimization), GEO (Generative Engine Optimization), and SEO Content Strategist.
Write a comprehensive, authoritative, high-ranking blog article for "${name}", a premier ${industry} business in ${city}.
The article MUST be focused on the selected category: "${targetCategory}".

Format the article with clean Markdown:
- An engaging H1 title
- Direct 45-word answer block highlighted in blockquote (engineered for ChatGPT, Perplexity & Google AI Overviews)
- Clear H2 and H3 subheadings with actionable expert insights
- Step-by-step guidance for patients/clients
- At least 1000 words of substantive content
- Keep sentences concise (aim for 22 words or fewer) -- this measurably improves how accurately LLMs synthesize and cite the content
- A dedicated FAQ section with 3 distinct questions and answers
- A natural call-to-action encouraging readers in ${city} to contact ${name} via ${website} or ${phone}
- When linking to the website, use descriptive anchor text (e.g. "Book Online" or "Visit our website") -- never make the link text the raw URL itself, since that reads as the address being shown twice

CRITICAL -- do not fabricate: never invent specific numbers you cannot know are true for this business -- no made-up satisfaction percentages, success rates, prices, or warranty terms, and never claim "in our testing/experience we found..." since the business did not commission any such study. Where a general, widely-established fact from the field is genuinely useful (e.g. citing a recognized authority like the American Dental Association, Mayo Clinic, or CDC for a broadly known fact -- not a specific number attributed to them), you may reference it by name, but do not attribute invented statistics to real organizations. Where a business-specific number would normally go (pricing, satisfaction rate, warranty length), write around it -- e.g. "contact us for current pricing" -- rather than inventing one.`;

  const baseUserPrompt = `Write the full blog article about: "${targetTopic}" focusing on category "${targetCategory}".`;

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const callAiProviders = async (userPrompt: string): Promise<string | null> => {
    if (openRouterKey) {
      try {
        const model = process.env.OPENROUTER_BLOG_MODEL || "openai/gpt-4o-mini";
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterKey}`,
            "HTTP-Referer": process.env.FRONTEND_URL || "https://icandothat.online",
            "X-Title": "AIVisibility SEO",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 1500,
          }),
          signal: AbortSignal.timeout(60000),
        });
        if (res.ok) {
          const json: any = await res.json();
          return json?.choices?.[0]?.message?.content ?? null;
        }
      } catch {}
      return null;
    } else if (openAiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 1200,
          }),
          signal: AbortSignal.timeout(60000),
        });
        if (res.ok) {
          const json: any = await res.json();
          return json?.choices?.[0]?.message?.content ?? null;
        }
      } catch {}
      return null;
    } else if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            }),
            signal: AbortSignal.timeout(60000),
          }
        );
        if (res.ok) {
          const json: any = await res.json();
          return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
        }
      } catch {}
      return null;
    }
    return null;
  };

  const schemaType = industry.toLowerCase().includes("dent") || industry.toLowerCase().includes("medic")
    ? "MedicalBusiness"
    : industry.toLowerCase().includes("restaur")
    ? "Restaurant"
    : "LocalBusiness";

  // Phase 1.5: generate, score against the same GEO/AEO checks the plugin's
  // analyzer applies post-publish, and regenerate with the gaps fed back
  // into the prompt if it falls short, mirroring the API's generateArticle().
  const MAX_ATTEMPTS = 3;
  let aiGeneratedContent: string | null = null;
  let lastGaps: { key: string; message: string }[] = [];
  let finalScore = 0;
  let finalPassed = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const userPrompt =
      lastGaps.length > 0
        ? `${baseUserPrompt}\n\nYour previous draft scored below the quality threshold on these specific points -- rewrite the FULL article addressing every one of them:\n${lastGaps.map((g) => `- ${g.message}`).join("\n")}`
        : baseUserPrompt;

    const attemptContent = await callAiProviders(userPrompt);
    if (!attemptContent) break;

    aiGeneratedContent = attemptContent;
    const result = scoreArticle({
      title: targetTopic,
      content: attemptContent,
      metaTitle: `${targetTopic.slice(0, 55)} | ${name}`.slice(0, 60),
      metaDescription: `Learn everything about ${targetCategory} in ${city}. Discover costs, step-by-step procedures, and trusted local care by ${name}. Book today!`.slice(0, 160),
      focusKeyword,
      schemas: [{ "@type": "FAQPage" }, { "@type": schemaType }],
    });
    finalScore = result.score;
    finalPassed = result.passed;
    lastGaps = result.gaps;

    if (result.passed) break;
  }

  if (!aiGeneratedContent) {
    throw new Error("AI article generation failed -- no configured provider (OpenRouter/OpenAI/Gemini) returned content.");
  }
  const content = aiGeneratedContent;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `How do I know if I am a candidate for ${targetCategory}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Most clients in ${city} can safely benefit from ${name}'s ${targetCategory} services. Contact us for a personal evaluation.`,
        },
      },
      {
        "@type": "Question",
        "name": `What is the estimated cost of ${targetCategory} in ${city}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Costs vary by individual needs -- contact ${name} directly for current pricing.`,
        },
      },
      {
        "@type": "Question",
        "name": `How do I schedule an appointment with ${name}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `You can book online at ${website} or call ${phone}.`,
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

  return {
    title: targetTopic,
    content,
    focusKeyword,
    metaTitle: `${targetTopic.slice(0, 55)} | ${name}`.slice(0, 60),
    metaDescription: `Learn everything about ${targetCategory} in ${city}. Discover costs, step-by-step procedures, and trusted local care by ${name}. Book today!`.slice(0, 160),
    schemas: [faqSchema, localBusinessSchema],
    qualityScore: finalScore,
    needsReview: !finalPassed,
  };
}

/**
 * AI featured image generator (OpenAI, low quality/cost -- mirrors
 * WordpressService#generateFeaturedImage in apps/api). Returns a base64 data
 * URI, or null if unavailable/failed -- image generation is a nice-to-have
 * for the scheduled autopilot, so a failure here should not block publishing.
 */
async function generateAutopilotImage(business: {
  name: string | null;
  industry: string | null;
  city: string | null;
}, topic: string): Promise<string | null> {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) return null;

  const name = business.name || "Local Business";
  const industry = business.industry || "local services";
  const city = business.city || "";

  const prompt = `A professional, photorealistic featured image for a blog article about "${topic}" for "${name}", a ${industry} business${city ? ` in ${city}` : ""}. Clean, modern, editorial photography style suitable for a business website blog header. No text, no logos, no watermarks.`;

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        quality: "low",
        n: 1,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const b64 = json?.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch {
    return null;
  }
}

/**
 * Worker-side automated runner for Content Autopilot Publishing
 */
export async function runWordpressAutopilotJob(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
  });

  if (!business || !business.wordpressUrl || !business.wordpressApiKey) {
    console.log(`[WordpressAutopilot] WordPress not connected for business ${businessId}`);
    return;
  }

  const telemetry = (business.wordpressTelemetry as any) || {};
  const autopilot = telemetry.autopilot;
  if (!autopilot || !autopilot.enabled) {
    console.log(`[WordpressAutopilot] Autopilot not active for business ${businessId}`);
    return;
  }

  const siteUrl = business.wordpressUrl.replace(/\/+$/, "");
  const apiKey = business.wordpressApiKey;

  const categories = autopilot.selectedCategories?.length > 0
    ? autopilot.selectedCategories
    : ["Services and Solutions Guide"];

  const idx = (autopilot.articlesGeneratedCount || 0) % categories.length;
  const targetCategory = categories[idx];
  const name = business.name || "Our Business";

  try {
    const { title: targetTopic, content: articleContent, focusKeyword, metaTitle, metaDescription, schemas, qualityScore, needsReview } =
      await generateAutopilotArticle(business, targetCategory);

    const featuredImage = await generateAutopilotImage(business, targetTopic);

    // Never auto-publish live content that didn't clear the quality bar even
    // after retries -- force it to draft for manual review instead.
    const targetStatus = autopilot.defaultStatus === "publish" && !needsReview ? "publish" : "draft";
    if (needsReview) {
      console.log(`[WordpressAutopilot] "${targetTopic}" scored ${qualityScore}/100 -- publishing as draft for manual review.`);
    }

    const pubRes = await fetch(`${siteUrl}/wp-json/aivision-seo/v1/publish-post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        title: targetTopic,
        content: articleContent,
        status: targetStatus,
        meta_title: metaTitle,
        meta_description: metaDescription,
        focus_keyword: focusKeyword,
        categories: [targetCategory],
        tags: [targetCategory, `${targetCategory} in ${business.city || "your area"}`, name, "2026 Guide"],
        schemas,
        featured_image_base64: featuredImage || undefined,
      }),
      signal: AbortSignal.timeout(featuredImage ? 60000 : 15000),
    });

    if (!pubRes.ok) {
      throw new Error(`WordPress returned status ${pubRes.status}`);
    }

    const pubData = await pubRes.json();
    const cadence = autopilot.cadence || "WEEKLY";
    const daysToAdd = cadence === "MONTHLY" ? 30 : cadence === "BIWEEKLY" ? 14 : 7;

    const newAutopilot = {
      ...autopilot,
      lastRunAt: new Date().toISOString(),
      nextRunAt: new Date(Date.now() + daysToAdd * 86400000).toISOString(),
      articlesGeneratedCount: (autopilot.articlesGeneratedCount || 0) + 1,
      lastArticleTitle: targetTopic,
      lastArticleUrl: pubData.permalink || null,
      lastArticleQualityScore: qualityScore,
      lastArticleNeedsReview: needsReview,
    };

    await prisma.business.update({
      where: { id: businessId },
      data: {
        wordpressTelemetry: {
          ...telemetry,
          autopilot: newAutopilot,
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        businessId,
        action: "WORDPRESS_AUTOPILOT_PUBLISHED",
        category: "INTEGRATIONS",
        description: `Automated Autopilot generated and pushed "${targetTopic}" to WordPress as ${targetStatus}${needsReview ? " (flagged for manual review -- did not clear the quality bar)" : ""}.`,
        metadata: {
          title: targetTopic,
          category: targetCategory,
          status: targetStatus,
          permalink: pubData.permalink,
          qualityScore,
          needsReview,
        },
      },
    }).catch(() => {});

    console.log(`[WordpressAutopilot] Autopilot successfully published article for ${business.name}`);
  } catch (err: any) {
    console.error(`[WordpressAutopilot] Failed for business ${businessId}:`, err?.message);
  }
}
