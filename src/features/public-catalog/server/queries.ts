import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/drizzle";
import {
  BranchesTable,
  DressesTable,
  ReservationsTable,
  SettingsTable,
} from "@/drizzle/schema";
import {
  normalizePublicDressSort,
  type PublicDressSort,
} from "@/features/public-catalog/lib/public-dress-sort";
import { PUBLIC_BUSINESS_TIMEZONE } from "@/features/public-catalog/server/constants";
import {
  DEFAULT_BUSINESS_TIMEZONE,
  SYSTEM_SETTING_CODE,
} from "@/features/system/settings/lib/system-settings-registry";

export type PublicDressRow = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  images: string[] | null;
  size: string | null;
  color: string | null;
  pricePerDay: number;
  depositAmount: number;
  insurance: number;
  branchId: string;
  branchNameEn: string;
  branchNameAr: string;
  branchAddressEn: string | null;
  branchAddressAr: string | null;
  branchPhone: string | null;
  branchOpensAt: string | null;
  branchClosesAt: string | null;
  branchMapUrl: string | null;
};

/** When true, monetary amounts are shown on public catalog pages. */
export async function getPublicCatalogShowPrices(): Promise<boolean> {
  const row = await db.query.SettingsTable.findFirst({
    columns: { isActive: true },
    where: eq(SettingsTable.code, SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES),
  });
  if (!row || row.isActive === null) return true;
  return row.isActive === true;
}

export async function getPublicCatalogHidePrices(): Promise<boolean> {
  return !(await getPublicCatalogShowPrices());
}

/** Phone number for the WhatsApp button on public pages, or null if unset/inactive. */
export async function getPublicCatalogWhatsAppNumber(): Promise<string | null> {
  const row = await db.query.SettingsTable.findFirst({
    columns: { isActive: true, value: true },
    where: eq(SettingsTable.code, SYSTEM_SETTING_CODE.WHATSAPP_NUMBER),
  });
  if (!row || row.isActive !== true) return null;
  return row.value?.trim() || null;
}

/** When true, the date-availability calendar is shown on dress detail pages. */
export async function getPublicCatalogShowAvailabilityCalendar(): Promise<boolean> {
  const row = await db.query.SettingsTable.findFirst({
    columns: { isActive: true },
    where: eq(
      SettingsTable.code,
      SYSTEM_SETTING_CODE.SHOW_AVAILABILITY_CALENDAR,
    ),
  });
  if (!row || row.isActive === null) return true;
  return row.isActive === true;
}

export async function getBusinessTimezone(): Promise<string> {
  const row = await db.query.SettingsTable.findFirst({
    columns: { value: true, isActive: true },
    where: eq(SettingsTable.code, SYSTEM_SETTING_CODE.BUSINESS_TIMEZONE),
  });
  if (row?.isActive !== true) {
    return PUBLIC_BUSINESS_TIMEZONE;
  }
  const tz = row.value?.trim();
  return tz || DEFAULT_BUSINESS_TIMEZONE;
}

export type PublicBranchRow = {
  id: string;
  nameEn: string;
  nameAr: string;
  addressEn: string | null;
  addressAr: string | null;
  phone: string | null;
  opensAt: string | null;
  closesAt: string | null;
  mapUrl: string | null;
};

const dressPublicSelect = {
  id: DressesTable.id,
  code: DressesTable.code,
  title: DressesTable.title,
  description: DressesTable.description,
  images: DressesTable.images,
  size: DressesTable.size,
  color: DressesTable.color,
  pricePerDay: DressesTable.pricePerDay,
  depositAmount: DressesTable.depositAmount,
  insurance: DressesTable.insurance,
  branchId: DressesTable.branchId,
  branchNameEn: BranchesTable.nameEn,
  branchNameAr: BranchesTable.nameAr,
  branchAddressEn: BranchesTable.addressEn,
  branchAddressAr: BranchesTable.addressAr,
  branchPhone: BranchesTable.phone,
  branchOpensAt: BranchesTable.opensAt,
  branchClosesAt: BranchesTable.closesAt,
  branchMapUrl: BranchesTable.mapUrl,
} as const;

/** Same ranking as dashboard “top dresses”: rental count → revenue → timesRented → id.
 *  Column names match Drizzle migrations (quoted camelCase on `reservations`). */
const rentalStatsSubquery = sql`(SELECT "dressId", COUNT(*)::int AS rental_cnt, COALESCE(SUM("totalPaid"), 0) AS revenue FROM reservations WHERE "deletedAt" IS NULL GROUP BY "dressId") AS rental_stats`;

export type { PublicDressSort } from "@/features/public-catalog/lib/public-dress-sort";

export async function listFeaturedPublicDresses(
  limit: number,
): Promise<PublicDressRow[]> {
  const capped = Math.min(Math.max(limit, 1), 48);
  const ranked = await db
    .select({ id: DressesTable.id })
    .from(DressesTable)
    .leftJoin(
      ReservationsTable,
      and(
        eq(DressesTable.id, ReservationsTable.dressId),
        isNull(ReservationsTable.deletedAt),
      ),
    )
    .where(and(eq(DressesTable.isActive, true), isNull(DressesTable.deletedAt)))
    .groupBy(DressesTable.id)
    .orderBy(
      sql`COALESCE(COUNT(${ReservationsTable.id}), 0) DESC`,
      sql`COALESCE(SUM(${ReservationsTable.totalPaid}), 0) DESC`,
      sql`${DressesTable.timesRented} DESC`,
      sql`${DressesTable.id} ASC`,
    )
    .limit(capped);

  if (ranked.length === 0) return [];

  const ids = ranked.map((r) => r.id);
  const rows = await db
    .select(dressPublicSelect)
    .from(DressesTable)
    .innerJoin(BranchesTable, eq(DressesTable.branchId, BranchesTable.id))
    .where(
      and(
        inArray(DressesTable.id, ids),
        eq(DressesTable.isActive, true),
        isNull(DressesTable.deletedAt),
      ),
    );

  const byId = new Map(rows.map((r) => [r.id, r as PublicDressRow]));
  return ids
    .map((id) => byId.get(id))
    .filter((row): row is PublicDressRow => row != null);
}

