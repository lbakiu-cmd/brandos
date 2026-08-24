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
FRONTEND_URL="https://${DOMAIN}"
GOOGLE_CLIENT_ID="361867174184-m675eo49mkt4isqcj6gf9rmmuh9kvgeq.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
GOOGLE_REDIRECT_URI="https://${DOMAIN}/api/oauth/google/callback"
META_APP_ID="1051909431101030"
META_APP_SECRET="75debbacf9c427a855be095560f9bc0d"
META_REDIRECT_URI="https://${DOMAIN}/api/oauth/meta/callback"
MAILERLITE_API_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiM2IxM2FkNTFlZDRlY2U4MDhlYmQyZWE5MTc0ZGE0NGVmM2U0YTY4YzkyZjg0MDk0ODk4MmY2Yzk1YjViZjU0ZmUzNmI3N2JmMGE4YTExYjQiLCJpYXQiOjE3ODc1OTM5MjUuMjUwMjAyLCJuYmYiOjE3ODc1OTM5MjUuMjUwMjA0LCJleHAiOjQ5NDMyNjc1MjUuMjQyNjg2LCJzdWIiOiIyNjEyNDQzIiwic2NvcGVzIjpbXX0.o4W6y48tLKpdzVs2SduTI-pz03E6tNLVrh7ZUYBfrV3O7QYoYqEKd8GossNHEU6lvzLULOfn0mj5SawQixg8AH1aq59W-t1Dbbagq2L4egG8mlsF6Vnw8wjAC2guKhjk5fC6_W2nULMtzpgASpLWwImUJdvZZN-Mp4WjJ_gXmx-jLXezYafQvTVNqATL0R3oIdiOw2NYJxEObPNiy4HgPlclN_bpARafkGTm51sMxXcYAIJrZgdnWdN9nTbIxoNGNYul4niKY7gV0qcUx4rWLZoAO6FxCoEwwxv42ZREz38uDAenYj0e2tkxgTq1wt_uYcpr_JxUMZcNi5_2EGJR7l6fjBBy7V_NpaPzvO9sgg-bjwMjljI2QNEI9QAmpVgihm20m7BTTGccvMD1mHSDYSdWKXwWIfvjFdHy1sSF2TfaEwsE6JCYKqrSX5SL3M892sK7sEFO3efFmjyScDsbCNic9JE-iFLOJzkzIcpXZq0EXvskWHS8DJfFZWknnKug8qpqW0XutRImZooYeP0ne4GdW-kTzT9RIyOfy4GtAOWfRoS_dSweMmoyA1djv3T8VklM1pc0moxaRfhEubxHMgRMnLnWlWKJX-Nx0xcGKZaFjKDXHEhC2vX0Si84Y2h-bCwAIXpXofx0JTICk4qZ_BM0Ed7v8AQR5l0-Ypj_fCNw"
SMTP_HOST="smtp.mailersend.net"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM="BrandOS Eye <noreply@brandoseye.com>"
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
