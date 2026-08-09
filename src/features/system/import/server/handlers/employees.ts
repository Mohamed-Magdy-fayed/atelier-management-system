import { eq, inArray } from "drizzle-orm";

import { BranchMembershipsTable, UsersTable } from "@/drizzle/schema";

import {
  optionalText,
  parseEmail,
  parseInteger,
  RowBuilder,
  readCell,
} from "../normalize";
import type { ImportHandler, ResolvedRow } from "./types";
import {
  findColumn,
  loadBranchIdsByShortCode,
  markInFileDuplicates,
} from "./utils";

export const employeesImportHandler: ImportHandler = {
  async prepare({ db, spec }, rows) {
    const emailColumn = findColumn(spec, "email");
    const nameColumn = findColumn(spec, "name");
    const phoneColumn = findColumn(spec, "phone");
    const ageColumn = findColumn(spec, "age");
    const branchColumn = findColumn(spec, "branchShortCode");

    const branchIdByShortCode = await loadBranchIdsByShortCode(
      db,
      rows.map(({ cells }) => readCell(cells, "branchShortCode")),
    );

    const prepared = rows.map(({ rowNumber, cells }) => {
      const builder = new RowBuilder();

      const email = builder.take(
        parseEmail(readCell(cells, "email"), emailColumn),
      );
      const name = builder.take(
        optionalText(readCell(cells, "name"), nameColumn),
      );
      const phone = builder.take(
        optionalText(readCell(cells, "phone"), phoneColumn),
      );
      const age = builder.take(
        parseInteger(readCell(cells, "age"), ageColumn, { min: 0, max: 150 }),
      );

      const branchShortCode = readCell(cells, "branchShortCode");
      let branchId: string | null = null;

      if (branchShortCode.length > 0) {
        branchId =
          branchIdByShortCode.get(branchShortCode.toUpperCase()) ?? null;

        if (!branchId) {
          builder.fail("systemPages.importReasonBranchNotFound", {
            column: branchColumn.key,
            value: branchShortCode,
          });
        }
      }

      return {
        rowNumber,
        values: {
          email,
          name,
          phone,
          age,
          branchId,
          branchShortCode: branchShortCode || null,
        },
        naturalKey: email,
        reasons: builder.reasons,
      };
    });

    markInFileDuplicates(prepared, emailColumn.key);

    const emails = prepared
      .map((row) => row.naturalKey)
      .filter((key): key is string => key != null);

    const existing =
      emails.length > 0
        ? await db
            .select({
              id: UsersTable.id,
              email: UsersTable.email,
              role: UsersTable.role,
              deletedAt: UsersTable.deletedAt,
            })
            .from(UsersTable)
            .where(inArray(UsersTable.email, emails))
        : [];

    const existingByEmail = new Map(
      existing.map((user) => [user.email.toLowerCase(), user]),
    );

    return prepared.map((row): ResolvedRow => {
      if (row.reasons.length > 0 || !row.naturalKey) {
        return { ...row, action: "skip", targetId: null };
      }

      const match = existingByEmail.get(row.naturalKey);

      if (!match) {
        return { ...row, action: "create", targetId: null };
      }

      // Never silently convert a customer or admin account into an employee —
      // that would change what the person can see.
      if (match.role !== "employee") {
        return {
          ...row,
          action: "skip",
          targetId: null,
          reasons: [
            ...row.reasons,
            {
              reasonKey: "systemPages.importReasonRoleMismatch",
              params: { role: match.role },
            },
          ],
        };
      }

      return { ...row, action: "update", targetId: match.id };
    });
  },

  async commit({ db, session }, rows) {
    for (const row of rows) {
      const values = row.values as {
        email: string;
        name: string | null;
        phone: string | null;
        age: number | null;
        branchId: string | null;
      };

      let userId = row.targetId;

      if (row.action === "update" && userId) {
        await db
          .update(UsersTable)
          .set({
            name: values.name,
            phone: values.phone,
            age: values.age,
            // A previously soft-deleted employee in the file is a re-hire.
            deletedAt: null,
            deletedBy: null,
            updatedBy: session.user.id,
          })
          .where(eq(UsersTable.id, userId));
      } else {
        const [inserted] = await db
          .insert(UsersTable)
          .values({
            email: values.email,
            name: values.name,
            phone: values.phone,
            age: values.age,
            role: "employee",
            createdBy: session.user.id,
          })
          .returning({ id: UsersTable.id });

        userId = inserted?.id ?? null;
      }

      if (userId && values.branchId) {
        // Re-importing the same file must not fail on the composite primary key.
        await db
          .insert(BranchMembershipsTable)
          .values({ userId, branchId: values.branchId })
          .onConflictDoNothing();
      }
    }
  },
};
