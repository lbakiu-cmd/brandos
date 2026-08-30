const { execSync } = require('child_process');
const fs = require('fs');

async function run() {
  fs.writeFileSync('/opt/brandos/q.sql', 'SELECT row_to_json(t) FROM (SELECT "id", "provider"::text as "provider", "accountName", "accessTokenEnc", "refreshTokenEnc", "status" FROM "integration_accounts") t;');
  const rows = execSync('docker exec -i brandos-postgres psql -U brandos -d brandos -t -A < /opt/brandos/q.sql').toString().trim().split('\n');

  let googleTokens = null;

  for (const r of rows) {
    if (r) {
      const parsed = JSON.parse(r);
      console.log('Provider:', parsed.provider, '| Status:', parsed.status, '| Has AccessToken:', !!parsed.accessTokenEnc, '| Has RefreshToken:', !!parsed.refreshTokenEnc);
      if (parsed.refreshTokenEnc && !googleTokens && parsed.provider.startsWith('GOOGLE')) {
        googleTokens = parsed;
      }
    }
  }

  // Get env vars
  const envFile = execSync('cat /opt/brandos/apps/api/.env || cat /opt/brandos/.env').toString();
  const getEnv = (key) => {
    const match = envFile.match(new RegExp('^' + key + '=(.*)$', 'm'));
    return match ? match[1].trim() : process.env[key];
  };

  const clientId = getEnv('GOOGLE_CLIENT_ID');
  const clientSecret = getEnv('GOOGLE_CLIENT_SECRET');
  const refreshToken = googleTokens?.refreshTokenEnc;

  console.log('\nClient ID present:', !!clientId);
  console.log('Client Secret present:', !!clientSecret);
  console.log('Refresh Token present:', !!refreshToken);

  if (!refreshToken || !clientId || !clientSecret) {
    console.log('Missing credentials for live Google OAuth refresh');
    return;
  }

  console.log('\n=== Refreshing Google OAuth Token ===');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    console.log('Token refresh error:', tokenData);
    return;
  }

  const accessToken = tokenData.access_token;
  console.log('Access token acquired successfully.');

  console.log('\n=== Querying Google Business Profile Accounts ===');
  const accRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  console.log('Accounts HTTP Status:', accRes.status);
  const accData = await accRes.json();
  console.log('Accounts Response:', JSON.stringify(accData, null, 2));

  if (accData.accounts && accData.accounts.length > 0) {
    for (const acc of accData.accounts) {
      console.log('\n=== Querying Locations for Account:', acc.name, '===');
      const locRes = await fetch('https://mybusinessbusinessinformation.googleapis.com/v1/' + acc.name + '/locations?readMask=name,title,storefrontAddress,websiteUri,phoneNumbers', {
        headers: { Authorization: 'Bearer ' + accessToken },
      });
      console.log('Locations Status:', locRes.status);
      const locData = await locRes.json();
      console.log('Locations Data:', JSON.stringify(locData, null, 2));

      if (locData.locations) {
        for (const loc of locData.locations) {
          console.log('\n=== Querying Performance API for Location:', loc.name, '===');
          const perfRes = await fetch('https://businessprofileperformance.googleapis.com/v1/' + loc.name + ':fetchMultiDailyMetricsTimeSeries?dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_MAPS,BUSINESS_IMPRESSIONS_DESKTOP_SEARCH,BUSINESS_IMPRESSIONS_MOBILE_MAPS,BUSINESS_IMPRESSIONS_MOBILE_SEARCH,CALL_CLICKS,WEBSITE_CLICKS,BUSINESS_DIRECTION_REQUESTS&dailyRange.start_date.year=2026&dailyRange.start_date.month=3&dailyRange.start_date.day=1&dailyRange.end_date.year=2026&dailyRange.end_date.month=8&dailyRange.end_date.day=28', {
            headers: { Authorization: 'Bearer ' + accessToken },
          });
          console.log('Performance API Status:', perfRes.status);
          const perfData = await perfRes.json();
          console.log('Performance API Data:', JSON.stringify(perfData, null, 2));
        }
      }
    }
  }

  console.log('\n=== Querying Google Search Console Sites ===');
  const gscRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: 'Bearer ' + accessToken },
  });
  console.log('GSC Status:', gscRes.status);
  const gscData = await gscRes.json();
  console.log('GSC Sites:', JSON.stringify(gscData, null, 2));
}

run().catch(console.error);
