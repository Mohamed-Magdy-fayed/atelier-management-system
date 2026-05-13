import { TRPCError } from "@trpc/server";
import { eq, inArray, or, type SQL } from "drizzle-orm";
import { z } from "zod";

import { UsersTable } from "@/drizzle/schema";

import type {
  CommitImportInput,
  PreviewImportInput,
  UserImportRole,
} from "./schemas";
import { assertStaffRole, getRequiredSession, type TRPCContext } from "./shared";
import type {
  UserImportAction,
  UserImportCommitRow,
  UserImportPreviewRow,
  UserImportRowValues,
} from "./types";

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

export async function previewUsersImport(
  ctx: TRPCContext,
  input: PreviewImportInput,
) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);

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
}

export async function commitUsersImport(
  ctx: TRPCContext,
  input: CommitImportInput,
) {
  const session = getRequiredSession(ctx);
  assertStaffRole(session.user.role);

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
            updatedBy: session.user.id,
            deletedAt: null,
            deletedBy: null,
          })
          .where(eq(UsersTable.id, row.matchUserId));
      } else if (row.preview.action === "create") {
        await ctx.db.insert(UsersTable).values({
          createdBy: session.user.id,
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
}
