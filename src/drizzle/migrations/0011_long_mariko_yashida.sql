-- Rental customers become tenant-wide: one row per person, bookable from any
-- branch. Rows were unique per (branchId, phone), so the same person who visited
-- two branches exists as two rows and must be merged before a global unique
-- constraint on phone can be added.
--
-- Normalized phone key: drops formatting, the `20` country code and leading
-- zeros so `0100 123 4567`, `+201001234567` and `1001234567` are one person.
-- Kept in sync with rentalCustomerPhoneKey() in src/lib/phone.ts.
CREATE OR REPLACE FUNCTION rental_customer_phone_key(phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT ltrim(
    regexp_replace(
      regexp_replace(phone, '\D', '', 'g'),
      '^20(?=[0-9]{8})', ''
    ),
    '0'
  )
$$;
--> statement-breakpoint
-- The merge map is recomputed per statement instead of being staged in a temp
-- table: every statement below is then self-contained, so nothing depends on
-- session state surviving between them. The survivor is the earliest-created row
-- per person, keeping the oldest id — the one most likely referenced elsewhere.
--
-- This UPDATE and the next one MUST run before the DELETE further down:
-- reservations.customerId and payments.customerId are ON DELETE CASCADE, so
-- removing a duplicate customer while rows still point at it would silently
-- destroy that history.
WITH survivors AS (
  SELECT
    rental_customer_phone_key(phone) AS phone_key,
    (array_agg(id ORDER BY "createdAt" ASC, id ASC))[1] AS survivor_id
  FROM "rental_customers"
  GROUP BY rental_customer_phone_key(phone)
), merge_map AS (
  SELECT c.id AS duplicate_id, s.survivor_id
  FROM "rental_customers" c
  JOIN survivors s ON s.phone_key = rental_customer_phone_key(c.phone)
  WHERE c.id <> s.survivor_id
)
UPDATE "reservations" r
SET "customerId" = m.survivor_id
FROM merge_map m
WHERE r."customerId" = m.duplicate_id;
--> statement-breakpoint
WITH survivors AS (
  SELECT
    rental_customer_phone_key(phone) AS phone_key,
    (array_agg(id ORDER BY "createdAt" ASC, id ASC))[1] AS survivor_id
  FROM "rental_customers"
  GROUP BY rental_customer_phone_key(phone)
), merge_map AS (
  SELECT c.id AS duplicate_id, s.survivor_id
  FROM "rental_customers" c
  JOIN survivors s ON s.phone_key = rental_customer_phone_key(c.phone)
  WHERE c.id <> s.survivor_id
)
UPDATE "payments" p
SET "customerId" = m.survivor_id
FROM merge_map m
WHERE p."customerId" = m.duplicate_id;
--> statement-breakpoint
-- Carry a linked portal account and note onto the survivor when it has none.
-- With 3+ duplicates the donor row is arbitrary; any of them is equally valid.
WITH survivors AS (
  SELECT
    rental_customer_phone_key(phone) AS phone_key,
    (array_agg(id ORDER BY "createdAt" ASC, id ASC))[1] AS survivor_id
  FROM "rental_customers"
  GROUP BY rental_customer_phone_key(phone)
), merge_map AS (
  SELECT c.id AS duplicate_id, s.survivor_id
  FROM "rental_customers" c
  JOIN survivors s ON s.phone_key = rental_customer_phone_key(c.phone)
  WHERE c.id <> s.survivor_id
)
UPDATE "rental_customers" s
SET
  "userId" = COALESCE(s."userId", d."userId"),
  note = COALESCE(s.note, d.note)
FROM merge_map m
JOIN "rental_customers" d ON d.id = m.duplicate_id
WHERE s.id = m.survivor_id
  AND (s."userId" IS NULL OR s.note IS NULL);
--> statement-breakpoint
WITH survivors AS (
  SELECT
    rental_customer_phone_key(phone) AS phone_key,
    (array_agg(id ORDER BY "createdAt" ASC, id ASC))[1] AS survivor_id
  FROM "rental_customers"
  GROUP BY rental_customer_phone_key(phone)
), merge_map AS (
  SELECT c.id AS duplicate_id, s.survivor_id
  FROM "rental_customers" c
  JOIN survivors s ON s.phone_key = rental_customer_phone_key(c.phone)
  WHERE c.id <> s.survivor_id
)
DELETE FROM "rental_customers" c
USING merge_map m
WHERE c.id = m.duplicate_id;
--> statement-breakpoint
-- Both counters were per-branch totals and are now tenant-wide, so recompute
-- them from surviving reservations rather than summing the merged rows.
UPDATE "rental_customers" c
SET
  "reservationsCount" = agg.reservations_count,
  "lastReservationAt" = agg.last_reservation_at
FROM (
  SELECT
    rc.id,
    COUNT(r.id)::int AS reservations_count,
    MAX(r."createdAt") AS last_reservation_at
  FROM "rental_customers" rc
  LEFT JOIN "reservations" r
    ON r."customerId" = rc.id AND r."deletedAt" IS NULL
  GROUP BY rc.id
) agg
WHERE c.id = agg.id;
--> statement-breakpoint
ALTER TABLE "rental_customers" DROP CONSTRAINT "rental_customers_branch_phone_unique";--> statement-breakpoint
ALTER TABLE "rental_customers" DROP CONSTRAINT "rental_customers_branchId_branches_id_fk";
--> statement-breakpoint
DROP INDEX "rental_customers_branch_id_idx";--> statement-breakpoint
ALTER TABLE "rental_customers" DROP COLUMN "branchId";--> statement-breakpoint
ALTER TABLE "rental_customers" ADD CONSTRAINT "rental_customers_phone_unique" UNIQUE("phone");
