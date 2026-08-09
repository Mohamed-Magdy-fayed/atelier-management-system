import { eq, inArray } from "drizzle-orm";

import { DressesTable } from "@/drizzle/schema";
import { dressCurrentStatusValues } from "@/drizzle/schemas/system/dresses-table";

import {
  optionalText,
  parseBoolean,
  parseEnum,
  parseInteger,
  RowBuilder,
  readCell,
  requireText,
} from "../normalize";
import type { ImportHandler, ResolvedRow } from "./types";
import {
  findColumn,
  loadBranchIdsByShortCode,
  markInFileDuplicates,
} from "./utils";

export const dressesImportHandler: ImportHandler = {
  async prepare({ db, spec, branchId: fallbackBranchId }, rows) {
    const codeColumn = findColumn(spec, "code");
    const titleColumn = findColumn(spec, "title");
    const pricePerDayColumn = findColumn(spec, "pricePerDay");
    const depositColumn = findColumn(spec, "depositAmount");
    const insuranceColumn = findColumn(spec, "insurance");
    const branchColumn = findColumn(spec, "branchShortCode");
    const descriptionColumn = findColumn(spec, "description");
    const sizeColumn = findColumn(spec, "size");
    const colorColumn = findColumn(spec, "color");
    const isActiveColumn = findColumn(spec, "isActive");
    const statusColumn = findColumn(spec, "currentStatus");

    // One query for every branch code in the batch, rather than one per row.
    const branchIdByShortCode = await loadBranchIdsByShortCode(
      db,
      rows.map(({ cells }) => readCell(cells, "branchShortCode")),
    );

    const prepared = rows.map(({ rowNumber, cells }) => {
      const builder = new RowBuilder();

      const code = builder.take(
        requireText(readCell(cells, "code"), codeColumn),
      );
      const title = builder.take(
        requireText(readCell(cells, "title"), titleColumn),
      );
      const pricePerDay = builder.take(
        parseInteger(readCell(cells, "pricePerDay"), pricePerDayColumn),
      );
      const depositAmount = builder.take(
        parseInteger(readCell(cells, "depositAmount"), depositColumn),
      );
      const insurance = builder.take(
        parseInteger(readCell(cells, "insurance"), insuranceColumn),
      );
      const description = builder.take(
        optionalText(readCell(cells, "description"), descriptionColumn),
      );
      const size = builder.take(
        optionalText(readCell(cells, "size"), sizeColumn),
      );
      const color = builder.take(
        optionalText(readCell(cells, "color"), colorColumn),
      );
      const isActive = builder.take(
        parseBoolean(readCell(cells, "isActive"), isActiveColumn),
      );
      const currentStatus = builder.take(
        parseEnum(
          readCell(cells, "currentStatus"),
          statusColumn,
          dressCurrentStatusValues,
        ),
      );

      // Per-row branch code wins; the branch chosen for the job is the fallback
      // so a file without a branch column still imports.
      const branchShortCode = readCell(cells, "branchShortCode");
      let resolvedBranchId: string | null = fallbackBranchId;

      if (branchShortCode.length > 0) {
        resolvedBranchId =
          branchIdByShortCode.get(branchShortCode.toUpperCase()) ?? null;

        if (!resolvedBranchId) {
          builder.fail("systemPages.importReasonBranchNotFound", {
            column: branchColumn.key,
            value: branchShortCode,
          });
        }
      } else if (!resolvedBranchId) {
        builder.fail("systemPages.importReasonBranchMissing", {
          column: branchColumn.key,
        });
      }

      return {
        rowNumber,
        values: {
          code,
          title,
          pricePerDay,
          depositAmount,
          insurance,
          branchId: resolvedBranchId,
          branchShortCode: branchShortCode || null,
          description,
          size,
          color,
          isActive,
          currentStatus,
        },
        naturalKey: code,
        reasons: builder.reasons,
      };
    });

    markInFileDuplicates(prepared, codeColumn.key);

    const codes = prepared
      .map((row) => row.naturalKey)
      .filter((key): key is string => key != null);

    // dresses.code is globally unique, so an existing code is a match
    // regardless of which branch the row claims.
    const existing =
      codes.length > 0
        ? await db
            .select({ id: DressesTable.id, code: DressesTable.code })
            .from(DressesTable)
            .where(inArray(DressesTable.code, codes))
        : [];

    const existingByCode = new Map(
      existing.map((dress) => [dress.code, dress.id]),
    );

    return prepared.map((row): ResolvedRow => {
      if (row.reasons.length > 0 || !row.naturalKey) {
        return { ...row, action: "skip", targetId: null };
      }

      const targetId = existingByCode.get(row.naturalKey) ?? null;

      return { ...row, action: targetId ? "update" : "create", targetId };
    });
  },

  async commit({ db, session }, rows) {
    for (const row of rows) {
      const values = row.values as {
        code: string;
        title: string;
        pricePerDay: number;
        depositAmount: number;
        insurance: number;
        branchId: string;
        description: string | null;
        size: string | null;
        color: string | null;
        isActive: boolean | null;
        currentStatus: (typeof dressCurrentStatusValues)[number] | null;
      };

      if (row.action === "update" && row.targetId) {
        await db
          .update(DressesTable)
          .set({
            title: values.title,
            pricePerDay: values.pricePerDay,
            depositAmount: values.depositAmount,
            insurance: values.insurance,
            description: values.description,
            size: values.size,
            color: values.color,
            // Blank cells leave the stored value alone rather than resetting it.
            ...(values.isActive == null ? {} : { isActive: values.isActive }),
            ...(values.currentStatus == null
              ? {}
              : { currentStatus: values.currentStatus }),
            updatedBy: session.user.id,
          })
          .where(eq(DressesTable.id, row.targetId));
        continue;
      }

      await db.insert(DressesTable).values({
        branchId: values.branchId,
        code: values.code,
        title: values.title,
        pricePerDay: values.pricePerDay,
        depositAmount: values.depositAmount,
        insurance: values.insurance,
        description: values.description,
        size: values.size,
        color: values.color,
        isActive: values.isActive ?? true,
        currentStatus: values.currentStatus ?? "available",
        createdBy: session.user.id,
      });
    }
  },
};
