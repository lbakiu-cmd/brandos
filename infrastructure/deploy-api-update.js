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
      writeStream.on('error', reject);
      readStream.pipe(writeStream);
    });
  });
}

async function deployApi() {
  console.log('🚀 FAST DEPLOY: Updating BrandOS API on VPS...');
  
  // 1. Create tar of apps/api/src
  const apiDir = path.resolve(__dirname, '../apps/api');
  const archivePath = path.resolve(__dirname, 'api-src.tar.gz');
  
  console.log('📦 Packaging API source files...');
  execSync(`tar -czf "${archivePath}" src`, { cwd: apiDir });

  const conn = new Client();
  conn.on('ready', async () => {
    try {
      console.log('✅ Connected to VPS.');
      
      // Upload tar
      await uploadFile(conn, archivePath, '/opt/brandos/apps/api/api-src.tar.gz');
      
      // Unpack, build, reload PM2
      await runRemoteCommand(conn, 'cd /opt/brandos/apps/api && tar -xzf api-src.tar.gz && rm api-src.tar.gz && pnpm build');
      await runRemoteCommand(conn, 'pm2 reload brandos-api && pm2 status');
      
      console.log('\n🎉 Successfully deployed API update to VPS!');
      conn.end();
      if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
    } catch (err) {
      console.error('❌ Deployment error:', err);
      conn.end();
      if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
      process.exit(1);
    }
  });

  conn.on('error', (err) => {
    console.error('❌ SSH connection failed:', err);
    process.exit(1);
  });

  conn.connect(config);
}

deployApi();
