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
import type { createTRPCContext } from "../init";
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

const importRoleSchema = z.enum(["customer", "employee"]);

export type UserImportRole = z.infer<typeof importRoleSchema>;
export type UserImportAction = "create" | "restore" | "skip";
export type UserImportStatus = "valid" | "invalid" | "done";
export type UserImportRowValues = {
    name: string | null;
    email: string;
    phone: string | null;
    age: number | null;
    role: UserImportRole;
};
export type UserImportPreviewRow = {
    rowNumber: number;
    status: "valid" | "invalid";
    action: UserImportAction;
    reasons: string[];
    values: UserImportRowValues;
    targetUserId: string | null;
};
export type UserImportCommitRow = {
    rowNumber: number;
    status: "done" | "invalid";
    action: UserImportAction;
    reasons: string[];
    targetUserId: string | null;
};

type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
type ExistingImportUser = {
    id: string;
    email: string;
    phone: string | null;
    role: string;
    deletedAt: Date | null;
};
type PreparedImportRow = {
    rowNumber: number;
    raw: Record<string, unknown>;
    matchUserId: string | null;
    preview: UserImportPreviewRow;
};

const userImportRowSchema = z.record(z.string(), z.unknown());
const previewImportInput = z.object({
    role: importRoleSchema,
    headers: z.array(z.string()).max(256),
    rows: z.array(userImportRowSchema).max(5_000),
});
const commitImportInput = z.object({
    role: importRoleSchema,
    rows: z
        .array(
            z.object({
                rowNumber: z.number().int().min(1),
                raw: userImportRowSchema,
            }),
        )
        .min(1)
        .max(5_000),
});

const USER_IMPORT_ALLOWED_HEADERS = new Set([
    "id",
    "name",
    "email",
    "phone",
    "age",
    "emailverifiedat",
    "lastsigninat",
    "createdat",
]);

function normalizeImportKey(value: string): string {
    return value.trim().toLowerCase();
}

function readImportCell(row: Record<string, unknown>, key: string): unknown {
    const normalizedKey = normalizeImportKey(key);

    for (const [candidateKey, candidateValue] of Object.entries(row)) {
        if (normalizeImportKey(candidateKey) === normalizedKey) {
            return candidateValue;
        }
    }

    return "";
}

function trimImportString(value: unknown): string {
    return value == null ? "" : String(value).trim();
}

function trimNullableImportString(value: unknown): string | null {
    const normalized = trimImportString(value);
    return normalized ? normalized : null;
}

function normalizeImportHeaders(headers: string[]) {
    return headers
        .map((header) => ({
            original: header,
            normalized: normalizeImportKey(header),
        }))
        .filter((header) => header.normalized.length > 0);
}

function normalizeImportedUserRow(
    ctx: Pick<TRPCContext, "t">,
    role: UserImportRole,
    raw: Record<string, unknown>,
): { candidateId: string | null; values: UserImportRowValues; reasons: string[] } {
    const name = trimNullableImportString(readImportCell(raw, "name"));
    const email = trimImportString(readImportCell(raw, "email"));
    const phone = trimNullableImportString(readImportCell(raw, "phone"));
    const ageValue = trimImportString(readImportCell(raw, "age"));
    const rawId = trimImportString(readImportCell(raw, "id"));

    const reasons: string[] = [];
    let age: number | null = null;

    if (!email) {
        reasons.push(ctx.t("dataTable.importReasonEmailRequired"));
    } else if (!z.email().safeParse(email).success) {
        reasons.push(ctx.t("dataTable.importReasonEmailInvalid"));
    } else if (email.length > 256) {
        reasons.push(ctx.t("dataTable.importReasonEmailTooLong"));
    }

    if (name && name.length > 256) {
        reasons.push(ctx.t("dataTable.importReasonNameTooLong"));
    }

    if (phone && phone.length > 16) {
        reasons.push(ctx.t("dataTable.importReasonPhoneTooLong"));
    }

    if (ageValue) {
        if (!/^-?\d+$/.test(ageValue)) {
            reasons.push(ctx.t("dataTable.importReasonAgeWholeNumber"));
        } else {
            age = Number(ageValue);
            if (!Number.isSafeInteger(age) || age < 0 || age > 150) {
                reasons.push(ctx.t("dataTable.importReasonAgeRange"));
            }
        }
    }

    const candidateId = rawId && z.uuid().safeParse(rawId).success ? rawId : null;

    return {
        candidateId,
        values: {
            name,
            email,
            phone,
            age,
            role,
        },
        reasons,
    };
}

