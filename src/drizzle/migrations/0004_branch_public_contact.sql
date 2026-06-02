ALTER TABLE "branches" ADD COLUMN "addressEn" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "addressAr" text;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "phone" varchar(32);--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "hoursEn" varchar(256);--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "hoursAr" varchar(256);--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "mapUrl" varchar(2048);
