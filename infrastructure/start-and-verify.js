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

  // 1. Check ecosystem file
  await run(conn, "cat /opt/brandos/ecosystem.config.js");

  // 2. Start PM2 apps
  await run(conn, "cd /opt/brandos && pm2 start ecosystem.config.js && pm2 save");

  // 3. Wait 3 seconds
  await new Promise((r) => setTimeout(r, 3000));

  // 4. Check status & logs
  await run(conn, "pm2 list");
  await run(conn, "pm2 logs --lines 20 --nostream");

  // 5. Test curl ports
  await run(conn, "curl -I http://127.0.0.1:3001/ || true");
  await run(conn, "curl -I http://127.0.0.1:3000/ || true");
  await run(conn, "curl -I http://127.0.0.1:80/ || true");

  conn.end();
}

main().catch(console.error);