function countImportDuplicates(
    preparedRows: {
        values: UserImportRowValues;
        rowNumber: number;
        baseReasons: string[];
    }[],
) {
    const emailCounts = new Map<string, number>();
    const phoneCounts = new Map<string, number>();

    for (const row of preparedRows) {
        if (row.baseReasons.length > 0) continue;
        if (row.values.email) {
            emailCounts.set(row.values.email, (emailCounts.get(row.values.email) ?? 0) + 1);
        }
        if (row.values.phone) {
            phoneCounts.set(row.values.phone, (phoneCounts.get(row.values.phone) ?? 0) + 1);
        }
    }

    return { emailCounts, phoneCounts };
}

async function loadExistingImportUsers(
    ctx: Pick<TRPCContext, "db">,
    rows: {
        candidateId: string | null;
        values: UserImportRowValues;
    }[],
) {
    const ids = Array.from(
        new Set(rows.map((row) => row.candidateId).filter((value): value is string => value != null)),
    );
    const emails = Array.from(
        new Set(rows.map((row) => row.values.email).filter((value) => value.length > 0)),
    );
    const phones = Array.from(
        new Set(rows.map((row) => row.values.phone).filter((value): value is string => value != null)),
    );

    const conditions: SQL[] = [];
    if (ids.length > 0) conditions.push(inArray(UsersTable.id, ids));
    if (emails.length > 0) conditions.push(inArray(UsersTable.email, emails));
    if (phones.length > 0) conditions.push(inArray(UsersTable.phone, phones));
    if (conditions.length === 0) return [] as ExistingImportUser[];

    const whereClause = conditions.length === 1 ? conditions[0] : or(...conditions)!;

    const rowsResult = await ctx.db
        .select({
            id: UsersTable.id,
            email: UsersTable.email,
            phone: UsersTable.phone,
            role: UsersTable.role,
            deletedAt: UsersTable.deletedAt,
        })
        .from(UsersTable)
        .where(whereClause);

    return rowsResult as ExistingImportUser[];
}

