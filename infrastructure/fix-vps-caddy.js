const { Client } = require("ssh2");

const config = {
  host: process.env.VPS_HOST || "169.58.227.157",
  port: parseInt(process.env.VPS_PORT || "22", 10),
  username: process.env.VPS_USER || "root",
  password: process.env.VPS_PASSWORD || "mSN52s9jR",
  readyTimeout: 30000,
};

function runRemoteCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔹 [VPS EXEC] >>> ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);

      let stdout = "";
      let stderr = "";

      stream.on("close", (code) => {
        console.log(`✅ [VPS EXIT CODE ${code}]`);
        resolve({ code, stdout, stderr });
      });

      stream.on("data", (data) => {
        process.stdout.write(data.toString());
        stdout += data.toString();
      });

      stream.stderr.on("data", (data) => {
        process.stderr.write(data.toString());
        stderr += data.toString();
      });
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

  console.log("Connected to VPS. Testing and fixing Caddy & PM2...");

  // 1. Check PM2 status
  await runRemoteCommand(conn, "pm2 restart all && pm2 list");

  // 2. Test port 3000 locally on VPS for /admin
  await runRemoteCommand(conn, "curl -I http://127.0.0.1:3000/admin");
  await runRemoteCommand(conn, "curl -I http://127.0.0.1:3001/users/all");

  // 3. Configure Caddyfile with both domain and IP + automatic HTTPS support
  await runRemoteCommand(
    conn,
    `cat << 'EOF' > /etc/caddy/Caddyfile
{
    email support@brandoseye.com
}

brandoseye.com, www.brandoseye.com {
    handle_path /api/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle /wordpress/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle {
        reverse_proxy 127.0.0.1:3000
    }

    encode gzip zstd
}

:80 {
    handle_path /api/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle /wordpress/* {
        reverse_proxy 127.0.0.1:3001
    }

    handle {
        reverse_proxy 127.0.0.1:3000
    }

    encode gzip zstd
}
EOF
systemctl restart caddy
systemctl status caddy --no-pager
`
  );

  // 4. Test Caddy response
  await runRemoteCommand(conn, "curl -I http://127.0.0.1/admin");

  conn.end();
  console.log("Finished fixing VPS Caddy and PM2!");
}

main().catch(console.error);
