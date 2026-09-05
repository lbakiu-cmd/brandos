export type EngineQuery = {
  businessName: string;
  city: string;
  industry: string;
};

export type EngineResult = {
  engine: string;
  mentioned: boolean;
  rank: number | null;
  sentiment: string;
  quote: string;
  source: "live" | "mock";
};

function buildPrompt(q: EngineQuery): string {
  return (
    "I am researching " + q.industry + " options in " + q.city + ". " +
    'Do you know "' + q.businessName + '"? ' +
    "List your top recommendations as a numbered list, and include anything you know about " +
    '"' + q.businessName + '".'
  );
}

// ---------------- Live providers ----------------

async function askOpenAI(q: EngineQuery): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildPrompt(q) }],
      max_tokens: 400,
    }),
  });
  if (!res.ok) return null;
  const json: any = await res.json();
  return json?.choices?.[0]?.message?.content ?? null;
}

async function askPerplexity(q: EngineQuery): Promise<string | null> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: buildPrompt(q) }],
    }),
  });
  if (!res.ok) return null;
  const json: any = await res.json();
  return json?.choices?.[0]?.message?.content ?? null;
}

async function askAnthropic(q: EngineQuery): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 400,
      messages: [{ role: "user", content: buildPrompt(q) }],
    }),
  });
  if (!res.ok) return null;
  const json: any = await res.json();
  return json?.content?.[0]?.text ?? null;
}

async function askGemini(q: EngineQuery): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.warn("⚠️ GEMINI_API_KEY is missing in worker environment.");
    return null;
  }
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + key,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(q) }] }],
        }),
      },
    );
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      console.error("❌ askGemini failed [HTTP " + res.status + "]:", errJson?.error?.message || res.statusText);
      return null;
    }
    const json: any = await res.json();
    return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err: any) {
    console.error("❌ askGemini network error:", err.message);
    return null;
  }
}

const PROVIDERS: Record<string, (q: EngineQuery) => Promise<string | null>> = {
  CHATGPT: askOpenAI,
  PERPLEXITY: askPerplexity,
  CLAUDE: askAnthropic,
  GEMINI: askGemini,
  GOOGLE_AI_OVERVIEW: askGemini,
  BING_COPILOT: askOpenAI,
};

// ---------------- Answer analysis ----------------

function detectRank(raw: string, name: string): number | null {
  const lines = raw.split(/\n+/);
  for (const line of lines) {
    const m = line.match(/^\s*(\d{1,2})[.)]\s*(.*)$/);
    if (m && m[2].toLowerCase().includes(name.toLowerCase())) return Number(m[1]);
  }
  return null;
}

function detectSentiment(raw: string): string {
  const lower = raw.toLowerCase();
  const pos = ["recommend", "well-regarded", "excellent", "great", "good", "trusted", "professional", "highly"].filter((w) => lower.includes(w)).length;
  const neg = ["avoid", "complaint", "bad", "poor", "scam", "worst", "negative"].filter((w) => lower.includes(w)).length;
  if (pos > neg) return "POSITIVE";
  if (neg > pos) return "NEGATIVE";
  return "NEUTRAL";
}

function analyze(engine: string, raw: string, q: EngineQuery): EngineResult {
  const mentioned = raw.toLowerCase().includes(q.businessName.toLowerCase());
  return {
    engine,
    mentioned,
    rank: mentioned ? detectRank(raw, q.businessName) : null,
    sentiment: mentioned ? detectSentiment(raw) : "ABSENT",
    quote: raw.length > 220 ? raw.slice(0, 220) + "…" : raw,
    source: "live",
  };
}

// ---------------- Mock fallback (deterministic) ----------------

function mockResult(engine: string, q: EngineQuery): EngineResult {
  const seed = (engine + q.businessName)
    .split("")
    .reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const mentioned = seed % 10 < 6;
  const rank = mentioned ? (seed % 3) + 1 : null;
  const sentiment = mentioned ? (seed % 5 === 0 ? "NEUTRAL" : "POSITIVE") : "ABSENT";
  const quote = mentioned
    ? q.businessName + " is a well-regarded " + q.industry + " provider in " + q.city + ". Customers frequently mention professional service."
    : "I don't have specific information about " + q.businessName + " in " + q.city + ". Consider checking local directories.";
  return { engine, mentioned, rank, sentiment, quote, source: "mock" };
}

// ---------------- Entry point ----------------

export async function queryEngine(engine: string, q: EngineQuery): Promise<EngineResult> {
  const provider = PROVIDERS[engine];
  if (provider) {
    try {
      const raw = await provider(q);
      if (raw) return analyze(engine, raw, q);
    } catch {
      // fall through to mock on any network/API error
    }
  }
  return mockResult(engine, q);
}