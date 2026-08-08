import { mapLegacySettingRow } from "@/features/system/settings/lib/legacy-setting-map";
import { rentalCustomerPhoneKey } from "@/lib/phone";

import {
  LEGACY_BRANCH_PLACEHOLDERS,
  resolveLegacyBranchShortCode,
} from "./branch-legacy";
import { MIGRATION_ACTOR } from "./config";
import type { MigrationSql } from "./connections";
import { markStepCompleted } from "./state";
import {
  countLegacy,
  countTarget,
  logStep,
  type MigrationContext,
  pickLegacy,
  sqlNullable,
} from "./utils";

export type MigrationStep = {
  id: string;
  description: string;
  run: (ctx: MigrationContext) => Promise<void>;
};

async function resolveDefaultBranchId(target: MigrationSql): Promise<string> {
  const rows = await target<{ id: string }[]>`
    SELECT id::text AS id FROM branches ORDER BY "createdAt" ASC LIMIT 1
  `;
  if (!rows[0]?.id) {
    throw new Error(
      "No branches in target DB. Run branches step first or seed a branch.",
    );
  }
  return rows[0].id;
}

/**
 * legacy `customers.id` → target `rental_customers.id`.
 *
 * The customers step merges legacy per-branch rows into one tenant-wide row per
 * phone, so a legacy id can point at a row that was never inserted. Resolving
 * through the phone key is also resume-safe: it re-derives the mapping from the
 * database instead of relying on state carried inside a single run.
 */
async function resolveTargetCustomerIdsByLegacyId(
  legacy: MigrationSql,
  target: MigrationSql,
): Promise<Map<string, string>> {
  const legacyCustomers = await legacy<
    { id: string; phone: string }[]
  >`SELECT id::text AS id, phone FROM customers`;
  const targetCustomers = await target<
    { id: string; phone: string }[]
  >`SELECT id::text AS id, phone FROM rental_customers`;

  const targetByPhoneKey = new Map<string, string>();
  for (const row of targetCustomers) {
    const key = rentalCustomerPhoneKey(row.phone);
    if (key) targetByPhoneKey.set(key, row.id);
  }

  const byLegacyId = new Map<string, string>();
  for (const row of legacyCustomers) {
    const targetId = targetByPhoneKey.get(rentalCustomerPhoneKey(row.phone));
    if (targetId) byLegacyId.set(row.id, targetId);
  }

  return byLegacyId;
}

