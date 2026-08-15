import { initTRPC, TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import superjson from "superjson";
import z, { ZodError } from "zod";

import { db } from "@/drizzle";
import { getUserSession } from "@/features/core/auth/core";
import type { ScreenPermissionMap } from "@/features/core/auth/core/screen-permission-map";
import { getT } from "@/features/core/i18n/server";
import { loadScreenPermissionMap } from "@/features/system/users/server/screen-permissions";
import { handleDatabaseError } from "./db-error";

/**
 * Per-request loader for the caller's screen grants, memoised so a resolver that
 * checks two screens (or a query and a mutation guard) still pays one round trip.
 *
 * Reads the database, not the Redis mirror: Postgres is authoritative, and a
 * mirror edited out-of-band must never be able to widen a server-side check.
 */
function createScreenPermissionLoader(userId: string | undefined) {
  let inFlight: Promise<ScreenPermissionMap> | null = null;

  return () => {
    if (!userId) return Promise.resolve<ScreenPermissionMap>({});
    inFlight ??= loadScreenPermissionMap(db, userId);
    return inFlight;
  };
}

export const createTRPCContext = async () => {
  const cookieStore = await cookies();
  const session = await getUserSession(cookieStore);
  const { t } = await getT();

  return {
    session,
    cookies: cookieStore,
    t,
    db,
    loadScreenPermissions: createScreenPermissionLoader(session?.user.id),
  };
};

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError:
            error.cause instanceof ZodError
              ? z.treeifyError(error.cause)
              : null,
        },
      };
    },
  });

const authMiddleware = t.middleware(({ ctx, next }) => {
  if (!ctx.session || ctx.session.exp * 1000 <= Date.now()) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

const databaseErrorMiddleware = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (err) {
    throw handleDatabaseError(err);
  }
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const baseProcedure = t.procedure.use(databaseErrorMiddleware);
export const protectedProcedure = t.procedure
  .use(authMiddleware)
  .use(databaseErrorMiddleware);
