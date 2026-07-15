import { env } from "@brandos/config";
import {
  createPrismaClient,
  Prisma,
  WebsiteAuditFindingCategory,
  WebsiteAuditFindingSeverity,
  WebsiteAuditFindingStatus,
  WebsiteCrawlStatus,
} from "@brandos/database";
import {
  brandosVersion,
  type WebsiteCrawlJobData,
  websiteCrawlQueueName,
} from "@brandos/shared";
import { Worker } from "bullmq";
import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { TextDecoder } from "node:util";

const fetchTimeoutMs = 15_000;
const maxRedirects = 5;
const maxHomepageBytes = 1_000_000;
const prisma = createPrismaClient();

type HomepageMetadata = {
  finalUrl: string;
  httpStatus: number;
  pageTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  language: string | null;
  h1Count: number;
  h1Texts: string[];
  schemaTypes: string[];
  fetchedAt: string;
  responseContentType: string | null;
};

type AuditFindingDraft = {
  code: string;
  category: WebsiteAuditFindingCategory;
  severity: WebsiteAuditFindingSeverity;
  title: string;
  description: string;
  recommendation?: string;
  evidence?: Prisma.InputJsonObject;
};

const deterministicFindingCodes = [
  "missing_title",
  "title_too_short",
  "title_too_long",
  "missing_meta_description",
  "meta_description_too_short",
  "meta_description_too_long",
  "missing_canonical_url",
  "missing_h1",
  "multiple_h1s",
  "missing_json_ld_schema",
  "missing_local_business_schema",
  "robots_noindex_detected",
  "missing_language_attribute",
];

const worker = new Worker<WebsiteCrawlJobData>(
  websiteCrawlQueueName,
  async (job) => {
    await processWebsiteCrawl(job.data);
  },
  {
    connection: redisConnectionFromUrl(env.redisUrl),
  },
);

worker.on("ready", () => {
  console.log(`BrandOS worker started (${brandosVersion})`);
});

worker.on("failed", (job, error) => {
  console.error(
    `Website crawl job ${job?.id ?? "unknown"} failed before crawling: ${error.message}`,
  );
});

function redisConnectionFromUrl(redisUrl: string) {
  const parsedUrl = new URL(redisUrl);

  return {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 6379),
    username: parsedUrl.username || undefined,
    password: parsedUrl.password || undefined,
  };
}

