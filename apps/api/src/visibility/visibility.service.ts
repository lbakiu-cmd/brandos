import { Injectable, NotFoundException } from "@nestjs/common";
import { Queue } from "bullmq";
import { prisma } from "@brandos/database";
import { generateVisibilityReport } from "./visibility-report-generator";
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
    const payload = generateVisibilityReport(
      {
        id: biz.id,
        name: biz.name,
        city: biz.city,
        country: biz.country,
        industry: biz.industry,
      },
      targetQuery
    );

    const googleScore = payload.engineStats.googleAi.percentage;
    const chatGptScore = payload.engineStats.chatGpt.percentage;
    const overallScore = Math.round((googleScore + chatGptScore) / 2);

    const report = await prisma.aiVisibilityReport.create({
      data: {
        businessId: membership.businessId,
        overallScore,
        engineScores: {
          GOOGLE_AI_OVERVIEW: googleScore,
          CHATGPT: chatGptScore,
        },
        mentions: payload as any,
        promptsRun: payload.questions.length * 2,
      },
    });

    try {
      await this.queue.add(
        "ai-visibility",
        { reportId: report.id, query: targetQuery },
        { jobId: report.id }
      );
    } catch {
      // Redis queue is optional if running synchronously
    }

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

    // If no reports exist yet, auto-generate a baseline report for the first business
    if (reports.length === 0 && memberships[0]?.business) {
      const biz = memberships[0].business;
      const payload = generateVisibilityReport({
        id: biz.id,
        name: biz.name,
        city: biz.city,
        country: biz.country,
        industry: biz.industry,
      });

      const googleScore = payload.engineStats.googleAi.percentage;
      const chatGptScore = payload.engineStats.chatGpt.percentage;
      const overallScore = Math.round((googleScore + chatGptScore) / 2);

      const baseline = await prisma.aiVisibilityReport.create({
        data: {
          businessId: biz.id,
          overallScore,
          engineScores: {
            GOOGLE_AI_OVERVIEW: googleScore,
            CHATGPT: chatGptScore,
          },
          mentions: payload as any,
          promptsRun: payload.questions.length * 2,
        },
      });

      return [baseline];
    }

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
      { id: "perplexity/sonar", engine: "PERPLEXITY", name: "Perplexity Sonar (Live Web)" },
      { id: "openai/gpt-4o-mini", engine: "CHATGPT", name: "ChatGPT (GPT-4o Mini)" },
      { id: "anthropic/claude-3-haiku", engine: "CLAUDE", name: "Claude 3 Haiku" },
      { id: "google/gemini-2.5-flash", engine: "GEMINI", name: "Google Gemini 2.5 Flash" },
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
Goal: Format concise facts that allow ChatGPT, Claude, and Perplexity to memorize and cite this entity.

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
              title: "Deploy Schema.org JSON-LD to bridge ChatGPT & Claude gap",
              description: `Inject structured schema into the <head> of ${website} so AI models can parse ${name}'s location and specialties.`,
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
              description: "Publish an /llms.txt file to provide structured facts directly to AI crawlers like GPTBot and ClaudeBot.",
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
              description: "Ensure robots.txt allows GPTBot, ClaudeBot, OAI-SearchBot, and PerplexityBot to index the domain.",
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