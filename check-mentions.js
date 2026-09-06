const OpenAI = require("openai");
require("dotenv").config();

// Initialize OpenAI client pointed to OpenRouter's gateway
const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey || apiKey === "your_openrouter_key_here") {
  console.warn("\n⚠️  WARNING: OPENROUTER_API_KEY is not set in your .env file!");
  console.warn("Please add OPENROUTER_API_KEY=sk-or-v1-... to your .env file before running.\n");
}

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: apiKey || "dummy-key",
  defaultHeaders: {
    "HTTP-Referer": process.env.FRONTEND_URL || "https://icandothat.online",
    "X-Title": "BrandOS AI Mention Auditor",
  },
});

const BUSINESS_NAME = process.argv[2] || "BrandOS";
const CITY = process.argv[3] || "Tiranë";
const INDUSTRY = process.argv[4] || "SaaS / SEO";

// Target models across Perplexity, OpenAI, Anthropic, and Google
const modelsToCheck = [
  { id: "perplexity/sonar", label: "Perplexity Sonar (Live Web Search)" },
  { id: "openai/gpt-4o-mini", label: "ChatGPT (GPT-4o Mini)" },
  { id: "anthropic/claude-3-haiku", label: "Claude 3 Haiku" },
  { id: "google/gemini-2.5-flash", label: "Google Gemini 2.5 Flash" },
];

async function checkAIPresent() {
  const prompt = `I am researching top ${INDUSTRY} recommendations in ${CITY}. Does your knowledge base or recent web search data contain any mentions of a business named "${BUSINESS_NAME}"? If so, briefly summarize what you know or provide any context you have about them. If you have no record, state "No record found."`;

  console.log(`================================================================`);
  console.log(`🔍 BrandOS AI Mention Audit across OpenRouter`);
  console.log(`🎯 Target Business : "${BUSINESS_NAME}"`);
  console.log(`📍 Location        : ${CITY}`);
  console.log(`🏭 Industry        : ${INDUSTRY}`);
  console.log(`🔑 OpenRouter Key  : ${apiKey ? apiKey.slice(0, 10) + "..." : "MISSING"}`);
  console.log(`================================================================\n`);

  for (const item of modelsToCheck) {
    const startTime = Date.now();
    try {
      console.log(`⏱️ Querying ${item.label} [${item.id}]...`);

      const response = await openai.chat.completions.create({
        model: item.id,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 350,
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const answer = response.choices?.[0]?.message?.content?.trim() || "";
      const isMentioned = answer.toLowerCase().includes(BUSINESS_NAME.toLowerCase());

      console.log(`\n=================== [RESULT: ${item.label} (${elapsed}s)] ===================`);
      console.log(`Status: ${isMentioned ? "✅ MENTIONED" : "❌ ABSENT / NOT FOUND"}`);
      console.log(`-----------------------------------------------------------------`);
      console.log(answer);
      console.log(`=================================================================\n`);
    } catch (error) {
      console.error(`❌ Error querying ${item.id}:`, error.message);
    }
  }
}

if (require.main === module) {
  checkAIPresent();
}

module.exports = { checkAIPresent };
