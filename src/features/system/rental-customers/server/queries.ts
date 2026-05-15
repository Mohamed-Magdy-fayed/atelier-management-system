import { count } from "drizzle-orm";

import { RentalCustomersTable } from "@/drizzle/schema";
import {
  buildWhere,
  RENTAL_CUSTOMER_EXPORT_ROW_LIMIT,
  sortExpr,
} from "./filters";
import type {
  ExportRentalCustomersInput,
  ListRentalCustomersInput,
} from "./schemas";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";
import type { RentalCustomerGridRow } from "./types";

const rentalCustomerGridSelect = {
  id: RentalCustomersTable.id,
  branchId: RentalCustomersTable.branchId,
  name: RentalCustomersTable.name,
  phone: RentalCustomersTable.phone,
  reservationsCount: RentalCustomersTable.reservationsCount,
  createdAt: RentalCustomersTable.createdAt,
} as const;

export async function listRentalCustomers(
  ctx: TRPCContext,
  input: ListRentalCustomersInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const whereClause = buildWhere(input);
  const [{ value: total }] = await ctx.db
    .select({ value: count() })
    .from(RentalCustomersTable)
    .where(whereClause);

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const rows = await ctx.db
    .select(rentalCustomerGridSelect)
    .from(RentalCustomersTable)
    .where(whereClause)
    .orderBy(sortExpr(input.sorting))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows as RentalCustomerGridRow[],
    pageCount,
    total: Number(total),
  };
}

export async function exportRentalCustomers(
  ctx: TRPCContext,
  input: ExportRentalCustomersInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const rows = await ctx.db
    .select(rentalCustomerGridSelect)
    .from(RentalCustomersTable)
    .where(buildWhere(input))
    .orderBy(sortExpr(input.sorting))
    .limit(RENTAL_CUSTOMER_EXPORT_ROW_LIMIT);

  return {
    rows: rows as RentalCustomerGridRow[],
  };
}