export const migrationSteps: MigrationStep[] = [
  {
    id: "branches",
    description:
      "branches → branches (code → shortCode, name → nameEn/nameAr, contact/hours placeholders)",
    run: async ({ legacy, target, dryRun }) => {
      const step = "branches";
      const legacyCount = await countLegacy(legacy, "branches");
      logStep(step, `legacy rows: ${legacyCount}`);

      const legacyRows = await legacy<
        {
          id: string;
          name: string;
          code: string;
          createdAt: Date;
          updatedAt: Date | null;
        }[]
      >`
        SELECT id, name, code, "createdAt", "updatedAt" FROM branches
      `;

      if (!dryRun) {
        const usedShortCodes = new Set<string>();
        const { addressEn, addressAr, phone, opensAt, closesAt, mapUrl } =
          LEGACY_BRANCH_PLACEHOLDERS;

        for (const row of legacyRows) {
          const nameEn = row.name.slice(0, 128);
          const nameAr = (row.name.trim() || row.code).slice(0, 128);
          const shortCode = resolveLegacyBranchShortCode({
            legacyCode: row.code,
            legacyName: row.name,
            branchId: row.id,
            usedCodes: usedShortCodes,
          });

          await target`
            INSERT INTO branches (
              id,
              "shortCode",
              "nameEn",
              "nameAr",
              "addressEn",
              "addressAr",
              phone,
              "opensAt",
              "closesAt",
              "mapUrl",
              "ownerId",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${row.id}::uuid,
              ${shortCode},
              ${nameEn},
              ${nameAr},
              ${addressEn},
              ${addressAr},
              ${phone},
              ${opensAt}::time,
              ${closesAt}::time,
              ${sqlNullable(mapUrl)},
              NULL,
              ${row.createdAt},
              ${row.updatedAt}
            )
            ON CONFLICT (id) DO UPDATE SET
              "shortCode" = EXCLUDED."shortCode",
              "nameEn" = EXCLUDED."nameEn",
              "nameAr" = EXCLUDED."nameAr",
              "addressEn" = EXCLUDED."addressEn",
              "addressAr" = EXCLUDED."addressAr",
              phone = EXCLUDED.phone,
              "opensAt" = EXCLUDED."opensAt",
              "closesAt" = EXCLUDED."closesAt",
              "mapUrl" = EXCLUDED."mapUrl",
              "updatedAt" = EXCLUDED."updatedAt"
          `;
        }
      }

      const targetCount = dryRun
        ? legacyCount
        : await countTarget(target, "branches");
      await markStepCompleted(
        target,
        step,
        { legacyCount, targetCount },
        dryRun,
      );
      logStep(step, `done → target rows: ${targetCount}`, { dryRun });
    },
  },
  {
    id: "users",
    description: "users → users (role admin/user → admin/employee)",
    run: async ({ legacy, target, dryRun }) => {
      const step = "users";
      const legacyCount = await countLegacy(legacy, "users");
      logStep(step, `legacy rows: ${legacyCount}`);

      const legacyRows = await legacy<
        {
          id: string;
          name: string;
          email: string;
          emailVerified: Date | null;
          phone: string | null;
          imageUrl: string | null;
          role: "admin" | "user";
          branchId: string | null;
          createdAt: Date;
          createdBy: string;
          updatedAt: Date | null;
          updatedBy: string | null;
          deletedAt: Date | null;
          deletedBy: string | null;
          password: string | null;
          salt: string | null;
        }[]
      >`
        SELECT
          id, name, email, "emailVerified", phone, "imageUrl", role::text AS role,
          "branchId", "createdAt", "createdBy", "updatedAt", "updatedBy",
          "deletedAt", "deletedBy", password, salt
        FROM users
      `;

      if (!dryRun) {
        for (const row of legacyRows) {
          const role =
            row.role === "admin" ? ("admin" as const) : ("employee" as const);
          const createdBy =
            row.createdBy?.trim() && row.createdBy.length <= 64
              ? row.createdBy.slice(0, 64)
              : MIGRATION_ACTOR;

          await target`
            INSERT INTO users (
              id, email, name, phone, "imageUrl", role,
              "emailVerifiedAt", "createdAt", "createdBy", "updatedAt", "updatedBy",
              "deletedAt", "deletedBy"
            )
            VALUES (
              ${row.id}::uuid,
              ${row.email.trim().toLowerCase().slice(0, 256)},
              ${row.name.slice(0, 256)},
              ${row.phone ? row.phone.slice(0, 16) : null},
              ${row.imageUrl ? row.imageUrl.slice(0, 512) : null},
              ${role},
              ${row.emailVerified},
              ${row.createdAt},
              ${createdBy},
              ${row.updatedAt},
              ${row.updatedBy ? row.updatedBy.slice(0, 64) : null},
              ${row.deletedAt},
              ${row.deletedBy ? row.deletedBy.slice(0, 64) : null}
            )
            ON CONFLICT (id) DO UPDATE SET
              email = EXCLUDED.email,
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              "imageUrl" = EXCLUDED."imageUrl",
              role = EXCLUDED.role,
              "emailVerifiedAt" = EXCLUDED."emailVerifiedAt",
              "updatedAt" = EXCLUDED."updatedAt",
              "updatedBy" = EXCLUDED."updatedBy",
              "deletedAt" = EXCLUDED."deletedAt",
              "deletedBy" = EXCLUDED."deletedBy"
          `;
        }
      }

      const targetCount = dryRun
        ? legacyCount
        : await countTarget(target, "users");
      await markStepCompleted(
        target,
        step,
        { legacyCount, targetCount },
        dryRun,
      );
      logStep(step, `done → target rows: ${targetCount}`, { dryRun });
    },
  },
  {
    id: "user_credentials",
    description:
      "users.password/salt → user_credentials (scrypt hash copied as-is)",
    run: async ({ legacy, target, dryRun }) => {
      const step = "user_credentials";
      const legacyRows = await legacy<
        {
          id: string;
          password: string | null;
          salt: string | null;
          createdAt: Date;
        }[]
      >`
        SELECT id, password, salt, "createdAt"
        FROM users
        WHERE password IS NOT NULL AND salt IS NOT NULL
          AND LENGTH(TRIM(password)) > 0 AND LENGTH(TRIM(salt)) > 0
      `;
      const legacyCount = legacyRows.length;
      logStep(step, `legacy credential rows: ${legacyCount}`);

      if (!dryRun) {
        for (const row of legacyRows) {
          await target`
            INSERT INTO user_credentials (
              "userId", "passwordHash", "passwordSalt",
              "mustChangePassword", "lastChangedAt", "createdAt", "updatedAt"
            )
            VALUES (
              ${row.id}::uuid,
              ${row.password!},
              ${row.salt!},
              false,
              ${row.createdAt},
              ${row.createdAt},
              ${row.createdAt}
            )
            ON CONFLICT ("userId") DO UPDATE SET
              "passwordHash" = EXCLUDED."passwordHash",
              "passwordSalt" = EXCLUDED."passwordSalt",
              "updatedAt" = now()
          `;
        }
      }

      const targetCount = dryRun
        ? legacyCount
        : await countTarget(target, "user_credentials");
      await markStepCompleted(
        target,
        step,
        { legacyCount, targetCount },
        dryRun,
      );
      logStep(step, `done → target rows: ${targetCount}`, { dryRun });
    },
  },
  {
    id: "branch_memberships",
    description: "users.branchId → branch_memberships",
    run: async ({ legacy, target, dryRun }) => {
      const step = "branch_memberships";
      const defaultBranchId = dryRun
        ? null
        : await resolveDefaultBranchId(target);

      const legacyRows = await legacy<
        { userId: string; branchId: string | null }[]
      >`
        SELECT id AS "userId", "branchId" FROM users WHERE "branchId" IS NOT NULL
      `;

      const validBranchIds = new Set(
        (await legacy<{ id: string }[]>`SELECT id FROM branches`).map(
          (r) => r.id,
        ),
      );

      let inserted = 0;
      if (!dryRun && defaultBranchId) {
        for (const row of legacyRows) {
          const branchId =
            row.branchId && validBranchIds.has(row.branchId)
              ? row.branchId
              : defaultBranchId;

          await target`
            INSERT INTO branch_memberships ("branchId", "userId", "isCurrent", "createdAt", "updatedAt")
            VALUES (
              ${branchId}::uuid,
              ${row.userId}::uuid,
              true,
              now(),
              now()
            )
            ON CONFLICT ("branchId", "userId") DO UPDATE SET
              "isCurrent" = EXCLUDED."isCurrent",
              "updatedAt" = now()
          `;
          inserted++;
        }

        // Set branch owners: first admin per branch
        await target.unsafe(`
          UPDATE branches b
          SET "ownerId" = sub.admin_id
          FROM (
            SELECT DISTINCT ON (bm."branchId")
              bm."branchId",
              bm."userId" AS admin_id
            FROM branch_memberships bm
            INNER JOIN users u ON u.id = bm."userId"
            WHERE u.role = 'admin'
            ORDER BY bm."branchId", bm."createdAt" ASC
          ) sub
          WHERE b.id = sub."branchId" AND b."ownerId" IS NULL
        `);
      }

      const legacyCount = legacyRows.length;
      const targetCount = dryRun
        ? legacyCount
        : await countTarget(target, "branch_memberships");
      await markStepCompleted(
        target,
        step,
        { legacyCount, targetCount, notes: `memberships ${inserted}` },
        dryRun,
      );
      logStep(step, `done → target rows: ${targetCount}`, { dryRun });
    },
  },
  {
    id: "dresses",
    description: "dresses → dresses",
    run: async ({ legacy, target, dryRun }) => {
      const step = "dresses";
      const legacyCount = await countLegacy(legacy, "dresses");
      const defaultBranchId = dryRun
        ? null
        : await resolveDefaultBranchId(target);
      const validBranchIds = new Set(
        (await legacy<{ id: string }[]>`SELECT id FROM branches`).map(
          (r) => r.id,
        ),
      );

      const legacyRows = await legacy<
        Record<string, unknown>[]
      >`SELECT * FROM dresses`;

      if (!dryRun && defaultBranchId) {
        for (const raw of legacyRows) {
          const id = pickLegacy<string>(raw, "id");
          if (!id) continue;

          const legacyBranchId = pickLegacy<string | null>(raw, "branchId");
          const code =
            pickLegacy<string>(raw, "code")?.trim() ||
            `DRS-${id.replace(/-/g, "").slice(0, 12)}`;
          const title =
            pickLegacy<string>(raw, "title")?.trim() ||
            pickLegacy<string>(raw, "code")?.trim() ||
            `Dress ${id.slice(0, 8)}`;

          const branchId =
            legacyBranchId && validBranchIds.has(legacyBranchId)
              ? legacyBranchId
              : defaultBranchId;

          const legacyCreatedBy = pickLegacy<string>(raw, "createdBy");
          const createdBy =
            legacyCreatedBy?.trim() && legacyCreatedBy.length <= 64
              ? legacyCreatedBy.slice(0, 64)
              : MIGRATION_ACTOR;

          const legacyUpdatedBy = pickLegacy<string | null>(raw, "updatedBy");
          const legacyDeletedBy = pickLegacy<string | null>(raw, "deletedBy");

          await target`
            INSERT INTO dresses (
              id, "branchId", code, title, description, images, size, color,
              "pricePerDay", "depositAmount", insurance, "timesRented", "isActive",
              "createdBy", "createdAt", "updatedBy", "updatedAt", "deletedBy", "deletedAt"
            )
            VALUES (
              ${id}::uuid,
              ${branchId}::uuid,
              ${code},
              ${title},
              ${sqlNullable(pickLegacy<string | null>(raw, "description"))},
              ${sqlNullable(pickLegacy<string[] | null>(raw, "images"))},
              ${sqlNullable(pickLegacy<string | null>(raw, "size"))},
              ${sqlNullable(pickLegacy<string | null>(raw, "color"))},
              ${pickLegacy<number>(raw, "pricePerDay") ?? 0},
              ${pickLegacy<number>(raw, "depositAmount") ?? 0},
              ${pickLegacy<number>(raw, "insurance") ?? 0},
              ${pickLegacy<number | null>(raw, "timesRented") ?? 0},
              ${pickLegacy<boolean | null>(raw, "isActive") ?? true},
              ${createdBy},
              ${pickLegacy<Date>(raw, "createdAt") ?? new Date()},
              ${sqlNullable(legacyUpdatedBy ? legacyUpdatedBy.slice(0, 64) : null)},
              ${sqlNullable(pickLegacy<Date | null>(raw, "updatedAt"))},
              ${sqlNullable(legacyDeletedBy ? legacyDeletedBy.slice(0, 64) : null)},
              ${sqlNullable(pickLegacy<Date | null>(raw, "deletedAt"))}
            )
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              "pricePerDay" = EXCLUDED."pricePerDay",
              "isActive" = EXCLUDED."isActive",
              "updatedAt" = EXCLUDED."updatedAt"
          `;
        }
      }

      const targetCount = dryRun
        ? legacyCount
        : await countTarget(target, "dresses");
      await markStepCompleted(
        target,
        step,
        { legacyCount, targetCount },
        dryRun,
      );
      logStep(step, `done → target rows: ${targetCount}`, { dryRun });
    },
  },
  {
    id: "rental_customers",
    description:
      "customers → rental_customers (branch-scoped rows merged by phone)",
    run: async ({ legacy, target, dryRun }) => {
      const step = "rental_customers";
      const legacyCount = await countLegacy(legacy, "customers");

      // Legacy customers were unique per (branch, phone); target customers are
      // tenant-wide and unique per phone. One person who walked into two
      // branches is two legacy rows and must become one target row, so rows are
      // merged on the normalized phone key and the earliest row wins the id.
      // `reservations`/`payments` resolve their customer through the same key
      // (see resolveTargetCustomerIdsByLegacyId) rather than the legacy id, so
      // dropping a duplicate id here does not orphan them.
      const legacyRows = await legacy<
        {
          id: string;
          name: string;
          phone: string;
          reservationsCount: number;
          note: string | null;
          lastReservationAt: Date | null;
          createdAt: Date;
        }[]
      >`SELECT * FROM customers ORDER BY "createdAt" ASC, id ASC`;

      const merged = new Map<string, (typeof legacyRows)[number]>();
      let duplicates = 0;
      for (const row of legacyRows) {
        const key = rentalCustomerPhoneKey(row.phone) || `id:${row.id}`;
        const existing = merged.get(key);
        if (!existing) {
          merged.set(key, { ...row });
          continue;
        }
        duplicates += 1;
        existing.reservationsCount += row.reservationsCount;
        existing.note = existing.note ?? row.note;
        if (
          row.lastReservationAt &&
          (!existing.lastReservationAt ||
            row.lastReservationAt > existing.lastReservationAt)
        ) {
          existing.lastReservationAt = row.lastReservationAt;
        }
      }

      logStep(
        step,
        `legacy rows: ${legacyCount} → ${merged.size} customers (${duplicates} cross-branch duplicates merged)`,
      );

      if (!dryRun) {
        for (const row of merged.values()) {
          await target`
            INSERT INTO rental_customers (
              id, name, phone, "reservationsCount", note,
              "lastReservationAt", "createdAt"
            )
            VALUES (
              ${row.id}::uuid,
              ${row.name},
              ${row.phone},
              ${row.reservationsCount},
              ${sqlNullable(row.note)},
              ${sqlNullable(row.lastReservationAt)},
              ${row.createdAt}
            )
            ON CONFLICT (phone) DO UPDATE SET
              name = EXCLUDED.name,
              "reservationsCount" = EXCLUDED."reservationsCount",
              note = EXCLUDED.note,
              "lastReservationAt" = EXCLUDED."lastReservationAt"
          `;
        }
      }

      const targetCount = dryRun
        ? merged.size
        : await countTarget(target, "rental_customers");
      await markStepCompleted(
        target,
        step,
        { legacyCount, targetCount },
        dryRun,
      );
      logStep(step, `done → target rows: ${targetCount}`, { dryRun });
    },
  },
  {
    id: "reservations",
    description:
      "reservations → reservations (recievingDateTime → receivingDateTime)",
    run: async ({ legacy, target, dryRun }) => {
      const step = "reservations";
      const legacyCount = await countLegacy(legacy, "reservations");
      const defaultBranchId = dryRun
        ? null
        : await resolveDefaultBranchId(target);
      const validBranchIds = new Set(
        (await legacy<{ id: string }[]>`SELECT id FROM branches`).map(
          (r) => r.id,
        ),
      );
      const customerIdByLegacyId = dryRun
        ? new Map<string, string>()
        : await resolveTargetCustomerIdsByLegacyId(legacy, target);

      const legacyRows = await legacy<
        {
          id: string;
          branchId: string | null;
          dressId: string;
          customerId: string;
          reservationCode: string;
          customerName: string;
          customerPhone: string | null;
          recievingDateTime: Date;
          occasionDate: Date;
          returnDateTime: Date;
          totalPrice: number;
          insurance: number | null;
          discount: number | null;
          depositPaid: number | null;
          totalPaid: number | null;
          status: string;
          notes: string | null;
          createdBy: string;
          createdAt: Date;
          updatedAt: Date | null;
          updatedBy: string | null;
          deletedAt: Date | null;
          deletedBy: string | null;
        }[]
      >`SELECT * FROM reservations`;

      if (!dryRun && defaultBranchId) {
        for (const row of legacyRows) {
          const branchId =
            row.branchId && validBranchIds.has(row.branchId)
              ? row.branchId
              : defaultBranchId;
          const createdBy =
            row.createdBy?.trim() && row.createdBy.length <= 64
              ? row.createdBy.slice(0, 64)
              : MIGRATION_ACTOR;
          const customerId =
            customerIdByLegacyId.get(row.customerId) ?? row.customerId;

          await target`
            INSERT INTO reservations (
              id, "branchId", "dressId", "customerId", "reservationCode",
              "customerName", "customerPhone", "receivingDateTime", "occasionDate",
              "returnDateTime", "totalPrice", insurance, discount, "depositPaid",
              "totalPaid", status, notes,
              "createdBy", "createdAt", "updatedBy", "updatedAt", "deletedBy", "deletedAt"
            )
            VALUES (
              ${row.id}::uuid,
              ${branchId}::uuid,
              ${row.dressId}::uuid,
              ${customerId}::uuid,
              ${row.reservationCode},
              ${row.customerName},
              ${sqlNullable(row.customerPhone)},
              ${row.recievingDateTime},
              ${row.occasionDate},
              ${row.returnDateTime},
              ${row.totalPrice},
              ${row.insurance ?? 0},
              ${row.discount ?? 0},
              ${row.depositPaid ?? 0},
              ${row.totalPaid ?? 0},
              ${row.status}::reservation_status,
              ${sqlNullable(row.notes)},
              ${createdBy},
              ${row.createdAt},
              ${sqlNullable(row.updatedBy ? row.updatedBy.slice(0, 64) : null)},
              ${sqlNullable(row.updatedAt)},
              ${sqlNullable(row.deletedBy ? row.deletedBy.slice(0, 64) : null)},
              ${sqlNullable(row.deletedAt)}
            )
            ON CONFLICT (id) DO UPDATE SET
              status = EXCLUDED.status,
              "totalPaid" = EXCLUDED."totalPaid",
              "updatedAt" = EXCLUDED."updatedAt"
          `;
        }
      }

      const targetCount = dryRun
        ? legacyCount
        : await countTarget(target, "reservations");
      await markStepCompleted(
        target,
        step,
        { legacyCount, targetCount },
        dryRun,
      );
      logStep(step, `done → target rows: ${targetCount}`, { dryRun });
    },
  },
  {
    id: "payments",
    description: "payments → payments",
    run: async ({ legacy, target, dryRun }) => {
      const step = "payments";
      const legacyCount = await countLegacy(legacy, "payments");
      const defaultBranchId = dryRun
        ? null
        : await resolveDefaultBranchId(target);
      const validBranchIds = new Set(
        (await legacy<{ id: string }[]>`SELECT id FROM branches`).map(
          (r) => r.id,
        ),
      );
      const customerIdByLegacyId = dryRun
        ? new Map<string, string>()
        : await resolveTargetCustomerIdsByLegacyId(legacy, target);

      const legacyRows = await legacy<
        {
          id: string;
          branchId: string | null;
          reservationId: string;
          customerId: string;
          amount: number;
          type: string;
          method: string;
          note: string | null;
          createdBy: string;
          createdAt: Date;
        }[]
      >`SELECT * FROM payments`;

      if (!dryRun && defaultBranchId) {
        for (const row of legacyRows) {
          const branchId =
            row.branchId && validBranchIds.has(row.branchId)
              ? row.branchId
              : defaultBranchId;
          const createdBy =
            row.createdBy?.trim() && row.createdBy.length <= 64
              ? row.createdBy.slice(0, 64)
              : MIGRATION_ACTOR;

          const customerId =
            customerIdByLegacyId.get(row.customerId) ?? row.customerId;

          await target`
            INSERT INTO payments (
              id, "branchId", "reservationId", "customerId", amount, type, method, note,
              "createdBy", "createdAt"
            )
            VALUES (
              ${row.id}::uuid,
              ${branchId}::uuid,
              ${row.reservationId}::uuid,
              ${customerId}::uuid,
              ${row.amount},
              ${row.type}::payment_type,
              ${row.method}::payment_method,
              ${sqlNullable(row.note)},
              ${createdBy},
              ${row.createdAt}
            )
            ON CONFLICT (id) DO UPDATE SET
              amount = EXCLUDED.amount,
              note = EXCLUDED.note
          `;
        }
      }

      const targetCount = dryRun
        ? legacyCount
        : await countTarget(target, "payments");
      await markStepCompleted(
        target,
        step,
        { legacyCount, targetCount },
        dryRun,
      );
      logStep(step, `done → target rows: ${targetCount}`, { dryRun });
    },
  },
  {
    id: "settings",
    description: "settings → settings",
    run: async ({ legacy, target, dryRun }) => {
      const step = "settings";
      const legacyCount = await countLegacy(legacy, "settings");
      const legacyRows = await legacy<
        {
          id: string;
          code: string;
          label: string;
          description: string | null;
          isActive: boolean | null;
          value: string | null;
          amount: number | null;
          createdBy: string;
          createdAt: Date;
          updatedBy: string | null;
          updatedAt: Date | null;
        }[]
      >`SELECT * FROM settings`;

      if (!dryRun) {
        const mergedByCode = new Map<
          string,
          {
            id: string;
            code: string;
            label: string;
            description: string | null;
            isActive: boolean | null;
            value: string | null;
            amount: number | null;
            createdBy: string;
            createdAt: Date;
            updatedBy: string | null;
            updatedAt: Date | null;
          }
        >();

        for (const row of legacyRows) {
          const mapped = mapLegacySettingRow({
            code: row.code,
            label: row.label,
            description: row.description,
            isActive: row.isActive,
            value: row.value,
            amount: row.amount,
          });
          if (!mapped) continue;

          const createdBy =
            row.createdBy?.trim() && row.createdBy.length <= 64
              ? row.createdBy.slice(0, 64)
              : MIGRATION_ACTOR;

          mergedByCode.set(mapped.code, {
            id: row.id,
            code: mapped.code,
            label: mapped.label,
            description: mapped.description,
            isActive: mapped.isActive,
            value: mapped.value,
            amount: mapped.amount,
            createdBy,
            createdAt: row.createdAt,
            updatedBy: row.updatedBy,
            updatedAt: row.updatedAt,
          });
        }

        for (const row of mergedByCode.values()) {
          await target`
            INSERT INTO settings (
              id, code, label, description, "isActive", value, amount,
              "createdBy", "createdAt", "updatedBy", "updatedAt"
            )
            VALUES (
              ${row.id}::uuid,
              ${row.code},
              ${row.label}::settings_label,
              ${sqlNullable(row.description)},
              ${sqlNullable(row.isActive)},
              ${sqlNullable(row.value)},
              ${sqlNullable(row.amount)},
              ${row.createdBy},
              ${row.createdAt},
              ${sqlNullable(row.updatedBy ? row.updatedBy.slice(0, 64) : null)},
              ${sqlNullable(row.updatedAt)}
            )
            ON CONFLICT (code) DO UPDATE SET
              label = EXCLUDED.label,
              description = EXCLUDED.description,
              "isActive" = EXCLUDED."isActive",
              value = coalesce(nullif(trim(EXCLUDED.value), ''), settings.value),
              amount = EXCLUDED.amount,
              "updatedBy" = EXCLUDED."updatedBy",
              "updatedAt" = EXCLUDED."updatedAt"
          `;
        }
      }

      const targetCount = dryRun
        ? legacyCount
        : await countTarget(target, "settings");
      await markStepCompleted(
        target,
        step,
        { legacyCount, targetCount },
        dryRun,
      );
      logStep(step, `done → target rows: ${targetCount}`, { dryRun });
    },
  },
];
