import { TRPCError } from "@trpc/server";
import { and, between, desc, eq, inArray, isNull, ne } from "drizzle-orm";

import {
  DressesTable,
  PaymentsTable,
  RentalCustomersTable,
  ReservationsTable,
} from "@/drizzle/schema";
import { rentalWindowsOverlap } from "@/lib/rental-availability";

import { generateReservationCode } from "../utils";
import type {
  ReservationBulkDeleteInput,
  ReservationBulkUpdateStatusInput,
  ReservationCollectPaymentInput,
  ReservationDeleteInput,
  ReservationGenerateCodeInput,
  ReservationMutationInput,
  ReservationUpdateInput,
  ReservationUpdateStatusInput,
} from "./schemas";
import {
  assertOperationalStaff,
  assertReservationIdsAccessible,
  assertUserCanAccessBranch,
} from "@/features/system/shared/staff-access";

import { getRequiredSession, type TRPCContext } from "./shared";

function normalizeReservationCode(code: string) {
  return code.trim().toUpperCase();
}

async function assertDressHasNoOverlappingReservation(
  ctx: TRPCContext,
  opts: {
    dressId: string;
    receivingDateTime: Date;
    returnDateTime: Date;
    excludeReservationId?: string;
  },
) {
  const overlapConditions = [
    eq(ReservationsTable.dressId, opts.dressId),
    isNull(ReservationsTable.deletedAt),
    inArray(ReservationsTable.status, ["reserved", "pickedUp"]),
  ];
  if (opts.excludeReservationId) {
    overlapConditions.push(ne(ReservationsTable.id, opts.excludeReservationId));
  }

  const blocking = await ctx.db.query.ReservationsTable.findMany({
    columns: {
      receivingDateTime: true,
      returnDateTime: true,
    },
    where: and(...overlapConditions),
  });

  for (const row of blocking) {
    if (
      rentalWindowsOverlap(
        opts.receivingDateTime,
        opts.returnDateTime,
        row.receivingDateTime,
        row.returnDateTime,
      )
    ) {
      throw new TRPCError({
        code: "CONFLICT",
        message: ctx.t("systemPages.reservationDressSlotOverlap"),
      });
    }
  }
}

async function ensureUniqueActiveReservationCode(
  ctx: TRPCContext,
  code: string,
  currentId?: string,
) {
  const existing = await ctx.db.query.ReservationsTable.findFirst({
    columns: { id: true },
    where: currentId
      ? and(
          eq(ReservationsTable.reservationCode, code),
          isNull(ReservationsTable.deletedAt),
          ne(ReservationsTable.id, currentId),
        )
      : and(
          eq(ReservationsTable.reservationCode, code),
          isNull(ReservationsTable.deletedAt),
        ),
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: ctx.t("systemPages.reservationCodeDuplicate"),
    });
  }
}

async function resolveCustomer(
  ctx: TRPCContext,
  input: {
    branchId: string;
    customerId?: string;
    customerName: string;
    customerPhone: string;
    notes?: string;
  },
) {
  if (input.customerId) {
    const existing = await ctx.db.query.RentalCustomersTable.findFirst({
      where: and(
        eq(RentalCustomersTable.id, input.customerId),
        eq(RentalCustomersTable.branchId, input.branchId),
      ),
    });
    if (!existing) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: ctx.t("systemPages.reservationInvalidCustomer"),
      });
    }
    return existing;
  }

  const phone = input.customerPhone.trim();
  const found = await ctx.db.query.RentalCustomersTable.findFirst({
    where: and(
      eq(RentalCustomersTable.branchId, input.branchId),
      eq(RentalCustomersTable.phone, phone),
    ),
  });
  if (found) return found;

  const [created] = await ctx.db
    .insert(RentalCustomersTable)
    .values({
      branchId: input.branchId,
      name: input.customerName.trim(),
      phone,
      note: input.notes?.trim() || null,
    })
    .returning();

  return created;
}

