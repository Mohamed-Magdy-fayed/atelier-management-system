import { count } from "drizzle-orm";

import { PaymentsTable } from "@/drizzle/schema";
import { buildWhere, PAYMENT_EXPORT_ROW_LIMIT, sortExpr } from "./filters";
import type { ExportPaymentsInput, ListPaymentsInput } from "./schemas";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";
import type { PaymentGridRow } from "./types";

const paymentGridSelect = {
  id: PaymentsTable.id,
  branchId: PaymentsTable.branchId,
  reservationId: PaymentsTable.reservationId,
  customerId: PaymentsTable.customerId,
  amount: PaymentsTable.amount,
  type: PaymentsTable.type,
  method: PaymentsTable.method,
  note: PaymentsTable.note,
  createdAt: PaymentsTable.createdAt,
  createdBy: PaymentsTable.createdBy,
} as const;

export async function listPayments(ctx: TRPCContext, input: ListPaymentsInput) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const whereClause = buildWhere(input);
  const [{ value: total }] = await ctx.db
    .select({ value: count() })
    .from(PaymentsTable)
    .where(whereClause);

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const rows = await ctx.db
    .select(paymentGridSelect)
    .from(PaymentsTable)
    .where(whereClause)
    .orderBy(sortExpr(input.sorting))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows as PaymentGridRow[],
    pageCount,
    total: Number(total),
  };
}

export async function exportPayments(
  ctx: TRPCContext,
  input: ExportPaymentsInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const rows = await ctx.db
    .select(paymentGridSelect)
    .from(PaymentsTable)
    .where(buildWhere(input))
    .orderBy(sortExpr(input.sorting))
    .limit(PAYMENT_EXPORT_ROW_LIMIT);

  return {
    rows: rows as PaymentGridRow[],
  };
}
