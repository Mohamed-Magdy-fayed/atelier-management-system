ALTER TABLE "branches" ADD COLUMN "opensAt" time;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "closesAt" time;--> statement-breakpoint
ALTER TABLE "branches" DROP COLUMN IF EXISTS "hoursEn";--> statement-breakpoint
ALTER TABLE "branches" DROP COLUMN IF EXISTS "hoursAr";
