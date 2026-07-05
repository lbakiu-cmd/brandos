export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://brandos:brandos@localhost:5432/brandos",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
};
