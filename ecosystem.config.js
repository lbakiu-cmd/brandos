module.exports = {
  apps: [
    {
      name: "brandos-api",
      cwd: "./apps/api",
      script: "dist/main.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1000M",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        DATABASE_URL: "postgresql://brandos:brandos_password@localhost:5432/brandos?schema=public",
        REDIS_URL: "redis://localhost:6379",
        API_URL: "http://169.58.227.157/api",
      },
    },
    {
      name: "brandos-web",
      cwd: "./apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1000M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
