import crypto from "node:crypto";
import { env } from "@/env/server";
import { sessionSchema } from "@/features/core/auth/schemas";

import type { Cookies, PartialUser } from "@/features/core/auth/types";
import { redisClient } from "@/integrations/redis";

// Seven days in seconds
const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;
const COOKIE_SESSION_KEY = "session-id";
function getSessionExpirationSeconds() {
  return Math.floor(Date.now() / 1000) + SESSION_EXPIRATION_SECONDS;
}

export async function getUserSession(cookies: Pick<Cookies, "get">) {
  const sessionId = cookies.get(COOKIE_SESSION_KEY)?.value;
  if (sessionId == null) return null;

  const session = await getUserSessionById(sessionId);
  if (session == null) return null;
  if (session.exp * 1000 <= Date.now()) return null;

  return session;
}

export async function updateUserSessionData(
  user: PartialUser,
  cookies: Pick<Cookies, "get">,
) {
  const sessionId = cookies.get(COOKIE_SESSION_KEY)?.value;
  if (sessionId == null) return null;

  await redisClient.set(
    `session:${sessionId}`,
    sessionSchema.parse({
      sessionId,
      exp: getSessionExpirationSeconds(),
      user,
    }),
    {
      ex: SESSION_EXPIRATION_SECONDS,
    },
  );
}

export async function createUserSession(
  userOrPayload: PartialUser | { user: PartialUser; hasPassword?: boolean },
  cookies: Pick<Cookies, "set">,
) {
  const isPayload =
    "user" in userOrPayload && typeof userOrPayload.user === "object";
  const user = isPayload
    ? (userOrPayload as { user: PartialUser }).user
    : (userOrPayload as PartialUser);
  const hasPassword = isPayload
    ? ((userOrPayload as { hasPassword?: boolean }).hasPassword ?? false)
    : false;

  const sessionId = crypto.randomBytes(512).toString("hex").normalize();
  await redisClient.set(
    `session:${sessionId}`,
    sessionSchema.parse({
      sessionId,
      exp: getSessionExpirationSeconds(),
      hasPassword,
      user,
    }),
    {
      ex: SESSION_EXPIRATION_SECONDS,
    },
  );

  setCookie(sessionId, cookies);
}

export async function updateUserSessionExpiration(
  cookies: Pick<Cookies, "get" | "set">,
) {
  const sessionId = cookies.get(COOKIE_SESSION_KEY)?.value;
  if (sessionId == null) return null;

  const session = await getUserSessionById(sessionId);
  if (session == null) return;
  if (session.exp * 1000 <= Date.now()) return;

  const nextExp = getSessionExpirationSeconds();

  await redisClient.set(
    `session:${sessionId}`,
    sessionSchema.parse({ ...session, exp: nextExp }),
    {
      ex: SESSION_EXPIRATION_SECONDS,
    },
  );
  setCookie(sessionId, cookies);
}

export async function removeUserFromSession(
  cookies: Pick<Cookies, "get" | "delete">,
) {
  const sessionId = cookies.get(COOKIE_SESSION_KEY)?.value;
  if (sessionId == null) return null;

  await redisClient.del(`session:${sessionId}`);
  cookies.delete(COOKIE_SESSION_KEY);
}

function setCookie(sessionId: string, cookies: Pick<Cookies, "set">) {
  cookies.set(COOKIE_SESSION_KEY, sessionId, {
    secure: env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    expires: new Date(Date.now() + SESSION_EXPIRATION_SECONDS * 1000),
    path: "/",
  });
}

async function getUserSessionById(sessionId: string) {
  const rawSession = await redisClient.get(`session:${sessionId}`);

  const { success, data: session } = sessionSchema.safeParse(rawSession);

  return success ? session : null;
}