export async function listPublicBranches(): Promise<PublicBranchRow[]> {
  return db
    .select({
      id: BranchesTable.id,
      nameEn: BranchesTable.nameEn,
      nameAr: BranchesTable.nameAr,
      addressEn: BranchesTable.addressEn,
      addressAr: BranchesTable.addressAr,
      phone: BranchesTable.phone,
      opensAt: BranchesTable.opensAt,
      closesAt: BranchesTable.closesAt,
      mapUrl: BranchesTable.mapUrl,
    })
    .from(BranchesTable)
    .orderBy(asc(BranchesTable.nameEn));
}

export async function listPublicDresses(input: {
  branchId?: string | null;
  search?: string | null;
  page: number;
  perPage: number;
  sort?: PublicDressSort | null;
}): Promise<{ rows: PublicDressRow[]; total: number; pageCount: number }> {
  const perPage = Math.min(Math.max(input.perPage, 1), 48);
  const page = Math.max(input.page, 1);

  const search = input.search?.trim();
  const searchCond =
    search && search.length > 0
      ? or(
          ilike(DressesTable.title, `%${search}%`),
          ilike(DressesTable.code, `%${search}%`),
        )
      : undefined;

  const conditions = [
    eq(DressesTable.isActive, true),
    isNull(DressesTable.deletedAt),
  ];
  if (input.branchId && input.branchId.length > 0) {
    conditions.push(eq(DressesTable.branchId, input.branchId));
  }
  if (searchCond) {
    conditions.push(searchCond);
  }
  const whereBase = and(...conditions);

  const [{ value: totalRaw }] = await db
    .select({ value: count() })
    .from(DressesTable)
    .where(whereBase);

  const total = Number(totalRaw);
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(page, pageCount);
  const offset = (safePage - 1) * perPage;

  const hidePrices = await getPublicCatalogHidePrices();
  const sort = normalizePublicDressSort(input.sort, { hidePrices });

  const orderByClause =
    sort === "popularity"
      ? [
          desc(sql`COALESCE(rental_stats.rental_cnt, 0)`),
          desc(sql`COALESCE(rental_stats.revenue, 0)`),
          desc(DressesTable.timesRented),
          asc(DressesTable.id),
        ]
      : sort === "priceAsc"
        ? [asc(DressesTable.pricePerDay), asc(DressesTable.id)]
        : sort === "priceDesc"
          ? [desc(DressesTable.pricePerDay), asc(DressesTable.id)]
          : sort === "newest"
            ? [desc(DressesTable.createdAt), asc(DressesTable.id)]
            : [asc(DressesTable.title), asc(DressesTable.id)];

  const rows =
    sort === "popularity"
      ? await db
          .select(dressPublicSelect)
          .from(DressesTable)
          .innerJoin(BranchesTable, eq(DressesTable.branchId, BranchesTable.id))
          .leftJoin(
            rentalStatsSubquery,
            sql`${DressesTable.id} = rental_stats."dressId"`,
          )
          .where(whereBase)
          .orderBy(...orderByClause)
          .limit(perPage)
          .offset(offset)
      : await db
          .select(dressPublicSelect)
          .from(DressesTable)
          .innerJoin(BranchesTable, eq(DressesTable.branchId, BranchesTable.id))
          .where(whereBase)
          .orderBy(...orderByClause)
          .limit(perPage)
          .offset(offset);

  return { rows: rows as PublicDressRow[], total, pageCount };
}

export async function getPublicDressById(
  id: string,
): Promise<PublicDressRow | null> {
  const [row] = await db
    .select(dressPublicSelect)
    .from(DressesTable)
    .innerJoin(BranchesTable, eq(DressesTable.branchId, BranchesTable.id))
    .where(
      and(
        eq(DressesTable.id, id),
        eq(DressesTable.isActive, true),
        isNull(DressesTable.deletedAt),
      ),
    )
    .limit(1);

  return row ? (row as PublicDressRow) : null;
}

/** Add N days to a YYYY-MM-DD string (UTC calendar math; scan-only helper). */
export function addDaysToCalendarDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export async function dressHasBlockingReservationOnCalendarDay(
  dressId: string,
  dateStr: string,
): Promise<boolean> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("Invalid calendar date");
  }

  const tz = await getBusinessTimezone();
  const dayStart = sql.raw(`('${dateStr}'::timestamp AT TIME ZONE '${tz}')`);
  const nextDayStart = sql.raw(
    `(('${dateStr}'::timestamp + interval '1 day') AT TIME ZONE '${tz}')`,
  );

  const [hit] = await db
    .select({ id: ReservationsTable.id })
    .from(ReservationsTable)
    .where(
      and(
        eq(ReservationsTable.dressId, dressId),
        isNull(ReservationsTable.deletedAt),
        inArray(ReservationsTable.status, ["reserved", "pickedUp"]),
        sql`${ReservationsTable.receivingDateTime} < ${nextDayStart}`,
        sql`${ReservationsTable.returnDateTime} >= ${dayStart}`,
      ),
    )
    .limit(1);

  return hit !== undefined;
}
