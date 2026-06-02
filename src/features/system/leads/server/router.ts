import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { z } from "zod";

import { LeadsTable } from "@/drizzle/schema";
import {
  inngest,
  leadStatusChangedEvent,
  leadSubmittedEvent,
} from "@/integrations/inngest/client";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/integrations/trpc/init";

function assertStaff(role: string) {
  if (role !== "super_admin" && role !== "admin" && role !== "employee")
    throw new TRPCError({ code: "FORBIDDEN" });
}

const submitLeadSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(256),
  company: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(32).optional(),
  message: z.string().trim().min(10).max(4000),
  source: z.string().max(128).optional().default("contact-form"),
});

const listLeadsInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
  globalFilter: z.string().optional(),
  status: z
    .enum(["new", "contacted", "qualified", "closed", "all"])
    .optional()
    .default("all"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const leadsRouter = createTRPCRouter({
  submit: baseProcedure
    .input(submitLeadSchema)
    .mutation(async ({ ctx, input }) => {
      const [lead] = await ctx.db
        .insert(LeadsTable)
        .values(input)
        .returning({ id: LeadsTable.id });
      await inngest.send(leadSubmittedEvent.create({ leadId: lead.id }));
      return { submitted: true };
    }),

  list: protectedProcedure
    .input(listLeadsInput)
    .query(async ({ ctx, input }) => {
      assertStaff(ctx.session?.user.role ?? "");
      const conditions: ReturnType<typeof eq>[] = [];
      if (input.status && input.status !== "all")
        conditions.push(eq(LeadsTable.status, input.status));
      if (input.from)
        conditions.push(gte(LeadsTable.createdAt, new Date(input.from)));
      if (input.to)
        conditions.push(lte(LeadsTable.createdAt, new Date(input.to)));

      let where = conditions.length > 0 ? and(...conditions) : undefined;
      if (input.globalFilter?.trim()) {
        const like = `%${input.globalFilter.trim()}%`;
        const textWhere = or(
          ilike(LeadsTable.name, like),
          ilike(LeadsTable.email, like),
          ilike(LeadsTable.company, like),
        );
        where = where ? and(where, textWhere) : textWhere;
      }

      const [{ total }] = await ctx.db
        .select({ total: count() })
        .from(LeadsTable)
        .where(where);
      const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
      const page = Math.min(input.page, pageCount);
      const firstSort = input.sorting[0];
      const orderBy =
        firstSort?.id === "status"
          ? [firstSort.desc ? desc(LeadsTable.status) : asc(LeadsTable.status)]
          : [desc(LeadsTable.createdAt)];

      const rows = await ctx.db
        .select()
        .from(LeadsTable)
        .where(where)
        .orderBy(...orderBy)
        .limit(input.perPage)
        .offset((page - 1) * input.perPage);
      return { rows, pageCount, total: Number(total) };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["new", "contacted", "qualified", "closed"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertStaff(ctx.session?.user.role ?? "");
      await ctx.db
        .update(LeadsTable)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(LeadsTable.id, input.id));
      await inngest.send(
        leadStatusChangedEvent.create({
          leadId: input.id,
          newStatus: input.status,
        }),
      );
      return { updated: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertStaff(ctx.session?.user.role ?? "");
      await ctx.db.delete(LeadsTable).where(eq(LeadsTable.id, input.id));
      return { deleted: true };
    }),
});
