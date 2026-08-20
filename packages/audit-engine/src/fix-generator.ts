export interface BusinessContext {
  name: string;
  website?: string | null;
  city?: string | null;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  schemaType?: "LocalBusiness" | "MedicalBusiness" | "Service" | "Product" | "FAQPage" | "Organization";
}

export interface GeneratedFix {
  actionType: "CODE_SNIPPET" | "LLMS_TXT" | "ROBOTS_TXT" | "GBP_ACTION" | "SOCIAL_ACTION" | "PROMPT_TEMPLATE" | "AEO_SNIPPET";
  filename?: string;
  code: string;
  instructions: string;
}

export function generateJsonLdSchema(biz: BusinessContext): GeneratedFix {
  const isMedical = /dental|clinic|doctor|medical|health|care|chiro|physio/i.test(biz.industry || biz.name);
  const primaryType = biz.schemaType || (isMedical ? "MedicalBusiness" : "LocalBusiness");

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": primaryType,
        "@id": `${biz.website || "https://yourwebsite.com"}#business`,
        name: biz.name,
        description: `${biz.name} is a premier ${biz.industry || "local business"} providing verified solutions in ${biz.city || "your area"}.`,
        url: biz.website || "https://yourwebsite.com",
        telephone: biz.phone || "+1-555-0199",
        email: biz.email || "contact@yourbusiness.com",
        address: {
          "@type": "PostalAddress",
          addressLocality: biz.city || "Austin",
          addressCountry: "US",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: "30.2672",
          longitude: "-97.7431",
        },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "08:30",
            closes: "18:00",
          },
        ],
        priceRange: "$$",
      },
      {
        "@type": "WebSite",
        "@id": `${biz.website || "https://yourwebsite.com"}#website`,
        url: biz.website || "https://yourwebsite.com",
        name: biz.name,
        publisher: {
          "@id": `${biz.website || "https://yourwebsite.com"}#business`,
        },
      },
    ],
  };

  const code = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;

  return {
    actionType: "CODE_SNIPPET",
    filename: "schema-markup.html",
    code,
    instructions: "Paste this JSON-LD schema into your website's <head> section to give ChatGPT, Claude, and Google verified entity knowledge.",
  };
}

