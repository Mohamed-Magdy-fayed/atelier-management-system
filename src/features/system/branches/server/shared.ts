import { TRPCError } from "@trpc/server";

import type { createTRPCContext } from "@/integrations/trpc/init";

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
export type ProtectedTRPCSession = NonNullable<TRPCContext["session"]>;

export function getRequiredSession(ctx: TRPCContext): ProtectedTRPCSession {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return ctx.session;
}

export function assertAdminRole(role: string) {
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
  }
}
