import { TRPCError } from "@trpc/server";
import { eq, inArray, or, type SQL } from "drizzle-orm";
import { z } from "zod";

import { ProductsTable } from "@/drizzle/schema";

import type {
  CommitProductsImportInput,
  PreviewProductsImportInput,
} from "./schemas";
import { assertAdminRole, getRequiredSession, type TRPCContext } from "./shared";
import type {
  ProductImportAction,
  ProductImportCommitRow,
  ProductImportPreviewRow,
  ProductImportRowValues,
} from "./types";

type ExistingImportProduct = {
  id: string;
  code: string;
  deletedAt: Date | null;
};

type PreparedImportRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  matchProductId: string | null;
  preview: ProductImportPreviewRow;
};

const PRODUCT_IMPORT_ALLOWED_HEADERS = new Set([
  "id",
  "code",
  "nameen",
  "namear",
  "price",
  "isactive",
]);

function normalizeImportKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
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

function normalizeImportHeaders(headers: string[]) {
  return headers
    .map((header) => ({
      original: header,
      normalized: normalizeImportKey(header),
    }))
    .filter((header) => header.normalized.length > 0);
}

function parseImportBoolean(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) return true;
  if (["true", "1", "yes", "active"].includes(normalized)) return true;
  if (["false", "0", "no", "inactive"].includes(normalized)) return false;

  return null;
}

function normalizeImportedProductRow(
  ctx: Pick<TRPCContext, "t">,
  raw: Record<string, unknown>,
): {
  candidateId: string | null;
  values: ProductImportRowValues;
  reasons: string[];
} {
  const code = normalizeCode(trimImportString(readImportCell(raw, "code")));
  const nameEn = trimImportString(readImportCell(raw, "nameEn"));
  const nameAr = trimImportString(readImportCell(raw, "nameAr"));
  const priceValue = trimImportString(readImportCell(raw, "price"));
  const isActiveValue = trimImportString(readImportCell(raw, "isActive"));
  const rawId = trimImportString(readImportCell(raw, "id"));

  const reasons: string[] = [];
  let price = 0;

  if (!code) {
    reasons.push(ctx.t("dataTable.importReasonCodeRequired"));
  } else if (code.length > 32) {
    reasons.push(ctx.t("dataTable.importReasonCodeTooLong"));
  }

  if (!nameEn) {
    reasons.push(ctx.t("dataTable.importReasonNameEnRequired"));
  } else if (nameEn.length > 128) {
    reasons.push(ctx.t("dataTable.importReasonNameEnTooLong"));
  }

  if (!nameAr) {
    reasons.push(ctx.t("dataTable.importReasonNameArRequired"));
  } else if (nameAr.length > 128) {
    reasons.push(ctx.t("dataTable.importReasonNameArTooLong"));
  }

  if (!priceValue) {
    reasons.push(ctx.t("dataTable.importReasonPriceRequired"));
  } else if (!/^-?\d+$/.test(priceValue)) {
    reasons.push(ctx.t("dataTable.importReasonPriceWholeNumber"));
  } else {
    price = Number(priceValue);
    if (!Number.isSafeInteger(price) || price < 0 || price > 10_000_000) {
      reasons.push(ctx.t("dataTable.importReasonPriceRange"));
    }
  }

  const isActive = parseImportBoolean(isActiveValue);
  if (isActive == null) {
    reasons.push(ctx.t("dataTable.importReasonStatusInvalid"));
  }

  const candidateId = rawId && z.uuid().safeParse(rawId).success ? rawId : null;

  return {
    candidateId,
    values: {
      code,
      nameEn,
      nameAr,
      price,
      isActive: isActive ?? true,
    },
    reasons,
  };
}

function countImportDuplicates(
  preparedRows: {
    values: ProductImportRowValues;
    rowNumber: number;
    baseReasons: string[];
  }[],
) {
  const codeCounts = new Map<string, number>();

  for (const row of preparedRows) {
    if (row.baseReasons.length > 0) continue;
    if (row.values.code) {
      codeCounts.set(row.values.code, (codeCounts.get(row.values.code) ?? 0) + 1);
    }
  }

  return { codeCounts };
}

async function loadExistingImportProducts(
  ctx: Pick<TRPCContext, "db">,
  rows: {
    candidateId: string | null;
    values: ProductImportRowValues;
  }[],
) {
  const ids = Array.from(
    new Set(
      rows
        .map((row) => row.candidateId)
        .filter((value): value is string => value != null),
    ),
  );
  const codes = Array.from(
    new Set(rows.map((row) => row.values.code).filter((value) => value.length > 0)),
  );

  const conditions: SQL[] = [];
  if (ids.length > 0) conditions.push(inArray(ProductsTable.id, ids));
  if (codes.length > 0) conditions.push(inArray(ProductsTable.code, codes));
  if (conditions.length === 0) return [] as ExistingImportProduct[];

  const whereClause = conditions.length === 1 ? conditions[0] : or(...conditions)!;

  const rowsResult = await ctx.db
    .select({
      id: ProductsTable.id,
      code: ProductsTable.code,
      deletedAt: ProductsTable.deletedAt,
    })
    .from(ProductsTable)
    .where(whereClause);

  return rowsResult as ExistingImportProduct[];
}

