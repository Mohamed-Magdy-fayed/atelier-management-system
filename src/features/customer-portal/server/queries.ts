import { and, count, desc, eq, inArray, isNull, sql, sum } from "drizzle-orm";

import { db } from "@/drizzle";
import {
  BranchesTable,
  DressesTable,
  RentalCustomersTable,
  ReservationsTable,
  UsersTable,
} from "@/drizzle/schema";
import { normalizePhoneKey } from "@/lib/phone";

import { linkRentalCustomersToUser } from "./link-rental-customers";

export type CustomerReservationRow = {
  id: string;
  dressId: string;
  reservationCode: string;
  dressTitle: string;
  dressCode: string;
  dressImages: string[] | null;
  dressSize: string | null;
  dressColor: string | null;
  dressDescription: string | null;
  dressPricePerDay: number;
  dressDepositAmount: number;
  dressInsurance: number;
  branchNameEn: string;
  branchNameAr: string;
  branchPhone: string | null;
  branchAddressEn: string | null;
  branchAddressAr: string | null;
  branchMapUrl: string | null;
  occasionDate: Date;
  receivingDateTime: Date;
  returnDateTime: Date;
  status: string;
  totalPrice: number;
  insurance: number;
  discount: number;
  depositPaid: number;
  totalPaid: number;
  customerName: string;
  customerPhone: string | null;
  notes: string | null;
  customerPhotoUrl: string | null;
};

export type CustomerPortalStats = {
  totalReservations: number;
  activeReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  totalSpent: number;
  linkedByPhone: boolean;
};

function phoneMatchCondition(phoneKey: string) {
  return sql`regexp_replace(${RentalCustomersTable.phone}, '\\D', '', 'g') LIKE ${`%${phoneKey}`}`;
}

export async function getCustomerIdsForUser(userId: string, phoneKey: string) {
  await linkRentalCustomersToUser(userId);

  const idSet = new Set<string>();

  if (phoneKey) {
    const byPhone = await db
      .select({ id: RentalCustomersTable.id })
      .from(RentalCustomersTable)
      .where(phoneMatchCondition(phoneKey));
    for (const row of byPhone) {
      idSet.add(row.id);
    }
  }

  try {
    const byUserId = await db
      .select({ id: RentalCustomersTable.id })
      .from(RentalCustomersTable)
      .where(eq(RentalCustomersTable.userId, userId));
    for (const row of byUserId) {
      idSet.add(row.id);
    }
  } catch {
    // `userId` column missing until migration 0005 is applied
  }

  return [...idSet];
}

export async function getCustomerPortalData(userId: string) {
  const user = await db.query.UsersTable.findFirst({
    columns: { phone: true, email: true },
    where: eq(UsersTable.id, userId),
  });

  const phoneKey = normalizePhoneKey(user?.phone);
  const customerIds = await getCustomerIdsForUser(userId, phoneKey);

  if (customerIds.length === 0) {
    return {
      stats: {
        totalReservations: 0,
        activeReservations: 0,
        completedReservations: 0,
        cancelledReservations: 0,
        totalSpent: 0,
        linkedByPhone: Boolean(phoneKey),
      } satisfies CustomerPortalStats,
      reservations: [] as CustomerReservationRow[],
    };
  }

  const baseWhere = and(
    inArray(ReservationsTable.customerId, customerIds),
    isNull(ReservationsTable.deletedAt),
  );

  const [statsRow] = await db
    .select({
      total: count(),
      active:
        sql<number>`count(*) filter (where ${ReservationsTable.status} in ('reserved', 'pickedUp'))`.mapWith(
          Number,
        ),
      completed:
        sql<number>`count(*) filter (where ${ReservationsTable.status} = 'returned')`.mapWith(
          Number,
        ),
      cancelled:
        sql<number>`count(*) filter (where ${ReservationsTable.status} = 'cancelled')`.mapWith(
          Number,
        ),
      spent: sum(ReservationsTable.totalPaid),
    })
    .from(ReservationsTable)
    .where(baseWhere);

  const reservations = await db
    .select({
      id: ReservationsTable.id,
      dressId: ReservationsTable.dressId,
      reservationCode: ReservationsTable.reservationCode,
      dressTitle: DressesTable.title,
      dressCode: DressesTable.code,
      dressImages: DressesTable.images,
      dressSize: DressesTable.size,
      dressColor: DressesTable.color,
      dressDescription: DressesTable.description,
      dressPricePerDay: DressesTable.pricePerDay,
      dressDepositAmount: DressesTable.depositAmount,
      dressInsurance: DressesTable.insurance,
      branchNameEn: BranchesTable.nameEn,
      branchNameAr: BranchesTable.nameAr,
      branchPhone: BranchesTable.phone,
      branchAddressEn: BranchesTable.addressEn,
      branchAddressAr: BranchesTable.addressAr,
      branchMapUrl: BranchesTable.mapUrl,
      occasionDate: ReservationsTable.occasionDate,
      receivingDateTime: ReservationsTable.receivingDateTime,
      returnDateTime: ReservationsTable.returnDateTime,
      status: ReservationsTable.status,
      totalPrice: ReservationsTable.totalPrice,
      insurance: ReservationsTable.insurance,
      discount: ReservationsTable.discount,
      depositPaid: ReservationsTable.depositPaid,
      totalPaid: ReservationsTable.totalPaid,
      customerName: ReservationsTable.customerName,
      customerPhone: ReservationsTable.customerPhone,
      notes: ReservationsTable.notes,
      customerPhotoUrl: ReservationsTable.customerPhotoUrl,
    })
    .from(ReservationsTable)
    .innerJoin(DressesTable, eq(ReservationsTable.dressId, DressesTable.id))
    .innerJoin(BranchesTable, eq(ReservationsTable.branchId, BranchesTable.id))
    .where(baseWhere)
    .orderBy(desc(ReservationsTable.occasionDate))
    .limit(50);

  return {
    stats: {
      totalReservations: Number(statsRow?.total ?? 0),
      activeReservations: Number(statsRow?.active ?? 0),
      completedReservations: Number(statsRow?.completed ?? 0),
      cancelledReservations: Number(statsRow?.cancelled ?? 0),
      totalSpent: Number(statsRow?.spent ?? 0),
      linkedByPhone: Boolean(phoneKey),
    } satisfies CustomerPortalStats,
    reservations,
  };
}

