const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const noop = () => () => {};
class BadRequestException extends Error {}
const nest = new Proxy({
  BadRequestException, NotFoundException: Error,
  Logger: class { warn() {} },
  UseGuards: (...guards) => (target, key) => { target[key].guards = guards; },
}, { get: (target, key) => target[key] || noop });
class AuthGuard {}
function load(relative, prisma = {}, fetch = async () => { throw Error("Unexpected network request"); }) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
  }).outputText;
  const exports = {};
  const sandbox = {
    exports, process, console, URLSearchParams, AbortSignal, Date,
    require: name => name === "@nestjs/common" ? nest
      : name === "@brandos/database" ? { prisma, IntegrationProvider: { GOOGLE_ANALYTICS_4: "GOOGLE_ANALYTICS_4", GOOGLE_SEARCH_CONSOLE: "GOOGLE_SEARCH_CONSOLE" } }
      : name.includes("auth.guard") ? { AuthGuard }
      : name.startsWith(".") ? {} : require(name),
    fetch,
  };
  vm.runInNewContext(js, sandbox, { filename: relative });
  return exports;
}
const wpPath = "apps/api/src/wordpress/wordpress.service.ts";
const googlePath = "apps/api/src/oauth/google-oauth.service.ts";
const response = (data, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => data });
const business = { id: "mine", wordpressUrl: "https://example.test", wordpressApiKey: "secret" };

test("plugin updates require authentication and use the resolved business", async () => {
  const { WordpressController } = load("apps/api/src/wordpress/wordpress.controller.ts");
  assert.equal(WordpressController.prototype.pushUpdate.guards[0], AuthGuard);
  let args;
  const controller = new WordpressController(
    { broadcastPluginUpdate: (...values) => { args = values; } },
    { get: async (user, active) => { assert.equal(user, "user"); assert.equal(active, "mine"); return business; } },
  );
  await controller.pushUpdate({ user: { id: "user", activeBusinessId: "mine" } }, "1.6.3");
  assert.deepEqual(args, ["mine", "1.6.3"]);
});

test("plugin update service cannot select other businesses or omit the scope", async () => {
  let where;
  const { WordpressService } = load(wpPath, { business: { findMany: async query => { where = query.where; return []; } } });
  const service = new WordpressService();
  await assert.rejects(service.broadcastPluginUpdate(undefined), /business is required/);
  await service.broadcastPluginUpdate("mine");
  assert.equal(where.id, "mine");
});

for (const failure of ["network", "http", "invalid", "missing-summary"]) {
  test("failed WordPress sync preserves stored data: " + failure, async () => {
    let writes = 0;
    const prisma = { business: { findUnique: async () => business, update: async () => { writes++; } } };
    const fetch = async () => {
      if (failure === "network") throw Error("Offline");
      if (failure === "http") return response({}, false);
      if (failure === "invalid") return { ok: true, json: async () => { throw Error("Invalid JSON"); } };
      return response({ success: true });
    };
    const { WordpressService } = load(wpPath, prisma, fetch);
    await assert.rejects(new WordpressService().sync("mine"), /Failed to sync/);
    assert.equal(writes, 0);
  });
}

test("successful sync persists real telemetry and scores including zero", async () => {
  let stored;
  let widget;
  const summary = { average_seo: 95, average_aeo: 71, average_geo: 0, count: 1 };
  const prisma = {
    business: { findUnique: async () => business, update: async query => { stored = query.data; } },
    dashboardWidget: { updateMany: async query => { widget = query.data.config; } },
    metricSnapshot: { createMany: async () => {} },
  };
  const { WordpressService } = load(wpPath, prisma, async url =>
    response(url.endsWith("/status") ? { success: true, plugin_version: "1.6.3" } : { success: true, summary }));
  const result = await new WordpressService().sync("mine");
  assert.equal(result.success, true);
  assert.equal(stored.wordpressTelemetry.telemetry.summary.average_seo, 95);
  assert.equal(widget.avgGeo, 0);
  assert.ok(stored.wordpressLastSyncedAt);
});

test("dashboard connection failure does not save a false connected state", async () => {
  let writes = 0;
  const { WordpressService } = load(wpPath, {
    business: { findUnique: async () => business, update: async () => { writes++; } },
  }, async () => response({}, false));
  await assert.rejects(new WordpressService().connectFromDashboard("mine", "https://example.test"), /Could not verify/);
  assert.equal(writes, 0);
});

