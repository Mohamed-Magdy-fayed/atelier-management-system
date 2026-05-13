import { TRPCError } from "@trpc/server";
import {
    and,
    asc,
    count,
    desc,
    eq,
    gte,
    ilike,
    inArray,
    isNotNull,
    isNull,
    lte,
    or,
    type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { userRoleValues, UsersTable } from "@/drizzle/schema";
import {
    isDateRangeValue,
    isNumberRangeValue,
    parseLocalDateEnd,
    parseLocalDateStart,
} from "@/features/core/data-table/lib/filter-values";
import { createTRPCRouter, protectedProcedure } from "../init";

/**
 * Parse a date-range boundary received from the client.
 *
 * The client transforms its YMD strings into UTC ISO datetimes (anchored to
 * the user's local-day boundaries) before sending them, so the common path
 * is just `new Date(iso)`. A legacy YMD fallback is kept for safety; that
 * fallback intentionally uses the server's local timezone since the caller
 * could not provide a more accurate hint.
 */
function parseRangeBoundary(raw: string, mode: "start" | "end"): Date {
    const trimmed = raw.trim();
    if (trimmed.includes("T")) return new Date(trimmed);
    return mode === "start"
        ? parseLocalDateStart(trimmed)
        : parseLocalDateEnd(trimmed);
}

function assertStaffRole(role: string) {
    if (role !== "admin" && role !== "employee") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
    }
}

function sanitizeLikeFragment(raw: string): string {
    return raw.trim().replace(/[%_\\]/g, "");
}

const listCustomersInput = z.object({
    page: z.number().int().min(1).default(1),
    perPage: z.number().int().min(1).max(100).default(20),
    sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
    globalFilter: z.string().optional(),
    columnFilters: z.array(z.object({ id: z.string(), value: z.unknown() })).default([]),
});

export type UserGridRow = {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    age: number | null;
    role: string;
    emailVerifiedAt: Date | null;
    lastSignInAt: Date | null;
    createdAt: Date | null;
    createdBy: string | null;
    updatedAt: Date | null;
    updatedBy: string | null;
    deletedAt: Date | null;
    deletedBy: string | null;
};

const userGridSelect = {
    id: UsersTable.id,
    name: UsersTable.name,
    email: UsersTable.email,
    phone: UsersTable.phone,
    age: UsersTable.age,
    role: UsersTable.role,
    emailVerifiedAt: UsersTable.emailVerifiedAt,
    lastSignInAt: UsersTable.lastSignInAt,
    createdAt: UsersTable.createdAt,
    createdBy: UsersTable.createdBy,
    updatedAt: UsersTable.updatedAt,
    updatedBy: UsersTable.updatedBy,
    deletedAt: UsersTable.deletedAt,
    deletedBy: UsersTable.deletedBy,
} as const;

const userMutationSchema = z.object({
    name: z.string().trim().min(1).max(256).nullable().optional(),
    email: z.string().trim().email().max(256),
    phone: z.string().trim().max(16).nullable().optional(),
    age: z.number().int().min(0).max(150).nullable().optional(),
    role: z.enum(userRoleValues).default("customer"),
});

function applyCustomerColumnFilters(conditions: SQL[], columnFilters: { id: string; value: unknown }[]) {
    for (const f of columnFilters) {
        if (f.id === "name" && typeof f.value === "string") {
            const s = sanitizeLikeFragment(f.value);
            if (s) conditions.push(ilike(UsersTable.name, `%${s}%`));
        } else if (f.id === "email" && typeof f.value === "string") {
            const s = sanitizeLikeFragment(f.value);
            if (s) conditions.push(ilike(UsersTable.email, `%${s}%`));
        } else if (f.id === "phone" && typeof f.value === "string") {
            const s = sanitizeLikeFragment(f.value);
            if (s) conditions.push(ilike(UsersTable.phone, `%${s}%`));
        } else if (f.id === "age" && isNumberRangeValue(f.value)) {
            const { min, max } = f.value;
            if (min != null) {
                conditions.push(and(isNotNull(UsersTable.age), gte(UsersTable.age, min))!);
            }
            if (max != null) {
                conditions.push(and(isNotNull(UsersTable.age), lte(UsersTable.age, max))!);
            }
        } else if (f.id === "verified") {
            const raw = f.value;
            const arr = Array.isArray(raw)
                ? raw.map(String)
                : raw != null && raw !== ""
                  ? [String(raw)]
                  : [];
            if (arr.length === 1) {
                if (arr[0] === "true") conditions.push(isNotNull(UsersTable.emailVerifiedAt));
                else if (arr[0] === "false") conditions.push(isNull(UsersTable.emailVerifiedAt));
            }
        } else if (f.id === "createdAt" && isDateRangeValue(f.value)) {
            const dr = f.value;
            if (dr.from?.trim()) {
                conditions.push(
                    gte(UsersTable.createdAt, parseRangeBoundary(dr.from, "start")),
                );
            }
            if (dr.to?.trim()) {
                conditions.push(
                    lte(UsersTable.createdAt, parseRangeBoundary(dr.to, "end")),
                );
            }
        } else if (f.id === "lastSignInAt" && isDateRangeValue(f.value)) {
            const dr = f.value;
            if (dr.from?.trim() || dr.to?.trim()) {
                conditions.push(isNotNull(UsersTable.lastSignInAt));
            }
            if (dr.from?.trim()) {
                conditions.push(
                    gte(UsersTable.lastSignInAt, parseRangeBoundary(dr.from, "start")),
                );
            }
            if (dr.to?.trim()) {
                conditions.push(
                    lte(UsersTable.lastSignInAt, parseRangeBoundary(dr.to, "end")),
                );
            }
        }
    }
}