async function prepareProductImportRows(
  ctx: Pick<TRPCContext, "db" | "t">,
  rows: { rowNumber: number; raw: Record<string, unknown> }[],
) {
  const normalizedRows = rows.map(({ rowNumber, raw }) => {
    const normalized = normalizeImportedProductRow(ctx, raw);
    return {
      rowNumber,
      raw,
      candidateId: normalized.candidateId,
      values: normalized.values,
      baseReasons: normalized.reasons,
    };
  });

  const { codeCounts } = countImportDuplicates(normalizedRows);
  const existingProducts = await loadExistingImportProducts(ctx, normalizedRows);

  const existingProductsById = new Map(
    existingProducts.map((product) => [product.id, product]),
  );
  const existingProductsByCode = new Map(
    existingProducts.map((product) => [product.code, product]),
  );

  return normalizedRows.map((row) => {
    const reasons = [...row.baseReasons];

    if (row.values.code && (codeCounts.get(row.values.code) ?? 0) > 1) {
      reasons.push(ctx.t("dataTable.importReasonDuplicateCodeInFile"));
    }

    const matchedProducts = new Map<string, ExistingImportProduct>();
    if (row.candidateId) {
      const matchedById = existingProductsById.get(row.candidateId);
      if (matchedById) matchedProducts.set(matchedById.id, matchedById);
    }

    if (row.values.code) {
      const matchedByCode = existingProductsByCode.get(row.values.code);
      if (matchedByCode) matchedProducts.set(matchedByCode.id, matchedByCode);
    }

    const matches = [...matchedProducts.values()];
    let action: ProductImportAction = "skip";
    let matchProductId: string | null = null;

    if (matches.length > 1) {
      reasons.push(ctx.t("dataTable.importReasonMultipleMatches"));
    } else if (matches.length === 1) {
      const [match] = matches;
      matchProductId = match?.id ?? null;

      if (!match) {
        action = "skip";
      } else if (match.deletedAt == null) {
        action = "update";
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
      matchProductId,
      preview: {
        rowNumber: row.rowNumber,
        status,
        action: status === "valid" ? action : "skip",
        reasons,
        values: row.values,
        targetProductId: status === "valid" ? matchProductId : null,
      } satisfies ProductImportPreviewRow,
    } satisfies PreparedImportRow;
  });
}

export async function previewProductsImport(
  ctx: TRPCContext,
  input: PreviewProductsImportInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const preparedRows = await prepareProductImportRows(
    ctx,
    input.rows.map((raw, index) => ({
      rowNumber: index + 1,
      raw,
    })),
  );

  const ignoredColumns = Array.from(
    new Set(
      normalizeImportHeaders(input.headers)
        .filter((header) => !PRODUCT_IMPORT_ALLOWED_HEADERS.has(header.normalized))
        .map((header) => header.original),
    ),
  );

  return {
    ignoredColumns,
    rows: preparedRows.map((row) => row.preview),
  };
}

export async function commitProductsImport(
  ctx: TRPCContext,
  input: CommitProductsImportInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const preparedRows = await prepareProductImportRows(ctx, input.rows);
  const results: ProductImportCommitRow[] = [];

  for (const row of preparedRows) {
    if (row.preview.status !== "valid") {
      results.push({
        rowNumber: row.rowNumber,
        status: "invalid",
        action: "skip",
        reasons: row.preview.reasons,
        targetProductId: null,
      });
      continue;
    }

    try {
      if (
        (row.preview.action === "restore" || row.preview.action === "update") &&
        row.matchProductId
      ) {
        await ctx.db
          .update(ProductsTable)
          .set({
            code: row.preview.values.code,
            nameEn: row.preview.values.nameEn,
            nameAr: row.preview.values.nameAr,
            price: row.preview.values.price,
            isActive: row.preview.values.isActive,
            updatedBy: session.user.id,
            deletedAt: row.preview.action === "restore" ? null : undefined,
            deletedBy: row.preview.action === "restore" ? null : undefined,
          })
          .where(eq(ProductsTable.id, row.matchProductId));
      } else if (row.preview.action === "create") {
        await ctx.db.insert(ProductsTable).values({
          code: row.preview.values.code,
          nameEn: row.preview.values.nameEn,
          nameAr: row.preview.values.nameAr,
          price: row.preview.values.price,
          isActive: row.preview.values.isActive,
          createdBy: session.user.id,
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
        targetProductId: row.matchProductId,
      });
    } catch {
      const [freshRow] = await prepareProductImportRows(ctx, [
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
        targetProductId: null,
      });
    }
  }

  return { rows: results };
}