test("GA4 retains real zeroes and requests the selected period", async () => {
  const requests = [];
  const { GoogleOAuthService } = load(googlePath, {}, async (url, options) => {
    if (url.includes("accountSummaries")) return response({ accountSummaries: [{ propertySummaries: [{ displayName: "example.test", property: "properties/123" }] }] });
    requests.push(JSON.parse(options.body));
    return response({ rows: [], rowCount: 0 });
  });
  const metrics = await new GoogleOAuthService().fetchGa4Metrics("token", "example.test", undefined, 7);
  assert.equal(metrics.totalUsers, 0);
  assert.equal(metrics.totalSessions, 0);
  assert.equal(metrics.aiReferralSessions, 0);
  assert.equal(metrics.aiReferralShare, 0);
  assert.equal(metrics.socialReferralSessions, 0);
  assert.equal(metrics.measurementVersion, 2);
  assert.equal(requests[0].dateRanges[0].startDate, "7daysAgo");
  assert.equal(requests[0].dateRanges[0].endDate, "yesterday");
  assert.equal(requests[0].dimensions.length, 0);
});

test("GA4 pagination includes all sources without adding source user counts", async () => {
  const requests = [];
  const { GoogleOAuthService } = load(googlePath, {}, async (url, options) => {
    if (url.includes("accountSummaries")) return response({ accountSummaries: [{ propertySummaries: [{ displayName: "example.test", property: "properties/123" }] }] });
    const query = JSON.parse(options.body);
    requests.push(query);
    if (!query.dimensions.length) return response({ rows: [{ metricValues: [{ value: "3" }, { value: "10" }] }] });
    const source = query.offset === 0 ? "chatgpt.com" : "perplexity.ai";
    return response({ rowCount: 2, rows: [{ dimensionValues: [{ value: source }], metricValues: [{ value: "2" }] }] });
  });
  const metrics = await new GoogleOAuthService().fetchGa4Metrics("token", "example.test", undefined, 30);
  assert.equal(metrics.totalUsers, 3);
  assert.equal(metrics.aiReferralSessions, 4);
  assert.equal(metrics.aiReferralShare, 40);
  assert.equal(metrics.aiEngines.length, 2);
  assert.equal(metrics.aiEngines[0].growth, undefined);
  assert.equal(metrics.aiEngines[0].goalConvRate, undefined);
  assert.equal(requests[2].offset, 1);
});

test("GA4 does not silently report another business's property", async () => {
  let reports = 0;
  const { GoogleOAuthService } = load(googlePath, {}, async url => {
    if (url.includes("accountSummaries")) return response({ accountSummaries: [{ propertySummaries: [{ displayName: "Other business", property: "properties/456" }] }] });
    reports++;
    return response({});
  });
  assert.equal(await new GoogleOAuthService().fetchGa4Metrics("token", "example.test"), null);
  assert.equal(reports, 0);
});

test("analytics route validates ranges and selects the GA4 token", async () => {
  const { IntegrationsController } = load("apps/api/src/integrations/integrations.controller.ts");
  assert.equal(IntegrationsController.prototype.getAnalytics.guards[0], AuthGuard);
  let selectedDays;
  const controller = new IntegrationsController({}, { get: async () => ({ id: "mine", website: "example.test", name: "Example" }) }, {
    getFreshAccessToken: async (id, provider) => { assert.equal(id, "mine"); assert.equal(provider, "GOOGLE_ANALYTICS_4"); return "token"; },
    fetchGa4Metrics: async (token, domain, name, days) => { selectedDays = days; return { measurementVersion: 2 }; },
  });
  const req = { user: { id: "user", activeBusinessId: "mine" } };
  for (const days of ["7", "14", "30", "90", "0"]) {
    await controller.getAnalytics(req, days);
    assert.equal(selectedDays, Number(days));
  }
  for (const days of ["-1", "abc", "7junk", "10000", ""]) {
    await assert.rejects(controller.getAnalytics(req, days), /Unsupported/);
  }
});

test("plugin-initiated sync authenticates its key before selecting a business", async () => {
  let key;
  let target;
  const { WordpressService } = load(wpPath, { business: {
    findFirst: async query => { key = query.where.wordpressApiKey; return key === "trusted" ? business : null; },
  } });
  const service = new WordpressService();
  service.sync = async id => { target = id; return { success: true }; };
  await assert.rejects(service.syncFromPlugin(""), /Missing API key/);
  await assert.rejects(service.syncFromPlugin("Bearer attacker"), /Invalid API key/);
  await service.syncFromPlugin("Bearer trusted");
  assert.equal(key, "trusted");
  assert.equal(target, "mine");
});

test("GA4 query failures are unavailable rather than synthetic fallback data", async () => {
  const { GoogleOAuthService } = load(googlePath, {}, async url =>
    url.includes("accountSummaries")
      ? response({ accountSummaries: [{ propertySummaries: [{ displayName: "example.test", property: "properties/123" }] }] })
      : response({}, false));
  assert.equal(await new GoogleOAuthService().fetchGa4Metrics("token", "example.test"), null);
});
