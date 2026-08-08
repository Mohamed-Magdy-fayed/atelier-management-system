import { count } from "drizzle-orm";

import { RentalCustomersTable } from "@/drizzle/schema";
import {
  assertOperationalStaff,
  resolveListBranchId,
} from "@/features/system/shared/staff-access";
import {
  buildWhere,
  RENTAL_CUSTOMER_EXPORT_ROW_LIMIT,
  sortExpr,
} from "./filters";
import type {
  ExportRentalCustomersInput,
  ListRentalCustomersInput,
} from "./schemas";

import { getRequiredSession, type TRPCContext } from "./shared";
import type { RentalCustomerGridRow } from "./types";

const rentalCustomerGridSelect = {
  id: RentalCustomersTable.id,
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
  assertOperationalStaff(session.user.role);
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const whereClause = buildWhere({ ...input, branchId });
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
  assertOperationalStaff(session.user.role);
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const rows = await ctx.db
    .select(rentalCustomerGridSelect)
    .from(RentalCustomersTable)
    .where(buildWhere({ ...input, branchId }))
    .orderBy(sortExpr(input.sorting))
    .limit(RENTAL_CUSTOMER_EXPORT_ROW_LIMIT);

  return {
    rows: rows as RentalCustomerGridRow[],
  };
}
