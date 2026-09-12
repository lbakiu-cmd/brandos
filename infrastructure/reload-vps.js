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

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const readStream = fs.createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath);
      writeStream.on("close", () => resolve());
      writeStream.on("error", (e) => reject(e));
      readStream.pipe(writeStream);
    });
  });
}

async function main() {
  console.log("Connecting to VPS...");
  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on("ready", resolve);
    conn.on("error", reject);
    conn.connect(config);
  });
  console.log("SSH connected.");

  // Upload dynamic page.tsx
  const localPage = path.resolve(__dirname, "..", "apps", "web", "src", "app", "dashboard", "integrations", "page.tsx");
  await uploadFile(conn, localPage, "/opt/brandos/apps/web/src/app/dashboard/integrations/page.tsx");
  console.log("Uploaded dynamic page.tsx to VPS.");

  const cmd = `
    cd /opt/brandos && pnpm --filter @brandos/web build && pm2 reload brandos-web
  `;

  await new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream.on("close", (code) => {
        console.log("Remote build exited with code", code);
        resolve();
      });
      stream.on("data", (d) => process.stdout.write(d.toString()));
      stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  });

  conn.end();
  console.log("Done!");
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