export type ReservationReceiptData = {
  id: string;
  reservationCode: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  dressId: string;
  dressTitle: string;
  dressCode: string;
  branchNameEn: string;
  branchNameAr: string;
  branchPhone: string | null;
  branchAddressEn: string | null;
  branchAddressAr: string | null;
  receivingDateTime: Date;
  occasionDate: Date;
  returnDateTime: Date;
  totalPrice: number;
  insurance: number;
  discount: number;
  depositPaid: number;
  totalPaid: number;
  notes: string | null;
};

export async function getReservationReceipt(
  userId: string,
  reservationId: string,
): Promise<ReservationReceiptData | null> {
  const user = await db.query.UsersTable.findFirst({
    columns: { phone: true },
    where: eq(UsersTable.id, userId),
  });

  const phoneKey = normalizePhoneKey(user?.phone);
  const customerIds = await getCustomerIdsForUser(userId, phoneKey);

  if (customerIds.length === 0) return null;

  const [row] = await db
    .select({
      id: ReservationsTable.id,
      reservationCode: ReservationsTable.reservationCode,
      status: ReservationsTable.status,
      customerName: ReservationsTable.customerName,
      customerPhone: ReservationsTable.customerPhone,
      customerId: ReservationsTable.customerId,
      dressId: ReservationsTable.dressId,
      dressTitle: DressesTable.title,
      dressCode: DressesTable.code,
      branchNameEn: BranchesTable.nameEn,
      branchNameAr: BranchesTable.nameAr,
      branchPhone: BranchesTable.phone,
      branchAddressEn: BranchesTable.addressEn,
      branchAddressAr: BranchesTable.addressAr,
      receivingDateTime: ReservationsTable.receivingDateTime,
      occasionDate: ReservationsTable.occasionDate,
      returnDateTime: ReservationsTable.returnDateTime,
      totalPrice: ReservationsTable.totalPrice,
      insurance: ReservationsTable.insurance,
      discount: ReservationsTable.discount,
      depositPaid: ReservationsTable.depositPaid,
      totalPaid: ReservationsTable.totalPaid,
      notes: ReservationsTable.notes,
    })
    .from(ReservationsTable)
    .innerJoin(DressesTable, eq(ReservationsTable.dressId, DressesTable.id))
    .innerJoin(BranchesTable, eq(ReservationsTable.branchId, BranchesTable.id))
    .where(
      and(
        eq(ReservationsTable.id, reservationId),
        isNull(ReservationsTable.deletedAt),
      ),
    )
    .limit(1);

  if (!row || !customerIds.includes(row.customerId)) return null;

  const { customerId: _customerId, ...receipt } = row;
  return receipt;
}
