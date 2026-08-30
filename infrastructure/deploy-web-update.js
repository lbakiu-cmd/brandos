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
  console.log('🚀 FAST DEPLOY: Updating BrandOS Web with new Indicators on VPS...');

  // Create tar of apps/web/src, apps/web/public, and package.json
  const tarPath = path.resolve(__dirname, 'web-src.tar.gz');
  execSync(`tar -czf "${tarPath}" src public package.json`, {
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
    await uploadFile(conn, tarPath, '/opt/brandos/apps/web/web-src.tar.gz');
    await runRemoteCommand(
      conn,
      'cd /opt/brandos/apps/web && tar -xzf web-src.tar.gz && rm web-src.tar.gz && pnpm install --prod=false && pnpm build'
    );
    await runRemoteCommand(conn, 'pm2 reload brandos-web && pm2 status');
    console.log('\n🎉 Successfully deployed Web update to brandoseye.com!');
  } finally {
    if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath);
    conn.end();
  }
}

main().catch((err) => {
  console.error('❌ Deployment error:', err);
  process.exit(1);
});
