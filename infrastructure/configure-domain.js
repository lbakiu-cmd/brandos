const { Client } = require("ssh2");

const config = {
  host: process.env.VPS_HOST || "169.58.227.157",
  port: parseInt(process.env.VPS_PORT || "22", 10),
  username: process.env.VPS_USER || "root",
  password: process.env.VPS_PASSWORD || "mSN52s9jR",
  readyTimeout: 30000,
};

const DOMAIN = process.env.DOMAIN || "brandoseye.com";

function run(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔹 [VPS] >>> ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("close", (code) => {
        if (code !== 0) console.warn(`Exit code: ${code}`);
        resolve(out);
      });
      stream.on("data", (d) => { out += d; process.stdout.write(d); });
      stream.stderr.on("data", (d) => { out += d; process.stderr.write(d); });
    });
  });
}

async function main() {
  console.log("========================================================");
  console.log(`🌐 CONFIGURING DOMAIN: ${DOMAIN} & www.${DOMAIN}`);
  console.log("========================================================\n");

  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on("ready", resolve);
    conn.on("error", reject);
    conn.connect(config);
  });
  console.log("✅ Connected to VPS.");

  // 1. Update Caddyfile
  console.log("\n📝 Updating /etc/caddy/Caddyfile for automatic HTTPS/SSL...");
  await run(
    conn,
    `cat << 'EOF' > /etc/caddy/Caddyfile
${DOMAIN}, www.${DOMAIN}, :80 {
    # API endpoints directly forwarded to NestJS
    handle_path /api/* {
        reverse_proxy 127.0.0.1:3001
    }

    # WordPress handshake & plugin downloads forwarded to NestJS
    handle /wordpress/* {
        reverse_proxy 127.0.0.1:3001
    }

    # All frontend pages & SSR forwarded to Next.js
    handle {
        reverse_proxy 127.0.0.1:3000
    }

    encode gzip zstd
}
EOF`
  );

  // 2. Update .env files
  console.log("\n⚙️ Updating environment variables for domain...");
  await run(
    conn,
    `cat << 'EOF' > /opt/brandos/.env
DATABASE_URL="postgresql://brandos:brandos_password@localhost:5432/brandos?schema=public"
REDIS_URL="redis://localhost:6379"
NODE_ENV="production"
PORT=3001
API_URL="https://${DOMAIN}/api"
EOF
cp /opt/brandos/.env /opt/brandos/apps/api/.env
`
  );

  // 3. Restart PM2 apps to pick up new env
  console.log("\n🔄 Restarting PM2 processes with new domain configuration...");
  await run(conn, "cd /opt/brandos && pm2 restart all && pm2 save");

  // 4. Reload Caddy
  console.log("\n🔄 Reloading Caddy with new domain routing & SSL...");
  await run(conn, "systemctl reload caddy || systemctl restart caddy");
  await run(conn, "systemctl status caddy --no-pager");

  // 5. Test health checks
  console.log("\n🩺 Testing local endpoints...");
  await run(conn, "curl -I http://127.0.0.1:80 || true");

  console.log("\n========================================================");
  console.log(`🎉 DOMAIN CONFIGURATION COMPLETE FOR https://${DOMAIN}`);
  console.log("========================================================\n");

  conn.end();
}

main().catch(console.error);
