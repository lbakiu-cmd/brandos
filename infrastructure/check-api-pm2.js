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

      stream.on("close", (code) => {
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
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on("ready", resolve);
    conn.on("error", reject);
    conn.connect(config);
  });

  await runRemoteCommand(conn, "pm2 logs brandos-api --lines 50 --nostream");
  await runRemoteCommand(conn, "curl -I http://127.0.0.1:3001/users/all");

  conn.end();
}

main().catch(console.error);
