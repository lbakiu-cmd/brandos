const { Client } = require("ssh2");

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
        console.log(`✅ [VPS DONE] Finished successfully.`);
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

async function main() {
  console.log(`🚀 Connecting to VPS ${config.username}@${config.host}:${config.port}...`);
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on("ready", resolve);
    conn.on("error", reject);
    conn.connect(config);
  });

  console.log(`✅ Connected successfully to ${config.host}! Starting automated setup...\n`);

  try {
    // 1. Check OS and current specs
    await runRemoteCommand(conn, "uname -a && lsb_release -a && free -h && df -h /");

    // 2. Update system packages
    console.log("\n📦 Updating Ubuntu system packages...");
    await runRemoteCommand(
      conn,
      "export DEBIAN_FRONTEND=noninteractive && apt-get update -y && apt-get upgrade -y"
    );

    // 3. Install core utilities
    console.log("\n🔧 Installing core utilities...");
    await runRemoteCommand(
      conn,
      "export DEBIAN_FRONTEND=noninteractive && apt-get install -y ca-certificates curl gnupg lsb-release git ufw htop unzip tar jq build-essential"
    );

    // 4. Verify/Install Docker
    console.log("\n🐳 Configuring Docker Engine & Docker Compose...");
    await runRemoteCommand(
      conn,
      `if ! command -v docker &> /dev/null; then
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
        chmod a+r /etc/apt/keyrings/docker.asc
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      fi
      systemctl enable docker
      systemctl start docker
      docker --version
      docker compose version`
    );

    // 5. Install Node.js 22 LTS & pnpm (matching packageManager)
    console.log("\n🟢 Installing Node.js 22 LTS & pnpm@10.2.0...");
    await runRemoteCommand(
      conn,
      `curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
      apt-get install -y nodejs
      npm install -g pnpm@10.2.0
      node -v
      pnpm -v`
    );

    // 6. Configure UFW Firewall
    console.log("\n🛡️ Configuring UFW Firewall...");
    await runRemoteCommand(
      conn,
      `ufw allow 22/tcp comment 'SSH'
       ufw allow 80/tcp comment 'HTTP'
       ufw allow 443/tcp comment 'HTTPS'
       ufw --force enable
       ufw status verbose`
    );

    // 7. Setup Directory structure
    console.log("\n📁 Setting up /opt/brandos directory...");
    await runRemoteCommand(
      conn,
      `mkdir -p /opt/brandos
       mkdir -p /opt/brandos/caddy_data
       mkdir -p /opt/brandos/caddy_config
       ls -la /opt/brandos`
    );

    // 8. Test Docker run
    console.log("\n🐳 Verifying Docker daemon with hello-world container...");
    await runRemoteCommand(conn, "docker run --rm hello-world");

    console.log("\n========================================================");
    console.log("🎉 VPS BASE ENVIRONMENT SETUP COMPLETED SUCCESSFULLY!");
    console.log("========================================================");
  } catch (err) {
    console.error("\n❌ Error during VPS setup:", err.message);
  } finally {
    conn.end();
    console.log("🔒 SSH connection closed.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
