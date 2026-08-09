import { inArray } from "drizzle-orm";

import { BranchesTable } from "@/drizzle/schema";

import { optionalText, RowBuilder, readCell, requireText } from "../normalize";
import type { ImportHandler, ResolvedRow } from "./types";
import { findColumn, markInFileDuplicates } from "./utils";

/**
 * Short codes are uppercased on import. The unique index is on the raw column,
 * so `maadi` and `MAADI` would otherwise become two branches that every later
 * file then has to guess between.
 */
function normalizeShortCode(raw: string) {
  return raw.toUpperCase();
}

export const branchesImportHandler: ImportHandler = {
  async prepare({ db, spec }, rows) {
    const shortCodeColumn = findColumn(spec, "shortCode");
    const nameEnColumn = findColumn(spec, "nameEn");
    const nameArColumn = findColumn(spec, "nameAr");
    const addressEnColumn = findColumn(spec, "addressEn");
    const addressArColumn = findColumn(spec, "addressAr");
    const phoneColumn = findColumn(spec, "phone");

    const prepared = rows.map(({ rowNumber, cells }) => {
      const builder = new RowBuilder();

      const shortCodeRaw = builder.take(
        requireText(readCell(cells, "shortCode"), shortCodeColumn),
      );
      const shortCode = shortCodeRaw ? normalizeShortCode(shortCodeRaw) : null;
      const nameEn = builder.take(
        requireText(readCell(cells, "nameEn"), nameEnColumn),
      );
      const nameAr = builder.take(
        requireText(readCell(cells, "nameAr"), nameArColumn),
      );
      const addressEn = builder.take(
        optionalText(readCell(cells, "addressEn"), addressEnColumn),
      );
      const addressAr = builder.take(
        optionalText(readCell(cells, "addressAr"), addressArColumn),
      );
      const phone = builder.take(
        optionalText(readCell(cells, "phone"), phoneColumn),
      );

      return {
        rowNumber,
        values: { shortCode, nameEn, nameAr, addressEn, addressAr, phone },
        naturalKey: shortCode,
        reasons: builder.reasons,
      };
    });

    markInFileDuplicates(prepared, "shortCode");

    const keys = prepared
      .map((row) => row.naturalKey)
      .filter((key): key is string => key != null);

    const existing =
      keys.length > 0
        ? await db
            .select({
              id: BranchesTable.id,
              shortCode: BranchesTable.shortCode,
            })
            .from(BranchesTable)
            .where(inArray(BranchesTable.shortCode, keys))
        : [];

    const existingByCode = new Map(
      existing.map((branch) => [branch.shortCode, branch.id]),
    );

    return prepared.map((row): ResolvedRow => {
      if (row.reasons.length > 0 || !row.naturalKey) {
        return { ...row, action: "skip", targetId: null };
      }

      const targetId = existingByCode.get(row.naturalKey) ?? null;

      // Existing branches are updated rather than skipped: a re-run after
      // correcting a name should land, and a branch has no history to clobber.
      return {
        ...row,
        action: targetId ? "update" : "create",
        targetId,
      };
    });
  },

  async commit({ db }, rows) {
    for (const row of rows) {
      const values = row.values as {
        shortCode: string;
        nameEn: string;
        nameAr: string;
        addressEn: string | null;
        addressAr: string | null;
        phone: string | null;
      };

      if (row.action === "update" && row.targetId) {
        await db
          .update(BranchesTable)
          .set({
            nameEn: values.nameEn,
            nameAr: values.nameAr,
            addressEn: values.addressEn,
            addressAr: values.addressAr,
            phone: values.phone,
          })
          .where(inArray(BranchesTable.id, [row.targetId]));
        continue;
      }

      await db.insert(BranchesTable).values({
        shortCode: values.shortCode,
        nameEn: values.nameEn,
        nameAr: values.nameAr,
        addressEn: values.addressEn,
        addressAr: values.addressAr,
        phone: values.phone,
      });
    }
  },
};
