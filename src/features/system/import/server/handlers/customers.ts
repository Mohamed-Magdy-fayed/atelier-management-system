import { eq, inArray, sql } from "drizzle-orm";

import { RentalCustomersTable } from "@/drizzle/schema";
import { rentalCustomerPhoneKey } from "@/lib/phone";

import { optionalText, RowBuilder, readCell, requireText } from "../normalize";
import type { ImportHandler, ResolvedRow } from "./types";
import { findColumn, markInFileDuplicates } from "./utils";

/**
 * Customers are matched on the normalized phone key, not the raw column.
 *
 * `rental_customers.phone` carries a plain UNIQUE constraint on the stored
 * text, but identity is `rental_customer_phone_key()` — `0100 123 4567`,
 * `+201001234567` and `1001234567` are one person. Matching on raw text would
 * happily insert all three, recreating exactly the duplicates migration 0011
 * merged away.
 */
export const customersImportHandler: ImportHandler = {
  async prepare({ db, spec }, rows) {
    const phoneColumn = findColumn(spec, "phone");
    const nameColumn = findColumn(spec, "name");
    const noteColumn = findColumn(spec, "note");

    const prepared = rows.map(({ rowNumber, cells }) => {
      const builder = new RowBuilder();

      const phone = builder.take(
        requireText(readCell(cells, "phone"), phoneColumn),
      );
      const name = builder.take(
        requireText(readCell(cells, "name"), nameColumn),
      );
      const note = builder.take(
        optionalText(readCell(cells, "note"), noteColumn),
      );

      const phoneKey = phone ? rentalCustomerPhoneKey(phone) : "";

      if (phone && phoneKey.length === 0) {
        builder.fail("systemPages.importReasonInvalidPhone", {
          column: phoneColumn.key,
        });
      }

      return {
        rowNumber,
        values: { phone, name, note },
        naturalKey: phoneKey.length > 0 ? phoneKey : null,
        reasons: builder.reasons,
      };
    });

    markInFileDuplicates(prepared, phoneColumn.key);

    const keys = prepared
      .map((row) => row.naturalKey)
      .filter((key): key is string => key != null);

    const existing =
      keys.length > 0
        ? await db
            .select({
              id: RentalCustomersTable.id,
              phoneKey: sql<string>`rental_customer_phone_key(${RentalCustomersTable.phone})`,
            })
            .from(RentalCustomersTable)
            .where(
              inArray(
                sql`rental_customer_phone_key(${RentalCustomersTable.phone})`,
                keys,
              ),
            )
        : [];

    const existingByKey = new Map(
      existing.map((customer) => [customer.phoneKey, customer.id]),
    );

    return prepared.map((row): ResolvedRow => {
      if (row.reasons.length > 0 || !row.naturalKey) {
        return { ...row, action: "skip", targetId: null };
      }

      const targetId = existingByKey.get(row.naturalKey) ?? null;

      return { ...row, action: targetId ? "update" : "create", targetId };
    });
  },

  async commit({ db }, rows) {
    for (const row of rows) {
      const values = row.values as {
        phone: string;
        name: string;
        note: string | null;
      };

      if (row.action === "update" && row.targetId) {
        // The stored phone is left as-is: it is the same person either way, and
        // rewriting it would churn a column other rows may already reference.
        await db
          .update(RentalCustomersTable)
          .set({ name: values.name, note: values.note })
          .where(eq(RentalCustomersTable.id, row.targetId));
        continue;
      }

      await db.insert(RentalCustomersTable).values({
        phone: values.phone,
        name: values.name,
        note: values.note,
      });
    }
  },
};
