import { Redis } from "@upstash/redis";
import { env } from "@/env/server";

export const redisClient = new Redis({
  url: env.REDIS_URL,
  token: env.REDIS_TOKEN,
});

/**
 * Namespaces a key for this deployment. Every key passed to `redisClient` goes
 * through here — see `REDIS_KEY_PREFIX` in `src/env/server.ts` for why.
 */
export function redisKey(key: string): string {
  return `${env.REDIS_KEY_PREFIX}${key}`;
}
