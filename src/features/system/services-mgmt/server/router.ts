import { TRPCError } from "@trpc/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { ServicesTable } from "@/drizzle/schema";
import { translationKey } from "@/features/core/i18n/global";
import {
  baseProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "@/integrations/trpc/init";

function assertAdmin(role: string) {
  if (role !== "super_admin" && role !== "admin")
    throw new TRPCError({ code: "FORBIDDEN" });
}

const required = translationKey("forms.validation.required");
const max255 = translationKey("forms.validation.max255");

const serviceMutationSchema = z.object({
  title: z.string().trim().min(1, required).max(255, max255),
  slug: z
    .string()
    .trim()
    .min(1, required)
    .max(255, max255)
    .regex(/^[a-z0-9-]+$/, translationKey("forms.validation.slugFormat")),
  shortDescription: z.string().trim().min(1, required).max(512),
  fullDescription: z.string().trim().max(2048).optional().nullable(),
  icon: z.string().trim().min(1, required).max(64).default("Zap"),
  features: z.array(z.string().trim().min(1)).default([]),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const serviceUpdateSchema = serviceMutationSchema.extend({
  id: z.string().uuid(),
});

export const servicesMgmtRouter = createTRPCRouter({
  publicList: baseProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: ServicesTable.id,
        title: ServicesTable.title,
        slug: ServicesTable.slug,
        shortDescription: ServicesTable.shortDescription,
        icon: ServicesTable.icon,
        features: ServicesTable.features,
        sortOrder: ServicesTable.sortOrder,
      })
      .from(ServicesTable)
      .where(
        and(eq(ServicesTable.isActive, true), isNull(ServicesTable.deletedAt)),
      )
      .orderBy(asc(ServicesTable.sortOrder));
  }),
  list: protectedProcedure.query(async ({ ctx }) => {
    assertAdmin(ctx.session?.user.role ?? "");
    return ctx.db
      .select()
      .from(ServicesTable)
      .where(isNull(ServicesTable.deletedAt))
      .orderBy(ServicesTable.sortOrder);
  }),
  create: protectedProcedure
    .input(serviceMutationSchema)
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.session?.user.role ?? "");
      const [row] = await ctx.db
        .insert(ServicesTable)
        .values({
          ...input,
          fullDescription: input.fullDescription ?? null,
          createdBy: ctx.session?.user.id ?? "system",
        })
        .returning({ id: ServicesTable.id });
      return { id: row.id };
    }),
  update: protectedProcedure
    .input(serviceUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.session?.user.role ?? "");
      const { id, ...data } = input;
      await ctx.db
        .update(ServicesTable)
        .set({
          ...data,
          fullDescription: data.fullDescription ?? null,
          updatedBy: ctx.session?.user.id ?? "system",
        })
        .where(eq(ServicesTable.id, id));
      return { updated: true };
    }),
  activate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.session?.user.role ?? "");
      await ctx.db
        .update(ServicesTable)
        .set({ isActive: true })
        .where(eq(ServicesTable.id, input.id));
      return { activated: true };
    }),
  deactivate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.session?.user.role ?? "");
      await ctx.db
        .update(ServicesTable)
        .set({ isActive: false })
        .where(eq(ServicesTable.id, input.id));
      return { deactivated: true };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertAdmin(ctx.session?.user.role ?? "");
      await ctx.db
        .update(ServicesTable)
        .set({
          deletedAt: new Date(),
          deletedBy: ctx.session?.user.id ?? "system",
        })
        .where(eq(ServicesTable.id, input.id));
      return { deleted: true };
    }),
});
