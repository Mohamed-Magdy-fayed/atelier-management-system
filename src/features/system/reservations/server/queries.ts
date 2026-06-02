import { and, asc, count, eq, isNull, ne, sql } from "drizzle-orm";

import {
  BranchesTable,
  DressesTable,
  ReservationsTable,
} from "@/drizzle/schema";

import { buildWhere, RESERVATION_EXPORT_ROW_LIMIT, sortExpr } from "./filters";
import type {
  DressOccasionBlockedRangesInput,
  ExportReservationsInput,
  ListReservationsInput,
  ReservationByIdInput,
  ReservationFormDataInput,
} from "./schemas";
import {
  assertOperationalStaff,
  assertUserCanAccessBranch,
  resolveListBranchId,
} from "@/features/system/shared/staff-access";

import { getRequiredSession, type TRPCContext } from "./shared";
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
  remainingBalance:
    sql<number>`(${ReservationsTable.totalPrice} - ${ReservationsTable.discount} - ${ReservationsTable.totalPaid})`.mapWith(
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
  assertOperationalStaff(session.user.role);
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const whereClause = buildWhere({ ...input, branchId });
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
  assertOperationalStaff(session.user.role);
  const branchId = await resolveListBranchId(ctx, session, input.branchId);

  const rows = await reservationListQuery(ctx)
    .where(buildWhere({ ...input, branchId }))
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
  assertOperationalStaff(session.user.role);

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

  await assertUserCanAccessBranch(ctx, session, reservation.branchId);

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
  assertOperationalStaff(session.user.role);

  const scopedBranchId = await resolveListBranchId(
    ctx,
    session,
    input.branchId,
  );
  const dressConditions = [
    eq(DressesTable.isActive, true),
    isNull(DressesTable.deletedAt),
  ];
  if (scopedBranchId) {
    dressConditions.push(eq(DressesTable.branchId, scopedBranchId));
  }

  const [customers, dresses] = await Promise.all([
    ctx.db.query.RentalCustomersTable.findMany({
      where: scopedBranchId
        ? (customers, { eq }) => eq(customers.branchId, scopedBranchId)
        : undefined,
      orderBy: (customers, { asc }) => [asc(customers.name)],
      columns: {
        id: true,
        name: true,
        phone: true,
      },
    }),
    ctx.db
      .select({
        id: DressesTable.id,
        branchId: DressesTable.branchId,
        branchNameEn: BranchesTable.nameEn,
        branchNameAr: BranchesTable.nameAr,
        code: DressesTable.code,
        title: DressesTable.title,
        pricePerDay: DressesTable.pricePerDay,
        depositAmount: DressesTable.depositAmount,
        insurance: DressesTable.insurance,
        size: DressesTable.size,
        color: DressesTable.color,
      })
      .from(DressesTable)
      .innerJoin(BranchesTable, eq(DressesTable.branchId, BranchesTable.id))
      .where(and(...dressConditions))
      .orderBy(asc(DressesTable.title)),
  ]);

  return { customers, dresses };
}

/** Occasion-day blocks for a dress (legacy `getDressReservationsDates`). */
export async function getDressOccasionBlockedRanges(
  ctx: TRPCContext,
  input: DressOccasionBlockedRangesInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  const dress = await ctx.db.query.DressesTable.findFirst({
    where: and(eq(DressesTable.id, input.dressId), isNull(DressesTable.deletedAt)),
    columns: { branchId: true },
  });

  if (!dress) {
    return [];
  }

  await assertUserCanAccessBranch(ctx, session, dress.branchId);

  const branchId =
    session.user.role === "admin"
      ? (input.branchId ?? dress.branchId)
      : dress.branchId;

  const conditions = [
    eq(ReservationsTable.dressId, input.dressId),
    isNull(ReservationsTable.deletedAt),
    eq(ReservationsTable.branchId, branchId),
  ];
  if (input.excludeReservationId) {
    conditions.push(ne(ReservationsTable.id, input.excludeReservationId));
  }

  const reservations = await ctx.db.query.ReservationsTable.findMany({
    where: and(...conditions),
    columns: { occasionDate: true },
  });

  return reservations.map((reservation) => {
    const start = new Date(reservation.occasionDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(reservation.occasionDate);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  });
}