const EXPORT_ROW_LIMIT = 50_000;

const listFilterInput = z.object({
    sorting: z.array(z.object({ id: z.string(), desc: z.boolean() })).default([]),
    globalFilter: z.string().optional(),
    columnFilters: z.array(z.object({ id: z.string(), value: z.unknown() })).default([]),
});

function buildWhere(
    role: "customer" | "employee",
    input: z.infer<typeof listFilterInput>,
): SQL | undefined {
    const conditions: SQL[] = [
        and(eq(UsersTable.role, role), isNull(UsersTable.deletedAt))!,
    ];
    if (input.globalFilter?.trim()) {
        const s = sanitizeLikeFragment(input.globalFilter);
        if (s) {
            const q = `%${s}%`;
            conditions.push(
                or(
                    ilike(UsersTable.name, q),
                    ilike(UsersTable.email, q),
                    ilike(UsersTable.phone, q),
                )!,
            );
        }
    }
    applyCustomerColumnFilters(conditions, input.columnFilters);
    return and(...conditions);
}

function sortExpr(sorting: { id: string; desc: boolean }[]) {
    const sort = sorting[0];
    if (!sort) return desc(UsersTable.createdAt);
    const d = sort.desc ? desc : asc;
    switch (sort.id) {
        case "name":
            return d(UsersTable.name);
        case "email":
            return d(UsersTable.email);
        case "phone":
            return d(UsersTable.phone);
        case "age":
            return d(UsersTable.age);
        case "createdAt":
            return d(UsersTable.createdAt);
        case "lastSignInAt":
            return d(UsersTable.lastSignInAt);
        case "emailVerifiedAt":
            return d(UsersTable.emailVerifiedAt);
        default:
            return desc(UsersTable.createdAt);
    }
}

export const usersRouter = createTRPCRouter({
    listEmployees: protectedProcedure.query(async ({ ctx }) => {
        assertStaffRole(ctx.session.user.role);
        const rows = await ctx.db
            .select(userGridSelect)
            .from(UsersTable)
            .where(and(eq(UsersTable.role, "employee"), isNull(UsersTable.deletedAt)))
            .orderBy(asc(UsersTable.name));

        return { rows: rows as UserGridRow[] };
    }),

    listCustomers: protectedProcedure
        .input(listCustomersInput)
        .query(async ({ ctx, input }) => {
            assertStaffRole(ctx.session.user.role);
            const whereClause = buildWhere("customer", input);

            const [{ value: total }] = await ctx.db
                .select({ value: count() })
                .from(UsersTable)
                .where(whereClause);

            const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
            const page = Math.min(input.page, pageCount);
            const offset = (page - 1) * input.perPage;

            const rows = await ctx.db
                .select(userGridSelect)
                .from(UsersTable)
                .where(whereClause)
                .orderBy(sortExpr(input.sorting))
                .limit(input.perPage)
                .offset(offset);

            return {
                rows: rows as UserGridRow[],
                pageCount,
                total: Number(total),
            };
        }),

    /** Server-side bulk fetch (no pagination) used by the CSV export button. */
    exportRows: protectedProcedure
        .input(
            listFilterInput.extend({
                role: z.enum(["customer", "employee"]).default("customer"),
            }),
        )
        .query(async ({ ctx, input }) => {
            assertStaffRole(ctx.session.user.role);
            const whereClause = buildWhere(input.role, input);

            const rows = await ctx.db
                .select(userGridSelect)
                .from(UsersTable)
                .where(whereClause)
                .orderBy(sortExpr(input.sorting))
                .limit(EXPORT_ROW_LIMIT);

            return { rows: rows as UserGridRow[] };
        }),

    create: protectedProcedure
        .input(userMutationSchema)
        .mutation(async ({ ctx, input }) => {
            assertStaffRole(ctx.session.user.role);
            const [row] = await ctx.db
                .insert(UsersTable)
                .values({
                    createdBy: ctx.session.user.id,
                    name: input.name ?? null,
                    email: input.email,
                    phone: input.phone ?? null,
                    age: input.age ?? null,
                    role: input.role,
                })
                .returning({ id: UsersTable.id });
            return { id: row.id };
        }),

    update: protectedProcedure
        .input(userMutationSchema.extend({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
            assertStaffRole(ctx.session.user.role);
            await ctx.db
                .update(UsersTable)
                .set({
                    name: input.name ?? null,
                    email: input.email,
                    phone: input.phone ?? null,
                    age: input.age ?? null,
                    role: input.role,
                    updatedBy: ctx.session.user.id,
                })
                .where(eq(UsersTable.id, input.id));
            return { id: input.id };
        }),

    softDelete: protectedProcedure
        .input(z.object({ ids: z.array(z.string().uuid()).min(1) }))
        .mutation(async ({ ctx, input }) => {
            assertStaffRole(ctx.session.user.role);
            await ctx.db
                .update(UsersTable)
                .set({
                    deletedAt: new Date(),
                    deletedBy: ctx.session.user.id,
                })
                .where(inArray(UsersTable.id, input.ids));
            return { count: input.ids.length };
        }),

    bulkSetVerified: protectedProcedure
        .input(
            z.object({
                ids: z.array(z.string().uuid()).min(1),
                verified: z.boolean(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            assertStaffRole(ctx.session.user.role);
            await ctx.db
                .update(UsersTable)
                .set({
                    emailVerifiedAt: input.verified ? new Date() : null,
                    updatedBy: ctx.session.user.id,
                })
                .where(inArray(UsersTable.id, input.ids));
            return { count: input.ids.length };
        }),
});
