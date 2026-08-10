ALTER TABLE "dresses" ADD COLUMN "timesRented" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "dresses" ADD COLUMN "lastReservedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rental_customers" ADD COLUMN "lastReservationAt" timestamp with time zone;--> statement-breakpoint

UPDATE "rental_customers" SET "lastReservationAt" = (
  SELECT MAX(r."createdAt") FROM "reservations" r
  WHERE r."customerId" = "rental_customers"."id"
    AND r."deletedAt" IS NULL AND r."status" <> 'cancelled'
);--> statement-breakpoint
UPDATE "dresses" SET
  "timesRented" = (
    SELECT COUNT(*)::int FROM "reservations" r
    WHERE r."dressId" = "dresses"."id"
      AND r."deletedAt" IS NULL AND r."status" <> 'cancelled'
  ),
  "lastReservedAt" = (
    SELECT MAX(r."createdAt") FROM "reservations" r
    WHERE r."dressId" = "dresses"."id"
      AND r."deletedAt" IS NULL AND r."status" <> 'cancelled'
  );