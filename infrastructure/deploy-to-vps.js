const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

      stream.on("close", (code, signal) => {
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
  console.log("🚀 STARTING BRANDOS PRODUCTION DEPLOYMENT TO VPS");
  console.log("========================================================\n");

  // Step 1: Create local tarball
  console.log("📦 Creating clean production bundle...");
  const bundlePath = path.resolve(__dirname, "..", "bundle.tar.gz");
  execSync(
    'tar --exclude="node_modules" --exclude=".git" --exclude=".next" --exclude="dist" --exclude=".pnpm-store" --exclude=".turbo" --exclude="bundle.tar.gz" --exclude=".tmp.driveupload" --exclude=".tmp.drivedownload" --exclude=".kilo" --exclude="scratch" --exclude="trash" --exclude="*.tar.gz" -czf bundle.tar.gz .',
    { cwd: path.resolve(__dirname, ".."), stdio: "inherit" }
  );

  const bundleSize = (fs.statSync(bundlePath).size / 1024 / 1024).toFixed(2);
  console.log(`✅ Bundle created: ${bundlePath} (${bundleSize} MB)`);

  // Step 2: Connect to VPS
  console.log(`\n🔑 Connecting to ${config.username}@${config.host}...`);
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on("ready", resolve);
    conn.on("error", reject);
    conn.connect(config);
  });
  console.log(`✅ SSH connection established.`);

  try {
    // Step 3: Ensure /opt/brandos directory
    await runRemoteCommand(conn, "mkdir -p /opt/brandos");

    // Step 4: Upload bundle
    const remoteBundlePath = "/opt/brandos/bundle.tar.gz";
    await uploadFile(conn, bundlePath, remoteBundlePath);

    // Step 5: Extract bundle
    console.log("\n📂 Extracting files on VPS...");
    await runRemoteCommand(
      conn,
      "cd /opt/brandos && rm -rf apps/api/src/inbox apps/api/src/posts apps/web/src/app/dashboard/inbox apps/web/src/app/dashboard/content packages/ai packages/config packages/integrations packages/shared packages/ui scratch brandos && tar -xzf bundle.tar.gz && rm bundle.tar.gz && ls -la"
    );

    // Step 6: Configure environment files
    console.log("\n⚙️ Configuring production environment variables...");
    await runRemoteCommand(
      conn,
      `cat << 'EOF' > /opt/brandos/.env
DATABASE_URL="postgresql://brandos:brandos_password@localhost:5432/brandos?schema=public"
REDIS_URL="redis://localhost:6379"
NODE_ENV="production"
PORT=3001
API_URL="https://icandothat.online/api"
FRONTEND_URL="https://icandothat.online"
GOOGLE_CLIENT_ID="361867174184-m675eo49mkt4isqcj6gf9rmmuh9kvgeq.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"
GOOGLE_REDIRECT_URI="https://icandothat.online/api/oauth/google/callback"
META_APP_ID="1051909431101030"
META_APP_SECRET="75debbacf9c427a855be095560f9bc0d"
META_REDIRECT_URI="https://icandothat.online/api/oauth/meta/callback"
MAILERLITE_API_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiM2IxM2FkNTFlZDRlY2U4MDhlYmQyZWE5MTc0ZGE0NGVmM2U0YTY4YzkyZjg0MDk0ODk4MmY2Yzk1YjViZjU0ZmUzNmI3N2JmMGE4YTExYjQiLCJpYXQiOjE3ODc1OTM5MjUuMjUwMjAyLCJuYmYiOjE3ODc1OTM5MjUuMjUwMjA0LCJleHAiOjQ5NDMyNjc1MjUuMjQyNjg2LCJzdWIiOiIyNjEyNDQzIiwic2NvcGVzIjpbXX0.o4W6y48tLKpdzVs2SduTI-pz03E6tNLVrh7ZUYBfrV3O7QYoYqEKd8GossNHEU6lvzLULOfn0mj5SawQixg8AH1aq59W-t1Dbbagq2L4egG8mlsF6Vnw8wjAC2guKhjk5fC6_W2nULMtzpgASpLWwImUJdvZZN-Mp4WjJ_gXmx-jLXezYafQvTVNqATL0R3oIdiOw2NYJxEObPNiy4HgPlclN_bpARafkGTm51sMxXcYAIJrZgdnWdN9nTbIxoNGNYul4niKY7gV0qcUx4rWLZoAO6FxCoEwwxv42ZREz38uDAenYj0e2tkxgTq1wt_uYcpr_JxUMZcNi5_2EGJR7l6fjBBy7V_NpaPzvO9sgg-bjwMjljI2QNEI9QAmpVgihm20m7BTTGccvMD1mHSDYSdWKXwWIfvjFdHy1sSF2TfaEwsE6JCYKqrSX5SL3M892sK7sEFO3efFmjyScDsbCNic9JE-iFLOJzkzIcpXZq0EXvskWHS8DJfFZWknnKug8qpqW0XutRImZooYeP0ne4GdW-kTzT9RIyOfy4GtAOWfRoS_dSweMmoyA1djv3T8VklM1pc0moxaRfhEubxHMgRMnLnWlWKJX-Nx0xcGKZaFjKDXHEhC2vX0Si84Y2h-bCwAIpXofx0JTICk4qZ_BM0Ed7v8AQR5l0-Ypj_fCNw"
SMTP_HOST="smtp.mailersend.net"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_FROM="OnlinePresence Space <noreply@onlinepresence.space>"
EOF
cp /opt/brandos/.env /opt/brandos/apps/api/.env
`
    );

    // Step 7: Start Docker containers (Postgres & Redis)
    console.log("\n🐳 Starting PostgreSQL 16 & Redis 7 Docker containers...");
    await runRemoteCommand(
      conn,
      "cd /opt/brandos && (docker compose -f infrastructure/docker/docker-compose.yml up -d || docker compose up -d) && docker ps"
    );

    // Step 8: Wait for Postgres to be healthy
    console.log("\n⏳ Waiting for PostgreSQL to be ready...");
    await runRemoteCommand(
      conn,
      `until docker exec brandos-postgres pg_isready -U brandos -d brandos; do
         echo "Waiting for database..."
         sleep 2
       done`
    );

    // Step 9: Install pnpm dependencies
    console.log("\n📦 Installing monorepo dependencies with pnpm...");
    await runRemoteCommand(
      conn,
      "cd /opt/brandos && pnpm install --frozen-lockfile || pnpm install"
    );

    // Step 10: Run Prisma client generation & schema push
    console.log("\n🗄️ Generating Prisma client & pushing schema to PostgreSQL database...");
    await runRemoteCommand(
      conn,
      "cd /opt/brandos && pnpm db:generate && pnpm --filter @brandos/database exec prisma db push --accept-data-loss"
    );

    // Step 10b: Seed Super Admin user in database if needed
    console.log("\n👑 Ensuring Super Admin credentials exist in production database...");
    await runRemoteCommand(
      conn,
      "cd /opt/brandos/apps/api && npx ts-node src/seed-superadmin.ts || true"
    );

    // Step 11: Build API, Web, and shared packages
    console.log("\n🏗️ Building production artifacts (NestJS API & Next.js Web App)...");
    await runRemoteCommand(
      conn,
      `cd /opt/brandos
       rm -rf apps/web/.next/cache
       # Clear stale incremental TS build outputs/caches so a tsconfig change (e.g. rootDir)
       # can never cause tsc to silently skip emitting files against an old cache (see incident
       # where apps/api/dist survived a rootDir change and app.controller.js was never re-emitted).
       find apps packages -maxdepth 2 -type d -name dist -not -path "*/node_modules/*" -exec rm -rf {} +
       find apps packages -maxdepth 2 -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete
       pnpm build --force`
    );

    // Step 12: Install PM2 process manager
    console.log("\n⚡ Configuring PM2 process manager...");
    await runRemoteCommand(
      conn,
      `if ! command -v pm2 &> /dev/null; then
         npm install -g pm2
       fi
       pm2 -v`
    );

    // Step 13: Write PM2 ecosystem file
    console.log("\n📝 Writing PM2 ecosystem configuration...");
    await runRemoteCommand(
      conn,
      `cat << 'EOF' > /opt/brandos/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "brandos-api",
      cwd: "/opt/brandos/apps/api",
      script: "dist/main.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        DATABASE_URL: "postgresql://brandos:brandos_password@localhost:5432/brandos?schema=public",
        REDIS_URL: "redis://localhost:6379",
        API_URL: "https://icandothat.online/api",
        FRONTEND_URL: "https://icandothat.online",
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
      },
    },
    {
      name: "brandos-web",
      cwd: "/opt/brandos/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1.5G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "brandos-worker",
      cwd: "/opt/brandos/apps/worker",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://brandos:brandos_password@localhost:5432/brandos?schema=public",
        REDIS_URL: "redis://localhost:6379",
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
      },
    },
  ],
};
EOF`
    );

    // Step 14: Start/Restart apps in PM2
    console.log("\n🚀 Launching BrandOS API & Web with PM2...");
    await runRemoteCommand(
      conn,
      `cd /opt/brandos
       pm2 restart all --update-env || pm2 start ecosystem.config.js
       pm2 save
       pm2 startup systemd -u root --hp /root || true
       pm2 status`
    );

    // Step 15: Install & Configure Caddy reverse proxy
    console.log("\n🛡️ Installing & configuring Caddy reverse proxy...");
    await runRemoteCommand(
      conn,
      `if ! command -v caddy &> /dev/null; then
         export DEBIAN_FRONTEND=noninteractive
         apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
         curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
         curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
         apt-get update
         apt-get install -y caddy
       fi

       cat << 'EOF' > /etc/caddy/Caddyfile
{
    email support@onlinepresence.space
}

icandothat.online, www.icandothat.online {
    handle_path /api/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle /wordpress/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle {
        reverse_proxy 127.0.0.1:3000
    }

    encode gzip zstd
}

:80 {
    handle_path /api/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle /wordpress/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle {
        reverse_proxy 127.0.0.1:3000
    }

    encode gzip zstd
}
EOF

       systemctl enable caddy
       systemctl restart caddy
       systemctl status caddy --no-pager
`
    );

    // Step 16: Health check tests
    console.log("\n🩺 Running automated health check tests...");
    await runRemoteCommand(
      conn,
      `sleep 3
       echo "Testing Next.js (port 3000)..."
       curl -I http://127.0.0.1:3000 || true
       echo "\nTesting Caddy (port 80)..."
       curl -I http://127.0.0.1:80 || true
`
    );

    console.log("\n========================================================");
    console.log("🎉 BRANDOS IS FULLY DEPLOYED AND LIVE ON YOUR VPS!");
    console.log("🌐 URL: http://169.58.227.157");
    console.log("========================================================\n");
  } catch (err) {
    console.error("\n❌ Deployment failed:", err.message);
  } finally {
    conn.end();
    console.log("🔒 SSH connection closed.");
    // Clean up local bundle
    if (fs.existsSync(bundlePath)) fs.unlinkSync(bundlePath);
  }
}

main().catch(console.error);
