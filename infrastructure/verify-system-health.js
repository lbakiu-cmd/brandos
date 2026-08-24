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
  console.log("🔍 COMPREHENSIVE VPS STATUS & CLEANUP CHECK");
  console.log("========================================================\n");

  console.log("1. Checking for any active Cockpit or Netdata services / sockets...");
  await run(conn, "systemctl is-active cockpit.socket cockpit.service netdata 2>&1 || true");

  console.log("\n2. Checking listening network ports (ensure 9090 & 19999 are freed)...");
  await run(conn, "ss -tulpn | grep -E ':9090|:19999|:80|:443|:3000|:3001|:5432|:6379' || true");

  console.log("\n3. Ensuring residual Cockpit / Netdata files are removed...");
  await run(conn, "rm -rf /etc/cockpit /var/lib/cockpit /etc/netdata /var/lib/netdata /var/cache/netdata /opt/netdata");

  console.log("\n4. PM2 Process Status (brandos-api & brandos-web):");
  await run(conn, "pm2 status");

  console.log("\n5. Caddy Web Server Status:");
  await run(conn, "systemctl status caddy --no-pager -n 5");

  console.log("\n6. Docker Containers (PostgreSQL & Redis):");
  await run(conn, "docker ps");

  console.log("\n7. System Resources (RAM & Disk):");
  await run(conn, "free -h && echo '' && df -h /");

  console.log("\n8. Live HTTP Health Checks:");
  await run(conn, "echo 'Testing Caddy :80...' && curl -I http://127.0.0.1:80 && echo 'Testing Next.js :3000...' && curl -I http://127.0.0.1:3000");

  console.log("\n========================================================");
  console.log("✅ VPS AUDIT & VERIFICATION COMPLETE");
  console.log("========================================================\n");

  conn.end();
}

main().catch(console.error);
