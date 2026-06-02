ALTER TABLE "users" RENAME COLUMN "salary" TO "age";--> statement-breakpoint
ALTER TABLE "user_oauth_accounts" ALTER COLUMN "provider" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."oauth_provider";--> statement-breakpoint
CREATE TYPE "public"."oauth_provider" AS ENUM('google');--> statement-breakpoint
ALTER TABLE "user_oauth_accounts" ALTER COLUMN "provider" SET DATA TYPE "public"."oauth_provider" USING "provider"::"public"."oauth_provider";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "phoneVerifiedAt";