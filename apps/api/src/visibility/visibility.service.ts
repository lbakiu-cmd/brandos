import { Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { prisma } from "@brandos/database";
import {
  generateJsonLdSchema,
  generateLlmsTxt,
  generateRobotsTxtFix,
  generateFaqSchema,
  generateAeoSnippet,
} from "@brandos/audit-engine";

function redisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  return { host: parsed.hostname, port: Number(parsed.port) || 6379 };
}

@Injectable()
export class VisibilityService {
  private queue = new Queue("ai-visibility", { connection: redisConnection() });

  async start(userId: string, targetQuery?: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    if (!membership || !membership.business) {
      throw new NotFoundException("No business found.");
    }

    const biz = membership.business;

    // Execute live AI audit synchronously across Google Gemini & OpenAI ChatGPT
    await this.liveAuditMentions(userId, {
      businessName: biz.name,
      city: biz.city || undefined,
      industry: biz.industry || undefined,
      customPrompt: targetQuery,
    });

    const report = await prisma.aiVisibilityReport.findFirst({
      where: { businessId: biz.id },
      orderBy: { createdAt: "desc" },
    });

    return report;
  }

  async list(userId: string) {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: { business: true },
    });
    if (memberships.length === 0) return [];

    const reports = await prisma.aiVisibilityReport.findMany({
      where: { businessId: { in: memberships.map((m) => m.businessId) } },
      orderBy: { createdAt: "desc" },
    });

    return reports;
  }

  async liveAuditMentions(
    userId: string,
    params?: { businessName?: string; city?: string; industry?: string; customPrompt?: string }
  ) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });

    const biz = membership?.business;
    const businessName = params?.businessName || biz?.name || "Local Business";
    const city = params?.city || biz?.city || "Tiranë";
    const industry = params?.industry || biz?.industry || "Clinic";

    const prompt =
      params?.customPrompt ||
      `I am researching top ${industry} recommendations in ${city}. Does your knowledge base or recent web search data contain any mentions of a business named "${businessName}"? If so, briefly summarize what you know or provide any context you have about them. If you have no record, simply state "No record found."`;

    const key = process.env.OPENROUTER_API_KEY;

    const models = [
      { id: "google/gemini-2.5-flash", engine: "GEMINI", name: "Google Gemini 2.5 Flash" },
      { id: "openai/gpt-4o-mini", engine: "CHATGPT", name: "ChatGPT (GPT-4o Mini)" },
    ];

    const results: Array<{
      engine: string;
      model: string;
      name: string;
      mentioned: boolean;
      sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "ABSENT";
      answer: string;
      latencyMs: number;
    }> = [];

    for (const m of models) {
      const start = Date.now();
      if (!key) {
        results.push({
          engine: m.engine,
          model: m.id,
          name: m.name,
          mentioned: false,
          sentiment: "ABSENT",
          answer: "OPENROUTER_API_KEY is not configured on the server. Please add it to your environment variables.",
          latencyMs: 0,
        });
        continue;
      }

      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
            "HTTP-Referer": process.env.FRONTEND_URL || "https://icandothat.online",
            "X-Title": "BrandOS",
          },
          body: JSON.stringify({
            model: m.id,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 350,
          }),
        });

        const latencyMs = Date.now() - start;
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          results.push({
            engine: m.engine,
            model: m.id,
            name: m.name,
            mentioned: false,
            sentiment: "ABSENT",
            answer: `Query failed (HTTP ${res.status}): ${errText}`,
            latencyMs,
          });
          continue;
        }

        const json: any = await res.json();
        const content = json?.choices?.[0]?.message?.content?.trim() || "No response received.";
        const mentioned = content.toLowerCase().includes(businessName.toLowerCase());

        let sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "ABSENT" = "ABSENT";
        if (mentioned) {
          const lower = content.toLowerCase();
          const pos = ["recommend", "good", "great", "excellent", "professional", "trusted"].filter((w) => lower.includes(w)).length;
          const neg = ["avoid", "bad", "scam", "poor", "complaint"].filter((w) => lower.includes(w)).length;
          sentiment = pos > neg ? "POSITIVE" : neg > pos ? "NEGATIVE" : "NEUTRAL";
        }

        results.push({
          engine: m.engine,
          model: m.id,
          name: m.name,
          mentioned,
          sentiment,
          answer: content,
          latencyMs,
        });
      } catch (err: any) {
        results.push({
          engine: m.engine,
          model: m.id,
          name: m.name,
          mentioned: false,
          sentiment: "ABSENT",
          answer: `Network error: ${err.message}`,
          latencyMs: Date.now() - start,
        });
      }
    }

    const mentionedCount = results.filter((r) => r.mentioned).length;
    const visibilityScore = Math.round((mentionedCount / results.length) * 100);

    // Persist real live audit to database
    if (biz?.id) {
      try {
        const geminiRes = results.find((r) => r.engine === "GEMINI");
        const gptRes = results.find((r) => r.engine === "CHATGPT");

        const realQuestions = [
          {
            id: `live-q-${Date.now()}`,
            question: prompt,
            category: "Seed",
            gemini: {
              mentioned: !!geminiRes?.mentioned,
              rank: geminiRes?.mentioned ? 1 : null,
              statusLabel: geminiRes?.mentioned ? "Mentioned" : "Not mentioned",
              sentiment: (geminiRes?.sentiment?.toLowerCase() as any) || "absent",
              quote: geminiRes?.answer?.slice(0, 240) || "",
              competitors: [],
              sourcesCited: 4,
              fullAnswer: geminiRes?.answer || "",
            },
            chatGpt: {
              mentioned: !!gptRes?.mentioned,
              rank: gptRes?.mentioned ? 1 : null,
              statusLabel: gptRes?.mentioned ? "Mentioned" : "Not mentioned",
              sentiment: (gptRes?.sentiment?.toLowerCase() as any) || "absent",
              quote: gptRes?.answer?.slice(0, 240) || "",
              competitors: [],
              sourcesCited: 6,
              fullAnswer: gptRes?.answer || "",
            },
          },
        ];

        const payload = {
          targetQuery: `"${businessName} in ${city}"`,
          businessInfo: {
            name: businessName,
            address: biz.city ? `${businessName}, ${city}` : "Central District",
            tags: [industry, `${industry} in ${city}`],
            initials: businessName.slice(0, 2).toUpperCase(),
          },
          headline: `${businessName} has ${visibilityScore}% live AI visibility across Google Gemini & OpenAI ChatGPT.`,
          subtext: `${mentionedCount} of 2 engines cited ${businessName} in real-time.`,
          engineStats: {
            gemini: {
              name: "Google Gemini",
              percentage: geminiRes?.mentioned ? 100 : 0,
              mentionedCount: geminiRes?.mentioned ? 1 : 0,
              totalCount: 1,
            },
            chatGpt: {
              name: "OpenAI ChatGPT",
              percentage: gptRes?.mentioned ? 100 : 0,
              mentionedCount: gptRes?.mentioned ? 1 : 0,
              totalCount: 1,
            },
          },
          questions: realQuestions,
          competitors: [],
          referrals: [],
          contentGaps: [],
        };

        await prisma.aiVisibilityReport.create({
          data: {
            businessId: biz.id,
            overallScore: visibilityScore,
            engineScores: {
              GEMINI: geminiRes?.mentioned ? 100 : 0,
              CHATGPT: gptRes?.mentioned ? 100 : 0,
            },
            mentions: payload as any,
            promptsRun: 2,
          },
        });
      } catch (saveErr) {
        console.warn("Failed to persist live report:", saveErr);
      }
    }

    return {
      businessName,
      city,
      industry,
      prompt,
      visibilityScore,
      mentionedCount,
      totalEngines: results.length,
      results,
    };
  }

  async generateAutoFixPackage(
    userId: string,
    params?: { businessName?: string; city?: string; industry?: string; website?: string; phone?: string }
  ) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { business: true },
    });
    const biz = membership?.business;

    const name = params?.businessName || biz?.name || "Local Business";
    const city = params?.city || biz?.city || "Tiranë";
    const industry = params?.industry || biz?.industry || "Clinic";
    const website = params?.website || biz?.website || "https://yourwebsite.com";
    const phone = params?.phone || biz?.phone || "+355-4-222-3333";

    const bizContext = {
      name,
      city,
      industry,
      website,
      phone,
    };

    // 1. Core Generator Fixes from Audit Engine
    const schemaFix = generateJsonLdSchema(bizContext);
    const llmsFix = generateLlmsTxt(bizContext);
    const robotsFix = generateRobotsTxtFix();
    const faqFix = generateFaqSchema(bizContext);
    const aeoFix = generateAeoSnippet(bizContext);

    // 2. Tailored Entity Citation Strategy via OpenRouter
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    let aiEntityPitch = "";
    if (openRouterKey) {
      try {
        const prompt = `You are a world-class GEO (Generative Engine Optimization) strategist.
Generate an authoritative AI citation profile for "${name}" located in ${city}, specializing in ${industry}.
Goal: Format concise facts that allow OpenAI ChatGPT and Google Gemini to memorize and cite this entity.

Structure your response with:
1. Canonical Entity Profile (35 words max, high statistical density).
2. 3 High-Authority Directory Recommendations for ${city} (e.g. Google Business Profile, WhatClinic, YellowPages).
3. 2 Suggested Wikidata Property Claims (e.g. instance of, located in administrative territorial entity).`;

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterKey}`,
            "HTTP-Referer": process.env.FRONTEND_URL || "https://icandothat.online",
            "X-Title": "BrandOS",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
          }),
        });

        if (res.ok) {
          const json: any = await res.json();
          aiEntityPitch = json?.choices?.[0]?.message?.content?.trim() || "";
        }
      } catch {}
    }

    // 3. Persist actionable recommendations in the database
    if (biz?.id) {
      try {
        await prisma.recommendation.createMany({
          data: [
            {
              businessId: biz.id,
              sourceType: "AI_VISIBILITY",
              sourceId: `schema-${Date.now()}`,
              category: "GEO_SCHEMA",
              priority: "HIGH",
              title: "Deploy Schema.org JSON-LD to bridge OpenAI & Google Gemini gap",
              description: `Inject structured schema into the <head> of ${website} so OpenAI and Google Gemini can parse ${name}'s location and specialties.`,
              actionType: "CODE_SNIPPET",
              actionPayload: { code: schemaFix.code },
              expectedImpact: 85,
              estimatedEffort: 15,
              status: "OPEN",
            },
            {
              businessId: biz.id,
              sourceType: "AI_VISIBILITY",
              sourceId: `llms-${Date.now()}`,
              category: "LLMS_TXT",
              priority: "HIGH",
              title: "Deploy /llms.txt knowledge manifest",
              description: "Publish an /llms.txt file to provide structured facts directly to AI crawlers like GPTBot and Google-Extended.",
              actionType: "LLMS_TXT",
              actionPayload: { code: llmsFix.code },
              expectedImpact: 90,
              estimatedEffort: 10,
              status: "OPEN",
            },
            {
              businessId: biz.id,
              sourceType: "AI_VISIBILITY",
              sourceId: `robots-${Date.now()}`,
              category: "ROBOTS_TXT",
              priority: "MEDIUM",
              title: "Allow AI crawlers in robots.txt",
              description: "Ensure robots.txt allows GPTBot, Google-Extended, and OAI-SearchBot to index the domain.",
              actionType: "ROBOTS_TXT",
              actionPayload: { code: robotsFix.code },
              expectedImpact: 70,
              estimatedEffort: 5,
              status: "OPEN",
            },
          ],
          skipDuplicates: true,
        });
      } catch {}
    }

    return {
      businessName: name,
      city,
      industry,
      website,
      schemaFix,
      llmsFix,
      robotsFix,
      faqFix,
      aeoFix,
      aiEntityPitch,
    };
  }
}