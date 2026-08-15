import { TRPCError } from "@trpc/server";
import { and, eq, ne, sql } from "drizzle-orm";

import { RentalCustomersTable } from "@/drizzle/schema";
import { assertScreenPermission } from "@/features/system/shared/screen-access";
import { assertOperationalStaff } from "@/features/system/shared/staff-access";
import { rentalCustomerPhoneKey } from "@/lib/phone";

import type { UpdateRentalCustomerInput } from "./schemas";
import { getRequiredSession, type TRPCContext } from "./shared";

/**
 * A customer's identity is the *normalized* phone, not the stored text.
 *
 * `rental_customers_phone_unique` only covers the raw column, so it would happily
 * accept `+201001234567` alongside an existing `0100 123 4567` — the exact
 * duplicate pair migration 0011 merged away. Uniqueness is therefore checked
 * against `rental_customer_phone_key(text)`, the SQL function that migration
 * created, mirrored in TS by `rentalCustomerPhoneKey`.
 */
async function ensureUniquePhoneKey(
  ctx: TRPCContext,
  phone: string,
  currentId: string,
) {
  const key = rentalCustomerPhoneKey(phone);

  // An all-punctuation entry normalizes to "", which would then collide with
  // every other unusable number rather than being rejected on its own terms.
  if (!key) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.customerPhoneInvalid"),
    });
  }

  const existing = await ctx.db.query.RentalCustomersTable.findFirst({
    columns: { id: true },
    where: and(
      sql`rental_customer_phone_key(${RentalCustomersTable.phone}) = ${key}`,
      ne(RentalCustomersTable.id, currentId),
    ),
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: ctx.t("systemPages.customerPhoneDuplicate"),
    });
  }
}

/**
 * Fixes a mistyped walk-in record. No branch guard: customers are deliberately
 * tenant-wide (there is no `branchId` column) — branch scope is derived through
 * their reservations at read time.
 */
export async function updateRentalCustomer(
  ctx: TRPCContext,
  input: UpdateRentalCustomerInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertScreenPermission(ctx, session, "customers", "update");

  const existing = await ctx.db.query.RentalCustomersTable.findFirst({
    where: eq(RentalCustomersTable.id, input.id),
    columns: { id: true, phone: true },
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.customerNotFound"),
    });
  }

  const phone = input.phone.trim();

  // Only re-check when the number actually changed: a row that already collides
  // with another (legacy imports made a few) must not block a name-only fix.
  if (rentalCustomerPhoneKey(phone) !== rentalCustomerPhoneKey(existing.phone)) {
    await ensureUniquePhoneKey(ctx, phone, input.id);
  }

  await ctx.db
    .update(RentalCustomersTable)
    .set({
      name: input.name.trim(),
      phone,
      note: input.note?.trim() || null,
      updatedBy: session.user.id,
    })
    .where(eq(RentalCustomersTable.id, input.id));

  return { id: input.id };
}
