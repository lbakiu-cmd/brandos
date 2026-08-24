const { Client } = require("ssh2");

const config = {
  host: "169.58.227.157",
  port: 22,
  username: "root",
  password: "mSN52s9jR",
};

function run(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔹 [VPS] >>> ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("close", (code) => {
        console.log(`Exit code: ${code}`);
        resolve(out);
      });
      stream.on("data", (d) => { out += d; process.stdout.write(d); });
      stream.stderr.on("data", (d) => { out += d; process.stderr.write(d); });
    });
  });
}

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on("ready", resolve);
    conn.on("error", reject);
    conn.connect(config);
  });

  // 1. Write clean ecosystem config
  await run(
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
      max_memory_restart: "1000M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        DATABASE_URL: "postgresql://brandos:brandos_password@localhost:5432/brandos?schema=public",
        REDIS_URL: "redis://localhost:6379",
        API_URL: "http://169.58.227.157/api",
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
      max_memory_restart: "1000M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
EOF`
  );

  // 2. Clear and start PM2
  await run(conn, "pm2 delete all || true");
  await run(conn, "cd /opt/brandos && pm2 start ecosystem.config.js");
  await run(conn, "pm2 save");

  // 3. Wait 5 seconds
  console.log("\nWaiting 5s for apps to boot...");
  await new Promise((r) => setTimeout(r, 5000));

  // 4. Check PM2 status & logs
  await run(conn, "pm2 list");
  await run(conn, "pm2 logs --lines 25 --nostream");

  // 5. Test curl
  await run(conn, "curl -I http://127.0.0.1:3001/ || true");
  await run(conn, "curl -I http://127.0.0.1:3000/ || true");
  await run(conn, "curl -I http://127.0.0.1:80/ || true");

  conn.end();
}

main().catch(console.error);
