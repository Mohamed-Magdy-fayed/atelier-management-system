-- Both counters are now derived from `reservations` at read time. Only the legacy
-- import ever wrote them, so they were stale for every in-app booking: a customer
-- created today reported 0 reservations forever. 0011 recomputes them just before
-- this drops them — that recompute is left in place so 0011 stays valid for any
-- environment that already applied it.
ALTER TABLE "rental_customers" DROP COLUMN "reservationsCount";--> statement-breakpoint
ALTER TABLE "rental_customers" DROP COLUMN "lastReservationAt";