export async function generateReservationCodeForBranch(
  ctx: TRPCContext,
  input: ReservationGenerateCodeInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertUserCanAccessBranch(ctx, session, input.branchId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const latest = await ctx.db
    .select({ reservationCode: ReservationsTable.reservationCode })
    .from(ReservationsTable)
    .where(
      and(
        eq(ReservationsTable.branchId, input.branchId),
        between(ReservationsTable.createdAt, startOfDay, endOfDay),
      ),
    )
    .orderBy(desc(ReservationsTable.reservationCode))
    .limit(1)
    .then((rows) => rows[0]);

  const currentCount = latest?.reservationCode
    ? Number.parseInt(latest.reservationCode.split("-")[3] || "0", 10)
    : 0;

  return {
    reservationCode: generateReservationCode(currentCount, input.branchName),
  };
}

export async function createReservation(
  ctx: TRPCContext,
  input: ReservationMutationInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertUserCanAccessBranch(ctx, session, input.branchId);

  if (input.depositPaid < 100) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.reservationMinDeposit"),
    });
  }

  const dress = await ctx.db.query.DressesTable.findFirst({
    where: and(
      eq(DressesTable.id, input.dressId),
      eq(DressesTable.branchId, input.branchId),
      isNull(DressesTable.deletedAt),
    ),
  });

  if (!dress || !dress.isActive) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.reservationInvalidDress"),
    });
  }

  const customer = await resolveCustomer(ctx, input);
  const discount = Math.max(input.discount ?? 0, 0);
  const totalPrice = Math.max(dress.pricePerDay, 0);

  let reservationCode = input.reservationCode?.trim();
  if (!reservationCode) {
    const generated = await generateReservationCodeForBranch(ctx, {
      branchId: input.branchId,
      branchName: input.branchId,
    });
    reservationCode = generated.reservationCode;
  }

  reservationCode = normalizeReservationCode(reservationCode);
  await ensureUniqueActiveReservationCode(ctx, reservationCode);

  const snapshotName = input.customerName.trim() || customer.name;
  const snapshotPhone = input.customerPhone.trim() || customer.phone;

  await assertDressHasNoOverlappingReservation(ctx, {
    dressId: dress.id,
    receivingDateTime: input.receivingDateTime,
    returnDateTime: input.returnDateTime,
  });

  const [row] = await ctx.db
    .insert(ReservationsTable)
    .values({
      branchId: input.branchId,
      dressId: dress.id,
      customerId: customer.id,
      reservationCode,
      customerName: snapshotName,
      customerPhone: snapshotPhone,
      receivingDateTime: input.receivingDateTime,
      occasionDate: input.occasionDate,
      returnDateTime: input.returnDateTime,
      totalPrice,
      insurance: dress.insurance,
      discount,
      depositPaid: input.depositPaid,
      totalPaid: input.depositPaid,
      status: input.status,
      notes: input.notes?.trim() || null,
      createdBy: session.user.id,
    })
    .returning({ id: ReservationsTable.id });

  await ctx.db.insert(PaymentsTable).values({
    branchId: input.branchId,
    amount: input.depositPaid,
    method: input.paymentMethod,
    customerId: customer.id,
    reservationId: row.id,
    type: "deposit",
    createdBy: session.user.id,
  });

  return { reservationId: row.id };
}

export async function updateReservation(
  ctx: TRPCContext,
  input: ReservationUpdateInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  const existing = await ctx.db.query.ReservationsTable.findFirst({
    columns: { id: true, status: true, branchId: true },
    where: and(
      eq(ReservationsTable.id, input.id),
      isNull(ReservationsTable.deletedAt),
    ),
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.reservationNotFound"),
    });
  }

  await assertUserCanAccessBranch(ctx, session, existing.branchId);
  await assertUserCanAccessBranch(ctx, session, input.branchId);
  if (
    session.user.role === "employee" &&
    input.branchId !== existing.branchId
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Employees cannot move reservations to another branch",
    });
  }

  if (existing.status !== "reserved") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.reservationEditReservedOnly"),
    });
  }

  const reservationCode = normalizeReservationCode(input.reservationCode);
  await ensureUniqueActiveReservationCode(ctx, reservationCode, input.id);

  await assertDressHasNoOverlappingReservation(ctx, {
    dressId: input.dressId,
    receivingDateTime: input.receivingDateTime,
    returnDateTime: input.returnDateTime,
    excludeReservationId: input.id,
  });

  const phone = input.customerPhone?.trim();

  await ctx.db
    .update(ReservationsTable)
    .set({
      branchId: input.branchId,
      dressId: input.dressId,
      customerId: input.customerId,
      reservationCode,
      customerName: input.customerName.trim(),
      customerPhone: phone || null,
      receivingDateTime: input.receivingDateTime,
      occasionDate: input.occasionDate,
      returnDateTime: input.returnDateTime,
      totalPrice: input.totalPrice,
      discount: input.discount ?? 0,
      depositPaid: input.depositPaid,
      status: input.status,
      notes: input.notes?.trim() || null,
      updatedBy: session.user.id,
    })
    .where(eq(ReservationsTable.id, input.id));

  return { updated: true };
}

