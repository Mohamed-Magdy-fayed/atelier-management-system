import { count, eq, sql } from "drizzle-orm";

import { DressesTable, ReservationsTable } from "@/drizzle/schema";

import { buildWhere, RESERVATION_EXPORT_ROW_LIMIT, sortExpr } from "./filters";
import type {
  ExportReservationsInput,
  ListReservationsInput,
  ReservationByIdInput,
  ReservationFormDataInput,
} from "./schemas";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";
import type { ReservationDetailRow, ReservationGridRow } from "./types";

const reservationGridSelect = {
  id: ReservationsTable.id,
  branchId: ReservationsTable.branchId,
  dressId: ReservationsTable.dressId,
  customerId: ReservationsTable.customerId,
  reservationCode: ReservationsTable.reservationCode,
  customerName: ReservationsTable.customerName,
  customerPhone: ReservationsTable.customerPhone,
  receivingDateTime: ReservationsTable.receivingDateTime,
  occasionDate: ReservationsTable.occasionDate,
  returnDateTime: ReservationsTable.returnDateTime,
  totalPrice: ReservationsTable.totalPrice,
  insurance: ReservationsTable.insurance,
  discount: ReservationsTable.discount,
  depositPaid: ReservationsTable.depositPaid,
  totalPaid: ReservationsTable.totalPaid,
  status: ReservationsTable.status,
  notes: ReservationsTable.notes,
  dressTitle: DressesTable.title,
  dressCode: DressesTable.code,
  remainingBalance: sql<number>`(${ReservationsTable.totalPrice} - ${ReservationsTable.discount} - ${ReservationsTable.totalPaid})`.mapWith(
    Number,
  ),
  createdAt: ReservationsTable.createdAt,
  createdBy: ReservationsTable.createdBy,
  updatedAt: ReservationsTable.updatedAt,
  updatedBy: ReservationsTable.updatedBy,
  deletedAt: ReservationsTable.deletedAt,
  deletedBy: ReservationsTable.deletedBy,
} as const;

function reservationListQuery(ctx: TRPCContext) {
  return ctx.db
    .select(reservationGridSelect)
    .from(ReservationsTable)
    .innerJoin(DressesTable, eq(ReservationsTable.dressId, DressesTable.id));
}

export async function listReservations(
  ctx: TRPCContext,
  input: ListReservationsInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const whereClause = buildWhere(input);
  const [{ value: total }] = await ctx.db
    .select({ value: count() })
    .from(ReservationsTable)
    .innerJoin(DressesTable, eq(ReservationsTable.dressId, DressesTable.id))
    .where(whereClause);

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const rows = await reservationListQuery(ctx)
    .where(whereClause)
    .orderBy(sortExpr(input.sorting))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows as ReservationGridRow[],
    pageCount,
    total: Number(total),
  };
}

export async function exportReservations(
  ctx: TRPCContext,
  input: ExportReservationsInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const rows = await reservationListQuery(ctx)
    .where(buildWhere(input))
    .orderBy(sortExpr(input.sorting))
    .limit(RESERVATION_EXPORT_ROW_LIMIT);

  return {
    rows: rows as ReservationGridRow[],
  };
}

export async function getReservationById(
  ctx: TRPCContext,
  input: ReservationByIdInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const reservation = await ctx.db.query.ReservationsTable.findFirst({
    where: eq(ReservationsTable.id, input.id),
    with: {
      dress: true,
      payments: {
        orderBy: (payments, { desc }) => [desc(payments.createdAt)],
      },
    },
  });

  if (!reservation || reservation.deletedAt) {
    return null;
  }

  const remainingBalance =
    reservation.totalPrice - reservation.discount - reservation.totalPaid;

  const detail: ReservationDetailRow = {
    id: reservation.id,
    branchId: reservation.branchId,
    dressId: reservation.dressId,
    customerId: reservation.customerId,
    reservationCode: reservation.reservationCode,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone,
    receivingDateTime: reservation.receivingDateTime,
    occasionDate: reservation.occasionDate,
    returnDateTime: reservation.returnDateTime,
    totalPrice: reservation.totalPrice,
    insurance: reservation.insurance,
    discount: reservation.discount,
    depositPaid: reservation.depositPaid,
    totalPaid: reservation.totalPaid,
    remainingBalance,
    status: reservation.status,
    notes: reservation.notes,
    dressTitle: reservation.dress.title,
    dressCode: reservation.dress.code,
    createdAt: reservation.createdAt,
    createdBy: reservation.createdBy,
    updatedAt: reservation.updatedAt,
    updatedBy: reservation.updatedBy,
    deletedAt: reservation.deletedAt,
    deletedBy: reservation.deletedBy,
    dress: {
      id: reservation.dress.id,
      code: reservation.dress.code,
      title: reservation.dress.title,
      size: reservation.dress.size,
      color: reservation.dress.color,
      pricePerDay: reservation.dress.pricePerDay,
      depositAmount: reservation.dress.depositAmount,
      insurance: reservation.dress.insurance,
      images: reservation.dress.images,
    },
    payments: reservation.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      type: p.type,
      createdAt: p.createdAt,
    })),
  };

  return detail;
}

export async function getReservationFormData(
  ctx: TRPCContext,
  input: ReservationFormDataInput,
) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const [customers, dresses] = await Promise.all([
    ctx.db.query.RentalCustomersTable.findMany({
      where: (customers, { eq }) => eq(customers.branchId, input.branchId),
      orderBy: (customers, { asc }) => [asc(customers.name)],
      columns: {
        id: true,
        name: true,
        phone: true,
      },
    }),
    ctx.db.query.DressesTable.findMany({
      where: (dresses, { and, eq }) =>
        and(
          eq(dresses.branchId, input.branchId),
          eq(dresses.isActive, true),
        ),
      orderBy: (dresses, { asc }) => [asc(dresses.title)],
      columns: {
        id: true,
        code: true,
        title: true,
        pricePerDay: true,
        depositAmount: true,
        insurance: true,
        size: true,
        color: true,
      },
    }),
  ]);

  return { customers, dresses };
}
