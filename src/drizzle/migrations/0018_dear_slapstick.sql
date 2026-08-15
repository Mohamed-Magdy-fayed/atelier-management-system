ALTER TABLE "rental_customers" ADD COLUMN "updatedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rental_customers" ADD COLUMN "updatedBy" varchar;