async function processWebsiteCrawl(data: WebsiteCrawlJobData) {
  const crawl = await prisma.websiteCrawl.findUnique({
    where: { id: data.crawlId },
    include: { website: true },
  });

  if (!crawl) {
    console.warn(`Website crawl ${data.crawlId} was not found.`);
    return;
  }

  if (crawl.websiteId !== data.websiteId) {
    await failCrawl(
      crawl.id,
      "Queued crawl did not match the requested website.",
    );
    return;
  }

  await prisma.websiteCrawl.update({
    where: { id: crawl.id },
    data: {
      status: WebsiteCrawlStatus.RUNNING,
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    },
  });

  try {
    const metadata = await fetchHomepageMetadata(crawl.website.normalizedUrl);

    await prisma.websiteCrawl.update({
      where: { id: crawl.id },
      data: {
        status: WebsiteCrawlStatus.COMPLETED,
        completedAt: new Date(),
        errorMessage: null,
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
    await syncAuditFindings(crawl.websiteId, crawl.id, metadata);

    console.log(`Completed website crawl ${crawl.id}.`);
  } catch (error) {
    const message = safeErrorMessage(error);
    await failCrawl(crawl.id, message);
    console.warn(`Website crawl ${crawl.id} failed: ${message}`);
  }
}

async function syncAuditFindings(
  websiteId: string,
  crawlId: string,
  metadata: HomepageMetadata,
) {
  const findings = analyzeHomepageMetadata(metadata);
  const activeCodes = new Set(findings.map((finding) => finding.code));

  await prisma.$transaction(async (tx) => {
    await tx.websiteAuditFinding.updateMany({
      where: {
        websiteId,
        status: WebsiteAuditFindingStatus.OPEN,
        code: {
          in: deterministicFindingCodes.filter(
            (code) => !activeCodes.has(code),
          ),
        },
      },
      data: {
        status: WebsiteAuditFindingStatus.RESOLVED,
        crawlId,
      },
    });

    for (const finding of findings) {
      const existingFinding = await tx.websiteAuditFinding.findUnique({
        where: {
          websiteId_code: {
            websiteId,
            code: finding.code,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (existingFinding?.status === WebsiteAuditFindingStatus.IGNORED) {
        continue;
      }

      await tx.websiteAuditFinding.upsert({
        where: {
          websiteId_code: {
            websiteId,
            code: finding.code,
          },
        },
        create: {
          websiteId,
          crawlId,
          category: finding.category,
          severity: finding.severity,
          status: WebsiteAuditFindingStatus.OPEN,
          code: finding.code,
          title: finding.title,
          description: finding.description,
          recommendation: finding.recommendation,
          evidence: finding.evidence,
        },
        update: {
          crawlId,
          category: finding.category,
          severity: finding.severity,
          status: WebsiteAuditFindingStatus.OPEN,
          title: finding.title,
          description: finding.description,
          recommendation: finding.recommendation,
          evidence: finding.evidence,
        },
      });
    }
  });
}

function analyzeHomepageMetadata(metadata: HomepageMetadata) {
  const findings: AuditFindingDraft[] = [];
  const titleLength = metadata.pageTitle?.length ?? 0;
  const metaDescriptionLength = metadata.metaDescription?.length ?? 0;
  const schemaTypes = metadata.schemaTypes.map((schemaType) =>
    schemaType.toLowerCase(),
  );

  if (!metadata.pageTitle) {
    findings.push({
      code: "missing_title",
      category: WebsiteAuditFindingCategory.CONTENT,
      severity: WebsiteAuditFindingSeverity.HIGH,
      title: "Homepage title is missing",
      description:
        "The homepage does not expose a title tag in the fetched HTML metadata.",
      recommendation:
        "Add a concise, descriptive title tag that names the business and primary service.",
      evidence: { pageTitle: metadata.pageTitle },
    });
  } else if (titleLength < 30) {
    findings.push({
      code: "title_too_short",
      category: WebsiteAuditFindingCategory.CONTENT,
      severity: WebsiteAuditFindingSeverity.LOW,
      title: "Homepage title is very short",
      description:
        "The homepage title may not give search and AI systems enough context.",
      recommendation:
        "Expand the title to include the business name, main offer, and local context where useful.",
      evidence: { pageTitle: metadata.pageTitle, length: titleLength },
    });
  } else if (titleLength > 60) {
    findings.push({
      code: "title_too_long",
      category: WebsiteAuditFindingCategory.CONTENT,
      severity: WebsiteAuditFindingSeverity.LOW,
      title: "Homepage title is long",
      description:
        "The homepage title is likely to be truncated in search surfaces.",
      recommendation:
        "Keep the title focused and closer to 50-60 characters where possible.",
      evidence: { pageTitle: metadata.pageTitle, length: titleLength },
    });
  }

  if (!metadata.metaDescription) {
    findings.push({
      code: "missing_meta_description",
      category: WebsiteAuditFindingCategory.CONTENT,
      severity: WebsiteAuditFindingSeverity.MEDIUM,
      title: "Meta description is missing",
      description:
        "The homepage does not expose a meta description in the fetched HTML metadata.",
      recommendation:
        "Add a clear meta description summarizing the business, service, and location.",
      evidence: { metaDescription: metadata.metaDescription },
    });
  } else if (metaDescriptionLength < 70) {
    findings.push({
      code: "meta_description_too_short",
      category: WebsiteAuditFindingCategory.CONTENT,
      severity: WebsiteAuditFindingSeverity.LOW,
      title: "Meta description is short",
      description:
        "The meta description may not provide enough context for search and AI summaries.",
      recommendation:
        "Write a fuller description that explains what the business does and who it serves.",
      evidence: {
        metaDescription: metadata.metaDescription,
        length: metaDescriptionLength,
      },
    });
  } else if (metaDescriptionLength > 160) {
    findings.push({
      code: "meta_description_too_long",
      category: WebsiteAuditFindingCategory.CONTENT,
      severity: WebsiteAuditFindingSeverity.LOW,
      title: "Meta description is long",
      description:
        "The meta description may be truncated in search result snippets.",
      recommendation:
        "Trim the description while keeping the strongest business and local signals.",
      evidence: {
        metaDescription: metadata.metaDescription,
        length: metaDescriptionLength,
      },
    });
  }

  if (!metadata.canonicalUrl) {
    findings.push({
      code: "missing_canonical_url",
      category: WebsiteAuditFindingCategory.TECHNICAL,
      severity: WebsiteAuditFindingSeverity.LOW,
      title: "Canonical URL is missing",
      description:
        "The homepage does not expose a canonical URL in the fetched HTML metadata.",
      recommendation:
        "Add a canonical link tag that points to the preferred homepage URL.",
      evidence: { canonicalUrl: metadata.canonicalUrl },
    });
  }

  if (metadata.h1Count === 0) {
    findings.push({
      code: "missing_h1",
      category: WebsiteAuditFindingCategory.CONTENT,
      severity: WebsiteAuditFindingSeverity.MEDIUM,
      title: "Homepage H1 is missing",
      description:
        "The homepage does not expose an H1 heading in the fetched HTML.",
      recommendation:
        "Add one clear H1 that describes the business or primary service.",
      evidence: { h1Count: metadata.h1Count, h1Texts: metadata.h1Texts },
    });
  } else if (metadata.h1Count > 1) {
    findings.push({
      code: "multiple_h1s",
      category: WebsiteAuditFindingCategory.CONTENT,
      severity: WebsiteAuditFindingSeverity.INFO,
      title: "Multiple H1 headings detected",
      description:
        "The homepage exposes more than one H1 heading, which can make page structure less clear.",
      recommendation:
        "Use one primary H1 and demote secondary headings to H2 or H3 where appropriate.",
      evidence: { h1Count: metadata.h1Count, h1Texts: metadata.h1Texts },
    });
  }

  if (metadata.schemaTypes.length === 0) {
    findings.push({
      code: "missing_json_ld_schema",
      category: WebsiteAuditFindingCategory.SCHEMA,
      severity: WebsiteAuditFindingSeverity.MEDIUM,
      title: "JSON-LD schema is missing",
      description: "No JSON-LD schema types were detected on the homepage.",
      recommendation:
        "Add structured data for the business, organization, services, or local entity.",
      evidence: { schemaTypes: metadata.schemaTypes },
    });
  }

  if (!schemaTypes.includes("localbusiness")) {
    findings.push({
      code: "missing_local_business_schema",
      category: WebsiteAuditFindingCategory.LOCAL_SEO,
      severity: WebsiteAuditFindingSeverity.MEDIUM,
      title: "LocalBusiness schema is missing",
      description:
        "The homepage does not expose LocalBusiness schema in detected JSON-LD types.",
      recommendation:
        "Add LocalBusiness schema with accurate name, address, phone, URL, and business category when applicable.",
      evidence: { schemaTypes: metadata.schemaTypes },
    });
  }

  if (metadata.robotsMeta?.toLowerCase().includes("noindex")) {
    findings.push({
      code: "robots_noindex_detected",
      category: WebsiteAuditFindingCategory.TECHNICAL,
      severity: WebsiteAuditFindingSeverity.HIGH,
      title: "Robots noindex detected",
      description:
        "The homepage robots meta tag includes noindex, which can prevent indexing.",
      recommendation:
        "Remove noindex from the homepage unless this page is intentionally hidden from search engines.",
      evidence: { robotsMeta: metadata.robotsMeta },
    });
  }

  if (!metadata.language) {
    findings.push({
      code: "missing_language_attribute",
      category: WebsiteAuditFindingCategory.TECHNICAL,
      severity: WebsiteAuditFindingSeverity.INFO,
      title: "Language attribute is missing",
      description:
        "The homepage HTML element does not expose a language attribute.",
      recommendation:
        'Add a lang attribute such as lang="en" to help systems understand the page language.',
      evidence: { language: metadata.language },
    });
  }

  return findings;
}

async function failCrawl(crawlId: string, errorMessage: string) {
  await prisma.websiteCrawl.update({
    where: { id: crawlId },
    data: {
      status: WebsiteCrawlStatus.FAILED,
      completedAt: new Date(),
      errorMessage,
    },
  });
}

async function fetchHomepageMetadata(
  rawUrl: string,
): Promise<HomepageMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);

  try {
    const { response, finalUrl } = await fetchWithSafeRedirects(
      rawUrl,
      controller.signal,
    );
    const responseContentType = response.headers.get("content-type");

    if (!isHtmlContentType(responseContentType)) {
      await response.body?.cancel();
      throw new Error("Homepage did not return HTML content.");
    }

    const html = await readLimitedResponse(response);

    return {
      ...extractHomepageMetadata(html, finalUrl),
      finalUrl,
      httpStatus: response.status,
      fetchedAt: new Date().toISOString(),
      responseContentType,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithSafeRedirects(rawUrl: string, signal: AbortSignal) {
  let currentUrl = await parseSafeHttpUrl(rawUrl);

  for (
    let redirectCount = 0;
    redirectCount <= maxRedirects;
    redirectCount += 1
  ) {
    const response = await fetch(currentUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": `BrandOS/${brandosVersion} homepage-metadata-worker`,
      },
      redirect: "manual",
      signal,
    });

    if (!isRedirectStatus(response.status)) {
      return {
        response,
        finalUrl: currentUrl.toString(),
      };
    }

    const location = response.headers.get("location");
    await response.body?.cancel();

    if (!location) {
      throw new Error("Homepage redirect did not include a location.");
    }

    currentUrl = await parseSafeHttpUrl(
      new URL(location, currentUrl).toString(),
    );
  }

  throw new Error("Homepage redirected too many times.");
}

async function parseSafeHttpUrl(rawUrl: string) {
  const parsedUrl = new URL(rawUrl);

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Website URL must use HTTP or HTTPS.");
  }

  await assertPublicHostname(parsedUrl.hostname);
  return parsedUrl;
}

async function assertPublicHostname(rawHostname: string) {
  const hostname = rawHostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.length === 0
  ) {
    throw new Error("Localhost URLs cannot be crawled.");
  }

  const directIpVersion = isIP(hostname);
  if (directIpVersion !== 0) {
    assertPublicIp(hostname, directIpVersion as 4 | 6);
    return;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0) {
    throw new Error("Website hostname could not be resolved.");
  }

  for (const address of addresses) {
    const ipVersion = isIP(address.address);
    if (ipVersion !== 0) {
      assertPublicIp(address.address, ipVersion as 4 | 6);
    }
  }
}

function assertPublicIp(address: string, ipVersion: 4 | 6) {
  if (ipVersion === 4 && isPrivateIpv4(address)) {
    throw new Error("Private network addresses cannot be crawled.");
  }

  if (ipVersion === 6 && isPrivateIpv6(address)) {
    throw new Error("Private network addresses cannot be crawled.");
  }
}

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  const [first = 0, second = 0] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("ff")
  ) {
    return true;
  }

  if (normalized.startsWith("::ffff:")) {
    const mappedAddress = normalized.slice("::ffff:".length);
    return isIP(mappedAddress) === 4 && isPrivateIpv4(mappedAddress);
  }

  const firstSegment = Number.parseInt(normalized.split(":")[0] ?? "", 16);
  return (
    Number.isFinite(firstSegment) &&
    ((firstSegment & 0xfe00) === 0xfc00 || (firstSegment & 0xffc0) === 0xfe80)
  );
}

function isRedirectStatus(status: number) {
  return status >= 300 && status < 400;
}

function isHtmlContentType(contentType: string | null) {
  if (!contentType) {
    return true;
  }

  const normalized = contentType.toLowerCase();
  return (
    normalized.includes("text/html") ||
    normalized.includes("application/xhtml+xml")
  );
}

async function readLimitedResponse(response: Response) {
  if (!response.body) {
    throw new Error("Homepage response body was empty.");
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (contentLength > maxHomepageBytes) {
    throw new Error("Homepage response was too large to process safely.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    receivedBytes += value.byteLength;
    if (receivedBytes > maxHomepageBytes) {
      await reader.cancel();
      throw new Error("Homepage response was too large to process safely.");
    }

    chunks.push(value);
  }

  const body = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(body);
}

function extractHomepageMetadata(html: string, finalUrl: string) {
  const $ = cheerio.load(html);
  const h1Texts = $("h1")
    .map((_, element) => normalizeText($(element).text()))
    .get()
    .filter((text) => text.length > 0);

  return {
    pageTitle: normalizeOptionalText($("title").first().text()),
    metaDescription: normalizeOptionalText(
      $('meta[name="description" i]').first().attr("content"),
    ),
    canonicalUrl: normalizeCanonicalUrl(
      $('link[rel~="canonical" i]').first().attr("href"),
      finalUrl,
    ),
    robotsMeta: normalizeOptionalText(
      $('meta[name="robots" i]').first().attr("content"),
    ),
    language: normalizeOptionalText($("html").first().attr("lang")),
    h1Count: h1Texts.length,
    h1Texts: h1Texts.slice(0, 5),
    schemaTypes: extractSchemaTypes($),
  };
}

function normalizeCanonicalUrl(value: string | undefined, baseUrl: string) {
  const text = normalizeOptionalText(value);
  if (!text) {
    return null;
  }

  try {
    return new URL(text, baseUrl).toString();
  } catch {
    return text;
  }
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = normalizeText(value ?? "");
  return normalized.length > 0 ? normalized : null;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractSchemaTypes($: cheerio.CheerioAPI) {
  const schemaTypes = new Set<string>();

  $('script[type="application/ld+json" i]').each((_, element) => {
    const jsonText = $(element).contents().text().trim();
    if (!jsonText) {
      return;
    }

    try {
      collectSchemaTypes(JSON.parse(jsonText) as unknown, schemaTypes);
    } catch {
      return;
    }
  });

  return [...schemaTypes].sort();
}

function collectSchemaTypes(value: unknown, schemaTypes: Set<string>) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSchemaTypes(item, schemaTypes);
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const typeValue = value["@type"];
  if (typeof typeValue === "string") {
    schemaTypes.add(typeValue);
  } else if (Array.isArray(typeValue)) {
    for (const item of typeValue) {
      if (typeof item === "string") {
        schemaTypes.add(item);
      }
    }
  }

  collectSchemaTypes(value["@graph"], schemaTypes);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.name === "AbortError"
        ? "Homepage fetch timed out."
        : error.message
      : "Homepage crawl failed.";

  return message.replace(/\s+/g, " ").slice(0, 500);
}
