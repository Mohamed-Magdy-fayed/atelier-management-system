import "server-only";

import { TRPCError } from "@trpc/server";

import { redisClient } from "@/integrations/redis";

/**
 * A signed-in user may start this many uploads per window.
 *
 * Sized for the burstiest legitimate case — an admin adding a full dress
 * gallery one file at a time — with enough headroom that nobody meets it by
 * working normally, while still capping how much a single stolen session can
 * push into the bucket.
 */
const MAX_UPLOADS_PER_WINDOW = 60;
const WINDOW_SECONDS = 60;

/**
 * Fixed-window counter keyed per user.
 *
 * Deliberately not a sliding window: this is a cap on bulk abuse, not a
 * fairness guarantee, and the extra Redis round trips a sliding window costs
 * are not worth it for a limit nobody should reach.
 */
export async function assertUploadWithinRateLimit(
  userId: string,
): Promise<void> {
  const key = `upload-rate:${userId}:${Math.floor(Date.now() / (WINDOW_SECONDS * 1000))}`;

  let used: number;
  try {
    used = await redisClient.incr(key);
    // Only the call that opened the window sets the TTL, so a burst cannot
    // keep pushing expiry out and turn the window into a rolling one.
    if (used === 1) {
      await redisClient.expire(key, WINDOW_SECONDS);
    }
  } catch {
    // Fails open. Uploading is a core action and the limiter guards against
    // abuse, not correctness — a Redis outage should not stop an atelier from
    // adding a dress.
    return;
  }

  if (used > MAX_UPLOADS_PER_WINDOW) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many uploads. Wait a moment and try again.",
    });
  }
}