export async function updateReservationStatus(
  ctx: TRPCContext,
  input: ReservationUpdateStatusInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  const existing = await ctx.db.query.ReservationsTable.findFirst({
    columns: { id: true, branchId: true },
    where: and(
      eq(ReservationsTable.id, input.id),
      isNull(ReservationsTable.deletedAt),
    ),
  });

  if (!existing) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.reservationNotFound"),
    });
  }

  await assertUserCanAccessBranch(ctx, session, existing.branchId);

  await ctx.db
    .update(ReservationsTable)
    .set({
      status: input.status,
      updatedBy: session.user.id,
    })
    .where(eq(ReservationsTable.id, input.id));

  return { updated: true };
}

export async function collectReservationPayment(
  ctx: TRPCContext,
  input: ReservationCollectPaymentInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  const reservation = await ctx.db.query.ReservationsTable.findFirst({
    where: and(
      eq(ReservationsTable.id, input.reservationId),
      isNull(ReservationsTable.deletedAt),
    ),
  });

  if (!reservation) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.reservationNotFound"),
    });
  }

  await assertUserCanAccessBranch(ctx, session, reservation.branchId);

  const outstanding =
    reservation.totalPrice - reservation.discount - reservation.totalPaid;

  if (input.amount > outstanding) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ctx.t("systemPages.reservationPaymentExceedsBalance"),
    });
  }

  await ctx.db.insert(PaymentsTable).values({
    branchId: reservation.branchId,
    customerId: reservation.customerId,
    method: input.paymentMethod,
    amount: input.amount,
    reservationId: reservation.id,
    type: "finalPayment",
    note: input.note?.trim() || null,
    createdBy: session.user.id,
  });

  await ctx.db
    .update(ReservationsTable)
    .set({
      totalPaid: reservation.totalPaid + input.amount,
      updatedBy: session.user.id,
    })
    .where(eq(ReservationsTable.id, reservation.id));

  return { collected: true };
}

export async function deleteReservation(
  ctx: TRPCContext,
  input: ReservationDeleteInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  if (session.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: ctx.t("systemPages.reservationDeleteAdminOnly"),
    });
  }

  const reservation = await ctx.db.query.ReservationsTable.findFirst({
    columns: { id: true },
    where: and(
      eq(ReservationsTable.id, input.id),
      isNull(ReservationsTable.deletedAt),
    ),
  });

  if (!reservation) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: ctx.t("systemPages.reservationNotFound"),
    });
  }

  await ctx.db
    .update(ReservationsTable)
    .set({
      deletedAt: new Date(),
      deletedBy: session.user.id,
      updatedBy: session.user.id,
    })
    .where(eq(ReservationsTable.id, input.id));

  return { deleted: true };
}

export async function bulkUpdateReservationStatus(
  ctx: TRPCContext,
  input: ReservationBulkUpdateStatusInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);
  await assertReservationIdsAccessible(ctx, session, input.ids);

  await ctx.db
    .update(ReservationsTable)
    .set({
      status: input.status,
      updatedBy: session.user.id,
    })
    .where(
      and(
        inArray(ReservationsTable.id, input.ids),
        isNull(ReservationsTable.deletedAt),
      ),
    );

  return { updated: input.ids.length };
}

export async function bulkDeleteReservations(
  ctx: TRPCContext,
  input: ReservationBulkDeleteInput,
) {
  const session = getRequiredSession(ctx);
  assertOperationalStaff(session.user.role);

  if (session.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: ctx.t("systemPages.reservationDeleteAdminOnly"),
    });
  }

  await ctx.db
    .update(ReservationsTable)
    .set({
      deletedAt: new Date(),
      deletedBy: session.user.id,
      updatedBy: session.user.id,
    })
    .where(
      and(
        inArray(ReservationsTable.id, input.ids),
        isNull(ReservationsTable.deletedAt),
      ),
    );

  return { deleted: input.ids.length };
}
