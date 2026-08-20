export interface WebsiteCheck {
  category: "TECHNICAL" | "AI_READINESS" | "AEO_ANSWER_ENGINE" | "GEO_GENERATIVE_ENGINE" | "LOCAL_SIGNALS" | "CONTENT";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  description: string;
  recommendation: string;
  passed: boolean;
  impact: number;
  fixType?: "CODE_SNIPPET" | "LLMS_TXT" | "ROBOTS_TXT" | "FAQ_SCHEMA" | "AEO_SNIPPET" | "GEO_DATA_POINTS";
}

export type BusinessVertical =
  | "DENTAL_MEDICAL"
  | "HOME_SERVICES"
  | "RESTAURANT_FOOD"
  | "LEGAL_FINANCIAL"
  | "REAL_ESTATE"
  | "BEAUTY_WELLNESS"
  | "AUTOMOTIVE"
  | "GENERAL";

const WEIGHTS = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 10,
  LOW: 5,
  INFO: 2,
};

export const AI_CRAWLER_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "Google-Extended",
  "Claude-Web",
  "PerplexityBot",
  "ClaudeBot",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "Amazonbot",
  "Bytespider",
  "cohere-ai",
  "Diffbot",
];

export function detectBusinessVertical(html: string, industryHint?: string | null): BusinessVertical {
  const combined = `${industryHint || ""} ${html.slice(0, 5000)}`.toLowerCase();

  if (/dental|dentist|teeth|orthodont|oral surgery|implant|doctor|clinic|medical|patient|chiro|physio/i.test(combined)) {
    return "DENTAL_MEDICAL";
  }
  if (/plumb|hvac|air conditioning|heating|roofing|electrician|contractor|remodel|handyman|pest control/i.test(combined)) {
    return "HOME_SERVICES";
  }
  if (/restaurant|cafe|bistro|pizzeria|bakery|bar & grill|dining|menu|chef|serves cuisine|food/i.test(combined)) {
    return "RESTAURANT_FOOD";
  }
  if (/lawyer|attorney|legal|law firm|personal injury|criminal defense|litigation|cpa|accounting/i.test(combined)) {
    return "LEGAL_FINANCIAL";
  }
  if (/realtor|real estate|property management|homes for sale|apartments for rent/i.test(combined)) {
    return "REAL_ESTATE";
  }
  if (/salon|spa|hairdresser|barbershop|facial|massage|skincare|aesthetics|lash|nail/i.test(combined)) {
    return "BEAUTY_WELLNESS";
  }
  if (/auto repair|mechanic|car service|tires|brakes|transmission|auto body|dealership/i.test(combined)) {
    return "AUTOMOTIVE";
  }

  return "GENERAL";
}

