import { TRPCError } from "@trpc/server";

import type { createTRPCContext } from "@/integrations/trpc/init";

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
export type ProtectedTRPCSession = NonNullable<TRPCContext["session"]>;

/** A Drizzle transaction handle. */
type UsersTransaction = Parameters<
  Parameters<TRPCContext["db"]["transaction"]>[0]
>[0];

/**
 * Query runner: the plain connection, or a transaction. Helpers take this
 * rather than reaching for `ctx.db`, so they work inside `createUser`'s
 * transaction without being locked to the non-transactional type.
 */
export type UsersDb = TRPCContext["db"] | UsersTransaction;

export function assertStaffRole(role: string) {
  if (role !== "admin" && role !== "employee") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Insufficient permissions",
    });
  }
}

/**
 * Guards actions employees must never perform: creating or editing an `admin`,
 * and setting another user's password. Without this the UI is the only thing
 * stopping an employee from escalating themselves via a direct tRPC call.
 */
export function assertAdminRole(role: string) {
  if (role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin role required",
    });
  }
}

export function getRequiredSession(ctx: TRPCContext): ProtectedTRPCSession {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return ctx.session;
}
