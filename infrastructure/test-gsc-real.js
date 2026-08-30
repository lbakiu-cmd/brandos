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

  const scriptContent = `
const { PrismaClient } = require('/opt/brandos/packages/database');
const prisma = new PrismaClient();

async function testGSCData() {
  const account = await prisma.integrationAccount.findFirst({
    where: { provider: 'GOOGLE_SEARCH_CONSOLE', status: 'CONNECTED' },
  });

  const token = account.accessTokenEnc;
  const sites = ['sc-domain:dental-nobel.com', 'https://motorstars.al/', 'sc-domain:brandoseye.com'];

  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (const site of sites) {
    console.log('\\n======================================================');
    console.log('🔍 Querying Real Search Analytics for:', site);
    console.log('Dates:', startDate, 'to', endDate);
    console.log('======================================================');

    const res = await fetch(
      'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(site) + '/searchAnalytics/query',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: 10,
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      console.log('Top Search Queries & Live Clicks:');
      if (data.rows && data.rows.length > 0) {
        console.table(data.rows.map(r => ({
          Query: r.keys[0],
          Clicks: r.clicks,
          Impressions: r.impressions,
          CTR: (r.ctr * 100).toFixed(2) + '%',
          AvgPosition: r.position.toFixed(1)
        })));
      } else {
        console.log('No search queries recorded in the past 28 days for this site.');
      }
    } else {
      console.log('GSC Query Response (' + res.status + '):', await res.text());
    }
  }
}

testGSCData().catch(console.error).finally(() => prisma.$disconnect());
`;

  await run(conn, `cat << 'EOF' > /opt/brandos/test-gsc-real.js\n${scriptContent}\nEOF`);
  console.log("\n🚀 Fetching Real Search Console Data from Google APIs...\n");
  await run(conn, `cd /opt/brandos && node --env-file=/opt/brandos/.env test-gsc-real.js`);

  conn.end();
}

main().catch(console.error);
