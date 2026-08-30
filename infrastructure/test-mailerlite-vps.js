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

  console.log("Testing MailerLite API token from VPS (169.58.227.157)...");
  const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiM2IxM2FkNTFlZDRlY2U4MDhlYmQyZWE5MTc0ZGE0NGVmM2U0YTY4YzkyZjg0MDk0ODk4MmY2Yzk1YjViZjU0ZmUzNmI3N2JmMGE4YTExYjQiLCJpYXQiOjE3ODc1OTM5MjUuMjUwMjAyLCJuYmYiOjE3ODc1OTM5MjUuMjUwMjA0LCJleHAiOjQ5NDMyNjc1MjUuMjQyNjg2LCJzdWIiOiIyNjEyNDQzIiwic2NvcGVzIjpbXX0.o4W6y48tLKpdzVs2SduTI-pz03E6tNLVrh7ZUYBfrV3O7QYoYqEKd8GossNHEU6lvzLULOfn0mj5SawQixg8AH1aq59W-t1Dbbagq2L4egG8mlsF6Vnw8wjAC2guKhjk5fC6_W2nULMtzpgASpLWwImUJdvZZN-Mp4WjJ_gXmx-jLXezYafQvTVNqATL0R3oIdiOw2NYJxEObPNiy4HgPlclN_bpARafkGTm51sMxXcYAIJrZgdnWdN9nTbIxoNGNYul4niKY7gV0qcUx4rWLZoAO6FxCoEwwxv42ZREz38uDAenYj0e2tkxgTq1wt_uYcpr_JxUMZcNi5_2EGJR7l6fjBBy7V_NpaPzvO9sgg-bjwMjljI2QNEI9QAmpVgihm20m7BTTGccvMD1mHSDYSdWKXwWIfvjFdHy1sSF2TfaEwsE6JCYKqrSX5SL3M892sK7sEFO3efFmjyScDsbCNic9JE-iFLOJzkzIcpXZq0EXvskWHS8DJfFZWknnKug8qpqW0XutRImZooYeP0ne4GdW-kTzT9RIyOfy4GtAOWfRoS_dSweMmoyA1djv3T8VklM1pc0moxaRfhEubxHMgRMnLnWlWKJX-Nx0xcGKZaFjKDXHEhC2vX0Si84Y2h-bCwAIpXofx0JTICk4qZ_BM0Ed7v8AQR5l0-Ypj_fCNw';

  await run(conn, `curl -s -H "Authorization: Bearer ${token}" -H "Accept: application/json" https://connect.mailerlite.com/api/subscribers`);
  console.log("\n--- Testing api.mailersend.com from VPS ---");
  await run(conn, `curl -s -H "Authorization: Bearer ${token}" -H "Accept: application/json" https://api.mailersend.com/v1/domains`);

  conn.end();
}

main().catch(console.error);
