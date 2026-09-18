import { BadRequestException, Injectable } from "@nestjs/common";
import { prisma } from "@brandos/database";

export interface CategoryRecommendation {
  category: string;
  type: "PRIMARY" | "SECONDARY";
  relevanceScore: number;
  searchVolumeIndex: "HIGH" | "VERY HIGH" | "MEDIUM";
  whyItRanks: string;
  competitorAdoption: string;
}

export interface GbpPostResult {
  headline: string;
  postContent: string;
  ctaType: "BOOK" | "CALL_NOW" | "LEARN_MORE" | "CLAIM_OFFER";
  ctaUrl: string;
  suggestedImagePrompt: string;
  targetKeywords: string[];
  geoAnchors: string[];
}

export interface QaItem {
  question: string;
  answer: string;
  intent: "Pricing" | "Hours/Emergency" | "Insurance" | "Parking/Location" | "Specialty";
  localRelevanceNote: string;
}

export interface DescriptionResult {
  description: string;
  characterCount: number;
  highlightedKeywords: string[];
  localAnchors: string[];
}

export interface ServiceItem {
  serviceName: string;
  category: string;
  shortDescription: string;
  typicalPricing: string;
}

@Injectable()
export class LocalSeoToolsService {
  private async getBusinessContext(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    let membership = null;
    if (user?.activeBusinessId) {
      membership = await prisma.membership.findFirst({
        where: { userId, businessId: user.activeBusinessId },
        include: { business: true },
      });
    }
    if (!membership) {
      membership = await prisma.membership.findFirst({
        where: { userId },
        include: { business: true },
        orderBy: { createdAt: "desc" },
      });
    }
    const biz = membership?.business;
    return {
      name: biz?.name || "Local Business",
      city: biz?.city || "",
      country: biz?.country || "",
      industry: (biz?.industry || "local business").toLowerCase(),
      address: biz?.city ? `${biz.name}, ${biz.city}` : "Central District",
      website: biz?.website || biz?.wordpressUrl || "",
    };
  }

