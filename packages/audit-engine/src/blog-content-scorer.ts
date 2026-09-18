/**
 * Pre-publish GEO/AEO/SEO scoring for AI-generated blog articles, mirroring
 * the checks the WordPress plugin's own analyzer applies after publishing
 * (plugins/aivision-seo/includes/class-analyzer.php) so weak drafts can be
 * caught and regenerated before ever reaching WordPress, instead of only
 * being visible after the fact in the plugin's dashboard.
 */

export interface ScorableArticle {
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  schemas?: any[];
}

export interface ScoreGap {
  key: string;
  message: string;
}

export interface ArticleScoreResult {
  score: number; // 0-100
  passed: boolean;
  gaps: ScoreGap[];
}

const PASS_THRESHOLD = 70;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function averageSentenceLength(text: string): number {
  const plain = text.replace(/```[\s\S]*?```/g, "").replace(/[#>*_`|-]/g, " ");
  const sentences = plain.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length > 2);
  if (sentences.length === 0) return 0;
  const totalWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).filter(Boolean).length, 0);
  return totalWords / sentences.length;
}

/**
 * Scores a not-yet-published article against the same broad checks the
 * plugin's own GEO/AEO analyzer applies to published posts. Each check is
 * weighted; failing checks are returned as gaps with human-readable
 * messages suitable for feeding back into a regeneration prompt.
 */
export function scoreArticle(article: ScorableArticle): ArticleScoreResult {
  const gaps: ScoreGap[] = [];
  let earned = 0;
  let total = 0;

  const checks: Array<{ key: string; weight: number; pass: boolean; message: string }> = [];

  // 1. Comprehensive length (>= 1000 words)
  const words = wordCount(article.content);
  checks.push({
    key: "comprehensive_words",
    weight: 15,
    pass: words >= 1000,
    message: `Content is ${words} words -- expand to at least 1000 words for comprehensive coverage.`,
  });

  // 2. Sentence clarity (<= 22 words average)
  const avgSentence = averageSentenceLength(article.content);
  checks.push({
    key: "sentence_clarity",
    weight: 10,
    pass: avgSentence > 0 && avgSentence <= 22,
    message: `Average sentence length is ${avgSentence.toFixed(1)} words -- keep sentences to 22 words or fewer for LLM synthesis accuracy.`,
  });

  // 3. Multi-schema graph (>= 2 JSON-LD schemas)
  const schemaCount = article.schemas?.length || 0;
  checks.push({
    key: "multi_schema",
    weight: 15,
    pass: schemaCount >= 2,
    message: `Only ${schemaCount} schema(s) present -- add at least 2 schema types (e.g. FAQPage + LocalBusiness) for deep entity parsing.`,
  });

  // 4. FAQPage schema specifically
  const hasFaqSchema = (article.schemas || []).some((s) => s?.["@type"] === "FAQPage");
  checks.push({
    key: "faq_schema",
    weight: 10,
    pass: hasFaqSchema,
    message: "Missing FAQPage schema -- add a dedicated FAQ section with FAQPage JSON-LD, the primary structured format for AI answer engines.",
  });

  // 5. Heading structure (H2 and H3 present)
  const hasH2 = /^##\s+/m.test(article.content);
  const hasH3 = /^###\s+/m.test(article.content);
  checks.push({
    key: "heading_structure",
    weight: 10,
    pass: hasH2 && hasH3,
    message: "Missing clear H2/H3 subheading structure -- organize content with H2 sections and H3 subsections.",
  });

  // 6. Bullet/numbered lists present
  const hasLists = /^(\s*[-*]\s+|\s*\d+\.\s+)/m.test(article.content);
  checks.push({
    key: "bullet_lists",
    weight: 10,
    pass: hasLists,
    message: "No bullet or numbered lists found -- add at least one list; structured lists improve LLM citation accuracy.",
  });

  // 7. Direct-answer blockquote near the top (AEO pattern)
  const hasDirectAnswer = /^>\s*\*\*/m.test(article.content);
  checks.push({
    key: "direct_answer",
    weight: 10,
    pass: hasDirectAnswer,
    message: "Missing a direct-answer blockquote -- add a concise (~45 word) blockquote answer near the top, engineered for AI Overviews and featured snippets.",
  });

  // 8. Focus keyword present in content and meta title
  const kw = (article.focusKeyword || "").toLowerCase().trim();
  const contentLower = article.content.toLowerCase();
  const titleLower = (article.metaTitle || article.title || "").toLowerCase();
  const kwInContent = kw.length > 0 && contentLower.includes(kw);
  const kwInTitle = kw.length > 0 && kw.split(" ").some((w) => w.length > 3 && titleLower.includes(w));
  checks.push({
    key: "keyword_placement",
    weight: 10,
    pass: kw.length === 0 || (kwInContent && kwInTitle),
    message: `Focus keyword "${article.focusKeyword}" is missing from the content or title -- work it in naturally.`,
  });

  // 9. Meta description length (120-160 chars is the SERP sweet spot)
  const metaLen = (article.metaDescription || "").length;
  checks.push({
    key: "meta_description_length",
    weight: 5,
    pass: metaLen >= 100 && metaLen <= 160,
    message: `Meta description is ${metaLen} characters -- aim for 120-160 characters for optimal SERP display.`,
  });

  // 10. External authority reference (citing a recognized source by name)
  const hasCitation = /\b(according to|source:|cited by|study by|data from)\b/i.test(article.content) ||
    /\b(American Dental Association|Mayo Clinic|CDC|WebMD|American Medical Association|FDA|WHO)\b/i.test(article.content);
  checks.push({
    key: "external_citations",
    weight: 5,
    pass: hasCitation,
    message: "No reference to an external authoritative source -- cite a recognized authority by name (e.g. a relevant professional association) for a broadly established fact, without inventing statistics.",
  });

  for (const check of checks) {
    total += check.weight;
    if (check.pass) {
      earned += check.weight;
    } else {
      gaps.push({ key: check.key, message: check.message });
    }
  }

  const score = total > 0 ? Math.round((earned / total) * 100) : 0;

  return {
    score,
    passed: score >= PASS_THRESHOLD,
    gaps,
  };
}

export { PASS_THRESHOLD as ARTICLE_SCORE_PASS_THRESHOLD };
