const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const config = {
  host: process.env.VPS_HOST || "169.58.227.157",
  port: parseInt(process.env.VPS_PORT || "22", 10),
  username: process.env.VPS_USER || "root",
  password: process.env.VPS_PASSWORD || "mSN52s9jR",
  readyTimeout: 30000,
};

const filesToUpload = [
  // Web app pages & components
  "apps/web/src/app/page.tsx",
  "apps/web/src/app/pricing/page.tsx",
  "apps/web/src/app/login/page.tsx",
  "apps/web/src/app/layout.tsx",
  "apps/web/src/app/terms/page.tsx",
  "apps/web/src/app/privacy/page.tsx",
  "apps/web/src/app/scan/page.tsx",
  "apps/web/src/app/admin/layout.tsx",
  "apps/web/src/app/admin/login/page.tsx",
  "apps/web/src/app/admin/businesses/page.tsx",
  "apps/web/src/app/admin/users/page.tsx",
  "apps/web/src/app/admin/page.tsx",
  "apps/web/src/components/BusinessSwitcher.tsx",
  "apps/web/src/components/VersionSwitchBadge.tsx",
  "apps/web/src/app/dashboard/layout.tsx",
  "apps/web/src/app/dashboard/page.tsx",
  "apps/web/src/app/dashboard/copilot/page.tsx",
  "apps/web/src/app/dashboard/content/page.tsx",
  "apps/web/src/app/dashboard/report/page.tsx",
  "apps/web/src/app/dashboard/settings/page.tsx",
  "apps/web/src/app/dashboard/visibility/page.tsx",
  "apps/web/src/app/dashboard/integrations/page.tsx",
  "apps/web/src/app/dashboard/billing/page.tsx",
  "apps/web/src/app/dashboard/widgets/SeoHealthWidget.tsx",
  "apps/web/src/app/dashboard/widgets/WordpressWidget.tsx",
  "apps/web/public/site.webmanifest",
  "apps/web/public/versions.json",
  "apps/web/public/aivision-seo-v1.6.3.zip",
  "apps/web/public/aivision-seo-v1.6.2.zip",
  "apps/web/public/aivision-seo-v1.6.1.zip",
  "apps/web/public/aivision-seo-v1.6.0.zip",
  "apps/web/public/aivision-seo.zip",

  // API services
  "apps/api/package.json",
  "apps/api/.env",
  "apps/api/src/main.ts",
  "apps/api/src/billing/billing.service.ts",
  "apps/api/src/billing/billing.controller.ts",
  "apps/api/src/mail/mail.service.ts",
  "apps/api/src/auth/totp.util.ts",
  "apps/api/src/auth/auth.service.ts",
  "apps/api/src/wordpress/wordpress.service.ts",
  "apps/api/src/wordpress/wordpress.controller.ts",
  "apps/api/src/visibility/visibility.service.ts",
  "apps/api/src/local-seo-tools/local-seo-tools.service.ts",
  "apps/api/src/copilot/copilot.service.ts",
  "apps/api/src/oauth/oauth.controller.ts",
  "apps/api/src/oauth/meta-oauth.service.ts",

  // Worker
  "apps/worker/src/engines.ts",
  "apps/worker/src/wordpress-runner.ts",

  // Env & Docs
  ".env",
  "STRIPE_INTEGRATION_TODO.md",

  // Plugin artifacts
  "plugins/versions.json",
  "plugins/aivision-seo-v1.6.3.zip",
  "plugins/aivision-seo-v1.6.2.zip",
  "plugins/aivision-seo-v1.6.1.zip",
  "plugins/aivision-seo-v1.6.0.zip",
  "plugins/aivision-seo.zip",
  "plugins/aivision-seo/readme.txt",
  "plugins/aivision-seo/aivision-seo.php",
  "plugins/aivision-seo/admin/class-admin.php",
  "plugins/aivision-seo/admin/js/admin.js",
  "plugins/aivision-seo/includes/class-brandos-integration.php",
  "plugins/aivision-seo/includes/class-integration.php",
  "plugins/aivision-seo/includes/class-updater.php",
];

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(localPath);
    const writeStream = sftp.createWriteStream(remotePath);
    writeStream.on("close", () => resolve());
    writeStream.on("error", (e) => reject(e));
    readStream.pipe(writeStream);
  });
}

function runRemoteCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream.on("close", (code) => {
        if (code !== 0) {
          return reject(new Error(`Command exited with code ${code}: ${cmd}`));
        }
        resolve(code);
      });
      stream.on("data", (d) => process.stdout.write(d.toString()));
      stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  });
}

async function main() {
  console.log("🚀 Connecting to VPS at " + config.host + "...");
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on("ready", resolve);
    conn.on("error", reject);
    conn.connect(config);
  });
  console.log("✔ SSH connected.");

  // SFTP session for uploads
  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => {
      if (err) return reject(err);
      resolve(s);
    });
  });

  console.log("📁 Ensuring remote directories exist...");
  await runRemoteCommand(
    conn,
    "mkdir -p /opt/brandos/apps/web/src/components /opt/brandos/plugins/aivision-seo/admin/js /opt/brandos/plugins/aivision-seo/includes"
  );

  const rootDir = path.resolve(__dirname, "..");

  for (const rel of filesToUpload) {
    const local = path.join(rootDir, rel);
    const remote = "/opt/brandos/" + rel.replace(/\\/g, "/");
    if (!fs.existsSync(local)) {
      console.warn("⚠️ Local file does not exist:", local);
      continue;
    }
    process.stdout.write(`Uploading ${rel}... `);
    await uploadFile(sftp, local, remote);
    console.log("OK");
  }

  sftp.end();

  console.log("\n📦 Rebuilding @brandos/api, @brandos/worker, and @brandos/web on VPS...");
  const buildCmd = "cd /opt/brandos && pnpm install --no-frozen-lockfile && pnpm -r build && pm2 restart all";
  await runRemoteCommand(conn, buildCmd);

  console.log("\n⚡ Broadcasting instant plugin update to connected WordPress sites...");
  const updateCmd = "sleep 3 && curl -s -X POST http://127.0.0.1:4000/api/wordpress/push-update || true";
  await runRemoteCommand(conn, updateCmd);

  conn.end();
  console.log("\n🎉 Deployment and automated plugin update completed successfully!");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