  /**
   * Call Gemini and return the raw text response, or null if unavailable/failed.
   */
  private async callGemini(prompt: string): Promise<string | null> {
    // Provider chain: DashScope (Qwen) -> OpenAI -> Gemini. Name kept for the
    // existing call sites; Gemini alone failed whenever its credits ran out.
    const dashscopeKey = process.env.DASHSCOPE_API_KEY;
    if (dashscopeKey) {
      try {
        const res = await fetch("https://dashscope-intl.aliyuncs.com/apps/anthropic/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": dashscopeKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: process.env.DASHSCOPE_MODEL || "qwen-max", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
          signal: AbortSignal.timeout(30000),
        });
        if (res.ok) {
          const json: any = await res.json();
          const text = json?.content?.[0]?.text;
          if (text) return text;
        }
      } catch {}
    }
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 2000 }),
          signal: AbortSignal.timeout(30000),
        });
        if (res.ok) {
          const json: any = await res.json();
          const text = json?.choices?.[0]?.message?.content;
          if (text) return text;
        }
      } catch {}
    }
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return null;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          signal: AbortSignal.timeout(20000),
        }
      );
      if (!res.ok) return null;
      const json: any = await res.json();
      return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    } catch {
      return null;
    }
  }

  private parseJsonResponse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
      const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      return JSON.parse(clean) as T;
    } catch {
      return null;
    }
  }

  // 1. GMB Category Finder
  async findCategories(userId: string, customIndustry?: string): Promise<{
    primaryCategory: string;
    secondaryCategories: CategoryRecommendation[];
    tips: string[];
  }> {
    const biz = await this.getBusinessContext(userId);
    const industry = (customIndustry || biz.industry).toLowerCase();

    const prompt = `You are a local SEO expert specializing in Google Business Profile category optimization.

Business: "${biz.name}"
Industry: "${industry}"
Location: ${biz.city || "unspecified city"}${biz.country ? `, ${biz.country}` : ""}

Recommend the single best primary Google Business Profile category, and 4-6 relevant secondary categories from Google's official category taxonomy for this specific business.

For each secondary category:
- Explain in 1-2 sentences why it helps local ranking (whyItRanks).
- Give a brief, honest, QUALITATIVE note on how commonly comparable businesses use it (competitorAdoption) -- e.g. "Commonly used by similar businesses" or "An underused opportunity in this category". Do NOT invent specific percentages or numbers -- you have no real competitive data for this business's actual market, so any number would be fabricated.

Return ONLY valid JSON (no markdown fences, no commentary) in exactly this shape:
{
  "primaryCategory": "string",
  "secondaryCategories": [
    { "category": "string", "type": "SECONDARY", "relevanceScore": <integer 0-100>, "searchVolumeIndex": "HIGH" | "VERY HIGH" | "MEDIUM", "whyItRanks": "string", "competitorAdoption": "string" }
  ],
  "tips": ["2-3 short, actionable tips about Google Business Profile category selection"]
}`;

    const raw = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse<{
      primaryCategory: string;
      secondaryCategories: CategoryRecommendation[];
      tips: string[];
    }>(raw);

    if (!parsed) {
      throw new BadRequestException("AI category recommendations are temporarily unavailable. Please try again in a moment.");
    }
    return parsed;
  }

  // 2. GMB Post Generator
  async generatePost(
    userId: string,
    params: { postType?: string; topic?: string; tone?: string }
  ): Promise<GbpPostResult> {
    const biz = await this.getBusinessContext(userId);
    const postType = params.postType || "WHATS_NEW"; // WHATS_NEW | OFFER | EVENT
    const topic = params.topic || "Routine Checkups & Cleanings";
    const tone = params.tone || "Friendly & Authoritative";

    const fallbackCtaUrl = biz.website || "https://icandothat.online";

    const prompt = `Write a high-converting Google Business Profile Post for "${biz.name}", a ${biz.industry} located in ${biz.city}, ${biz.country}.
Post Type: ${postType}
Topic: ${topic}
Tone: ${tone}

Requirements:
- Length: 80 to 120 words.
- Include 2-3 natural local geo-anchors (mentioning ${biz.city} or landmark).
- Include relevant emojis.
- Include a strong Call to Action.
- For "ctaUrl", use this business's actual website (${fallbackCtaUrl}) -- never invent or substitute a different domain.
- Return output strictly as JSON in format:
{
  "headline": "Short catchy headline",
  "postContent": "Complete post copy...",
  "ctaType": "BOOK",
  "ctaUrl": "${fallbackCtaUrl}",
  "suggestedImagePrompt": "Description of ideal photo to upload",
  "targetKeywords": ["keyword1", "keyword2"],
  "geoAnchors": ["${biz.city}"]
}`;

    // 1. Attempt OpenRouter call if API key present
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      try {
        const model = process.env.OPENROUTER_GBP_MODEL || "google/gemini-2.5-flash";
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
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
          }),
        });

        if (res.ok) {
          const json: any = await res.json();
          const rawText = json?.choices?.[0]?.message?.content;
          const parsed = this.parseJsonResponse<GbpPostResult>(rawText);
          if (parsed) return { ...parsed, ctaUrl: parsed.ctaUrl || fallbackCtaUrl };
        }
      } catch {}
    }

    // 2. Attempt direct Gemini call
    const raw = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse<GbpPostResult>(raw);
    if (parsed) return { ...parsed, ctaUrl: parsed.ctaUrl || fallbackCtaUrl };

    throw new BadRequestException("AI post generation is temporarily unavailable. Please try again in a moment.");
  }

  // 3. Q & A Section Generator
  async generateQa(userId: string, serviceFocus?: string): Promise<{
    qaItems: QaItem[];
    instructions: string[];
  }> {
    const biz = await this.getBusinessContext(userId);

    const prompt = `You are a local SEO expert writing a Google Business Profile Q&A section for "${biz.name}", a ${biz.industry} located in ${biz.city || "an unspecified city"}${biz.country ? `, ${biz.country}` : ""}.
${serviceFocus ? `Focus the questions around: ${serviceFocus}.` : ""}

Write 5-6 realistic questions a prospective customer would ask, with helpful, generic owner-style answers covering a mix of intents (pricing, hours/emergency, specialty services, parking/location, insurance if relevant).

CRITICAL: Do not invent specific facts you cannot know about this business -- no fabricated pricing figures, no named insurance company partnerships, no specific certifications or statistics. Where a real fact would be needed (exact price, exact hours, named insurers accepted), write the answer to direct the reader to contact the business directly rather than inventing an answer.

Return ONLY valid JSON (no markdown fences, no commentary) in exactly this shape:
{
  "qaItems": [
    { "question": "string", "answer": "string", "intent": "Pricing" | "Hours/Emergency" | "Insurance" | "Parking/Location" | "Specialty", "localRelevanceNote": "1 short sentence on why this Q&A helps local/AI search visibility" }
  ],
  "instructions": ["2-3 short tips on using this Q&A content in Google Business Profile"]
}`;

    const raw = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse<{ qaItems: QaItem[]; instructions: string[] }>(raw);

    if (!parsed) {
      throw new BadRequestException("AI Q&A generation is temporarily unavailable. Please try again in a moment.");
    }
    return parsed;
  }

  // 4. GMB Description Generator
  async generateDescription(userId: string, targetKeywords?: string): Promise<DescriptionResult> {
    const biz = await this.getBusinessContext(userId);

    const prompt = `Write a Google Business Profile description for "${biz.name}", a ${biz.industry} located in ${biz.city || "an unspecified city"}${biz.country ? `, ${biz.country}` : ""}.
${targetKeywords ? `Naturally include these keywords/phrases where relevant: ${targetKeywords}.` : ""}

Requirements:
- Maximum 750 characters (Google's hard limit) -- stay under this.
- Warm, professional tone. Mention the location naturally.
- Do not invent specific certifications, awards, years of experience, or statistics you cannot know are true for this business.

Return ONLY valid JSON (no markdown fences, no commentary) in exactly this shape:
{
  "description": "string, under 750 characters",
  "highlightedKeywords": ["3-6 keywords/phrases naturally present in the description"],
  "localAnchors": ["city/neighborhood names mentioned"]
}`;

    const raw = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse<{ description: string; highlightedKeywords: string[]; localAnchors: string[] }>(raw);

    if (!parsed?.description) {
      throw new BadRequestException("AI description generation is temporarily unavailable. Please try again in a moment.");
    }
    return {
      description: parsed.description,
      characterCount: parsed.description.length,
      highlightedKeywords: parsed.highlightedKeywords || [],
      localAnchors: parsed.localAnchors || [biz.city].filter(Boolean),
    };
  }

  // 5. GMB Service Finder
  async findServices(userId: string, category?: string): Promise<{
    category: string;
    services: ServiceItem[];
  }> {
    const biz = await this.getBusinessContext(userId);

    const prompt = `List the typical services offered by a ${biz.industry} business${category ? ` in the "${category}" category` : ""}, for "${biz.name}" located in ${biz.city || "an unspecified city"}${biz.country ? `, ${biz.country}` : ""}.

Suggest 5-6 real, commonly-offered services in this industry, each with a short description.

CRITICAL: For "typicalPricing", do NOT invent specific prices or currency amounts -- you have no knowledge of this business's actual pricing. Use "Contact for Pricing" for every service unless the service category has a truly universal, non-monetary standard (e.g. "Free" for an initial consultation that's genuinely industry-standard free -- and even then only if you're confident).

Return ONLY valid JSON (no markdown fences, no commentary) in exactly this shape:
{
  "category": "string",
  "services": [
    { "serviceName": "string", "category": "string", "shortDescription": "string", "typicalPricing": "string" }
  ]
}`;

    const raw = await this.callGemini(prompt);
    const parsed = this.parseJsonResponse<{ category: string; services: ServiceItem[] }>(raw);

    if (!parsed) {
      throw new BadRequestException("AI service suggestions are temporarily unavailable. Please try again in a moment.");
    }
    return parsed;
  }
}
