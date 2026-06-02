import { TRPCError } from "@trpc/server";
import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { SubscribersTable } from "@/drizzle/schema";
import { inngest, subscriberCreatedEvent } from "@/integrations/inngest/client";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/integrations/trpc/init";

function assertAdmin(role: string) {
  if (role !== "super_admin" && role !== "admin")
    throw new TRPCError({ code: "FORBIDDEN" });
}

const listSubscribersInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  status: z.enum(["active", "unsubscribed", "all"]).optional().default("all"),
});

export const subscribersRouter = createTRPCRouter({
  subscribe: baseProcedure
    .input(z.object({ email: z.string().trim().email().max(256) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.SubscribersTable.findFirst({
        columns: { id: true, status: true },
        where: eq(SubscribersTable.email, input.email.toLowerCase()),
      });
      if (existing) {
        if (existing.status === "active")
          return { subscribed: true, alreadyActive: true };
        await ctx.db
          .update(SubscribersTable)
          .set({ status: "active", confirmedAt: null })
          .where(eq(SubscribersTable.id, existing.id));
        await inngest.send(
          subscriberCreatedEvent.create({ subscriberId: existing.id }),
        );
        return { subscribed: true };
      }
      const [sub] = await ctx.db
        .insert(SubscribersTable)
        .values({ email: input.email.toLowerCase() })
        .returning({ id: SubscribersTable.id });
      await inngest.send(
        subscriberCreatedEvent.create({ subscriberId: sub.id }),
      );
      return { subscribed: true };
    }),

  list: protectedProcedure
    .input(listSubscribersInput)
    .query(async ({ ctx, input }) => {
      assertAdmin(ctx.session?.user.role ?? "");
      const where =
        input.status !== "all"
          ? eq(SubscribersTable.status, input.status)
          : undefined;
      const [{ total }] = await ctx.db
        .select({ total: count() })
        .from(SubscribersTable)
        .where(where);
      const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
      const page = Math.min(input.page, pageCount);
      const rows = await ctx.db
        .select()
        .from(SubscribersTable)
        .where(where)
        .orderBy(desc(SubscribersTable.createdAt))
        .limit(input.perPage)
        .offset((page - 1) * input.perPage);
      return { rows, pageCount, total: Number(total) };
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.session?.user.role ?? "");
      await ctx.db
        .update(SubscribersTable)
        .set({ status: "unsubscribed" })
        .where(eq(SubscribersTable.id, input.id));
      return { unsubscribed: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.session?.user.role ?? "");
      await ctx.db
        .delete(SubscribersTable)
        .where(eq(SubscribersTable.id, input.id));
      return { deleted: true };
    }),
});
