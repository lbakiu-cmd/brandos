import { env } from "@brandos/config";

export function getDatabaseUrl() {
  return env.databaseUrl;
}
