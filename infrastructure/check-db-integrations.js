const { Client } = require("ssh2");

const config = {
  host: process.env.VPS_HOST || "169.58.227.157",
  port: 22,
  username: "root",
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

  console.log("--- Tables in PostgreSQL ---");
  await run(conn, `docker exec brandos-postgres psql -U brandos -d brandos -c "\\dt"`);

  console.log("\n--- Integrations Table ---");
  await run(conn, `docker exec brandos-postgres psql -U brandos -d brandos -c 'SELECT * FROM "integration_accounts";' || docker exec brandos-postgres psql -U brandos -d brandos -c 'SELECT * FROM integration_accounts;'`);

  conn.end();
}

main().catch(console.error);