async function prepareUserImportRows(
    ctx: Pick<TRPCContext, "db" | "t">,
    role: UserImportRole,
    rows: { rowNumber: number; raw: Record<string, unknown> }[],
) {
    const normalizedRows = rows.map(({ rowNumber, raw }) => {
        const normalized = normalizeImportedUserRow(ctx, role, raw);
        return {
            rowNumber,
            raw,
            candidateId: normalized.candidateId,
            values: normalized.values,
            baseReasons: normalized.reasons,
        };
    });

    const { emailCounts, phoneCounts } = countImportDuplicates(normalizedRows);
    const existingUsers = await loadExistingImportUsers(ctx, normalizedRows);

    const existingUsersById = new Map(existingUsers.map((user) => [user.id, user]));
    const existingUsersByEmail = new Map(existingUsers.map((user) => [user.email, user]));
    const existingUsersByPhone = new Map(
        existingUsers
            .filter((user) => user.phone != null)
            .map((user) => [user.phone, user] as const),
    );

    return normalizedRows.map((row) => {
        const reasons = [...row.baseReasons];

        if (row.values.email && (emailCounts.get(row.values.email) ?? 0) > 1) {
            reasons.push(ctx.t("dataTable.importReasonDuplicateEmailInFile"));
        }

        if (row.values.phone && (phoneCounts.get(row.values.phone) ?? 0) > 1) {
            reasons.push(ctx.t("dataTable.importReasonDuplicatePhoneInFile"));
        }

        const matchedUsers = new Map<string, ExistingImportUser>();
        if (row.candidateId) {
            const matchedById = existingUsersById.get(row.candidateId);
            if (matchedById) matchedUsers.set(matchedById.id, matchedById);
        }

        if (row.values.email) {
            const matchedByEmail = existingUsersByEmail.get(row.values.email);
            if (matchedByEmail) matchedUsers.set(matchedByEmail.id, matchedByEmail);
        }

        if (row.values.phone) {
            const matchedByPhone = existingUsersByPhone.get(row.values.phone);
            if (matchedByPhone) matchedUsers.set(matchedByPhone.id, matchedByPhone);
        }

        const matches = [...matchedUsers.values()];
        let action: UserImportAction = "skip";
        let matchUserId: string | null = null;

        if (matches.length > 1) {
            reasons.push(ctx.t("dataTable.importReasonMultipleMatches"));
        } else if (matches.length === 1) {
            const [match] = matches;
            matchUserId = match?.id ?? null;

            if (!match) {
                action = "skip";
            } else if (match.deletedAt == null) {
                reasons.push(ctx.t("dataTable.importReasonAlreadyExists"));
            } else if (match.role !== role) {
                reasons.push(ctx.t("dataTable.importReasonRoleMismatch"));
            } else {
                action = "restore";
            }
        } else {
            action = "create";
        }

        const status = reasons.length > 0 ? "invalid" : "valid";

        return {
            rowNumber: row.rowNumber,
            raw: row.raw,
            matchUserId,
            preview: {
                rowNumber: row.rowNumber,
                status,
                action: status === "valid" ? action : "skip",
                reasons,
                values: row.values,
                targetUserId: status === "valid" ? matchUserId : null,
            } satisfies UserImportPreviewRow,
        } satisfies PreparedImportRow;
    });
}

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

    previewImport: protectedProcedure
        .input(previewImportInput)
        .mutation(async ({ ctx, input }) => {
            assertStaffRole(ctx.session.user.role);

            const preparedRows = await prepareUserImportRows(
                ctx,
                input.role,
                input.rows.map((raw, index) => ({
                    rowNumber: index + 1,
                    raw,
                })),
            );

            const ignoredColumns = Array.from(
                new Set(
                    normalizeImportHeaders(input.headers)
                        .filter((header) => !USER_IMPORT_ALLOWED_HEADERS.has(header.normalized))
                        .map((header) => header.original),
                ),
            );

            return {
                ignoredColumns,
                rows: preparedRows.map((row) => row.preview),
            };
        }),

    commitImport: protectedProcedure
        .input(commitImportInput)
        .mutation(async ({ ctx, input }) => {
            assertStaffRole(ctx.session.user.role);

            const preparedRows = await prepareUserImportRows(ctx, input.role, input.rows);
            const results: UserImportCommitRow[] = [];

            for (const row of preparedRows) {
                if (row.preview.status !== "valid") {
                    results.push({
                        rowNumber: row.rowNumber,
                        status: "invalid",
                        action: "skip",
                        reasons: row.preview.reasons,
                        targetUserId: null,
                    });
                    continue;
                }

                try {
                    if (row.preview.action === "restore" && row.matchUserId) {
                        await ctx.db
                            .update(UsersTable)
                            .set({
                                name: row.preview.values.name ?? null,
                                email: row.preview.values.email,
                                phone: row.preview.values.phone ?? null,
                                age: row.preview.values.age ?? null,
                                role: input.role,
                                updatedBy: ctx.session.user.id,
                                deletedAt: null,
                                deletedBy: null,
                            })
                            .where(eq(UsersTable.id, row.matchUserId));
                    } else if (row.preview.action === "create") {
                        await ctx.db.insert(UsersTable).values({
                            createdBy: ctx.session.user.id,
                            name: row.preview.values.name ?? null,
                            email: row.preview.values.email,
                            phone: row.preview.values.phone ?? null,
                            age: row.preview.values.age ?? null,
                            role: input.role,
                        });
                    } else {
                        throw new TRPCError({
                            code: "BAD_REQUEST",
                            message: ctx.t("dataTable.importReasonChangedBeforeCommit"),
                        });
                    }

                    results.push({
                        rowNumber: row.rowNumber,
                        status: "done",
                        action: row.preview.action,
                        reasons: [],
                        targetUserId: row.matchUserId,
                    });
                } catch {
                    const [freshRow] = await prepareUserImportRows(ctx, input.role, [
                        { rowNumber: row.rowNumber, raw: row.raw },
                    ]);

                    results.push({
                        rowNumber: row.rowNumber,
                        status: "invalid",
                        action: "skip",
                        reasons:
                            freshRow?.preview.reasons.length
                                ? freshRow.preview.reasons
                                : [ctx.t("dataTable.importReasonChangedBeforeCommit")],
                        targetUserId: null,
                    });
                }
            }

            return { rows: results };
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
