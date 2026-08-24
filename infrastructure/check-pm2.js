const { Client } = require("ssh2");

const config = {
  host: "169.58.227.157",
  port: 22,
  username: "root",
  password: "mSN52s9jR",
};

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on("ready", resolve);
    conn.on("error", reject);
    conn.connect(config);
  });

  conn.exec("pm2 list && pm2 logs --lines 30 --nostream", (err, stream) => {
    if (err) throw err;
    stream.on("close", () => conn.end());
    stream.on("data", (d) => process.stdout.write(d));
    stream.stderr.on("data", (d) => process.stderr.write(d));
  });
}

main().catch(console.error);
