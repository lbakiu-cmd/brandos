const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const config = {
  host: process.env.VPS_HOST || '169.58.227.157',
  port: 22,
  username: 'root',
  password: process.env.VPS_PASSWORD || 'mSN52s9jR',
  readyTimeout: 30000,
};

function runRemoteCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔹 [VPS EXEC] >>> ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        if (code !== 0) {
          const error = new Error(`Command failed with code ${code}: ${stderr || stdout}`);
          return reject(error);
        }
        resolve({ code, stdout, stderr });
      });
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
    });
  });
}

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    console.log(`📤 Uploading ${localPath} -> ${remotePath}...`);
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const readStream = fs.createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath);
      writeStream.on('close', () => {
        console.log(`✅ Upload complete: ${remotePath}`);
        resolve();
      });
      writeStream.on('error', (e) => reject(e));
      readStream.pipe(writeStream);
    });
  });
}

async function main() {
  console.log('🚀 DEPLOYING: Category-Gated AI Blog Article Studio (API + Web)...');

  const apiTarPath = path.resolve(__dirname, 'api-src.tar.gz');
  execSync(`tar -czf "${apiTarPath}" src`, {
    cwd: path.resolve(__dirname, '..', 'apps', 'api'),
    stdio: 'inherit',
  });

  const webTarPath = path.resolve(__dirname, 'web-src.tar.gz');
  execSync(`tar -czf "${webTarPath}" src`, {
    cwd: path.resolve(__dirname, '..', 'apps', 'web'),
    stdio: 'inherit',
  });

  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect(config);
  });
  console.log('✅ Connected to VPS.');

  try {
    // 1. Upload & Build API
    await uploadFile(conn, apiTarPath, '/opt/brandos/apps/api/api-src.tar.gz');
    await runRemoteCommand(
      conn,
      'cd /opt/brandos/apps/api && tar -xzf api-src.tar.gz && rm api-src.tar.gz && pnpm build'
    );

    // 2. Upload & Build Web
    await uploadFile(conn, webTarPath, '/opt/brandos/apps/web/web-src.tar.gz');
    await runRemoteCommand(
      conn,
      'cd /opt/brandos/apps/web && tar -xzf web-src.tar.gz && rm web-src.tar.gz && pnpm build'
    );

    // 3. Reload PM2
    await runRemoteCommand(conn, 'pm2 reload brandos-api && pm2 reload brandos-web && pm2 status');
    console.log('\n🎉 Successfully deployed Category-Gated Blog Generator to brandoseye.com!');
  } finally {
    if (fs.existsSync(apiTarPath)) fs.unlinkSync(apiTarPath);
    if (fs.existsSync(webTarPath)) fs.unlinkSync(webTarPath);
    conn.end();
  }
}

main().catch((err) => {
  console.error('❌ Deployment error:', err);
  process.exit(1);
});
