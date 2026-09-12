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

function runRemoteCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔹 [VPS EXEC] >>> ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);

      let stdout = "";
      let stderr = "";

      stream.on("close", (code) => {
        if (code !== 0) {
          console.error(`❌ [VPS EXIT CODE] ${code}`);
          const error = new Error(`Command failed with code ${code}: ${stderr || stdout}`);
          error.code = code;
          error.stdout = stdout;
          error.stderr = stderr;
          return reject(error);
        }
        console.log(`✅ [VPS DONE]`);
        resolve({ code, stdout, stderr });
      });

      stream.on("data", (data) => {
        process.stdout.write(data.toString());
        stdout += data.toString();
      });

      stream.stderr.on("data", (data) => {
        process.stderr.write(data.toString());
        stderr += data.toString();
      });
    });
  });
}

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    console.log(`📤 Uploading ${localPath} -> ${remotePath}...`);
    conn.sftp((err, sftp) => {
      if (err) return reject(err);

      const readStream = fs.createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath);

      writeStream.on("close", () => {
        console.log(`✅ Upload complete: ${remotePath}`);
        resolve();
      });

      writeStream.on("error", (e) => reject(e));
      readStream.pipe(writeStream);
    });
  });
}

async function main() {
  console.log("========================================================");
  console.log("🚀 UPLOADING AIVISION SEO PLUGIN v1.6.0 TO VPS");
  console.log("========================================================\n");

  const pluginZipName = "aivision-seo-v1.6.0.zip";
  const localZipPath = path.resolve(__dirname, "..", "plugins", pluginZipName);
  const localVersionsPath = path.resolve(__dirname, "..", "plugins", "versions.json");

  if (!fs.existsSync(localZipPath)) {
    throw new Error(`Local zip file not found: ${localZipPath}`);
  }

  const zipStat = fs.statSync(localZipPath);
  console.log(`📦 Local file: ${localZipPath}`);
  console.log(`   Size: ${(zipStat.size / 1024).toFixed(1)} KB`);

  console.log(`\n🔑 Connecting to ${config.username}@${config.host}...`);
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on("ready", resolve);
    conn.on("error", reject);
    conn.connect(config);
  });
  console.log(`✅ SSH connection established.`);

  try {
    // 1. Ensure target directories exist on VPS
    const remoteDirs = [
      "/opt/brandos/plugins",
      "/opt/brandos/apps/web/public",
    ];

    for (const dir of remoteDirs) {
      await runRemoteCommand(conn, `mkdir -p ${dir}`);
    }

    // 2. Upload aivision-seo-v1.6.0.zip to /opt/brandos/plugins
    await uploadFile(conn, localZipPath, `/opt/brandos/plugins/${pluginZipName}`);

    // Also update unversioned alias in /opt/brandos/plugins
    await uploadFile(conn, localZipPath, `/opt/brandos/plugins/aivision-seo.zip`);

    // 3. Upload to web public directory for direct download via Web/Next.js/Caddy
    await uploadFile(conn, localZipPath, `/opt/brandos/apps/web/public/${pluginZipName}`);
    await uploadFile(conn, localZipPath, `/opt/brandos/apps/web/public/aivision-seo.zip`);

    // 4. Upload versions.json registry
    if (fs.existsSync(localVersionsPath)) {
      await uploadFile(conn, localVersionsPath, `/opt/brandos/plugins/versions.json`);
      await uploadFile(conn, localVersionsPath, `/opt/brandos/apps/web/public/versions.json`);
    }

    // 5. Upload updated integrations page & API controllers
    const filesToSync = [
      {
        local: path.resolve(__dirname, "..", "apps", "web", "src", "app", "dashboard", "integrations", "page.tsx"),
        remote: "/opt/brandos/apps/web/src/app/dashboard/integrations/page.tsx",
      },
      {
        local: path.resolve(__dirname, "..", "apps", "api", "src", "wordpress", "wordpress.controller.ts"),
        remote: "/opt/brandos/apps/api/src/wordpress/wordpress.controller.ts",
      },
      {
        local: path.resolve(__dirname, "..", "apps", "api", "src", "wordpress", "wordpress.service.ts"),
        remote: "/opt/brandos/apps/api/src/wordpress/wordpress.service.ts",
      },
    ];

    for (const f of filesToSync) {
      if (fs.existsSync(f.local)) {
        await uploadFile(conn, f.local, f.remote);
      }
    }

    // 6. Check if any WordPress installations exist on the VPS to also deploy the plugin directly
    const wpCheck = await runRemoteCommand(
      conn,
      `WP_DIRS=$(find /var/www -type d -name "wp-content" 2>/dev/null || true); echo "$WP_DIRS"`
    );

    const wpLines = wpCheck.stdout.split("\n").map(l => l.trim()).filter(l => l.includes("wp-content"));
    for (const wpContent of wpLines) {
      const targetPluginDir = `${wpContent}/plugins`;
      console.log(`\nWordPress instance found at ${wpContent}! Deploying to ${targetPluginDir}...`);
      await runRemoteCommand(conn, `mkdir -p ${targetPluginDir}`);
      await uploadFile(conn, localZipPath, `${targetPluginDir}/${pluginZipName}`);
      // Also extract cleanly if unzip is available
      await runRemoteCommand(
        conn,
        `cd ${targetPluginDir} && (unzip -o ${pluginZipName} || tar -xzf ${pluginZipName} || true)`
      );
    }

    // 7. Verify uploaded files on VPS
    console.log("\n🔍 Verifying uploaded files on VPS...");
    await runRemoteCommand(
      conn,
      `ls -lh /opt/brandos/plugins/${pluginZipName} /opt/brandos/apps/web/public/${pluginZipName} 2>/dev/null || true`
    );

    // 8. Rebuild and restart API and Web on VPS so dashboard reflects changes
    console.log("\n⚡ Rebuilding and reloading services on VPS...");
    await runRemoteCommand(
      conn,
      `cd /opt/brandos && pnpm --filter @brandos/api build && pnpm --filter @brandos/web build && pm2 reload all`
    );

    console.log("\n========================================================");
    console.log(`🎉 PLUGIN ${pluginZipName} SUCCESSFULLY UPLOADED & LIVE ON VPS!`);
    console.log("========================================================\n");
  } catch (err) {
    console.error("\n❌ Upload/deployment failed:", err.message);
    throw err;
  } finally {
    conn.end();
    console.log("🔒 SSH connection closed.");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