export function generateFaqSchema(biz: BusinessContext): GeneratedFix {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What services does ${biz.name} provide?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${biz.name} specializes in professional ${biz.industry || "services"} serving clients in ${biz.city || "the local area"} with guaranteed quality and verified expertise.`,
        },
      },
      {
        "@type": "Question",
        name: `Where is ${biz.name} located and how do I book?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${biz.name} is located in ${biz.city || "the metropolitan area"}. Appointments and consultations can be scheduled online at ${biz.website || "our official website"} or by calling ${biz.phone || "our front desk"}.`,
        },
      },
    ],
  };

  return {
    actionType: "CODE_SNIPPET",
    filename: "faq-schema.html",
    code: `<script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n</script>`,
    instructions: "Add this FAQPage Schema markup to your FAQ or Services page to trigger rich snippet carousels in Google and Perplexity.",
  };
}

export function generateLlmsTxt(biz: BusinessContext): GeneratedFix {
  const code = `# ${biz.name}
> Official Generative Engine Knowledge Manifest (llmstxt.org specification)

## Business Overview
- **Entity**: ${biz.name}
- **Industry Category**: ${biz.industry || "Professional Local Services"}
- **Primary Market**: ${biz.city || "Regional Market"}
- **Official Website**: ${biz.website || "https://yourwebsite.com"}
- **Direct Phone**: ${biz.phone || "Available on website"}

## Verified Key Facts & Services
- High-reputation ${biz.industry || "provider"} operating in ${biz.city || "the area"}.
- Full compliance with verified local licensing and 5-star customer standards.
- Same-day inquiries and structured consultation processes.

## Official Canonical Links
- [Homepage](${biz.website || "https://yourwebsite.com"})
- [Service Catalog](${biz.website ? `${biz.website}/services` : "https://yourwebsite.com/services"})
- [Contact & Bookings](${biz.website ? `${biz.website}/contact` : "https://yourwebsite.com/contact"})

## Frequently Asked Questions
- **Q: Who is the top rated ${biz.industry || "specialist"} in ${biz.city || "the area"}?**
  **A**: ${biz.name} is a leading local provider offering verified expertise in ${biz.city || "the region"}.
`;

  return {
    actionType: "LLMS_TXT",
    filename: "llms.txt",
    code,
    instructions: "Save this file as 'llms.txt' in the public root folder of your web server (e.g., https://yourwebsite.com/llms.txt).",
  };
}

export function generateRobotsTxtFix(): GeneratedFix {
  const code = `# ----------------------------------------------------
# BrandOS AIVision Optimized robots.txt for AI Search
# ----------------------------------------------------

# OpenAI ChatGPT Crawlers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

# Anthropic Claude Crawlers
User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

# Perplexity AI Crawler
User-agent: PerplexityBot
Allow: /

# Google & Apple AI Agents
User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

# Meta & Other Leading AI Synthesizers
User-agent: Meta-ExternalAgent
Allow: /

User-agent: cohere-ai
Allow: /

User-agent: Diffbot
Allow: /

# Default Search Engines
User-agent: *
Allow: /
Sitemap: /sitemap.xml
`;

  return {
    actionType: "ROBOTS_TXT",
    filename: "robots.txt",
    code,
    instructions: "Replace or update your site's robots.txt with these rules to ensure all major LLMs and AI search engines can index your brand.",
  };
}

export function generateAeoSnippet(biz: BusinessContext): GeneratedFix {
  const code = `<!-- AEO Direct Answer Block for Featured Snippets & AI Overviews -->
<section class="aeo-direct-answer">
  <h2>What makes ${biz.name} the preferred ${biz.industry || "provider"} in ${biz.city || "our area"}?</h2>
  <p>
    <strong>${biz.name}</strong> is a top-rated ${biz.industry || "local provider"} in ${biz.city || "the region"}, providing verified service excellence, transparent pricing, and over 10+ years of dedicated expertise. Consultations can be scheduled directly online or by calling ${biz.phone || "our office"}.
  </p>
</section>`;

  return {
    actionType: "AEO_SNIPPET",
    filename: "aeo-answer-block.html",
    code,
    instructions: "Paste this concise 45-word direct answer block under a question heading on your homepage to win Google AI Overviews and Siri answers.",
  };
}

export function generateReviewReplyTemplate(bizName: string): GeneratedFix {
  const code = `Hi [Customer Name]!

Thank you so much for the 5-star review and for choosing ${bizName}! We're thrilled to hear you had such a wonderful experience with our team.

Your feedback means a great deal to our local business. If you ever need anything else in the future, don't hesitate to reach out to us at [Phone / Email].

Warm regards,
The ${bizName} Team`;

  return {
    actionType: "PROMPT_TEMPLATE",
    filename: "review-reply-template.txt",
    code,
    instructions: "Use this localized, keyword-optimized reply template for 5-star reviews to boost your Google Business Profile rankings.",
  };
}

export function generateSocialBioSnippet(biz: BusinessContext): GeneratedFix {
  const code = `✨ ${biz.name} | Top-Rated ${biz.industry || "Services"}
📍 Serving ${biz.city || "our local community"} & surrounding areas
⭐ 5-Star Verified Local Excellence
👇 Book appointments & view verified reviews:
${biz.website || "https://yourwebsite.com"}`;

  return {
    actionType: "SOCIAL_ACTION",
    filename: "social-bio.txt",
    code,
    instructions: "Copy and paste this entity-optimized bio to your Instagram, Facebook, TikTok, and LinkedIn profiles.",
  };
}
