import { initTRPC, TRPCError } from "@trpc/server";
import { cookies } from "next/headers";
import superjson from "superjson";
import z, { ZodError } from "zod";

import { getUserSession } from "@/features/core/auth/core";

export const createTRPCContext = async () => {
    const cookieStore = await cookies();
    const session = await getUserSession(cookieStore);

    return { session, cookies: cookieStore };
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

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const baseProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(authMiddleware);
