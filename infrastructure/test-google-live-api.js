const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
  host: process.env.VPS_HOST || '169.58.227.157',
  port: 22,
  username: 'root',
  password: process.env.VPS_PASSWORD || 'mSN52s9jR',
  readyTimeout: 30000,
};

async function main() {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect(config);
  });

  const localFile = path.resolve(__dirname, 'test-script-remote.js');

  conn.sftp((err, sftp) => {
    if (err) { console.error(err); conn.end(); return; }
    const readStream = fs.createReadStream(localFile);
    const writeStream = sftp.createWriteStream('/opt/brandos/test-google-live.js');
    writeStream.on('close', () => {
      conn.exec('node /opt/brandos/test-google-live.js', (e, stream) => {
        if (e) { console.error(e); conn.end(); return; }
        stream.on('data', (d) => process.stdout.write(d));
        stream.stderr.on('data', (d) => process.stderr.write(d));
        stream.on('close', () => conn.end());
      });
    });
    readStream.pipe(writeStream);
  });
}

main().catch(console.error);