export async function fetchHtmlSafe(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BrandOS-AIVision-AuditBot/3.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function evaluateWebsiteHtml(
  url: string,
  html: string,
  robotsTxt?: string,
  llmsTxt?: string,
  industryHint?: string | null
): {
  score: number;
  vertical: BusinessVertical;
  checks: WebsiteCheck[];
} {
  const checks: WebsiteCheck[] = [];
  const vertical = detectBusinessVertical(html, industryHint);

  const add = (
    category: WebsiteCheck["category"],
    severity: WebsiteCheck["severity"],
    title: string,
    passed: boolean,
    recommendation: string,
    description: string,
    fixType?: WebsiteCheck["fixType"]
  ) => {
    checks.push({
      category,
      severity,
      title,
      passed,
      recommendation,
      description,
      impact: WEIGHTS[severity],
      fixType,
    });
  };

  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = textOnly.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // ---------------- 1. Technical Baseline ----------------
  add(
    "TECHNICAL",
    "HIGH",
    "Descriptive Page Title Tag (40–60 chars)",
    /<title[^>]*>[^<]{20,70}<\/title>/i.test(html),
    "Write a unique, concise <title> between 40 and 60 characters containing your primary service and city.",
    "Search engines and AI summary models rely on the title tag as the primary topical anchor.",
    "CODE_SNIPPET"
  );

  add(
    "TECHNICAL",
    "HIGH",
    "Meta Description Tag Present (120–160 chars)",
    /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{60,}["']/i.test(html),
    "Add a compelling 120-160 character meta description summarizing your value proposition.",
    "Used directly by LLM search engines to construct direct snippet answers.",
    "CODE_SNIPPET"
  );

  add(
    "TECHNICAL",
    "MEDIUM",
    "Single Primary H1 Heading",
    (html.match(/<h1[\s>]/gi) || []).length === 1,
    "Ensure each page has exactly one <h1> element defining the main business topic.",
    "Multiple or missing H1s confuse crawler semantic parsing."
  );

  add(
    "TECHNICAL",
    "HIGH",
    "HTTPS Secure Encryption",
    url.startsWith("https://"),
    "Serve your entire website over secure HTTPS.",
    "Non-secure sites are down-ranked and excluded from AI answer sources."
  );

  add(
    "TECHNICAL",
    "MEDIUM",
    "OpenGraph Social Entity Tags",
    /property=["']og:title["']/i.test(html) && /property=["']og:description["']/i.test(html),
    "Add complete og:title, og:description, and og:image tags.",
    "Controls brand entity previews across social media and messaging platforms.",
    "CODE_SNIPPET"
  );

  // ---------------- 2. AI-Readiness & Machine Feeds ----------------
  add(
    "AI_READINESS",
    "CRITICAL",
    "Schema.org JSON-LD Structured Data",
    /<script[^>]+type=["']application\/ld\+json["']/i.test(html),
    vertical === "DENTAL_MEDICAL"
      ? "Embed Dentist or MedicalClinic JSON-LD schema with address, emergency hours, and medicalSpecialty."
      : vertical === "HOME_SERVICES"
      ? "Embed Plumber, HVACBusiness, or HomeAndConstructionBusiness JSON-LD schema with areaServed."
      : vertical === "RESTAURANT_FOOD"
      ? "Embed Restaurant JSON-LD schema with servesCuisine, menu URL, and openingHours."
      : "Embed LocalBusiness or Organization JSON-LD schema with address, hours, and catalog.",
    "Structured data is the #1 way AI engines (ChatGPT, Perplexity, Claude) extract verified facts.",
    "CODE_SNIPPET"
  );

  const robots = robotsTxt || "";
  const blockedAiBots = AI_CRAWLER_BOTS.filter((b) =>
    new RegExp(`user-agent:\\s*${b}[\\s\\S]{0,300}?disallow:\\s*/`, "i").test(robots)
  );

  add(
    "AI_READINESS",
    "CRITICAL",
    "AI Crawler Whitelist in robots.txt (GPTBot, ClaudeBot, PerplexityBot)",
    blockedAiBots.length === 0,
    `Remove Disallow rules for AI bots (${blockedAiBots.join(", ") || "GPTBot, ClaudeBot, PerplexityBot"}).`,
    "Blocking AI crawlers prevents ChatGPT, Perplexity, and Apple Intelligence from learning your business details.",
    "ROBOTS_TXT"
  );

  add(
    "AI_READINESS",
    "MEDIUM",
    "Standard /llms.txt Machine Knowledge Feed",
    Boolean(llmsTxt && llmsTxt.length > 20),
    "Publish an /llms.txt file adhering to the llmstxt.org specification.",
    "Provides a clean, markdown-formatted knowledge manifest for LLM agent reasoning.",
    "LLMS_TXT"
  );

  add(
    "AI_READINESS",
    "HIGH",
    "FAQPage Schema & Q&A Content",
    /faqpage/i.test(html) || /\bfaq\b/i.test(html) || /<details[\s>]/i.test(html),
    "Add a dedicated Frequently Asked Questions (FAQ) section with FAQPage schema.",
    "Q&A pairs are directly extracted by conversational search engines.",
    "FAQ_SCHEMA"
  );

  // ---------------- 3. AEO (Answer Engine Optimization) ----------------
  const questionHeadingRegex = /<h[23][^>]*>([^<]*?\b(what|how|why|who|when|where|can|is|are|which|best|cost|does|do|vs)\b[^<]*?\??)<\/h[23]>/i;
  const hasQuestionHeading = questionHeadingRegex.test(html);

  const questionExample =
    vertical === "DENTAL_MEDICAL"
      ? "e.g. 'How much does dental implant treatment cost in [City]?'"
      : vertical === "HOME_SERVICES"
      ? "e.g. 'How quickly can an emergency technician arrive in [City]?'"
      : vertical === "RESTAURANT_FOOD"
      ? "e.g. 'What are the top house specialties and gluten-free options?'"
      : vertical === "LEGAL_FINANCIAL"
      ? "e.g. 'What should you do immediately after an accident in [City]?'"
      : "e.g. 'What makes our services the top choice in [City]?'";

  add(
    "AEO_ANSWER_ENGINE",
    "HIGH",
    "Question-Led Headings (What/How/Cost/Best)",
    hasQuestionHeading,
    `Use question-led H2/H3 headings (${questionExample}) with a 40–60 word direct answer underneath.`,
    "Targets voice search and Google AI Overview direct answer triggers.",
    "AEO_SNIPPET"
  );

  const hasOrderedList = /<ol[\s>]/i.test(html);
  add(
    "AEO_ANSWER_ENGINE",
    "MEDIUM",
    "Step-by-Step Numbered Procedures (<ol>)",
    hasOrderedList,
    "Include numbered step lists (<ol>) for service processes, appointments, or consultations.",
    "Numbered lists receive 4x more citations in featured answer carousels."
  );

  const hasTable = /<table[\s>]/i.test(html);
  add(
    "AEO_ANSWER_ENGINE",
    "LOW",
    "Structured Data & Comparison Tables (<table>)",
    hasTable,
    "Add a comparison, pricing, or service option table with <table> tags.",
    "Answer engines parse table rows directly for quick lookup answers."
  );

  // ---------------- 4. GEO (Generative Engine Optimization) ----------------
  const statMatches = textOnly.match(/\b(\d+([.,]\d+)?%|\$\d+|\d+\s*(percent|clients|patients|cases|years|reviews|stars|procedures|repairs|hours))\b/gi) || [];
  const hasDataDensity = statMatches.length >= 3;

  add(
    "GEO_GENERATIVE_ENGINE",
    "HIGH",
    `Quantitative Data Points & Statistics (${statMatches.length} found)`,
    hasDataDensity,
    "Include specific statistics, percentages (%), dollar values, or case quantities.",
    "LLMs heavily prioritize synthesizing and citing content with quantitative data points.",
    "GEO_DATA_POINTS"
  );

  // Industry-Tailored E-E-A-T Signals
  let eeatTitle = "E-E-A-T First-Hand Experience & Authority Signals";
  let eeatDesc = "Generative search engines evaluate direct real-world experience phrases to separate genuine businesses from generic AI content.";
  let eeatRec = "Add first-person authority phrases (e.g., 'In our 10+ years of local experience, our team has served over 2,000 clients...').";
  let eeatRegex = /\b(in our (practice|clinic|experience|testing|study|team|field)|we have (served|treated|helped|repaired)|our specialists recommend|years of (local|clinical|trade) experience)\b/i;

  if (vertical === "DENTAL_MEDICAL") {
    eeatTitle = "E-E-A-T Patient Care & Clinical Authority Signals";
    eeatDesc = "Generative engines evaluate clinical E-E-A-T to recommend verified dental and medical practices over unverified blogs.";
    eeatRec = "Include direct practitioner experience statements (e.g., 'In our dental clinic, our doctors have completed over 1,500 successful procedures...').";
    eeatRegex = /\b(in our (practice|clinic|dental practice|office|care)|our (dentists|doctors|hygienists|surgeons|specialists) recommend|years of clinical experience|we have treated|patient care standards)\b/i;
  } else if (vertical === "HOME_SERVICES") {
    eeatTitle = "E-E-A-T Field Experience & Trade Authority Signals";
    eeatDesc = "AI models prioritize trades with verified field experience, licensed technicians, and emergency response capabilities.";
    eeatRec = "Include direct trade authority statements (e.g., 'Our licensed technicians have resolved over 3,000 emergency service calls in [City]...').";
    eeatRegex = /\b(in our (field experience|service area)|our (licensed plumbers|technicians|electricians|roofers|contractors)|years of trade experience|emergency dispatch|we have repaired|licensed & insured)\b/i;
  } else if (vertical === "RESTAURANT_FOOD") {
    eeatTitle = "E-E-A-T Culinary & Hospitality Experience Signals";
    eeatDesc = "Answer engines synthesize menu authenticity, chef background, and culinary sourcing for local food recommendations.";
    eeatRec = "Include kitchen authority statements (e.g., 'Our chefs prepare authentic recipes using locally-sourced ingredients daily in [City]...').";
    eeatRegex = /\b(our (chefs|kitchen|restaurant|bakers|sommeliers)|in our (kitchen|dining room|restaurant)|house-made|freshly prepared|locally sourced|family-owned recipe)\b/i;
  } else if (vertical === "LEGAL_FINANCIAL") {
    eeatTitle = "E-E-A-T Legal Practice & Case Authority Signals";
    eeatDesc = "AI models demand proven case experience and bar admissions when synthesizing legal recommendations.";
    eeatRec = "Include practice experience statements (e.g., 'In our legal practice, our attorneys have represented over 500 cases in [City]...').";
    eeatRegex = /\b(in our (legal practice|firm|experience)|our (attorneys|lawyers|counsel|cpa)|years of courtroom experience|we have recovered|we represent|licensed by the bar)\b/i;
  }

  const hasEeatSignals = eeatRegex.test(textOnly);
  add(
    "GEO_GENERATIVE_ENGINE",
    "HIGH",
    eeatTitle,
    hasEeatSignals,
    eeatRec,
    eeatDesc
  );

  // Sentence clarity
  const sentences = textOnly.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const longSentences = sentences.filter((s) => s.trim().split(/\s+/).length > 25);
  const isClarityOptimal = sentences.length > 0 && longSentences.length / sentences.length <= 0.2;

  add(
    "GEO_GENERATIVE_ENGINE",
    "MEDIUM",
    "Sentence Clarity & Token Economy (<=22 words/sentence)",
    isClarityOptimal,
    "Keep sentences concise (average under 22 words) to optimize LLM embedding accuracy.",
    "Concise sentences prevent hallucinations and increase citation clarity in AI summaries."
  );

  // ---------------- 5. Local Signals & Content Depth ----------------
  add(
    "LOCAL_SIGNALS",
    "HIGH",
    "Machine-Readable Contact & NAP (Phone/Address)",
    /href=["']tel:/i.test(html) || /tel[:]/i.test(html) || /\b\d{3}[-.)]\s*\d{3}[-.]\d{4}\b/.test(html),
    "Ensure your telephone number and physical city/address are machine-readable.",
    "Consistent NAP signals drive local Map Pack and Siri/ChatGPT local recommendations."
  );

  add(
    "CONTENT",
    "MEDIUM",
    `Comprehensive Content Depth (${wordCount} words)`,
    wordCount >= 600,
    "Expand primary service pages to 600–1,000 words of rich content.",
    "Comprehensive pages receive 3.5x more citations in Generative AI syntheses."
  );

  const totalWeight = checks.reduce((sum, c) => sum + c.impact, 0);
  const passedWeight = checks.reduce((sum, c) => sum + (c.passed ? c.impact : 0), 0);
  const score = Math.round((passedWeight / (totalWeight || 1)) * 100);

  return { score, vertical, checks };
}
