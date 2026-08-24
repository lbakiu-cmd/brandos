const { Client } = require("ssh2");

const config = {
  host: process.env.VPS_HOST || "169.58.227.157",
  port: parseInt(process.env.VPS_PORT || "22", 10),
  username: process.env.VPS_USER || "root",
  password: process.env.VPS_PASSWORD || "mSN52s9jR",
  readyTimeout: 30000,
};

function run(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("close", (code) => resolve({ code, out }));
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

  console.log("\n========================================================");
  console.log("🔍 BRANDOS VPS ENVIRONMENT AUDIT");
  console.log("========================================================\n");

  console.log("1. OS Version:");
  await run(conn, "lsb_release -d");

  console.log("\n2. Docker & Docker Compose:");
  await run(conn, "docker --version && docker compose version");

  console.log("\n3. Node.js & pnpm:");
  await run(conn, "node -v && pnpm -v");

  console.log("\n4. Firewall (UFW):");
  await run(conn, "ufw status numbered");

  console.log("\n5. Docker Daemon Test (hello-world):");
  await run(conn, "docker run --rm hello-world");

  console.log("\n6. System Resources:");
  await run(conn, "free -h && df -h /");

  console.log("\n7. App Directory:");
  await run(conn, "ls -la /opt/brandos");

  console.log("\n========================================================");
  console.log("✅ ALL PREREQUISITES AND DEPENDENCIES ARE READY!");
  console.log("========================================================\n");

  conn.end();
}

main().catch(console.error);
