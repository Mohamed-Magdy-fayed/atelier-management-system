import { initTRPC, TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import superjson from "superjson";
import z, { ZodError } from "zod";

import { db } from "@/drizzle";
import { getUserSession } from "@/features/core/auth/core";
import { getT } from "@/features/core/i18n/server";
import { handleDatabaseError } from "./db-error";

export const createTRPCContext = async () => {
    const cookieStore = await cookies();
    const session = await getUserSession(cookieStore);
    const { t } = await getT();

    return { session, cookies: cookieStore, t, db };
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
    if (!ctx.session || ctx.session.exp) {
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
